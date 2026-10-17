const PBKDF2_ITER = 100000;
const SESSION_HOURS = 8;
const REAUTH_MINUTES = 5;
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;
const RATE_PER_MINUTE = 120;
const BULK_MAX = 90;
const USER_RE = /^[A-Za-z0-9._-]{1,100}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const PHONE_RE = /^[+0-9 ()-]{0,30}$/;

const SOCIAL = {
  instagram: { slug: 'instagram', re: USER_RE, url: (u) => `https://instagram.com/${u}` },
  x: { slug: 'x', re: USER_RE, url: (u) => `https://x.com/${u}` },
  twitter: { slug: 'x', re: USER_RE, url: (u) => `https://x.com/${u}` },
  linkedin: { slug: 'linkedin', re: USER_RE, url: (u) => `https://www.linkedin.com/in/${u}` },
  facebook: { slug: 'facebook', re: USER_RE, url: (u) => `https://facebook.com/${u}` },
  github: { slug: 'github', re: USER_RE, url: (u) => `https://github.com/${u}` },
  tiktok: { slug: 'tiktok', re: USER_RE, url: (u) => `https://www.tiktok.com/@${u}` },
  youtube: { slug: 'youtube', re: USER_RE, url: (u) => `https://www.youtube.com/@${u}` },
  snapchat: { slug: 'snapchat', re: USER_RE, url: (u) => `https://www.snapchat.com/add/${u}` },
  whatsapp: { slug: 'whatsapp', re: /^\+?[0-9]{6,15}$/, clean: (u) => u.replace(/\D/g, ''), url: (u) => `https://wa.me/${u}` },
  telegram: { slug: 'telegram', re: USER_RE, url: (u) => `https://t.me/${u}` },
  pinterest: { slug: 'pinterest', re: USER_RE, url: (u) => `https://www.pinterest.com/${u}` },
  reddit: { slug: 'reddit', re: USER_RE, url: (u) => `https://www.reddit.com/user/${u}` },
  twitch: { slug: 'twitch', re: USER_RE, url: (u) => `https://www.twitch.tv/${u}` },
  threads: { slug: 'threads', re: USER_RE, url: (u) => `https://www.threads.net/@${u}` },
  bluesky: { slug: 'bluesky', re: USER_RE, url: (u) => `https://bsky.app/profile/${u}` },
  medium: { slug: 'medium', re: USER_RE, url: (u) => `https://medium.com/@${u}` },
};

const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' https://challenges.cloudflare.com https://unpkg.com; style-src 'self' https://unpkg.com; " +
    "img-src 'self' data: https://cdn.simpleicons.org https://*.tile.openstreetmap.org; connect-src 'self' https://challenges.cloudflare.com https://photon.komoot.io; " +
    "frame-src https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
  'Cache-Control': 'no-store',
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/')) {
        return withSecurityHeaders(await handleApi(request, env, url));
      }
      return withSecurityHeaders(await env.ASSETS.fetch(request));
    } catch (err) {
      if (err instanceof HttpError) {
        return withSecurityHeaders(json({ error: err.message, code: err.status === 428 ? 'REAUTH' : undefined }, err.status));
      }
      console.error('Unhandled error:', err);
      return withSecurityHeaders(json({ error: 'Sunucu hatasi' }, 500));
    }
  },
};

function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

