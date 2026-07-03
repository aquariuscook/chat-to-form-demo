# CLAUDE.md: Chat-to-Form Intake Widget

This file tells Claude Code how to work on this project correctly.

---

## What This Is

A single-file (`index.html`) chat-to-form intake widget for Elementyl Intelligence. A chatbot on the left asks questions one at a time. A form on the right populates in real time as the user answers. Voice and text input both work.

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
- [ ] All 7 fields populate correctly in order
- [ ] Completion message appears after field 7
- [ ] Input is disabled after completion
- [ ] `prefers-reduced-motion` disables keyframe animations
- [ ] No em dashes in any text content
