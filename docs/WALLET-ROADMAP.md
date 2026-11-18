# KIVORA Wallet — Delivery Roadmap

This roadmap sequences the full requirements in `WALLET-REQUIREMENTS.md`. Each stage is independently testable. No stage silently authorises mainnet or real-fund use.

## Stage 0 — Product and security foundation
- [x] Define wallet as general-purpose and wallet-optional for ordinary AI access.
- [x] Separate Lightning, on-chain, payment orchestration and business records.
- [x] Define no-custody/private-key boundaries.
- [x] Define backend-only payment verification and entitlement invariants.
- [ ] Select and document on-chain wallet SDK after licence/security/maintenance review.
- [ ] Threat model and data-flow review.
- [ ] Define testnet provider strategy.

**Exit:** architecture and dependencies reviewed; no real funds.

## Stage 1 — Lightning connected wallet
- [x] NWC connection proof-of-concept.
- [x] Display wallet info/network and balance when supported.
- [x] Create receive invoice in connected wallet.
- [x] Keep NWC URI out of KIVORA server and persistent browser storage.
- [ ] Verify Android NWC connection with real test wallet/relay.
- [ ] Add QR rendering and scan/parse.
- [ ] Add authoritative invoice status and incoming payment history.
- [ ] Add send invoice flow with explicit confirmation and fee display.
- [ ] Add timeout reconciliation and duplicate-payment protection.

**Exit:** test-wallet send/receive interoperable; payment state verified; no mainnet launch implied.

## Stage 2 — On-chain testnet wallet
- [ ] Select vetted client-side wallet SDK.
- [ ] Wallet create/import/restore on testnet.
- [ ] Local signing and backup/recovery UX.
- [ ] Address generation and QR support.
- [ ] UTXO/balance/fee data integration.
- [ ] Transaction preview and explicit signing confirmation.
- [ ] Broadcast and confirmation tracking.
- [ ] Failure, stale quote, conflict, offline and restore tests.

**Exit:** end-to-end testnet send/receive and restore verified on Android.

## Stage 3 — General wallet and worker payments
- [ ] Unified wallet dashboard with separate Lightning/on-chain balances.
- [ ] Searchable transaction history and details.
- [ ] Payment requests with amount, description, expiry and QR/link.
- [ ] Customer/project/supplier references and categories.
- [ ] Personal/business filtering.
- [ ] Notifications driven by authoritative payment state.

**Exit:** business records reconcile with protocol transactions without fabricating payment state.

## Stage 4 — KIVORA subscriptions
- [ ] Define plan catalogue, pricing and entitlement policy.
- [ ] Define cancellation, expiry, refund and renewal policy.
- [ ] Payment intent API and unique checkout IDs.
- [ ] Lightning and on-chain verification adapters.
- [ ] Idempotent backend entitlement activation.
- [ ] Underpayment/overpayment/late/duplicate/expired handling.
- [ ] Receipts and renewal reminders.

**Exit:** testnet payment verification and entitlement tests pass; paid plans remain disabled until business/legal release decisions are made.

## Stage 5 — Expert services
- [ ] Consultation catalogue and prices.
- [ ] Booking-linked payment intents.
- [ ] Verified payment before service access.
- [ ] Cancellation/refund terms and records.

## Stage 6 — Knowledge contribution rewards
- [ ] Review/acceptance workflow integration.
- [ ] Eligibility and abuse controls.
- [ ] Reward approval and unique idempotency key.
- [ ] Payout status and contribution-linked history.

## Stage 7 — Mainnet readiness (separate release gate)
- [ ] Independent wallet/security review.
- [ ] Clean-device restore and recovery evidence.
- [ ] Testnet interoperability and failure tests.
- [ ] Operational monitoring, incident response and reconciliation.
- [ ] Provider and jurisdictional review.
- [ ] Explicit mainnet release decision.

## Non-goals until separately approved
- Custody or pooled funds.
- Fiat exchange/conversion.
- Escrow.
- Automatic recurring Bitcoin debits.
- Automatic payouts without a reviewed approval process.
- Production activation or real-fund movement.


## Immediate next implementation slice — wallet creation

The wallet screen must present two clearly separate choices:

1. **Create a new KIVORA Bitcoin wallet** — embedded, user-controlled keys, beginning on Bitcoin testnet only. The next technical slice is a BDK-WASM proof of concept covering wallet creation, receive address, backup, restore and browser persistence. Do not show a seed phrase until the backup/restore design is implemented and tested end to end.
2. **Connect an existing Lightning wallet** — the existing NWC/NIP-47 flow. This is optional and remains separate from the embedded on-chain wallet.

The current NWC panel is only the second option. It must not be described as a complete KIVORA wallet. The embedded wallet must not display a fabricated balance, enable mainnet or offer send/broadcast until the relevant SDK and security gates pass.

### Founder-side actions when the implementation is ready

- Review the first wallet-creation and backup screens on the phone.
- Complete a testnet restore check using a separate browser profile/device when prompted.
- Do not fund a wallet with real Bitcoin during the testnet stage.

No API key, domain purchase or paid service is currently required for the planned BDK testnet spike. If a later provider or service introduces a cost, it must be reviewed before activation.
