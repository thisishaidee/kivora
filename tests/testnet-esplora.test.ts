import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTestnetAddressSnapshot, formatSats } from "../web/src/testnet-esplora";

const address = "tb1q7murul2mdp8652c9va558lahx20ktn8v2ntvh2";

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("testnet Esplora address snapshot", () => {
  it("calculates confirmed and unconfirmed address balances and maps recent activity", async () => {
    const txid = "a".repeat(64);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        address,
        chain_stats: { funded_txo_sum: 150_000, spent_txo_sum: 40_000, tx_count: 2 },
        mempool_stats: { funded_txo_sum: 5_000, spent_txo_sum: 0, tx_count: 1 },
      }))
      .mockResolvedValueOnce(jsonResponse([{
        txid,
        fee: 250,
        status: { confirmed: true, block_height: 100, block_time: 1_700_000_000 },
        vin: [],
        vout: [{ scriptpubkey_address: address, value: 150_000 }],
      }]))
      .mockResolvedValueOnce(jsonResponse("105"));
    vi.stubGlobal("fetch", fetchMock);

    const snapshot = await fetchTestnetAddressSnapshot(address);

    expect(snapshot.confirmedSats).toBe(110_000);
    expect(snapshot.unconfirmedSats).toBe(5_000);
    expect(snapshot.totalSats).toBe(115_000);
    expect(snapshot.transactionCount).toBe(3);
    expect(snapshot.transactions[0]).toMatchObject({
      txid,
      direction: "incoming",
      netSats: 150_000,
      feeSats: 250,
      confirmed: true,
      confirmations: 6,
      timestamp: 1_700_000_000,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.every(([url]) => String(url).startsWith("https://blockstream.info/testnet/api/"))).toBe(true);
  });

  it("rejects non-testnet or malformed addresses before making requests", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchTestnetAddressSnapshot("bc1qnot-testnet")).rejects.toThrow("testnet SegWit");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an explorer response for a different address", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        address: "tb1q000000000000000000000000000000000000000",
        chain_stats: { funded_txo_sum: 0, spent_txo_sum: 0, tx_count: 0 },
        mempool_stats: { funded_txo_sum: 0, spent_txo_sum: 0, tx_count: 0 },
      }))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse("105"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchTestnetAddressSnapshot(address)).rejects.toThrow("different address");
  });

  it("returns a useful retry message when the explorer rate-limits", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, 429)));
    await expect(fetchTestnetAddressSnapshot(address)).rejects.toThrow("rate-limiting");
  });
});

describe("formatSats", () => {
  it("formats integer satoshi amounts without rounding", () => {
    expect(formatSats(123456789)).toBe("123,456,789");
    expect(formatSats(0)).toBe("0");
  });

  it("rejects non-integer amounts", () => {
    expect(() => formatSats(1.2)).toThrow("Invalid satoshi");
  });
});
