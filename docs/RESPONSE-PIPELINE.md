# Evidence-grounded response pipeline

The provider-neutral response composer is a gated orchestration layer, not a connected AI service.

## Execution order

1. Parse and validate the worker request and source records.
2. Run deterministic hazard triage.
3. Return stop-work/escalation output without calling a model when a high-risk rule matches.
4. Return clarification questions without calling a model when required context or reviewed applicable evidence is missing.
5. Call an injected provider only when the assessment is eligible for guidance.
6. Validate every provider block against reviewed source IDs.
7. Reject measurements with units that do not appear in the cited source excerpt.
8. Reject a bounded set of explicitly dangerous instructions.
9. Return only verified source metadata as citations.

## Provider contract

The `IntelligenceProvider` interface accepts a structured work request, deterministic assessment and reviewed evidence records. It returns an untrusted value that must pass the Zod response schema and citation checks. No provider SDK or network call is included.

## Current limitations

- No provider is configured; the production path returns an unavailable state rather than fabricating a response.
- Evidence records are currently passed to the composer by trusted application code; a protected server-side source registry and ingestion/review workflow are still required.
- Numeric grounding is a conservative lexical check, not semantic verification of every claim.
- The dangerous-instruction matcher is not exhaustive and does not certify safety.
- No complete trade-specific safety coverage, legal/code interpretation, image or voice pipeline is claimed.
