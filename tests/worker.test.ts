import { describe, expect, it, vi } from "vitest";
import worker from "../worker/src/index";

const makeDb = (firstResult: unknown = null) => {
  const statements: { sql: string; values: unknown[] }[] = [];
  const db = {
    prepare: (sql: string) => {
      const statement = {
        sql,
        values: [] as unknown[],
        bind(...values: unknown[]) { this.values = values; return this; },
        first: async () => firstResult,
        all: async () => ({ results: [] }),
        run: async () => ({ success: true, meta: { changes: 1 } }),
      };
      statements.push(statement);
      return statement;
    },
    batch: async (batchStatements: unknown[]) => batchStatements.map(() => ({
      success: true,
      results: [],
      meta: { changes: 1 },
    })),
    statements,
  };
  return db;
};

describe("KIVORA Worker routes", () => {
  it("returns a non-cacheable health response after checking D1", async () => {
    const db = makeDb({ ok: 1 });
    const response = await worker.fetch(
      new Request("https://kivora.test/api/health"),
      { ASSETS: { fetch: vi.fn() }, DB: db as never },
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
    const db = makeDb();
    const response = await worker.fetch(
      new Request("https://kivora.test/api/identity", {
        method: "POST",
        headers: { origin: "https://attacker.test", "content-type": "application/json" },
        body: "{}",
      }),
      { ASSETS: { fetch: vi.fn() }, DB: db as never },
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "origin_not_allowed" });
    expect(db.statements).toHaveLength(0);
  });

  it("creates a worker with hashed secrets and a secure HttpOnly cookie", async () => {
    const db = makeDb();
    const response = await worker.fetch(
      new Request("https://kivora.test/api/identity", {
        method: "POST",
        headers: { origin: "https://kivora.test" },
      }),
      { ASSETS: { fetch: vi.fn() }, DB: db as never },
    );
    const body = await response.json();
    const cookie = response.headers.get("set-cookie");
    if (!cookie) throw new Error("Missing session cookie");

    expect(response.status).toBe(201);
    expect(body.worker.id).toBeTruthy();
    expect(body.recovery_code).toMatch(/^[0-9a-f]{64}$/);
    expect(body.recovery_code_displayed_once).toBe(true);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Path=/");
    expect(db.statements).toHaveLength(2);
    const storedRecoveryHash = db.statements[0].values[1];
    const cookieToken = cookie.split(";")[0].split("=")[1];
    const storedSessionHash = db.statements[1].values[2];
    expect(storedRecoveryHash).toMatch(/^[0-9a-f]{64}$/);
    expect(storedSessionHash).toMatch(/^[0-9a-f]{64}$/);
    expect(storedRecoveryHash).not.toBe(body.recovery_code);
    expect(storedSessionHash).not.toBe(cookieToken);
  });

  it("does not expose private routes without a valid worker session", async () => {
    const db = makeDb(null);
    const response = await worker.fetch(
      new Request("https://kivora.test/api/work-sessions"),
      { ASSETS: { fetch: vi.fn() }, DB: db as never },
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
    expect(db.statements[0].sql).toContain("s.session_token_hash");
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
