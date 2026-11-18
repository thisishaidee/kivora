# KIVORA source verification model

## Purpose

KIVORA must distinguish finding a document from proving who published it, deciding whether its technical content is correct, and observing what happened on a particular job. These are different claims and must never be collapsed into one "verified" badge.

## Statuses currently implemented

| Record | Current status | What it means |
| --- | --- | --- |
| Tavily result | `unverified_lead` | Search discovered a title, URL and excerpt. The publisher, document, revision and applicability have not been authenticated. |
| Worker-captured source | `pending`, private | A worker saved a source link and their own concise note. It is private, has not been independently reviewed and cannot support technical guidance. |
| Shared evidence record | `approved` | The server may use it only when the existing rights, reviewer-role, trade, jurisdiction and product applicability gates also pass. |
| Worker outcome | Field observation | A report about one job. It is not independent proof and must not be promoted automatically to technical evidence. |

The current schema does **not** independently track an official-publisher verification status. Therefore, the product must not display "Official source verified" based only on a search result, a matching-looking hostname, a manufacturer name in a title, or an HTTPS connection.

## Required verification levels

### 1. Publisher / origin authentication

Before KIVORA can claim **Official source verified**, the publisher identity and document origin must be authenticated using one of:

- An exact host in a maintained, reviewed publisher registry, with a documented basis for trusting that host; or
- A manual check by an authorised reviewer against the publisher's independently established official channels.

A suffix match is not sufficient. For example, `manufacturer.example.attacker.test` is not a subdomain of `manufacturer.example`. URL user-info, non-HTTPS links, deceptive hostnames and unreviewed redirects must not be treated as proof of origin. A hostname match alone remains an origin clue, not proof that a particular PDF or page is genuine.

Record the verification method, reviewer or registry entry, checked URL/host, timestamp and document fingerprint where available. If the origin cannot be established, retain **Unverified source**.

### 2. Technical content review

Publisher authentication does not prove that the technical content is current, correct or applicable. A qualified reviewer or manufacturer reviewer must separately check:

- Document identity, revision and date;
- Exact product make/model and applicable variant;
- Trade, jurisdiction and installation/service context;
- Units, measurements, limitations and stated prerequisites;
- Safety warnings, prohibited actions and whether the cited section actually supports the proposed claim;
- Usage rights before the material is shared.

Only the existing server-side approval process may make evidence eligible for guidance. A browser user, Tavily, an AI model or a worker observation must never grant this approval. Existing evidence eligibility checks must remain fail-closed.

### 3. Field observation

A worker may report an outcome from one specific job. Keep the report attributed to that work session and label it **Field observation — not independently verified**. Do not generalise it into a universal procedure, compatibility claim or manufacturer specification. Repeated observations may inform a later review queue but cannot approve themselves.

## Product display rules

- Search results: **Unverified lead**.
- Saved worker source: **Pending review · Private**. The capture form records exact product make/model, document version or revision, revision date, jurisdiction and page/section when known, so a later reviewer can assess applicability instead of guessing.
- Authenticated origin without technical approval: **Official source verified · Technical review pending** only after the origin check above has actually been implemented and recorded.
- Approved technical evidence: show the reviewer-approved state and its scope; never imply that it applies to a similar but unconfirmed model.
- Worker outcomes: **Field observation**.

Do not show a green "verified" badge for search discovery. Do not upgrade source status because an AI model agrees with the result. Do not treat a successful HTTPS request as publisher authentication.

## Current implementation boundary

The research interface displays Tavily output as unverified leads and allows a lead to be saved privately for review. Plain HTTP, credential-bearing, malformed, localhost, local-network and IP-literal source links are rejected at capture; research results are filtered using the same conservative host checks before they are shown as clickable links. Field observations are visibly labelled as not independently verified. The existing approved-evidence pipeline remains the only route by which reviewed shared records can support guided technical content.

A complete official-origin verification workflow is not yet implemented: there is no curated publisher registry, reviewer authentication workflow, document fingerprint review UI or independently persisted origin-verification record. Until those controls exist, KIVORA must not claim the official-origin level.
