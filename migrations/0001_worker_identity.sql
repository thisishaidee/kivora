-- KIVORA anonymous worker identity foundation.
-- Apply only after a D1 database has been created and bound.
-- Secrets are never stored in plaintext.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY NOT NULL,
  recovery_token_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  revoked_at INTEGER
);

CREATE TABLE IF NOT EXISTS worker_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  worker_id TEXT NOT NULL,
  session_token_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_worker_sessions_worker_expiry
  ON worker_sessions(worker_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_worker_sessions_expiry
  ON worker_sessions(expires_at);

CREATE TABLE IF NOT EXISTS work_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  worker_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled work session',
  trade TEXT NOT NULL CHECK (trade IN (
    'carpentry', 'electrical', 'plumbing', 'hvac',
    'mechanical', 'construction', 'multiple', 'unsure'
  )),
  language TEXT NOT NULL CHECK (language IN ('en', 'en-ng', 'pcm-ng', 'fr')),
  unit_system TEXT NOT NULL CHECK (unit_system IN ('metric', 'imperial')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived_at INTEGER,
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_work_sessions_owner_updated
  ON work_sessions(worker_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_work_sessions_owner_archive
  ON work_sessions(worker_id, archived_at, updated_at DESC);
