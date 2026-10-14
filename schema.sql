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

CREATE TABLE IF NOT EXISTS login_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  success INTEGER NOT NULL CHECK (success IN (0, 1)),
  event TEXT NOT NULL DEFAULT 'login',
  user_agent TEXT,
  fingerprint TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_login_logs_ip_time ON login_logs (ip, created_at);

CREATE TABLE IF NOT EXISTS blocked_ips (
  ip TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  window INTEGER NOT NULL
);

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
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts (first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_contacts_group ON contacts (group_name);

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
CREATE INDEX IF NOT EXISTS idx_relations_from ON relations (from_id);
CREATE INDEX IF NOT EXISTS idx_relations_to ON relations (to_id);

-- Sifreli veri (istemci tarafli AES-GCM). Tum ifadeler idempotent.
CREATE TABLE IF NOT EXISTS vault (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  salt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS encrypted_contacts (
  id INTEGER PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
