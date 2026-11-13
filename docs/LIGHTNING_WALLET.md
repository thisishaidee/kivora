# KIVORA Lightning Wallet Integration

**Implementation:** Nostr Wallet Connect (NWC / NIP-47)  
**JavaScript client:** @getalby/sdk 8.0.3 (MIT)  
**Status:** Frontend integration implemented; live-wallet interoperability test still required.

## Why NWC

NWC is an open protocol for connecting an application to a worker's existing Lightning wallet. The wallet creates a connection URI and the app uses it to request supported wallet operations. The wallet remains under the worker's control; KIVORA does not custody bitcoin.

The Alby JavaScript SDK exposes an NWCClient with wallet-info, balance and invoice methods. The current implementation uses the official package pinned at 8.0.3.

## Implemented behaviour

- Worker enters their NWC connection URI.
- KIVORA validates the URI structure locally.
- KIVORA requests wallet information and reads balance if the wallet advertises get_balance.
- KIVORA shows the wallet alias, network and supported balance.
- If the wallet advertises make_invoice, the worker can request a receive invoice for 1–100,000 sats.
- The invoice can be copied and shared by the worker.
- The worker can disconnect the wallet.

All amounts passed to NWC are millisatoshis. The interface displays balance in whole satoshis.

## Security boundaries

- The NWC URI is a permissioned secret. Treat it like a password.
- The URI is held in component memory only. It is not written to localStorage, IndexedDB, cookies, the KIVORA API, analytics or logs.
- The UI clears the input after attempting connection and closes the SDK client on disconnect or component unmount.
- KIVORA never asks for a seed phrase or private key.
- This version does not initiate outgoing payments.
- Creating an invoice does not move funds. A payment only occurs if another person chooses to pay the invoice.
- Workers should create a dedicated NWC connection with the smallest permissions and spending budget their wallet supports.

## Current limitations

- Wallet connection requires a worker to obtain an NWC URI from a compatible wallet.
- Wallet providers expose different methods. KIVORA checks advertised methods and only shows invoice creation when make_invoice is available.
- A real wallet and relay interoperability test is still required. Unit tests validate URI parsing, not a live payment.
- No wallet URI is stored in a KIVORA worker profile or database.
- No outgoing payment, auto-payment, wallet custody, fiat conversion or token entitlement is implemented.

## Manual test checklist

1. Create a dedicated NWC connection in a compatible Lightning wallet.
2. Use the smallest permissions available; do not grant payment permissions if only testing receive invoices.
3. Open KIVORA over HTTPS.
4. Paste the NWC URI into the wallet panel.
5. Confirm the wallet alias, network and balance are displayed.
6. If make_invoice is advertised, create a small test invoice and verify it appears in the connected wallet.
7. Do not pay the invoice unless deliberately testing a real payment with a separate wallet and an amount you choose.
8. Disconnect and refresh the page; confirm the URI is not remembered and the wallet is disconnected.

## References

- NWC protocol: https://nwc.dev/
- NIP-47 specification: https://nips.nostr.com/47
- Alby JavaScript SDK: https://github.com/getAlby/js-sdk
- SDK package: https://www.npmjs.com/package/@getalby/sdk
