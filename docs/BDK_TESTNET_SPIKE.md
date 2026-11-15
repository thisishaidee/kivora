# KIVORA BDK-WASM Testnet Spike

**Status:** Isolated browser prototype; not a production wallet.  
**SDK:** `@bitcoindevkit/bdk-wallet-web` 0.4.0  
**Network:** Bitcoin testnet only.

## What this spike verifies

- BDK-WASM loads in the React/Vite browser bundle.
- Browser cryptographic randomness supplies a temporary 32-byte seed.
- BDK derives native P2WPKH testnet external/internal descriptors.
- BDK creates a wallet explicitly on `testnet`.
- The wallet derives a receive address locally in WebAssembly.
- A QR code is rendered locally in the browser; no QR service receives the address.

## Current limitations

- Temporary wallet only: seed is zeroed in the JavaScript byte array after descriptor derivation and the wallet object remains in memory only.
- No mnemonic phrase or backup export.
- No restore or IndexedDB persistence.
- No Esplora sync, balance, transaction history, fee estimate, signing, broadcast or sending.
- No mainnet network option is exposed in this component.
- Never send real BTC or valuable testnet coins to this temporary address.

## Security and implementation notes

- The BDK package runs client-side; seed bytes and private descriptors are not sent to the KIVORA Worker.
- The temporary wallet is discarded when the user selects discard or leaves the page.
- The QR component generates SVG locally and does not call a remote QR service.
- The BDK package is pre-1.0; the version is pinned and must be reviewed before upgrades.
- BDK's browser build has no direct filesystem access. Durable wallet state and encrypted backup/restore need a separate threat model and device testing before implementation.

## Next gates

1. Verify wallet creation and address QR rendering on Android Chrome.
2. Add encrypted backup and restore with a clean-device recovery test.
3. Add testnet-only Esplora sync and transaction discovery.
4. Add transaction construction and signing tests using valueless testnet funds only.
5. Complete independent security review before any mainnet capability is considered.
