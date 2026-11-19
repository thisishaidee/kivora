# KIVORA Account Authentication

**Status:** Account API, schema and frontend flows are implemented on the feature branch. Email delivery is not configured, so registration and password-reset requests fail closed. The anonymous worker identity remains a separate limited-preview path.

## Accepted account experience

KIVORA's normal account will use:

- Email address and password.
- Email verification before the account can sign in.
- Forgot-password and secure password-reset flow.
- Secure, revocable browser sessions.
- Account settings and an account-deletion path.
- A private worker profile associated with the account.

Phone-number registration, social login and wallet connection are not required for ordinary KIVORA access. Bitcoin/Lightning remains optional and must never gate access to the intelligence product.

The current anonymous worker ID and one-time recovery code are temporary preview access only. They must not be presented as the permanent account model.

## Security requirements

- Normalize email addresses consistently and enforce a unique account email.
- Implemented password hashing: PBKDF2-HMAC-SHA256 with 600,000 iterations and a unique 16-byte random salt per account. This is a password KDF, not a fast general-purpose SHA-256 hash. Before production, benchmark its CPU cost on the deployed Workers runtime and obtain a security review; reassess Argon2id if a vetted Workers-compatible implementation becomes practical.
- Set a minimum password length of 12 characters, accept long passphrases, and do not impose arbitrary composition rules.
- Implemented random 256-bit email-verification (24-hour) and password-reset (1-hour) tokens. Only SHA-256 token hashes are stored. Tokens are consumed atomically and cannot be replayed. Never put tokens in analytics, logs or error messages.
- Use generic responses for login and password-reset requests so account existence is not disclosed.
- Rate-limit registration, login, verification resend and password-reset endpoints independently. Apply progressive abuse controls without locking out legitimate workers permanently.
- Keep the session token in a Secure, HttpOnly, SameSite=Strict, host-only cookie. Store only its hash server-side. Revoke sessions after password reset, account deletion or explicit sign-out-all.
- Keep every conversation, evidence record and profile query scoped to the authenticated worker ID.
- Do not log passwords, reset links, verification links, cookies, recovery codes or private conversation content.

## Preview identity migration

The existing anonymous preview identity is a temporary access path. When account registration becomes available, a worker may explicitly link the current preview identity to their verified email/password account. Preserve that worker's private conversations and saved sources during linking. Do not silently discard or merge identities. A worker who skips linking starts with a new account.

## Email delivery gate

Email verification and password reset require a transactional email sender and a verified sender domain. Cloudflare Email Sending documentation currently states that sending to arbitrary recipients requires Workers Paid, and the connected Cloudflare account currently has no zones/domains available to onboard. Do not enable a paid plan, purchase a domain, or expose registration as working without explicit authorization and a successful end-to-end delivery test.

The Worker supports Resend (`RESEND_API_KEY`) and Brevo (`BREVO_API_KEY`) through server-side secrets, plus `EMAIL_FROM` and `APP_BASE_URL`. Brevo is preferred when both provider keys are configured. Brevo requires transactional sending to be enabled and the sender address/domain to be verified. Test real delivery before registration is enabled. Until a provider key and verified sender are available, registration and reset endpoints return an unavailable response and do not create a partial account. The D1 schema is in `migrations/0004_email_password_accounts.sql`; it has been applied to the isolated Preview database only.

## Lowest-cost email provider review

Do not buy a domain or enable a paid email plan for the first account release without comparing the zero-cost option first.

- Firebase Authentication on the Spark plan is the current leading option to evaluate: the plan is no-cost and does not require a payment method, and its documented limits include up to 1,000 address-verification emails/day and 150 password-reset emails/day. It supplies the password and email-action lifecycle, reducing the need to operate a custom password store and sender.
- Brevo's free plan currently includes 300 email sends/day and supports transactional email; it requires account approval for sending and a verified sender/domain. KIVORA now has a Brevo API adapter, so this is the quickest provider swap to test without changing the account database or password flow.
- Resend's free plan currently includes 3,000 emails/month and 100/day, but requires a domain that KIVORA controls and can verify in DNS.
- Supabase's built-in email sender is not suitable for general production sign-up: it is limited to team-authorized recipient addresses and currently 2 emails/hour. Custom SMTP is required for broader delivery.

No provider has been connected or paid for. Before committing to a provider, compare integration/security trade-offs and the exact current terms. The current Worker implementation retains a Resend sending adapter as a fallback; Firebase Spark should be evaluated before asking the founder to buy a domain.

## Release checks

1. Benchmark PBKDF2-HMAC-SHA256 (600,000 iterations) in the deployed Worker runtime and confirm it fits the configured CPU budget; obtain independent review.
2. Apply and verify the D1 account migration.
3. Test duplicate-email handling, password validation, verification expiry/replay/resend, reset expiry/replay, session revocation, rate limits and owner isolation.
4. Test real email delivery to controlled inboxes, including spam-folder and link-expiry behaviour.
5. Verify the flow on Android Chrome and a second browser.
6. Keep registration disabled until all checks pass.