async function handleApi(request, env, url) {
  const { pathname } = url;
  const method = request.method;
  const ip = clientIp(request);

  if (method !== 'GET') {
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) throw new HttpError(403, 'Istek reddedildi');
    if (!(request.headers.get('Content-Type') || '').includes('application/json') && method !== 'DELETE') {
      throw new HttpError(415, 'Gecersiz istek');
    }
  }

  await migrateSecurity(env);
  if (await isBlocked(env, ip)) throw new HttpError(403, 'Bu adres engellendi');
  await rateLimit(env, ip);

  if (pathname === '/api/login' && method === 'POST') return login(request, env, ip);
  if (pathname === '/api/logout' && method === 'POST') return logout(request, env);

  const session = await requireSession(request, env);
  if (!session) throw new HttpError(401, 'Yetkisiz');
  const requireFresh = () => {
    if (!session.fresh) throw new HttpError(428, 'Bu islem icin sifrenizi tekrar girin');
  };

  if (pathname === '/api/reauth' && method === 'POST') return reauth(request, env, ip, session);
  if (pathname === '/api/me' && method === 'GET') return json({ ok: true });
  // Kayitlar ve IP listesi sifreli: okumak icin yeniden parola gerekir
  if (pathname === '/api/logs' && method === 'GET') {
    requireFresh();
    return listLogs(env, url);
  }
  if (pathname === '/api/security' && method === 'GET') {
    requireFresh();
    return securityOverview(env);
  }
  if (pathname === '/api/blocks' && method === 'POST') {
    requireFresh();
    return blockIp(request, env, ip);
  }
  if (pathname === '/api/blocks' && method === 'DELETE') {
    requireFresh();
    return unblockIp(env, url);
  }
  if (pathname === '/api/vault/status' && method === 'GET') return vaultStatus(env);
  if (pathname === '/api/vault/init' && method === 'POST') return vaultInit(request, env);
  if (pathname === '/api/vault/contacts' && method === 'GET') return vaultList(env);
  if (pathname === '/api/vault/contacts' && method === 'POST') return vaultCreate(request, env);
  if (pathname === '/api/vault/batch' && method === 'POST') return vaultBatch(request, env, session.fresh);
  if (pathname === '/api/vault/legacy' && method === 'GET') return vaultLegacy(env);
  if (pathname === '/api/vault/import' && method === 'POST') return vaultImport(request, env);

  const vaultMatch = pathname.match(/^\/api\/vault\/contacts\/(\d+)$/);
  if (vaultMatch) {
    const id = Number(vaultMatch[1]);
    if (method === 'PUT') return vaultPut(request, env, id);
    if (method === 'DELETE') {
      requireFresh();
      return vaultDelete(env, id);
    }
  }

  throw new HttpError(404, 'Bulunamadi');
}

// ---------- Sifreli kasa (istemci tarafli AES-GCM) ----------
// Sunucu kisi verisini sadece sifreli payload olarak saklar; cozme anahtari tarayicidadir.

const PAYLOAD_MAX = 50000;
const VAULT_BATCH_MAX = 500;

function checkPayload(p) {
  if (typeof p !== 'string' || p.length === 0 || p.length > PAYLOAD_MAX) {
    throw new HttpError(400, 'Gecersiz sifreli veri');
  }
  return p;
}

function checkId(v) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new HttpError(400, 'Gecersiz kayit');
  return n;
}

async function isMigrated(env) {
  const m = await env.DB.prepare("SELECT name FROM migrations WHERE name = 'contacts_v1'").first();
  return !!m;
}

async function vaultStatus(env) {
  const v = await env.DB.prepare('SELECT salt FROM vault WHERE id = 1').first();
  return json({ salt: v ? v.salt : null, migrated: await isMigrated(env) });
}

async function vaultInit(request, env) {
  const body = await readJson(request);
  const salt = typeof body.salt === 'string' && body.salt.length >= 16 && body.salt.length <= 64 ? body.salt : null;
  if (!salt) throw new HttpError(400, 'Gecersiz tuz');
  // Ilk yazilan tuz kalir; sonraki isteklerde ayni tuz geri doner.
  await env.DB.prepare('INSERT OR IGNORE INTO vault (id, salt) VALUES (1, ?)').bind(salt).run();
  const row = await env.DB.prepare('SELECT salt FROM vault WHERE id = 1').first();
  return json({ salt: row.salt });
}

async function vaultList(env) {
  const { results } = await env.DB.prepare(
    'SELECT id, payload, updated_at FROM encrypted_contacts ORDER BY id LIMIT ?'
  ).bind(VAULT_BATCH_MAX * 10).all();
  return json({ contacts: results });
}

async function vaultCreate(request, env) {
  const body = await readJson(request);
  const payload = checkPayload(body.payload);
  const row = await env.DB.prepare(
    'INSERT INTO encrypted_contacts (payload) VALUES (?) RETURNING id, payload, updated_at'
  ).bind(payload).first();
  return json({ contact: row }, 201);
}

async function vaultPut(request, env, id) {
  const body = await readJson(request);
  const payload = checkPayload(body.payload);
  const row = await env.DB.prepare(
    "UPDATE encrypted_contacts SET payload = ?, updated_at = datetime('now') WHERE id = ? RETURNING id, payload, updated_at"
  ).bind(payload, id).first();
  if (!row) throw new HttpError(404, 'Kisi bulunamadi');
  return json({ contact: row });
}

async function vaultDelete(env, id) {
  await env.DB.prepare('DELETE FROM encrypted_contacts WHERE id = ?').bind(id).run();
  return json({ ok: true });
}

