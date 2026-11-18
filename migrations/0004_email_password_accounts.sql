-- Email/password accounts. Passwords are PBKDF2-HMAC-SHA256 hashes; tokens are stored only as SHA-256 hashes.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS worker_accounts (
  id TEXT PRIMARY KEY NOT NULL,
  worker_id TEXT NOT NULL UNIQUE,
  email_normalized TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_salt TEXT NOT NULL CHECK (length(password_salt) = 32),
  password_hash TEXT NOT NULL CHECK (length(password_hash) = 64),
  email_verified_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account_email_tokens (
  id TEXT PRIMARY KEY NOT NULL,
  worker_id TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('verify', 'reset')),
  token_hash TEXT NOT NULL UNIQUE CHECK (length(token_hash) = 64),
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_account_tokens_worker_purpose
  ON account_email_tokens(worker_id, purpose, expires_at);
