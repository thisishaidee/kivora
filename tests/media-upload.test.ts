import { describe, expect, it, vi } from "vitest";
import worker from "../worker/src/index";

const sessionId = "123e4567-e89b-12d3-a456-426614174000";
const mediaId = "123e4567-e89b-12d3-a456-426614174001";
const cookie = "__Host-kivora_session=" + "a".repeat(64);

function makeDb(options: {
  ownsSession?: boolean;
  media?: Record<string, unknown> | null;
  changes?: number;
} = {}) {
  const statements: { sql: string; values: unknown[] }[] = [];
  const db = {
    prepare(sql: string) {
      const statement = {
        sql,
        values: [] as unknown[],
        bind(...values: unknown[]) { this.values = values; return this; },
        first: async () => {
          if (sql.includes("JOIN workers")) return { worker_id: "worker-a" };
          if (sql.includes("SELECT id FROM work_sessions")) {
            return options.ownsSession === false ? null : { id: sessionId };
          }
          if (sql.includes("FROM conversation_media WHERE id = ?")) return options.media ?? null;
          return null;
        },
        all: async () => ({ results: [] }),
        run: async () => ({ success: true, meta: { changes: options.changes ?? 1 } }),
      };
      statements.push(statement);
      return statement;
    },
    batch: async (items: unknown[]) => items.map(() => ({
      success: true, results: [], meta: { changes: 1 },
    })),
    statements,
  };
  return db;
}

const authenticatedHeaders = {
  origin: "https://kivora.test",
  cookie,
};

describe("private conversation media uploads", () => {
  it("keeps media uploads unavailable unless explicitly enabled", async () => {
    const db = makeDb();
    const response = await worker.fetch(
      new Request("https://kivora.test/api/media/uploads", {
        method: "POST",
        headers: { ...authenticatedHeaders, "content-type": "application/json" },
        body: JSON.stringify({
          sessionId, mediaKind: "image", mimeType: "image/jpeg", byteSize: 128,
        }),
      }),
      { ASSETS: { fetch: vi.fn() }, DB: db as never },
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "media_upload_unavailable" });
    expect(db.statements).toHaveLength(1);
  });

  it("creates an owner-scoped, bounded upload intent for an owned conversation", async () => {
    const db = makeDb();
    const response = await worker.fetch(
      new Request("https://kivora.test/api/media/uploads", {
        method: "POST",
        headers: { ...authenticatedHeaders, "content-type": "application/json" },
        body: JSON.stringify({
          sessionId, mediaKind: "image", mimeType: "image/jpeg", byteSize: 128,
          caption: "Close-up of the fitting label",
        }),
      }),
      {
        ASSETS: { fetch: vi.fn() },
        DB: db as never,
        MEDIA_UPLOAD_ENABLED: "true",
        MEDIA_BUCKET: { put: vi.fn(), get: vi.fn(), delete: vi.fn() },
      } as never,
    );
    const body = await response.json();
    const insert = db.statements.find(s => s.sql.includes("INSERT INTO conversation_media"));
    expect(response.status).toBe(201);
    expect(body.media.status).toBe("intent");
    expect(body.uploadPath).toBe("/api/media/" + body.media.id + "/content");
    expect(insert?.sql).toContain("SELECT COALESCE(SUM(byte_size)");
    expect(insert?.sql).toContain("SELECT COUNT(*)");
    expect(insert?.values).toContain("worker-a");
    expect(insert?.values).toContain(sessionId);
  });

  it("does not create an upload intent for a conversation owned by another worker", async () => {
    const db = makeDb({ ownsSession: false });
    const response = await worker.fetch(
      new Request("https://kivora.test/api/media/uploads", {
        method: "POST",
        headers: { ...authenticatedHeaders, "content-type": "application/json" },
        body: JSON.stringify({
          sessionId, mediaKind: "video", mimeType: "video/mp4", byteSize: 1024,
        }),
      }),
      {
        ASSETS: { fetch: vi.fn() },
        DB: db as never,
        MEDIA_UPLOAD_ENABLED: "true",
        MEDIA_BUCKET: { put: vi.fn(), get: vi.fn(), delete: vi.fn() },
      } as never,
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "work_session_not_found" });
    expect(db.statements.some(s => s.sql.includes("INSERT INTO conversation_media"))).toBe(false);
  });

  it("rejects unsupported formats before writing metadata", async () => {
    const db = makeDb();
    const response = await worker.fetch(
      new Request("https://kivora.test/api/media/uploads", {
        method: "POST",
        headers: { ...authenticatedHeaders, "content-type": "application/json" },
        body: JSON.stringify({
          sessionId, mediaKind: "image", mimeType: "image/heic", byteSize: 1024,
        }),
      }),
      {
        ASSETS: { fetch: vi.fn() },
        DB: db as never,
        MEDIA_UPLOAD_ENABLED: "true",
        MEDIA_BUCKET: { put: vi.fn(), get: vi.fn(), delete: vi.fn() },
      } as never,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_media_upload" });
    expect(db.statements.some(s => s.sql.includes("INSERT INTO conversation_media"))).toBe(false);
  });

  it("rejects bytes whose file signature does not match the declared media type", async () => {
    const db = makeDb({
      media: {
        id: mediaId,
        object_key: "private/worker-a/" + sessionId + "/" + mediaId,
        media_kind: "image",
        mime_type: "image/jpeg",
        byte_size: 8,
        status: "intent",
        upload_expires_at: Math.floor(Date.now() / 1000) + 600,
      },
    });
    const put = vi.fn();
    const response = await worker.fetch(
      new Request("https://kivora.test/api/media/" + mediaId + "/content", {
        method: "PUT",
        headers: { ...authenticatedHeaders, "content-type": "image/jpeg", "content-length": "8" },
        body: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
      }),
      {
        ASSETS: { fetch: vi.fn() },
        DB: db as never,
        MEDIA_UPLOAD_ENABLED: "true",
        MEDIA_BUCKET: { put, get: vi.fn(), delete: vi.fn() },
      } as never,
    );
    expect(response.status).toBe(415);
    expect(await response.json()).toEqual({ error: "media_signature_mismatch" });
    expect(put).not.toHaveBeenCalled();
  });

  it("streams a signature-checked image to private storage and marks it uploaded", async () => {
    const db = makeDb({
      media: {
        id: mediaId,
        object_key: "private/worker-a/" + sessionId + "/" + mediaId,
        media_kind: "image",
        mime_type: "image/jpeg",
        byte_size: 3,
        status: "intent",
        upload_expires_at: Math.floor(Date.now() / 1000) + 600,
      },
    });
    const stored: number[] = [];
    const put = vi.fn(async (_key: string, stream: ReadableStream<Uint8Array>) => {
      const reader = stream.getReader();
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        stored.push(...part.value);
      }
    });
    const response = await worker.fetch(
      new Request("https://kivora.test/api/media/" + mediaId + "/content", {
        method: "PUT",
        headers: { ...authenticatedHeaders, "content-type": "image/jpeg", "content-length": "3" },
        body: new Uint8Array([0xff, 0xd8, 0xff]),
      }),
      {
        ASSETS: { fetch: vi.fn() },
        DB: db as never,
        MEDIA_UPLOAD_ENABLED: "true",
        MEDIA_BUCKET: { put, get: vi.fn(), delete: vi.fn() },
      } as never,
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ media: { id: mediaId, status: "uploaded" } });
    expect(put).toHaveBeenCalledOnce();
    expect(stored).toEqual([0xff, 0xd8, 0xff]);
    expect(db.statements.some(s => s.sql.includes("SET status = 'uploaded'"))).toBe(true);
  });
});
