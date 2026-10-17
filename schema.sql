CREATE TABLE IF NOT EXISTS admin (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  reauth_until TEXT
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  window INTEGER NOT NULL
);

-- Giris kayitlari: IP icin geri okunamaz arama kodu (idx), icerik sunucu anahtariyla sifreli (sealed)
CREATE TABLE IF NOT EXISTS login_logs_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idx TEXT NOT NULL,
  success INTEGER NOT NULL CHECK (success IN (0, 1)),
  event TEXT NOT NULL DEFAULT 'login',
  sealed TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_login_logs_v2_idx_time ON login_logs_v2 (idx, created_at);

CREATE TABLE IF NOT EXISTS blocked_ips_v2 (
  idx TEXT PRIMARY KEY,
  sealed TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vault (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  salt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS encrypted_contacts (
  id INTEGER PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS migrations (
  name TEXT PRIMARY KEY,
  done_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS session_meta (
  token_hash TEXT PRIMARY KEY,
  ua TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
