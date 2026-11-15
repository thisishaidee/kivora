# KIVORA Wallet — Delivery Roadmap

This roadmap sequences the full requirements in `WALLET-REQUIREMENTS.md`. Each stage is independently testable. No stage silently authorises mainnet or real-fund use.

## Stage 0 — Product and security foundation
- [x] Define wallet as general-purpose and wallet-optional for ordinary AI access.
- [x] Separate Lightning, on-chain, payment orchestration and business records.
- [x] Define no-custody/private-key boundaries.
- [x] Define backend-only payment verification and entitlement invariants.
- [ ] Complete SDK licence, security and maintenance review.
- [ ] Threat model and data-flow review.
- [ ] Select and document a testnet provider strategy.

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
- [x] Generate a testnet wallet locally and derive a native SegWit receive address with QR.
- [x] Add 12-word English BIP39 phrase generation, selected-word confirmation and phrase-based restore in the isolated prototype.
- [x] Preserve legacy 32-byte encrypted backup import and extend v2 encrypted backup to accept 64-byte BIP39-derived seeds (AES-256-GCM + PBKDF2-SHA-256).
- [x] Document BDK changeset, IndexedDB and recovery design in [BDK-PERSISTENCE-DESIGN.md](./BDK-PERSISTENCE-DESIGN.md).
- [x] Verify exact pinned 0.4.0 source exposes `Wallet.take_staged()`, `ChangeSet.to_json()`, `ChangeSet.from_json()`, `ChangeSet.merge()` and `Wallet.load()`.
- [x] Add initial encrypted IndexedDB changeset storage and a seed-based wallet recovery path in PR #27.
- [ ] Run fresh CI for the new persistence implementation and tests.
- [ ] Verify 12-word phrase restoration on a separate clean Android browser/device and compare derived addresses.
- [ ] Verify legacy encrypted backup import and new 64-byte-seed backup restore.
- [ ] Test IndexedDB concurrency, corruption, quota and unavailable-storage failure paths.
- [x] Add encrypted full-state backup v2 containing the seed and BDK-native changeset snapshot; preserve v1 seed-only import.
- [ ] Verify restore on a clean device including revealed-address index and wallet state.
- [ ] Testnet Esplora sync, UTXO/balance and transaction discovery.
- [ ] Transaction preview and explicit local signing confirmation.
- [ ] Broadcast and confirmation tracking.
- [ ] Failure, stale quote, conflict, offline and restore tests.

**Exit:** end-to-end testnet send/receive and full-state restore verified on Android.

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
