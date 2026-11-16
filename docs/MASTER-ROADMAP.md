# KIVORA Master Roadmap

**North star:** Know what to do next.  
**Product priority:** KIVORA Intelligence first; Wallet and Economy support it.  
**Operating rule:** Keep the three tracks coordinated. Do not let wallet development displace the core worker workflow.

This roadmap is the execution companion to PRODUCT-BUSINESS-BLUEPRINT.md and PRD.md. It records priorities and release gates; it does not authorise production changes, paid services, mainnet or real-fund movement.

## 1. Product tracks

### Track A — KIVORA Intelligence (primary)

**Goal:** Turn a worker's actual job context into an evidence-backed, safety-checked and verifiable next step.

Initial multi-trade coverage:
- Carpentry and furniture making
- Electrical work
- Plumbing
- HVAC and refrigeration
- Mechanical and equipment repair
- Construction and installation

Execution sequence:
1. **Structured job intake** — task, trade, product/equipment/model, jurisdiction, measurements, materials, available tools and constraints.
2. **Persistent work sessions** — save private job history and allow follow-up turns without losing the original context.
3. **Context completion** — targeted missing-information questions and clear distinction between worker observations and verified facts.
4. **Evidence foundation** — reviewed, rights-cleared source catalogue with exact model, trade, jurisdiction, revision and passage applicability.
5. **Grounded practical response** — explain why evidence applies, produce bounded next steps and cite exact evidence passages.
6. **Verification loop** — worker confirms observations/checkpoints; KIVORA records outcome without promoting unreviewed claims into trusted knowledge.
7. **Multimodal input** — images and push-to-talk voice through the same context/evidence/safety pipeline, with editable transcript and text fallback.
8. **Field validation** — test representative jobs across all six trades and measure usefulness, unsupported claims, safety outcomes and time-to-next-step.

