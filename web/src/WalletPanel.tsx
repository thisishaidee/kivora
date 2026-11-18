import { useEffect, useRef, useState } from "react";
import { NWCClient } from "@getalby/sdk/nwc";

async function withTimeout<T>(operation: Promise<T>, timeoutMs = 12000): Promise<T> {
  let timeoutId: number | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error("wallet_request_timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
}

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

      const info = await withTimeout(client.getInfo());
      let balance: number | null = null;
      if (info.methods.includes("get_balance")) {
        try {
          const result = await withTimeout(client.getBalance());
          balance = Math.round(result.balance / 1000);
        } catch {
          // A balance failure should not invalidate an otherwise working connection.
          balance = null;
        }
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
      const result = await withTimeout(client.makeInvoice({
        amount: amount * 1000,
        description: "KIVORA work payment",
        expiry: 3600,
      }));
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

  async function shareInvoice() {
    if (!invoice) return;
    if (!navigator.share) {
      setStatus("Sharing is unavailable in this browser. Copy the invoice instead.");
      return;
    }
    try {
      await navigator.share({
        title: "KIVORA work payment",
        text: invoice,
      });
      setStatus("Invoice shared.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("The invoice could not be shared. You can still copy it.");
    }
  }

  return (
    <section className="wallet-panel" aria-labelledby="wallet-title">
      <div className="wallet-heading">
        <div>
          <p className="eyebrow">BITCOIN / LIGHTNING</p>
          <h2 id="wallet-title">Your work payments</h2>
        </div>
        <span className="wallet-protocol">NWC · NIP-47</span>
      </div>

      {!walletInfo ? (
        <div className="wallet-connect">
          <p className="wallet-copy">Connect a Lightning wallet you already control. KIVORA does not hold your bitcoin, ask for your seed phrase or require a wallet to use the AI workspace.</p>
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
          <p className="privacy-note">Treat this code like a password. It may grant access to your wallet. KIVORA keeps it in memory only and does not send it to the KIVORA server. Create a dedicated connection with the smallest permissions you need.</p>
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
            <strong>{balanceSats === null ? "Not available" : balanceSats.toLocaleString() + " sats"}</strong>
          </div>

          {walletInfo.methods.includes("make_invoice") ? (
            <div className="invoice-tools">
              <label className="field">
                <span>Receive payment amount (sats)</span>
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
                  <div className="unit-options">
                    <button className="unit-option selected" type="button" onClick={() => void copyInvoice()}>Copy invoice</button>
                    <button className="unit-option" type="button" onClick={() => void shareInvoice()}>Share invoice</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="privacy-note">This wallet connection does not advertise invoice creation. Balance and connection details are available where supported.</p>
          )}
          <p className="privacy-note">This first version supports wallet connection and receiving payments only. It cannot send bitcoin or move funds on your behalf.</p>
        </div>
      )}

      {status && <p className="notice wallet-notice" role="status">{status}</p>}
    </section>
  );
}
