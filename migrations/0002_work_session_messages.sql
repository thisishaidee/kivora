-- Private, worker-owned conversation entries.
-- Messages are deleted when the owning work session is deleted.
CREATE TABLE IF NOT EXISTS work_session_messages (
  id TEXT PRIMARY KEY NOT NULL,
  work_session_id TEXT NOT NULL,
  worker_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('worker', 'assistant', 'system')),
  content TEXT NOT NULL CHECK (length(content) <= 20000),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (work_session_id) REFERENCES work_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_work_messages_owner_session_created
  ON work_session_messages(worker_id, work_session_id, created_at ASC);
