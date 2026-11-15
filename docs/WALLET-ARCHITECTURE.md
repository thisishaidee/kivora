# KIVORA Bitcoin Wallet — Technical Architecture

**Status:** Proposed architecture; implementation must follow the staged gates in `WALLET-REQUIREMENTS.md`.

## 1. Architecture decision

Build KIVORA Wallet as a non-custodial wallet experience with two distinct wallet adapters:
- Lightning adapter: connect to a wallet the user controls using NWC/NIP-47.
- On-chain adapter: a vetted client-side Bitcoin wallet implementation that derives addresses and signs locally.

KIVORA's Cloudflare backend is a payment-orchestration and business-record layer. It is not a custodian and must not receive seed phrases or private keys.

The existing NWC proof-of-concept is retained as a narrow first integration, not represented as a complete wallet.

## 2. Trust boundaries

### User device
- Wallet UI and confirmation screens.
- Local key generation/import and signing for an eventual embedded on-chain wallet.
- Encrypted key material only if an audited SDK and platform storage design support it.
- NWC connection handling. Treat NWC URI as a secret capability.
- QR parsing and transaction preview.

### KIVORA Cloudflare Worker
- Authenticated wallet preference and non-secret metadata APIs.
- Payment intent creation and status queries.
- Subscription entitlement transitions after verified payment.
- Business payment request records and categories.
- Expert booking payment references.
- Reviewed contribution reward ledger.
- Webhook/event authentication, idempotency, reconciliation and audit events.
- Never accepts seed phrases, private keys, raw signing keys or unrestricted NWC connection URIs.

### External infrastructure
- NWC relay and user's Lightning wallet/provider.
- Bitcoin node/indexer or carefully selected data provider for UTXO, fee and broadcast services.
- Lightning payment status source.
- Optional notification provider.

External services are untrusted inputs. Validate schemas, signatures/authentication, network identity, amount, invoice/payment hash and event freshness.

## 3. Wallet modes

### Mode A: connected Lightning wallet (initial)
Use NWC/NIP-47 via the pinned SDK. Request only needed methods. Initial safe subset:
- get_info
- get_balance (optional)
- make_invoice

Outgoing payment methods must be added only with an explicit confirmation UX, amount/recipient preview, permission scope, replay protection and tests. A connected wallet remains user-controlled; KIVORA does not custody its funds.

NWC URI handling:
- Never send to KIVORA API.
- Never log, persist in D1, analytics, URL, cookie or localStorage.
- Keep memory-only until a reviewed Android-compatible secure-storage strategy exists.
- Disconnect and close the client on logout/unmount.
- A lost browser session may require reconnecting; communicate this clearly.

### Mode B: embedded self-custodial Bitcoin wallet (later)
Do not invent a cryptographic implementation. Evaluate mature, maintained libraries and their licences, audit history, browser/Android compatibility, supported standards, testnet support and maintenance model.

Required design review before selection:
- Key generation entropy source and derivation standards.
- Address types and network handling.
- Import/restore compatibility.
- Encrypted storage and key-unlock model.
- PSBT creation/signing and transaction verification.
- Backup/recovery and device-loss process.
- Dependency supply-chain and audit posture.

Keys must remain client-side. Backend may provide chain data and broadcast signed transactions, but must not sign or reconstruct private keys.

## 3.1 Testnet backup prototype (not production-ready)

The BDK testnet spike uses a 32-byte random derivation seed with the existing `seed_to_descriptor` helper. Its first recovery milestone exports that same seed only as a user-downloaded encrypted JSON file:
- AES-256-GCM with a fresh 96-bit IV and 128-bit authentication tag.
- PBKDF2-HMAC-SHA-256 with a fresh 128-bit salt and 600,000 iterations to derive the encryption key.
- Versioned format binds the ciphertext to the KIVORA backup identifier and the `testnet` network using authenticated additional data.
- Password is required to export and restore; it is never sent to the backend or stored by the app.
- The encrypted file is generated and decrypted locally. No seed, descriptor or password is uploaded or persisted by KIVORA.
- This is a raw-seed encrypted backup, not a BIP39 mnemonic and not a generic BIP39 import/export format.

Important limits:
- The active seed remains in page memory while this prototype is open so the user can export a backup. Clearing a JavaScript byte array is best-effort and does not prove secure erasure of copies or WASM memory.
- The backup preserves the derivation seed and deterministic first receive address only. It does not yet preserve BDK changesets, revealed-address index, chain scan state, UTXOs or transaction history.
- The current prototype must not receive funds. A clean-device restore test, chain-state persistence design and full wallet review are still required before testnet funds are accepted.
- A lost backup password cannot be reset by KIVORA. Users must keep the encrypted file and password separately.

## 4. On-chain transaction flow

1. Client requests balance/UTXO and fee data for the selected network.
2. Data adapter returns timestamped, network-labelled results.
3. Client builds a transaction preview with recipient, amount, fee rate, total fee, change and network.
4. User confirms; signing occurs locally.
5. Client broadcasts the signed transaction through the selected broadcaster.
6. Backend/client tracks txid and confirmation state from authoritative chain data.
7. UI shows pending until chain state meets the documented confirmation policy.

