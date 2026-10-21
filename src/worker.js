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
  // Gunluk ozet: bekleyen kuyruk varsa abonelere bos push gonderilir.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sendDigest(env));
  },
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

const ADMIN_ONLY = /^\/api\/(logs|sessions|security|blocks|recovery\/rotate|passkey\/(register|delete|list)|vault\/(legacy|import))/;

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

  if (pathname === '/api/signup/start' && method === 'POST') return signupStart(request, env, ip, url);
  if (pathname === '/api/signup/finish' && method === 'POST') return signupFinish(request, env, ip, url);
  if (pathname === '/api/recovery/user' && method === 'POST') return userRecoveryLogin(request, env, ip);
  if (pathname === '/api/login' && method === 'POST') return login(request, env, ip);
  if (pathname === '/api/logout' && method === 'POST') return logout(request, env);
  if (pathname === '/api/passkey/login/options' && method === 'POST') return passkeyLoginOptions(env, url);
  if (pathname === '/api/passkey/login/verify' && method === 'POST') return passkeyLogin(request, env, ip, url);
  if (pathname === '/api/recovery/login' && method === 'POST') return recoveryLogin(request, env, ip, url);
  if (pathname === '/api/recovery/send' && method === 'POST') return recoverySend(request, env, ip);

  const session = await requireSession(request, env);
  if (!session) throw new HttpError(401, 'Yetkisiz');
  const requireFresh = () => {
    if (!session.fresh) throw new HttpError(428, 'Bu islem icin sifrenizi tekrar girin');
  };

  if (ADMIN_ONLY.test(pathname) && !session.is_admin) throw new HttpError(403, 'Yonetici yetkisi gerekli');
  if (pathname === '/api/reauth' && method === 'POST') return reauth(request, env, ip, session);
  if (pathname === '/api/me' && method === 'GET') return json({ ok: true });
  if (pathname === '/api/passkey/register/options' && method === 'POST') { requireFresh(); return passkeyRegisterOptions(env, url); }
  if (pathname === '/api/passkey/register/verify' && method === 'POST') { requireFresh(); return passkeyRegisterVerify(request, env, url, session.user_id); }
  if (pathname === '/api/passkey/list' && method === 'GET') return passkeyList(env);
  if (pathname === '/api/passkey/delete' && method === 'POST') { requireFresh(); return passkeyDelete(request, env); }
  if (pathname === '/api/recovery/rotate' && method === 'POST') { requireFresh(); return recoveryRotate(request, env); }
  if (pathname === '/api/user/recovery/rotate' && method === 'POST') { requireFresh(); return userRecoveryRotate(request, env, session); }
  if (pathname.startsWith('/api/push/')) return handlePush(request, env, url, { readJson, json, HttpError });
  // Kayitlar ve IP listesi sifreli: okumak icin yeniden parola gerekir
  if (pathname === '/api/logs' && method === 'GET') {
    requireFresh();
    return listLogs(env, url);
  }
  if (pathname === '/api/sessions' && method === 'GET') { requireFresh(); return listSessions(env, session); }
  if (pathname === '/api/sessions' && method === 'DELETE') { requireFresh(); return revokeSessions(request, env, session); }
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
  if (pathname === '/api/vault/status' && method === 'GET') return vaultStatus(env, session.user_id);
  if (pathname === '/api/vault/init' && method === 'POST') return vaultInit(request, env);
  if (pathname === '/api/vault/contacts' && method === 'GET') return vaultList(env, session.user_id);
  if (pathname === '/api/vault/contacts' && method === 'POST') return vaultCreate(request, env, session.user_id);
  if (pathname === '/api/vault/batch' && method === 'POST') return vaultBatch(request, env, session.fresh, session.user_id);
  if (pathname === '/api/vault/legacy' && method === 'GET') return vaultLegacy(env);
  if (pathname === '/api/vault/import' && method === 'POST') return vaultImport(request, env, session.user_id);

  const vaultMatch = pathname.match(/^\/api\/vault\/contacts\/(\d+)$/);
  if (vaultMatch) {
    const id = Number(vaultMatch[1]);
    if (method === 'PUT') return vaultPut(request, env, id, session.user_id);
    if (method === 'DELETE') {
      requireFresh();
      return vaultDelete(env, id, session.user_id);
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

async function vaultStatus(env, uid) {
  const v = await env.DB.prepare('SELECT salt FROM users WHERE id = ?').bind(uid).first();
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

async function vaultList(env, uid) {
  const { results } = await env.DB.prepare(
    'SELECT id, payload, updated_at FROM encrypted_contacts WHERE user_id = ? ORDER BY id LIMIT ?'
  ).bind(uid, VAULT_BATCH_MAX * 10).all();
  return json({ contacts: results });
}

async function vaultCreate(request, env, uid) {
  const body = await readJson(request);
  const payload = checkPayload(body.payload);
  const row = await env.DB.prepare(
    'INSERT INTO encrypted_contacts (payload, user_id) VALUES (?, ?) RETURNING id, payload, updated_at'
  ).bind(payload, uid).first();
  return json({ contact: row }, 201);
}

async function vaultPut(request, env, id, uid) {
  const body = await readJson(request);
  const payload = checkPayload(body.payload);
  const row = await env.DB.prepare(
    "UPDATE encrypted_contacts SET payload = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ? RETURNING id, payload, updated_at"
  ).bind(payload, id, uid).first();
  if (!row) throw new HttpError(404, 'Kisi bulunamadi');
  return json({ contact: row });
}

async function vaultDelete(env, id, uid) {
  await env.DB.prepare('DELETE FROM encrypted_contacts WHERE id = ? AND user_id = ?').bind(id, uid).run();
  return json({ ok: true });
}

// Birden fazla kisiyi tek atomik islemde gunceller/siler (iliski ve silme icin)
async function vaultBatch(request, env, fresh, uid) {
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
      "INSERT INTO encrypted_contacts (id, payload, user_id, updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at WHERE encrypted_contacts.user_id = excluded.user_id"
    ).bind(checkId(p.id), checkPayload(p.payload), uid)),
    ...deletes.map((id) => env.DB.prepare('DELETE FROM encrypted_contacts WHERE id = ? AND user_id = ?').bind(checkId(id), uid)),
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
async function vaultImport(request, env, uid) {
  if (await isMigrated(env)) throw new HttpError(409, 'Gecis zaten tamamlandi');
  const body = await readJson(request);
  const records = Array.isArray(body.records) ? body.records : [];
  if (records.length > VAULT_BATCH_MAX) throw new HttpError(400, 'Cok fazla kayit');
  // Yalnizca ayni kullanicinin kaydini gunceller; baska kullanicinin kaydini ezmez.
  const stmts = records.map((r) => env.DB.prepare(
    "INSERT INTO encrypted_contacts (id, payload, user_id, updated_at) VALUES (?, ?, ?, datetime('now')) " +
    "ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at " +
    "WHERE encrypted_contacts.user_id = excluded.user_id"
  ).bind(checkId(r.id), checkPayload(r.payload), uid));
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
// Konum artik zorunlu degil (veri minimizasyonu): giris ve kayit konum olmadan yapilabilir
function hasGeo() {
  return true;
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
  // Parola ile giris bilerek kapali: parola tek basina yeterli degil.
  // Giris yalnizca parmak izi (passkey) veya kurtarma kodu ile yapilir.
  throw new HttpError(403, 'Sadece parola ile giris kapali. Parmak izi veya kurtarma kodu kullanin.');
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
  const ok = await verifyUserPassword(env, session.user_id, password);
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

async function listSessions(env, session) {
  const rows = await env.DB.prepare(
    "SELECT s.token_hash, s.created_at, s.expires_at, COALESCE(m.ua, '') AS ua FROM sessions s LEFT JOIN session_meta m ON m.token_hash = s.token_hash WHERE s.expires_at > datetime('now') ORDER BY s.created_at DESC"
  ).all();
  return json({
    ok: true,
    sessions: (rows.results || []).map((r) => ({
      id: String(r.token_hash).slice(0, 16),
      created_at: r.created_at,
      expires_at: r.expires_at,
      ua: String(r.ua || '').slice(0, 200),
      current: r.token_hash === session.token_hash,
    })),
  });
}

async function revokeSessions(request, env, session) {
  const body = await readJson(request);
  if (body.all === true) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash != ?').bind(session.token_hash).run();
    return json({ ok: true });
  }
  const id = typeof body.id === 'string' ? body.id : '';
  if (!/^[0-9a-zA-Z]{16}$/.test(id)) throw new HttpError(400, 'Gecersiz oturum');
  const rows = await env.DB.prepare('SELECT token_hash FROM sessions WHERE token_hash LIKE ?').bind(id + '%').all();
  const list = rows.results || [];
  if (list.length !== 1) throw new HttpError(404, 'Oturum bulunamadi');
  if (list[0].token_hash === session.token_hash) throw new HttpError(400, 'Bu oturumu cikis yaparak kapatin');
  await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(list[0].token_hash).run();
  return json({ ok: true });
}

async function requireSession(request, env) {
  const token = getCookie(request, 'session');
  if (!token) return null;
  const row = await env.DB.prepare(
    "SELECT s.token_hash, s.user_id, u.is_admin, (s.reauth_until IS NOT NULL AND s.reauth_until > datetime('now')) AS fresh FROM sessions s LEFT JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > datetime('now')"
  ).bind(await sha256(token)).first();
  // Kullanicisi olmayan (eski) oturum kabul edilmez. Eskiden bu oturumlar otomatik yonetici sayiliyordu.
  if (!row || row.user_id == null) return null;
  return { token_hash: row.token_hash, user_id: row.user_id, is_admin: !!row.is_admin, fresh: !!row.fresh };
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


// ---------- Kayit (kullanici adi + parola + parmak izi) ----------

const SIGNUP_USER_RE = /^[A-Za-z0-9_.-]{3,30}$/;

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await pbkdf2(password, salt, PBKDF2_ITER);
  return `pbkdf2$${PBKDF2_ITER}$${b64(salt)}$${b64(bits)}`;
}

async function verifyUserPassword(env, uid, password) {
  if (!password || password.length > 1024) return false;
  const u = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(uid).first();
  return !!u && (await verifyPassword(password, u.password_hash));
}

// Parola + kullanici adi eslesmesi (yalnizca tamamlanmis hesaplar)
async function userForLogin(env, body) {
  const username = typeof body.username === 'string' ? body.username.trim().slice(0, 100) : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username || !password || password.length > 1024) return null;
  const u = await env.DB.prepare(
    'SELECT id, password_hash FROM users WHERE lower(username) = lower(?) AND pending = 0'
  ).bind(username).first();
  if (!u) return null;
  return (await verifyPassword(password, u.password_hash)) ? u : null;
}

async function credentialOwner(env, a) {
  if (!a || typeof a.id !== 'string') return null;
  const row = await env.DB.prepare('SELECT user_id FROM webauthn_credentials WHERE id = ?').bind(a.id).first();
  return row ? row.user_id : null;
}

async function signupStart(request, env, ip, url) {
  if ((await recentFailCount(env, ip)) >= MAX_FAILS) {
    throw new HttpError(429, 'Cok fazla hatali deneme. Lutfen daha sonra tekrar deneyin.');
  }
  const body = await readJson(request);
  if (!hasGeo(body)) {
    await recordFootprint(env, request, ip, 'signup_no_geo', false, body.fp);
    throw new HttpError(403, 'Konum izni olmadan kayit yapilamaz');
  }
  if (!(await verifyTurnstile(env, body.turnstile, ip))) {
    await recordFootprint(env, request, ip, 'signup_bot', false, body.fp);
    throw new HttpError(403, 'Dogrulama basarisiz. Lutfen tekrar deneyin.');
  }
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const salt = typeof body.salt === 'string' ? body.salt : '';
  if (!SIGNUP_USER_RE.test(username)) throw new HttpError(400, 'Kullanici adi 3-30 karakter olmali (harf, rakam, _ . -)');
  if (password.length < 10 || password.length > 1024) throw new HttpError(400, 'Parola en az 10 karakter olmali');
  if (salt.length < 16 || salt.length > 64) throw new HttpError(400, 'Gecersiz tuz');

  // Yarim kalmis kayitlar temizlenir
  await env.DB.prepare("DELETE FROM users WHERE pending = 1 AND created_at < datetime('now', '-15 minutes')").run();
  const taken = await env.DB.prepare('SELECT id FROM users WHERE lower(username) = lower(?) AND pending = 0').bind(username).first();
  if (taken) throw new HttpError(409, 'Bu kullanici adi alinmis');
  await env.DB.prepare('DELETE FROM users WHERE pending = 1 AND lower(username) = lower(?)').bind(username).run();

  const hash = await hashPassword(password);
  const row = await env.DB.prepare(
    'INSERT INTO users (username, password_hash, salt, is_admin, pending) VALUES (?, ?, ?, 0, 1) RETURNING id'
  ).bind(username, hash, salt).first();
  const challenge = await newChallenge(env, 'register');
  return json({
    user_id: row.id,
    challenge,
    rp: { id: url.hostname, name: 'Rehber' },
    user: { id: b64uEncode(new TextEncoder().encode(String(row.id))), name: username, displayName: username },
  });
}

async function signupFinish(request, env, ip, url) {
  const peek = await request.clone().json().catch(() => null);
  const uid = Number(peek && peek.user_id);
  if (!Number.isInteger(uid) || uid < 1) throw new HttpError(400, 'Gecersiz kayit');
  const pending = await env.DB.prepare(
    "SELECT id FROM users WHERE id = ? AND pending = 1 AND created_at > datetime('now', '-15 minutes')"
  ).bind(uid).first();
  if (!pending) throw new HttpError(400, 'Kayit suresi doldu, lutfen tekrar deneyin');
  const rec = peek.recovery || {};
  const recHash = typeof rec.code_hash === 'string' && /^[0-9a-f]{64}$/.test(rec.code_hash) ? rec.code_hash : null;
  const recBlob = typeof rec.blob === 'string' && rec.blob.length >= 20 && rec.blob.length <= 4000 ? rec.blob : null;
  if (!recHash || !recBlob) throw new HttpError(400, 'Kurtarma kodu eksik');
  // Kurtarma kodu e-postaya gonderilir; kod sunucuda tutulmaz, yalnizca ozeti karsilastirilir
  const email = typeof peek.email === 'string' ? peek.email.trim().slice(0, 254) : '';
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Gecerli bir e-posta adresi girin');
  const code = normalizeRecoveryCode(peek.code);
  if (code.length < 20 || hexOf(await digestBytes(new TextEncoder().encode(code))) !== recHash) {
    throw new HttpError(400, 'Kurtarma kodu uyusmuyor');
  }
  try {
    await sendRecoveryMailTo(env, email, code.match(/.{1,5}/g).join('-'));
  } catch {
    throw new HttpError(502, 'E-posta gonderilemedi. Adresi kontrol edip tekrar deneyin.');
  }
  await passkeyRegisterVerify(request, env, url, uid);
  await env.DB.prepare('UPDATE users SET pending = 0, recovery_hash = ?, recovery_blob = ? WHERE id = ?').bind(recHash, recBlob, uid).run();
  await recordFootprint(env, request, ip, 'signup', true, peek.fp);
  return json({ ok: true }, 200, { 'Set-Cookie': await passkeySessionCookie(request, env, uid) });
}


// Kullanici kurtarma: kullanici adi + kurtarma kodu. Sunucu kodu bilmez; parolayi tarayici kodla cozer.
async function userRecoveryLogin(request, env, ip) {
  if ((await recentFailCount(env, ip)) >= MAX_FAILS) {
    throw new HttpError(429, 'Cok fazla hatali deneme. Lutfen daha sonra tekrar deneyin.');
  }
  const body = await readJson(request);
  if (!hasGeo(body)) {
    await recordFootprint(env, request, ip, 'recovery_no_geo', false, body.fp);
    throw new HttpError(403, 'Konum izni olmadan giris yapilamaz');
  }
  if (!(await verifyTurnstile(env, body.turnstile, ip))) {
    await recordFootprint(env, request, ip, 'recovery_bot', false, body.fp);
    throw new HttpError(403, 'Dogrulama basarisiz. Lutfen tekrar deneyin.');
  }
  const username = typeof body.username === 'string' ? body.username.trim().slice(0, 100) : '';
  const code = normalizeRecoveryCode(body.code);
  const u = username && code.length >= 20
    ? await env.DB.prepare(
        'SELECT id, recovery_hash, recovery_blob FROM users WHERE lower(username) = lower(?) AND pending = 0'
      ).bind(username).first()
    : null;
  const ok = !!u && !!u.recovery_hash && !!u.recovery_blob &&
    timingSafeEqualStr(hexOf(await digestBytes(new TextEncoder().encode(code))), u.recovery_hash);
  await recordFootprint(env, request, ip, 'recovery', ok, body.fp);
  if (!ok) throw new HttpError(401, 'Kullanici adi veya kurtarma kodu hatali');
  return json({ ok: true, blob: u.recovery_blob }, 200, { 'Set-Cookie': await passkeySessionCookie(request, env, u.id) });
}

// Oturumdaki kullanici icin yeni kurtarma kodu: eski kod gecersiz olur, kod e-postaya gider
async function userRecoveryRotate(request, env, session) {
  const body = await readJson(request);
  const email = typeof body.email === 'string' ? body.email.trim().slice(0, 254) : '';
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Gecerli bir e-posta adresi girin');
  const code = normalizeRecoveryCode(body.code);
  const blob = typeof body.blob === 'string' ? body.blob : '';
  if (code.length < 20 || code.length > 64 || blob.length < 20 || blob.length > 4000) {
    throw new HttpError(400, 'Gecersiz istek');
  }
  try {
    await sendRecoveryMailTo(env, email, code.match(/.{1,5}/g).join('-'));
  } catch {
    throw new HttpError(502, 'E-posta gonderilemedi. Tekrar deneyin.');
  }
  const hash = hexOf(await digestBytes(new TextEncoder().encode(code)));
  await env.DB.prepare('UPDATE users SET recovery_hash = ?, recovery_blob = ? WHERE id = ?')
    .bind(hash, blob, session.user_id).run();
  return json({ ok: true });
}

function unb64(s) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

// ---- Web Push (VAPID) ----
// Web Push (VAPID). Bildirimler icerik tasimaz: sunucu bos istek gonderir,
// metni service worker kendisi yazar. Bu sayede kisisel veri push servislerinden gecmez.
const VAPID_PUBLIC_KEY = 'BDUEFNLqLZF73Kdtu7qk2UbUeraEnY4dcGHKcc1hggyx2kUmcCrmRInALuCFosTcLMDwZctKKJWTZwQNBssqwH4';
const VAPID_SUBJECT = 'https://kontakt-notizbuch.halilgercek023.workers.dev';
const MAX_SUBSCRIPTIONS = 10;
const QUEUE_TYPES = ['birthday'];

async function handlePush(request, env, url, deps) {
  const { readJson, json, HttpError } = deps;
  const { pathname } = url;
  const method = request.method;

  if (pathname === '/api/push/key' && method === 'GET') {
    return json({ key: VAPID_PUBLIC_KEY });
  }

  if (pathname === '/api/push/subscribe' && method === 'POST') {
    const body = await readJson(request);
    const endpoint = String(body.endpoint || '');
    const p256dh = String((body.keys && body.keys.p256dh) || '');
    const auth = String((body.keys && body.keys.auth) || '');
    if (!/^https:\/\/\S{10,500}$/.test(endpoint) || p256dh.length < 20 || p256dh.length > 200 || auth.length < 10 || auth.length > 100) {
      throw new HttpError(400, 'Gecersiz abonelik');
    }
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM push_subscriptions').first();
    const exists = await env.DB.prepare('SELECT endpoint FROM push_subscriptions WHERE endpoint = ?').bind(endpoint).first();
    if (!exists && count && count.n >= MAX_SUBSCRIPTIONS) throw new HttpError(409, 'Abonelik siniri doldu');
    await env.DB.prepare(
      'INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES (?, ?, ?) ' +
      'ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth'
    ).bind(endpoint, p256dh, auth).run();
    return json({ ok: true });
  }

  if (pathname === '/api/push/unsubscribe' && method === 'POST') {
    const body = await readJson(request);
    const endpoint = String(body.endpoint || '');
    if (endpoint) await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(endpoint).run();
    return json({ ok: true });
  }

  if (pathname === '/api/push/test' && method === 'POST') {
    const rows = await env.DB.prepare('SELECT endpoint FROM push_subscriptions').all();
    let sent = 0;
    let removed = 0;
    for (const row of rows.results || []) {
      try {
        const res = await sendEmpty(row.endpoint, env);
        if (res.status === 404 || res.status === 410) {
          await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(row.endpoint).run();
          removed++;
        } else if (res.ok) {
          sent++;
        }
      } catch (err) {
        console.error('push gonderilemedi', err);
      }
    }
    return json({ ok: true, sent, removed });
  }

  if (pathname === '/api/push/queue' && method === 'POST') {
    const body = await readJson(request);
    const type = String(body.type || '');
    const count = Number(body.count);
    if (!QUEUE_TYPES.includes(type) || !Number.isInteger(count) || count < 0 || count > 999) {
      throw new HttpError(400, 'Gecersiz kuyruk kaydi');
    }
    if (count === 0) {
      await env.DB.prepare('DELETE FROM notify_queue WHERE type = ?').bind(type).run();
    } else {
      await env.DB.prepare(
        "INSERT INTO notify_queue (type, count, updated_at) VALUES (?, ?, datetime('now')) " +
        "ON CONFLICT(type) DO UPDATE SET count = excluded.count, updated_at = excluded.updated_at"
      ).bind(type, count).run();
    }
    return json({ ok: true });
  }

  if (pathname === '/api/push/pending' && method === 'GET') {
    const rows = await env.DB.prepare('SELECT type, count FROM notify_queue').all();
    return json({ items: rows.results || [] });
  }

  if (pathname === '/api/push/consume' && method === 'POST') {
    await env.DB.prepare('DELETE FROM notify_queue').run();
    return json({ ok: true });
  }

  throw new HttpError(404, 'Bulunamadi');
}

async function sendEmpty(endpoint, env) {
  const jwt = await vapidJwt(new URL(endpoint).origin, env);
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      TTL: '86400',
      Urgency: 'normal',
      Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
    },
  });
}

