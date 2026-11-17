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
/** @typedef {{ put(key: string, value: ReadableStream<Uint8Array>, options?: Record<string, unknown>): Promise<unknown>, get(key: string): Promise<{ body: ReadableStream<Uint8Array>, httpMetadata?: { contentType?: string } } | null>, delete(keys: string | string[]): Promise<void> }} R2Bucket */
/** @typedef {{ ASSETS?: { fetch(request: Request): Promise<Response> }, DB?: D1Database, MEDIA_BUCKET?: R2Bucket, MEDIA_UPLOAD_ENABLED?: string, IDENTITY_LIMITER?: RateLimiter, WORKER_LIMITER?: RateLimiter, AI_LIMITER?: RateLimiter, AI_ENABLED?: string, AI?: { run(model: string, input: Record<string, unknown>): Promise<unknown> } }} Env */

import { assessWorkRequest, parseWorkRequest } from "../../shared/src/intelligence-runtime.js";
import { parsePrivateEvidenceCapture } from "../../shared/src/evidence-runtime.js";
import { composeWorkerAssistantResponse } from "../../shared/src/response-runtime.js";


const IMAGE_MIME_LIMITS = new Map([
  ["image/jpeg", 10 * 1024 * 1024],
  ["image/png", 10 * 1024 * 1024],
  ["image/webp", 10 * 1024 * 1024],
  ["image/avif", 10 * 1024 * 1024],
]);
const VIDEO_MIME_LIMITS = new Map([
  ["video/mp4", 50 * 1024 * 1024],
  ["video/webm", 50 * 1024 * 1024],
  ["video/quicktime", 50 * 1024 * 1024],
]);
const MEDIA_UPLOAD_TTL_SECONDS = 10 * 60;

/** @param {string} mimeType @param {Uint8Array} bytes */
const mediaSignatureMatches = (mimeType, bytes) => {
  const ascii = (start, end) => String.fromCharCode(...bytes.slice(start, end));
  if (mimeType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v);
  if (mimeType === "image/webp") return bytes.length >= 12 && ascii(0,4) === "RIFF" && ascii(8,12) === "WEBP";
  if (mimeType === "image/avif") return bytes.length >= 12 && ascii(4,8) === "ftyp" && ["avif","avis"].includes(ascii(8,12));
  if (mimeType === "video/mp4") return bytes.length >= 12 && ascii(4,8) === "ftyp";
  if (mimeType === "video/quicktime") return bytes.length >= 12 && ascii(4,8) === "ftyp" && ascii(8,10) === "qt";
  if (mimeType === "video/webm") return bytes.length >= 4 && [0x1a,0x45,0xdf,0xa3].every((v,i) => bytes[i] === v);
  return false;
};