// Birden fazla kisiyi tek atomik islemde gunceller/siler (iliski ve silme icin)
async function vaultBatch(request, env, fresh) {
  const body = await readJson(request);
  const puts = Array.isArray(body.puts) ? body.puts : [];
  const deletes = Array.isArray(body.deletes) ? body.deletes : [];
  if (puts.length + deletes.length === 0 || puts.length + deletes.length > VAULT_BATCH_MAX) {
    throw new HttpError(400, 'Gecersiz toplu islem');
  }
  // Silme islemi icin yeniden dogrulama gerekir
  if (deletes.length && !fresh) throw new HttpError(428, 'Bu islem icin sifrenizi tekrar girin');
  const stmts = [
    ...puts.map((p) => env.DB.prepare(
      "INSERT OR REPLACE INTO encrypted_contacts (id, payload, updated_at) VALUES (?, ?, datetime('now'))"
    ).bind(checkId(p.id), checkPayload(p.payload))),
    ...deletes.map((id) => env.DB.prepare('DELETE FROM encrypted_contacts WHERE id = ?').bind(checkId(id))),
  ];
  await env.DB.batch(stmts);
  return json({ ok: true });
}

// Eski duz metin kisiler (gecis icin, yalnizca migrasyon bitmediyse)
async function vaultLegacy(env) {
  if (await isMigrated(env)) throw new HttpError(409, 'Gecis zaten tamamlandi');
  const contacts = await env.DB.prepare('SELECT * FROM contacts ORDER BY id').all();
  const relations = await env.DB.prepare('SELECT * FROM relations ORDER BY id').all();
  return json({ contacts: contacts.results, relations: relations.results });
}

// Gecis: istemci duz metni sifreleyip gonderir. final=true olunca bir daha calismaz.
async function vaultImport(request, env) {
  if (await isMigrated(env)) throw new HttpError(409, 'Gecis zaten tamamlandi');
  const body = await readJson(request);
  const records = Array.isArray(body.records) ? body.records : [];
  if (records.length > VAULT_BATCH_MAX) throw new HttpError(400, 'Cok fazla kayit');
  const stmts = records.map((r) => env.DB.prepare(
    "INSERT OR REPLACE INTO encrypted_contacts (id, payload, updated_at) VALUES (?, ?, datetime('now'))"
  ).bind(checkId(r.id), checkPayload(r.payload)));
  if (body.final === true) {
    stmts.push(env.DB.prepare("INSERT OR IGNORE INTO migrations (name) VALUES ('contacts_v1')"));
  }
  if (stmts.length) await env.DB.batch(stmts);
  return json({ imported: records.length, done: body.final === true }, 201);
}

// ---------- Giris kayitlari: sunucu anahtariyla sifreli, IP icin geri okunamaz arama kodu ----------
// LOG_KEY (Worker secret) -> HKDF ile sifreleme anahtari ve arama kodu anahtari turetilir.

let logKeyCache = null;

async function logKeys(env) {
  if (!env.LOG_KEY) throw new HttpError(500, 'Kayit anahtari yapilandirilmamis');
  if (logKeyCache) return logKeyCache;
  const master = await crypto.subtle.importKey('raw', unb64(env.LOG_KEY), 'HKDF', false, ['deriveKey', 'deriveBits']);
  const enc = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: new TextEncoder().encode('log-enc') },
    master, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
  const macBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: new TextEncoder().encode('log-idx') }, master, 256
  );
  const mac = await crypto.subtle.importKey('raw', macBits, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  logKeyCache = { enc, mac };
  return logKeyCache;
}

async function ipIndex(env, ip) {
  const { mac } = await logKeys(env);
  const sig = await crypto.subtle.sign('HMAC', mac, new TextEncoder().encode(String(ip)));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sealLog(env, obj) {
  const { enc } = await logKeys(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, enc, new TextEncoder().encode(JSON.stringify(obj)));
  return JSON.stringify({ v: 1, iv: b64(iv), ct: b64(ct) });
}

async function openLog(env, sealed) {
  if (!sealed) return {};
  const { enc } = await logKeys(env);
  const { iv, ct } = JSON.parse(sealed);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, enc, unb64(ct));
  return JSON.parse(new TextDecoder().decode(pt));
}

