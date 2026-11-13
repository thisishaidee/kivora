# KIVORA Implementation Plan

## Stage 0 — Product foundation
- [x] Confirm multi-trade product direction.
- [x] Define evidence and safety principles.
- [ ] Validate hackathon rules and any mandatory Bitcoin/Lightning requirement against official sources.
- [ ] Complete technical provider and platform capability checks.

## Stage 1 — Application foundation
- [ ] Mobile-first application shell.
- [ ] Shared typed trade, language and unit contracts.
- [ ] Minimal API health endpoint.
- [ ] CI build and typecheck.
- [ ] Deploy preview and verify on Android.

## Stage 2 — Worker identity and private work sessions
- Anonymous worker identity with a high-entropy recovery credential shown once.
- Store only a cryptographic hash of the credential.
- Private-by-default sessions with ownership checks on every read, write and delete.
- Session expiry, credential rotation/revocation, rate limiting and abuse controls.
- No cross-worker visibility by default.
- Decide recovery and data-retention UX before storing sensitive content.

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
- Verify official Bitcoin/Lightning rules and choose a secure, compatible implementation.
- Keep wallet use separate from ordinary AI access.
- End-to-end testing, privacy review, threat review and demo rehearsal.
