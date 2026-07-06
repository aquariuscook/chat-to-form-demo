# CLAUDE.md: Chat-to-Form Intake Widget

This file tells Claude Code how to work on this project correctly.

---

## What This Is

A single-file (`index.html`) chat-to-form intake widget for Elementyl Intelligence. A chatbot on the left asks questions one at a time. A form on the right populates in real time as the user answers. Voice and text input both work. Form fields are also directly editable (click in and type) — not chat-only.

---

## File Structure

Everything lives in `index.html`. CSS is in a `<style>` block. JS is in a `<script>` block at the bottom. Do not split into separate files unless explicitly asked.

---

## Brand Tokens — Never Change These

Updated 2026-07-03: swapped from the plum/coral palette to a healthcare-style
off-white + blue + green palette, per explicit request. These are now the
locked tokens.

```
--bg:        #F6F9F7   (off-white base)
--panel:     #EAF3EE   (secondary panel tint)
--border:    #D2E3DA   (borders, bot bubble bg)
--ink:       #163832   (primary text)
--blue:      #2C7DA0   (primary accent — CTAs, active states, user bubbles)
--green:     #4F9B72   (secondary accent — labels, success/completion)
--on-accent: #FFFFFF   (text/icons on accent-colored backgrounds)

Font display: Cormorant Garamond (600)
Font body:    Outfit (300, 400, 500)
```

---

## Layout Rules

**Desktop (1024px+):** Two-column CSS Grid. Left = chat, right = form. Both visible.

**Mobile (<768px):** Single column. Fixed tab bar at bottom with two tabs: "Chat" and "Form". Only one panel visible at a time. Form tab shows a filled-field badge (e.g. "Form 3/7"). A notification dot appears on the Form tab when a field is filled while the user is in Chat view.

Do not try to make the desktop layout work on mobile by scaling or squishing. The layouts are structurally different. Use a media query breakpoint at 767px.

---

## Conversation Flow

Questions are defined in the `steps[]` array. Each step has:
- `field`: the ID of the form field to populate
- `question`: the bot's follow-up question after this answer is received

Current fields in order:
1. name
2. address
3. city
4. phone
5. email
6. business
7. insurance
8. referral

To add a field: add a `<div class="form-group">` to the form panel and a new object to `steps[]`. Keep them in sync.

### One-shot multi-field extraction (demo)

Added 2026-07-03. `extractFields()` runs on every submitted message (not just
the current step's answer) and pattern-matches for ALL not-yet-filled fields,
not only the one currently being asked. Any field it finds gets filled and
its question is skipped via `advance()`, which now walks forward to the next
*unfilled* step instead of blindly incrementing.

Detection quality is not uniform — be careful extending this:
- **Reliable** (structural patterns): email, phone, street address,
  city/state/zip, insurance (exact name or alias substring only, no fuzzy
  matching — ambiguous insurance mentions inside a big message are
  deliberately left alone rather than guessed).
- **Heuristic** (keyword/phrase triggered, will misfire sometimes): name
  (needs an explicit "my name is" / "I'm" / "I am" / "this is" lead-in —
  bare names with no lead-in are NOT detected, since there's no reliable way
  to tell a name from any other capitalized phrase), business (needs
  "business is/called" or "company is/called" or "I own/run"), referral
  (keyword list — google, facebook, friend, event, podcast, ad, yelp, etc.).
- This is pattern matching, not an LLM (ADR-004 still blocks backend/API
  calls). If a field's fallback value (whatever's left after stripping
  detected chunks) looks wrong, that's the expected failure mode of
  regex-only extraction, not a crash — the current step still gets asked
  again if nothing was confidently detected for it.

