import { describe, expect, it } from "vitest";
import worker from "../worker/src/index";

const sessionId = "123e4567-e89b-12d3-a456-426614174000";
const cookie = "__Host-kivora_session=" + "a".repeat(64);

function makeDb(ownsSession: boolean) {
  const statements: { sql: string; values: unknown[] }[] = [];
  const batches: { sql: string; values: unknown[] }[][] = [];
  const db = {
    prepare(sql: string) {
      const statement = {
        sql,
        values: [] as unknown[],
        bind(...values: unknown[]) { this.values = values; return this; },
        first: async () => {
          if (sql.includes("JOIN workers")) return { worker_id: "worker-a" };
          if (sql.includes("SELECT id FROM work_sessions")) return ownsSession ? { id: sessionId } : null;
          return null;
        },
        all: async () => ({ results: [] }),
        run: async () => ({ success: true, meta: { changes: 1 } }),
      };
      statements.push(statement);
      return statement;
    },
    batch: async (items: { sql: string; values: unknown[] }[]) => {
      batches.push(items);
      return items.map(() => ({ success: true, results: [], meta: { changes: 1 } }));
    },
    statements,
    batches,
  };
  return db;
}

describe("private work-session messages", () => {
  it("stores a worker observation only in the authenticated owner's session", async () => {
    const db = makeDb(true);
    const response = await worker.fetch(
      new Request("https://kivora.test/api/work-sessions/" + sessionId + "/messages", {
        method: "POST",
        headers: {
          origin: "https://kivora.test",
          "content-type": "application/json",
          cookie,
        },
        body: JSON.stringify({ content: "WORKER OBSERVATION — NOT INDEPENDENTLY VERIFIED\nOutcome: The issue appears resolved" }),
      }),
      { ASSETS: { fetch: async () => new Response(null, { status: 404 }) }, DB: db as never },
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ saved: true });
    expect(db.batches).toHaveLength(1);
    expect(db.batches[0][0].sql).toContain("INSERT INTO work_session_messages");
    expect(db.batches[0][0].values).toContain("worker-a");
    expect(db.batches[0][0].values).toContain("WORKER OBSERVATION — NOT INDEPENDENTLY VERIFIED\nOutcome: The issue appears resolved");
  });

  it("does not write a message when the session is not owned by the worker", async () => {
    const db = makeDb(false);
    const response = await worker.fetch(
      new Request("https://kivora.test/api/work-sessions/" + sessionId + "/messages", {
        method: "POST",
        headers: {
          origin: "https://kivora.test",
          "content-type": "application/json",
          cookie,
        },
        body: JSON.stringify({ content: "Private observation" }),
      }),
      { ASSETS: { fetch: async () => new Response(null, { status: 404 }) }, DB: db as never },
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
    expect(db.batches).toHaveLength(0);
  });
});
