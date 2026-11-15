# KIVORA BDK-WASM Persistence Design

**Status:** encrypted IndexedDB changeset storage and encrypted full-state backup v2 are implemented in PR #27; fresh CI and browser recovery validation are pending.  
**SDK pinned by the prototype:** `@bitcoindevkit/bdk-wallet-web@0.4.0`.  
**Verified upstream source commit:** `bitcoindevkit/bdk-wasm@3ee6c6b`.  
**Network:** Bitcoin testnet only.

## Why this stage exists

The current encrypted backup contains the 32-byte derivation seed. It recreates the wallet's first address, but it does not preserve BDK's revealed-address indexes, chain position, discovered outputs, transaction graph or transaction history.

The exact 0.4.0 Rust/WASM source has been inspected. It exposes:
- `Wallet.take_staged()` to export pending state changes;
- `ChangeSet.to_json()` and `ChangeSet.from_json()` for serialization;
- `ChangeSet.merge(other)` for BDK-native change merging;
- `Wallet.load(changeset, externalDescriptor, internalDescriptor)` for recovery.

The initial implementation in this PR uses these SDK APIs. It does not invent or manually reconstruct the changeset JSON schema. The source uses BDK wallet 3.2.0. The browser build has no direct filesystem access and supports HTTP(S)-based Esplora rather than socket-based Electrum/RPC clients.

References:
- Exact pinned package source: https://github.com/bitcoindevkit/bdk-wasm/tree/3ee6c6b
- BDK-WASM browser persistence and network limitations: https://github.com/bitcoindevkit/bdk-wasm#notes-on-wasm-specific-considerations
- BDK wallet changeset contract: https://github.com/bitcoindevkit/bdk_wallet/blob/b8f6b1f36b8dd6d8396fec783522778c7115cd12/src/wallet/changeset.rs
- IndexedDB lifecycle and durability limitations: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology

## Changeset sensitivity

BDK 3.2.0's `ChangeSet` contains recipient and change descriptors typed as `Descriptor<DescriptorPublicKey>`, plus network, local-chain, transaction-graph, keychain-index and locked-outpoint changes. These are public descriptors rather than private signing keys, but extended public-key and transaction metadata are privacy-sensitive. Encrypt the complete serialized changeset before it enters IndexedDB. Never store a plaintext changeset in browser storage, logs, analytics, requests or the KIVORA Worker.

The private signing descriptors must be re-derived locally from the user's seed during recovery and passed to `Wallet.load()`; the persisted public changeset alone does not restore signing capability.

## Data separation

| Data | Location | Secret? | Recovery |
| --- | --- | --- | --- |
| 32-byte derivation seed | Browser memory while unlocked; encrypted export file for backup | Yes | User-held encrypted backup + password |
| Serialized BDK changeset | AES-GCM ciphertext in local IndexedDB only | Public descriptors and financial metadata; privacy-sensitive | Decrypt locally, then pass to BDK |
| Private descriptors / signing material | Browser memory only while wallet is unlocked | Yes | Re-derive locally from restored seed |
| Network and descriptor policy identifiers | Authenticated record metadata | Not secret, but privacy-sensitive | Validate against the fixed testnet policy |
| Password / derived AES keys | Memory only during crypto operations | Yes | Never stored or transmitted |
| Session, worker profile, KIVORA D1 | KIVORA backend | Must never contain wallet secrets or BDK changesets | Not a wallet recovery mechanism |

Do not persist raw seed bytes, private descriptors, mnemonic material, passwords or derived encryption keys in IndexedDB, localStorage, cookies, analytics, logs or the KIVORA Worker.

## Local persistence contract

