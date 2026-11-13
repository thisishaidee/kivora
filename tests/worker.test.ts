import { describe, expect, it, vi } from "vitest";
import worker from "../worker/src/index";

describe("KIVORA Worker routes", () => {
  it("returns a non-cacheable health response", async () => {
    const response = await worker.fetch(
      new Request("https://kivora.test/api/health"),
      { ASSETS: { fetch: vi.fn() } },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      service: "kivora-api",
      status: "ok",
      version: "0.3.0",
      storage: "d1",
    });
  });

  it("fails closed when the D1 binding is absent", async () => {
    const response = await worker.fetch(
      new Request("https://kivora.test/api/identity", {
        method: "POST",
        headers: { origin: "https://kivora.test", "content-type": "application/json" },
        body: "{}",
      }),
      { ASSETS: { fetch: vi.fn() } },
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "service_unavailable" });
  });

  it("rejects cross-origin state changes", async () => {
    const response = await worker.fetch(
      new Request("https://kivora.test/api/identity", {
        method: "POST",
        headers: { origin: "https://attacker.test", "content-type": "application/json" },
        body: "{}",
      }),
      { ASSETS: { fetch: vi.fn() } },
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "origin_not_allowed" });
  });

  it("does not expose private routes without a worker session", async () => {
    const response = await worker.fetch(
      new Request("https://kivora.test/api/work-sessions"),
      { ASSETS: { fetch: vi.fn() }, DB: {} as never },
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
  });

  it("passes non-API requests to the static asset binding", async () => {
    const assetResponse = new Response("app-shell");
    const fetchAsset = vi.fn().mockResolvedValue(assetResponse);
    const response = await worker.fetch(
      new Request("https://kivora.test/"),
      { ASSETS: { fetch: fetchAsset } },
    );

    expect(fetchAsset).toHaveBeenCalledOnce();
    expect(response).toBe(assetResponse);
  });
});
