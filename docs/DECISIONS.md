# KIVORA Decision Log

This log distinguishes accepted product decisions from hypotheses and unmade technical choices.

## Accepted decisions

### KDV-001 — Working name
Use **KIVORA** as the working brand. Trademark, company, domain and social-handle availability are not established here.

### KDV-002 — Multi-trade scope
KIVORA must support multiple skilled-worker fields from the outset: carpentry/furniture, electrical, plumbing, HVAC/refrigeration, mechanical/equipment repair, and construction/installation. Shared workflow does not mean shared technical conclusions; each trade retains its own technical knowledge, standards, safety and verification.

### KDV-003 — Product purpose
Position KIVORA as practical intelligence that helps skilled workers move from uncertainty to informed action. It is broader than repair chat, object identification or manual search.

### KDV-004 — Voice requirement
Voice is a first-class input/output capability alongside text and images. All inputs share the same context, evidence and safety engine. Start with push-to-talk and visible/editable transcripts; defer continuous conversation.

### KDV-005 — Bitcoin is not required for AI access
Ordinary AI use must not require a Bitcoin wallet. Bitcoin/Lightning is a hackathon-related and optional supporting capability, not the product identity.

### KDV-006 — Evidence and safety
Distinguish sourced facts, worker observations, AI hypotheses and verified outcomes. Do not fabricate specifications, citations, standards or measurements. Trade-specific safety gates and escalation are mandatory.

## Hypotheses requiring validation

### HYP-001 — Initial product wedge
Project-specific suitability and compatibility, supported by evidence-backed practical guidance, may be a meaningful differentiator. This is not yet a proven moat.

### HYP-002 — MVP scenarios
Carpentry and plumbing may suit deeper end-to-end tests, with bounded electrical and HVAC safety demonstrations. Validate with workers before treating this as final.

### HYP-003 — Infrastructure
Cloudflare Workers/Pages Functions, D1 and R2 are candidates. No final infrastructure selection has been made.

### HYP-004 — Retrieval
A curated source catalogue with full-text search may be sufficient for the first benchmark. Add vector retrieval only if measured quality requires it.

### HYP-005 — AI and speech providers
Cloudflare, Groq and Gemini are candidates for comparative tests. No provider has been selected.

### HYP-006 — Bitcoin/Lightning SDK
Wallet/payment SDKs require current checks for custody, security, Android/browser compatibility and send/receive support. No SDK has been selected.

## Deferred decisions

- Frontend framework and component system.
- Database schema and media retention policy.
- AI reasoning provider.
- Speech-to-text and text-to-speech providers.
- Retrieval/embedding infrastructure.
- Authentication and account model.
- Wallet SDK and payment/reward flow.
- Pricing, monetisation and initial launch coverage.

## Change control

When a decision changes, record the reason, evidence, trade-offs and affected documents. Do not describe a hypothesis as a confirmed market fact or an unimplemented capability as shipped.
