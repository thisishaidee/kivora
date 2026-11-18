# KIVORA Lightning Wallet Integration

**Protocol:** Nostr Wallet Connect (NWC / NIP-47)  
**Client:** `@getalby/sdk` 8.0.3  
**Status:** Receive-only frontend integration; automated tests pass, but real wallet interoperability still requires testing.

## Purpose

Workers should be able to receive payment for their work through a Lightning wallet they already control. KIVORA connects to that wallet; it does not custody funds.

## First release

- Connect an existing wallet through a dedicated NWC connection URI.
- Read wallet alias, network and balance when the wallet advertises those methods.
- Create a Lightning invoice for a worker-selected amount (1–100,000 sats).
- Copy and share the invoice so a customer can pay the worker directly.
- Disconnect and close the client.

## Security boundaries

- Never request a seed phrase or private key.
- Treat the NWC URI as a password-equivalent permissioned secret.
- Keep the URI in component memory only; do not send it to KIVORA servers, store it in localStorage, cookies, IndexedDB or logs.
- Encourage a dedicated connection with minimum permissions.
- No outgoing payments, auto-payments, custody, escrow, fiat conversion or wallet-based AI entitlement in this version.
- Creating an invoice does not move funds; the payer chooses whether to pay it.
- KIVORA's basic AI access remains free and wallet-optional.

## Next stages

1. Verify NWC connection and invoice creation with a real Android wallet and relay.
2. Add invoice status and received-payment history using only supported wallet methods.
3. Add worker-controlled payment requests and payment records.
4. Consider outgoing payments only after a separate explicit authorization, with per-payment confirmation and strict limits.

## Manual test checklist

1. Create a dedicated NWC connection in a compatible Lightning wallet.
2. Grant only the methods needed for connection, balance and invoice creation.
3. Open KIVORA over HTTPS on Android.
4. Connect the wallet and verify its alias/network.
5. Create a small test invoice and confirm it appears in the wallet.
6. Do not pay the invoice unless deliberately testing a real payment with a separate wallet and an amount you choose.
7. Disconnect and refresh; verify the connection is not remembered.