// Eski duz metin giris ve engel kayitlarini sifreli tablolara tasir, eski tablolari siler.
// Tek seferlik; islem tek batch icinde (ya hepsi ya hicbiri).
async function migrateSecurity(env) {
  const done = await env.DB.prepare("SELECT name FROM migrations WHERE name = 'logs_v2'").first();
  if (!done) {
    const stmts = [];
    const hasLogs = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'login_logs'").first();
    if (hasLogs) {
      const { results: rows } = await env.DB.prepare(
        'SELECT ip, success, event, user_agent, fingerprint, created_at FROM login_logs ORDER BY id'
      ).all();
      for (const r of rows) {
        const sealed = await sealLog(env, { ip: r.ip, user_agent: r.user_agent, fingerprint: parseJsonSafe(r.fingerprint) });
        stmts.push(env.DB.prepare(
          'INSERT INTO login_logs_v2 (idx, success, event, sealed, created_at) VALUES (?, ?, ?, ?, ?)'
        ).bind(await ipIndex(env, r.ip), r.success, r.event, sealed, r.created_at));
      }
      stmts.push(env.DB.prepare('DROP TABLE login_logs'));
    }
    const hasBlocked = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'blocked_ips'").first();
    if (hasBlocked) {
      const { results: bl } = await env.DB.prepare('SELECT ip, created_at FROM blocked_ips').all();
      for (const b of bl) {
        stmts.push(env.DB.prepare(
          'INSERT OR IGNORE INTO blocked_ips_v2 (idx, sealed, created_at) VALUES (?, ?, ?)'
        ).bind(await ipIndex(env, b.ip), await sealLog(env, { ip: b.ip }), b.created_at));
      }
      stmts.push(env.DB.prepare('DROP TABLE blocked_ips'));
    }
    stmts.push(env.DB.prepare("INSERT OR IGNORE INTO migrations (name) VALUES ('logs_v2')"));
    await env.DB.batch(stmts);
  }
  await dropLegacyContacts(env);
}

// Eski duz metin kisi tablolari: yalnizca her kisinin sifreli karsiligi varsa silinir
async function dropLegacyContacts(env) {
  const done = await env.DB.prepare("SELECT name FROM migrations WHERE name = 'legacy_drop'").first();
  if (done) return;
  const hasContacts = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'contacts'").first();
  if (!hasContacts) {
    await env.DB.prepare("INSERT OR IGNORE INTO migrations (name) VALUES ('legacy_drop')").run();
    return;
  }
  const missing = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM contacts WHERE id NOT IN (SELECT id FROM encrypted_contacts)'
  ).first();
  if (missing.n > 0) return; // sifreli karsiligi olmayan kayit varsa hicbir sey silinmez
  await env.DB.batch([
    env.DB.prepare('DROP TABLE IF EXISTS relations'),
    env.DB.prepare('DROP TABLE IF EXISTS contacts'),
    env.DB.prepare("INSERT OR IGNORE INTO migrations (name) VALUES ('legacy_drop')"),
  ]);
}

async function rateLimit(env, ip) {
  const minute = Math.floor(Date.now() / 60000);
  const key = `${await ipIndex(env, ip)}:${minute}`;
  await env.DB.prepare(
    'INSERT INTO rate_limits (key, hits, window) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET hits = hits + 1'
  ).bind(key, minute).run();
  const row = await env.DB.prepare('SELECT hits FROM rate_limits WHERE key = ?').bind(key).first();
  if (row && row.hits > RATE_PER_MINUTE) throw new HttpError(429, 'Cok fazla istek. Biraz bekleyin.');
  if (Math.random() < 0.02) {
    await env.DB.prepare('DELETE FROM rate_limits WHERE window < ?').bind(minute - 5).run();
  }
}

async function isBlocked(env, ip) {
  const row = await env.DB.prepare('SELECT idx FROM blocked_ips_v2 WHERE idx = ?').bind(await ipIndex(env, ip)).first();
  return !!row;
}

// Konum izni zorunlu: konum yoksa giris yapilamaz
function hasGeo(body) {
  const g = body && body.fp && body.fp.geo;
  return !!g && typeof g.lat === 'number' && typeof g.lon === 'number'
    && Math.abs(g.lat) <= 90 && Math.abs(g.lon) <= 180;
}

function footprintJson(request, clientFp) {
  const cf = request.cf || {};
  const server = {
    country: cf.country || null,
    city: cf.city || null,
    region: cf.region || null,
    postal: cf.postalCode || null,
    asn: cf.asn || null,
    org: cf.asOrganization || null,
    colo: cf.colo || null,
    accept_language: (request.headers.get('Accept-Language') || '').slice(0, 120) || null,
    referer: (request.headers.get('Referer') || '').slice(0, 200) || null,
    tls: cf.tlsVersion || null,
    http: request.cf?.httpProtocol || null,
  };
  let client = null;
  if (clientFp && typeof clientFp === 'object') {
    client = JSON.parse(JSON.stringify(clientFp).slice(0, 3500));
  }
  return JSON.stringify({ client, server }).slice(0, 7000);
}

async function recordFootprint(env, request, ip, event, success, clientFp) {
  const ua = (request.headers.get('User-Agent') || '').slice(0, 300);
  const sealed = await sealLog(env, { ip, user_agent: ua, fingerprint: parseJsonSafe(footprintJson(request, clientFp)) });
  await env.DB.prepare(
    'INSERT INTO login_logs_v2 (idx, success, event, sealed) VALUES (?, ?, ?, ?)'
  ).bind(await ipIndex(env, ip), success ? 1 : 0, event, sealed).run();
}

