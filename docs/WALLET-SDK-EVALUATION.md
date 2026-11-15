# KIVORA Wallet SDK Evaluation — Initial Technical Review

**Date:** 2026-11-15  
**Status:** Research shortlist only; no wallet SDK selected or approved for production.

## 1. Decision required

KIVORA needs two capabilities that are often bundled together but have different security and operational properties:
- A Bitcoin base-layer wallet: key derivation, addresses, UTXOs, coin selection, PSBT construction/signing, fee estimation and broadcast.
- A Lightning wallet: channels/liquidity or a connection to a wallet service, invoice creation/payment, settlement tracking and routing fees.

A library that can parse Bitcoin addresses or build PSBTs is not automatically a complete wallet. A Lightning SDK that can pay Bitcoin addresses through swaps or a Layer-2 system is not automatically equivalent to a native on-chain UTXO wallet.

## 2. Candidate review

### A. Bitcoin Dev Kit WebAssembly (BDK-WASM / `@bitcoindevkit/bdk-wallet-web`)

**Potential role:** Embedded on-chain wallet engine in the browser/PWA.

Documented capabilities include UTXO management, coin selection, chain sync/scanning, descriptors, address types from legacy through Taproot, transaction construction/signing, broadcast and state persistence. Its WASM documentation warns that browser builds have no direct filesystem access and persistence must be implemented by exporting and restoring wallet changesets through JavaScript.

**Advantages**
- Purpose-built Bitcoin wallet engine rather than a collection of address utilities.
- Browser/WASM target aligns with the current React/Vite PWA.
- Covers many difficult on-chain wallet functions.
- The official BDK project currently lists bdk-wasm as a community-supported project, not a foundation-supported component.
- The current browser package is `@bitcoindevkit/bdk-wallet-web` (0.4.0 at the time of this review; pre-1.0). The older `MetaMask/bdk-wasm` repository states that it has moved to the official `bitcoindevkit/bdk-wasm` repository and will no longer be maintained.

**Risks / work required**
- Community-supported status means maintenance and security ownership need closer review.
- Browser persistence and encrypted key storage remain KIVORA responsibilities.
- No direct filesystem access; IndexedDB or another browser persistence layer must be threat-modelled and tested.
- Chain data backend, fee source and broadcast service still need selection.
- Wallet library does not remove the need for independent security review.

**Assessment:** Strong candidate for a controlled on-chain testnet prototype, not yet selected for mainnet.

References:
- https://github.com/bitcoindevkit/bdk-wasm
- https://www.npmjs.com/package/@bitcoindevkit/bdk-wallet-web
- https://github.com/MetaMask/bdk-wasm (historical repository; moved and no longer maintained)
- https://github.com/bitcoindevkit

### B. Breez SDK — Spark

**Potential role:** Unified embedded Bitcoin/Lightning experience, subject to trust-model and product-fit review.

Breez describes Spark SDK as non-custodial and supports JavaScript, React Native, Flutter, Kotlin, Swift and WebAssembly. Its documentation advertises Lightning and on-chain address interoperability, passkey-based onboarding/restore, external signer support and multi-device persistence. It also uses the Spark network, a Bitcoin-native Layer 2, so the exact settlement and unilateral-exit semantics must be understood before describing every balance as ordinary on-chain BTC.

**Advantages**
- Potentially reduces the amount of Lightning and payment infrastructure KIVORA must operate.
- JavaScript/WASM support is relevant to a PWA prototype.
- External signer and recovery features may fit user-controlled key requirements.
- One integration may support several payment formats.

**Additional implementation facts**
- The official JavaScript/WASM getting-started guide requires an SDK API key.
- The basic initialization path accepts a mnemonic seed and configures a storage directory; the WASM web guide documents IndexedDB-backed SDK storage.
- The SDK also advertises passkey onboarding/restore and external-signer support. These alternatives need direct code-level review; do not assume the basic mnemonic path and passkey/external-signer paths have identical trust properties.

**Risks / work required**
- Must distinguish Spark balances/transactions from Bitcoin base-layer UTXOs and Lightning channel balances in the interface and ledger.
- Review the exact key custody/signing model, recovery, unilateral exit and service dependencies.
- Verify API-key requirements, fees, service terms, rate limits, regions and operational dependencies.
- Verify that all required browser APIs and Android WebView/PWA behaviours work in the target deployment.
- Do not infer that "non-custodial" means no infrastructure or counterparty assumptions.

