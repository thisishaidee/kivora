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

  it("rotates recovery codes and revokes previous browser sessions", async () => {
    const statements: { sql: string; values: unknown[] }[] = [];
    const db = {
      prepare: (sql: string) => {
        const statement = {
          sql,
          values: [] as unknown[],
          bind(...values: unknown[]) { this.values = values; return this; },
          first: async () => null,
          all: async () => ({ results: [] }),
          run: async () => ({ success: true, meta: { changes: 1 } }),
        };
        statements.push(statement);
        return statement;
      },
      batch: async () => [
        { success: true, results: [{ id: "worker-a" }], meta: { changes: 1 } },
        { success: true, results: [], meta: { changes: 1 } },
        { success: true, results: [], meta: { changes: 1 } },
      ],
    };
    const oldCode = "e".repeat(64);
    const response = await worker.fetch(
      new Request("https://kivora.test/api/identity/recover", {
        method: "POST",
        headers: { origin: "https://kivora.test", "content-type": "application/json" },
        body: JSON.stringify({ recovery_code: oldCode }),
      }),
      { ASSETS: { fetch: vi.fn() }, DB: db as never },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.worker.id).toBe("worker-a");
    expect(body.recovery_code).toMatch(/^[0-9a-f]{64}$/);
    expect(body.recovery_code).not.toBe(oldCode);
    expect(statements[0].sql).toContain("RETURNING id");
    expect(statements[1].sql).toContain("DELETE FROM worker_sessions");
    expect(statements[2].sql).toContain("INSERT INTO worker_sessions");
    expect(statements[0].values[2]).not.toBe(oldCode);
  });

  it("rejects a replayed recovery code without issuing a session", async () => {
    const db = {
      prepare: (sql: string) => ({
        sql,
        bind() { return this; },
        first: async () => null,
        all: async () => ({ results: [] }),
        run: async () => ({ success: true, meta: { changes: 0 } }),
      }),
      batch: async () => [
        { success: true, results: [], meta: { changes: 0 } },
        { success: true, results: [], meta: { changes: 0 } },
        { success: true, results: [], meta: { changes: 0 } },
      ],
    };
    const response = await worker.fetch(
      new Request("https://kivora.test/api/identity/recover", {
        method: "POST",
        headers: { origin: "https://kivora.test", "content-type": "application/json" },
        body: JSON.stringify({ recovery_code: "f".repeat(64) }),
      }),
      { ASSETS: { fetch: vi.fn() }, DB: db as never },
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("does not expose private routes without a valid worker session", async () => {
    const db = makeDb(null);
    const response = await worker.fetch(
      new Request("https://kivora.test/api/work-sessions", {
        headers: { cookie: `__Host-kivora_session=${"d".repeat(64)}` },
      }),
      { ASSETS: { fetch: vi.fn() }, DB: db as never },
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
    expect(db.statements[0].sql).toContain("s.session_token_hash");
  });

  it("creates a private work session owned by the authenticated worker", async () => {
    const db = makeDb({ worker_id: "worker-a" });
    const response = await worker.fetch(
      new Request("https://kivora.test/api/work-sessions", {
        method: "POST",
        headers: {
          origin: "https://kivora.test",
          "content-type": "application/json",
          cookie: `__Host-kivora_session=${"a".repeat(64)}`,
        },
        body: JSON.stringify({
          trade: "plumbing",
          language: "pcm-ng",
          units: "metric",
          task: "Identify this pipe fitting before installation.",
        }),
      }),
      { ASSETS: { fetch: vi.fn() }, DB: db as never },
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.session.id).toBeTruthy();
    expect(db.statements.some((statement) => statement.sql.includes("INSERT INTO work_sessions"))).toBe(true);
    const insert = db.statements.find((statement) => statement.sql.includes("INSERT INTO work_sessions"));
    expect(insert?.values[1]).toBe("worker-a");
  });

  it("scopes private session reads to the authenticated worker", async () => {
    const statements: { sql: string; values: unknown[] }[] = [];
    const db = {
      prepare: (sql: string) => {
        const statement = {
          sql,
          values: [] as unknown[],
          bind(...values: unknown[]) { this.values = values; return this; },
          first: async () => sql.includes("JOIN workers") ? { worker_id: "worker-a" } : null,
          all: async () => ({ results: [] }),
          run: async () => ({ success: true, meta: { changes: 1 } }),
        };
        statements.push(statement);
        return statement;
      },
      batch: async () => [],
    };
    const sessionId = "123e4567-e89b-12d3-a456-426614174000";
    const response = await worker.fetch(
      new Request(`https://kivora.test/api/work-sessions/${sessionId}`, {
        headers: { cookie: `__Host-kivora_session=${"b".repeat(64)}` },
      }),
      { ASSETS: { fetch: vi.fn() }, DB: db as never },
    );

    expect(response.status).toBe(404);
    expect(statements[1].sql).toContain("AND worker_id = ?");
    expect(statements[1].values).toEqual([sessionId, "worker-a"]);
  });

  it("rejects oversized work-session bodies", async () => {
    const db = makeDb({ worker_id: "worker-a" });
    const response = await worker.fetch(
      new Request("https://kivora.test/api/work-sessions", {
        method: "POST",
        headers: {
          origin: "https://kivora.test",
          "content-type": "application/json",
          cookie: `__Host-kivora_session=${"c".repeat(64)}`,
        },
        body: JSON.stringify({
          trade: "plumbing",
          language: "en",
          units: "metric",
          task: "x".repeat(25_000),
        }),
      }),
      { ASSETS: { fetch: vi.fn() }, DB: db as never },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_work_session" });
  });

  it("deletes all private data and the worker identity on account deletion", async () => {
    const db = makeDb({ worker_id: "worker-a" });
    const response = await worker.fetch(
      new Request("https://kivora.test/api/identity", {
        method: "DELETE",
        headers: {
          origin: "https://kivora.test",
          cookie: `__Host-kivora_session=${"9".repeat(64)}`,
        },
      }),
      { ASSETS: { fetch: vi.fn() }, DB: db as never },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: true });
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    const deleteWorker = db.statements.find((statement) => statement.sql === "DELETE FROM workers WHERE id = ?");
    expect(deleteWorker?.values).toEqual(["worker-a"]);
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


describe("KIVORA assessment endpoint", () => {
  it("requires an authenticated worker before assessing a task", async () => {
    const db = makeDb(null);
    const response = await worker.fetch(
      new Request("https://kivora.test/api/assess", {
        method: "POST",
        headers: {
          origin: "https://kivora.test",
          "content-type": "application/json",
          cookie: `__Host-kivora_session=${"d".repeat(64)}`,
        },
        body: JSON.stringify({ trade: "plumbing", task: "A dripping tap" }),
      }),
      { ASSETS: { fetch: vi.fn() }, DB: db as never },
    );
    expect(response.status).toBe(401);
  });

  it("returns conservative clarification and ignores browser-supplied evidence", async () => {
    const db = makeDb({ worker_id: "worker-a" });
    const response = await worker.fetch(
      new Request("https://kivora.test/api/assess", {
        method: "POST",
        headers: {
          origin: "https://kivora.test",
          "content-type": "application/json",
          cookie: `__Host-kivora_session=${"a".repeat(64)}`,
        },
        body: JSON.stringify({
          trade: "plumbing",
          task: "My kitchen tap is dripping and I want to identify the cartridge.",
          jurisdiction: "Nigeria",
          equipmentMake: "Acme",
          equipmentModel: "K-100",
          evidence: [{
            id: "fake",
            publisher: "Fake",
            title: "Fake manual",
            productModels: ["K-100"],
            trade: "plumbing",
            topic: "cartridge identification",
            retrievedAt: "2026-11-13T10:00:00.000Z",
            excerpt: "Unverified browser supplied source",
            reviewed: true,
          }],
        }),
      }),
      { ASSETS: { fetch: vi.fn() }, DB: db as never },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.assessment.decision).toBe("clarify");
    expect(body.assessment.evidenceSources).toHaveLength(0);
  });

  it("returns a stop-work escalation for a reported gas leak", async () => {
    const db = makeDb({ worker_id: "worker-a" });
    const response = await worker.fetch(
      new Request("https://kivora.test/api/assess", {
        method: "POST",
        headers: {
          origin: "https://kivora.test",
          "content-type": "application/json",
          cookie: `__Host-kivora_session=${"b".repeat(64)}`,
        },
        body: JSON.stringify({ trade: "plumbing", task: "I smell gas and suspect a gas leak." }),
      }),
      { ASSETS: { fetch: vi.fn() }, DB: db as never },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.assessment.decision).toBe("escalate");
    expect(body.assessment.stopWork).toBe(true);
  });

  it("rejects malformed assessment input", async () => {
    const db = makeDb({ worker_id: "worker-a" });
    const response = await worker.fetch(
      new Request("https://kivora.test/api/assess", {
        method: "POST",
        headers: {
          origin: "https://kivora.test",
          "content-type": "application/json",
          cookie: `__Host-kivora_session=${"c".repeat(64)}`,
        },
        body: JSON.stringify({ trade: "unknown", task: "x" }),
      }),
      { ASSETS: { fetch: vi.fn() }, DB: db as never },
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_assessment_request" });
  });
});


describe("private evidence source API", () => {
  it("stores a new source as private and pending regardless of browser claims", async () => {
    const db = makeDb({ worker_id: "worker-a" });
    const response = await worker.fetch(
      new Request("https://kivora.test/api/evidence-sources", {
        method: "POST",
        headers: {
          origin: "https://kivora.test",
          "content-type": "application/json",
          cookie: `__Host-kivora_session=${"a".repeat(64)}`,
        },
        body: JSON.stringify({
          trade: "plumbing",
          sourceType: "manufacturer_manual",
          publisher: "Acme",
          title: "K-100 service manual",
          sourceUrl: "https://manufacturer.example/manual.pdf",
          language: "en",
          productMake: "Acme",
          productModel: "K-100",
          topic: "cartridge identification",
          pageOrSection: "4.2",
          evidenceNote: "Section 4.2 identifies the cartridge assembly.",
          review_status: "approved",
          visibility: "shared",
          rights_status: "public_domain",
          reviewer_id: "attacker",
        }),
      }),
      { ASSETS: { fetch: vi.fn() }, DB: db as never },
    );
    const body = await response.json();
    const insert = db.statements.find((statement) => statement.sql.includes("INSERT INTO evidence_sources"));
    expect(response.status).toBe(201);
    expect(body.eligible_for_guidance).toBe(false);
    expect(body.source.review_status).toBe("pending");
    expect(body.source.rights_status).toBe("user_provided_private");
    expect(insert?.sql).toContain("'private'");
    expect(insert?.sql).toContain("'pending'");
    expect(insert?.sql).toContain("'user_provided_private'");
    expect(insert?.values[1]).toBe("worker-a");
  });

  it("rejects HTTP source URLs and malformed source metadata", async () => {
    const db = makeDb({ worker_id: "worker-a" });
    const response = await worker.fetch(
      new Request("https://kivora.test/api/evidence-sources", {
        method: "POST",
        headers: {
          origin: "https://kivora.test",
          "content-type": "application/json",
          cookie: `__Host-kivora_session=${"b".repeat(64)}`,
        },
        body: JSON.stringify({
          trade: "plumbing",
          sourceType: "manufacturer_manual",
          publisher: "Acme",
          title: "K-100 manual",
          sourceUrl: "http://unsafe.example/manual",
          topic: "cartridge",
          evidenceNote: "Note",
        }),
      }),
      { ASSETS: { fetch: vi.fn() }, DB: db as never },
    );
    expect(response.status).toBe(400);
    expect(db.statements.some((statement) => statement.sql.includes("INSERT INTO evidence_sources"))).toBe(false);
  });

  it("lists only the authenticated worker's private evidence", async () => {
    const db = makeDb({ worker_id: "worker-a" });
    const response = await worker.fetch(
      new Request("https://kivora.test/api/evidence-sources", {
        headers: { cookie: `__Host-kivora_session=${"c".repeat(64)}` },
      }),
      { ASSETS: { fetch: vi.fn() }, DB: db as never },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sources: [] });
    expect(db.statements[1].sql).toContain("visibility = 'private'");
    expect(db.statements[1].sql).toContain("owner_worker_id = ?");
    expect(db.statements[1].values).toEqual(["worker-a"]);
  });
});
