# ADR: Chat-to-Form Intake Widget
**Version:** 1.0  
**Status:** Accepted  

---

## ADR-001: Single HTML File, No Framework

**Decision:** Build as a single self-contained HTML file with vanilla JS and CSS.

**Rationale:**
- Zero build tooling required
- Embeddable via `<iframe>` or direct include in any existing site
- No React/Vue overhead for a UI this size
- Claude Code can iterate on a single file without dependency management

**Trade-offs:**
- No component reuse across other pages
- Will need refactoring if logic grows significantly (>500 lines JS)

---

## ADR-002: Responsive Layout via CSS Grid + JS Tab Toggle

**Decision:** Use CSS Grid for desktop split layout. Below 768px, hide one panel and show a fixed tab bar that swaps visibility with JS.

**Rationale:**
- CSS-only toggle approaches (`:target`, checkbox hack) don't support the badge count or notification dot requirements
- Grid avoids float/flex hacks for equal-height columns
- Tab bar pattern is the mobile standard for two-pane content switching

**Implementation notes:**
- `grid-template-columns: 1fr 1fr` on desktop
- `@media (max-width: 767px)` switches to single column, adds tab bar
- JS manages `activePanel` state and applies `.hidden` class
- Tab bar is `position: fixed; bottom: 0`; panels get `padding-bottom` to clear it

---

## ADR-003: Web Speech API for Voice Input

**Decision:** Use the browser-native Web Speech API (`SpeechRecognition`). No third-party voice SDK.

**Rationale:**
- No API key, no cost, no latency to external service
- Sufficient for a prototype and most production intake use cases
- Chrome on Android and desktop Chrome have strong support

**Trade-offs:**
- Not supported in Firefox or most non-Chromium mobile browsers
- iOS Safari support is partial and requires user gesture
- Degrades gracefully: mic button hidden when `SpeechRecognition` is unavailable

**Future upgrade path:** Replace with ElevenLabs or Vapi STT if real-time streaming or higher accuracy is needed.

---

## ADR-004: All State in JS Memory (No Backend, No localStorage)

**Decision:** Form data lives in a plain JS object for the duration of the session. No persistence.

**Rationale:**
- v1 is a prototype; no backend is defined yet
- Avoids GDPR/privacy surface area during prototype phase
- localStorage is explicitly not used per project constraints

**Future upgrade path:** On form completion, POST the data object to a configurable endpoint (webhook URL passed as a query param or data attribute on the embed).

---

## ADR-005: Linear Conversation Flow (No Branching in v1)

**Decision:** Bot asks questions in a fixed sequence. No conditional logic.

**Rationale:**
- Branching requires a conversation state machine and significantly more complexity
- The 7-field intake form does not require it
- Keeps v1 scope contained

**Future upgrade path:** Replace the `steps[]` array with a JSON conversation config that supports `skip_if`, `branch_on`, and `validate` properties.

**Addendum (2026-07-03):** One scoped exception was added — the `insurance`
field uses `type: 'fuzzy-select'` to demo how a large fixed-option field
(hundreds of real insurance plans) should clarify an ambiguous answer via
candidate chips before advancing. This is not general branching: it's a
single reusable step type gated to one field, with client-side matching only
(no backend, consistent with ADR-004). Treat this as the seed of the
`branch_on`/`validate` upgrade path above, not as an opened door to ad hoc
conditional logic elsewhere in `steps[]`.

---

## ADR-006: Animation Respects prefers-reduced-motion

**Decision:** All CSS animations are wrapped in a `@media (prefers-reduced-motion: no-preference)` guard or use `transition` instead of `animation` where possible.

**Rationale:**
- Accessibility requirement
- Users with vestibular disorders or epilepsy can be harmed by motion
- Simple to implement upfront, hard to retrofit

---

## File Structure

```
chat-to-form/
  index.html        # Single deliverable file (HTML + CSS + JS inline)
  PRD.md            # This product spec
  ADR.md            # This file
  CLAUDE.md         # Instructions for Claude Code to modify this project
```
