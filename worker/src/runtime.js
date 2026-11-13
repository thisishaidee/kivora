/** @typedef {{ results?: Record<string, unknown>[], success?: boolean, meta?: { changes?: number } }} D1Result */
/** @typedef {{
 * bind(...values: unknown[]): D1Statement,
 * first(): Promise<Record<string, unknown> | null>,
 * all(): Promise<D1Result>,
 * run(): Promise<D1Result>
 * }} D1Statement
 */
/** @typedef {{ prepare(sql: string): D1Statement, batch(statements: D1Statement[]): Promise<D1Result[]> }} D1Database */
/** @typedef {{ limit(options: { key: string }): Promise<{ success: boolean }> }} RateLimiter */
/** @typedef {{ ASSETS?: { fetch(request: Request): Promise<Response> }, DB?: D1Database, IDENTITY_LIMITER?: RateLimiter, WORKER_LIMITER?: RateLimiter }} Env */

import { assessWorkRequest, parseWorkRequest } from "../../shared/src/intelligence-runtime.js";
import { parsePrivateEvidenceCapture } from "../../shared/src/evidence-runtime.js";

const SESSION_COOKIE = "__Host-kivora_session";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const MAX_JSON_BYTES = 24_000;
const MAX_TASK_CHARS = 20_000;
const TRADES = new Set(["carpentry", "electrical", "plumbing", "hvac", "mechanical", "construction", "multiple", "unsure"]);
const LANGUAGES = new Set(["en", "en-ng", "pcm-ng", "fr"]);
const UNITS = new Set(["metric", "imperial"]);

/** @param {unknown} data @param {number} [status] @param {HeadersInit} [headers] */
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-frame-options": "DENY",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    ...headers,
  },
});

const randomToken = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

/** @param {string} token */
const hashToken = async (token) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

/** @param {Request} request */
const cookieValue = (request) => {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  for (const part of cookie.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return rest.join("=") || null;
  }
  return null;
};

/** @param {string} token */
const cookieHeader = (token) =>
  `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}`;

