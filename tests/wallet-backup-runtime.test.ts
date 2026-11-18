import { describe, expect, it } from "vitest";
import worker from "../worker/src/runtime.js";

const tokenA = "a".repeat(64);
const tokenB = "b".repeat(64);
const workerA = "11111111-1111-4111-8111-111111111111";
const workerB = "22222222-2222-4222-8222-222222222222";
const backup = {
  formatVersion: 1,
  network: "bitcoin-testnet",
  kdf: "PBKDF2-SHA-256",
  iterations: 600_000,
  salt: btoa("1234567890123456"),
  cipher: "AES-256-GCM",
  iv: btoa("123456789012"),
  ciphertext: btoa("12345678901234567"),
};

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createEnvironment(verifiedWorkers: string[] = [workerA, workerB]) {
  const sessions = new Map<string, string>();
  const accounts = new Set(verifiedWorkers);
  const records = new Map<string, Record<string, unknown>>();

  const DB = {
    prepare(sql: string) {
      let values: unknown[] = [];
      return {
        bind(...next: unknown[]) {
          values = next;
          return this;
        },
        async first() {
          if (sql.includes("FROM worker_sessions s")) { const owner = sessions.get(String(values[0])); return owner ? { worker_id: owner } : null; }
          if (sql.includes("FROM worker_accounts")) return accounts.has(String(values[0])) ? { verified: 1 } : null;
          if (sql.includes("SELECT format_version") && sql.includes("account_wallet_backups")) return records.get(String(values[0])) ?? null;
          if (sql.includes("SELECT 1 AS present FROM account_wallet_backups")) return records.has(String(values[0])) ? { present: 1 } : null;
          return null;
        },
        async run() {
          if (sql.startsWith("INSERT INTO account_wallet_backups")) {
            const owner = String(values[0]);
            if (records.has(owner)) throw new Error("UNIQUE constraint failed");
            records.set(owner, {
              format_version: 1, network: "bitcoin-testnet", kdf: "PBKDF2-SHA-256",
              kdf_iterations: values[1], salt_b64: values[2], cipher: "AES-256-GCM",
              iv_b64: values[3], ciphertext_b64: values[4], revision: 1,
              created_at: values[5], updated_at: values[6],
            });
            return { meta: { changes: 1 } };
          }
          if (sql.startsWith("UPDATE account_wallet_backups")) {
            const owner = String(values[5]);
            const expectedRevision = Number(values[6]);
            const current = records.get(owner);
            if (!current || current.revision !== expectedRevision) return { meta: { changes: 0 } };
            records.set(owner, {
              ...current, kdf_iterations: values[0], salt_b64: values[1],
              iv_b64: values[2], ciphertext_b64: values[3],
              revision: expectedRevision + 1, updated_at: values[4],
            });
            return { meta: { changes: 1 } };
          }
          if (sql.startsWith("DELETE FROM account_wallet_backups")) {
            const owner = String(values[0]);
            const current = records.get(owner);
            if (!current || current.revision !== Number(values[1])) return { meta: { changes: 0 } };
            records.delete(owner);
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        },
      };
    },
  };

  return { env: { DB } as never, sessions, records };
}

function request(method: string, token?: string, body?: unknown): Request {
  const headers = new Headers();
  if (token) headers.set("cookie", `__Host-kivora_session=${token}`);
  if (body !== undefined) {
    headers.set("content-type", "application/json");
    headers.set("origin", "https://kivora-preview.pages.dev");
  }
  return new Request("https://kivora-preview.pages.dev/api/wallet/backup", {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("account wallet backup Worker API", () => {
  it("requires an authenticated, verified account", async () => {
    const { env, sessions } = createEnvironment();
    sessions.set(await hashToken(tokenA), workerA);
    const anonymous = await worker.fetch(request("GET"), env);
    expect(anonymous.status).toBe(401);

    const { env: secondEnv, sessions: secondSessions } = createEnvironment([]);
    secondSessions.set(await hashToken(tokenA), workerA);
    const unverified = await worker.fetch(request("GET", tokenA), secondEnv);
    expect(unverified.status).toBe(401);
  });

  it("creates once, reads only the owner's encrypted envelope, and updates by revision", async () => {
    const { env, sessions, records } = createEnvironment();
    sessions.set(await hashToken(tokenA), workerA);
    sessions.set(await hashToken(tokenB), workerB);

    const created = await worker.fetch(request("PUT", tokenA, backup), env);
    expect(created.status).toBe(201);
    expect(await created.json()).toEqual({ saved: true, revision: 1 });

    const readA = await worker.fetch(request("GET", tokenA), env);
    const readBody = await readA.json() as { backup: { ciphertext: string; revision: number } };
    expect(readA.status).toBe(200);
    expect(readBody.backup.ciphertext).toBe(backup.ciphertext);
    expect(readBody.backup.revision).toBe(1);

    const readB = await worker.fetch(request("GET", tokenB), env);
    expect(await readB.json()).toEqual({ backup: null });

    const duplicate = await worker.fetch(request("PUT", tokenA, backup), env);
    expect(duplicate.status).toBe(409);

    const updated = await worker.fetch(request("PUT", tokenA, { ...backup, ciphertext: btoa("different ciphertext"), revision: 1 }), env);
    expect(updated.status).toBe(200);
    expect(await updated.json()).toEqual({ saved: true, revision: 2 });
    expect(records.get(workerA)?.revision).toBe(2);

    const stale = await worker.fetch(request("PUT", tokenA, { ...backup, revision: 1 }), env);
    expect(stale.status).toBe(409);
  });

  it("requires explicit revision-bound confirmation before deletion", async () => {
    const { env, sessions, records } = createEnvironment();
    sessions.set(await hashToken(tokenA), workerA);
    await worker.fetch(request("PUT", tokenA, backup), env);

    const rejected = await worker.fetch(request("DELETE", tokenA, { revision: 1 }), env);
    expect(rejected.status).toBe(400);
    expect(records.has(workerA)).toBe(true);

    const deleted = await worker.fetch(request("DELETE", tokenA, {
      confirmation: "DELETE_ENCRYPTED_BACKUP", revision: 1,
    }), env);
    expect(deleted.status).toBe(200);
    expect(records.has(workerA)).toBe(false);
  });

  it("rejects malformed encryption envelopes", async () => {
    const { env, sessions } = createEnvironment();
    sessions.set(await hashToken(tokenA), workerA);
    const response = await worker.fetch(request("PUT", tokenA, { ...backup, iterations: 1 }), env);
    expect(response.status).toBe(400);
  });
});
