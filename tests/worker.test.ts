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
        first: async () => sql.includes("SELECT 1 AS present FROM conversation_media") || sql.includes("SELECT 1 AS present FROM conversation_media_derivatives") ? null : firstResult,
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
          involvesEquipment: true,
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
    const evidenceQuery = db.statements.find((statement) => statement.sql.includes("FROM evidence_sources"));
    expect(evidenceQuery?.sql).toContain("visibility = 'shared'");
    expect(evidenceQuery?.sql).toContain("review_status = 'approved'");
    expect(evidenceQuery?.sql).toContain("rights_status IN");
    expect(evidenceQuery?.sql).toContain("reviewer_role IN ('qualified_reviewer', 'manufacturer')");
    expect(evidenceQuery?.values).toEqual(["plumbing", "Nigeria", "Nigeria", "Acme", "K-100"]);
    expect(evidenceQuery?.sql).toContain("source_type != 'field_observation'");
    expect(evidenceQuery?.sql).toContain("product_make = ? COLLATE NOCASE AND product_model = ? COLLATE NOCASE");
    expect(evidenceQuery?.sql).toContain("source_type = 'standard' AND jurisdiction = ? COLLATE NOCASE");
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


describe("KIVORA research endpoint access control", () => {
  const sessionId = "123e4567-e89b-12d3-a456-426614174000";
  const request = () => new Request("https://kivora.test/api/research", {
    method: "POST",
    headers: {
      origin: "https://kivora.test",
      "content-type": "application/json",
      cookie: `__Host-kivora_session=${"a".repeat(64)}`,
    },
    body: JSON.stringify({
      sessionId,
      trade: "plumbing",
      task: "Identify the exact replacement cartridge for this tap.",
      language: "en",
      units: "metric",
    }),
  });
  const authenticatedDb = (session: unknown) => {
    const statements: { sql: string; values: unknown[] }[] = [];
    const db = {
      prepare: (sql: string) => {
        const statement = {
          sql,
          values: [] as unknown[],
          bind(...values: unknown[]) { this.values = values; return this; },
          first: async () => sql.includes("JOIN workers")
            ? { worker_id: "worker-a" }
            : sql.includes("FROM work_sessions") ? session : null,
          all: async () => ({ results: [] }),
          run: async () => ({ success: true, meta: { changes: 1 } }),
        };
        statements.push(statement);
        return statement;
      },
      batch: async () => [],
      statements,
    };
    return db;
  };

  it("requires an authenticated worker before starting research", async () => {
    const db = makeDb(null);
    const response = await worker.fetch(request(), { ASSETS: { fetch: vi.fn() }, DB: db as never });
    expect(response.status).toBe(401);
  });

  it("rejects a work session that does not belong to the worker", async () => {
    const db = authenticatedDb(null);
    const response = await worker.fetch(request(), { ASSETS: { fetch: vi.fn() }, DB: db as never });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "work_session_not_found" });
  });

  it("fails closed when Tavily is not configured for this environment", async () => {
    const db = authenticatedDb({ id: sessionId, trade: "plumbing" });
    const response = await worker.fetch(request(), {
      ASSETS: { fetch: vi.fn() },
      DB: db as never,
      TAVILY_API_KEY: "",
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "research_unavailable" });
  });

  it("rejects a trade mismatch for an owned work session", async () => {
    const db = authenticatedDb({ id: sessionId, trade: "electrical" });
    const response = await worker.fetch(request(), {
      ASSETS: { fetch: vi.fn() },
      DB: db as never,
      TAVILY_API_KEY: "test-only-key",
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "work_session_not_found" });
  });
});

