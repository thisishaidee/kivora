# Worker Identity and Private Sessions

**Status:** API and UI implemented on `feat/worker-identity`; Cloudflare D1 database and schema are provisioned. Worker deployment and end-to-end browser verification are still pending.

## Goals

- Support many independent workers from the beginning.
- Keep each worker's work sessions private by default.
- Avoid mandatory email, social login or wallet connection for ordinary access.
- Allow a worker to restore access on another device without storing a plaintext credential on the server.
- Keep identity and work-session data separate from any Bitcoin/Lightning wallet.

## Credential model

Use an anonymous worker identity with two separate credentials:

1. **Browser session credential:** a random 256-bit value, delivered only in a Secure, HttpOnly, SameSite=Strict, __Host- prefixed cookie. Store only its SHA-256 hash in D1.
2. **Recovery code:** a separate random 256-bit value displayed once at creation. Store only its SHA-256 hash. The worker must save it privately. A successful recovery rotates the recovery code and creates a new browser session; the old recovery code becomes invalid.

Generate random values with the Web Crypto API (crypto.getRandomValues). Hash with crypto.subtle.digest("SHA-256", ...). Never log either credential or include them in analytics, URLs, error messages or client-side telemetry.

The recovery code is a bearer secret. Explain this clearly in the interface and do not describe it as recoverable if the worker loses both the browser cookie and recovery code.

## Cookie requirements

Production cookie shape:

    __Host-kivora_session=<opaque-random-token>; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000

Do not set a Domain attribute. Require HTTPS in production. A session lasts 30 days; do not write a last-seen timestamp on every request because that creates unnecessary database writes. Expired and revoked sessions must fail closed.

## Request protections

- Same-origin browser API only; do not enable wildcard CORS.
- For state-changing requests, require an Origin header matching the request origin.
- Require JSON content type and enforce a small body-size limit before parsing.
- Validate all input with shared Zod schemas.
- Use parameterised D1 statements only.
- Resolve the worker identity from the validated session cookie, never from a client-supplied worker ID.
- Every session read, update, archive, restore and delete must include the authenticated worker ID in the database predicate.
- Return generic authentication errors; do not reveal whether an identity or recovery code exists.
- Never log cookies, recovery codes, message content, images or audio.
- Avoid third-party analytics on authenticated work screens.

## Recovery flow

1. Worker creates an identity.
2. Server stores hashes of a recovery code and browser session token.
3. Server sets the HttpOnly session cookie and returns the recovery code exactly once.
4. Worker saves the code somewhere private.
5. On a new device, worker submits the code over HTTPS.
6. Server hashes it, atomically consumes/rotates the old recovery hash, creates a new session and returns the replacement recovery code once.
7. Old recovery codes cannot be reused.

If a worker has a valid browser session but loses their recovery code, provide an authenticated recovery-code rotation flow that invalidates the previous code.

## Initial data model

See ../migrations/0001_worker_identity.sql. It creates worker identities, browser sessions and private work sessions. Work messages and media assets are deliberately deferred until retention, deletion and upload security are designed.

## Abuse controls and free-tier discipline

The first implementation must set conservative request and payload limits. Do not introduce a paid anti-abuse provider without approval. Evaluate Cloudflare-native rate limiting or Turnstile only after confirming availability and limits for the account.

Cloudflare's current documentation lists Workers Free at 100,000 requests/day and 10 ms CPU per invocation. D1 Free currently includes 5 million rows read/day, 100,000 rows written/day and 500 MB per database, with a 50-query-per-invocation limit. Cloudflare began enforcing daily D1 read/write limits on 1 September 2026; queries fail until the daily reset after a limit is exceeded. Index ownership and expiry fields, avoid full-table scans, and avoid per-request writes.

These quotas are ceilings, not a usage target. Measure actual usage and flag a limit before it blocks workers. Do not upgrade or enable paid billing without explicit approval.

## Deployment gate

Do not enable identity endpoints until:
- A D1 database exists in the user's Cloudflare account.
- The database ID and binding are configured without committing secrets.
- The migration has been applied and checked.
- Cookie, origin, recovery rotation, ownership isolation and expiry tests pass.
- The production domain is HTTPS.
- Data retention and deletion behaviour are visible to workers.

## Implemented API surface

- `POST /api/identity` — create an anonymous identity and issue the browser cookie plus a one-time recovery code.
- `GET /api/identity` — resolve the identity from the cookie.
- `POST /api/identity/recover` — consume the previous recovery code, rotate it and revoke prior browser sessions.
- `POST /api/identity/recovery/rotate` — rotate a recovery code from an authenticated browser session.
- `POST /api/identity/logout` — revoke the current browser session and clear its cookie without deleting the identity.
- `DELETE /api/identity` — delete worker-owned sessions/messages, revoke browser sessions and remove the worker identity record.
- `GET /api/work-sessions` — list only the authenticated worker's sessions.
- `POST /api/work-sessions` — create a private session and save the initial task as a worker message.
- `GET /api/work-sessions/:id` — read only when both session ID and authenticated worker ID match.
- `POST /api/work-sessions/:id/messages` — append a worker message after an owner-scoped existence check.
- `PATCH /api/work-sessions/:id` — archive or restore only an owned session.
- `DELETE /api/work-sessions/:id` — delete messages and session using owner-scoped predicates.

All non-GET API requests require an exact same-origin `Origin` header. JSON bodies are streamed and capped at 24 KB; task/message content is capped at 20,000 characters. Cloudflare Rate Limiting bindings are configured for 20 identity creation/recovery attempts per IP per minute and 120 authenticated API requests per worker per minute. These limits are approximate and local to each Cloudflare location, not a global hard quota. The IP limit is deliberately only used for anonymous identity creation/recovery; authenticated requests are keyed by worker ID. The session cookie is Secure, HttpOnly, SameSite=Strict, Path=/, host-only and expires after 30 days. The worker source is plain JavaScript-compatible TypeScript so the exact module can be uploaded directly without a bundling step.

## Current Cloudflare state

- D1 database `kivora` was created in the connected Cloudflare account on 13 November 2026.
- Database ID: `3657a2bf-f4c2-484e-a214-8fdd05435c59`.
- The four tables and five owner/expiry indexes from migrations 0001 and 0002 are present.
- `PRAGMA foreign_key_check` returned no violations.
- The Wrangler configuration on this branch binds `DB` to that database.
- Cloudflare Worker script `kivora` was uploaded on 13 November 2026 with the D1 and two Rate Limiting bindings.
- Its `workers.dev` endpoint is disabled and no public route is attached; the script is deployed but not publicly reachable.
- The static app assets have not been deployed yet, so the public application is not live.

Deleting an identity removes its worker row, recovery hash, browser-session rows, work-session rows and message rows. A logged-out identity remains available until its owner restores it or explicitly deletes it. There is no automatic age-based retention yet; workers should delete sessions they no longer need.

No account credentials or wallet secrets are stored in the repository.
