# KIVORA BDK-WASM Persistence Design

**Status:** design gate for the testnet prototype; not an implemented wallet-storage guarantee.  
**SDK pinned by the prototype:** `@bitcoindevkit/bdk-wallet-web@0.4.0`.  
**Network:** Bitcoin testnet only.

## Why this stage exists

The current encrypted backup contains the 32-byte seed used to derive the BIP84 descriptors. That is sufficient to recreate the first receive address, but it does not preserve BDK's wallet state: revealed-address indexes, chain position, discovered outputs, transaction graph or transaction history.

BDK-WASM documents an in-memory browser wallet model: call `wallet.take_staged()` to export state changes, merge those changes in the JavaScript persistence layer, and pass the persisted changeset back to `wallet.load()` during recovery. The browser build has no direct filesystem access and supports HTTP(S)-based Esplora rather than socket-based Electrum/RPC clients.

References:
- BDK-WASM browser persistence and network limitations: https://github.com/bitcoindevkit/bdk-wasm#notes-on-wasm-specific-considerations
- BDK wallet persistence overview: https://github.com/bitcoindevkit/bdk_wallet#persistence
- IndexedDB lifecycle and durability limitations: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology

## Data separation

| Data | Location | Secret? | Recovery |
| --- | --- | --- | --- |
| 32-byte derivation seed | Browser memory while unlocked; encrypted export file for backup | Yes | User-held encrypted backup + password |
| BDK changeset | Local IndexedDB only | No signing key should be present; still private financial metadata | Included in a future encrypted backup version |
| Network and descriptor policy identifiers | Versioned wallet metadata | No, but privacy-sensitive | Included in backup |
| Esplora responses | Passed to BDK; only relevant wallet state retained | No | Re-sync from chain after restore |
| Password / derived AES key | Memory only during backup operation | Yes | Never stored or transmitted |
| Session, worker profile, KIVORA D1 | KIVORA backend | Must never contain wallet secrets or BDK changesets | Not a wallet recovery mechanism |

Do not persist raw seed bytes, private descriptors, mnemonic material, passwords or derived encryption keys in IndexedDB, localStorage, cookies, analytics, logs or the KIVORA Worker.

## Local persistence contract

1. Use one IndexedDB database with a schema version and a wallet record keyed by a locally generated wallet ID.
2. Store only a versioned BDK changeset, network identifier, descriptor-policy identifier, SDK/storage format version, and update metadata.
3. Obtain changes only through the pinned SDK's documented `take_staged()` API. Do not invent a JSON representation: inspect the exact 0.4.0 TypeScript/WASM binding and prove round-trip serialization before implementation.
4. Merge changesets using BDK's supported changeset merge semantics. Never replace a newer changeset with an older snapshot.
5. Commit each merged changeset and metadata update atomically in one IndexedDB read-write transaction.
6. If IndexedDB is unavailable, blocked, corrupt or quota-limited, fail closed for state-changing wallet actions and explain that the wallet state could not be saved.
7. Treat browser storage as a cache, not a backup. Browsers can clear site data; the user-held encrypted backup remains the recovery mechanism.
8. Do not sync wallet state to KIVORA servers. No account recovery service can recreate the user's private key.

## Recovery and backup versioning

The existing backup format v1 contains only the seed. Do not silently reinterpret it.

A future v2 export should contain:
- format and version identifiers;
- network fixed to `testnet`;
- descriptor policy and derivation metadata;
- the 32-byte seed;
- a validated BDK changeset snapshot;
- explicit integrity/version checks.

Encrypt the complete v2 payload locally with authenticated encryption before download. Keep the current AES-256-GCM + PBKDF2-HMAC-SHA-256 approach only after reviewing its parameters against current platform guidance. Use a fresh random salt and IV for every export. Bind format version, network and descriptor policy as authenticated additional data. Reject unsupported versions and networks before constructing a wallet.

Never include API tokens, provider credentials, wallet connection URIs or user profile data in the backup.

## Sync and provider boundary

- The browser WASM build must use an HTTPS Esplora-compatible source; do not attempt Electrum or Bitcoin Core RPC sockets from the browser.
- Introduce a provider interface so the endpoint can be changed without changing wallet logic.
- Pin the network to testnet and validate the provider response and network context.
- Do not claim that a provider's reported balance is authoritative until BDK has applied and persisted the corresponding chain update.
- Rate-limit sync, handle timeouts and stale tips, and avoid leaking unnecessary wallet addresses to third parties.
- A provider outage must never be interpreted as a zero balance or proof that a transaction does not exist.

## Required tests before enabling persistence

- Changeset serialization and deserialization round-trip against the exact pinned 0.4.0 WASM bindings.
- Merge ordering: older changes cannot overwrite newer revealed indexes or chain state.
- IndexedDB atomicity, blocked upgrades, unavailable storage, quota failure and corrupted records.
- Reload in the same browser preserves the same first and subsequent revealed addresses.
- Export/import on a separate clean browser restores the same descriptor policy, revealed-address index and wallet state.
- Tampered backup, wrong password, unsupported version, wrong network and malformed changeset are rejected.
- Restore followed by a fresh Esplora sync reconstructs the same wallet view without duplicating transactions.
- No seed, private descriptor, password or derived key appears in IndexedDB, requests, logs or telemetry.

## Explicitly out of scope

No mainnet, real-fund use, transaction signing, sending, broadcasting, automatic payments or production activation is enabled by this design. Those require separate implementation and test gates after persistence and recovery are verified.
