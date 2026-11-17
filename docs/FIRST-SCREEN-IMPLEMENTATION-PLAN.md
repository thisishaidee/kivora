# KIVORA First-Screen Implementation Plan

**Scope:** Public Home, signed-in Home and Ask KIVORA.  
**Branch:** `feat/public-home-consultation-redesign`  
**Release posture:** Preview only; no production activation.

## 1. Existing implementation findings

The current application branch has:
- An anonymous identity/recovery-code flow.
- Owner-scoped private work-session CRUD and message history.
- A React/Vite mobile-first UI.
- Deterministic trade and hazard assessment.
- A response contract with clarify/escalate/guided/unavailable states and source citations.
- A disabled AI inference path and no confirmed end-to-end research provider.
- No integrated speech playback or speech input in the inspected App component.
- No verified email/phone authentication.

The current ready-state screen is still job-intake centric. It requires a task description and asks for trade/language/units, jurisdiction and optional job context before starting. This must not remain the universal consultation entry point.

## 2. Architecture decisions for the redesign

### Account and persistence boundary
Do not relabel the existing anonymous recovery-code identity as email/phone sign-up. It is a different account model.

The current private work-session storage can be a temporary conversation persistence adapter for the UI prototype, but a durable account system needs:
- Verified email and/or phone identity.
- Provider-managed verification and secure recovery.
- A stable user ID mapped to private conversation ownership.
- Session rotation/revocation and account deletion.
- Safe migration/linking of existing anonymous records only after identity proof.

Email-first is the recommended first implementation if the selected provider's deliverability and recovery are verified. Phone OTP should be enabled only after testing Nigeria/international delivery, cost, rate limits and abuse protection. Do not add fake sign-up controls.

### Conversation model
A conversation is a thread, not a workspace or job:
- User can create many independent threads.
- A thread has a title, timestamps and messages.
- Trade/model/measurements/tools/location are optional context fields, not required first-screen inputs.
- Existing session rows may temporarily back the UI, but rename user-facing labels and update the domain model deliberately.
- Avoid changing persisted schemas until migration and backward compatibility are mapped.

### Intelligence adapter
Keep the UI independent from the model vendor:
- Consultation API receives messages and relevant context.
- Research orchestration decides whether retrieval is necessary.
- Retrieval adapter gathers sources; model adapter synthesizes with evidence references.
- Safety policy runs before and after model output.
- Answer renderer receives structured blocks, citations, uncertainty and safety state.
- Provider failures preserve the user message and return an honest unavailable state.

### Voice adapter
- TTS attaches to the final displayed answer.
- STT creates an editable transcript before submission.
- Speech services are provider-adaptable.
- No paid API key or service activation until budget, account billing, data handling and quality are verified and approved.
- Browser speech synthesis may be a clearly identified fallback, not a claim that production voice is complete.

## 3. Implementation sequence

### Phase A — UI and navigation foundation
1. Create shared app shell and route/view state for Public Home, Home, Ask KIVORA and Profile.
2. Build Public Home using the approved visual design.
3. Add sign-up/sign-in entry only when a real authentication path is ready; until then show a clearly labelled preview access flow or leave account CTA gated.
4. Replace the ready-state universal intake form with a consultation-first Home.
5. Rework session labels to "Conversations" and "Recent conversations".
6. Create the Ask KIVORA conversation screen and a message composer.
7. Preserve access to existing sessions during transition; do not discard/archive data automatically.

### Phase B — Conversation backend
1. Define thread/message API contracts separate from work/job assumptions.
2. Map existing work-session persistence to thread storage with explicit compatibility tests.
3. Support a new thread with the initial message.
4. Support follow-up messages and reopening.
5. Support multiple unrelated threads under one account.
6. Ensure all read/write/delete paths remain owner-scoped and rate-limited.
7. Add title generation from first message without calling an external model until provider is approved; a deterministic short title can be a temporary fallback.

### Phase C — Research-capable intelligence
1. Select candidate reasoning model(s) through a benchmark set, not brand preference.
2. Select search/retrieval method and permitted source corpus.
3. Define structured evidence payload and citation validation.
4. Implement tool orchestration and timeout/retry limits.
5. Preserve safety gates and most-restrictive multi-trade policy.
6. Add tests for unsupported claims, citation integrity, exact-vs-similar model applicability, high-risk prompts and provider failure.
7. Keep inference disabled until cost and credentials are verified and user approves activation.

### Phase D — Voice
1. Compare TTS candidates on Nigerian English, trade terminology, model numbers, units, latency and price.
2. Implement play/pause/resume/replay and speed.
3. Ensure audio is generated only from the visible response.
4. Test audio playback on Android Chrome and installed PWA.
5. Add STT with editable transcript after provider quality and privacy review.

## 4. Work order for the remaining three-day window

### Day 1 — Design and structural preparation
- Complete screen design and user-flow documentation.
- Audit current React state and endpoint contracts.
- Implement Public Home and consultation-first Home shell if account flow can remain honestly gated.
- Add component and interaction tests.

### Day 2 — Consultation flow
- Replace job-first intake as default.
- Reuse safe private thread persistence with explicit naming/compatibility boundaries.
- Implement thread list/open/new conversation and natural-language composer.
- Integrate only a verified AI provider if available within approved budget; otherwise deliver a transparent unavailable state and provider adapter.

