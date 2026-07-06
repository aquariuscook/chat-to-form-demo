// Vercel serverless function: classifies a chat message as answering the
// current form question, asking a question back, or making a complaint.
// Replaces the regex-based isConversationalAside/isLikelyQuestion detectors
// in index.html for the CURRENT field only — the one-shot multi-field
// extraction (finding other fields embedded in a bigger message) stays
// regex-based in the client, this endpoint doesn't touch that.
//
// ANTHROPIC_API_KEY must be set as a Vercel environment variable (dashboard
// or `vercel env add`) — never hardcode it here, never send it to the client.

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const CLASSIFY_SCHEMA = {
  type: 'object',
  properties: {
    category: {
      type: 'string',
      enum: ['answer', 'question', 'complaint'],
      description:
        'answer: the message provides the requested field value. ' +
        'question: the user is asking something back (why is this needed, is this required, what do you mean). ' +
        'complaint: the user is expressing frustration or claiming they already answered.'
    },
    extracted_value: {
      anyOf: [{ type: 'string' }, { type: 'null' }],
      description:
        'If category is "answer", the clean field value with no extra commentary ' +
        '(e.g. just the phone number, just the name). Null for "question" or "complaint".'
    }
  },
  required: ['category', 'extracted_value'],
  additionalProperties: false
};

// Same set of allowed origins the static widget is actually hosted on.
// Reject anything else rather than reflecting an arbitrary Origin header.
const ALLOWED_ORIGINS = new Set([
  'https://aquariuscook.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
]);

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { question, fieldLabel, message } = req.body || {};

  if (typeof question !== 'string' || typeof fieldLabel !== 'string' || typeof message !== 'string') {
    res.status(400).json({ error: 'question, fieldLabel, and message are all required strings' });
    return;
  }

  // Hard caps: this is a classification call, not a place for someone to
  // paste an essay or run up token costs against an exposed endpoint.
  if (message.length > 2000 || question.length > 500 || fieldLabel.length > 100) {
    res.status(400).json({ error: 'Input too long' });
    return;
  }

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      output_config: { format: { type: 'json_schema', schema: CLASSIFY_SCHEMA } },
      messages: [
        {
          role: 'user',
          content:
            `A chat-to-form intake bot just asked: "${question}" (collecting the ${fieldLabel} field).\n\n` +
            `The user replied: "${message}"\n\n` +
            'Classify this reply.'
        }
      ]
    });

    if (response.stop_reason === 'refusal') {
      res.status(200).json({ category: 'complaint', extracted_value: null });
      return;
    }

    const textBlock = response.content.find((b) => b.type === 'text');
    const parsed = JSON.parse(textBlock.text);
    res.status(200).json(parsed);
  } catch (err) {
    console.error('classify error:', err);
    res.status(502).json({ error: 'Classification failed' });
  }
}