async function recentFailCount(env, ip) {
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM login_logs_v2 WHERE idx = ? AND success = 0 AND created_at > datetime('now', ?)"
  ).bind(await ipIndex(env, ip), `-${LOCK_MINUTES} minutes`).first();
  return row.n;
}

async function verifyAdminPassword(env, username, password) {
  const admin = await env.DB.prepare('SELECT username, password_hash FROM admin WHERE id = 1').first();
  if (!admin) return false;
  if (password.length === 0 || password.length > 1024) return false;
  const userOk = username === null || timingSafeEqualStr(username, admin.username);
  const passOk = await verifyPassword(password, admin.password_hash);
  return userOk && passOk;
}

async function login(request, env, ip) {
  if ((await recentFailCount(env, ip)) >= MAX_FAILS) {
    throw new HttpError(429, 'Cok fazla hatali deneme. Lutfen daha sonra tekrar deneyin.');
  }

  const body = await readJson(request);
  if (!hasGeo(body)) {
    await recordFootprint(env, request, ip, 'login_no_geo', false, body.fp);
    throw new HttpError(403, 'Konum izni olmadan giris yapilamaz');
  }

  if (!(await verifyTurnstile(env, body.turnstile, ip))) {
    await recordFootprint(env, request, ip, 'login_bot', false, body.fp);
    throw new HttpError(403, 'Dogrulama basarisiz. Lutfen tekrar deneyin.');
  }

  const username = typeof body.username === 'string' ? body.username.trim().slice(0, 100) : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const ok = username.length > 0 && (await verifyAdminPassword(env, username, password));

  await recordFootprint(env, request, ip, 'login', ok, body.fp);
  if (!ok) throw new HttpError(401, 'Kullanici adi veya sifre hatali');

  await env.DB.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
  const token = randomToken();
  await env.DB.prepare(
    "INSERT INTO sessions (token_hash, expires_at, reauth_until) VALUES (?, datetime('now', ?), datetime('now', ?))"
  ).bind(await sha256(token), `+${SESSION_HOURS} hours`, `+${REAUTH_MINUTES} minutes`).run();

  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(token, SESSION_HOURS * 3600) });
}

// Cloudflare Turnstile dogrulamasi (sunucu tarafi)
async function verifyTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET) throw new HttpError(500, 'Dogrulama yapilandirilmamis');
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) return false;
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  if (ip && ip !== 'unknown') form.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  return data.success === true;
}

async function reauth(request, env, ip, session) {
  if ((await recentFailCount(env, ip)) >= MAX_FAILS) {
    throw new HttpError(429, 'Cok fazla hatali deneme. Lutfen daha sonra tekrar deneyin.');
  }
  const body = await readJson(request);
  if (!hasGeo(body)) {
    await recordFootprint(env, request, ip, 'reauth_no_geo', false, body.fp);
    throw new HttpError(403, 'Konum izni olmadan islem yapilamaz');
  }
  const password = typeof body.password === 'string' ? body.password : '';
  const ok = await verifyAdminPassword(env, null, password);
  await recordFootprint(env, request, ip, 'reauth', ok, body.fp);
  if (!ok) throw new HttpError(401, 'Sifre hatali');
  await env.DB.prepare("UPDATE sessions SET reauth_until = datetime('now', ?) WHERE token_hash = ?")
    .bind(`+${REAUTH_MINUTES} minutes`, session.token_hash).run();
  return json({ ok: true });
}

async function logout(request, env) {
  const token = getCookie(request, 'session');
  if (token) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
  }
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });
}

async function requireSession(request, env) {
  const token = getCookie(request, 'session');
  if (!token) return null;
  const row = await env.DB.prepare(
    "SELECT token_hash, (reauth_until IS NOT NULL AND reauth_until > datetime('now')) AS fresh FROM sessions WHERE token_hash = ? AND expires_at > datetime('now')"
  ).bind(await sha256(token)).first();
  if (!row) return null;
  return { token_hash: row.token_hash, fresh: !!row.fresh };
}

function parseJsonSafe(text) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

async function listLogs(env, url) {
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 40, 1), 200);
  const { results } = await env.DB.prepare(
    'SELECT id, success, event, sealed, created_at FROM login_logs_v2 ORDER BY id DESC LIMIT ?'
  ).bind(limit).all();
  const logs = [];
  for (const r of results) {
    const d = await openLog(env, r.sealed);
    logs.push({
      id: r.id, ip: d.ip, success: r.success, event: r.event,
      user_agent: d.user_agent, fingerprint: d.fingerprint ?? null, created_at: r.created_at,
    });
  }
  return json({ logs });
}

