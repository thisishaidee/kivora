# KIVORA — Product & Business Blueprint

**Status:** Working product direction  
**North star:** Know what to do next.  
**Purpose:** Define how KIVORA's practical intelligence, optional Bitcoin wallet and commercial services fit together. This document guides product decisions; it does not authorise production releases, real-fund transactions, paid service activation or legal commitments.

## 1. Product thesis

KIVORA is an AI-powered practical intelligence platform for skilled workers. It helps a worker move from an unfamiliar or uncertain real-world task to a safe, evidence-backed and verifiable next step.

KIVORA is not merely a chatbot, a manual search engine, a generic AI wrapper, a wallet, or a single-trade assistant.

A worker should be able to explain what they are trying to do, show the actual product or equipment, provide measurements and constraints, describe the tools and materials available, and receive guidance that clearly separates applicable evidence from observations, hypotheses and unknowns.

**The value customers pay for is practical progress:** less time spent searching, fewer avoidable mistakes, clearer decisions, better documentation and more confidence about what to verify next. KIVORA must not promise that it prevents all mistakes or guarantees a successful repair.

## 2. Three connected product layers

### 2.1 KIVORA Intelligence — the core product

This is the primary product and the reason workers return.

Initial trades:
- Carpentry and furniture making
- Electrical work
- Plumbing
- HVAC and refrigeration
- Mechanical and equipment repair
- Construction and installation

Use one shared workflow with trade-specific terminology, evidence, standards and safety policies. A job may involve more than one trade; the most restrictive applicable safety policy governs.

A practical work session should connect:
1. The worker's goal and current problem.
2. Trade or trades involved.
3. Actual product, component, material or equipment and model where available.
4. Images, voice transcript and worker observations.
5. Measurements, location/jurisdiction where relevant, available tools/materials and constraints.
6. Missing information and targeted follow-up questions.
7. Applicable technical evidence and its provenance.
8. Safe next steps, verification checkpoints and unresolved uncertainty.
9. The outcome and useful project/equipment history.

### 2.2 KIVORA Wallet — optional financial infrastructure

The wallet supports receiving, sending and managing Bitcoin and Lightning payments. It is optional and must never be required to use ordinary KIVORA Intelligence features.

Users may create a KIVORA wallet or connect a supported existing wallet. The product must explain the custody and security model honestly. A connected NWC wallet is controlled by its underlying provider and must not automatically be described as self-custodial.

Wallet principles:
- Never send recovery phrases, private keys or unrestricted wallet credentials to KIVORA servers.
- Generate and use embedded-wallet keys locally with vetted libraries.
- Explain recovery in plain language before wallet creation.
- Make clear that loss of recovery material may mean permanent loss of access.
- Support address/network validation, transaction previews, deliberate confirmation and honest status reporting.
- Do not invent balances, fees, settlement, confirmations or payment success.
- A passkey/device lock may protect app access but is not automatically a replacement for wallet recovery.
- No mainnet or real-fund activation until security, recovery, operational and legal reviews are complete and separately approved.

### 2.3 KIVORA Economy — commercial and transaction services

The economy connects KIVORA's value to sustainable revenue and useful worker transactions:
- Free and paid product access.
- Subscription payment and entitlement records.
- Worker/customer/supplier payment requests and bookkeeping references.
- Expert consultation discovery and payment records.
- Rewards for reviewed and accepted knowledge contributions.
- Later business/team workflows and merchant services, only after demand and operational requirements are validated.

Keep protocol-level wallet facts separate from KIVORA's commercial records. A payment is not a subscription entitlement until the backend has independently verified the correct payment, amount, asset/network, destination, invoice/reference and settlement status. Entitlement changes must be idempotent and reconcilable.

## 3. Beginner-friendly crypto experience

Crypto should be introduced progressively, in ordinary language. Do not expose technical terminology as the first experience.

### Proposed onboarding sequence

1. **Explain the choice:** describe what a wallet does, what it does not do, why it is optional and what users can do without one.
2. **Create or connect:** offer creation of a new wallet or connection of a supported existing wallet. Explain the different trust and recovery implications before the choice.
3. **Explain protection:** show the recovery phrase only locally, explain why KIVORA staff will never ask for it, and guide the user to write it offline and store it privately.
4. **Confirm understanding:** use a local confirmation flow to check selected recovery words without transmitting or storing the phrase. Do not imply that this proves a user has a safe backup.
5. **Teach with low-risk actions:** explain receiving, payment requests, transaction status, fees and address/network checks before enabling more consequential actions.
6. **Support recovery:** provide a clear restore path and test recovery on a clean browser/device before any real-fund release.
7. **Keep help available:** plain-language explanations, accessible error recovery and clear warnings should be available later, not only during onboarding.

