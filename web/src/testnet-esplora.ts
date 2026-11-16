export const TESTNET_ESPLORA_API = "https://blockstream.info/testnet/api";

export interface EsploraAddressStats {
  funded_txo_sum: number;
  spent_txo_sum: number;
  tx_count: number;
}

export interface EsploraAddressResponse {
  address: string;
  chain_stats: EsploraAddressStats;
  mempool_stats: EsploraAddressStats;
}

export interface EsploraTransaction {
  txid: string;
  fee: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_time?: number;
  };
  vin: Array<{ prevout?: { scriptpubkey_address?: string; value?: number } }>;
  vout: Array<{ scriptpubkey_address?: string; value: number }>;
}

export interface AddressTransaction {
  txid: string;
  direction: "incoming" | "outgoing" | "self";
  netSats: number;
  feeSats: number;
  confirmed: boolean;
  confirmations: number;
  timestamp: number | null;
}

export interface AddressSnapshot {
  address: string;
  confirmedSats: number;
  unconfirmedSats: number;
  totalSats: number;
  transactionCount: number;
  transactions: AddressTransaction[];
  fetchedAt: number;
}

function safeSats(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`The testnet explorer returned an invalid ${field} value.`);
  }
  return value as number;
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${TESTNET_ESPLORA_API}${path}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 429) throw new Error("The testnet explorer is rate-limiting requests. Wait a moment and retry.");
    if (response.status >= 500) throw new Error("The testnet explorer is temporarily unavailable. Try again shortly.");
    throw new Error(`The testnet explorer request failed (HTTP ${response.status}).`);
  }
  return response.json() as Promise<T>;
}

function mapTransaction(tx: EsploraTransaction, address: string, tipHeight: number): AddressTransaction {
  if (!/^[0-9a-f]{64}$/i.test(tx.txid)) throw new Error("The testnet explorer returned an invalid transaction ID.");
  const received = tx.vout.reduce((sum, output) => (
    output.scriptpubkey_address === address ? sum + safeSats(output.value, "output amount") : sum
  ), 0);
  const spent = tx.vin.reduce((sum, input) => (
    input.prevout?.scriptpubkey_address === address
      ? sum + safeSats(input.prevout.value, "input amount")
      : sum
  ), 0);
  const netSats = received - spent;
  const confirmed = tx.status.confirmed === true;
  const blockHeight = confirmed ? safeSats(tx.status.block_height, "block height") : 0;
  return {
    txid: tx.txid,
    direction: netSats > 0 ? "incoming" : netSats < 0 ? "outgoing" : "self",
    netSats,
    feeSats: safeSats(tx.fee, "transaction fee"),
    confirmed,
    confirmations: confirmed && blockHeight > 0 ? Math.max(0, tipHeight - blockHeight + 1) : 0,
    timestamp: confirmed && Number.isSafeInteger(tx.status.block_time) ? tx.status.block_time! : null,
  };
}

/**
 * Read-only Esplora snapshot for the currently displayed receive address.
 * This is deliberately address-scoped, not a complete HD-wallet scan.
 * No seed, descriptor, private key, or signing material leaves the browser.
 */
export async function fetchTestnetAddressSnapshot(
  address: string,
  signal?: AbortSignal,
): Promise<AddressSnapshot> {
  if (!/^tb1[02-9a-hj-np-z]{20,87}$/i.test(address)) {
    throw new Error("This is not a supported Bitcoin testnet SegWit receive address.");
  }
  const encoded = encodeURIComponent(address);
  const [details, transactions, tipHeight] = await Promise.all([
    getJson<EsploraAddressResponse>(`/address/${encoded}`, signal),
    getJson<EsploraTransaction[]>(`/address/${encoded}/txs`, signal),
    getJson<string>("/blocks/tip/height", signal),
  ]);
  if (details.address !== address) throw new Error("The explorer returned data for a different address.");
  if (!Array.isArray(transactions)) throw new Error("The testnet explorer returned an invalid transaction list.");
  const tip = Number(tipHeight);
  if (!Number.isSafeInteger(tip) || tip < 0) throw new Error("The testnet explorer returned an invalid chain height.");

  const confirmedSats =
    safeSats(details.chain_stats.funded_txo_sum, "confirmed received amount") -
    safeSats(details.chain_stats.spent_txo_sum, "confirmed spent amount");
  const unconfirmedSats =
    safeSats(details.mempool_stats.funded_txo_sum, "unconfirmed received amount") -
    safeSats(details.mempool_stats.spent_txo_sum, "unconfirmed spent amount");
  if (confirmedSats < 0 || confirmedSats + unconfirmedSats < 0) {
    throw new Error("The testnet explorer returned an impossible address balance.");
  }

  return {
    address,
    confirmedSats,
    unconfirmedSats,
    totalSats: confirmedSats + unconfirmedSats,
    transactionCount: safeSats(details.chain_stats.tx_count, "confirmed transaction count") +
      safeSats(details.mempool_stats.tx_count, "unconfirmed transaction count"),
    transactions: transactions.slice(0, 25).map((tx) => mapTransaction(tx, address, tip)),
    fetchedAt: Date.now(),
  };
}

export function formatSats(sats: number): string {
  if (!Number.isSafeInteger(sats)) throw new Error("Invalid satoshi amount.");
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(sats);
}
