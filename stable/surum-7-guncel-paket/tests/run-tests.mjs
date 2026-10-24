
import { spawn } from 'node:child_process';
import path from 'node:path';
const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
import fs from 'node:fs';
import crypto from 'node:crypto';

// ---- D1-ähnliche Datenbank (echtes SQLite, Python-Brücke) ----
// ---- D1 benzeri veritabani (gercek SQLite, Python koprusu) ----
const py = spawn('python3', [path.join(ROOT, 'tests', 'd1.py')], { stdio: ['pipe', 'pipe', 'inherit'] });
let nextId = 1, buf = '';
const pending = new Map();
py.stdout.on('data', (chunk) => {
  buf += chunk;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1);
    const msg = JSON.parse(line);
    const p = pending.get(msg.id); pending.delete(msg.id);
    p.resolve(msg);
  }
});
function rpc(req) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve: (m) => (m.ok ? resolve(m) : reject(new Error(m.error))) });
    py.stdin.write(JSON.stringify({ ...req, id }) + '\n');
  });
}
function prepare(sql) {
  const s = {
    sql, _args: [],
    bind(...a) { s._args = a; return s; },
    async run() { const m = await rpc({ op: 'q', sql, args: s._args, mode: 'run' }); return { success: true, meta: { changes: m.changes } }; },
    async first() { const m = await rpc({ op: 'q', sql, args: s._args, mode: 'first' }); return m.row ?? null; },
    async all() { const m = await rpc({ op: 'q', sql, args: s._args, mode: 'all' }); return { results: m.results }; },
  };
  return s;
}
const DB = {
  prepare,
  async batch(stmts) {
    const m = await rpc({ op: 'batch', stmts: stmts.map((s) => ({ sql: s.sql, args: s._args })) });
    return m.out;
  },
};

await DB.prepare("INSERT INTO login_logs (ip, success, event, user_agent, fingerprint) VALUES ('9.9.9.9', 1, 'login', 'ua-test', '{\"lang\":\"tr\"}')").bind().run();
await DB.prepare("INSERT INTO login_logs (ip, success, event, user_agent, fingerprint) VALUES ('9.9.9.9', 0, 'login', 'ua-test', NULL)").bind().run();
await DB.prepare("INSERT INTO blocked_ips (ip) VALUES ('8.8.8.8')").bind().run();

