-- Kanonik sema. Tekrar calistirilabilir (IF NOT EXISTS). Her dagitimda uygulanir.
-- Yeni bir sema degisikligi once buraya ve migrations/ klasorune islenmelidir.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
  pending INTEGER NOT NULL DEFAULT 0,
  recovery_hash TEXT,
  recovery_blob TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_username ON users (lower(username));

CREATE TABLE IF NOT EXISTS admin (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  reauth_until TEXT,
  user_id INTEGER
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  window INTEGER NOT NULL
);

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

-- Sifreli kisi kayitlari (istemci tarafinda AES-GCM); user_id ile kullaniciya ayrilir
CREATE TABLE IF NOT EXISTS encrypted_contacts (
  id INTEGER PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  user_id INTEGER
);
CREATE INDEX IF NOT EXISTS idx_enc_contacts_user ON encrypted_contacts (user_id);

-- Eski acik metin tablolar (gecis icin; yeni kayit yazilmaz)
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT,
  nickname TEXT,
  birth_year INTEGER,
  birth_month INTEGER,
  birth_day INTEGER,
  birthplace TEXT,
  city TEXT,
  school TEXT,
  group_name TEXT,
  occupation TEXT,
  how_we_met TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  socials TEXT NOT NULL DEFAULT '[]',
  extra TEXT DEFAULT '[]',
  notes TEXT,
  tags TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_id INTEGER NOT NULL,
  to_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  reverse_label TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (from_id, to_id, label)
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

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notify_queue (
  type TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS webauthn_challenges (
  challenge TEXT PRIMARY KEY,
  purpose TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id TEXT PRIMARY KEY,
  x TEXT NOT NULL,
  y TEXT NOT NULL,
  sign_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  user_id INTEGER
);

CREATE TABLE IF NOT EXISTS recovery (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  code_hash TEXT NOT NULL,
  blob TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
