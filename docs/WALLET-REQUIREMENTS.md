# KIVORA Bitcoin Wallet — Product Requirements

**Status:** Approved product direction; staged implementation required  
**Scope:** General-purpose Bitcoin wallet integrated with KIVORA  
**Platforms:** Android-first responsive web app/PWA; Cloudflare-compatible services  
**Networks:** Bitcoin mainnet only after testnet, security and operational gates pass

## 1. Product objective

KIVORA Wallet is a general-purpose Bitcoin wallet and payment workspace. It must be useful independently of KIVORA's AI services while supporting payments for skilled workers, customers, suppliers, specialists, subscriptions and approved knowledge contributions.

The wallet is optional. A worker must be able to use ordinary KIVORA AI functionality without connecting a wallet, holding Bitcoin or making a payment. Bitcoin balances must never be represented as KIVORA credits.

## 2. Product principles

1. **User control:** Prefer non-custodial designs. Users control signing authority and recovery material.
2. **No invented money state:** Never simulate balances, invoices, confirmations, fees or payment success.
3. **Explicit payment intent:** Show asset, network, recipient, amount, fee and irreversible-action warning before signing or paying.
4. **Separate rails:** Clearly distinguish Lightning from on-chain Bitcoin in UI, records, receipts and APIs.
5. **Backend verification:** A frontend callback or screenshot is never proof of payment or entitlement.
6. **Privacy by default:** Do not collect seed phrases or private keys on KIVORA servers. Minimise metadata and retention.
7. **Resilient mobile UX:** Handle interruptions, retries, stale quotes, duplicate events and reconnects safely.
8. **Progressive delivery:** Testnet and security review precede mainnet and real funds.
9. **No hidden custody:** Any custodial service, hosted key, exchange, fiat conversion or escrow model requires a separate product and legal review.

## 3. Wallet capabilities

### 3.1 Core wallet

Long-term requirements:
- Create a wallet using a vetted, maintained wallet implementation.
- Import or restore supported wallet formats with clear compatibility warnings.
- Display BTC and satoshi balances, with source and update time.
- Receive and send Bitcoin.
- Manage receiving addresses and payment requests.
- Scan and generate QR codes.
- Copy and share addresses, invoices and payment links.
- Display searchable incoming and outgoing history.
- Show transaction detail, status, timestamps, network, fees and transaction identifiers.
- Validate addresses and payment requests before user confirmation.
- Provide tested backup, restore and wallet-security workflows.
- Support device authentication (PIN/biometric) where platform capabilities allow.

### 3.2 Lightning

- Connect an existing user-controlled Lightning wallet through NWC/NIP-47.
- Support connection permissions scoped to the minimum methods needed.
- Read wallet info and balance only when supported.
- Create and receive invoices.
- Pay invoices and support outgoing payments only after explicit per-payment confirmation.
- Track pending, settled, failed, rejected and expired states using authoritative wallet/provider responses.
- Display fees when the protocol/provider supplies a reliable quote.
- Parse Lightning invoices and Lightning payment QR codes.
- Never treat invoice creation as payment receipt.
- Never treat a submitted payment request as settled until authoritative status confirms it.
- Keep NWC connection secrets out of KIVORA servers, logs, analytics, URLs, localStorage and cookies. Use memory-only handling initially; investigate safer platform-backed secret handling before persistent connections.

### 3.3 On-chain Bitcoin

- Generate receiving addresses using a vetted wallet library and supported derivation standard.
- Support address reuse policy and address rotation appropriate to the wallet design.
- Discover balance and UTXOs from a trusted Bitcoin data provider or self-operated infrastructure.
- Construct transactions with correct input selection, change handling and dust rules.
- Estimate fees from current network data and show fee-rate and total fee.
- Allow fee selection where safe and supported.
- Sign transactions locally using user-controlled keys.
- Broadcast transactions and track mempool/confirmation status.
- Display txid, confirmations, fee and relevant output details.
- Support testnet before mainnet.
- Do not implement custom cryptography, key derivation, PSBT parsing or transaction signing from scratch.

### 3.4 QR and payment requests

- Support Bitcoin URI/BIP21-compatible requests and Lightning invoice formats.
- Parse amount, network, label, message and payment scheme safely.
- Reject malformed, unsupported or network-mismatched requests.
- Show decoded details before payment.
- Generate QR codes for receive addresses, invoices and payment links.
- Allow user-specified amount, description and expiry where supported.
- Payment request records are references, not proof of payment.

## 4. KIVORA payment products

### 4.1 Subscriptions

The existing free-only product decision is superseded as a proposed business direction by this requirements document, but paid plans are not considered launch-ready until plan pricing, entitlements, tax/refund rules and operating costs are separately defined.

Required capabilities:
- Monthly and annual plan catalogue.
- Lightning and on-chain payment options.
- Payment from connected wallet or external wallet.
- Unique payment intent per checkout attempt.
- Backend verification before activation.
- Subscription status, start/end, renewal and cancellation rules.
- Upgrade/downgrade proration policy defined before implementation.
- Payment history and receipts.
- Renewal reminders where the user has opted in.
- Correct handling of expired, underpaid, overpaid, duplicate and late payments.
- No automatic recurring Bitcoin charge without explicit, revocable user authorisation; default to manual renewal.