describe("private evidence source API", () => {
  it("stores a new source as private and pending", async () => {
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


  it("rejects client attempts to set review, rights or sharing state", async () => {
    const db = makeDb({ worker_id: "worker-a" });
    const response = await worker.fetch(
      new Request("https://kivora.test/api/evidence-sources", {
        method: "POST",
        headers: {
          origin: "https://kivora.test",
          "content-type": "application/json",
          cookie: `__Host-kivora_session=${"d".repeat(64)}`,
        },
        body: JSON.stringify({
          trade: "plumbing",
          sourceType: "manufacturer_manual",
          publisher: "Acme",
          title: "Manual",
          topic: "tap cartridge",
          evidenceNote: "Private note.",
          visibility: "shared",
          review_status: "approved",
          rights_status: "public_domain",
        }),
      }),
      { ASSETS: { fetch: vi.fn() }, DB: db as never },
    );
    expect(response.status).toBe(400);
    expect(db.statements.some((statement) => statement.sql.includes("INSERT INTO evidence_sources"))).toBe(false);
  });


describe("KIVORA grounded assistant endpoint", () => {
  const sessionId = "123e4567-e89b-12d3-a456-426614174000";
  const workerId = "worker-a";
  const cookie = "__Host-kivora_session=" + "a".repeat(64);
  const makeAssistDb = (evidenceRows: Record<string, unknown>[] = []) => {
    const statements: { sql: string; values: unknown[] }[] = [];
    const db = {
      prepare: (sql: string) => {
        const statement = {
          sql,
          values: [] as unknown[],
          bind(...values: unknown[]) { this.values = values; return this; },
          first: async () => {
            if (sql.includes("JOIN workers")) return { worker_id: workerId };
            if (sql.includes("SELECT id, trade FROM work_sessions")) return { id: sessionId, trade: "plumbing" };
            return null;
          },
          all: async () => ({ results: sql.includes("FROM evidence_sources") ? evidenceRows : [] }),
          run: async () => ({ success: true, meta: { changes: 1 } }),
        };
        statements.push(statement);
        return statement;
      },
      batch: async (items: unknown[]) => items.map(() => ({ success: true, results: [], meta: { changes: 1 } })),
      statements,
    };
    return db;
  };

  it("stores a deterministic safety escalation without calling AI", async () => {
    const db = makeAssistDb();
    const run = vi.fn();
    const response = await worker.fetch(
      new Request("https://kivora.test/api/assist", {
        method: "POST",
        headers: { origin: "https://kivora.test", "content-type": "application/json", cookie },
        body: JSON.stringify({
          sessionId,
          trade: "plumbing",
          task: "I smell gas and suspect a gas leak.",
          language: "en",
          units: "metric",
        }),
      }),
      {
        ASSETS: { fetch: vi.fn() },
        DB: db as never,
        AI: { run },
        AI_ENABLED: "true",
        AI_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) },
      } as never,
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.response.status).toBe("escalate");
    expect(body.assessment.detectedHazards).toContain("gas-leak");
    expect(run).not.toHaveBeenCalled();
    expect(db.statements.some(statement => statement.sql.includes("INSERT INTO work_session_messages"))).toBe(true);
  });

  it("runs the free model only after approved evidence and context pass deterministic checks", async () => {
    const db = makeAssistDb([{
      id: "manual-k100",
      publisher: "Acme",
      title: "K-100 service manual",
      source_url: "https://example.com/manual",
      document_ref: "K100-MANUAL",
      product_make: "Acme",
      product_model: "K-100",
      trade: "plumbing",
      topic: "cartridge identification",
      revision_date: null,
      retrieved_at: 1794729600,
      jurisdiction: null,
      page_or_section: "4.2",
      evidence_note: "The cartridge assembly is shown in section 4.2. Use a 12 mm clearance tool.",
    }]);
    const run = vi.fn().mockResolvedValue({
      response: JSON.stringify({
        summary: "The reviewed K-100 manual contains a cartridge identification section.",
        blocks: [{
          kind: "explanation",
          content: "The cartridge assembly is shown in section 4.2.",
          evidenceIds: ["manual-k100"],
        }],
        followUpQuestions: [],
      }),
    });
    const limit = vi.fn().mockResolvedValue({ success: true });
    const response = await worker.fetch(
      new Request("https://kivora.test/api/assist", {
        method: "POST",
        headers: { origin: "https://kivora.test", "content-type": "application/json", cookie },
        body: JSON.stringify({
          sessionId,
          trade: "plumbing",
          task: "Identify the cartridge for my kitchen tap.",
          language: "en",
          units: "metric",
          jurisdiction: "Nigeria",
          involvesEquipment: true,
          equipmentMake: "Acme",
          equipmentModel: "K-100",
          knownFacts: ["This is a water supply tap and the water supply has been isolated."],
        }),
      }),
      {
        ASSETS: { fetch: vi.fn() },
        DB: db as never,
        AI: { run },
        AI_ENABLED: "true",
        AI_LIMITER: { limit },
      } as never,
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.assessment.decision).toBe("guided");
    expect(body.response.status).toBe("guided");
    expect(body.response.citations[0].id).toBe("manual-k100");
    expect(run).toHaveBeenCalledOnce();
    expect(run.mock.calls[0][0]).toBe("@cf/zai-org/glm-4.7-flash");
    expect(limit).toHaveBeenCalledWith({ key: workerId });
    expect(db.statements.some(statement => statement.sql.includes("INSERT INTO work_session_messages"))).toBe(true);
  });
});
