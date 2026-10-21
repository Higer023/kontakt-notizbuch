
// Davranissal testler: Worker'i bellek ici SQLite (sql.js) ile calistirir. Ag ve Turnstile cagrisi yok.
import { readFileSync } from 'node:fs';
import initSqlJs from 'sql.js';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';

const SQL = await initSqlJs();
// Sadece test icin sabit anahtar (32 bayt). Gercek anahtar DEGIL.
const TEST_LOG_KEY = Buffer.from(new Uint8Array(32).fill(7)).toString('base64');
const schema = readFileSync(new URL('../schema.sql', import.meta.url), 'utf8');

function makeDb() {
  const db = new SQL.Database();
  const impl = (sql, args) => ({
    async run() { db.run(sql, args); return { success: true, meta: { changes: db.getRowsModified() } }; },
    async first() {
      const s = db.prepare(sql); s.bind(args);
      const row = s.step() ? s.getAsObject() : null; s.free(); return row;
    },
    async all() {
      const s = db.prepare(sql); s.bind(args);
      const rows = []; while (s.step()) rows.push(s.getAsObject()); s.free();
      return { results: rows, success: true };
    },
  });
  const DB = {
    prepare: (sql) => ({ ...impl(sql, []), bind: (...args) => impl(sql, args) }),
    exec: (sql) => db.exec(sql),
    batch: async (stmts) => { const out = []; for (const st of stmts) out.push(await st.run()); return out; },
  };
  return { db, DB };
}

const env = () => {
  const { db, DB } = makeDb();
  return { db, env: { DB, TURNSTILE_SECRET: 'test', LOG_KEY: TEST_LOG_KEY, ASSETS: { fetch: async () => new Response('asset') } } };
};

