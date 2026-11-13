# Evidence source registry

## Purpose

The registry records where technical evidence came from, which trade and product it applies to, the version/revision, its jurisdiction and language, reuse rights, and who reviewed it. It is the future source of truth for the response pipeline.

## What is stored

- Source publisher, title, URL or private document reference.
- Source type, version, revision date and retrieval timestamp.
- Trade, topic, product make/model, jurisdiction and language.
- Reviewer-authored evidence note and page/section reference.
- SHA-256 source fingerprint when a stable source file is available.
- Rights status, license details, review state and reviewer role.
- Optional predecessor link when a source is superseded.

The registry does not store raw PDF/manual pages in D1. Evidence notes must be concise reviewer-authored paraphrases, not copied manual passages. A future document store must have a separate retention, access-control and deletion design.

## Visibility and rights

- Private records belong to one worker and are deleted with that worker identity.
- Shared records have no owner and can only be entered with public-domain, open-license or explicit permission rights recorded.
- Unknown or restricted rights cannot be approved for shared retrieval.
- User-provided private manuals stay private to that worker unless separate rights are established.

## Review states

- `pending`: captured but not eligible for AI guidance.
- `approved`: source applicability and evidence note reviewed; requires reviewer identity, reviewer role, review time and known reuse rights. Only a qualified reviewer or the manufacturer may authorize evidence for shared technical assessment.
- `rejected`: unsuitable, unreliable or unsupported.
- `superseded`: replaced by a newer source revision.

A review-state value is a data gate, not proof that the reviewer is competent. Production review tooling must verify reviewer authority before allowing approval. The assessment API accepts only approved, rights-cleared shared records reviewed by a qualified reviewer or the manufacturer. Private worker notes remain pending and are never used as evidence for other workers.

## Safety and applicability

Source matching must consider trade, task topic, exact model where relevant, jurisdiction, language, units, source revision and the worker's actual task. A manufacturer manual for one model must not be generalized to another. Standards and regulations require jurisdiction-specific matching.

The deterministic assessment API now queries this table using trade, topic, jurisdiction, manufacturer and exact model filters. The AI response composer is not yet connected to the registry, and no AI provider is configured. No source is automatically trusted or promoted to approved by the migration.
