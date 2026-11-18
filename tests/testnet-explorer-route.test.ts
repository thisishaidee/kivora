import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequest } from "../functions/api/testnet/[[path]]";

afterEach(() => vi.unstubAllGlobals());

describe("read-only testnet explorer Pages route", () => {
  it("routes the tip-height request when catch-all params are absent", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("5371186", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const request = new Request("https://kivora.example/api/testnet/blocks/tip/height");
    const response = await onRequest({ request });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("5371186");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://blockstream.info/testnet/api/blocks/tip/height",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("supports catch-all params represented as path segments", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const address = "tb1qh7sh50e9qgrurpp4rgksggr6kea0snvmlphsyu";
    const request = new Request(`https://kivora.example/api/testnet/address/${address}/txs`);
    const response = await onRequest({ request, params: { path: ["address", address, "txs"] } });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("[]");
    expect(fetchMock).toHaveBeenCalledWith(
      `https://blockstream.info/testnet/api/address/${address}/txs`,
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("rejects non-GET requests without contacting the explorer", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await onRequest({
      request: new Request("https://kivora.example/api/testnet/blocks/tip/height", { method: "POST" }),
    });

    expect(response.status).toBe(405);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
