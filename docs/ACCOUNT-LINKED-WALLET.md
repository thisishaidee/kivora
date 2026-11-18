# Account-linked wallet backup

**Status:** implementation and CI complete in PR #39; deployed to the isolated Preview environment. End-to-end account testing is blocked until secure email delivery is configured. Not enabled in production.

## Required user experience

A wallet belongs to the authenticated KIVORA worker account, not to a Preview URL or browser origin. After creating it once, the owner can sign in on another supported browser and retrieve the same wallet without entering the 12-word phrase during ordinary login.

The Create Wallet action remains visible only when the authenticated account has no wallet record. A stored record that cannot be decrypted is a recovery state, never permission to create a replacement.

## Cryptographic boundary

- The browser derives a backup-encryption key from the account password using PBKDF2-HMAC-SHA-256 with a fresh random salt and a reviewed work factor.
- The browser encrypts a versioned BDK backup envelope using AES-256-GCM with a fresh 96-bit IV. Associated authenticated data binds the ciphertext to the account worker ID, network, wallet format version, and record version.
- Only ciphertext, salt, IV, KDF parameters, format/network metadata, and non-secret timestamps may be sent to the Worker and stored in D1.
- The recovery phrase, BIP39 seed, private keys, derived encryption key, and decrypted BDK changeset must never be sent to the server or written to logs.
- The server authorizes reads and writes using the existing HttpOnly account session and enforces one wallet record per worker account. It cannot decrypt or replace wallet material.
- The account password is held only in component memory for the sign-in/create flow and cleared after the wallet is unlocked. It is not persisted in localStorage, IndexedDB, cookies, URL parameters, or analytics. A non-extractable derived CryptoKey may be cached locally in IndexedDB for same-browser convenience; the raw password and extractable key material are not stored.
- Password reset changes the account password but cannot re-encrypt an existing client-side backup. A device that still has its cached non-extractable unlock key may continue to unlock locally. A new device or a device whose cache was cleared must use the recovery phrase once and then create a new encrypted backup under the new password. A future account-key-rotation design may improve this without escrow.

## API contract to implement

- `GET /api/wallet/backup`: authenticated; returns `{ backup: null }` or the encrypted envelope and revision metadata. Never returns decrypted material.
- `PUT /api/wallet/backup`: authenticated; accepts a bounded, versioned encrypted envelope. Enforce strict schema, size, network, KDF bounds, and optimistic revision checks. Create only if absent; update only with matching revision. Reject silent overwrite.
- `DELETE /api/wallet/backup`: authenticated and explicit user confirmation; deletes only the account's encrypted backup. Must not silently delete a wallet as a side effect of logout.

All write routes require same-origin validation, authenticated worker ownership, rate limiting, no-store responses, and safe generic errors. Account deletion must explicitly account for this row.

## Migration and legacy handling

- Keep the existing local encrypted changeset and device vault as a cache, not the authority.
- On first account-linked save, upload the encrypted envelope only after the user confirms the recovery phrase was safely recorded.
- Existing anonymous/local wallets must be explicitly linked by their owner after signing into an account. Never infer ownership or upload silently.
- On login, fetch the account envelope. If present, derive the key from the just-entered password and decrypt locally. If absent, show Create Wallet and an explicit option to link an existing local wallet.
- If decrypt/authentication fails, show Restore with recovery phrase and do not offer Create over that account's existing backup.
- A Preview origin change must not matter once the account backup is established.

## Release gates

1. Unit tests for envelope schema, AES-GCM tamper detection, wrong-password handling, account A/B isolation, revision conflicts, malformed KDF values, oversized payloads, and no-secret server payloads.
2. Worker tests for authentication, CSRF/origin checks, rate limits, create-once semantics, update revision semantics, deletion confirmation, and account deletion.
3. Browser tests for create -> logout -> login -> unlock, second-browser login, password-reset fallback, interrupted upload, offline state, and legacy local-wallet linking.
4. Android Chrome manual test on the stable Preview alias.
5. Independent security review before any production use.

## Explicit non-goals

No server-side private-key custody, no recovery phrase upload, no password-derived key escrow, no wallet requirement for KIVORA AI, no Bitcoin mainnet, no transaction signing/broadcast, and no paid service activation.
