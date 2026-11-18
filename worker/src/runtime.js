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
/** @typedef {{ put(key: string, value: ReadableStream<Uint8Array>, options?: Record<string, unknown>): Promise<unknown>, get(key: string, options?: { range?: { offset: number, length?: number } }): Promise<{ body: ReadableStream<Uint8Array>, size: number, httpMetadata?: { contentType?: string } } | null>, delete(keys: string | string[]): Promise<void> }} R2Bucket */
/** @typedef {{ ASSETS?: { fetch(request: Request): Promise<Response> }, DB?: D1Database, MEDIA_BUCKET?: R2Bucket, MEDIA_UPLOAD_ENABLED?: string, IDENTITY_LIMITER?: RateLimiter, WORKER_LIMITER?: RateLimiter, AI_LIMITER?: RateLimiter, AI_ENABLED?: string, TAVILY_API_KEY?: string, AI?: { run(model: string, input: Record<string, unknown>): Promise<unknown> }, RESEND_API_KEY?: string, EMAIL_FROM?: string, APP_BASE_URL?: string }} Env */

import { assessWorkRequest, parseWorkRequest } from "../../shared/src/intelligence-runtime.js";
import { parsePrivateEvidenceCapture } from "../../shared/src/evidence-runtime.js";
import { composeWorkerAssistantResponse } from "../../shared/src/response-runtime.js";
import { searchTavilyLeads } from "./tavily-runtime.js";


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
  /** @param {number} start @param {number} end */
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

