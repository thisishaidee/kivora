interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({
        service: "kivora-api",
        status: "ok",
        version: "0.1.0",
      });
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "not_implemented" }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};

export default worker;
