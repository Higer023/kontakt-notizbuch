
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

console.log(`\n${passed} test gecti`);