const clearCookieHeader = () =>
  `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

const newId = () => crypto.randomUUID();
const nowSeconds = () => Math.floor(Date.now() / 1000);

/** @param {Request} request @returns {Promise<Record<string, unknown> | null>} */
const readJson = async (request) => {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return null;
  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (declaredLength > MAX_JSON_BYTES || !request.body) return null;
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_JSON_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const value = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return /** @type {Record<string, unknown>} */ (value);
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
};

/** @param {Request} request @param {D1Database} db @returns {Promise<Record<string, unknown> | null>} */
const authenticate = async (request, db) => {
  const token = cookieValue(request);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  return db.prepare(
    `SELECT s.worker_id FROM worker_sessions s
     JOIN workers w ON w.id = s.worker_id
     WHERE s.session_token_hash = ? AND s.revoked_at IS NULL
       AND s.expires_at > ? AND w.revoked_at IS NULL LIMIT 1`,
  ).bind(await hashToken(token), nowSeconds()).first();
};

/** @param {Request} request @param {URL} url */
const validOrigin = (request, url) => request.headers.get("origin") === url.origin;

/** @param {Request} request @param {Env} env @param {URL} url */
const handleApi = async (request, env, url) => {
  const method = request.method;
  const path = url.pathname;

  if (path === "/api/health" && method === "GET") {
    if (!env.DB) return json({ error: "service_unavailable" }, 503);
    const check = await env.DB.prepare("SELECT 1 AS ok").first();
    if (check?.ok !== 1) return json({ error: "storage_unavailable" }, 503);
    return json({ service: "kivora-api", status: "ok", version: "0.3.0", storage: "d1" });
  }

  if (!env.DB) return json({ error: "service_unavailable" }, 503);
  if (method !== "GET" && !validOrigin(request, url)) return json({ error: "origin_not_allowed" }, 403);

  if ((path === "/api/identity" || path === "/api/identity/recover") && method === "POST" && env.IDENTITY_LIMITER) {
    const clientKey = request.headers.get("cf-connecting-ip") || "unknown-client";
    const limit = await env.IDENTITY_LIMITER.limit({ key: clientKey });
    if (!limit.success) return json({ error: "rate_limited", retry_after_seconds: 60 }, 429);
  }

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
    return json(
      { worker: { id: workerId }, recovery_code: recoveryToken, recovery_code_displayed_once: true },
      201,
      { "set-cookie": cookieHeader(sessionToken) },
    );
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
    const worker = results[0]?.results?.[0];
    if (!worker?.id || (results[2]?.meta?.changes ?? 0) !== 1) return json({ error: "invalid_recovery_code" }, 401);
    return json(
      { worker: { id: worker.id }, recovery_code: replacementCode, recovery_code_displayed_once: true },
      200,
      { "set-cookie": cookieHeader(sessionToken) },
    );
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
    const result = await env.DB.prepare(
      "UPDATE workers SET recovery_token_hash = ?, updated_at = ? WHERE id = ? AND revoked_at IS NULL",
    ).bind(await hashToken(recoveryCode), nowSeconds(), worker.worker_id).run();
    if ((result.meta?.changes ?? 0) !== 1) return json({ error: "unauthorized" }, 401);
    return json({ recovery_code: recoveryCode, recovery_code_displayed_once: true });
  }

  if (path === "/api/identity/logout" && method === "POST") {
    const worker = await authenticate(request, env.DB);
    const token = cookieValue(request);
    if (!worker || !token) return json({ error: "unauthorized" }, 401);
    await env.DB.prepare("UPDATE worker_sessions SET revoked_at = ? WHERE worker_id = ? AND session_token_hash = ? AND revoked_at IS NULL")
      .bind(nowSeconds(), worker.worker_id, await hashToken(token)).run();
    return json({ logged_out: true }, 200, { "set-cookie": clearCookieHeader() });
  }

  if (path === "/api/identity" && method === "DELETE") {
    const worker = await authenticate(request, env.DB);
    if (!worker) return json({ error: "unauthorized" }, 401);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM work_session_messages WHERE worker_id = ?").bind(worker.worker_id),
      env.DB.prepare("DELETE FROM work_sessions WHERE worker_id = ?").bind(worker.worker_id),
      env.DB.prepare("DELETE FROM worker_sessions WHERE worker_id = ?").bind(worker.worker_id),
      env.DB.prepare("DELETE FROM workers WHERE id = ?").bind(worker.worker_id),
    ]);
    return json({ deleted: true }, 200, { "set-cookie": clearCookieHeader() });
  }

  const worker = await authenticate(request, env.DB);
  if (!worker) return json({ error: "unauthorized" }, 401);
  if (env.WORKER_LIMITER) {
    const limit = await env.WORKER_LIMITER.limit({ key: String(worker.worker_id) });
    if (!limit.success) return json({ error: "rate_limited", retry_after_seconds: 60 }, 429);
  }

  if (path === "/api/assess" && method === "POST") {
    const body = await readJson(request);
    if (!body) return json({ error: "invalid_assessment_request" }, 400);
    try {
      // Browser-supplied evidence is ignored. Only approved shared records
      // from the server-side registry may support an assessment.
      const request = parseWorkRequest(body);
      const evidenceResult = await env.DB.prepare(
        `SELECT id, publisher, title, source_url, document_ref, product_make,
          product_model, trade, topic, revision_date, retrieved_at,
          jurisdiction, page_or_section, evidence_note
         FROM evidence_sources
         WHERE visibility = 'shared' AND review_status = 'approved'
           AND rights_status IN ('public_domain', 'open_license', 'permission')
           AND reviewer_role IN ('qualified_reviewer', 'manufacturer')
           AND trade = ?
           AND (jurisdiction IS NULL OR jurisdiction = ? COLLATE NOCASE)
           AND (product_make IS NULL OR product_make = ? COLLATE NOCASE)
           AND (product_model IS NULL OR product_model = ? COLLATE NOCASE)
         ORDER BY updated_at DESC LIMIT 100`,
      ).bind(
        request.trade,
        request.jurisdiction ?? "",
        request.involvesEquipment ? request.equipmentMake ?? "" : "",
        request.involvesEquipment ? request.equipmentModel ?? "" : "",
      ).all();
      const evidence = (evidenceResult.results ?? []).map((source) => ({
        id: String(source.id),
        publisher: String(source.publisher),
        title: String(source.title),
        ...(source.source_url ? { url: String(source.source_url) } : {}),
        ...(source.document_ref ? { documentId: String(source.document_ref) } : {}),
        productModels: source.product_model ? [String(source.product_model)] : [],
        ...(source.product_make ? { productMake: String(source.product_make) } : {}),
        ...(source.jurisdiction ? { jurisdiction: String(source.jurisdiction) } : {}),
        trade: String(source.trade),
        topic: String(source.topic),
        ...(typeof source.revision_date === "string" && /^\\d{4}-\\d{2}-\\d{2}$/.test(source.revision_date)
          ? { revisionDate: source.revision_date } : {}),
        retrievedAt: new Date(Number(source.retrieved_at) * 1000).toISOString(),
        ...(source.page_or_section ? { pageOrSection: String(source.page_or_section) } : {}),
        excerpt: String(source.evidence_note),
        reviewed: true,
      }));
      const assessment = assessWorkRequest(request, evidence);
      return json({ assessment });
    } catch {
      return json({ error: "invalid_assessment_request" }, 400);
    }
  }

  if (path === "/api/evidence-sources" && method === "GET") {
    const result = await env.DB.prepare(
      `SELECT id, trade, source_type, publisher, title, source_url, document_ref,
        source_version, revision_date, retrieved_at, jurisdiction, language,
        product_make, product_model, topic, page_or_section, evidence_note,
        rights_status, review_status, created_at, updated_at
       FROM evidence_sources WHERE visibility = 'private' AND owner_worker_id = ?
       ORDER BY updated_at DESC LIMIT 100`,
    ).bind(worker.worker_id).all();
    return json({ sources: result.results ?? [] });
  }

  if (path === "/api/evidence-sources" && method === "POST") {
    const body = await readJson(request);
    const parsed = parsePrivateEvidenceCapture(body);
    if (!parsed.success) return json({ error: "invalid_evidence_source" }, 400);
    const source = parsed.data;
    const id = newId();
    const now = nowSeconds();
    await env.DB.prepare(
      `INSERT INTO evidence_sources (
        id, visibility, owner_worker_id, trade, source_type, publisher, title,
        source_url, document_ref, source_version, revision_date, retrieved_at,
        jurisdiction, language, product_make, product_model, topic,
        page_or_section, evidence_note, rights_status, source_sha256,
        review_status, created_at, updated_at
      ) VALUES (?, 'private', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        'user_provided_private', ?, 'pending', ?, ?)`,
    ).bind(
      id, worker.worker_id, source.trade, source.sourceType, source.publisher,
      source.title, source.sourceUrl ?? null, source.documentRef ?? null,
      source.sourceVersion ?? null, source.revisionDate ?? null, now,
      source.jurisdiction ?? null, source.language, source.productMake ?? null,
      source.productModel ?? null, source.topic, source.pageOrSection ?? null,
      source.evidenceNote, source.sourceSha256 ?? null, now, now,
    ).run();
    return json({
      source: {
        id, trade: source.trade, source_type: source.sourceType,
        publisher: source.publisher, title: source.title, topic: source.topic,
        rights_status: "user_provided_private", review_status: "pending",
        created_at: now,
      },
      eligible_for_guidance: false,
    }, 201);
  }

  if (path === "/api/work-sessions" && method === "GET") {
    const result = await env.DB.prepare(
      "SELECT id, title, trade, language, unit_system, created_at, updated_at, archived_at FROM work_sessions WHERE worker_id = ? ORDER BY updated_at DESC LIMIT 100",
    ).bind(worker.worker_id).all();
    return json({ sessions: result.results ?? [] });
  }

  if (path === "/api/work-sessions" && method === "POST") {
    const body = await readJson(request);
    const trade = typeof body?.trade === "string" ? body.trade : "";
    const language = typeof body?.language === "string" ? body.language : "";
    const units = typeof body?.units === "string" ? body.units : "";
    const task = typeof body?.task === "string" ? body.task.trim() : "";
    if (!TRADES.has(trade) || !LANGUAGES.has(language) || !UNITS.has(units) || !task || task.length > MAX_TASK_CHARS) {
      return json({ error: "invalid_work_session" }, 400);
    }
    const id = newId();
    const now = nowSeconds();
    const title = task.replace(/\s+/g, " ").slice(0, 72) || "Untitled work session";
    await env.DB.batch([
      env.DB.prepare("INSERT INTO work_sessions (id, worker_id, title, trade, language, unit_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(id, worker.worker_id, title, trade, language, units, now, now),
      env.DB.prepare("INSERT INTO work_session_messages (id, work_session_id, worker_id, role, content, created_at) VALUES (?, ?, ?, 'worker', ?, ?)")
        .bind(newId(), id, worker.worker_id, task, now),
    ]);
    return json({
      session: { id, title, trade, language, unit_system: units, created_at: now, updated_at: now, archived_at: null },
    }, 201);
  }

  const match = path.match(/^\/api\/work-sessions\/([0-9a-f-]{36})(?:\/messages)?$/i);
  if (match) {
    const sessionId = match[1];
    if (path.endsWith("/messages") && method === "POST") {
      const body = await readJson(request);
      const content = typeof body?.content === "string" ? body.content.trim() : "";
      if (!content || content.length > MAX_TASK_CHARS) return json({ error: "invalid_message" }, 400);
      const owned = await env.DB.prepare("SELECT id FROM work_sessions WHERE id = ? AND worker_id = ? LIMIT 1")
        .bind(sessionId, worker.worker_id).first();
      if (!owned) return json({ error: "not_found" }, 404);
      const now = nowSeconds();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO work_session_messages (id, work_session_id, worker_id, role, content, created_at) VALUES (?, ?, ?, 'worker', ?, ?)")
          .bind(newId(), sessionId, worker.worker_id, content, now),
        env.DB.prepare("UPDATE work_sessions SET updated_at = ? WHERE id = ? AND worker_id = ?")
          .bind(now, sessionId, worker.worker_id),
      ]);
      return json({ saved: true }, 201);
    }

    if (method === "GET") {
      const session = await env.DB.prepare(
        "SELECT id, title, trade, language, unit_system, created_at, updated_at, archived_at FROM work_sessions WHERE id = ? AND worker_id = ? LIMIT 1",
      ).bind(sessionId, worker.worker_id).first();
      if (!session) return json({ error: "not_found" }, 404);
      const messages = await env.DB.prepare(
        "SELECT id, role, content, created_at FROM work_session_messages WHERE work_session_id = ? AND worker_id = ? ORDER BY created_at ASC LIMIT 200",
      ).bind(sessionId, worker.worker_id).all();
      return json({ session, messages: messages.results ?? [] });
    }

    if (method === "PATCH") {
      const body = await readJson(request);
      if (body?.archived !== true && body?.archived !== false) return json({ error: "invalid_request" }, 400);
      const now = nowSeconds();
      const result = await env.DB.prepare(
        "UPDATE work_sessions SET archived_at = ?, updated_at = ? WHERE id = ? AND worker_id = ?",
      ).bind(body.archived ? now : null, now, sessionId, worker.worker_id).run();
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
  /** @param {Request} request @param {Env} env */
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env, url);
      } catch (error) {
        console.error(JSON.stringify({
          message: "KIVORA request failed",
          path: url.pathname.startsWith("/api/work-sessions/") ? "/api/work-sessions/:id" : url.pathname,
          error_type: error instanceof Error ? error.name : "unknown",
        }));
        return json({ error: "internal_error" }, 500);
      }
    }
    return env.ASSETS ? env.ASSETS.fetch(request) : json({ error: "not_found" }, 404);
  },
};

export default worker;
