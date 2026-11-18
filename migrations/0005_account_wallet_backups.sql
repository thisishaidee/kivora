-- Account-owned, client-encrypted wallet backup.
-- The Worker stores ciphertext only; it must never receive a recovery phrase,
-- BIP39 seed, private key, derived encryption key, or plaintext BDK changeset.
CREATE TABLE IF NOT EXISTS account_wallet_backups (
  worker_id TEXT PRIMARY KEY NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  format_version INTEGER NOT NULL CHECK (format_version = 1),
  network TEXT NOT NULL CHECK (network = 'bitcoin-testnet'),
  kdf TEXT NOT NULL CHECK (kdf = 'PBKDF2-SHA-256'),
  kdf_iterations INTEGER NOT NULL CHECK (kdf_iterations BETWEEN 300000 AND 1000000),
  salt_b64 TEXT NOT NULL CHECK (length(salt_b64) BETWEEN 20 AND 32),
  cipher TEXT NOT NULL CHECK (cipher = 'AES-256-GCM'),
  iv_b64 TEXT NOT NULL CHECK (length(iv_b64) BETWEEN 16 AND 24),
  ciphertext_b64 TEXT NOT NULL CHECK (length(ciphertext_b64) BETWEEN 24 AND 350000),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS account_wallet_backups_updated_at
  ON account_wallet_backups(updated_at);
