import { useEffect, useRef, useState } from "react";
import type { Wallet as BdkWallet } from "@bitcoindevkit/bdk-wallet-web";
import { QRCodeSVG } from "qrcode.react";
import { createBdkTestnetWallet } from "./bdk-testnet-wallet";

export default function TestnetWalletPanel() {
  const walletRef = useRef<BdkWallet | null>(null);
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => () => {
    walletRef.current?.free();
    walletRef.current = null;
  }, []);

  async function createWallet() {
    setBusy(true);
    setStatus("");
    setAddress("");
    walletRef.current?.free();
    walletRef.current = null;
    const seed = crypto.getRandomValues(new Uint8Array(32));
    try {
      const result = await createBdkTestnetWallet(seed);
      walletRef.current = result.wallet;
      setAddress(result.address);
      setStatus("Temporary testnet wallet created locally in this browser session.");
    } catch {
      setStatus("The testnet wallet could not be created in this browser. No wallet was saved.");
    } finally {
      seed.fill(0);
      setBusy(false);
    }
  }

  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setStatus("Testnet address copied.");
    } catch {
      setStatus("Clipboard access is unavailable. Select and copy the address manually.");
    }
  }

  function discardWallet() {
    walletRef.current?.free();
    walletRef.current = null;
    setAddress("");
    setStatus("Temporary testnet wallet discarded.");
  }

  return (
    <section className="workspace testnet-wallet">
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">ON-CHAIN BITCOIN · BDK-WASM</p>
          <h2>Test the on-chain wallet</h2>
        </div>
        <span className="step-label">TESTNET ONLY</span>
      </div>
      <p className="privacy-note testnet-intro">
        This isolated prototype checks browser-side key generation and native Bitcoin testnet address derivation.
        It is not a usable wallet yet: backup, restore, blockchain sync and sending are not enabled.
      </p>
      {!address ? (
        <button className="submit-button" type="button" onClick={() => void createWallet()} disabled={busy}>
          <span>{busy ? "Creating testnet wallet…" : "Create temporary testnet wallet"}</span>
          <span aria-hidden="true">↗</span>
        </button>
      ) : (
        <div className="testnet-result">
          <div className="testnet-qr">
            <QRCodeSVG value={`bitcoin:${address}`} size={220} level="M" includeMargin />
          </div>
          <p className="eyebrow testnet-address-label">BITCOIN TESTNET RECEIVE ADDRESS</p>
          <p className="testnet-address">{address}</p>
          <div className="unit-options">
            <button className="unit-option selected" type="button" onClick={() => void copyAddress()}>Copy address</button>
            <button className="unit-option" type="button" onClick={discardWallet}>Discard wallet</button>
          </div>
          <p className="privacy-note">Balance is not synced. This temporary wallet is cleared when discarded or when this page session ends. Do not send real BTC or testnet coins you need to keep.</p>
        </div>
      )}
      {status && <p className="notice" role="status">{status}</p>}
    </section>
  );
}
