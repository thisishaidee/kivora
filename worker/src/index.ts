import { languageSchema, tradeSchema, unitSystemSchema } from "../../shared/src/contracts";

interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  meta?: { changes?: number };
}
interface D1Statement {
  bind(...values: (string | number | null)[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}
interface D1Database {
  prepare(sql: string): D1Statement;
  batch<T = unknown>(statements: D1Statement[]): Promise<D1Result<T>[]>;
}
interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  DB?: D1Database;
}
interface AuthenticatedWorker { worker_id: string }
interface WorkSessionRow {
  id: string; title: string; trade: string; language: string; unit_system: string;
  created_at: number; updated_at: number; archived_at: number | null;
}
interface WorkMessageRow { id: string; role: string; content: string; created_at: number }

const SESSION_COOKIE = "__Host-kivora_session";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const MAX_JSON_BYTES = 24_000;
const MAX_TASK_CHARS = 20_000;

const json = (data: unknown, status = 200, headers: HeadersInit = {}): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      ...headers,
    },
  });

const randomToken = (): string => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};
const hashToken = async (token: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};
const cookieValue = (request: Request): string | null => {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  for (const part of cookie.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return rest.join("=") || null;
  }
  return null;
};
const cookieHeader = (token: string, secure: boolean): string =>
  `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}${secure ? "; Secure" : ""}`;
const clearCookieHeader = (secure: boolean): string =>
  `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`;
const newId = (): string => crypto.randomUUID();
const nowSeconds = (): number => Math.floor(Date.now() / 1000);

const readJson = async (request: Request): Promise<Record<string, unknown> | null> => {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return null;
  const length = Number(request.headers.get("content-length") || "0");
  if (length > MAX_JSON_BYTES) return null;
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  } catch { return null; }
};
const authenticate = async (request: Request, db: D1Database): Promise<AuthenticatedWorker | null> => {
  const token = cookieValue(request);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  return db.prepare(
    `SELECT s.worker_id FROM worker_sessions s
     JOIN workers w ON w.id = s.worker_id
     WHERE s.session_token_hash = ? AND s.revoked_at IS NULL
       AND s.expires_at > ? AND w.revoked_at IS NULL LIMIT 1`,
  ).bind(await hashToken(token), nowSeconds()).first<AuthenticatedWorker>();
};
const validOrigin = (request: Request, url: URL): boolean =>
  request.headers.get("origin") === url.origin;

