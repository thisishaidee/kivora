import { useState } from "react";
import type { FormEvent } from "react";
import {
  parseBitcoinPaymentRequest,
  PaymentRequestError,
  type PaymentRequest,
} from "../../shared/src/bitcoin-payment";

function formatBtc(sats: number): string {
  return (sats / 100_000_000).toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
}

export default function PaymentRequestPreview() {
  const [rawRequest, setRawRequest] = useState("");
  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  function decode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCopyStatus("");
    try {
      setRequest(parseBitcoinPaymentRequest(rawRequest));
      setError("");
    } catch (cause) {
      setRequest(null);
      setError(cause instanceof PaymentRequestError ? cause.code.replaceAll("_", " ") : "Could not read this payment request.");
    }
  }

  async function copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus("Copied to clipboard.");
    } catch {
      setCopyStatus("Clipboard access is unavailable in this browser.");
    }
  }

  return (
    <section className="workspace payment-preview">
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">BITCOIN WALLET · PAYMENT TOOLS</p>
          <h2>Review a payment request</h2>
        </div>
        <span className="step-label">PREVIEW ONLY</span>
      </div>
      <p className="privacy-note payment-intro">
        Paste a Bitcoin address, BIP21 payment link or Lightning invoice to inspect its format before using a wallet.
        This tool never sends funds.
      </p>
      <form className="payment-form" onSubmit={decode}>
        <label className="field">
          Payment request
          <textarea
            value={rawRequest}
            onChange={(event) => setRawRequest(event.target.value)}
            placeholder="bitcoin:bc1… or lnbc…"
            rows={3}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <button className="submit-button" type="submit" disabled={!rawRequest.trim()}>
          <span>Review request</span><span>→</span>
        </button>
      </form>

      {error && <p className="payment-error" role="alert">{error}. Check the request and try again.</p>}

      {request?.kind === "lightning" && (
        <div className="payment-result">
          <div className="payment-result-heading">
            <span className="payment-tag">LIGHTNING</span>
            <span className="payment-network">{request.network.toUpperCase()}</span>
          </div>
          <dl className="payment-details">
            <div><dt>Invoice</dt><dd className="payment-value">{request.invoice}</dd></div>
            <div><dt>Amount</dt><dd>Not decoded by this preview</dd></div>
          </dl>
          <p className="privacy-note">Invoice signature, amount, expiry and payment status must be checked by the connected wallet before any payment.</p>
          <button className="unit-option" type="button" onClick={() => void copyValue(request.invoice)}>Copy invoice</button>
        </div>
      )}

      {request?.kind === "onchain" && (
        <div className="payment-result">
          <div className="payment-result-heading">
            <span className="payment-tag">ON-CHAIN BITCOIN</span>
            <span className="payment-network">{request.network.toUpperCase()}</span>
          </div>
          <dl className="payment-details">
            <div><dt>Destination</dt><dd className="payment-value">{request.address}</dd></div>
            <div><dt>Amount</dt><dd>{request.amountSats === null ? "Not specified" : `${request.amountSats.toLocaleString()} sats · ${formatBtc(request.amountSats)} BTC`}</dd></div>
            {request.label && <div><dt>Label</dt><dd>{request.label}</dd></div>}
            {request.message && <div><dt>Message</dt><dd>{request.message}</dd></div>}
          </dl>
          <button className="unit-option" type="button" onClick={() => void copyValue(request.address)}>Copy address</button>
          {request.lightningInvoice && (
            <div className="payment-alternative">
              <p className="eyebrow">LIGHTNING ALTERNATIVE</p>
              <p className="payment-value">{request.lightningInvoice}</p>
              <button className="unit-option" type="button" onClick={() => void copyValue(request.lightningInvoice!)}>Copy Lightning invoice</button>
            </div>
          )}
          <p className="privacy-note">Address checksum and any Lightning invoice signature still require wallet validation. No payment has been initiated.</p>
        </div>
      )}

      {copyStatus && <p className="notice" role="status">{copyStatus}</p>}
    </section>
  );
}
