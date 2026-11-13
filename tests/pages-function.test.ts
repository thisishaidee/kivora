import { describe, expect, it } from "vitest";
import { onRequest } from "../functions/api/[[path]]";

describe("Cloudflare Pages API function", () => {
  it("forwards API requests to the shared Worker runtime", async () => {
    const db = {
      prepare: () => ({
        bind() { return this; },
        first: async () => ({ ok: 1 }),
        all: async () => ({ results: [] }),
        run: async () => ({ success: true, meta: { changes: 1 } }),
      }),
      batch: async () => [],
    };
    const response = await onRequest({
      request: new Request("https://kivora.test/api/health"),
      env: { DB: db },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      service: "kivora-api",
      status: "ok",
      version: "0.3.0",
      storage: "d1",
    });
  });
});