Immediate implementation work:
- Complete and verify structured context intake, follow-up turns and worker observations (PR #30; CI and preview build passed; Android validation pending).
- Audit how follow-up context is preserved and reloaded across devices.
- Response-to-verification interaction is implemented in PR #30 for evidence-grounded responses; Android validation and evidence-backed response availability remain pending.
- Establish the reviewed evidence ingestion and approval workflow before expecting routine guided answers.
- Keep AI inference disabled until the account billing boundary and actual free/paid usage controls are verified and explicitly authorised.

### Track B — KIVORA Wallet (parallel, gated)

**Goal:** Make Bitcoin and Lightning useful to people who may be new to crypto, without making a wallet a requirement for KIVORA.

Execution sequence:
1. NWC Lightning connection and receive-invoice interoperability.
2. On-chain testnet wallet creation and BIP39 recovery.
3. Testnet address discovery, balance/activity accuracy, UTXO handling and transaction state.
4. Beginner onboarding, custody disclosure, recovery education and clean-device restore validation.
5. Testnet send/receive only after fee calculation, signing, broadcast and recovery checks.
6. Independent security review and operational/legal readiness.
7. Mainnet only after separate explicit approval.

Current work:
- Lightning wallet PR #22 remains open pending real Android interoperability checks.
- BDK testnet wallet PR #27 and BIP39 recovery PR #28 remain open and require integration in dependency order.
- User has already confirmed Android rendering of a testnet address/QR and Xverse recognition.
- The testnet explorer proxy is implemented on the BIP39 branch; its deployed preview and live balance/activity behavior still need validation.

Never request wallet secrets in chat. No real funds, mainnet, custody, escrow, fiat conversion, payouts or automatic recurring debits are included in ordinary implementation scope.

### Track C — KIVORA Economy (after value proof)

**Goal:** Charge for measurable practical productivity and enable useful worker transactions.

Execution sequence:
1. Measure AI and infrastructure cost by task class.
2. Validate free-tier usefulness and the Pro value proposition with workers.
3. Define transparent usage allowances and backend entitlements.
4. Research payment methods available in target countries, including Nigeria.
5. Implement payment verification, idempotency, reconciliation, cancellation and refund records in test mode.
6. Consider expert services, business tools and contribution rewards only after their operational rules are defined.

Open decisions: prices, free limits, Pro limits, billing periods, payment providers and supported launch countries. No paid activation or provider charges without explicit approval.

## 2. Cross-cutting quality requirements

### Evidence
- Only reviewed and rights-cleared shared evidence can ground technical guidance.
- Keep exact model, make, trade, jurisdiction, revision and page/section applicability.
- Similar-model documentation is a lead, not proof.
- Label worker observations, sourced facts, hypotheses and unknowns separately.
- Do not invent specifications, measurements, standards, citations or compatibility.

### Safety
- Deterministic pre-generation and post-generation checks remain authoritative.
- Multi-trade tasks use the most restrictive applicable policy.
- High-risk tasks do not call the generative model.
- Missing critical context leads to clarification or escalation.
- Safety guidance remains available on every access tier.

### Privacy and security
- Private work sessions are owner-scoped.
- Minimise sensitive data and define media retention before image/audio capture.
- No wallet secrets or provider credentials in server requests, logs or analytics.
- Follow-up messages must remain bound to the authenticated worker and owned session.
- Do not treat device authentication as a substitute for wallet recovery.

### Cost and reliability
- Keep AI inference disabled until account-level billing safety is confirmed and separately approved.
- Rate-limit model use and meter actual cost.
- Fail closed when evidence, model output or payment verification cannot be validated.
- Avoid paid dependencies unless explicitly approved.

## 3. Release-state vocabulary

Use these states in all project updates:
- **Planned** — documented only.
- **Implemented** — code exists.
- **Build-verified** — typecheck, tests and production build pass.
- **Preview-verified** — deployed and exercised in preview.
- **User-validated** — tested in the intended real-device workflow.
- **Release-approved** — separately authorised for the target environment.

A Cloudflare build passing npm run build verifies the configured TypeScript/build pipeline; it does not automatically mean Vitest, security review, user validation or production readiness has passed.

## 4. Current execution snapshot

| Work item | Current state | Next gate |
|---|---|---|
| Private worker identity and work sessions | Implemented on main | Continue workflow validation |
| Deterministic multi-trade triage | Implemented on main | Expand scenario tests |
| Grounded assistant endpoint | Implemented; inference disabled | Reviewed corpus and billing approval |
| Structured intake, follow-up turns and worker observations | PR #30; CI passed (93 tests) and preview deployed | Android workflow validation; then merge |
| Product/business blueprint | PR #29 | Align with PRD and implementation |
| Lightning wallet | PR #22 | Android NWC interoperability |
| BDK testnet wallet | PR #27 | Dependency integration and recovery review |
| BIP39 recovery | PR #28 | Clean-device restore and integration |
| Testnet explorer proxy | On wallet branch | Live endpoint and balance/activity validation |
| Subscription/entitlement system | Planned | Cost model and payment-provider due diligence |

## 5. Immediate next actions

1. Finish preview verification and automated tests for PR #30; fix any failures before merge.
2. Validate structured intake and follow-up flow on Android.
3. Audit and implement a worker-facing verification/checkpoint loop.
4. Define evidence review/approval workflow and curate the first legally reusable source set.
5. In parallel, verify the wallet testnet explorer proxy and clean-browser recovery.
6. Reconcile PR #22, #27 and #28 in dependency order without activating mainnet.
7. Instrument cost and validate the free/Pro value proposition before enabling inference or pricing.

## 6. Non-negotiable boundaries

- Preview-only deployments; production remains untouched.
- No real-fund transactions or mainnet.
- No paid provider/API activation or paid subscriptions without explicit approval.
- No wallet requirement for core Intelligence.
- No unsafe procedural guidance to improve conversion or reduce model cost.
- No feature described as complete unless its release state is accurately stated.