/** @param {D1Database} db @param {R2Bucket | undefined} bucket @param {string} workerId @param {string} [sessionId] */
const purgeOwnedMediaObjects = async (db, bucket, workerId, sessionId, mediaEnabled) => {
  if (!bucket) return !mediaEnabled;
  const mediaQuery = sessionId
    ? "SELECT object_key FROM conversation_media WHERE owner_worker_id = ? AND work_session_id = ?"
    : "SELECT object_key FROM conversation_media WHERE owner_worker_id = ?";
  const derivativeQuery = sessionId
    ? "SELECT d.object_key FROM conversation_media_derivatives d JOIN conversation_media m ON m.id = d.media_id WHERE m.owner_worker_id = ? AND m.work_session_id = ?"
    : "SELECT d.object_key FROM conversation_media_derivatives d JOIN conversation_media m ON m.id = d.media_id WHERE m.owner_worker_id = ?";
  const values = sessionId ? [workerId, sessionId] : [workerId];
  const [media, derivatives] = await Promise.all([
    db.prepare(mediaQuery).bind(...values).all(),
    db.prepare(derivativeQuery).bind(...values).all(),
  ]);
  const keys = [
    ...(media.results ?? []).map(row => String(row.object_key)),
    ...(derivatives.results ?? []).map(row => String(row.object_key)),
  ].filter(Boolean);
  if (keys.length) await bucket.delete(keys);
  return true;
};

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
    const mediaPurged = await purgeOwnedMediaObjects(env.DB, env.MEDIA_BUCKET, String(worker.worker_id), undefined, env.MEDIA_UPLOAD_ENABLED === "true");
    if (!mediaPurged) return json({ error: "media_storage_unavailable" }, 503);
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

  if (path === "/api/assist" && method === "POST") {
    const body = await readJson(request);
    if (!body) return json({ error: "invalid_assist_request" }, 400);
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return json({ error: "invalid_assist_request" }, 400);
    const session = await env.DB.prepare(
      "SELECT id, trade FROM work_sessions WHERE id = ? AND worker_id = ? LIMIT 1",
    ).bind(sessionId, worker.worker_id).first();
    if (!session || session.trade !== body.trade) return json({ error: "work_session_not_found" }, 404);

    try {
      const request = parseWorkRequest(body);
      request.language = typeof body.language === "string" && LANGUAGES.has(body.language) ? body.language : "en";
      request.units = typeof body.units === "string" && UNITS.has(body.units) ? body.units : "metric";
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
      const evidence = (evidenceResult.results ?? []).map(source => ({
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
        ...(typeof source.revision_date === "string" && /^\\d{4}-\\d{2}-\\d{2}$/.test(source.revision_date) ? { revisionDate: source.revision_date } : {}),
        retrievedAt: new Date(Number(source.retrieved_at) * 1000).toISOString(),
        ...(source.page_or_section ? { pageOrSection: String(source.page_or_section) } : {}),
        excerpt: String(source.evidence_note),
        reviewed: true,
      }));
      const assessment = assessWorkRequest(request, evidence);
      let ai = null;
      if (assessment.decision === "guided" && env.AI_ENABLED === "true" && env.AI && env.AI_LIMITER) {
        const aiLimit = await env.AI_LIMITER.limit({ key: String(worker.worker_id) });
        if (aiLimit.success) ai = env.AI;
      }
      const response = await composeWorkerAssistantResponse({ request, assessment, ai });
      const messageText = [
        response.summary,
        ...response.blocks.map(block => block.content),
        ...response.questions,
        ...response.citations.map(source => "Source: " + source.publisher + " — " + source.title + (source.pageOrSection ? " (" + source.pageOrSection + ")" : "")),
      ].join("\\n\\n").slice(0, 18000);
      const now = nowSeconds();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO work_session_messages (id, work_session_id, worker_id, role, content, created_at) VALUES (?, ?, ?, 'assistant', ?, ?)")
          .bind(newId(), sessionId, worker.worker_id, messageText, now),
        env.DB.prepare("UPDATE work_sessions SET updated_at = ? WHERE id = ? AND worker_id = ?")
          .bind(now, sessionId, worker.worker_id),
      ]);
      return json({ assessment, response });
    } catch {
      return json({ error: "assist_unavailable" }, 503);
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


  if (path === "/api/media/uploads" && method === "POST") {
    if (env.MEDIA_UPLOAD_ENABLED !== "true" || !env.MEDIA_BUCKET) {
      return json({ error: "media_upload_unavailable" }, 503);
    }
    const body = await readJson(request);
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
    const mediaKind = body?.mediaKind === "image" || body?.mediaKind === "video" ? body.mediaKind : "";
    const mimeType = typeof body?.mimeType === "string" ? body.mimeType.toLowerCase() : "";
    const byteSize = Number(body?.byteSize);
    const caption = typeof body?.caption === "string" ? body.caption.trim() : "";
    const maxBytes = mediaKind === "image" ? IMAGE_MIME_LIMITS.get(mimeType) : VIDEO_MIME_LIMITS.get(mimeType);
    if (!/^[0-9a-f-]{36}$/i.test(sessionId) || !mediaKind || !maxBytes ||
        !Number.isSafeInteger(byteSize) || byteSize < 1 || byteSize > maxBytes || caption.length > 2000) {
      return json({ error: "invalid_media_upload" }, 400);
    }
    const ownedSession = await env.DB.prepare(
      "SELECT id FROM work_sessions WHERE id = ? AND worker_id = ? LIMIT 1",
    ).bind(sessionId, worker.worker_id).first();
    if (!ownedSession) return json({ error: "work_session_not_found" }, 404);
    const quota = await env.DB.prepare(
      "SELECT COALESCE(SUM(byte_size), 0) AS used_bytes FROM conversation_media WHERE owner_worker_id = ? AND status IN ('intent', 'uploaded', 'validating', 'ready', 'processing') AND (status != 'intent' OR upload_expires_at > ?)",
    ).bind(worker.worker_id, nowSeconds()).first();
    const sessionCount = await env.DB.prepare(
      "SELECT COUNT(*) AS media_count FROM conversation_media WHERE owner_worker_id = ? AND work_session_id = ? AND status != 'deleted' AND (status != 'intent' OR upload_expires_at > ?)",
    ).bind(worker.worker_id, sessionId, nowSeconds()).first();
    if (Number(quota?.used_bytes ?? 0) + byteSize > 100 * 1024 * 1024) {
      return json({ error: "worker_media_quota_exceeded" }, 413);
    }
    if (Number(sessionCount?.media_count ?? 0) >= 10) {
      return json({ error: "conversation_media_limit_exceeded" }, 413);
    }
    const id = newId();
    const now = nowSeconds();
    const objectKey = "private/" + worker.worker_id + "/" + sessionId + "/" + id;
    await env.DB.prepare(
      "INSERT INTO conversation_media (id, work_session_id, owner_worker_id, object_key, media_kind, mime_type, byte_size, caption, status, created_at, updated_at, upload_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'intent', ?, ?, ?)",
    ).bind(id, sessionId, worker.worker_id, objectKey, mediaKind, mimeType,
      byteSize, caption || null, now, now, now + MEDIA_UPLOAD_TTL_SECONDS).run();
    return json({
      media: { id, mediaKind, mimeType, byteSize, status: "intent", uploadExpiresAt: now + MEDIA_UPLOAD_TTL_SECONDS },
      uploadPath: "/api/media/" + id + "/content",
    }, 201);
  }

  const mediaContentMatch = path.match(/^\/api\/media\/([0-9a-f-]{36})\/content$/i);
  if (mediaContentMatch && method === "PUT") {
    if (env.MEDIA_UPLOAD_ENABLED !== "true" || !env.MEDIA_BUCKET) {
      return json({ error: "media_upload_unavailable" }, 503);
    }
    const mediaId = mediaContentMatch[1];
    const media = await env.DB.prepare(
      "SELECT id, object_key, media_kind, mime_type, byte_size, status, upload_expires_at FROM conversation_media WHERE id = ? AND owner_worker_id = ? LIMIT 1",
    ).bind(mediaId, worker.worker_id).first();
    if (!media) return json({ error: "media_not_found" }, 404);
    if (media.status !== "intent" || Number(media.upload_expires_at) <= nowSeconds()) {
      return json({ error: "upload_intent_expired" }, 409);
    }
    const expectedBytes = Number(media.byte_size);
    const contentLength = Number(request.headers.get("content-length") || "0");
    const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    if (!request.body || !Number.isSafeInteger(contentLength) || contentLength !== expectedBytes ||
        contentType !== media.mime_type) {
      return json({ error: "media_headers_mismatch" }, 400);
    }
    const reader = request.body.getReader();
    const prefixChunks = [];
    let prefixLength = 0;
    try {
      while (prefixLength < Math.min(16, expectedBytes)) {
        const part = await reader.read();
        if (part.done) break;
        prefixChunks.push(part.value);
        prefixLength += part.value.byteLength;
      }
    } catch {
      reader.releaseLock();
      return json({ error: "media_upload_read_failed" }, 400);
    }
    const prefix = new Uint8Array(prefixLength);
    let prefixOffset = 0;
    for (const chunk of prefixChunks) {
      prefix.set(chunk, prefixOffset);
      prefixOffset += chunk.byteLength;
    }
    if (prefixLength > expectedBytes || !mediaSignatureMatches(String(media.mime_type), prefix)) {
      await reader.cancel();
      reader.releaseLock();
      return json({ error: "media_signature_mismatch" }, 415);
    }
    let totalBytes = prefixLength;
    let prefixIndex = 0;
    let streamFinished = false;
    const uploadStream = new ReadableStream({
      async pull(controller) {
        if (prefixIndex < prefixChunks.length) {
          controller.enqueue(prefixChunks[prefixIndex++]);
          return;
        }
        if (streamFinished) return;
        try {
          const part = await reader.read();
          if (part.done) {
            streamFinished = true;
            reader.releaseLock();
            if (totalBytes !== expectedBytes) {
              controller.error(new Error("media_size_mismatch"));
              return;
            }
            controller.close();
            return;
          }
          totalBytes += part.value.byteLength;
          if (totalBytes > expectedBytes) {
            await reader.cancel();
            controller.error(new Error("media_size_exceeded"));
            return;
          }
          controller.enqueue(part.value);
        } catch (error) {
          controller.error(error);
        }
      },
      async cancel() {
        streamFinished = true;
        await reader.cancel();
        reader.releaseLock();
      },
    });
    try {
      await env.MEDIA_BUCKET.put(String(media.object_key), uploadStream, {
        httpMetadata: { contentType: String(media.mime_type) },
        customMetadata: { mediaId, ownerWorkerId: String(worker.worker_id) },
      });
      const updated = await env.DB.prepare(
        "UPDATE conversation_media SET status = 'uploaded', updated_at = ? WHERE id = ? AND owner_worker_id = ? AND status = 'intent'",
      ).bind(nowSeconds(), mediaId, worker.worker_id).run();
      if ((updated.meta?.changes ?? 0) !== 1) {
        await env.MEDIA_BUCKET.delete(String(media.object_key));
        return json({ error: "upload_intent_conflict" }, 409);
      }
      return json({ media: { id: mediaId, status: "uploaded" } }, 201);
    } catch {
      await env.MEDIA_BUCKET.delete(String(media.object_key)).catch(() => {});
      await env.DB.prepare(
        "UPDATE conversation_media SET status = 'failed', updated_at = ? WHERE id = ? AND owner_worker_id = ? AND status = 'intent'",
      ).bind(nowSeconds(), mediaId, worker.worker_id).run();
      return json({ error: "media_upload_failed" }, 503);
    }
  }

  const mediaMatch = path.match(/^\/api\/media\/([0-9a-f-]{36})$/i);
  if (mediaMatch) {
    const mediaId = mediaMatch[1];
    const media = await env.DB.prepare(
      "SELECT id, object_key, mime_type, status FROM conversation_media WHERE id = ? AND owner_worker_id = ? LIMIT 1",
    ).bind(mediaId, worker.worker_id).first();
    if (!media) return json({ error: "media_not_found" }, 404);
    if (method === "GET") {
      if (!env.MEDIA_BUCKET || !["uploaded", "ready", "processing"].includes(String(media.status))) {
        return json({ error: "media_not_available" }, 404);
      }
      const object = await env.MEDIA_BUCKET.get(String(media.object_key));
      if (!object) return json({ error: "media_not_found" }, 404);
      return new Response(object.body, {
        headers: {
          "content-type": String(media.mime_type),
          "cache-control": "private, no-store",
          "x-content-type-options": "nosniff",
          "content-disposition": "inline",
          "referrer-policy": "no-referrer",
        },
      });
    }
    if (method === "DELETE") {
      if (!env.MEDIA_BUCKET) return json({ error: "media_storage_unavailable" }, 503);
      const derivatives = await env.DB.prepare(
        "SELECT object_key FROM conversation_media_derivatives WHERE media_id = ?",
      ).bind(mediaId).all();
      const keys = [
        String(media.object_key),
        ...(derivatives.results ?? []).map(row => String(row.object_key)),
      ];
      await env.MEDIA_BUCKET.delete(keys);
      await env.DB.prepare("DELETE FROM conversation_media WHERE id = ? AND owner_worker_id = ?")
        .bind(mediaId, worker.worker_id).run();
      return json({ deleted: true });
    }
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
      const mediaPurged = await purgeOwnedMediaObjects(env.DB, env.MEDIA_BUCKET, String(worker.worker_id), sessionId, env.MEDIA_UPLOAD_ENABLED === "true");
      if (!mediaPurged) return json({ error: "media_storage_unavailable" }, 503);
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