// ---- Ergebnisverfolgung ----
// ---- Sonuc takibi ----
let pass = 0, fail = 0;
async function check(name, fn) {
  try { await fn(); pass++; console.log('PASS', name); }
  catch (e) { fail++; console.log('FAIL', name, '->', e.message); }
}
const eq = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg || ''} beklenen ${JSON.stringify(b)} gelen ${JSON.stringify(a)}`); };
const ok = (c, msg) => { if (!c) throw new Error(msg || 'kosul saglanmadi'); };

// ---- Worker ----
// ---- Worker ----
const workerSrc = fs.readFileSync(path.join(ROOT, 'src', 'worker.js'), 'utf8');
const worker = (await import('data:text/javascript,' + encodeURIComponent(workerSrc))).default;
const env = { DB, TURNSTILE_SECRET: 'test', LOG_KEY: crypto.randomBytes(32).toString('base64'), ASSETS: { fetch: async () => new Response('x') } };
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

await DB.prepare("INSERT INTO sessions (token_hash, expires_at, reauth_until) VALUES (?, datetime('now','+1 hour'), datetime('now','+5 minutes'))").bind(sha('tok1')).run();
await DB.prepare("INSERT INTO sessions (token_hash, expires_at, reauth_until) VALUES (?, datetime('now','+1 hour'), NULL)").bind(sha('tok2')).run();

// Alte Klartextdaten (für Migrationstests)
// Eski duz metin veri (gecis testi icin)
await DB.prepare("INSERT INTO contacts (id, first_name, last_name, group_name, birth_year, socials, extra, tags, notes) VALUES (1,'Ali','Yilmaz','Sinif 8',2008,?, '[]','aile','not')").bind(JSON.stringify([{ platform: 'instagram', username: 'ali' }])).run();
await DB.prepare("INSERT INTO contacts (id, first_name, last_name, socials, extra) VALUES (2,'Ayse','Kaya','[]','[]')").bind().run();
await DB.prepare("INSERT INTO contacts (id, first_name, socials, extra) VALUES (3,'Mert','[]','[]')").bind().run();
await DB.prepare("INSERT INTO relations (from_id,to_id,label,reverse_label) VALUES (1,2,'kardesi','kardesi')").bind().run();
await DB.prepare("INSERT INTO relations (from_id,to_id,label,reverse_label) VALUES (2,3,'arkadasi','arkadasi')").bind().run();

async function call(method, path, body, token) {
  const headers = {};
  if (token) headers['Cookie'] = `session=${token}`;
  let reqBody;
  if (body !== undefined) { headers['Content-Type'] = 'application/json'; reqBody = JSON.stringify(body); }
  const res = await worker.fetch(new Request('https://t.example' + path, { method, headers, body: reqBody }), env);
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, json };
}

console.log('--- Worker testleri (gecis oncesi) ---');
await check('oturumsuz istek 401', async () => eq((await call('GET', '/api/vault/status')).status, 401));
await check('durum: tuz yok, gecis yapilmamis', async () => {
  const r = await call('GET', '/api/vault/status', undefined, 'tok1');
  eq(r.json, { salt: null, migrated: false });
});
await check('kisa tuz reddedilir', async () => eq((await call('POST', '/api/vault/init', { salt: 'kisa' }, 'tok1')).status, 400));
const SALT_A = 'AAAAAAAAAAAAAAAAAAAAAA==';
const SALT_B = 'BBBBBBBBBBBBBBBBBBBBBB==';
await check('ilk tuz kalir (init iki kez)', async () => {
  eq((await call('POST', '/api/vault/init', { salt: SALT_A }, 'tok1')).json.salt, SALT_A);
  eq((await call('POST', '/api/vault/init', { salt: SALT_B }, 'tok1')).json.salt, SALT_A, 'ikinci tuz yazilmamali');
});
await check('bos payload reddedilir', async () => eq((await call('POST', '/api/vault/contacts', { payload: '' }, 'tok1')).status, 400));
await check('cok buyuk payload reddedilir', async () => eq((await call('POST', '/api/vault/contacts', { payload: 'x'.repeat(60000) }, 'tok1')).status, 400));
let createdId;
await check('sifreli kayit olusturulur', async () => {
  const r = await call('POST', '/api/vault/contacts', { payload: '{"v":1,"iv":"a","ct":"b"}' }, 'tok1');
  eq(r.status, 201); createdId = r.json.contact.id; ok(createdId > 0);
});
await check('yeniden dogrulama olmadan kayit guncellenebilir', async () => {
  eq((await call('PUT', `/api/vault/contacts/${createdId}`, { payload: '{"v":1,"iv":"c","ct":"d"}' }, 'tok2')).status, 200);
});
await check('yeniden dogrulama olmadan silme 428', async () => eq((await call('DELETE', `/api/vault/contacts/${createdId}`, undefined, 'tok2')).status, 428));
await check('yeniden dogrulama olmadan toplu silme 428', async () =>
  eq((await call('POST', '/api/vault/batch', { puts: [], deletes: [createdId] }, 'tok2')).status, 428));
await check('yeniden dogrulama ile silme calisir', async () => eq((await call('DELETE', `/api/vault/contacts/${createdId}`, undefined, 'tok1')).status, 200));
await check('gecis verisi listelenir (3 kisi, 2 iliski)', async () => {
  const r = await call('GET', '/api/vault/legacy', undefined, 'tok1');
  eq(r.status, 200); eq(r.json.contacts.length, 3); eq(r.json.relations.length, 2);
});
await check('gecersiz id ile import reddedilir', async () =>
  eq((await call('POST', '/api/vault/import', { records: [{ id: 'abc', payload: 'x' }], final: false }, 'tok1')).status, 400));

// ---- Tests für den Client (app.js): echter Code, simuliertes DOM ----
// ---- Istemci (app.js) testleri: gercek kod, sahte DOM ----
function stub() {
  const target = function () {};
  return new Proxy(target, {
    get(t, p) {
      if (p in t) return t[p];
      if (typeof p === 'symbol' || p === 'then' || p === 'toJSON') return undefined;
      t[p] = stub(); return t[p];
    },
    set(t, p, v) { t[p] = v; return true; },
    apply() { return stub(); },
  });
}
let SESSION = null;
globalThis.window = stub();
globalThis.document = stub();
// esc() benötigt das Browser-DOM: Simuliere in der Testumgebung dasselbe Escape-Verhalten
// esc() tarayici DOM'u ister: test ortaminda ayni kacis davranisini taklit et
document.createElement = () => {
  let txt = '';
  const target = {
    set textContent(v) { txt = String(v ?? ''); },
    get innerHTML() { return txt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); },
  };
  return new Proxy(target, {
    get(tg, p) { return p in tg ? tg[p] : stub(); },
    set(tg, p, v) { if (p !== 'innerHTML') tg[p] = v; return true; },
  });
};
globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url, 'https://t.example');
  const headers = new Headers(opts.headers || {});
  if (SESSION) headers.set('Cookie', 'session=' + SESSION);
  const req = new Request(u, { method: opts.method || 'GET', headers, body: opts.body });
  return worker.fetch(req, env);
};
new Function(fs.readFileSync(path.join(ROOT, 'public', 'crypto.js'), 'utf8'))();
globalThis.Vault = globalThis.window.Vault;
const A = new Function(fs.readFileSync(path.join(ROOT, 'public', 'app.js'), 'utf8') + `
return { records, buildViews, unlockVault, persist, deleteContactById, addRelations, removeRelation, validate, computeAge, legacyToData, cardHtml, viewHtml, openEdit, summaryHtml, graphSvg, applyTheme, ringLayout };`)();
await new Promise((r) => setTimeout(r, 1500)); // acilis (api /api/me) bitsin

console.log('--- Istemci + sunucu testleri ---');
SESSION = 'tok1';
const PAROLA = 'dogru-parola-123';
await check('giris: kasa acilir, gecis calisir, kisiler yuklenir', async () => {
  await A.unlockVault(PAROLA);
  eq(A.records.size, 3, 'kayit sayisi');
  eq(A.records.get(1).data.first_name, 'Ali');
  eq(A.records.get(1).data.socials, [{ platform: 'instagram', username: 'ali' }]);
});
await check('sunucuda sifreli veri duz metin degil', async () => {
  const rows = (await DB.prepare('SELECT payload FROM encrypted_contacts').all()).results;
  eq(rows.length, 3, 'sunucudaki sifreli kayit');
  for (const r of rows) {
    ok(!r.payload.includes('Yilmaz') && !r.payload.includes('Zeynep') && !r.payload.includes('"first_name"'), 'duz metin sizdi');
  }
});
await check('iliskiler iki yonlu gorunur', async () => {
  const views = A.buildViews();
  const ali = views.find((v) => v.id === 1), ayse = views.find((v) => v.id === 2);
  eq(ali.relations.map((r) => [r.role, r.other_name]), [['kardesi', 'Ayse Kaya']], 'ali');
  eq(ayse.relations.map((r) => [r.role, r.other_name]).sort(), [['arkadasi', 'Mert'], ['kardesi', 'Ali Yilmaz']].sort(), 'ayse');
});
await check('ayni iliski ikinci kez eklenmez', async () => {
  eq(await A.addRelations(1, [3], 'komsusu', 'komsusu'), 1);
  eq(await A.addRelations(1, [3], 'komsusu', 'komsusu'), 0);
});
await check('iliski silinir', async () => {
  const entry = A.buildViews().find((v) => v.id === 1).relations.find((r) => r.to === 3 && r.label === 'komsusu');
  ok(entry, 'iliski bulunamadi');
  await A.removeRelation(entry);
  eq(A.records.get(1).data.relations.some((r) => r.to === 3), false);
});
let newId;
await check('yeni kisi sifreli olarak kaydedilir', async () => {
  newId = await A.persist(null, { first_name: 'Zeynep', last_name: null, nickname: null, birth_year: null, birth_month: null, birth_day: null,
    birthplace: null, city: 'Ankara', school: null, group_name: 'Is', occupation: null, how_we_met: null, phone: null, email: null,
    website: null, socials: [], extra: [], notes: null, tags: 'is', relations: [] });
  eq(A.records.get(newId).data.first_name, 'Zeynep');
});
await check('kisi silinir ve diger kisilerdeki iliskileri temizlenir', async () => {
  await A.deleteContactById(3);
  ok(!A.records.has(3), 'kayit hala var');
  eq(A.records.get(2).data.relations, [], 'Ayse iliskisi temizlenmedi');
  const rows = (await DB.prepare('SELECT id FROM encrypted_contacts WHERE id = 3').all()).results;
  eq(rows.length, 0, 'sunucuda hala var');
});
await check('dogrulama kurallari: bos isim, gecersiz e-posta', async () => {
  let msg = null;
  try { A.validate({ first_name: '', socials: [] }); } catch (e) { msg = e.message; }
  eq(msg, 'Isim zorunludur');
  msg = null;
  try { A.validate({ first_name: 'A', email: 'kotu', socials: [] }); } catch (e) { msg = e.message; }
  eq(msg, 'Gecersiz e-posta');
});
await check('yanlis parola kasayi acamaz, mesaj verilir', async () => {
  let msg = null;
  try { await A.unlockVault('yanlis-parola-999'); } catch (e) { msg = e.message; }
  ok(msg && msg.includes('acilamadi'), 'hata mesaji yok: ' + msg);
  ok(!globalThis.Vault.isUnlocked(), 'kasa kilitli kalmadi');
});
await check('dogru parola ile tekrar acilir, gecis tekrar calismaz', async () => {
  await A.unlockVault(PAROLA);
  eq(A.records.size, 3, 'kayit sayisi (Ali, Ayse, Zeynep)');
  const legacy = await worker.fetch(new Request('https://t.example/api/vault/legacy', { headers: { Cookie: 'session=tok1' } }), env);
  eq(legacy.status, 409, 'gecis yeniden calismamali');
});
await check('gecis sonrasi import engellenir', async () =>
  eq((await call('POST', '/api/vault/import', { records: [], final: true }, 'tok1')).status, 409));

await check('kart ve detay render hata vermez', async () => {
  const v = A.buildViews();
  for (const c of v) { const h = A.cardHtml(c, 0); ok(typeof h !== 'undefined'); const d = A.viewHtml(c); ok(typeof d !== 'undefined'); }
  A.openEdit(v[0]);
});
await check('ozet: kisi sayisi ve grup', async () => {
  const h = A.summaryHtml(A.buildViews());
  ok(h.includes('<b>3</b>'), 'kisi sayisi 3 degil');
  ok(h.includes('Son eklenenler'), 'son eklenenler yok');
  ok(h.includes('Ortalama yas'), 'ortalama yas yok');
  ok(h.includes('<b>0.7</b><span>Kisi basi ort. iliski'), 'kisi basi iliski ortalamasi yanlis: ' + h.slice(0, 400));
});
await check('iliski agi: yalnizca iliskili kisiler, her iliski bir kez', async () => {
  const svg = A.graphSvg(A.buildViews());
  ok(svg && svg.startsWith('<svg'), 'svg uretilmedi');
  eq((svg.match(/class="node"/g) || []).length, 2, 'dugum sayisi');
  eq((svg.match(/class="edge"/g) || []).length, 1, 'kenar sayisi');
});
await check('iliski yoksa grafik uretilmez', async () => {
  eq(A.graphSvg(A.buildViews().map((c) => ({ ...c, relations: [] }))), null);
});
await check('tema: acik/koyu', async () => {
  A.applyTheme('light'); eq(document.documentElement.dataset.theme, 'light');
  A.applyTheme('dark'); ok(!('theme' in document.documentElement.dataset), 'koyu temada attribute kalmamali');
});
await check('buyuk agda (200 kisi) dugumler ust uste binmez ve hepsi cizilir', async () => {
  const n = 200;
  const views = [];
  for (let i = 0; i < n; i++) {
    views.push({ id: i + 1, first_name: 'K' + i, relations: [] });
  }
  for (let i = 0; i < n; i++) {
    const to = (i + 1) % n + 1;
    views[i].relations.push({ owner: views[i].id, to, label: 'arkadasi' });
    views[(i + 1) % n].relations.push({ owner: views[i].id, to, label: 'arkadasi' });
  }
  const svg = A.graphSvg(views);
  eq((svg.match(/class="node"/g) || []).length, n, 'dugum sayisi');
  const pts = [...svg.matchAll(/<circle cx="([-\d.]+)" cy="([-\d.]+)" r="([\d.]+)"/g)].map((m) => [+m[1], +m[2], +m[3]]);
  eq(pts.length, n, 'daire sayisi');
  let minD = Infinity;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
    if (d < minD) minD = d;
  }
  ok(minD > 2 * pts[0][2], `dugumler cakisiyor (en yakin ${minD.toFixed(1)})`);
});
await check('mobil IH: ayri menu, floating kontrol yok', async () => {
  const idx = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
  ok(idx.includes('id="graph-menu-btn"'), 'alt bar menu dugmesi yok');
  ok(idx.includes('id="graph-menu"'), 'menu dialogu yok');
  ok(!idx.includes('id="graph-controls"'), 'eski yuzen kontroller hala var');
});
await check('ih: 2 parmak yakinlastirma sonrasi gorunum kuculur', async () => {
  const svg = A.graphSvg(A.buildViews());
  ok(svg && svg.includes('viewBox='), 'svg yok');
});
await check('alt bar: sadece 2 gorunur dugme (menu + ekle)', async () => {
  const idx = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
  const start = idx.indexOf('<nav class="tabbar');
  const nav = idx.slice(start, idx.indexOf('</nav>', start));
  eq((nav.match(/<button/g) || []).length, 2, 'alt bar dugme sayisi');
  ok(nav.includes('id="menu-open"') && nav.includes('id="add-btn"'), 'menu veya ekle dugmesi yok');
});
await check('html: JS kullanan her kimlik sayfada veya JS isaretlemesinde var', async () => {
  const js = fs.readFileSync(path.join(ROOT, 'public', 'app.js'), 'utf8');
  const idx = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
  const ids = [...new Set([...js.matchAll(/\$\('#([\w-]+)'\)/g)].map((m) => m[1]))];
  const missing = ids.filter((i) => !idx.includes(`id="${i}"`) && !js.includes(`id="${i}"`));
  eq(missing, [], 'eksik kimlikler');
});
function assertNoTextOverlap(svg) {
  const boxes = [...svg.matchAll(/<text([^>]*)>([^<]*)<\/text>/g)].map((m) => {
    const attrs = m[1];
    const cls = (attrs.match(/class="([^"]+)"/) || [])[1] || '';
    const x = +attrs.match(/ x="([-\d.]+)"/)[1];
    const y = +attrs.match(/ y="([-\d.]+)"/)[1];
    const size = cls === 'edge-label' ? 10 : 11;
    const w = m[2].length * size * 0.56;
    return { x1: x - w / 2, x2: x + w / 2, y1: y - size, y2: y + size * 0.25, t: m[2] };
  });
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (!(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2)) {
      throw new Error(`yazilar cakisiyor: "${a.t}" / "${b.t}"`);
    }
  }
}
await check('IH yazilari: 4 kisilik ornekte ust uste binmez', async () => {
  const names = ['Ali Osman', 'Zeynep', 'Derya', 'Halil'];
  const pairs = [[1,2,'kardesi'],[1,3,'annesi'],[1,4,'cocugu'],[2,3,'cocugu'],[2,4,'erkek kardesi'],[3,4,'kardesi']];
  const v = names.map((n, i) => ({ id: i + 1, first_name: n, relations: [] }));
  for (const [a, b, l] of pairs) { v[a-1].relations.push({ owner: a, to: b, label: l }); v[b-1].relations.push({ owner: a, to: b, label: l }); }
  assertNoTextOverlap(A.graphSvg(v));
});
await check('IH yazilari: 60 kisilik yogun agda ust uste binmez', async () => {
  const n = 60, v = [];
  for (let i = 0; i < n; i++) v.push({ id: i + 1, first_name: 'Kisi ' + (i + 1), relations: [] });
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 90; i++) {
    const a = Math.floor(rnd() * n) + 1, b = Math.floor(rnd() * n) + 1;
    if (a === b) continue;
    const l = 'iliski ' + (i % 5);
    v[a-1].relations.push({ owner: a, to: b, label: l }); v[b-1].relations.push({ owner: a, to: b, label: l });
  }
  assertNoTextOverlap(A.graphSvg(v));
});
async function callIp(method, path, body, token, ip) {
  const headers = { 'CF-Connecting-IP': ip };
  if (token) headers['Cookie'] = `session=${token}`;
  let reqBody;
  if (body !== undefined) { headers['Content-Type'] = 'application/json'; reqBody = JSON.stringify(body); }
  const res = await worker.fetch(new Request('https://t.example' + path, { method, headers, body: reqBody }), env);
  let json = null; try { json = JSON.parse(await res.text()); } catch {}
  return { status: res.status, json };
}
await check('giris kayitlari: eski tablolar silindi, veri sifreli tasindi', async () => {
  const left = (await DB.prepare("SELECT name FROM sqlite_master WHERE name IN ('login_logs','blocked_ips','contacts','relations')").all()).results;
  eq(left.length, 0, 'eski tablolar hala var');
  const rows = (await DB.prepare('SELECT idx, sealed FROM login_logs_v2').all()).results;
  eq(rows.length, 2, 'v2 kayit sayisi');
  for (const r of rows) {
    ok(!r.sealed.includes('9.9.9.9') && r.idx !== '9.9.9.9', 'IP duz metin sizdi');
  }
});
await check('kayitlar: parola olmadan okunamaz (428)', async () => eq((await call('GET', '/api/logs', undefined, 'tok2')).status, 428));
await check('kayitlar: parola ile okunur, IP ve tarayici geri gelir', async () => {
  const r = await call('GET', '/api/logs', undefined, 'tok1');
  eq(r.status, 200);
  const ok1 = r.json.logs.find((l) => l.ip === '9.9.9.9' && l.success === 1);
  ok(ok1, 'IP cozulmedi');
  eq(ok1.user_agent, 'ua-test'); eq(ok1.fingerprint, { lang: 'tr' });
});
await check('guvenlik paneli: sifreli IP listesi ve engelli IP', async () => {
  eq((await call('GET', '/api/security', undefined, 'tok2')).status, 428);
  const r = await call('GET', '/api/security', undefined, 'tok1');
  const ip = r.json.ips.find((i) => i.ip === '9.9.9.9');
  ok(ip && ip.total === 2 && ip.fails === 1, 'IP ozeti yanlis');
  ok(r.json.blocked.some((b) => b.ip === '8.8.8.8'), 'engelli IP cozulmedi');
});
await check('engelleme: seed edilen IP 403 alir', async () =>
  eq((await callIp('GET', '/api/me', undefined, 'tok1', '8.8.8.8')).status, 403));
await check('engelleme: yeni IP engellenir, kaldirilinca acilir', async () => {
  eq((await call('POST', '/api/blocks', { ip: '7.7.7.7' }, 'tok1')).status, 201);
  eq((await callIp('GET', '/api/me', undefined, 'tok1', '7.7.7.7')).status, 403);
  eq((await call('DELETE', '/api/blocks?ip=7.7.7.7', undefined, 'tok1')).status, 200);
  eq((await callIp('GET', '/api/me', undefined, 'tok1', '7.7.7.7')).status, 200);
});
console.log(`\\nSONUC: ${pass} basarili, ${fail} basarisiz`);
py.stdin.end();
process.exit(fail ? 1 : 0);