**Acknowledgment message:** when a message captures at least one field beyond
the one currently being asked, the bot says which fields it picked up (e.g.
"Got it — I also picked up your street address, city/state/zip..., so those
are 4 things I don't need to ask about separately") before continuing. This
is the point of the feature for a demo — it makes the parsing visible instead
of just quietly correct. Ordering in the message follows `steps[]` order, not
detection order, so it reads the same as the form panel top-to-bottom.
Trivial single-field answers (the normal one-question-at-a-time case) stay
silent — the message only fires when something extra was actually caught.

**Hardening (2026-07-03 stress-test pass):**
- User-provided text always renders via `textContent`, never `innerHTML` —
  confirmed an XSS payload (`<script>`, `onerror=`) renders as inert escaped
  text, not executable markup. Keep it that way; never switch a bubble or
  field to `innerHTML` for "rich formatting" without re-checking this.
- `setFieldValue()` truncates any field value to `MAX_FIELD_LENGTH` (200
  chars) with a trailing "…". This is a blanket safety net against huge
  pastes (tested at 20k characters — extraction still found a buried email
  with no perceptible slowdown, but without the cap the raw fallback text
  would have dumped the entire blob into a form field). Always set field
  values through `setFieldValue()`, not by writing `state.data[field]` and
  calling `fillField()` separately, or this cap gets bypassed.
- `BUSINESS_RE`'s capture charset originally excluded quotes/parens/brackets,
  so a real-sounding business name like `Bob's "Bait & Tackle" (est. 1995)`
  failed to match at all. Charset now includes `" ( ) [ ] - ! & ' . ,` —
  if you extend this regex again, test against a business name with
  punctuation before assuming it works.
- Known, accepted (not fixed) limitations: multiple emails/phones in one
  message only capture the first occurrence; non-English name intros (e.g.
  French "Je m'appelle") aren't recognized since the intro-phrase list is
  English-only. Both degrade to the safe fallback (ask again / leftover text
  in the current field) rather than misfiring, which is the actual
  robustness bar here — "never silently wrong," not "always right."

### City/state/zip without a comma (added 2026-07-06)

`CITY_STATE_ZIP_COMMA_RE` (original, requires "City, State ZIP") is tried
first; `CITY_STATE_ZIP_NOCOMMA_RE` is the fallback for input with no comma at
all (e.g. "sayville ny 11782" typed all lowercase, no punctuation). The
no-comma pattern anchors on a real US state name/abbreviation (`US_STATES`)
immediately followed by a bare 5-digit number — that zip requirement is load
bearing: 2-letter state codes (IN, OR, ME, HI, ...) double as ordinary English
words, and without the zip anchor this would misfire constantly on normal
sentences ("I heard about this from a friend, or google" would otherwise risk
matching "or" as Oregon).

The no-comma city capture is **exactly one word**, by design — not a
"good enough for now" shortcut. Regex leftmost-match semantics mean a
multi-word capture here doesn't just fail to grab 2-word cities like "Los
Angeles" (which it does — only "Angeles" gets captured, "Los" leaks into
whatever field asked before it) — it actively reaches backward past the real
city boundary into unrelated preceding text (e.g. a name typed with no
punctuation) when allowed 2+ words, because there's no comma to stop it early.
Single-word-only is the deliberate trade: safe under-capture over unsafe
over-capture. Do not loosen this without solving the boundary problem first.

