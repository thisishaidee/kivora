# KIVORA Visual Screen Design — First Release

**Scope:** Public Home, signed-in Home and Ask KIVORA.  
**Design target:** Android-first mobile web/PWA.  
**Product reference:** [Product Blueprint](PRODUCT-BLUEPRINT.md) and [Screen Specification](SCREEN-SPECIFICATION.md).

## 1. Visual direction

KIVORA should feel like a dependable professional tool: calm, intelligent, practical and readable. It should not resemble a generic chatbot, social feed, crypto dashboard or industrial control panel.

### Visual principles
- Lead with the question or task, not a collection of dashboard cards.
- Give technical explanations generous reading space.
- Use hierarchy, spacing and typography rather than decorative gradients.
- Keep primary actions obvious and touch-friendly.
- Use the same design language for public and authenticated experiences.
- Make sources and uncertainty visible without overwhelming the answer.
- Keep community visually secondary.

### Existing styles to evaluate
The current app uses a warm neutral background, dark ink text, DM Sans/DM Mono and restrained editorial typography. This is a useful starting direction, not a requirement to preserve every current component. Review external font loading for reliability and privacy; use local/system fallbacks so the interface remains legible if font requests fail.

## 2. Core design tokens

Initial design tokens (subject to visual QA on Android):

| Token | Direction | Use |
|---|---|---|
| Page background | Warm off-white | Main canvas |
| Surface | White / near-white | Composer and content surfaces |
| Primary ink | Deep charcoal | Main text and primary action |
| Secondary ink | Muted grey-green | Supporting copy |
| Border | Soft neutral | Input boundaries and separators |
| Accent | Restrained deep green | Primary action and active state |
| Warning | High-contrast amber | Caution states |
| Danger | Clear red | Stop/escalation only |
| Radius | 12–18px | Inputs, cards and panels |
| Content width | 720–900px desktop | Reading and conversation column |
| Mobile gutter | 18–22px | Small-screen spacing |

Colour must never be the only signal for evidence status, uncertainty or safety.

## 3. Screen 01 — Public Home

### Desktop composition
- Slim header: KIVORA wordmark left; "How it works" and "Sign in" links right; primary "Get started" action.
- Hero in a two-column composition:
  - Left: eyebrow "PRACTICAL INTELLIGENCE FOR SKILLED WORK", headline "Know what to do next.", concise supporting copy, primary CTA.
  - Right: product demonstration panel showing a sample question and a sample research-backed answer. Clearly label as an illustrative demo until real inference is available.
- Below hero: a horizontal "Ask / Research / Understand / Listen" explanation.
- Multi-trade section with clear trade names, not a row of tiny icons.
- Example use cases: unfamiliar machine, material selection, technique understanding, practical problem.
- Trust section: real sources, visible uncertainty, trade-aware safety, private consultations.
- Closing CTA and compact footer.

### Mobile composition (priority)
1. Wordmark and compact sign-in link.
2. Hero headline and supporting copy.
3. One prominent "Get started" CTA.
4. Product demonstration directly below, in a single-column layout.
5. "Ask. Understand. Move forward." explanation.
6. Trade coverage.
7. Trust and voice section.
8. Closing CTA.

Avoid carousels in the hero, autoplay video, oversized decorative artwork, or an above-the-fold wall of text.

### Recommended public copy
**Eyebrow:** PRACTICAL INTELLIGENCE FOR SKILLED WORK  
**Headline:** Know what to do next.  
**Supporting copy:** Ask about a machine, material, tool, technique or practical challenge. KIVORA helps you understand the subject, research what matters and make a more informed next move.  
**Primary CTA:** Get started  
**Secondary link:** See how KIVORA works  
**Trust line:** Built for skilled workers across trades. Read the answer or listen to it.

Do not claim "instant expert answers", "always accurate" or "verified" unless the underlying evidence and review process supports the claim.

### Product demonstration
Show a realistic example such as: "What should I consider when choosing hinges for a heavy cabinet door?" The sample result should visibly distinguish:
- Explanation
- Factors to check
- Source references
- A "Listen" control

Label this as a demonstration, not a live response. Do not fabricate manufacturer specifications or citations.

## 4. Screen 02 — Signed-in Home

### Header
- Wordmark.
- Compact profile avatar/menu.
- No community-first feed.
- Optional trade context shown quietly, e.g. "Furniture · Electrical" only if user supplied it.

### Primary area
- Welcome line: "What would you like to understand today?"
- Large, multiline consultation composer.
- Primary action: "Ask KIVORA".
- Secondary input actions only when implemented: attach image, speak.
- Helper copy: "Ask about a product, machine, material, technique or anything you want to understand."

