"""SQLite regression checks for the canonical D1 schema (no production DB access)."""
from pathlib import Path
import sqlite3
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = (ROOT / "schema.sql").read_text(encoding="utf-8")


class CanonicalSchemaTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys = ON")
        self.db.executescript(SCHEMA)

    def tearDown(self):
        self.db.close()

    def tables(self):
        return {row[0] for row in self.db.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        )}

    def columns(self, table):
        return {row[1] for row in self.db.execute(f'PRAGMA table_info("{table}")')}

    def test_schema_is_idempotent(self):
        self.db.executescript(SCHEMA)
        self.assertTrue({"users", "sessions", "encrypted_contacts", "contacts",
                         "relations", "migrations", "webauthn_credentials"}.issubset(self.tables()))

    def test_user_and_session_security_columns_exist(self):
        self.assertTrue({"id", "username", "password_hash", "is_admin", "pending"}.issubset(self.columns("users")))
        self.assertTrue({"token_hash", "expires_at", "reauth_until", "user_id"}.issubset(self.columns("sessions")))

    def test_encrypted_contacts_are_scoped_by_user(self):
        self.assertTrue({"id", "payload", "updated_at", "user_id"}.issubset(self.columns("encrypted_contacts")))
        self.db.execute("INSERT INTO encrypted_contacts (id, payload, user_id) VALUES (1, 'cipher-a', 10)")
        self.db.execute("INSERT INTO encrypted_contacts (id, payload, user_id) VALUES (2, 'cipher-b', 20)")
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM encrypted_contacts WHERE user_id=10").fetchone()[0], 1)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM encrypted_contacts WHERE user_id=20").fetchone()[0], 1)

    def test_usernames_are_case_insensitively_unique(self):
        self.db.execute("INSERT INTO users (username, password_hash) VALUES ('Alice', 'hash-a')")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO users (username, password_hash) VALUES ('alice', 'hash-b')")

    def test_login_log_success_flag_is_constrained(self):
        self.db.execute("INSERT INTO login_logs_v2 (idx, success, sealed) VALUES ('idx-a', 1, 'sealed')")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO login_logs_v2 (idx, success, sealed) VALUES ('idx-b', 2, 'sealed')")

    def test_duplicate_relationship_key_is_rejected(self):
        self.db.execute("INSERT INTO contacts (first_name) VALUES ('A')")
        self.db.execute("INSERT INTO contacts (first_name) VALUES ('B')")
        self.db.execute("INSERT INTO relations (from_id, to_id, label) VALUES (1, 2, 'friend')")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO relations (from_id, to_id, label) VALUES (1, 2, 'friend')")


if __name__ == "__main__":
    result = unittest.main(verbosity=2, exit=False)
    if not result.result.wasSuccessful():
        raise SystemExit(1)