### Day 3 — Voice, QA and preview
- Add/test TTS only if provider or browser fallback is appropriate and clearly identified.
- Verify Android layout, keyboard, history, owner isolation, recovery, safety and error states.
- Run CI and preview deployment.
- Keep production, paid provider activation and mainnet untouched.

## 5. Release gates

Do not mark a feature complete unless:
- Code exists on the reviewed branch.
- Typecheck, tests and production build pass.
- Relevant API tests cover ownership and validation.
- Android flow is exercised on a real device.
- User-visible labels match actual behaviour.
- Provider billing and privacy are understood.
- No secrets or wallet material are exposed.
- Deployment is confirmed as preview, not production.

## 6. Immediate implementation blockers

1. **Authentication:** email/phone provider not selected or integrated. Do not promise sign-up methods yet.
2. **AI:** inference disabled; model and research provider not selected; no reviewed evidence corpus.
3. **Voice:** no TTS/STT implementation in inspected UI.
4. **Domain model:** existing persistence calls these work sessions/investigations. A conversation abstraction and safe migration plan are required.
5. **Source quality:** technical source acquisition, licensing and review workflow not finalized.

## 7. Immediate next code task

Before provider integrations, implement the public visual shell and consultation-first Home in a feature branch while preserving the existing private session/recovery functions behind a clearly labelled preview access boundary. Do not ship a pretend email/phone form or expose a non-working microphone/listen button.


## Implementation status — 17 November 2026

The first React implementation is now on `feat/public-home-consultation-redesign`:

- Added `web/src/PublicHome.tsx` as the public product homepage, shown when no preview identity is present.
- Added responsive public-home styling in `web/src/styles.css`.
- Replaced the welcome screen with the public homepage. The primary action opens the existing anonymous preview identity flow; it is explicitly labelled as a preview and discloses that email/phone registration is not available.
- Reworked the signed-in start panel into a consultation-first composer: one open question, no mandatory trade/mode selection, and practical context fields behind an optional disclosure.
- Changed the default trade classification to `unsure` so the UI does not silently assume carpentry when the worker has not selected a trade.
- Updated history labels to say conversations and clarified that the existing identity is a private preview identity, not the final personal-account system.

### Deliberately not represented as complete

- Email or phone registration, verified personal accounts, profile, Discover, and community are not implemented in this UI pass.
- AI inference is still disabled. Saving a question and receiving a deterministic safety/evidence assessment is not the same as live research or an AI answer.
- Voice input and spoken response playback are not implemented in this pass; the page describes read/listen as a product direction, not a working control.
- The example answer on the public page is explicitly marked illustrative, not live or verified technical guidance.

### Validation still required

A Cloudflare Pages preview deployment was started from this branch to validate the React/Vite build. Confirm its final build/deploy status and test public and signed-in flows before treating this implementation as complete. Production remains disabled and untouched.


### Follow-up refinements

- Recent conversations now appear immediately after the consultation composer/results, ahead of the technical evidence contribution form.
- The Bitcoin payment-request preview has been removed from the primary Home screen. Its component remains in the codebase for a future optional wallet/profile area; it is not part of the core consultation path.
- Optional context now includes trade, response language, measurement units, jurisdiction, equipment make/model, measurements, materials, tools and constraints. The worker can still submit a question without opening this section.

### Build verification

Cloudflare Pages preview deployment `30ff112e` completed successfully for commit `8b2740e7aeecc58714493889b3bfafdf5e48b66c`. Its build command is `npm run build`, which runs TypeScript typechecking followed by the Vite production build. The earlier failed attempt exposed unused preference state after the first UI refactor; optional preference controls were restored and the subsequent build passed.

The final refinement commit `725c18f995d0615af56ebb3349636a0bb07ab5b8` (history ordering and removing the payment preview from Home) has its own preview deployment in progress. Run the repository's Vitest suite and manually verify the preview's public, recovery and signed-in flows before merging. This PR remains separate from `main`; production deployments remain disabled.

- The signed-in view no longer repeats the large public hero above the composer; the consultation composer is the first main content after the compact header.
- The Bitcoin payment-request preview is not rendered on Home. It remains a separate optional component for a later wallet/profile surface.


### Final preview verification — 17 November 2026

- Final feature-branch snapshot is deployed to the preview URL: `https://bb6c9f9f.kivora-bfx.pages.dev`.
- Cloudflare Pages deployment `bb6c9f9f` completed successfully for the branch head containing the public homepage, consultation-first signed-in screen, optional context controls, recent-conversation priority, and removal of the payment preview from Home.
- The deployment ran `npm run build`: TypeScript `tsc --noEmit` passed, Vite production bundling passed, and the Pages Functions Worker compiled successfully.
- Dependency installation reported zero vulnerabilities in the deployment log.
- The separate Vitest suite was not run by the Pages build. GitHub commit status returned no status checks for this branch snapshot, so do not claim the test suite passed.
- Cloudflare project configuration was rechecked: production branch remains `main` and `production_deployments_enabled` remains `false`.

This first-screen implementation is ready for human review on PR #33. Do not merge it until the Vitest suite and manual preview flows are reviewed. Voice, final email/phone personal accounts, live AI/research, Discover, profiles and community remain separate implementation work.
