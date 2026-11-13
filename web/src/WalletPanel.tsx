import { useEffect, useRef, useState } from "react";
import { NWCClient } from "@getalby/sdk/nwc";

type WalletInfo = Awaited<ReturnType<NWCClient["getInfo"]>>;

export default function WalletPanel() {
  const clientRef = useRef<NWCClient | null>(null);
  const [connectionUri, setConnectionUri] = useState("");
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [balanceSats, setBalanceSats] = useState<number | null>(null);
  const [amountSats, setAmountSats] = useState("100");
  const [invoice, setInvoice] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => () => {
    void clientRef.current?.close();
    clientRef.current = null;
  }, []);

  async function connectWallet() {
    const uri = connectionUri.trim();
    if (!uri) {
      setStatus("Paste a wallet connection code to continue.");
      return;
    }

    setBusy(true);
    setStatus("");
    setInvoice("");
    let client: NWCClient | null = null;

    try {
      NWCClient.parseWalletConnectUrl(uri, true);
      client = new NWCClient({
        nostrWalletConnectUrl: uri,
        requireSecret: true,
      });
      setConnectionUri("");

      const info = await client.getInfo();
      let balance: number | null = null;
      if (info.methods.includes("get_balance")) {
        const result = await client.getBalance();
        balance = Math.round(result.balance / 1000);
      }

      clientRef.current = client;
      setWalletInfo(info);
      setBalanceSats(balance);
      setStatus("Lightning wallet connected. The connection stays in this browser session only.");
    } catch {
      void client?.close();
      setConnectionUri("");
      setStatus("Could not connect. Check that the wallet connection is valid and still active.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnectWallet() {
    const client = clientRef.current;
    clientRef.current = null;
    if (client) void client.close();
    setWalletInfo(null);
    setBalanceSats(null);
    setInvoice("");
    setConnectionUri("");
    setStatus("Wallet disconnected from this browser session.");
  }

  async function createReceiveInvoice() {
    const client = clientRef.current;
    const amount = Number(amountSats);
    if (!client || !walletInfo?.methods.includes("make_invoice")) {
      setStatus("This wallet connection does not support creating invoices.");
      return;
    }
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100000) {
      setStatus("Enter an amount from 1 to 100,000 sats.");
      return;
    }

    setBusy(true);
    setStatus("");
    setInvoice("");
    try {
      const result = await client.makeInvoice({
        amount: amount * 1000,
        description: "KIVORA Lightning wallet test",
        expiry: 3600,
      });
      setInvoice(result.invoice);
      setStatus("Invoice created in your connected wallet. It expires in one hour.");
    } catch {
      setStatus("The wallet could not create an invoice. Check its connection and permissions.");
    } finally {
      setBusy(false);
    }
  }

  async function copyInvoice() {
    if (!invoice) return;
    try {
      await navigator.clipboard.writeText(invoice);
      setStatus("Invoice copied.");
    } catch {
      setStatus("Copy is unavailable in this browser. Select and copy the invoice text.");
    }
  }

  return (
    <section className="wallet-panel" aria-labelledby="wallet-title">
      <div className="wallet-heading">
        <div>
          <p className="eyebrow">BITCOIN / LIGHTNING</p>
          <h2 id="wallet-title">Connect a Lightning wallet</h2>
        </div>
        <span className="wallet-protocol">NWC · NIP-47</span>
      </div>

      {!walletInfo ? (
        <div className="wallet-connect">
          <p className="wallet-copy">Connect a wallet you already control. KIVORA uses an encrypted Nostr Wallet Connect link; it does not hold your bitcoin or ask for your seed phrase.</p>
          <label className="field">
            <span>Wallet connection code</span>
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={connectionUri}
              onChange={(event) => setConnectionUri(event.target.value)}
              placeholder="nostr+walletconnect://…"
              aria-label="Nostr Wallet Connect connection code"
            />
          </label>
          <button className="submit-button wallet-action" type="button" onClick={() => void connectWallet()} disabled={busy}>
            {busy ? "Connecting…" : "Connect wallet"} <span aria-hidden="true">↗</span>
          </button>
          <p className="privacy-note">Treat this code like a password. It may grant access to your wallet. KIVORA keeps it in memory only, does not save it, and does not send it to the KIVORA server. Use a connection with the smallest permissions you need.</p>
        </div>
      ) : (
        <div className="wallet-connected">
          <div className="wallet-summary">
            <span className="wallet-status-dot" />
            <div>
              <strong>{walletInfo.alias || "Lightning wallet"}</strong>
              <p>{walletInfo.network || "Network not reported"} · Connected</p>
            </div>
            <button className="text-button" type="button" onClick={() => void disconnectWallet()}>Disconnect</button>
          </div>

          <div className="wallet-balance">
            <span>Wallet balance</span>
            <strong>{balanceSats === null ? "Not available" : `${balanceSats.toLocaleString()} sats`}</strong>
          </div>

          {walletInfo.methods.includes("make_invoice") ? (
            <div className="invoice-tools">
              <label className="field">
                <span>Receive invoice amount (sats)</span>
                <input type="number" min="1" max="100000" step="1" value={amountSats} onChange={(event) => setAmountSats(event.target.value)} />
              </label>
              <button className="submit-button wallet-action" type="button" onClick={() => void createReceiveInvoice()} disabled={busy}>
                {busy ? "Working…" : "Create receive invoice"} <span aria-hidden="true">↗</span>
              </button>
              {invoice && (
                <div className="invoice-result">
                  <label className="field">
                    <span>Lightning invoice</span>
                    <textarea value={invoice} readOnly rows={3} />
                  </label>
                  <button className="unit-option selected" type="button" onClick={() => void copyInvoice()}>Copy invoice</button>
                </div>
              )}
            </div>
          ) : (
            <p className="privacy-note">This wallet connection does not advertise invoice creation. Balance and connection details are available where supported.</p>
          )}
          <p className="privacy-note">KIVORA does not initiate outgoing payments in this version. Creating an invoice does not move funds. Only share an invoice if you intend to receive a payment.</p>
        </div>
      )}

      {status && <p className="notice wallet-notice" role="status">{status}</p>}
    </section>
  );
}
