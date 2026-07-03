# PRD: Chat-to-Form Intake Widget
**Version:** 1.0  
**Author:** Elementyl Intelligence  
**Status:** Draft  

---

## Problem Statement

Intake forms are friction-heavy. Users abandon them. A conversational interface lowers the cognitive load by asking one question at a time, but users lose the sense of progress and completion that a visible form provides. This widget solves both problems simultaneously: chat drives the experience, the form proves it's working.

On mobile, the current prototype renders both panels side by side, making both unusable. Mobile requires a different layout strategy.

---

## Goal

Build a responsive chat-to-form intake widget that:
- Collects structured user data through a conversational UI
- Populates a visible form in real time as answers are given
- Works via typed text or voice input
- Adapts layout cleanly between desktop and mobile
- Can be embedded in any web page or used standalone

---

## Users

- Small business owners, nonprofit staff, and individuals filling out intake forms for Elementyl Intelligence consulting services
- Non-technical users; mobile-first is the default assumption

---

## Functional Requirements

### Layout

| Breakpoint | Behavior |
|---|---|
| Desktop (1024px+) | Two-column split. Left: chat. Right: form. Both visible simultaneously. |
| Tablet (768px–1023px) | Same as desktop if horizontal, else mobile layout |
| Mobile (<768px) | Single column. Tab bar at bottom toggles between Chat view and Form view. |

### Chat Panel

- Displays conversation history (bot and user bubbles)
- Bot always speaks first with the first question
- One question at a time
- Bot shows a typing indicator (animated dots) before each response
- Input accepts typed text (Enter key or Send button submits)
- Voice input via Web Speech API (toggle mic button)
  - Mic button has three visible states: idle, listening (pulsing), unsupported (grayed)
  - Voice transcript populates the text input; user can edit before sending
- After all fields are collected, bot delivers a closing message and disables input

### Form Panel

- Displays all fields at all times, even before they are filled
- Empty fields show a placeholder state ("Waiting...")
- When a field is populated:
  - Flash animation confirms the fill
  - Field border and background change to indicate "filled" state
- Progress bar fills incrementally as fields are completed
- Completion badge appears when all fields are collected

### Fields (in order)

1. Full Name
2. Street Address
3. City, State, ZIP
4. Phone Number
5. Email Address
6. Business Name (optional, bot accepts "N/A" or "just me")
7. How did you hear about us?

### Mobile Tab Toggle

- Fixed tab bar at bottom of screen
- Two tabs: "Chat" and "Form"
- Active tab indicator uses brand coral (#E45E32)
- Form tab shows a badge count of filled fields (e.g. "Form 3/7")
- Switching to Form tab mid-conversation does not interrupt the chat state
- A notification dot on the Form tab appears when a new field is filled while user is in Chat view

---

## Non-Functional Requirements

- No backend required for the prototype; all state held in JS
- No dependencies beyond Google Fonts
- Must work in Chrome, Safari, Firefox (latest)
- Voice input degrades gracefully in unsupported browsers (mic button hidden or disabled)
- Animations respect `prefers-reduced-motion`
- Keyboard accessible (tab order, visible focus states)

---

## Out of Scope (v1)

- Form submission / backend POST
- Multi-language support
- Branching conversation logic (conditional fields)
- CRM integration
- Authentication

---

## Success Metrics

- User completes all 7 fields without abandoning
- Time-to-complete is shorter than a static form equivalent (benchmark TBD)
- Zero layout bugs on iOS Safari and Android Chrome

---

## Brand Tokens

Updated 2026-07-03: off-white + blue + green healthcare-style palette.

```
--bg:        #F6F9F7
--panel:     #EAF3EE
--border:    #D2E3DA
--ink:       #163832
--blue:      #2C7DA0
--green:     #4F9B72
--on-accent: #FFFFFF

Font display: Cormorant Garamond (600)
Font body/UI: Outfit (300, 400, 500)
```