const handleApi = async (request: Request, env: Env, url: URL): Promise<Response> => {
  const method = request.method;
  const path = url.pathname;
  const secure = url.protocol === "https:";

  if (path === "/api/health" && method === "GET") {
    return json({ service: "kivora-api", status: "ok", version: "0.3.0", storage: "d1" });
  }
  if (!env.DB) return json({ error: "service_unavailable" }, 503);
  if (method !== "GET" && !validOrigin(request, url)) return json({ error: "origin_not_allowed" }, 403);

  if (path === "/api/identity" && method === "POST") {
    const recoveryToken = randomToken();
    const sessionToken = randomToken();
    const workerId = newId();
    const now = nowSeconds();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO workers (id, recovery_token_hash, created_at, updated_at) VALUES (?, ?, ?, ?)")
        .bind(workerId, await hashToken(recoveryToken), now, now),
      env.DB.prepare("INSERT INTO worker_sessions (id, worker_id, session_token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)")
        .bind(newId(), workerId, await hashToken(sessionToken), now, now + SESSION_TTL_SECONDS),
    ]);
    return json({ worker: { id: workerId }, recovery_code: recoveryToken, recovery_code_displayed_once: true }, 201,
      { "set-cookie": cookieHeader(sessionToken, secure) });
  }

  if (path === "/api/identity/recover" && method === "POST") {
    const body = await readJson(request);
    const oldCode = typeof body?.recovery_code === "string" ? body.recovery_code.trim() : "";
    if (!/^[0-9a-f]{64}$/.test(oldCode)) return json({ error: "invalid_recovery_code" }, 400);
    const replacementCode = randomToken();
    const sessionToken = randomToken();
    const now = nowSeconds();
    const newHash = await hashToken(replacementCode);
    const sessionHash = await hashToken(sessionToken);
    const results = await env.DB.batch([
      env.DB.prepare("UPDATE workers SET recovery_token_hash = ?, updated_at = ? WHERE recovery_token_hash = ? AND revoked_at IS NULL RETURNING id")
        .bind(newHash, now, await hashToken(oldCode)),
      env.DB.prepare("DELETE FROM worker_sessions WHERE worker_id = (SELECT id FROM workers WHERE recovery_token_hash = ?)")
        .bind(newHash),
      env.DB.prepare("INSERT INTO worker_sessions (id, worker_id, session_token_hash, created_at, expires_at) SELECT ?, id, ?, ?, ? FROM workers WHERE recovery_token_hash = ? AND revoked_at IS NULL")
        .bind(newId(), sessionHash, now, now + SESSION_TTL_SECONDS, newHash),
    ]);
    const worker = results[0]?.results?.[0] as { id?: string } | undefined;
    if (!worker?.id || (results[2]?.meta?.changes ?? 0) !== 1) return json({ error: "invalid_recovery_code" }, 401);
    return json({ worker: { id: worker.id }, recovery_code: replacementCode, recovery_code_displayed_once: true }, 200,
      { "set-cookie": cookieHeader(sessionToken, secure) });
  }

  if (path === "/api/identity" && method === "GET") {
    const worker = await authenticate(request, env.DB);
    if (!worker) return json({ error: "unauthorized" }, 401);
    return json({ worker: { id: worker.worker_id } });
  }

  if (path === "/api/identity/recovery/rotate" && method === "POST") {
    const worker = await authenticate(request, env.DB);
    if (!worker) return json({ error: "unauthorized" }, 401);
    const recoveryCode = randomToken();
    const result = await env.DB.prepare("UPDATE workers SET recovery_token_hash = ?, updated_at = ? WHERE id = ? AND revoked_at IS NULL")
      .bind(await hashToken(recoveryCode), nowSeconds(), worker.worker_id).run();
    if ((result.meta?.changes ?? 0) !== 1) return json({ error: "unauthorized" }, 401);
    return json({ recovery_code: recoveryCode, recovery_code_displayed_once: true });
  }

  if (path === "/api/identity" && method === "DELETE") {
    const worker = await authenticate(request, env.DB);
    if (!worker) return json({ error: "unauthorized" }, 401);
    const now = nowSeconds();
    await env.DB.batch([
      env.DB.prepare("DELETE FROM work_session_messages WHERE worker_id = ?").bind(worker.worker_id),
      env.DB.prepare("DELETE FROM work_sessions WHERE worker_id = ?").bind(worker.worker_id),
      env.DB.prepare("DELETE FROM worker_sessions WHERE worker_id = ?").bind(worker.worker_id),
      env.DB.prepare("UPDATE workers SET revoked_at = ?, updated_at = ? WHERE id = ?").bind(now, now, worker.worker_id),
    ]);
    return json({ deleted: true }, 200, { "set-cookie": clearCookieHeader(secure) });
  }

  const worker = await authenticate(request, env.DB);
  if (!worker) return json({ error: "unauthorized" }, 401);

  if (path === "/api/work-sessions" && method === "GET") {
    const result = await env.DB.prepare("SELECT id, title, trade, language, unit_system, created_at, updated_at, archived_at FROM work_sessions WHERE worker_id = ? ORDER BY updated_at DESC LIMIT 100")
      .bind(worker.worker_id).all<WorkSessionRow>();
    return json({ sessions: result.results ?? [] });
  }

  if (path === "/api/work-sessions" && method === "POST") {
    const body = await readJson(request);
    const trade = tradeSchema.safeParse(body?.trade);
    const language = languageSchema.safeParse(body?.language);
    const units = unitSystemSchema.safeParse(body?.units);
    const task = typeof body?.task === "string" ? body.task.trim() : "";
    if (!trade.success || !language.success || !units.success || !task || task.length > MAX_TASK_CHARS)
      return json({ error: "invalid_work_session" }, 400);
    const id = newId();
    const now = nowSeconds();
    const title = task.replace(/\s+/g, " ").slice(0, 72) || "Untitled work session";
    await env.DB.batch([
      env.DB.prepare("INSERT INTO work_sessions (id, worker_id, title, trade, language, unit_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(id, worker.worker_id, title, trade.data, language.data, units.data, now, now),
      env.DB.prepare("INSERT INTO work_session_messages (id, work_session_id, worker_id, role, content, created_at) VALUES (?, ?, ?, 'worker', ?, ?)")
        .bind(newId(), id, worker.worker_id, task, now),
    ]);
    return json({ session: { id, title, trade: trade.data, language: language.data, unit_system: units.data, created_at: now, updated_at: now, archived_at: null } }, 201);
  }

  const match = path.match(/^\/api\/work-sessions\/([0-9a-f-]{36})$/i);
  if (match) {
    const sessionId = match[1];
    if (method === "GET") {
      const session = await env.DB.prepare("SELECT id, title, trade, language, unit_system, created_at, updated_at, archived_at FROM work_sessions WHERE id = ? AND worker_id = ? LIMIT 1")
        .bind(sessionId, worker.worker_id).first<WorkSessionRow>();
      if (!session) return json({ error: "not_found" }, 404);
      const messages = await env.DB.prepare("SELECT id, role, content, created_at FROM work_session_messages WHERE work_session_id = ? AND worker_id = ? ORDER BY created_at ASC LIMIT 200")
        .bind(sessionId, worker.worker_id).all<WorkMessageRow>();
      return json({ session, messages: messages.results ?? [] });
    }
    if (method === "PATCH") {
      const body = await readJson(request);
      if (body?.archived !== true && body?.archived !== false) return json({ error: "invalid_request" }, 400);
      const now = nowSeconds();
      const result = await env.DB.prepare("UPDATE work_sessions SET archived_at = ?, updated_at = ? WHERE id = ? AND worker_id = ?")
        .bind(body.archived ? now : null, now, sessionId, worker.worker_id).run();
      if ((result.meta?.changes ?? 0) !== 1) return json({ error: "not_found" }, 404);
      return json({ updated: true });
    }
    if (method === "DELETE") {
      await env.DB.batch([
        env.DB.prepare("DELETE FROM work_session_messages WHERE work_session_id = ? AND worker_id = ?").bind(sessionId, worker.worker_id),
        env.DB.prepare("DELETE FROM work_sessions WHERE id = ? AND worker_id = ?").bind(sessionId, worker.worker_id),
      ]);
      return json({ deleted: true });
    }
  }
  return json({ error: "not_found" }, 404);
};

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try { return await handleApi(request, env, url); }
      catch { return json({ error: "internal_error" }, 500); }
    }
    return env.ASSETS.fetch(request);
  },
};
export default worker;
