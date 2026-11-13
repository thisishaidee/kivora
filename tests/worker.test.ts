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
      version: "0.1.0",
    });
  });

  it("does not pretend unimplemented API routes exist", async () => {
    const response = await worker.fetch(
      new Request("https://kivora.test/api/sessions"),
      { ASSETS: { fetch: vi.fn() } },
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_implemented" });
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
