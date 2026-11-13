import { describe, expect, it, vi } from "vitest";
import { onRequest } from "../functions/api/[[path]]";

describe("Cloudflare Pages API function", () => {
  it("forwards API requests to the private Worker service binding", async () => {
    const request = new Request("https://kivora.pages.dev/api/health");
    const response = new Response(JSON.stringify({ status: "ok" }));
    const fetch = vi.fn().mockResolvedValue(response);
    const result = await onRequest({
      request,
      env: { KIVORA_API: { fetch } },
    });

    expect(fetch).toHaveBeenCalledWith(request);
    expect(result).toBe(response);
  });
});