async function vapidJwt(aud, env) {
  if (!env.VAPID_PRIVATE_KEY) throw new Error('VAPID_PRIVATE_KEY tanimli degil');
  const pub = b64uDecode(VAPID_PUBLIC_KEY);
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', d: env.VAPID_PRIVATE_KEY, x: b64uEncode(pub.slice(1, 33)), y: b64uEncode(pub.slice(33, 65)), ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  const header = b64uEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = b64uEncode(new TextEncoder().encode(JSON.stringify({
    aud,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: VAPID_SUBJECT,
  })));
  const data = new TextEncoder().encode(`${header}.${payload}`);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, data));
  return `${header}.${payload}.${b64uEncode(sig)}`;
}

function b64uEncode(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64uDecode(str) {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function sendDigest(env) {
  const pending = await env.DB.prepare('SELECT COUNT(*) AS n FROM notify_queue WHERE count > 0').first();
  if (!pending || !pending.n) return;
  const rows = await env.DB.prepare('SELECT endpoint FROM push_subscriptions').all();
  for (const row of rows.results || []) {
    try {
      const res = await sendEmpty(row.endpoint, env);
      if (res.status === 404 || res.status === 410) {
        await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(row.endpoint).run();
      }
    } catch (err) {
      console.error('ozet push gonderilemedi', err);
    }
  }
}

// ---- Parmak izi (WebAuthn / passkey) ----
// Parola yerine gecen dogrulama: tarayici biyometriyi cihazda yapar, sunucu imzayi dogrular.
// Konum, Turnstile ve brute-force kontrolleri giris ile aynen uygulanir.
const PASSKEY_MAX = 10;
const CHALLENGE_MINUTES = 5;

function randomBytes(n) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

async function digestBytes(bytes) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}

function concatBytes(...arrs) {
  const out = new Uint8Array(arrs.reduce((s, a) => s + a.length, 0));
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}

function bytesEq(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

// Minimal CBOR (WebAuthn icin yeterli: uint, negint, bytes, text, array, map, bool, null)
function cborDecode(bytes) {
  let pos = 0;
  const need = (n) => { if (pos + n > bytes.length) throw new Error('CBOR sinir asildi'); };
  const readLen = (ai) => {
    if (ai < 24) return ai;
    if (ai === 24) { need(1); return bytes[pos++]; }
    if (ai === 25) { need(2); const v = (bytes[pos] << 8) | bytes[pos + 1]; pos += 2; return v; }
    if (ai === 26) { need(4); const v = ((bytes[pos] << 24) >>> 0) + ((bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3]); pos += 4; return v; }
    throw new Error('CBOR desteklenmeyen uzunluk');
  };
  const item = () => {
    need(1);
    const ib = bytes[pos++];
    const major = ib >> 5;
    const ai = ib & 31;
    if (major === 0) return readLen(ai);
    if (major === 1) return -1 - readLen(ai);
    if (major === 2) { const n = readLen(ai); need(n); const v = bytes.slice(pos, pos + n); pos += n; return v; }
    if (major === 3) { const n = readLen(ai); need(n); const v = new TextDecoder().decode(bytes.slice(pos, pos + n)); pos += n; return v; }
    if (major === 4) { const n = readLen(ai); const arr = []; for (let i = 0; i < n; i++) arr.push(item()); return arr; }
    if (major === 5) { const n = readLen(ai); const m = new Map(); for (let i = 0; i < n; i++) { const k = item(); m.set(k, item()); } return m; }
    if (major === 7) { if (ai === 20) return false; if (ai === 21) return true; if (ai === 22) return null; }
    throw new Error('CBOR desteklenmeyen tip');
  };
  return item();
}

// authenticatorData: rpIdHash(32) | flags(1) | signCount(4) | [aaguid(16) | credIdLen(2) | credId | COSE key]
function parseAuthData(auth) {
  const rpIdHash = auth.slice(0, 32);
  const flags = auth[32];
  const signCount = ((auth[33] << 24) >>> 0) + ((auth[34] << 16) | (auth[35] << 8) | auth[36]);
  let cred = null;
  if (flags & 0x40) {
    const credLen = (auth[53] << 8) | auth[54];
    const credId = auth.slice(55, 55 + credLen);
    const key = cborDecode(auth.slice(55 + credLen));
    cred = {
      id: b64uEncode(credId),
      kty: key.get(1),
      alg: key.get(3),
      crv: key.get(-1),
      x: b64uEncode(key.get(-2)),
      y: b64uEncode(key.get(-3)),
    };
  }
  return { rpIdHash, flags, signCount, cred };
}

// WebAuthn imzasi DER formatindadir; WebCrypto ham r||s bekler.
function derToRaw(der) {
  let p = 2;
  if (der[1] & 0x80) p = 2 + (der[1] & 0x7f);
  if (der[p] !== 0x02) throw new Error('DER');
  const rl = der[p + 1];
  const r = der.slice(p + 2, p + 2 + rl);
  p = p + 2 + rl;
  if (der[p] !== 0x02) throw new Error('DER');
  const sl = der[p + 1];
  const s = der.slice(p + 2, p + 2 + sl);
  const fix = (x) => {
    let v = x;
    while (v.length > 32 && v[0] === 0) v = v.slice(1);
    const out = new Uint8Array(32);
    out.set(v, 32 - v.length);
    return out;
  };
  return concatBytes(fix(r), fix(s));
}

async function newChallenge(env, purpose) {
  const challenge = b64uEncode(randomBytes(32));
  await env.DB.prepare("DELETE FROM webauthn_challenges WHERE created_at < datetime('now', '-1 day')").run();
  await env.DB.prepare('INSERT INTO webauthn_challenges (challenge, purpose) VALUES (?, ?)').bind(challenge, purpose).run();
  return challenge;
}

// Tek kullanimlik: bulunsa da bulunmasa da silinir
async function consumeChallenge(env, purpose, challenge) {
  const row = await env.DB.prepare(
    "SELECT challenge FROM webauthn_challenges WHERE challenge = ? AND purpose = ? AND created_at > datetime('now', ?)"
  ).bind(String(challenge || ''), purpose, `-${CHALLENGE_MINUTES} minutes`).first();
  await env.DB.prepare('DELETE FROM webauthn_challenges WHERE challenge = ?').bind(String(challenge || '')).run();
  return !!row;
}

async function passkeyLoginOptions(env, url) {
  const challenge = await newChallenge(env, 'login');
  return json({ challenge, rpId: url.hostname, userVerification: 'required', timeout: 60000 });
}

async function passkeyRegisterOptions(env, url) {
  const challenge = await newChallenge(env, 'register');
  const rows = await env.DB.prepare('SELECT id FROM webauthn_credentials').all();
  return json({
    challenge,
    rp: { id: url.hostname, name: 'Rehber' },
    user: { id: b64uEncode(new TextEncoder().encode('rehber-admin')), name: 'rehber', displayName: 'Rehber' },
    excludeCredentials: (rows.results || []).map((r) => r.id),
  });
}

async function passkeyRegisterVerify(request, env, url, uid = 1) {
  const body = await readJson(request);
  const bad = () => new HttpError(400, 'Parmak izi kaydedilemedi');
  let cd;
  let att;
  let parsed;
  try {
    const r = body.response || {};
    cd = JSON.parse(new TextDecoder().decode(b64uDecode(String(r.clientDataJSON || ''))));
    att = cborDecode(b64uDecode(String(r.attestationObject || '')));
    parsed = parseAuthData(att.get('authData'));
  } catch {
    throw bad();
  }
  if (cd.type !== 'webauthn.create' || cd.origin !== url.origin) throw bad();
  if (!(await consumeChallenge(env, 'register', cd.challenge))) {
    throw new HttpError(400, 'Oturum suresi doldu, tekrar deneyin');
  }
  if (!bytesEq(parsed.rpIdHash, await digestBytes(new TextEncoder().encode(url.hostname)))) throw bad();
  if (!(parsed.flags & 0x01) || !(parsed.flags & 0x04) || !parsed.cred) throw bad();
  if (parsed.cred.kty !== 2 || parsed.cred.alg !== -7 || parsed.cred.crv !== 1) throw bad();
  if (parsed.cred.id !== String(body.id || '')) throw bad();

  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM webauthn_credentials WHERE user_id = ?').bind(uid).first();
  if (count && count.n >= PASSKEY_MAX) throw new HttpError(409, 'Parmak izi sinirina ulasildi');
  await env.DB.prepare(
    'INSERT INTO webauthn_credentials (id, x, y, sign_count, user_id) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING'
  ).bind(parsed.cred.id, parsed.cred.x, parsed.cred.y, parsed.signCount, uid).run();
  return json({ ok: true });
}

async function verifyAssertion(env, a, url) {
  if (!a || typeof a.id !== 'string' || !a.response) return false;
  const row = await env.DB.prepare('SELECT id, x, y, sign_count FROM webauthn_credentials WHERE id = ?').bind(a.id).first();
  if (!row) return false;
  try {
    const clientBytes = b64uDecode(String(a.response.clientDataJSON || ''));
    const cd = JSON.parse(new TextDecoder().decode(clientBytes));
    if (cd.type !== 'webauthn.get' || cd.origin !== url.origin) return false;
    if (!(await consumeChallenge(env, 'login', cd.challenge))) return false;

    const authData = b64uDecode(String(a.response.authenticatorData || ''));
    const parsed = parseAuthData(authData);
    if (!bytesEq(parsed.rpIdHash, await digestBytes(new TextEncoder().encode(url.hostname)))) return false;
    if (!(parsed.flags & 0x01) || !(parsed.flags & 0x04)) return false;

    const data = concatBytes(authData, await digestBytes(clientBytes));
    const pub = await crypto.subtle.importKey(
      'jwk', { kty: 'EC', crv: 'P-256', x: row.x, y: row.y, ext: true },
      { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']
    );
    const sig = derToRaw(b64uDecode(String(a.response.signature || '')));
    if (!(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, sig, data))) return false;

    // Klon tespiti: sayac birlikte kullanildiysa geri gitmemeli
    if ((parsed.signCount > 0 || row.sign_count > 0) && parsed.signCount <= row.sign_count) return false;
    await env.DB.prepare('UPDATE webauthn_credentials SET sign_count = ? WHERE id = ?').bind(parsed.signCount, row.id).run();
    return true;
  } catch {
    return false;
  }
}

async function passkeySessionCookie(request, env, userId = 1) {
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
  await env.DB.prepare('DELETE FROM session_meta WHERE token_hash NOT IN (SELECT token_hash FROM sessions)').run();
  const token = randomToken();
  await env.DB.prepare(
    "INSERT INTO sessions (token_hash, expires_at, reauth_until, user_id) VALUES (?, datetime('now', ?), datetime('now', ?), ?)"
  ).bind(await sha256(token), `+${SESSION_HOURS} hours`, `+${REAUTH_MINUTES} minutes`, userId).run();
  await env.DB.prepare('INSERT OR REPLACE INTO session_meta (token_hash, ua) VALUES (?, ?)')
    .bind(await sha256(token), String(request.headers.get('User-Agent') || '').slice(0, 200)).run();
  return sessionCookie(token, SESSION_HOURS * 3600);
}

async function passkeyLogin(request, env, ip, url) {
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
  const user = await userForLogin(env, body);
  const pwOk = !!user;
  const assertOk = pwOk && (await verifyAssertion(env, body.assertion, url));
  const ok = assertOk && (await credentialOwner(env, body.assertion)) === user.id;
  await recordFootprint(env, request, ip, 'login', ok, body.fp);
  if (!ok) throw new HttpError(401, pwOk ? 'Parmak izi dogrulanamadi' : 'Kullanici adi veya sifre hatali');
  return json({ ok: true }, 200, { 'Set-Cookie': await passkeySessionCookie(request, env, user.id) });
}

async function passkeyList(env) {
  const rows = await env.DB.prepare('SELECT id, created_at FROM webauthn_credentials ORDER BY created_at').all();
  return json({ items: rows.results || [] });
}

async function passkeyDelete(request, env) {
  const body = await readJson(request);
  const id = String(body.id || '');
  if (!id) throw new HttpError(400, 'Gecersiz istek');
  await env.DB.prepare('DELETE FROM webauthn_credentials WHERE id = ?').bind(id).run();
  return json({ ok: true });
}

// ---- Kurtarma kodu ----
// Kod e-postaya gonderilir; sunucu yalnizca kodun SHA-256 ozetini ve kodla sifrelenmis parolayi tutar.
function normalizeRecoveryCode(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function hexOf(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function recoveryLogin(request, env, ip, url) {
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
  const pwOk = await requirePassword(env, body);
  if (!pwOk) {
    await recordFootprint(env, request, ip, 'login', false, body.fp);
    throw new HttpError(401, 'Kullanici adi veya sifre hatali');
  }
  const code = normalizeRecoveryCode(body.code);
  const row = await env.DB.prepare('SELECT code_hash, blob FROM recovery WHERE id = 1').first();
  const ok = !!row && code.length >= 20 &&
    timingSafeEqualStr(hexOf(await digestBytes(new TextEncoder().encode(code))), row.code_hash);
  if (!ok) {
    await recordFootprint(env, request, ip, 'login', false, body.fp);
    throw new HttpError(401, 'Kurtarma kodu hatali');
  }
  // Tek kullanimlik: kodu ancak bir kez silebiliriz (ayni anda iki giris olursa biri kazanir)
  const res = await env.DB.prepare("UPDATE recovery SET code_hash = '', blob = '' WHERE id = 1 AND code_hash = ?")
    .bind(row.code_hash).run();
  const consumed = !!(res && res.meta && res.meta.changes > 0);
  await recordFootprint(env, request, ip, 'login', consumed, body.fp);
  if (!consumed) throw new HttpError(401, 'Kurtarma kodu hatali veya kullanilmis');
  return json({ ok: true, blob: row.blob }, 200, { 'Set-Cookie': await passkeySessionCookie(request, env) });
}

// Kurtarma e-postasi: koyu tema, inline stiller (e-posta istemcileri uyumlu)
function recoveryMailHtml(displayCode) {
  const safe = String(displayCode).replace(/[^A-Za-z0-9-]/g, '');
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<title>Rehber kurtarma kodu</title>
</head>
<body style="margin:0;padding:0;background:#000000;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#050505;border:1px solid #1f1f22;border-radius:20px;">
<tr><td style="padding:32px 28px 8px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="display:inline-block;width:44px;height:44px;line-height:44px;text-align:center;border-radius:14px;background:linear-gradient(135deg,#b5ead7,#d7c9ff);color:#000000;font-weight:700;font-size:20px;">R</div>
<h1 style="margin:18px 0 6px 0;font-size:22px;line-height:1.3;color:#f5f5f7;font-weight:700;letter-spacing:-0.02em;">Kurtarma kodunuz</h1>
<p style="margin:0;color:#8a8a92;font-size:15px;line-height:1.6;">Parmak izinize ya da parolanıza erişemediğinizde Rehber'e girmek için bu kodu kullanın.</p>
</td></tr>
<tr><td style="padding:22px 28px;">
<div style="background:#000000;border:1px solid #2a2a2e;border-radius:16px;padding:22px 16px;text-align:center;">
<div style="font-family:'SF Mono',Menlo,Consolas,'Courier New',monospace;font-size:24px;line-height:1.4;letter-spacing:3px;color:#b5ead7;font-weight:700;">{{CODE}}</div>
<div style="margin-top:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#5a5a62;">Kodu uzun basarak seçip kopyalayabilirsiniz</div>
</div>
</td></tr>
<tr><td style="padding:0 28px 8px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#8a8a92;font-size:14px;line-height:1.7;">
<p style="margin:0 0 10px 0;">Bu kod tek kullanımlıktır. Kullanıldıktan sonra yeni kod yalnızca istediğinizde gönderilir.</p>
<p style="margin:0;">Bu isteği siz yapmadıysanız kodu kimseyle paylaşmayın ve kasa parolanızı hemen değiştirin.</p>
</td></tr>
<tr><td style="padding:18px 28px 28px 28px;border-top:1px solid #1f1f22;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#5a5a62;">Rehber &middot; kişisel kontakt defteri</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`.replace('{{CODE}}', safe);
}

// Kullaniciya kurtarma kodu gonderir (adres saklanmaz)
async function sendRecoveryMailTo(env, to, displayCode) {
  if (!env.RESEND_API_KEY) throw new Error('mail yapilandirilmamis');
  const safe = String(displayCode).replace(/[^A-Za-z0-9-]/g, '');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Rehber <onboarding@resend.dev>',
      to: [to],
      subject: 'Rehber kurtarma kodu',
      html: recoveryMailHtml(safe),
      text: `Kurtarma kodunuz:\n\n${safe}\n\nBu kodu kimseyle paylasmayin. Parolanizi unutursaniz bu kodla giris yapabilirsiniz.`,
    }),
  });
  if (!res.ok) throw new Error('mail hatasi ' + res.status);
}

async function sendRecoveryMail(env, displayCode) {
  if (!env.RESEND_API_KEY || !env.RECOVERY_EMAIL) throw new Error('mail yapilandirilmamis');
  const safe = String(displayCode).replace(/[^A-Za-z0-9-]/g, '');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Rehber <onboarding@resend.dev>',
      to: [env.RECOVERY_EMAIL],
      subject: 'Rehber kurtarma kodu',
      html: recoveryMailHtml(safe),
      text: `Yeni kurtarma kodunuz:\n\n${safe}\n\nBu kod tek kullanimliktir. Kodu kimseyle paylasmayin.`,
    }),
  });
  if (!res.ok) throw new Error('mail hatasi ' + res.status);
}

async function recoveryRotate(request, env) {
  const body = await readJson(request);
  return storeRecovery(env, body.code, body.blob);
}

async function recoverySend(request, env, ip) {
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
  if (!(await requirePassword(env, body))) {
    await recordFootprint(env, request, ip, 'login', false, body.fp);
    throw new HttpError(401, 'Kullanici adi veya sifre hatali');
  }
  const recent = await env.DB.prepare(
    "SELECT 1 AS r FROM recovery WHERE id = 1 AND updated_at > datetime('now', '-2 minutes')"
  ).first();
  if (recent) throw new HttpError(429, 'Kod az once gonderildi. Birkac dakika bekleyin.');
  return storeRecovery(env, body.code, body.blob);
}

async function storeRecovery(env, displayCodeIn, blobIn) {
  const displayCode = String(displayCodeIn || '');
  const code = normalizeRecoveryCode(displayCode);
  const blob = String(blobIn || '');
  if (code.length < 20 || code.length > 64 || blob.length < 20 || blob.length > 4000) {
    throw new HttpError(400, 'Gecersiz istek');
  }
  try {
    await sendRecoveryMail(env, displayCode);
  } catch {
    // Mail gitmediyse eski kod degismez; kullanici tekrar deneyebilir
    throw new HttpError(502, 'E-posta gonderilemedi. Kurtarma kodu degistirilmedi.');
  }
  const hash = hexOf(await digestBytes(new TextEncoder().encode(code)));
  await env.DB.prepare(
    "INSERT INTO recovery (id, code_hash, blob, updated_at) VALUES (1, ?, ?, datetime('now')) " +
    "ON CONFLICT(id) DO UPDATE SET code_hash = excluded.code_hash, blob = excluded.blob, updated_at = excluded.updated_at"
  ).bind(hash, blob).run();
  return json({ ok: true });
}

async function requirePassword(env, body) {
  const username = typeof body.username === 'string' ? body.username.trim().slice(0, 100) : '';
  const password = typeof body.password === 'string' ? body.password : '';
  return username.length > 0 && password.length > 0 && (await verifyAdminPassword(env, username, password));
}
