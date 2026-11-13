# KIVORA Initial Architecture

**Status:** Proposed architecture for validation, not a frozen implementation specification.

## Design goals

- Mobile-first and practical on Android.
- One shared intelligence workflow across trades.
- Trade-specific technical knowledge, safety and verification boundaries.
- Evidence traceability and explicit uncertainty.
- Text, image and voice inputs through the same orchestration path.
- Affordable infrastructure, preferring free tiers, credits and open source where practical.
- Modular implementation without premature distributed systems.

## High-level workflow

```text
Worker input (text / image / voice)
  -> input validation and normalisation
  -> task and trade classification
  -> shared work-context engine
  -> trade-specific knowledge and policy
  -> technical source retrieval
  -> evidence quality and applicability evaluation
  -> trade-specific safety gate
  -> ask for missing context OR provide structured guidance
  -> checkpoints and bounded verification
  -> reviewed outcome capture
```

Shared workflow does not mean shared technical conclusions. Each trade package owns its technical constraints and safety policy.

## Application structure

Start with a modular monolith. Keep boundaries clear in code, but do not split into microservices without a demonstrated need.

Suggested modules:

- `input`: text, image and audio validation/normalisation.
- `orchestration`: workflow coordination and provider selection.
- `tasks`: trade/task classification.
- `context`: work-session state, known facts and missing information.
- `trades`: trade-specific terminology, knowledge and policies.
- `sources`: source catalogue and retrieval.
- `evidence`: provenance, quality, passage relevance and applicability.
- `safety`: trade-specific hazard checks, refusal and escalation.
- `guidance`: structured response generation.
- `verification`: checkpoints, observations and bounded outcome assessment.
- `knowledge`: reviewed outcome records and contribution lifecycle.
- `usage`: rate limits, metering and optional payment-linked entitlements.

## Provider boundaries

Use adapters so the application is not coupled to one AI or speech vendor. Candidate interfaces include multimodal reasoning/structured output, speech-to-text, text-to-speech and optional embeddings/reranking.

No provider is selected here. Benchmark quality, latency, cost, data handling, supported languages and runtime compatibility before choosing. Voice tests must include Nigerian English, workshop noise, technical terms, names, model numbers and measurements.

## Voice pipeline

1. Capture a short push-to-talk recording.
2. Validate file type, duration and size.
3. Send audio securely to the backend.
4. Transcribe speech to text.
5. Show the transcript so technical terms and measurements can be corrected.
6. Pass corrected text through the same context, evidence and safety workflow as typed input.
7. Return structured guidance.
8. Optionally synthesise speech for playback.

Voice must never bypass evidence or safety controls. Text remains available if speech services fail. Continuous conversation and live camera assistance are later phases.

## Retrieval and evidence

Begin with a small curated source collection and metadata. Test retrieval quality before introducing vector infrastructure.

Where available, source records should capture publisher/manufacturer, document title, URL or identifier, product/model applicability, trade/topic, revision date, retrieval date, relevant page/section and source-quality notes.

Preserve the passage used to support each technical claim. A search snippet or similar-model manual is not proof of applicability. Start with full-text search if it meets benchmark needs; add embeddings/vector search only when measured retrieval failures justify them.

## Structured response contract

The internal response should represent:

- `task_understanding`
- `trade`
- `identified_items`
- `known_facts`
- `missing_information`
- `technical_requirements`
- `compatibility_status` (compatible / incompatible / undetermined)
- `recommended_next_steps`
- `safety_warnings`
- `escalation_required`
- `evidence_sources`
- `confidence_and_limitations`
- `verification_checks`

The interface can render this in worker-friendly language. The model must not invent evidence references or silently omit unresolved safety questions.

## Conceptual data entities

Potential entities: User, WorkSession, WorkMessage, MediaAsset, TaskClassification, TradeProfile, ProductIdentification, TechnicalSource, EvidencePassage, CompatibilityAssessment, SafetyAssessment, GuidanceResponse, VerificationRecord, FeedbackRecord and UsageRecord.

This is a conceptual model, not a committed schema. Data minimisation, retention, consent and access controls must be designed before storing user media or job records.

## Infrastructure candidates

Cloudflare is the preferred deployment direction based on current project constraints. Workers or Pages Functions, D1 and R2 are candidates, not final selections. Verify current limits, pricing, regional performance, privacy, runtime compatibility, backup and export options before committing. Never put provider secrets in client code or public repository files.

## Security and reliability

- Keep credentials server-side.
- Validate MIME types, file sizes, audio duration and request schemas.
- Apply authentication, rate limits, abuse controls and usage accounting.
- Avoid logging raw audio, images or sensitive job details by default.
- Define media retention and deletion behaviour before launch.
- Provide recoverable errors and text fallback for voice failures.
- Keep payment records separate from technical knowledge.
- Grant entitlements only after independently verified payment events.
- Do not expose private job records to other users.

## Initial non-goals

No microservices/Kubernetes, dedicated vector database before retrieval evaluation, general-purpose autonomous agent framework, live video streaming, 3D reconstruction, marketplace/token economy, compliance certification or complete expert knowledge base for all trades.

## Validation gates

1. Inspect the repository and runtime constraints.
2. Benchmark text/image reasoning on the candidate scenarios.
3. Compare speech providers using workshop-style recordings.
4. Test source retrieval and model applicability.
5. Test safety boundaries with incomplete and adversarial inputs.
6. Measure latency and estimated cost per work session.
7. Test mobile usability on a real Android device.
8. Evaluate Bitcoin/Lightning separately without coupling it to ordinary AI access.