async function securityOverview(env) {
  const { results: groups } = await env.DB.prepare(
    `SELECT l.idx, COUNT(*) AS total,
            SUM(CASE WHEN l.success = 0 THEN 1 ELSE 0 END) AS fails,
            MAX(l.created_at) AS last_at,
            (SELECT 1 FROM blocked_ips_v2 b WHERE b.idx = l.idx) AS blocked
     FROM login_logs_v2 l GROUP BY l.idx ORDER BY last_at DESC LIMIT 100`
  ).all();
  const ips = [];
  for (const g of groups) {
    const sample = await env.DB.prepare('SELECT sealed FROM login_logs_v2 WHERE idx = ? LIMIT 1').bind(g.idx).first();
    const d = await openLog(env, sample.sealed);
    ips.push({ ip: d.ip, total: g.total, fails: g.fails, last_at: g.last_at, blocked: !!g.blocked });
  }
  const { results: bl } = await env.DB.prepare(
    'SELECT sealed, created_at FROM blocked_ips_v2 ORDER BY created_at DESC'
  ).all();
  const blocked = [];
  for (const b of bl) {
    const d = await openLog(env, b.sealed);
    blocked.push({ ip: d.ip, created_at: b.created_at });
  }
  const totals = await env.DB.prepare(
    'SELECT COUNT(*) AS total, SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS fails FROM login_logs_v2'
  ).first();
  return json({
    ips,
    blocked,
    totals: { total: totals.total || 0, fails: totals.fails || 0, blocked: blocked.length },
  });
}

async function blockIp(request, env, ownIp) {
  const body = await readJson(request);
  const ip = typeof body.ip === 'string' ? body.ip.trim() : '';
  if (!ip || ip.length > 64) throw new HttpError(400, 'Gecersiz IP adresi');
  if (ip === ownIp) throw new HttpError(400, 'Kendi IP adresinizi engelleyemezsiniz');
  await env.DB.prepare('INSERT OR IGNORE INTO blocked_ips_v2 (idx, sealed) VALUES (?, ?)')
    .bind(await ipIndex(env, ip), await sealLog(env, { ip })).run();
  return json({ ok: true }, 201);
}

async function unblockIp(env, url) {
  const ip = (url.searchParams.get('ip') || '').trim();
  if (!ip) throw new HttpError(400, 'IP gerekli');
  await env.DB.prepare('DELETE FROM blocked_ips_v2 WHERE idx = ?').bind(await ipIndex(env, ip)).run();
  return json({ ok: true });
}

async function verifyPassword(password, stored) {
  const [scheme, iterStr, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'pbkdf2') return false;
  const derived = await pbkdf2(password, unb64(saltB64), Number(iterStr));
  const expected = unb64(hashB64);
  if (derived.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < derived.length; i++) diff |= derived[i] ^ expected[i];
  return diff === 0;
}

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
  return new Uint8Array(bits);
}

function timingSafeEqualStr(a, b) {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}

async function listContacts(env, url) {
  const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
  const group = (url.searchParams.get('group') || '').trim().slice(0, 60);
  const where = [];
  const binds = [];
  if (q) {
    const like = `%${q}%`;
    where.push('(first_name LIKE ? OR last_name LIKE ? OR nickname LIKE ? OR city LIKE ? OR school LIKE ? OR group_name LIKE ? OR occupation LIKE ? OR tags LIKE ? OR email LIKE ?)');
    binds.push(like, like, like, like, like, like, like, like, like);
  }
  if (group) {
    where.push('group_name = ?');
    binds.push(group);
  }
  const sql = `SELECT * FROM contacts ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY first_name COLLATE NOCASE, last_name COLLATE NOCASE LIMIT 500`;
  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  return json({ contacts: results.map(formatContact) });
}

async function getContact(env, id) {
  const row = await findContact(env, id);
  const { results } = await env.DB.prepare(
    `SELECT r.id, r.from_id, r.to_id, r.label, r.reverse_label, r.note,
            c.first_name AS other_first, c.last_name AS other_last
     FROM relations r
     JOIN contacts c ON c.id = CASE WHEN r.from_id = ? THEN r.to_id ELSE r.from_id END
     WHERE r.from_id = ? OR r.to_id = ?
     ORDER BY r.id`
  ).bind(id, id, id).all();

  const relations = results.map((r) => {
    const iAmFrom = r.from_id === id;
    return {
      id: r.id,
      other_id: iAmFrom ? r.to_id : r.from_id,
      other_name: [r.other_first, r.other_last].filter(Boolean).join(' '),
      role: iAmFrom ? r.label : (r.reverse_label || r.label),
      note: r.note,
    };
  });
  return json({ contact: { ...formatContact(row), relations } });
}

