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

### KDV-007 — Personal account authentication
KIVORA's normal account uses email and password, with verified email, forgot-password/password-reset, secure sessions and account deletion. Phone registration, social login and wallet connection are not required. The current anonymous worker identity and recovery code are temporary preview access only. Preserve private preview data during an explicit account-linking flow. Email delivery and password hashing implementation remain gated by provider setup and runtime security benchmarks; see [Account Authentication](ACCOUNT-AUTHENTICATION.md).

### KDV-008 — Progressive collection of product identification
Do not ask for a product manufacturer, make or exact model during account creation, preview access, or the first-question form. Let the worker begin with a natural-language question. Ask for manufacturer/model details inside the conversation only when those details materially affect identification, compatibility, specifications or safe guidance. Explain briefly why the detail matters, ask only for what is needed, and allow the worker to say they do not know. Existing saved conversations containing these details remain readable.

### KDV-009 — Image-first product and component identification
The conversation composer must support both taking a photo with the device camera and choosing an existing image from the device. This is an optional alternative to typing product names, manufacturer details or model numbers. Support multiple useful views where appropriate (for example, an overall view and a close-up of a label or connection). Ask for another angle or a label photo only when it materially improves identification. Image analysis must distinguish visible observations from inferred identity, state confidence and uncertainty, and never claim an exact model from an ambiguous image. Images are private to the worker and conversation; define file-type/size limits, access controls, retention/deletion and consent before enabling uploads. Do not expose image upload as working until secure media handling and a vision-capable analysis path are implemented and tested. AI/vision remains disabled until separately authorized.

### KDV-010 — Cross-device product commitment
KIVORA is a responsive web product for Android phones, iPhones, Android tablets, iPads, laptops and desktop browsers. No single device family is the product boundary or the sole design target. Layouts and controls must adapt to available space and input capabilities; camera, microphone, codecs and browser APIs must be feature-detected. Every major workflow requires phone, tablet and desktop acceptance coverage. Android-first language and Android-only acceptance criteria are not sufficient.

### KDV-011 — Video as a first-class conversation input
The conversation must support recording a video where the device/browser allows it and uploading an existing video from a media library or file picker. Video should help a worker show a product, tool, mechanism, sequence or fault; it is not limited to any one trade. Video analysis must inspect bounded representative frames with timestamps and may analyse audio only when a real audio pipeline is enabled. Results must distinguish visible events, audible observations, hypotheses and unknowns. Enforce published file-size, duration, codec, frame and cost limits. Video storage is private and subject to the same ownership, consent, retention and deletion requirements as images. Do not show video upload or claim video analysis until secure storage and a tested analysis pipeline exist. Provider selection, paid processing and activation remain separately gated.

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
- Wallet SDK and payment/reward flow.
- Pricing, monetisation and initial launch coverage.

## Change control

When a decision changes, record the reason, evidence, trade-offs and affected documents. Do not describe a hypothesis as a confirmed market fact or an unimplemented capability as shipped.