### Below the composer
1. **Continue where you left off** — recent consultation threads, title and last activity.
2. **Explore something useful** — a small curated set of actual discovery items.
3. **For your trade** — recommendations based on explicitly supplied interests, with edit controls.
4. **From the community** — at most one compact secondary highlight after community exists.

### Empty state
A first-time user sees three suggested questions from different practical fields. Suggestions are examples only and should open a new consultation with editable text. Do not fabricate history or popularity metrics.

### Interaction rules
- Enter sends only when appropriate; Shift+Enter adds a line.
- Tapping Ask KIVORA opens a new conversation thread.
- Selecting a recent item reopens that thread.
- "New question" starts a separate thread.
- Never force the user to fill trade, location, manufacturer, exact model, measurements, tools or materials before asking.
- Do not put manufacturer or exact-model fields in sign-up, preview setup or the first-question form. Ask inside the conversation only when the detail materially changes the answer, and explain why it is needed.
- Profile enrichment is skippable and must not block the Home screen.

## 5. Screen 03 — Ask KIVORA

### Header
- Back to Home.
- Conversation title (editable or automatically generated after first message).
- New conversation action.
- More menu for rename/archive/delete when supported.

### Conversation canvas
- User messages clearly separated from KIVORA.
- Assistant response column optimized for reading.
- Research activity indicator only while actual retrieval/tools run.
- Source references attached to relevant claims where possible.
- Uncertainty and safety notices adjacent to the relevant content.
- Do not display raw chain-of-thought or internal model reasoning. Show concise methods, evidence and conclusions.

### Composer
- Multiline text input with placeholder: "Ask KIVORA anything about your work or something you want to understand…"
- Send button.
- Image attachment only when upload and analysis are implemented.
- Microphone only when speech recognition is implemented and tested.
- Voice features must not be represented by inert buttons.

### Progressive clarification
KIVORA should:
- Answer directly when the request is clear and low risk.
- Ask one focused question when a missing detail materially changes the answer.
- Explain why a model number, measurement, location or trade context matters when requesting it.
- Preserve details already provided.
- Never repeat a question answered earlier in the same thread.
- Allow the user to say they do not know.

### Research states
- No research required: answer normally without artificial "researching" animation.
- Retrieval active: "Checking relevant technical sources…"
- Comparison active: "Comparing the available information…"
- Research complete: show actual source list and synthesis.
- No reliable evidence: clearly state the gap and suggest how to resolve it.
- Provider unavailable: preserve the user message and show retry; do not generate placeholder content.

## 6. Answer and listen component

The answer view should support:
- Summary.
- Explanation.
- Relevant details or comparison.
- Sources with publisher/title/link/date.
- Applicability and uncertainty.
- Safety limitations and next steps.

Attach a Listen control to the answer. Audio controls: play/pause, replay, playback speed, and voice/language options when supported. Audio must read the displayed answer, not silently invent additional guidance. Text remains available if TTS fails.

## 7. Navigation

### Public
Wordmark · How it works · Sign in · Get started.

### Signed-in
Home · Ask KIVORA · Discover · Profile.

Community should not be a primary destination in the initial bottom navigation. It can be reached through Discover or a secondary destination once it is implemented. Settings lives under Profile.

## 8. Responsive and accessibility requirements

- Minimum 44px touch target for primary controls.
- Body copy comfortably readable at 16px on mobile.
- No horizontal scrolling at 320px viewport width.
- Maintain visible focus and semantic labels.
- Inputs must remain usable with Android keyboard open.
- Respect reduced-motion settings.
- Do not rely on hover to expose essential actions.
- Ensure contrast for muted copy and form placeholders.
- Keep long research results scrollable without trapping the user.
- Audio playback must not prevent text selection or scrolling.

## 9. Design acceptance checks

- [ ] Public Home communicates product value without sign-up.
- [ ] Public Home is visually useful on a 360px Android viewport.
- [ ] Product example is clearly marked as illustrative if not live.
- [ ] The primary CTA does not imply unsupported authentication methods.
- [ ] Signed-in Home makes consultation the most prominent action.
- [ ] Recent conversations are clearly distinct from discovery content.
- [ ] Ask KIVORA does not expose a job-intake form by default.
- [ ] Research status reflects actual retrieval activity.
- [ ] Source provenance and uncertainty are legible.
- [ ] Listen controls are connected to actual speech output.
- [ ] Community and wallet do not dominate the first three screens.
