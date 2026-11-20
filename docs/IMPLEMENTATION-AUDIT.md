# KIVORA Existing Implementation Audit

**Audit basis:** Repository main-branch product documents and the currently open implementation pull requests reviewed on 2026-11-16. This is a product/architecture audit, not a claim that every deployed route has been manually exercised.

## Executive finding

The repository contains useful security, session, trade-classification, safety and wallet foundations. However, the current product framing still over-centres a work intake/investigation flow. That is not the agreed KIVORA experience.

The immediate correction is product architecture and UX: account-based access, public homepage, signed-in Home, natural-language consultations, multiple independent conversation threads, integrated research and spoken results. A worker must not be forced to create a workspace or fill out a job form to learn something.

## Keep

- Multi-trade scope and shared intelligence/safety foundations.
- Owner-scoped private records, secure session handling, recovery protections, same-origin mutation protections, bounded inputs and rate limits.
- Trade/hazard classification and deterministic safety checks, subject to continued tests and review.
- Evidence provenance and uncertainty principles.
- Mobile-first React/Vite/TypeScript application foundation.
- CI checks, typechecking, automated tests and production build.
- Optional wallet work as an isolated capability; testnet-only and not required for AI access.

## Improve / repurpose

- Anonymous worker identity and recovery: useful security groundwork, but it is not the final account experience. Add a verified account/contact model and link existing private records safely if feasible. Do not discard recovery protections until account recovery is implemented.
- Private work sessions/messages: repurpose the underlying private thread model as consultation conversations. Rename concepts in user-facing copy; do not assume every thread is a job or investigation.
- Trade selection/context: make it optional profile/context enrichment and ask progressively only when relevant.
- Follow-up handling: retain conversation continuity but make the entry point a natural consultation, not a structured intake.
- Existing dashboard/navigation: review and simplify around Home, Ask KIVORA, Discover and Profile.

## Replace or substantially redesign

- Workspace creation as the first signed-in interaction.
- Job-first intake as the universal entry point.
- Mandatory or front-loaded trade, jurisdiction, model, measurements, tools and materials fields.
- Deterministic "clarify" response as a substitute for a capable consultation/research experience when a question can be answered directly or researched.
- Any UI language that implies KIVORA is only a job investigation tool.

## Not yet implemented / not verified as working

- Real AI inference and a research orchestration/provider integration. Current documented state says AI is disabled; no production inference should be implied.
- A populated reviewed technical evidence corpus and end-to-end source retrieval quality.
- Natural speech output/TTS and integrated voice playback.
- Speech input/transcription.
- Email/phone account authentication.
- Full public homepage and signed-in dashboard matching the agreed hierarchy.
- Discovery catalogue and content management.
- Professional profile and privacy controls.
- Community service, moderation and contribution trust lifecycle.
- End-to-end multi-device account recovery and deployed integration tests.

## Existing open pull requests requiring realignment

- **PR #30 — structured practical context:** useful safety/context work, but its job-intake presentation should not become the main KIVORA entry point. Preserve underlying context and tests; redesign the UI as progressive, query-specific clarification.
- **PR #31 — multi-investigation workspace:** it removes some forced model details and allows multiple investigations, but still frames the product around a workspace and investigation types. Do not merge unchanged as the final UX. Reuse thread/session foundations and redesign as account-based consultations.
- **PR #29 — product/business blueprint:** predates the clarified Consultation + Discovery + secondary Community hierarchy. Update or supersede its product direction before treating it as authoritative.
- **Wallet PRs #22, #27 and #28:** remain optional and separate. Keep testnet/recovery/security restrictions. Do not let them block the worker-intelligence core.

## Release and deployment boundaries

- Work against feature branches and preview deployments.
- Do not merge to main if that would trigger production deployment.
- Do not enable production deployment, production AI inference, paid API use, mainnet or real-fund payments.
- Do not claim voice, AI research, authentication or community features work until implemented and tested.
- Before launch, verify the complete Android flow, account persistence/recovery, privacy isolation, safety tests, provider cost limits, source quality and voice playback.

## Recommended next implementation order

1. Product blueprint and screen journeys become the source of truth.
2. Map current routes/components and create a redesign plan without destructive changes.
3. Public homepage and authentication/account architecture.
4. Signed-in Home and consultation thread UX.
5. Research-capable AI orchestration and evidence/source rendering, behind cost and safety gates.
6. Spoken response playback; add speech input if provider/time allows.
7. Discovery and professional profile foundations.
8. Community only after core consultation/discovery paths.
9. Wallet continues on a separate track and never gates AI.

## Confidence and limits

This audit is grounded in the current main-branch README/PRD/architecture/decision/implementation documents and descriptions/files of open PRs #22, #27–#31. It does not certify production behaviour, deployed database state, provider billing, or every branch's latest code. Re-run CI and Android end-to-end checks on the exact branch head before release decisions.


## Direct code inspection — consultation UI branch

The application source in `feat/multi-investigation-workspace` was inspected directly (`web/src/App.tsx`, 50,280 characters; `web/src/styles.css`, 10,625 characters):

- The identity state machine is `checking | welcome | recovery | recovery-code | ready`. The first interaction creates an anonymous worker identity and recovery code rather than a verified email/phone account.
- The ready state renders a section labelled **WORKSPACE** and asks "What would you like to look into?" with three options: work on a job, understand a machine/product, explore a topic.
- Although the choices broaden the entry point, the submit handler still requires a task description and valid trade/language/unit preferences. It creates a work session and encodes the selected type as an investigation. Thus the UI remains a structured intake flow rather than a free-form consultation-first experience.
- The response presentation includes **INITIAL WORK ASSESSMENT** and **KIVORA RESPONSE**. The response schema is oriented around clarify/escalate/guided/unavailable, compatibility status, safety level, blocks and citations. This is useful safety/evidence scaffolding, but it is not yet a general research agent or a full consultation UX.
- The inspected application component contains no voice/audio playback or speech input implementation.
- The inspected stylesheet uses DM Sans, DM Mono and Playfair Display from Google Fonts and a restrained warm-neutral palette. The existing visual direction can be evaluated and selectively retained; it should not dictate the new information architecture.

The code inspection confirms the key product mismatch: changing the three entry labels did not remove the underlying required work-intake model. The redesign must start from an open consultation composer and only request trade/task details progressively when they matter.