1. Use one IndexedDB database with a schema version and a single prototype wallet record. Multi-wallet storage is out of scope for this spike.
2. Store only authenticated ciphertext plus format version, fixed `testnet` network identifier, descriptor-policy identifier, SDK/storage format version, random salt, random IV, revision and update metadata.
3. Derive the local storage encryption key from the seed with HKDF-SHA-256 and a per-record random salt; use AES-256-GCM with authenticated additional data binding the record format, network, descriptor policy and revision. The seed and derived key never enter IndexedDB.
4. Obtain deltas only through `wallet.take_staged()`; serialize with `ChangeSet.to_json()`.
5. Decrypt the existing changeset in memory, parse with `ChangeSet.from_json()`, and merge deltas using `ChangeSet.merge()`. Validate network and descriptor policy before accepting state.
6. Handle concurrent writes with optimistic revision checks. Perform the final revision check and ciphertext write in one IndexedDB read-write transaction so stale state cannot overwrite newer state.
7. Commit each encrypted changeset and metadata update atomically in one IndexedDB transaction.
8. If IndexedDB is unavailable, blocked, corrupt or quota-limited, fail closed for state-changing wallet actions and explain that the wallet state could not be saved.
9. Treat browser storage as a cache, not a backup. Browsers can clear site data; the user-held encrypted seed backup remains the recovery mechanism.
10. Do not sync wallet state to KIVORA servers. No account recovery service can recreate the user's private key.

## Recovery and backup versioning

The existing backup format v1 contains only the seed. Do not silently reinterpret it.

The initial recovery path:
1. decrypts and validates the seed backup locally;
2. derives the same BIP84 external and internal private descriptors from that seed;
3. locates and decrypts the locally persisted changeset using the seed-derived storage key;
4. parses it with `ChangeSet.from_json()`;
5. calls `Wallet.load(changeset, externalDescriptor, internalDescriptor)`;
6. verifies the returned network is testnet before displaying wallet state.

If no local changeset exists (for example, on a clean browser), the prototype re-derives the first address from the seed and creates a new local encrypted changeset. This is not full-state recovery across devices.

Backup v2 is now implemented in the prototype. It contains format/version identifiers, fixed `testnet` network, descriptor policy, pinned SDK version, the 32-byte seed and the BDK-native changeset JSON snapshot. The complete payload is encrypted locally with AES-256-GCM and PBKDF2-HMAC-SHA-256 (600,000 iterations), with fresh random salt and IV per export and authenticated format/network associated data. The importer rejects unsupported versions, networks, descriptor policies and SDK versions before constructing a wallet. The original v1 raw-seed backup format remains importable; v1 cannot recover a changeset it never contained.

Never include API tokens, provider credentials, wallet connection URIs or user profile data in the backup.

## Sync and provider boundary

- The browser WASM build must use an HTTPS Esplora-compatible source; do not attempt Electrum or Bitcoin Core RPC sockets from the browser.
- Introduce a provider interface so the endpoint can be changed without changing wallet logic.
- Pin the network to testnet and validate the provider response and network context.
- Do not claim that a provider's reported balance is authoritative until BDK has applied and persisted the corresponding chain update.
- Rate-limit sync, handle timeouts and stale tips, and avoid leaking unnecessary wallet addresses to third parties.
- A provider outage must never be interpreted as a zero balance or proof that a transaction does not exist.

## Required tests before enabling persistence

- Exact 0.4.0 changeset `to_json()/from_json()` round-trip using the actual WASM package.
- BDK-native merge preserves descriptors and combines staged index/chain/transaction changes.
- Wrong seed cannot decrypt the IndexedDB changeset; tampered ciphertext and metadata are rejected.
- IndexedDB atomicity, optimistic revision conflict, blocked upgrades, unavailable storage, quota failure and corrupted records.
- Reload in the same browser after backup restore preserves the same revealed-address index.
- Export/import on a separate clean browser restores the same descriptor policy, revealed-address index and wallet state (not yet browser-verified).
- Backup v1 remains importable; v2 full-state export/import round-trip, malformed, wrong-password, unsupported-version and wrong-network backups are covered by tests (fresh CI pending).
- Restore followed by a fresh Esplora sync reconstructs the same wallet view without duplicating transactions.
- No seed, private descriptor, password or derived key appears in IndexedDB, requests, logs or telemetry.

## Explicitly out of scope

No mainnet, real-fund use, transaction signing, sending, broadcasting, automatic payments or production activation is enabled by this design. Those require separate implementation and test gates after persistence and recovery are verified.
