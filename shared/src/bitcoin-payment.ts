export type BitcoinNetwork = "mainnet" | "testnet" | "regtest";
export type PaymentRequest =
  | {
      kind: "lightning";
      network: BitcoinNetwork;
      invoice: string;
      amountSats: null;
      source: "lightning-invoice";
    }
  | {
      kind: "onchain";
      network: BitcoinNetwork;
      address: string;
      amountSats: number | null;
      label: string | null;
      message: string | null;
      lightningInvoice: string | null;
      source: "bitcoin-uri";
      addressValidation: "requires-wallet-adapter";
    };

export type PaymentRequestErrorCode =
  | "empty"
  | "unsupported_scheme"
  | "malformed_uri"
  | "missing_address"
  | "invalid_address_format"
  | "invalid_amount"
  | "amount_out_of_range"
  | "duplicate_parameter"
  | "unsupported_required_parameter"
  | "invalid_lightning_invoice"
  | "network_mismatch";

export class PaymentRequestError extends Error {
  constructor(readonly code: PaymentRequestErrorCode) {
    super(code);
    this.name = "PaymentRequestError";
  }
}

const MAX_MONEY_SATS = 2_100_000_000_000_000;
const MAX_INVOICE_LENGTH = 4096;

function parseBtcAmount(value: string): number {
  // Decimal notation only: no signs, exponent notation, or more than 8 decimals.
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(value)) {
    throw new PaymentRequestError("invalid_amount");
  }
  const [whole, fraction = ""] = value.split(".");
  const sats = Number(whole) * 100_000_000 + Number(fraction.padEnd(8, "0"));
  if (!Number.isSafeInteger(sats) || sats <= 0) {
    throw new PaymentRequestError("invalid_amount");
  }
  if (sats > MAX_MONEY_SATS) {
    throw new PaymentRequestError("amount_out_of_range");
  }
  return sats;
}

function inferAddressNetwork(address: string): BitcoinNetwork | null {
  if (/^(1|3)[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || /^bc1[ac-hj-np-z02-9]{11,71}$/i.test(address)) {
    return "mainnet";
  }
  if (/^(m|n|2)[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || /^(tb1|bcrt1)[ac-hj-np-z02-9]{11,71}$/i.test(address)) {
    return address.toLowerCase().startsWith("bcrt1") ? "regtest" : "testnet";
  }
  return null;
}

function parseLightningInvoice(invoice: string): PaymentRequest {
  if (invoice.length > MAX_INVOICE_LENGTH || !/^[a-z0-9]+$/i.test(invoice)) {
    throw new PaymentRequestError("invalid_lightning_invoice");
  }
  const normalized = invoice.toLowerCase();
  let network: BitcoinNetwork;
  if (normalized.startsWith("lnbcrt")) network = "regtest";
  else if (normalized.startsWith("lntb")) network = "testnet";
  else if (normalized.startsWith("lnbc")) network = "mainnet";
  else throw new PaymentRequestError("invalid_lightning_invoice");

  return {
    kind: "lightning",
    network,
    invoice: normalized,
    amountSats: null,
    source: "lightning-invoice",
  };
}

/**
 * Parses a Bitcoin payment request for display and review only.
 * It never validates an address checksum, verifies an invoice signature,
 * fetches a quote, signs, broadcasts, or initiates a payment.
 */
export function parseBitcoinPaymentRequest(input: string): PaymentRequest {
  const raw = input.trim();
  if (!raw) throw new PaymentRequestError("empty");

  if (/^ln(?:bc|tb|bcrt)/i.test(raw)) return parseLightningInvoice(raw);
  if (!/^bitcoin:/i.test(raw)) throw new PaymentRequestError("unsupported_scheme");

  const withoutScheme = raw.slice(raw.indexOf(":") + 1);
  if (withoutScheme.includes("#")) throw new PaymentRequestError("malformed_uri");
  const queryIndex = withoutScheme.indexOf("?");
  const rawAddress = (queryIndex === -1 ? withoutScheme : withoutScheme.slice(0, queryIndex)).replace(/^\/+/, "");
  if (!rawAddress) throw new PaymentRequestError("missing_address");
  if (/[\s%]/.test(rawAddress)) throw new PaymentRequestError("invalid_address_format");

  const network = inferAddressNetwork(rawAddress);
  if (!network) throw new PaymentRequestError("invalid_address_format");

  const params = new URLSearchParams(queryIndex === -1 ? "" : withoutScheme.slice(queryIndex + 1));
  const seen = new Set<string>();
  for (const [key] of params) {
    if (seen.has(key)) throw new PaymentRequestError("duplicate_parameter");
    seen.add(key);
    if (key.startsWith("req-") && key !== "req-lightning") {
      throw new PaymentRequestError("unsupported_required_parameter");
    }
  }

  const amountValue = params.get("amount");
  const amountSats = amountValue === null ? null : parseBtcAmount(amountValue);
  const lightningInvoice = params.get("lightning");
  if (lightningInvoice && network !== "mainnet" && network !== "testnet") {
    throw new PaymentRequestError("network_mismatch");
  }
  if (lightningInvoice) {
    const parsedInvoice = parseLightningInvoice(lightningInvoice);
    if (parsedInvoice.network !== network) throw new PaymentRequestError("network_mismatch");
  }

  return {
    kind: "onchain",
    network,
    address: rawAddress,
    amountSats,
    label: params.get("label"),
    message: params.get("message"),
    lightningInvoice,
    source: "bitcoin-uri",
    addressValidation: "requires-wallet-adapter",
  };
}