Avoid fear-based onboarding, unexplained jargon and pressure to fund a wallet. Do not require a user to purchase Bitcoin to complete education or testnet learning.

### Security controls to design and validate

- Local-only key and recovery phrase handling.
- Clear custody/provider disclosure.
- Device/app access protection, with accurate explanation of what it protects.
- Address format and network validation.
- Transaction preview showing destination, amount, asset/network, fee and meaningful warnings.
- Explicit user confirmation for every outgoing payment.
- No silent spending, auto-pay or automatic recurring debits.
- Scam-risk signals only when backed by reliable, maintained data; label limitations and never imply complete scam detection.
- Recovery and backup tests, including clean-device restoration.
- Session, clipboard, screen-capture and device-loss threat review appropriate to platform capabilities.
- Security incident and compromised-device guidance.

## 4. Product access and monetisation direction

### 4.1 Free access

Free should be genuinely useful and let a worker experience KIVORA's central value. It is not an unlimited promise.

Candidate free capabilities:
- Basic practical questions and guidance.
- A clearly disclosed allowance of AI-assisted investigations.
- Basic private work sessions.
- Essential safety guidance and safety escalation.
- Access to evidence summaries where available.
- Wallet education and optional wallet access.

Safety-critical warnings and appropriate escalation must never be withheld because a user is on the free tier.

### 4.2 KIVORA Pro

Pro should sell deeper practical productivity, not merely access to search results.

Candidate paid value:
- Higher, transparent investigation allowance.
- Deeper project-specific investigations and follow-up reasoning.
- Voice and image-assisted troubleshooting.
- Persistent project, equipment and work history.
- Better evidence comparison and model/applicability checks.
- Structured step-by-step workflows with verification checkpoints.
- Exportable job summaries and reports.
- Saved equipment/project context and reusable records.

These are proposed entitlements, not claims that every capability is already implemented. Pro boundaries must be based on tested customer value and actual operating cost.

### 4.3 Future professional services

Potential later revenue:
- Paid consultations with qualified experts.
- Business/team plans and shared work records.
- Customer and supplier payment workflows.
- Carefully reviewed knowledge-contribution rewards.

Expert qualifications, availability, liability, dispute handling, moderation and reward eligibility need explicit operating rules before launch.

### 4.4 Pricing and usage policy

Do not set final prices or promise unlimited usage yet.

Before pricing:
1. Measure cost per task class, including model inference, retrieval, storage, media processing and support.
2. Measure how often workers reach useful next steps and whether KIVORA saves meaningful time or reduces rework.
3. Model gross margin under realistic usage, abuse and payment-provider fees.
4. Select transparent limits and communicate what happens when a limit is reached.
5. Compare willingness to pay with demonstrated outcomes through user research and controlled experiments.

Use lower-cost models for suitable tasks and stronger models only when justified. Model routing must not bypass evidence, privacy or deterministic safety gates. Never silently downgrade safety or misrepresent the quality of a response to save cost.

## 5. Payments and access

Payment methods should meet users where they are. Crypto ownership is not a prerequisite.

Potential methods, subject to provider, country, compliance and cost review:
- Bitcoin Lightning.
- Bitcoin on-chain.
- Cards and suitable local payment methods.
- Supported external wallet connections.

For Nigeria and other target markets, investigate availability, settlement, fees, chargebacks, refunds, identity requirements and merchant restrictions before selecting providers. Do not assume a provider is available or suitable merely because it is popular internationally.

Subscription rules:
- Verify payments server-side with authoritative provider evidence.
- Use idempotency keys and reconciliation for retries and delayed callbacks.
- Clearly disclose billing period, renewal behaviour, cancellation and refund rules.
- Manual renewal by default for crypto unless a user explicitly authorises a safe, revocable recurring arrangement.
- Never infer payment from a screenshot or client-side success message.
- Do not activate paid entitlements on an unconfirmed or mismatched payment.

## 6. Trust, evidence and safety are core product features

The intelligence system must:
- Prefer applicable manufacturer documentation and credible technical sources.
- Preserve source identity, version/date and the passages supporting material claims.
- Distinguish sourced facts, worker observations, AI hypotheses, reviewed outcomes and unknowns.
- Mark compatibility as compatible, incompatible or undetermined.
- Treat exact-model evidence as applicable only within its stated scope; similar-model material is a lead, not proof.
- Never invent specifications, measurements, standards, citations or source content.
- Ask targeted questions when critical context is missing.
- Apply deterministic trade/hazard controls before generation and validate outputs afterwards.
- Allow model output to tighten safety but never override or loosen safety controls.
- Escalate or bound guidance when the task requires a qualified professional or missing conditions cannot be verified.
- Identify jurisdiction when standards or regulations are material.