/** @param {D1Database} db @param {R2Bucket | undefined} bucket @param {string} workerId @param {string | undefined} sessionId */
const purgeOwnedMediaObjects = async (db, bucket, workerId, sessionId) => {
  const values = sessionId ? [workerId, sessionId] : [workerId];
  if (!bucket) {
    // Fail closed: never cascade away metadata when stored objects may still exist.
    const mediaQuery = sessionId
      ? "SELECT 1 AS present FROM conversation_media WHERE owner_worker_id = ? AND work_session_id = ? AND status IN ('uploaded', 'validating', 'ready', 'processing') LIMIT 1"
      : "SELECT 1 AS present FROM conversation_media WHERE owner_worker_id = ? AND status IN ('uploaded', 'validating', 'ready', 'processing') LIMIT 1";
    const derivativeQuery = sessionId
      ? "SELECT 1 AS present FROM conversation_media_derivatives d JOIN conversation_media m ON m.id = d.media_id WHERE m.owner_worker_id = ? AND m.work_session_id = ? LIMIT 1"
      : "SELECT 1 AS present FROM conversation_media_derivatives d JOIN conversation_media m ON m.id = d.media_id WHERE m.owner_worker_id = ? LIMIT 1";
    const [media, derivatives] = await Promise.all([
      db.prepare(mediaQuery).bind(...values).first(),
      db.prepare(derivativeQuery).bind(...values).first(),
    ]);
    return !media && !derivatives;
  }
  const mediaQuery = sessionId
    ? "SELECT object_key FROM conversation_media WHERE owner_worker_id = ? AND work_session_id = ?"
    : "SELECT object_key FROM conversation_media WHERE owner_worker_id = ?";
  const derivativeQuery = sessionId
    ? "SELECT d.object_key FROM conversation_media_derivatives d JOIN conversation_media m ON m.id = d.media_id WHERE m.owner_worker_id = ? AND m.work_session_id = ?"
    : "SELECT d.object_key FROM conversation_media_derivatives d JOIN conversation_media m ON m.id = d.media_id WHERE m.owner_worker_id = ?";
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

const PASSWORD_ITERATIONS = 600000;
/** @param {unknown} value */
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
/** @param {string} value */
const validEmail = (value) => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
/** @param {string} password @param {string} [saltHex] */
const derivePasswordHash = async (password, saltHex) => {
  const salt = saltHex ? Uint8Array.from(saltHex.match(/.{2}/g) || [], byte => parseInt(byte, 16)) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PASSWORD_ITERATIONS }, key, 256);
  /** @param {ArrayBuffer} value */
  const hex = value => Array.from(new Uint8Array(value), byte => byte.toString(16).padStart(2, "0")).join("");
  return { salt: hex(salt), hash: hex(bits) };
};
/** @param {string} password @param {string} salt @param {string} expected */
const verifyPassword = async (password, salt, expected) => {
  const actual = await derivePasswordHash(password, salt);
  if (actual.hash.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) mismatch |= actual.hash.charCodeAt(index) ^ expected.charCodeAt(index);
  return mismatch === 0;
};
/** @param {Env} env @param {string} to @param {string} subject @param {string} html */
const sendAccountEmail = async (env, to, subject, html) => {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !env.APP_BASE_URL || !/^https:\/\//i.test(env.APP_BASE_URL)) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, html }),
  });
  return response.ok;
};
/** @param {D1Database} db @param {string} workerId @param {"verify" | "reset"} purpose @param {string} token @param {number} now @param {number} ttl */
const accountTokenRecord = async (db, workerId, purpose, token, now, ttl) => {
  await db.prepare("INSERT INTO account_email_tokens (id, worker_id, purpose, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(newId(), workerId, purpose, await hashToken(token), now + ttl, now).run();
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

  if (path === "/api/accounts/register" && method === "POST") {
    if (env.IDENTITY_LIMITER) {
      const limit = await env.IDENTITY_LIMITER.limit({ key: "account-register:" + (request.headers.get("cf-connecting-ip") || "unknown") });
      if (!limit.success) return json({ error: "rate_limited" }, 429);
    }
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !env.APP_BASE_URL) return json({ error: "email_delivery_unavailable" }, 503);
    const body = await readJson(request);
    const email = normalizeEmail(body?.email);
    const password = typeof body?.password === "string" ? body.password : "";
    if (!validEmail(email) || password.length < 12 || password.length > 128) return json({ error: password.length < 12 ? "password_too_short" : "invalid_account_request" }, 400);
    const existing = await env.DB.prepare("SELECT id FROM worker_accounts WHERE email_normalized = ? LIMIT 1").bind(email).first();
    if (existing) return json({ error: "email_already_registered" }, 409);
    const workerId = newId();
    const now = nowSeconds();
    const sessionSecret = randomToken();
    const passwordRecord = await derivePasswordHash(password);
    const verifyToken = randomToken();
    try {
      await env.DB.batch([
        env.DB.prepare("INSERT INTO workers (id, recovery_token_hash, created_at, updated_at) VALUES (?, ?, ?, ?)").bind(workerId, await hashToken(sessionSecret), now, now),
        env.DB.prepare("INSERT INTO worker_accounts (id, worker_id, email_normalized, password_salt, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(newId(), workerId, email, passwordRecord.salt, passwordRecord.hash, now, now),
        env.DB.prepare("INSERT INTO account_email_tokens (id, worker_id, purpose, token_hash, expires_at, created_at) VALUES (?, ?, 'verify', ?, ?, ?)").bind(newId(), workerId, await hashToken(verifyToken), now + 86400, now),
      ]);
      const link = env.APP_BASE_URL.replace(/\/$/, "") + "/?verify=" + encodeURIComponent(verifyToken);
      const sent = await sendAccountEmail(env, email, "Verify your KIVORA account", "<p>Confirm your email address to activate your KIVORA account.</p><p><a href=\"" + link + "\">Verify email address</a></p><p>This link expires in 24 hours. If you did not create this account, you can ignore this message.</p>");
      if (!sent) {
        await env.DB.prepare("DELETE FROM workers WHERE id = ?").bind(workerId).run();
        return json({ error: "email_delivery_unavailable" }, 503);
      }
      return json({ message: "Account created. Check your inbox for the verification link." }, 201);
    } catch {
      await env.DB.prepare("DELETE FROM workers WHERE id = ?").bind(workerId).run().catch(() => {});
      return json({ error: "account_registration_failed" }, 503);
    }
  }

  if (path === "/api/accounts/verify" && method === "POST") {
    const body = await readJson(request);
    const token = typeof body?.token === "string" ? body.token : "";
    if (!/^[0-9a-f]{64}$/.test(token)) return json({ error: "invalid_or_expired_token" }, 400);
    const now = nowSeconds();
    const record = await env.DB.prepare("SELECT worker_id FROM account_email_tokens WHERE purpose = 'verify' AND token_hash = ? AND consumed_at IS NULL AND expires_at > ? LIMIT 1")
      .bind(await hashToken(token), now).first();
    if (!record) return json({ error: "invalid_or_expired_token" }, 400);
    const tokenHash = await hashToken(token);
    const consumed = await env.DB.prepare("UPDATE account_email_tokens SET consumed_at = ? WHERE token_hash = ? AND purpose = 'verify' AND consumed_at IS NULL AND expires_at > ?")
      .bind(now, tokenHash, now).run();
    if ((consumed.meta?.changes ?? 0) !== 1) return json({ error: "invalid_or_expired_token" }, 400);
    const sessionToken = randomToken();
    await env.DB.batch([
      env.DB.prepare("UPDATE worker_accounts SET email_verified_at = ?, updated_at = ? WHERE worker_id = ?").bind(now, now, record.worker_id),
      env.DB.prepare("INSERT INTO worker_sessions (id, worker_id, session_token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)").bind(newId(), record.worker_id, await hashToken(sessionToken), now, now + SESSION_TTL_SECONDS),
    ]);
    return json({ worker: { id: record.worker_id } }, 200, { "set-cookie": cookieHeader(sessionToken) });
  }

  if (path === "/api/accounts/login" && method === "POST") {
    if (env.IDENTITY_LIMITER) {
      const limit = await env.IDENTITY_LIMITER.limit({ key: "account-login:" + (request.headers.get("cf-connecting-ip") || "unknown") });
      if (!limit.success) return json({ error: "rate_limited" }, 429);
    }
    const body = await readJson(request);
    const email = normalizeEmail(body?.email);
    const password = typeof body?.password === "string" ? body.password : "";
    if (!validEmail(email) || !password || password.length > 128) return json({ error: "invalid_credentials" }, 401);
    const account = await env.DB.prepare("SELECT worker_id, password_salt, password_hash, email_verified_at FROM worker_accounts WHERE email_normalized = ? LIMIT 1").bind(email).first();
    if (!account || !(await verifyPassword(password, String(account.password_salt), String(account.password_hash)))) return json({ error: "invalid_credentials" }, 401);
    if (!account.email_verified_at) return json({ error: "email_not_verified" }, 403);
    const sessionToken = randomToken();
    const now = nowSeconds();
    await env.DB.prepare("INSERT INTO worker_sessions (id, worker_id, session_token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)")
      .bind(newId(), account.worker_id, await hashToken(sessionToken), now, now + SESSION_TTL_SECONDS).run();
    return json({ worker: { id: account.worker_id } }, 200, { "set-cookie": cookieHeader(sessionToken) });
  }

  if (path === "/api/accounts/forgot" && method === "POST") {
    if (env.IDENTITY_LIMITER) {
      const limit = await env.IDENTITY_LIMITER.limit({ key: "account-reset:" + (request.headers.get("cf-connecting-ip") || "unknown") });
      if (!limit.success) return json({ error: "rate_limited" }, 429);
    }
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !env.APP_BASE_URL) return json({ error: "email_delivery_unavailable" }, 503);
    const body = await readJson(request);
    const email = normalizeEmail(body?.email);
    if (!validEmail(email)) return json({ message: "If an account matches that address, a reset link will be sent." });
    const account = await env.DB.prepare("SELECT worker_id FROM worker_accounts WHERE email_normalized = ? AND email_verified_at IS NOT NULL LIMIT 1").bind(email).first();
    if (account) {
      const token = randomToken();
      const now = nowSeconds();
      await accountTokenRecord(env.DB, String(account.worker_id), "reset", token, now, 3600);
      const link = env.APP_BASE_URL.replace(/\/$/, "") + "/?reset=" + encodeURIComponent(token);
      await sendAccountEmail(env, email, "Reset your KIVORA password", "<p>A password reset was requested for your KIVORA account.</p><p><a href=\"" + link + "\">Reset password</a></p><p>This link expires in one hour. If you did not request this, ignore this email.</p>");
    }
    return json({ message: "If an account matches that address, a reset link will be sent." });
  }

  if (path === "/api/accounts/reset" && method === "POST") {
    if (env.IDENTITY_LIMITER) {
      const limit = await env.IDENTITY_LIMITER.limit({ key: "account-reset-submit:" + (request.headers.get("cf-connecting-ip") || "unknown") });
      if (!limit.success) return json({ error: "rate_limited" }, 429);
    }
    const body = await readJson(request);
    const token = typeof body?.token === "string" ? body.token : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (password.length < 12 || password.length > 128) return json({ error: "password_too_short" }, 400);
    if (!/^[0-9a-f]{64}$/.test(token)) return json({ error: "invalid_or_expired_token" }, 400);
    const now = nowSeconds();
    const tokenHash = await hashToken(token);
    const record = await env.DB.prepare("SELECT worker_id FROM account_email_tokens WHERE purpose = 'reset' AND token_hash = ? AND consumed_at IS NULL AND expires_at > ? LIMIT 1").bind(tokenHash, now).first();
    if (!record) return json({ error: "invalid_or_expired_token" }, 400);
    const consumed = await env.DB.prepare("UPDATE account_email_tokens SET consumed_at = ? WHERE token_hash = ? AND purpose = 'reset' AND consumed_at IS NULL AND expires_at > ?")
      .bind(now, tokenHash, now).run();
    if ((consumed.meta?.changes ?? 0) !== 1) return json({ error: "invalid_or_expired_token" }, 400);
    const passwordRecord = await derivePasswordHash(password);
    await env.DB.batch([
      env.DB.prepare("UPDATE worker_accounts SET password_salt = ?, password_hash = ?, updated_at = ? WHERE worker_id = ?").bind(passwordRecord.salt, passwordRecord.hash, now, record.worker_id),
      env.DB.prepare("UPDATE worker_sessions SET revoked_at = ? WHERE worker_id = ? AND revoked_at IS NULL").bind(now, record.worker_id),
      env.DB.prepare("UPDATE account_email_tokens SET consumed_at = ? WHERE worker_id = ? AND purpose = 'reset' AND consumed_at IS NULL").bind(now, record.worker_id),
    ]);
    return json({ reset: true });
  }

  if (path === "/api/identity" && method === "POST" && env.IDENTITY_LIMITER) {
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
      { worker: { id: workerId } },
      201,
      { "set-cookie": cookieHeader(sessionToken) },
    );
  }

  if (path === "/api/identity" && method === "GET") {
    const worker = await authenticate(request, env.DB);
    if (!worker) return json({ error: "unauthorized" }, 401);
    return json({ worker: { id: worker.worker_id } });
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
    const mediaPurged = await purgeOwnedMediaObjects(env.DB, env.MEDIA_BUCKET, String(worker.worker_id), undefined);
    if (!mediaPurged) return json({ error: "media_storage_unavailable" }, 503);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM work_session_messages WHERE worker_id = ?").bind(worker.worker_id),
      env.DB.prepare("DELETE FROM work_sessions WHERE worker_id = ?").bind(worker.worker_id),
      env.DB.prepare("DELETE FROM worker_sessions WHERE worker_id = ?").bind(worker.worker_id),
      env.DB.prepare("DELETE FROM workers WHERE id = ?").bind(worker.worker_id),
    ]);
    return json({ deleted: true }, 200, { "set-cookie": clearCookieHeader() });
  }

  if (path === "/api/identity/recover" || path === "/api/identity/recovery/rotate") {
    return json({ error: "not_found" }, 404);
  }

  const worker = await authenticate(request, env.DB);
  if (!worker) return json({ error: "unauthorized" }, 401);
  if (env.WORKER_LIMITER) {
    const limit = await env.WORKER_LIMITER.limit({ key: String(worker.worker_id) });
    if (!limit.success) return json({ error: "rate_limited", retry_after_seconds: 60 }, 429);
  }

  if (path === "/api/research" && method === "POST") {
    const body = await readJson(request);
    if (!body) return json({ error: "invalid_research_request" }, 400);
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return json({ error: "invalid_research_request" }, 400);
    let workRequest;
    try {
      workRequest = parseWorkRequest(body);
    } catch {
      return json({ error: "invalid_research_request" }, 400);
    }
    const session = await env.DB.prepare(
      "SELECT id, trade FROM work_sessions WHERE id = ? AND worker_id = ? LIMIT 1",
    ).bind(sessionId, worker.worker_id).first();
    if (!session || session.trade !== workRequest.trade) return json({ error: "work_session_not_found" }, 404);
    if (!env.TAVILY_API_KEY) return json({ error: "research_unavailable" }, 503);
    if (!env.AI_LIMITER) return json({ error: "research_unavailable" }, 503);
    const researchLimit = await env.AI_LIMITER.limit({ key: String(worker.worker_id) });
    if (!researchLimit.success) return json({ error: "rate_limited", retry_after_seconds: 60 }, 429);

    const query = [
      workRequest.trade,
      workRequest.task,
      workRequest.involvesEquipment ? workRequest.equipmentMake : "",
      workRequest.involvesEquipment ? workRequest.equipmentModel : "",
      "manufacturer documentation technical manual official guidance",
    ].filter(Boolean).join(" ").slice(0, 600);
    const result = await searchTavilyLeads({ query, apiKey: env.TAVILY_API_KEY });
    if (!result.ok) {
      const status = result.error === "research_rate_limited" ? 429 : result.error === "research_unavailable" ? 503 : 502;
      return json({ error: result.error }, status);
    }
    return json({
      sources: result.sources,
      sourceStatus: "unverified_leads",
      technicalGuidanceEnabled: false,
      notice: "Search results are leads for review, not verified technical evidence. They cannot authorize procedures or specifications.",
    });
  }

  if (path === "/api/assess" && method === "POST") {
    const body = await readJson(request);
    if (!body) return json({ error: "invalid_assessment_request" }, 400);
    try {
      // Browser-supplied evidence is ignored. Only approved shared records
      // from the server-side registry may support an assessment.
      const request = parseWorkRequest(body);
      const evidenceResult = await env.DB.prepare(
        `SELECT id, source_type, publisher, title, source_url, document_ref, source_version, product_make,
          product_model, trade, topic, revision_date, retrieved_at,
          jurisdiction, page_or_section, evidence_note
         FROM evidence_sources
         WHERE visibility = 'shared' AND review_status = 'approved'
           AND rights_status IN ('public_domain', 'open_license', 'permission')
           AND reviewer_role IN ('qualified_reviewer', 'manufacturer')
           AND trade = ?
           AND (jurisdiction IS NULL OR jurisdiction = ? COLLATE NOCASE)
           AND source_type != 'field_observation'
           ${request.involvesEquipment
             ? "AND ((source_type = 'standard' AND jurisdiction = ? COLLATE NOCASE) OR (product_make = ? COLLATE NOCASE AND product_model = ? COLLATE NOCASE))"
             : "AND (product_make IS NULL OR product_make = ? COLLATE NOCASE) AND (product_model IS NULL OR product_model = ? COLLATE NOCASE)"}
         ORDER BY updated_at DESC LIMIT 100`,
      ).bind(
        request.trade,
        request.jurisdiction ?? "",
        ...(request.involvesEquipment
          ? [request.jurisdiction ?? "", request.equipmentMake ?? "", request.equipmentModel ?? ""]
          : ["", ""]),
      ).all();
      const evidence = (evidenceResult.results ?? []).map((source) => ({
        id: String(source.id),
        sourceType: String(source.source_type),
        ...(source.source_version ? { sourceVersion: String(source.source_version) } : {}),
        publisher: String(source.publisher),
        title: String(source.title),
        ...(source.source_url ? { url: String(source.source_url) } : {}),
        ...(source.document_ref ? { documentId: String(source.document_ref) } : {}),
        productModels: source.product_model ? [String(source.product_model)] : [],
        ...(source.product_make ? { productMake: String(source.product_make) } : {}),
        ...(source.jurisdiction ? { jurisdiction: String(source.jurisdiction) } : {}),
        trade: String(source.trade),
        topic: String(source.topic),
        ...(typeof source.revision_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(source.revision_date)
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
        `SELECT id, source_type, publisher, title, source_url, document_ref, source_version, product_make,
          product_model, trade, topic, revision_date, retrieved_at,
          jurisdiction, page_or_section, evidence_note
         FROM evidence_sources
         WHERE visibility = 'shared' AND review_status = 'approved'
           AND rights_status IN ('public_domain', 'open_license', 'permission')
           AND reviewer_role IN ('qualified_reviewer', 'manufacturer')
           AND trade = ?
           AND (jurisdiction IS NULL OR jurisdiction = ? COLLATE NOCASE)
           AND source_type != 'field_observation'
           ${request.involvesEquipment
             ? "AND ((source_type = 'standard' AND jurisdiction = ? COLLATE NOCASE) OR (product_make = ? COLLATE NOCASE AND product_model = ? COLLATE NOCASE))"
             : "AND (product_make IS NULL OR product_make = ? COLLATE NOCASE) AND (product_model IS NULL OR product_model = ? COLLATE NOCASE)"}
         ORDER BY updated_at DESC LIMIT 100`,
      ).bind(
        request.trade,
        request.jurisdiction ?? "",
        ...(request.involvesEquipment
          ? [request.jurisdiction ?? "", request.equipmentMake ?? "", request.equipmentModel ?? ""]
          : ["", ""]),
      ).all();
      const evidence = (evidenceResult.results ?? []).map(source => ({
        id: String(source.id),
        sourceType: String(source.source_type),
        ...(source.source_version ? { sourceVersion: String(source.source_version) } : {}),
        publisher: String(source.publisher),
        title: String(source.title),
        ...(source.source_url ? { url: String(source.source_url) } : {}),
        ...(source.document_ref ? { documentId: String(source.document_ref) } : {}),
        productModels: source.product_model ? [String(source.product_model)] : [],
        ...(source.product_make ? { productMake: String(source.product_make) } : {}),
        ...(source.jurisdiction ? { jurisdiction: String(source.jurisdiction) } : {}),
        trade: String(source.trade),
        topic: String(source.topic),
        ...(typeof source.revision_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(source.revision_date) ? { revisionDate: source.revision_date } : {}),
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
    const id = newId();
    const now = nowSeconds();
    const objectKey = "private/" + worker.worker_id + "/" + sessionId + "/" + id;
    const intent = await env.DB.prepare(
      `INSERT INTO conversation_media (
        id, work_session_id, owner_worker_id, object_key, media_kind, mime_type,
        byte_size, caption, status, created_at, updated_at, upload_expires_at
      )
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'intent', ?, ?, ?
      WHERE (
        SELECT COALESCE(SUM(byte_size), 0) FROM conversation_media
        WHERE owner_worker_id = ?
          AND status IN ('intent', 'uploaded', 'validating', 'ready', 'processing')
          AND (status != 'intent' OR upload_expires_at > ?)
      ) + ? <= ?
      AND (
        SELECT COUNT(*) FROM conversation_media
        WHERE owner_worker_id = ? AND work_session_id = ? AND status != 'deleted'
          AND (status != 'intent' OR upload_expires_at > ?)
      ) < ?`,
    ).bind(
      id, sessionId, worker.worker_id, objectKey, mediaKind, mimeType,
      byteSize, caption || null, now, now, now + MEDIA_UPLOAD_TTL_SECONDS,
      worker.worker_id, now, byteSize, 100 * 1024 * 1024,
      worker.worker_id, sessionId, now, 10,
    ).run();
    if ((intent.meta?.changes ?? 0) !== 1) {
      return json({ error: "media_quota_or_conversation_limit_exceeded" }, 413);
    }
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
    /** @type {Uint8Array[]} */
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
      "SELECT id, object_key, mime_type, byte_size, status FROM conversation_media WHERE id = ? AND owner_worker_id = ? LIMIT 1",
    ).bind(mediaId, worker.worker_id).first();
    if (!media) return json({ error: "media_not_found" }, 404);
    if (method === "GET") {
      if (!env.MEDIA_BUCKET || !["uploaded", "ready", "processing"].includes(String(media.status))) {
        return json({ error: "media_not_available" }, 404);
      }
      const rangeHeader = request.headers.get("range");
      const totalSize = Number(media.byte_size);
      const headers = {
        "content-type": String(media.mime_type),
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        "content-disposition": "inline",
        "referrer-policy": "no-referrer",
        "accept-ranges": "bytes",
      };
      if (rangeHeader) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
        if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(totalSize) || totalSize <= 0) {
          return new Response(null, { status: 416, headers: { ...headers, "content-range": `bytes */${totalSize}` } });
        }
        let offset;
        let length;
        if (!match[1]) {
          const suffixLength = Number(match[2]);
          if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
            return new Response(null, { status: 416, headers: { ...headers, "content-range": `bytes */${totalSize}` } });
          }
          length = Math.min(suffixLength, totalSize);
          offset = totalSize - length;
        } else {
          offset = Number(match[1]);
          const requestedEnd = match[2] ? Number(match[2]) : totalSize - 1;
          if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(requestedEnd) || offset >= totalSize || requestedEnd < offset) {
            return new Response(null, { status: 416, headers: { ...headers, "content-range": `bytes */${totalSize}` } });
          }
          const end = Math.min(requestedEnd, totalSize - 1);
          length = end - offset + 1;
        }
        const rangedObject = await env.MEDIA_BUCKET.get(String(media.object_key), { range: { offset, length } });
        if (!rangedObject) return json({ error: "media_not_found" }, 404);
        const end = offset + length - 1;
        return new Response(rangedObject.body, {
          status: 206,
          headers: {
            ...headers,
            "content-length": String(length),
            "content-range": `bytes ${offset}-${end}/${totalSize}`,
          },
        });
      }
      const object = await env.MEDIA_BUCKET.get(String(media.object_key));
      if (!object) return json({ error: "media_not_found" }, 404);
      return new Response(object.body, {
        headers: { ...headers, "content-length": String(totalSize) },
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
      const mediaPurged = await purgeOwnedMediaObjects(env.DB, env.MEDIA_BUCKET, String(worker.worker_id), sessionId);
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
