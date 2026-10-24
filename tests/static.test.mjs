// Statische Tests, die vor dem Deployment ausgeführt werden. Vom Repo-Stammverzeichnis aus: node tests/static.test.mjs
// Dagitimdan once calisan statik testler. Repo kokunden: node tests/static.test.mjs
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import assert from 'node:assert/strict';

const read = (p) => readFileSync(p, 'utf8');
let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('ok  ', name); }
  catch (err) { console.error('FAIL', name, '\n', err.message); process.exitCode = 1; }
}

const worker = read('src/worker.js');
const schema = read('schema.sql');
const publicJs = readdirSync('public').filter((f) => extname(f) === '.js').map((f) => join('public', f));

test('worker varsayilan giris noktasina sahip', () => {
  assert.match(worker, /export default\s*\{/);
});

test('sema gerekli tablolari ve kolonlari iceriyor', () => {
  for (const t of ['users', 'sessions', 'encrypted_contacts', 'webauthn_credentials', 'recovery', 'rate_limits', 'blocked_ips_v2', 'login_logs_v2']) {
    assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${t}\\b`), `tablo eksik: ${t}`);
  }
  for (const c of ['pending INTEGER', 'recovery_hash TEXT', 'recovery_blob TEXT', 'user_id INTEGER']) {
    assert.ok(schema.includes(c), `kolon eksik: ${c}`);
  }
});

test('istemcinin cagirdigi her /api yolu worker icinde tanimli', () => {
  const normalizedWorker = worker.replace(/\\\//g, '/');
  const used = new Set();
  for (const f of publicJs) {
    for (const m of read(f).matchAll(/['"`](\/api\/[A-Za-z0-9_\/-]+)/g)) {
      used.add(m[1].replace(/\/+$/, ''));
    }
  }
  for (const p of used) {
    assert.ok(normalizedWorker.includes(p), `worker'da yok: ${p}`);
  }
});

test('public JS dosyalari sozdizimi hatasi icermiyor', () => {
  const dir = mkdtempSync(join(tmpdir(), 'chk-'));
  for (const f of publicJs) {
    const copy = join(dir, f.replace(/[\\/]/g, '_') + '.mjs');
    writeFileSync(copy, read(f));
    execFileSync(process.execPath, ['--check', copy], { stdio: 'pipe' });
  }
});

test('worker sozdizimi hatasi icermiyor', () => {
  const dir = mkdtempSync(join(tmpdir(), 'chk-'));
  const copy = join(dir, 'worker.mjs');
  writeFileSync(copy, worker);
  execFileSync(process.execPath, ['--check', copy], { stdio: 'pipe' });
});

test('depoda gizli anahtar desenleri yok', () => {
  const patterns = [/cfut_[A-Za-z0-9]{20,}/, /re_[A-Za-z0-9]{20,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /sk_live_[A-Za-z0-9]{16,}/];
  const skip = new Set(['node_modules', '.git']);
  const walk = (dir) => readdirSync(dir).flatMap((n) => {
    if (skip.has(n)) return [];
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  for (const f of walk('.')) {
    if (f.endsWith('static.test.mjs')) continue;
    const text = read(f);
    for (const re of patterns) assert.ok(!re.test(text), `olasi gizli anahtar: ${f}`);
  }
});

console.log(`\n${passed} test gecti`);