**Assessment:** Worth a sandbox proof-of-concept against the separate BDK + NWC approach. Not selected until testnet and trust-model review.

References:
- https://sdk-doc-spark.breez.technology/guide/getting_started.html
- https://sdk-doc-spark.breez.technology/guide/initializing.html
- https://sdk-doc-spark.breez.technology/
- https://breez.technology/sdk/
- https://github.com/breez/spark-sdk

### C. bitcoinjs-lib

**Potential role:** Low-level Bitcoin transaction/address tooling, not the default complete wallet architecture.

bitcoinjs-lib supports Node.js and browsers and provides transaction and script primitives. Its own project guidance explicitly asks integrators to audit the library and its dependencies and to use tagged stable releases rather than the development branch.

**Advantages**
- Widely used JavaScript Bitcoin library.
- Browser-compatible and MIT-licensed.
- Useful for specific transaction/PSBT tasks and interoperability tests.

**Risks / work required**
- It is a lower-level library, not an end-to-end wallet engine.
- KIVORA would own more key management, coin selection, synchronization, persistence and transaction policy.
- Dependency review and security audit burden remains significant.

**Assessment:** Do not use as the sole wallet foundation. Consider only as a narrowly scoped utility if the chosen wallet SDK requires it.

Reference:
- https://github.com/bitcoinjs/bitcoinjs-lib

### D. Nostr Wallet Connect (NIP-47)

**Potential role:** Connected Lightning wallet adapter.

NIP-47 exposes wallet capabilities through an encrypted client connection. Wallet methods are advertised by the wallet service; clients must inspect the supported method list rather than assume every wallet supports every operation. Core operations include invoice payment, invoice creation, balance and wallet information; extensions and history/lookup methods vary by implementation/version.

**Advantages**
- Users retain their existing wallet and signing authority.
- No KIVORA seed phrase or private key handling.
- Good first Lightning integration for the current PWA.

**Risks / work required**
- Connection URI is a permissioned secret and must be treated like a wallet credential.
- Relay availability and wallet implementation compatibility vary.
- A connected wallet may be custodial or self-custodial; NWC itself does not guarantee the wallet provider's custody model.
- Payment timeout is not proof of failure; lookup/reconciliation is required.
- Method availability differs by connection; runtime capability detection is mandatory.

**Assessment:** Retain as the first Lightning adapter. Expand to send only after explicit confirmation UX, capability detection and payment reconciliation are tested.

References:
- https://nips.nostr.com/47
- https://docs.nwc.dev/

## 3. Recommended investigation path

1. Keep PR #22 as a limited NWC connection/receive-invoice proof-of-concept until real Android interoperability is tested.
2. Build a throwaway, testnet-only spike with the current `@bitcoindevkit/bdk-wallet-web` package to verify wallet creation, testnet address generation, backup/restore, UTXO sync, fee estimation, signing and broadcast in Android Chrome/PWA.
3. In parallel, build a separate Breez SDK Spark testnet spike and document whether the wallet's balance is Spark, Lightning, or base-layer on-chain BTC at each step.
4. Compare both spikes on: user key control, restore on a clean device, network dependencies, service fees, browser compatibility, Android performance, SDK maintenance, licence, API requirements and operational failure modes.
5. Select only after reproducible tests and threat-model review. Do not commit either SDK to production dependencies before the decision.

## 4. Non-negotiable selection criteria

- Private signing keys remain under user control and never reach KIVORA servers.
- Supported recovery works on a second clean device.
- Mainnet and testnet are impossible to confuse.
- Payment previews include destination, amount, network and fee.
- SDK supports Android Chrome/PWA and can recover after browser termination.
- No hidden custody or unlabelled Layer-2 balance.
- Licence and dependency audit pass.
- Clear maintenance/security response path exists.
- No real funds in prototype testing.

## 5. Current conclusion

There is not enough evidence to select one embedded wallet SDK responsibly yet.

**Working hypothesis:** NWC for connected Lightning wallets plus BDK-WASM for a self-custodial on-chain wallet is the most direct fit for KIVORA's explicit requirement for native Bitcoin on-chain functionality. Breez SDK Spark is the most promising alternative for reducing integration complexity, but its Spark/Layer-2 trust and settlement model must be clearly understood.

This is a research conclusion, not a production architecture lock. The current package version and repository ownership must be rechecked before each SDK upgrade; no BDK package has been added to KIVORA runtime dependencies.