const req = (method, path, body) =>
  new Request('https://example.test' + path, {
    method, headers: body ? { 'content-type': 'application/json', origin: 'https://example.test' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('ok  ', name); }
  catch (err) { console.error('FAIL', name, '\n  ', err.message); process.exitCode = 1; }
}

await test('sema iki kez uygulanabilir (idempotent)', async () => {
  const { db } = makeDb();
  db.exec(schema);
  db.exec(schema);
});

await test('oturumsuz korunan uc 401 doner (GET /api/sessions)', async () => {
  const { env: e } = env();
  // sema kurulu olmali
  const { db, DB } = makeDb(); db.exec(schema);
  const res = await worker.fetch(req('GET', '/api/sessions'), { ...e, DB });
  assert.equal(res.status, 401, `beklenen 401, gelen ${res.status}`);
});

await test('parola ile giris kapali (403)', async () => {
  const { db, DB } = makeDb(); db.exec(schema);
  const res = await worker.fetch(req('POST', '/api/login', { username: 'x', password: 'y' }),
    { DB, TURNSTILE_SECRET: 'test', LOG_KEY: TEST_LOG_KEY, ASSETS: { fetch: async () => new Response('a') } });
  assert.equal(res.status, 403, `beklenen 403, gelen ${res.status}`);
});

await test('oturumsuz bilinmeyen api yolu 401 doner (yol kesfi engellenir)', async () => {
  const { db, DB } = makeDb(); db.exec(schema);
  const res = await worker.fetch(req('GET', '/api/bu-yol-yok'), { DB, LOG_KEY: TEST_LOG_KEY, TURNSTILE_SECRET: 'test', ASSETS: { fetch: async () => new Response('a') } });
  assert.equal(res.status, 401, `beklenen 401, gelen ${res.status}`);
});


// ---------- Oturumlu istekler: yardimcilar ----------
import { createHash } from 'node:crypto';
const sha256hex = (t) => createHash('sha256').update(t).digest('hex');

function seedUsers(db) {
  db.exec("INSERT INTO users (id, username, password_hash, salt) VALUES (1, 'u1', 'x', 's1'), (2, 'u2', 'x', 's2')");
  const exp = "datetime('now', '+1 hour')";
  db.exec(`INSERT INTO sessions (token_hash, expires_at, user_id) VALUES ('${sha256hex('tok-user1-aaaaaaaa')}', ${exp}, 1)`);
  db.exec(`INSERT INTO sessions (token_hash, expires_at, user_id) VALUES ('${sha256hex('tok-user2-bbbbbbbb')}', ${exp}, 2)`);
}
const authReq = (method, path, token, body) => new Request('https://example.test' + path, {
  method,
  headers: {
    cookie: 'session=' + token,
    ...(body ? { 'content-type': 'application/json', origin: 'https://example.test' } : {}),
  },
  body: body ? JSON.stringify(body) : undefined,
});
const envFor = (DB) => ({ DB, LOG_KEY: TEST_LOG_KEY, TURNSTILE_SECRET: 'test', ASSETS: { fetch: async () => new Response('a') } });
const U1 = 'tok-user1-aaaaaaaa', U2 = 'tok-user2-bbbbbbbb';

await test('sifreli kayit yaz-oku dongusu: sunucu ayni sifreli veriyi geri verir', async () => {
  const { db, DB } = makeDb(); db.exec(schema); seedUsers(db);
  const payload = 'c2lmcmVsaS12ZXJpLW9ybmVr';
  const w1 = await worker.fetch(authReq('POST', '/api/vault/contacts', U1, { payload }), envFor(DB));
  assert.ok(w1.status === 200 || w1.status === 201, `yazma basarisiz: ${w1.status} ${await w1.text()}`);
  const r1 = await worker.fetch(authReq('GET', '/api/vault/contacts', U1), envFor(DB));
  assert.equal(r1.status, 200);
  const body = await r1.json();
  const list = body.contacts || body.records || body.items || body;
  assert.ok(JSON.stringify(list).includes(payload), 'yazilan kayit okunamadi');
});

await test('kullanici izolasyonu: kullanici 2, kullanici 1 kaydini goremez', async () => {
  const { db, DB } = makeDb(); db.exec(schema); seedUsers(db);
  const payload = 'Y2Vuc2lsLWtheWl0LXUx';
  await worker.fetch(authReq('POST', '/api/vault/contacts', U1, { payload }), envFor(DB));
  const r2 = await worker.fetch(authReq('GET', '/api/vault/contacts', U2), envFor(DB));
  assert.equal(r2.status, 200);
  assert.ok(!JSON.stringify(await r2.json()).includes(payload), 'kullanici 2 kullanici 1 verisini gordu');
});

await test('kullanici izolasyonu: kullanici 2, kullanici 1 kaydini silemez', async () => {
  const { db, DB } = makeDb(); db.exec(schema); seedUsers(db);
  const payload = 'c2lsbWUtZGVuZW1lLXUx';
  const w = await worker.fetch(authReq('POST', '/api/vault/contacts', U1, { payload }), envFor(DB));
  const created = await w.json();
  const id = created.id ?? (created.contact && created.contact.id) ?? created.record?.id;
  assert.ok(id, 'olusturulan kayit kimligi yok');
  await worker.fetch(authReq('DELETE', '/api/vault/contacts/' + id, U2), envFor(DB));
  const r1 = await worker.fetch(authReq('GET', '/api/vault/contacts', U1), envFor(DB));
  assert.ok(JSON.stringify(await r1.json()).includes(payload), 'kullanici 2 kullanici 1 kaydini sildi');
});

// Ice aktarma ve eski veri kurallari: duzeltmeler bu testlerle korunur.
await test('ice aktarilan kayit sahibi kullaniciya gorunur (user_id dogru)', async () => {
  const { db, DB } = makeDb(); db.exec(schema); seedUsers(db);
  // Ice aktarma yonetici ve taze oturum ister: kullanici 1'i yonetici yap, yeniden dogrulamayi taze tut.
  db.exec("UPDATE users SET is_admin = 1 WHERE id = 1");
  db.exec("UPDATE sessions SET reauth_until = datetime('now', '+5 minutes') WHERE user_id = 1");
  const payload = 'aW1wb3J0LWVkaWxlbi11MQ==';
  const imp = await worker.fetch(authReq('POST', '/api/vault/import', U1,
    { records: [{ id: 101, payload }], final: false }), envFor(DB));
  assert.ok(imp.status === 200 || imp.status === 201, `ice aktarma basarisiz: ${imp.status}`);
  const r1 = await worker.fetch(authReq('GET', '/api/vault/contacts', U1), envFor(DB));
  assert.ok(JSON.stringify(await r1.json()).includes(payload), 'ice aktarilan kayit kullanici 1 icin gorunmuyor (user_id bos)');
});

await test('eski duz metin kisiler yonetici olmayan kullaniciya kapali', async () => {
  const { db, DB } = makeDb(); db.exec(schema); seedUsers(db);
  db.exec("INSERT INTO contacts (first_name) VALUES ('GizliIsim')");
  const r2 = await worker.fetch(authReq('GET', '/api/vault/legacy', U2), envFor(DB));
  assert.equal(r2.status, 403, 'yonetici olmayan kullanici eski veriye erismemeli');
  const text = await r2.text();
  assert.ok(!text.includes('GizliIsim'), `eski duz metin kayit kullanici 2'ye sizdi (HTTP ${r2.status})`);
});

await test('ice aktarma baska kullanicinin ayni kimlikli kaydini ezmez', async () => {
  const { db, DB } = makeDb(); db.exec(schema); seedUsers(db);
  db.exec("UPDATE users SET is_admin = 1 WHERE id = 1");
  db.exec("UPDATE sessions SET reauth_until = datetime('now', '+5 minutes') WHERE user_id = 1");
  db.exec("INSERT INTO encrypted_contacts (id, payload, user_id) VALUES (555, 'a2FsbWFsaQ==', 2)");
  const imp = await worker.fetch(authReq('POST', '/api/vault/import', U1,
    { records: [{ id: 555, payload: 'ZXppbG1lbGk=' }], final: false }), envFor(DB));
  assert.ok(imp.status === 200 || imp.status === 201, `ice aktarma basarisiz: ${imp.status}`);
  const r2 = await worker.fetch(authReq('GET', '/api/vault/contacts', U2), envFor(DB));
  assert.ok(JSON.stringify(await r2.json()).includes('a2FsbWFsaQ=='), 'kullanici 2 kaydi ezildi');
});

console.log(`\n${passed} test gecti`);