async function createContact(request, env) {
  const data = sanitizeContact(await readJson(request));
  const row = await env.DB.prepare(
    `INSERT INTO contacts (first_name, last_name, nickname, birth_year, birth_month, birth_day, birthplace, city,
       school, group_name, occupation, how_we_met, phone, email, website, socials, extra, notes, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
  ).bind(...contactValues(data)).first();
  return json({ contact: formatContact(row) }, 201);
}

async function updateContact(request, env, id) {
  await findContact(env, id);
  const data = sanitizeContact(await readJson(request));
  const row = await env.DB.prepare(
    `UPDATE contacts SET first_name = ?, last_name = ?, nickname = ?, birth_year = ?, birth_month = ?, birth_day = ?,
       birthplace = ?, city = ?, school = ?, group_name = ?, occupation = ?, how_we_met = ?, phone = ?, email = ?,
       website = ?, socials = ?, extra = ?, notes = ?, tags = ?, updated_at = datetime('now')
     WHERE id = ? RETURNING *`
  ).bind(...contactValues(data), id).first();
  return json({ contact: formatContact(row) });
}

async function deleteContact(env, id) {
  await findContact(env, id);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM relations WHERE from_id = ? OR to_id = ?').bind(id, id),
    env.DB.prepare('DELETE FROM contacts WHERE id = ?').bind(id),
  ]);
  return json({ ok: true });
}

async function createRelation(request, env) {
  const body = await readJson(request);
  const fromId = Number(body.from_id);
  const toId = Number(body.to_id);
  if (!Number.isInteger(fromId) || !Number.isInteger(toId) || fromId === toId) {
    throw new HttpError(400, 'Gecersiz kisi secimi');
  }
  const label = typeof body.label === 'string' ? body.label.trim().slice(0, 60) : '';
  if (!label) throw new HttpError(400, 'Iliski etiketi zorunludur');
  const reverse = typeof body.reverse_label === 'string' ? body.reverse_label.trim().slice(0, 60) : '';

  await findContact(env, fromId);
  await findContact(env, toId);
  try {
    await env.DB.prepare(
      'INSERT INTO relations (from_id, to_id, label, reverse_label) VALUES (?, ?, ?, ?)'
    ).bind(fromId, toId, label, reverse || null).run();
  } catch {
    throw new HttpError(409, 'Bu iliski zaten var');
  }
  return json({ ok: true }, 201);
}

// Toplu iliski: secilen tum kisilerle tek seferde baglanti
async function bulkRelations(request, env) {
  const body = await readJson(request);
  const fromId = Number(body.from_id);
  const label = typeof body.label === 'string' ? body.label.trim().slice(0, 60) : '';
  const reverse = typeof body.reverse_label === 'string' ? body.reverse_label.trim().slice(0, 60) : '';
  const ids = Array.isArray(body.to_ids)
    ? [...new Set(body.to_ids.map(Number))].filter((n) => Number.isInteger(n) && n !== fromId).slice(0, BULK_MAX)
    : [];
  if (!Number.isInteger(fromId) || !ids.length || !label) throw new HttpError(400, 'Eksik bilgi');

  await findContact(env, fromId);
  const { results } = await env.DB.prepare(
    `SELECT id FROM contacts WHERE id IN (${ids.map(() => '?').join(',')})`
  ).bind(...ids).all();

  const stmts = results.map((r) =>
    env.DB.prepare('INSERT OR IGNORE INTO relations (from_id, to_id, label, reverse_label) VALUES (?, ?, ?, ?)')
      .bind(fromId, r.id, label, reverse || null)
  );
  if (stmts.length) await env.DB.batch(stmts);
  return json({ added: stmts.length }, 201);
}

async function deleteRelation(env, id) {
  await env.DB.prepare('DELETE FROM relations WHERE id = ?').bind(id).run();
  return json({ ok: true });
}

async function findContact(env, id) {
  const row = await env.DB.prepare('SELECT * FROM contacts WHERE id = ?').bind(id).first();
  if (!row) throw new HttpError(404, 'Kisi bulunamadi');
  return row;
}

function sanitizeContact(input) {
  if (!input || typeof input !== 'object') throw new HttpError(400, 'Gecersiz veri');

  const str = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
  const int = (v, min, max) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, 'Gecersiz tarih bilgisi');
    return n;
  };

  const firstName = str(input.first_name, 100);
  if (!firstName) throw new HttpError(400, 'Isim zorunludur');

  const email = str(input.email, 254);
  if (email && !EMAIL_RE.test(email)) throw new HttpError(400, 'Gecersiz e-posta');

  const phone = str(input.phone, 30);
  if (phone && !PHONE_RE.test(phone)) throw new HttpError(400, 'Gecersiz telefon');

  const website = str(input.website, 300);
  if (website) {
    try {
      const u = new URL(website);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error();
    } catch {
      throw new HttpError(400, 'Gecersiz web sitesi (http/https ile baslamali)');
    }
  }

  const socials = [];
  if (Array.isArray(input.socials)) {
    for (const s of input.socials.slice(0, 30)) {
      const platform = typeof s?.platform === 'string' ? s.platform.toLowerCase() : '';
      const cfg = SOCIAL[platform];
      if (!cfg) continue;
      let username = typeof s.username === 'string' ? s.username.trim().replace(/^@/, '') : '';
      if (cfg.clean) username = cfg.clean(username);
      if (!cfg.re.test(username)) throw new HttpError(400, `Gecersiz hesap bilgisi: ${platform}`);
      socials.push({ platform, username });
    }
  }

  const extra = [];
  if (Array.isArray(input.extra)) {
    for (const x of input.extra.slice(0, 25)) {
      const label = typeof x?.label === 'string' ? x.label.trim().slice(0, 40) : '';
      const value = typeof x?.value === 'string' ? x.value.trim().slice(0, 300) : '';
      if (label && value) extra.push({ label, value });
    }
  }

  return {
    first_name: firstName,
    last_name: str(input.last_name, 100),
    nickname: str(input.nickname, 60),
    birth_year: int(input.birth_year, 1900, new Date().getFullYear()),
    birth_month: int(input.birth_month, 1, 12),
    birth_day: int(input.birth_day, 1, 31),
    birthplace: str(input.birthplace, 100),
    city: str(input.city, 100),
    school: str(input.school, 120),
    group_name: str(input.group_name, 60),
    occupation: str(input.occupation, 100),
    how_we_met: str(input.how_we_met, 500),
    phone,
    email,
    website,
    socials,
    extra,
    notes: str(input.notes, 5000),
    tags: str(input.tags, 300),
  };
}

function contactValues(d) {
  return [
    d.first_name, d.last_name, d.nickname, d.birth_year, d.birth_month, d.birth_day, d.birthplace, d.city,
    d.school, d.group_name, d.occupation, d.how_we_met, d.phone, d.email, d.website,
    JSON.stringify(d.socials), JSON.stringify(d.extra), d.notes, d.tags,
  ];
}

function formatContact(row) {
  const socials = JSON.parse(row.socials || '[]').map((s) => {
    const cfg = SOCIAL[s.platform];
    return {
      platform: s.platform,
      username: s.username,
      url: cfg ? cfg.url(encodeURIComponent(s.username)) : null,
      icon: cfg ? `https://cdn.simpleicons.org/${cfg.slug}` : null,
    };
  });
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    nickname: row.nickname,
    birth_year: row.birth_year,
    birth_month: row.birth_month,
    birth_day: row.birth_day,
    age: computeAge(row),
    age_exact: !!(row.birth_year && row.birth_month && row.birth_day),
    birthplace: row.birthplace,
    city: row.city,
    school: row.school,
    group_name: row.group_name,
    occupation: row.occupation,
    how_we_met: row.how_we_met,
    phone: row.phone,
    email: row.email,
    website: row.website,
    socials,
    extra: parseJsonSafe(row.extra) || [],
    notes: row.notes,
    tags: row.tags,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function computeAge(row) {
  if (!row.birth_year) return null;
  const now = new Date();
  let age = now.getFullYear() - row.birth_year;
  if (row.birth_month) {
    const m = now.getMonth() + 1;
    const d = now.getDate();
    if (m < row.birth_month || (m === row.birth_month && row.birth_day && d < row.birth_day)) age--;
  }
  return age;
}

async function readJson(request) {
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) {
    throw new HttpError(415, 'JSON bekleniyor');
  }
  const text = await request.text();
  if (text.length > 100_000) throw new HttpError(413, 'Istek cok buyuk');
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Gecersiz JSON');
  }
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders },
  });
}

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
  return new Response(response.body, { status: response.status, headers });
}

function sessionCookie(token, maxAge) {
  return `session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  const match = header.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

async function sha256(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomToken() {
  return b64url(crypto.getRandomValues(new Uint8Array(32)));
}

function b64(bytes) {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s);
}

function b64url(bytes) {
  return b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64(s) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
