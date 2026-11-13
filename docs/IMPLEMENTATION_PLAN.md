# KIVORA Implementation Plan

## Stage 0 — Product and submission foundation
- [x] Confirm multi-trade product direction.
- [x] Define evidence and safety principles.
- [x] Verify official Dakar Bitcoin Hack submission requirements.
- [ ] Complete technical provider and platform capability checks.

## Stage 1 — Application foundation
- [x] Mobile-first application shell.
- [x] Shared typed trade, language and unit contracts.
- [x] Minimal API health endpoint.
- [x] CI typecheck, unit tests and production build.
- [ ] Deploy preview and verify on Android.

## Stage 2 — Worker identity and private work sessions
- [x] Design anonymous worker identity and one-time recovery credential.
- [x] Define hashed credential storage and HttpOnly cookie requirements.
- [x] Define private session schema and ownership indexes.
- [x] Create and bind the free D1 database.
- [x] Apply and inspect the initial schema and indexes; foreign-key check returned no violations.
- [x] Implement anonymous identity creation, cookie session validation, one-time recovery and recovery rotation.
- [x] Implement private work-session create/list/read/archive/restore/delete and worker message storage.
- [x] Enforce owner-scoped predicates, same-origin state changes and bounded JSON request bodies.
- [x] Add user-facing recovery-code handling, device logout and identity/session deletion controls.
- [x] Configure Cloudflare Rate Limiting bindings for anonymous identity and authenticated worker routes.
- [ ] Verify rate limits and recovery replay behaviour on the deployed Worker; define an automated retention policy.
- [ ] Run real D1 integration tests and cross-worker isolation tests against the deployed Worker.
- [ ] Deploy the Worker and verify the browser flow end to end.

## Stage 3 — Evidence-backed task workflow
- Structured task intake and trade classification.
- Follow-up questions for missing context.
- Curated technical source ingestion and retrieval.
- Evidence passage provenance and model applicability.
- Compatibility status: compatible, incompatible or undetermined.
- Deterministic trade-specific safety gates before generation and response validation after generation.

## Stage 4 — Voice and image
- Secure image upload and retention controls.
- Push-to-talk audio capture, transcript correction and spoken responses.
- Benchmark Nigerian English, Pidgin, French and workshop noise.
- Text fallback for unsupported or unavailable speech.

## Stage 5 — Worker validation
- Recruit 3–5 workers each in carpentry, plumbing and HVAC for initial validation.
- Test actual recent jobs and compare answers with manuals and qualified judgement.
- Expand other trades with bounded capabilities and trade-specific policies.

## Stage 6 — Hackathon integration and release
- [x] Confirm the official submission requires a Bitcoin/Lightning wallet implementation.
- [ ] Select and implement a real, testable wallet integration.
- [ ] Keep wallet use separate from ordinary AI access; never store seed phrases or private keys.
- [ ] Publish an accessible MVP or demo video.
- [ ] Prepare the three-minute presentation and final submission.
- [ ] End-to-end testing, privacy review, threat review and demo rehearsal.

## Delivery rule

No paid provider, paid Cloudflare plan, billing activation or user-fund transaction without explicit approval. A feature is complete only after its tests and real-device checks pass.
