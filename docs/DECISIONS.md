# KIVORA Decision Log

This log distinguishes accepted product decisions from hypotheses and unmade technical choices. The current product specification is [PRODUCT-BLUEPRINT.md](PRODUCT-BLUEPRINT.md).

## Accepted decisions

### KDV-001 — Working name
Use **KIVORA** as the working brand. Trademark, company, domain and social-handle availability are not established here.

### KDV-002 — Multi-trade scope
KIVORA must support multiple skilled-worker fields from the outset: carpentry/furniture, upholstery/interior-related work, electrical, plumbing, HVAC/refrigeration, mechanical/equipment repair, and construction/installation. Shared workflow does not mean shared technical conclusions; each trade retains its own technical knowledge, standards, safety and verification.

### KDV-003 — Product purpose
KIVORA is an AI-powered practical intelligence platform that helps skilled workers understand more, discover better ways of working, make informed decisions, develop skills and solve unfamiliar problems. It is a product workers can return to even without an immediate job to solve.

### KDV-004 — Unified intelligence and research
Consultation, research, reasoning and guidance are one integrated intelligence experience. KIVORA automatically decides when research or deeper investigation is useful; users do not select a separate research mode.

### KDV-005 — Voice requirement
Voice is a first-class input/output capability alongside text and images. Spoken results must be available with usable playback controls. Voice input uses a visible/editable transcript. All inputs share the same context, evidence and safety engine.

### KDV-006 — Wallet is not required for AI access
Ordinary AI use must not require a Bitcoin wallet. Bitcoin/Lightning is optional supporting capability, not the product identity.

### KDV-007 — Evidence and safety
Distinguish sourced facts, worker observations, AI hypotheses and reviewed outcomes. Do not fabricate specifications, citations, standards or measurements. Trade-specific safety gates and escalation are mandatory.

### KDV-008 — Public homepage and personal account
The first public screen is a homepage explaining KIVORA before signup. The product uses personal accounts, not workspace creation as the onboarding step. Email and phone are desired sign-up methods, subject to provider, delivery, security and cost verification.

### KDV-009 — Multiple independent consultations
One user account supports multiple separate conversations about unrelated subjects. A conversation is not automatically a job, project or investigation. Ask only for context needed for the current question or safety.

### KDV-010 — Product hierarchy
KIVORA Intelligence is primary. Discovery and professional identity support it. Community is secondary and must not become the product's centre of gravity. Wallet is optional and separate.

### KDV-011 — Profile privacy
Professional profiles can describe multiple trades and skills and show voluntarily shared work/contributions. Private consultation history is private by default and is never automatically published.

## Hypotheses requiring validation

### HYP-001 — Initial product wedge
Project-specific suitability and compatibility, supported by evidence-backed practical guidance, may be a meaningful differentiator. This is not yet a proven moat.

### HYP-002 — Initial trade depth
The initial release can demonstrate multi-trade intent while prioritizing a smaller number of deeply validated scenarios. The precise depth by trade remains to be established.

### HYP-003 — Infrastructure
Cloudflare Workers/Pages Functions, D1 and R2 are candidates. Existing implementation uses parts of this stack, but operational suitability and limits still require verification.

### HYP-004 — Retrieval
A curated source catalogue with full-text search may be sufficient for the first benchmark. Add vector retrieval only if measured quality requires it.

### HYP-005 — AI and speech providers
No final reasoning, search, speech-to-text or text-to-speech provider has been selected. Benchmark quality, latency, cost, privacy and runtime compatibility first.

### HYP-006 — Authentication provider
Email and phone are desired account entry options. Provider selection and launch channel must be based on verification deliverability, account recovery, abuse controls, regional coverage, privacy and cost.

### HYP-007 — Monetisation
Pricing, usage limits and paid features remain unselected. Do not activate paid tiers or automatic billing without a separate decision and explicit approval.

## Deferred decisions

- Exact authentication provider and email/phone rollout.
- AI reasoning/search/retrieval providers and evidence corpus.
- Speech-to-text and text-to-speech providers.
- Source licensing and refresh policy.
- Data retention, privacy notice and jurisdiction-specific launch requirements.
- Initial trade coverage depth and validation sample.
- Wallet SDK, payment/reward flows, pricing and entitlements.

## Change control

When a decision changes, record the reason, evidence, trade-offs and affected documents. Do not describe a hypothesis as a confirmed market fact or an unimplemented capability as shipped.
