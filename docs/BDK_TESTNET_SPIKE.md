# KIVORA BDK-WASM Testnet Spike

**Status:** Isolated browser prototype; not a production wallet.  
**SDK:** `@bitcoindevkit/bdk-wallet-web` 0.4.0  
**Verified upstream source:** `bitcoindevkit/bdk-wasm@3ee6c6b`  
**Network:** Bitcoin testnet only.

## What this spike verifies

- BDK-WASM loads in the React/Vite browser bundle.
- Browser cryptographic randomness supplies a temporary 32-byte seed.
- BDK derives native P2WPKH testnet external/internal descriptors.
- BDK creates a wallet explicitly on `testnet`.
- The wallet derives a receive address locally in WebAssembly.
- A QR code is rendered locally in the browser; no QR service receives the address.
- The user confirmed on Android that the WASM module initialized and the testnet address and QR rendered.
- The prototype exports/imports a versioned encrypted seed backup locally using AES-256-GCM and PBKDF2-HMAC-SHA-256 (600,000 iterations).
- Exact pinned source inspection verified `Wallet.take_staged()`, `ChangeSet.to_json()`, `ChangeSet.from_json()`, `ChangeSet.merge()` and `Wallet.load()` are exposed by the 0.4.0 package.
- PR #27 now includes initial encrypted IndexedDB changeset storage using HKDF-SHA-256 and AES-256-GCM, plus a seed-based recovery path. New code is awaiting fresh CI and Android browser validation.

## Current limitations

- The backup is KIVORA-specific and contains the 32-byte derivation seed only; it is not a BIP39 recovery phrase or generic wallet import format.
- The current backup does not include a portable BDK changeset, revealed-address index, chain scan state, UTXOs or transaction history.
- The IndexedDB implementation is an initial single-wallet prototype and has not yet passed fresh CI or browser failure/concurrency testing.
- The BDK changeset contains public descriptors and financial metadata. It does not contain the private signing descriptor; re-derive private descriptors from the seed on recovery. Encrypt the complete changeset at rest because public extended keys and transaction data are privacy-sensitive.
- The active seed remains in page memory while the prototype is open so the user can export a backup. JavaScript buffer clearing is best-effort, not proof of secure erasure.
- No separate clean-browser/device restore has been verified yet.
- QR scanning by an independent wallet has not been verified.
- No Esplora sync, balance, transaction history, fee estimate, signing, broadcast or sending.
- No mainnet network option is exposed in this component.
- Never send BTC or valuable testnet coins to this prototype.

## Security and implementation notes

- The BDK package runs client-side; seed bytes and private descriptors are not sent to the KIVORA Worker.
- The QR component generates SVG locally and does not call a remote QR service.
- The backup password and derived AES key are not persisted or transmitted.
- The BDK package is pre-1.0; the version is pinned and must be reviewed before upgrades.
- BDK-WASM has no direct filesystem access; the application owns browser persistence.
- The persistence design and implementation constraints are documented in [BDK-PERSISTENCE-DESIGN.md](./BDK-PERSISTENCE-DESIGN.md).

## Next gates

1. Run fresh CI for the persistence implementation and fix any failures.
2. Restore the encrypted seed backup in a separate clean Android browser and compare the derived first receive address.
3. Scan the receive QR using an independent Bitcoin testnet-compatible wallet, without sending funds.
4. Test same-browser reload and encrypted IndexedDB recovery.
5. Extend encrypted backup to include validated wallet state, while preserving v1 import.
6. Add testnet-only Esplora sync and transaction discovery.
7. Add transaction construction and signing tests using valueless testnet funds only after recovery is complete.
8. Complete independent security review before any mainnet capability is considered.