Essential safety guidance is available across all tiers. KIVORA must be honest about the limits of remote assessment and image/audio interpretation.

## 7. Privacy and data handling

- Collect only information needed to deliver the requested workflow.
- Make work sessions private and owner-scoped by default.
- Explain media retention, deletion and any use for product improvement before collecting media.
- Do not use private job photos, voice recordings or documents for training without an appropriate, explicit basis and user choice.
- Keep provider API credentials server-side.
- Never log wallet secrets, recovery phrases, private keys or unrestricted wallet connection strings.
- Define retention and deletion rules for work sessions, payment metadata, support records and security logs.
- Avoid putting sensitive personal or customer information into analytics.

## 8. Delivery sequence and release gates

### Track A — Intelligence (primary, continuous)
1. Audit the current worker workflow against the PRD.
2. Complete one end-to-end evidence-backed work session: intake, trade classification, missing-context questions, reviewed evidence, safety gate, actionable response and verification.
3. Validate across the six initial trades with real workers and representative jobs.
4. Add voice and image through the same work-session, evidence and safety pipeline.
5. Improve project/equipment history, exports and Pro capabilities after user validation.

### Track B — Wallet (parallel, independently gated)
1. Finish testnet wallet and Lightning interoperability checks.
2. Verify recovery on a clean browser/device and complete HD address discovery, UTXO and transaction-state handling.
3. Complete read-only balance/activity accuracy and transaction-preview design.
4. Implement testnet send/receive only after recovery, fee, UTXO, signing and broadcast checks pass.
5. Conduct independent security review and operational/legal readiness review.
6. Consider mainnet only after a separate explicit approval.

### Track C — Economy (after value and payment verification)
1. Instrument infrastructure and AI cost.
2. Validate free/Pro value with workers.
3. Define entitlements and usage metering.
4. Select payment providers after geographic and commercial due diligence.
5. Implement test-mode payment verification and reconciliation.
6. Release paid activation only after end-to-end tests, refund/cancellation support and explicit approval.

### Non-negotiable release gates
- No production deployment or production configuration change without explicit approval.
- No real-fund movement or mainnet activation without explicit approval.
- No paid service, provider charge or subscription activation without explicit approval.
- No custody, escrow, fiat conversion, payouts or automatic recurring debits as incidental scope.
- No launch claim until the feature is actually implemented and verified.
- A successful build is not equivalent to a security review, user validation or production readiness.

## 9. Product validation and success measures

Measure outcomes, not vanity usage alone.

Intelligence:
- Time from initial question to a useful next step.
- Percentage of sessions with applicable evidence.
- Source/model applicability accuracy.
- Rate of unsupported or invented claims.
- Safety-policy violations and successful escalations.
- Task completion or worker-confirmed usefulness.
- Repeat use for real jobs and reduction in avoidable rework where measurable.

Wallet:
- Onboarding completion and comprehension.
- Recovery success on a clean device.
- Address/QR interoperability.
- Correctness of balances, fees and transaction status.
- User understanding of custody and irreversible payments.
- Failed, duplicated or misdirected payment rate.

Economy:
- Free-to-paid conversion after demonstrated value.
- Cost to serve by feature and plan.
- Gross margin after inference, infrastructure and payment fees.
- Payment verification and reconciliation accuracy.
- Refund, cancellation and support burden.

Do not optimise conversion by hiding fees, weakening safety, pressuring users to create wallets or making crypto compulsory.

## 10. Open decisions — deliberately not assumed

These require evidence or a separate decision:
- Final free-tier allowance and Pro limits.
- Subscription prices and billing periods.
- Which payment providers and countries to support first.
- Whether Pro includes specific voice/image quotas or metered usage.
- Expert marketplace qualification, liability and dispute model.
- Knowledge-contribution reward criteria and funding.
- Wallet custody/provider options and final recovery UX.
- Applicable legal/compliance requirements by launch jurisdiction.

## 11. Current project status discipline

Every feature must be labelled as one of:
- **Planned:** documented but not implemented.
- **Implemented:** code exists.
- **Build-verified:** typecheck, tests and production build pass.
- **Preview-verified:** deployed and exercised in a preview environment.
- **User-validated:** tested in the intended real device/workflow.
- **Release-approved:** separately authorised for the intended environment.

Do not collapse these states into a single "done" label. Keep the roadmap and status documents aligned with the actual default branch and open pull requests.

## 12. Decision summary

KIVORA is first a practical intelligence product for skilled workers. Its wallet is optional, beginner-friendly and security-led. Its economy monetises demonstrated practical value through transparent free and paid access, with multiple payment options where viable.

**Build the intelligence that earns trust. Make the wallet useful without making it compulsory. Charge for measurable productivity, not access to information alone.**