**Entitlement invariant:** subscription access is granted only by a trusted backend transition from a verified payment record. Frontend state, redirect parameters, invoice creation, client-supplied txids or unverified webhooks must never grant access.

### 4.2 Everyday and worker-business payments

- Receive payment from anyone with a compatible Bitcoin wallet; payer need not have KIVORA.
- Create job payment requests with amount, description, customer/project reference and expiry.
- Share QR codes and payment links.
- Track request status separately from wallet transaction status.
- Categorise transactions as personal, job/customer, supplier, equipment, service or other.
- Store optional notes and references without claiming the note is on-chain.
- Allow suppliers and service providers to be paid from a user-controlled wallet.
- Preserve a clear separation between wallet transaction facts and user-authored business bookkeeping.

### 4.3 Expert services

- Display consultation price and terms before payment.
- Create a unique payment request for each booking.
- Verify payment before unlocking paid consultation access.
- Record both parties' service/payment references.
- Define cancellation and refund terms before collecting payment.
- Do not imply escrow, dispute resolution or reversible payments unless a separately reviewed system provides them.

### 4.4 Knowledge rewards

- Reward only accepted contributions that pass the defined review process.
- Link each reward to an immutable contribution/review reference.
- Record reviewer/approval status, amount, payout rail, payment identifier and payout status.
- Prevent duplicate rewards with idempotency keys and unique constraints.
- Do not automatically reward raw, unreviewed or low-quality submissions.
- Establish contributor eligibility, abuse controls and payout policy before enabling payouts.

## 5. Wallet security and privacy requirements

- Private keys and seed phrases must never be submitted to or stored by KIVORA APIs.
- Use vetted wallet SDKs and documented standards; pin and audit dependencies.
- Prefer local signing and hardware-backed/OS-protected storage where supported.
- Clearly explain what an NWC connection permission allows; treat its URI as a wallet credential.
- Never request a broad NWC connection when narrower permissions suffice.
- Require explicit confirmation for every outgoing payment, displaying recipient, amount, network and fees.
- Protect against duplicate submission, replay, CSRF, XSS, malicious QR payloads and stale fee/payment quotes.
- Use strict content security controls and minimise third-party scripts in wallet screens.
- Provide session lock/disconnect, recovery and lost-device guidance.
- Avoid storing sensitive connection secrets persistently until the threat model and Android browser behaviour are reviewed.
- Conduct independent security review and test recovery before mainnet.
- Explain that Bitcoin payments are generally irreversible and refunds require a new payment.

## 6. Transaction state and accounting

Maintain separate, explicit state machines for:
- Lightning invoice lifecycle.
- Lightning outgoing payment lifecycle.
- On-chain transaction lifecycle.
- KIVORA payment request lifecycle.
- Subscription entitlement lifecycle.
- Expert-service payment lifecycle.
- Contributor reward lifecycle.

Never collapse these into a single generic "paid" flag. Store authoritative external identifiers, event timestamps, amount, asset, rail, fee, status source and reconciliation metadata. Use idempotent event processing and reconciliation jobs.

On-chain status should distinguish at least: created, signed, broadcast, mempool/unconfirmed, confirmed, conflicted/replaced, dropped/unknown and failed where the provider can establish that state. Lightning status should distinguish: unpaid/open, pending/in-flight, settled, failed/rejected and expired where supported.

## 7. Notifications

- Incoming payment notifications only after authoritative wallet/provider status.
- Outgoing payment success/failure notifications from authoritative status.
- Invoice expiry and payment-request expiry.
- Subscription renewal/expiry reminders.
- Notification delivery is not the source of truth; the wallet/payment ledger is.

## 8. Not in the initial release

- Multiple wallet accounts or advanced business wallet profiles.
- Fiat conversion, exchange or custody.
- Escrow or pooled customer funds.
- Automatic recurring Bitcoin debits.
- Supplier discovery or marketplace.
- Advanced accounting/tax reporting.
- Automatic or speculative contributor rewards.
- Cross-chain assets or tokens.

## 9. Release gates

### Testnet gate
- Wallet creation/import/restore tested with supported formats.
- Lightning send/receive tested using test wallets and documented NWC permissions.
- On-chain send/receive tested on Bitcoin testnet.
- QR parsing, fee display, retries, duplicate events and offline recovery tested.
- No real funds or mainnet secrets.

### Mainnet gate
- Independent security review of wallet/key handling and payment flows.
- Backup and restore verified on a clean second device.
- Transaction signing and recipient/fee confirmation reviewed.
- Provider reliability, rate limits, monitoring, reconciliation and incident response documented.
- Legal/regulatory review for the jurisdictions and services KIVORA actually operates.
- Explicit release decision; no automatic mainnet enablement.

## 10. Acceptance criteria

A feature is not complete merely because its UI renders. It must have:
- A documented threat model and data-flow boundary.
- Automated unit/integration tests.
- Testnet interoperability evidence for protocol flows.
- Failure, retry, duplicate and network interruption coverage.
- No fake balance/status data.
- Accessible Android mobile UX.
- Clear user-facing fee and risk disclosure.
- Verified backend authority for any KIVORA entitlement or service release.