**No zip either (added 2026-07-06, second pass):** the zip-anchored pattern
above still missed the most common real case — a message that mentions a
city and state but never gives a zip at all (e.g. "anne cantera 55 john st
sayville ny", nothing after "ny"). Without a zip to anchor on, a bare
2-letter state code is indistinguishable from an ordinary short word most of
the time, so `CITY_STATE_NOCOMMA_END_RE` only fires when the state token is
the very last thing in the message — a state-like word sitting mid-sentence
("a friend, or google, not sure") won't match, only one at the tail end
will. Even with that anchor, a handful of abbreviations are excluded outright
(`RISKY_STATE_ABBR_AS_LAST_WORD`: OH, OK, IN, OR, ME, HI, MA, PA, CO) because
they're common enough as ordinary last words ("call you back ok") that even
end-of-message position doesn't make them safe. Full state names ("New
York", "Texas") carry none of this risk and are never excluded.

Three-tier fallback order in `extractFields()`, tried in this sequence:
`CITY_STATE_ZIP_COMMA_RE` → `CITY_STATE_ZIP_NOCOMMA_RE` (zip required) →
`CITY_STATE_NOCOMMA_END_RE` (no zip, end-anchored, risky abbreviations
excluded). Each is strictly less certain than the one before it — that's
intentional, try the safest pattern first.

### Distinguishing an answer from a complaint (added 2026-07-06)

`isConversationalAside()` catches messages that are talking ABOUT the
conversation ("I already gave you that", "what do you mean", "can you
repeat that") instead of answering the current question. Before this
existed, literally any text — including a frustrated aside — got treated as
the current field's answer verbatim (a user complaint like "I gave it to you
already" would land straight in the City/State/ZIP field). When caught, the
bot apologizes and re-asks by field label instead of advancing or writing
anything to `state.data`.

Deliberately does NOT include bare negations like "no"/"none"/"nevermind" —
those are legitimate real answers on this form (business name accepts "N/A",
insurance's alias list maps "none" to "None / Self-pay"), so a broad
catch-all would misfire on valid input. The "already" + communication-verb
check runs in either word order ("already told you" and "gave it to you
already" both need to match — a fixed-order regex missed the second form
during testing).

This only intercepts when `extractFields()` found nothing usable for the
current field. If a message contains both a real answer AND a conversational
aside, the real answer still wins.

**Distinguishing a genuine question (added 2026-07-06, second pass):**
`isConversationalAside()` only catches complaints/confusion — it did NOT
catch the user actually asking something back ("why do you need my phone
number?", "is this required?"), which used to get written straight into the
current field as if it were the answer. `isLikelyQuestion()` catches that
separately (ends in "?", or opens with a WH-word/auxiliary verb — why, what,
is, are, do, does, can, could, should, would, will, who, where, when, how).
It gets a *different* response than the aside case: `FIELD_WHY` holds a
one-line honest reason per field, and the bot answers with that before
re-asking ("Good question — that's in case we need to reach you quickly.
Could you go ahead and share your phone number?") instead of just
apologizing. Keep `FIELD_WHY` entries short and true — don't oversell why a
demo form needs a piece of data.

Same gate as the aside check (`detectedFields.length === 0` only) and same
non-goal: this is pattern matching on sentence shape, not real intent
understanding. "Whitney Houston" as a name doesn't false-positive (the
WH-word check requires a full word match at a boundary — "why"/"what" as
whole words, not "Wh-" as a prefix), but a business or referral answer that
happens to start with one of these words and lacks other detected fields in
the same message theoretically could. Accepted risk, same reasoning as the
aside patterns above — this is about catching the common, real failure
mode, not chasing every remaining false-positive to zero.

### Direct form editing (added 2026-07-06)

Form fields are real `<input>` elements (were plain `<div>`s originally),
editable by clicking directly into the form panel — not just through chat.
This is a genuinely separate, simpler path from the chat flow, wired near
the bottom of the script (`handleFieldCommit`, `reopenConversationIfNeeded`,
and the `steps.forEach` listener setup right before Init):

- Editing never runs fuzzy-select matching or conversational-aside
  detection — those exist to interpret ambiguous natural language in chat;
  someone clicking directly into "Insurance Provider" and typing has already
  been unambiguous about intent, so whatever they type is taken literally.
- Commit happens on `change` (blur) or Enter, not on every keystroke — the
  `input` event only toggles the live `.filled` visual state as you type.
- If the edited field is the one chat is currently waiting on, the
  conversation advances past it (`wasCurrentQuestion` check in
  `handleFieldCommit`) so the bot doesn't re-ask something already answered.
  Filling a field out of order (chat is on step 3, user directly fills step
  7) just writes silently — `advance()` already skips filled steps when
  chat reaches that point naturally.
- Clearing a field to empty after the intake is already complete reopens
  the conversation: un-sets `state.completed`, re-enables chat/mic/wake
  (unless permanently `.unsupported`), rewinds `state.stepIndex` to the
  cleared field's position via `findFirstUnfilledIndex()`, and the bot
  says so before re-asking. Clearing a field that's still ahead of where
  chat currently is (hasn't been asked yet) just quietly un-fills it — no
  reopening needed since it was never "closed."
- `fillField()`'s new-vs-edit distinction (whether to increment
  `filledCount`) is decided by `state.data` membership *before* the write,
  computed in `setFieldValue()` — not by checking the `.filled` CSS class.
  The live `input`-driven class toggle would otherwise make every commit
  look like an edit to an already-"filled" element and silently break
  progress counting for genuinely new fills. If you ever call `fillField()`
  directly again instead of through `setFieldValue()`, you must pass the
  `isNewFill` boolean yourself.

### Fuzzy-select fields

The `insurance` step has `type: 'fuzzy-select'` instead of the default text
step. This is a deliberate, scoped exception to ADR-005 ("no branching in
v1") added 2026-07-03 to demo how a large-option field (hundreds of possible
insurance plans) should behave: exact/alias matches resolve immediately,
ambiguous input shows up to 3 candidate chips plus "Something else," and
unmatched input re-prompts on the same field. Matching logic lives in
`matchInsurance()` — client-side token-overlap scoring against
`INSURANCE_OPTIONS` / `INSURANCE_ALIASES`, no backend or API call (ADR-004
still holds). Do not generalize this into a full branching config unless
asked — it's intentionally scoped to this one field for the demo.

**Confidence threshold (added 2026-07-06):** a single generic brand word
("Anthem") used to auto-resolve silently against whatever option it
happened to be the *only* match for, even when that option was a much
longer, more specific name ("Anthem Blue Cross Blue Shield (Ohio)") — 1 of 6
words matched was treated the same as 1 of 1. `matchInsurance()` now also
requires the matched option's own token count to be within 2x the user's
token count (`topMatches[0].tokenCount <= userTokens.length * 2`) before
auto-accepting; otherwise it falls through to the ambiguous/clarification
path (which works fine even with a single candidate — shows as one
confirm-or-"something else" chip instead of a silent guess).

`INSURANCE_OPTIONS` includes two Anthem regional variants (`Anthem Blue
Cross (California)`, `Anthem Blue Cross Blue Shield (Ohio)`) specifically so
"Anthem" alone has genuine ambiguity to clarify, rather than only one
generic Anthem entry to rubber-stamp. Kept to exactly two, not more — a
third collided with `Blue Cross Blue Shield of Texas` on token-count ties
for the query "Blue Cross" and silently pushed Texas out of the top-3 chip
slice (array order decides ties; the extra Anthem entries sorted ahead of
Texas since they appear earlier in `INSURANCE_OPTIONS`). If you add more
regional variants here, re-test the plain "Blue Cross" query specifically
for this same collision.

---

## Voice Input

Uses `window.SpeechRecognition` (Web Speech API). No external SDK. If unavailable, mic button is hidden. Do not add any paid voice API without explicit instruction.

Fails silently by design when the browser has no `SpeechRecognition` constructor
(mic button never shown). If the constructor exists but permission/hardware
fails at runtime (`not-allowed`, `service-not-allowed`, `audio-capture`, or a
synchronous throw from `.start()`), the widget shows a one-time chat message
explaining voice isn't available and hides the mic button — added 2026-07-03
after this failed silently inside a sandboxed iframe preview with no
`allow="microphone"`. **If this widget is ever embedded in an `<iframe>` on
another page, that iframe needs `allow="microphone"` or voice input will
always hit this fallback path**, regardless of the visitor's own browser
permissions.

**Proactive iframe heads-up (added 2026-07-06):** the `not-allowed`/
`.start()`-throws fallback above only fires *after* the user clicks mic and
it fails — but inside a real sandboxed preview (tested against an actual
share-link preview, not just simulated), the failure can be completely
silent: no synchronous throw, no `error` event, ever. Clicking mic does
nothing visible at all, which reads as broken rather than unsupported. Init
now checks `window.self !== window.top` — if this page is running inside an
iframe AND `SpeechRecognitionCtor` exists (so the mic button is visible and
inviting a click), it proactively says up front that voice won't work here,
before the user has a chance to click and be confused. Verified via an
actual iframe wrapper page — the note appears when embedded, and does not
appear when the file is loaded directly (not embedded).

### Hands-free wake-word mode (demo only)

Added 2026-07-03. A second button (`#wakeBtn`, headset icon) next to the mic
toggles continuous listening for the trigger phrase "hey elementyl". This is
a client-side approximation, not a real wake-word engine — no third-party
SDK, consistent with "no paid voice API without explicit instruction" above.

Known tradeoffs, intentional for a demo, worth revisiting before anything
production-facing:
- While hands-free mode is on, audio streams continuously to the browser's
  speech recognition service — not just after the wake phrase fires. A real
  wake-word engine (e.g. Picovoice Porcupine) does on-device detection and
  only sends audio after the trigger; this doesn't.
- Matching is a plain substring check on the transcript, case-insensitive.
  No fuzzy matching, no false-positive suppression.
- The manual mic button's behavior (transcript → text box → user reviews →
  sends) is unchanged and stays the default. Hands-free is a separate opt-in
  toggle, not a replacement.

---

## Animations

All `@keyframes` animations must be inside `@media (prefers-reduced-motion: no-preference)`. Use `transition` for simple state changes.

---

## What NOT to Do

- Do not add localStorage or sessionStorage
- Do not add a backend, API calls, or form submission in v1
- Do not add React, Vue, or any JS framework
- Do not use em dashes anywhere in copy or comments
- Do not change brand colors or fonts
- Do not try to fix a broken mobile layout by patching the desktop CSS. Rebuild the mobile layout using the correct approach (tab bar + single column).

---

## Testing Checklist Before Calling Done

- [ ] Desktop: both panels visible, form fills as chat progresses
- [ ] Mobile (375px): tab bar visible, Chat tab active by default, Form tab shows badge count
- [ ] Form tab notification dot appears when field fills while user is on Chat tab
- [ ] Voice input toggles correctly on Chrome desktop and Chrome Android
- [ ] All 8 fields populate correctly in order
- [ ] Completion message appears after field 8
- [ ] Input is disabled after completion
- [ ] `prefers-reduced-motion` disables keyframe animations
- [ ] No em dashes in any text content
- [ ] Every form field is directly editable by clicking in and typing
- [ ] Editing the field chat is currently waiting on advances the conversation past it
- [ ] Clearing a field after full completion reopens the conversation and re-enables input