Guardrails:
- Verify address network and checksum.
- Prevent amount overflow, dust outputs and accidental change-to-recipient mistakes.
- Fee quote expires; refresh before signing if stale.
- Never label broadcast as confirmed.
- Handle replacement-by-fee/conflicts and dropped transactions without inventing finality.
- Do not accept a client assertion as confirmation evidence.

## 5. Lightning transaction flow

### Receive
1. User enters amount and optional description/expiry.
2. Connected wallet creates invoice.
3. KIVORA displays invoice and QR.
4. Invoice remains open/pending until wallet/provider reports settlement.
5. Payment history is updated from authoritative status.

### Send (later stage)
1. Parse invoice and verify amount/network/expiry.
2. Show recipient metadata, amount and quoted fee.
3. Obtain explicit user confirmation.
4. Call the connected wallet's payment method.
5. Track pending/settled/failed state using authoritative response and reconciliation.
6. Prevent duplicate payment attempts and clearly distinguish timeout from failure.

Timeout is not proof of failure. Reconcile status before retrying a potentially submitted payment.

## 6. Payment orchestration model

Keep wallet facts separate from KIVORA commercial records.

Suggested logical records (schema names are illustrative and must be reconciled with current D1 migrations before implementation):
- `wallet_connections`: non-secret connection metadata only; never store NWC URI.
- `payment_intents`: unique request, user, purpose, amount, currency/asset, rail, expected recipient, expiry and status.
- `payment_observations`: immutable provider/chain observations and source references.
- `wallet_transactions`: transaction metadata visible to the user; not signing material.
- `business_payment_requests`: job/customer/supplier references, requested amount, description and lifecycle.
- `subscription_plans`: versioned plan catalogue and entitlement policy.
- `subscriptions`: owner, plan version, status, period start/end, cancellation policy.
- `subscription_payments`: payment intent linkage, verified amount, rail, external ID, verification state.
- `expert_payment_records`: booking/payment relation and agreed cancellation/refund terms.
- `contribution_rewards`: approved contribution ID, reviewer decision, amount, payout status and unique idempotency key.
- `payment_event_inbox`: authenticated event IDs for replay/duplicate protection.

Use D1 transactions/batches where appropriate, owner-scoped queries, unique constraints and append-only observations for auditability. Never store payment-provider secrets or wallet key material in these records.

## 7. Payment verification and entitlements

A trusted verifier must:
- Authenticate provider events or query the provider/chain independently.
- Match a unique payment intent and expected network/rail.
- Match invoice/payment hash or destination address and amount.
- Apply confirmation policy and underpayment/overpayment rules.
- Reject stale, duplicate, mismatched and replayed events.
- Persist evidence before transitioning entitlement.
- Use idempotency keys and atomic state transitions.
- Reconcile unresolved intents after network interruptions.

Only a backend service may transition a subscription to active/renewed. Browser redirects, frontend state, invoice creation, user-supplied txids or screenshots are never sufficient.

## 8. Data and privacy

- Minimise on-chain address linkage to worker identity.
- Do not expose user transaction history publicly.
- Separate optional personal/business categories from protocol facts.
- Encrypt provider credentials using platform secrets; never put them in source control.
- NWC URI remains client-only in the initial integration.
- Define retention/deletion policy for business records and payment metadata.
- Avoid storing personal customer details unless required for the user's bookkeeping.

## 9. Cloudflare deployment shape

- React/Vite PWA remains the mobile-first client.
- Cloudflare Worker owns authenticated KIVORA payment APIs.
- D1 stores payment intents, event inbox, subscription and business records.
- Queues or scheduled reconciliation may be added only when justified and configured with idempotent consumers.
- R2 is not a wallet-key store.
- No production deployment or mainnet setting is enabled by this architecture document.

## 10. Security and release gates

Before testnet:
- Select and review the on-chain wallet library.
- Review NWC SDK methods and permissions.
- Threat-model XSS, malicious QR payloads, clipboard leakage, stale fee quotes, duplicate submissions and device loss.
- Add test fixtures and protocol-level tests.

Before mainnet:
- Independent security review.
- Restore test on a separate clean device.
- Testnet send/receive interoperability.
- Reconciliation and incident response runbook.
- Provider terms, data protection and jurisdictional review.
- Explicit release approval and controlled rollout.

## 11. Open technical decisions

These remain intentionally unresolved pending evidence:
- On-chain wallet SDK and supported address/derivation standards.
- Bitcoin data/indexing and broadcast provider, or self-hosted node strategy.
- Lightning provider/wallet compatibility matrix.
- Confirmation thresholds and fee policy.
- Secure persistence strategy for any wallet connection.
- Subscription pricing, tax/refund and entitlement rules.
- Legal/regulatory requirements for each launch market.

Do not guess these decisions or select a provider solely because it is easy to integrate.
