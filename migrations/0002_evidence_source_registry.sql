-- KIVORA evidence source registry.
-- Stores provenance and reviewer-authored evidence notes, not copied manual pages or raw files.
-- Shared evidence is restricted to sources with documented reuse rights.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS evidence_sources (
  id TEXT PRIMARY KEY NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('private', 'shared')),
  owner_worker_id TEXT,
  trade TEXT NOT NULL CHECK (trade IN (
    'carpentry', 'electrical', 'plumbing', 'hvac',
    'mechanical', 'construction', 'multiple', 'unsure'
  )),
  source_type TEXT NOT NULL CHECK (source_type IN (
    'manufacturer_manual', 'technical_bulletin', 'service_notice',
    'standard', 'field_observation', 'other'
  )),
  publisher TEXT NOT NULL CHECK (length(publisher) BETWEEN 1 AND 200),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 300),
  source_url TEXT,
  document_ref TEXT,
  source_version TEXT,
  revision_date TEXT,
  retrieved_at INTEGER NOT NULL,
  jurisdiction TEXT,
  language TEXT NOT NULL CHECK (language IN ('en', 'en-ng', 'pcm-ng', 'fr', 'und')),
  product_make TEXT,
  product_model TEXT,
  topic TEXT NOT NULL CHECK (length(topic) BETWEEN 1 AND 200),
  page_or_section TEXT,
  evidence_note TEXT NOT NULL CHECK (length(evidence_note) BETWEEN 1 AND 2000),
  rights_status TEXT NOT NULL DEFAULT 'unknown' CHECK (rights_status IN (
    'public_domain', 'open_license', 'permission', 'user_provided_private', 'unknown', 'restricted'
  )),
  license_name TEXT,
  license_url TEXT,
  source_sha256 TEXT CHECK (source_sha256 IS NULL OR length(source_sha256) = 64),
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN (
    'pending', 'approved', 'rejected', 'superseded'
  )),
  reviewer_id TEXT,
  reviewer_role TEXT CHECK (reviewer_role IS NULL OR reviewer_role IN (
    'qualified_reviewer', 'manufacturer', 'editor'
  )),
  reviewed_at INTEGER,
  rejection_reason TEXT,
  supersedes_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (owner_worker_id) REFERENCES workers(id) ON DELETE CASCADE,
  FOREIGN KEY (supersedes_id) REFERENCES evidence_sources(id) ON DELETE SET NULL,
  CHECK (
    (visibility = 'private' AND owner_worker_id IS NOT NULL) OR
    (visibility = 'shared' AND owner_worker_id IS NULL)
  ),
  CHECK (
    visibility != 'shared' OR rights_status IN ('public_domain', 'open_license', 'permission')
  ),
  CHECK (
    review_status != 'approved' OR (
      reviewed_at IS NOT NULL AND reviewer_id IS NOT NULL AND
      reviewer_role IS NOT NULL AND
      rights_status NOT IN ('unknown', 'restricted')
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_evidence_sources_trade_topic_review
  ON evidence_sources(trade, topic, review_status, visibility);

CREATE INDEX IF NOT EXISTS idx_evidence_sources_product_model
  ON evidence_sources(trade, product_make, product_model, review_status);

CREATE INDEX IF NOT EXISTS idx_evidence_sources_owner
  ON evidence_sources(owner_worker_id, review_status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_evidence_sources_rights
  ON evidence_sources(visibility, rights_status, review_status);
