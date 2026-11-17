-- Private conversation media metadata. Binary objects belong in private object storage,
-- never in D1. This migration does not create a bucket or enable uploads.
PRAGMA foreign_keys = ON;

-- A composite parent key guarantees that the media owner is also the owner
-- of the conversation it is attached to.
CREATE UNIQUE INDEX IF NOT EXISTS idx_work_sessions_id_owner
  ON work_sessions(id, worker_id);

CREATE TABLE IF NOT EXISTS conversation_media (
  id TEXT PRIMARY KEY NOT NULL,
  work_session_id TEXT NOT NULL,
  owner_worker_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  media_kind TEXT NOT NULL CHECK (media_kind IN ('image', 'video')),
  mime_type TEXT NOT NULL CHECK (
    (media_kind = 'image' AND mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/avif')) OR
    (media_kind = 'video' AND mime_type IN ('video/mp4', 'video/webm', 'video/quicktime'))
  ),
  byte_size INTEGER NOT NULL CHECK (byte_size > 0),
  sha256 TEXT,
  width_px INTEGER CHECK (width_px IS NULL OR width_px > 0),
  height_px INTEGER CHECK (height_px IS NULL OR height_px > 0),
  duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms > 0),
  caption TEXT CHECK (caption IS NULL OR length(caption) <= 2000),
  status TEXT NOT NULL CHECK (status IN (
    'intent', 'uploaded', 'validating', 'ready', 'processing', 'failed', 'deleted'
  )),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  upload_expires_at INTEGER NOT NULL,
  retention_expires_at INTEGER,
  deleted_at INTEGER,
  FOREIGN KEY (work_session_id, owner_worker_id)
    REFERENCES work_sessions(id, worker_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversation_media_owner_session
  ON conversation_media(owner_worker_id, work_session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_conversation_media_expiry
  ON conversation_media(status, upload_expires_at, retention_expires_at);

CREATE TABLE IF NOT EXISTS conversation_media_derivatives (
  id TEXT PRIMARY KEY NOT NULL,
  media_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  derivative_kind TEXT NOT NULL CHECK (derivative_kind IN (
    'thumbnail', 'video_poster', 'video_frame', 'audio_track', 'transcript'
  )),
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size > 0),
  timestamp_ms INTEGER CHECK (timestamp_ms IS NULL OR timestamp_ms >= 0),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (media_id) REFERENCES conversation_media(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_media_derivatives_media
  ON conversation_media_derivatives(media_id, derivative_kind, timestamp_ms);

CREATE TABLE IF NOT EXISTS conversation_media_analysis (
  id TEXT PRIMARY KEY NOT NULL,
  media_id TEXT NOT NULL,
  analysis_kind TEXT NOT NULL CHECK (analysis_kind IN (
    'image_understanding', 'video_understanding', 'audio_transcription'
  )),
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  provider TEXT,
  model TEXT,
  provider_version TEXT,
  result_json TEXT CHECK (result_json IS NULL OR length(result_json) <= 100000),
  error_code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER,
  FOREIGN KEY (media_id) REFERENCES conversation_media(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_media_analysis_media_created
  ON conversation_media_analysis(media_id, created_at DESC);
