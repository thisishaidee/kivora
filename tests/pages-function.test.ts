import { describe, expect, it, vi } from "vitest";
import { onRequest } from "../functions/api/[[path]]";

describe("Cloudflare Pages API function", () => {
  it("runs the same API runtime with the environment bound to this Pages deployment", async () => {
    const request = new Request("https://kivora.pages.dev/api/health");
    const first = vi.fn().mockResolvedValue({ ok: 1 });
    const prepare = vi.fn().mockReturnValue({ first });
    const env = { DB: { prepare } } as Parameters<typeof onRequest>[0]["env"];

    const response = await onRequest({ request, env });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      service: "kivora-api",
      status: "ok",
      version: "0.3.0",
      storage: "d1",
    });
    expect(prepare).toHaveBeenCalledWith("SELECT 1 AS ok");
    expect(first).toHaveBeenCalledOnce();
  });
});
