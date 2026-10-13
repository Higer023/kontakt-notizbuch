const PBKDF2_ITER = 100000;
const SESSION_HOURS = 8;
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const USERNAME_RE = /^[A-Za-z0-9._-]{1,100}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const PHONE_RE = /^[+0-9 ()-]{0,30}$/;

const SOCIAL_BASE = {
  instagram: 'https://instagram.com/',
  twitter: 'https://x.com/',
  x: 'https://x.com/',
  linkedin: 'https://www.linkedin.com/in/',
  facebook: 'https://facebook.com/',
  github: 'https://github.com/',
  tiktok: 'https://www.tiktok.com/@',
  youtube: 'https://www.youtube.com/@',
};

const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; " +
    "connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
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
        return withSecurityHeaders(json({ error: err.message }, err.status));
      }
      console.error('Unhandled error:', err);
      return withSecurityHeaders(json({ error: 'Sunucu hatasi' }, 500));
    }
  },
};

async function handleApi(request, env, url) {
  const { pathname } = url;
  const method = request.method;

  if (pathname === '/api/login' && method === 'POST') return login(request, env);
  if (pathname === '/api/logout' && method === 'POST') return logout(request, env);

  const session = await requireSession(request, env);
  if (!session) throw new HttpError(401, 'Yetkisiz');

  if (pathname === '/api/me' && method === 'GET') return json({ ok: true });
  if (pathname === '/api/logs' && method === 'GET') return listLogs(env);
  if (pathname === '/api/contacts' && method === 'GET') return listContacts(env, url);
  if (pathname === '/api/contacts' && method === 'POST') return createContact(request, env);

  const contactMatch = pathname.match(/^\/api\/contacts\/(\d+)$/);
  if (contactMatch) {
    const id = Number(contactMatch[1]);
    if (method === 'GET') return getContact(env, id);
    if (method === 'PUT') return updateContact(request, env, id);
    if (method === 'DELETE') return deleteContact(env, id);
  }

  const photoUploadMatch = pathname.match(/^\/api\/contacts\/(\d+)\/photo$/);
  if (photoUploadMatch && method === 'POST') {
    return uploadPhoto(request, env, Number(photoUploadMatch[1]));
  }

  const photoGetMatch = pathname.match(/^\/api\/photos\/(\d+)$/);
  if (photoGetMatch && method === 'GET') return getPhoto(env, Number(photoGetMatch[1]));

  throw new HttpError(404, 'Bulunamadi');
}

async function login(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ua = (request.headers.get('User-Agent') || '').slice(0, 200);

  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM login_logs WHERE ip = ? AND success = 0 AND created_at > datetime('now', ?)"
  ).bind(ip, `-${LOCK_MINUTES} minutes`).first();

  if (recent.n >= MAX_FAILS) {
    throw new HttpError(429, 'Cok fazla hatali deneme. Lutfen daha sonra tekrar deneyin.');
  }

  const body = await readJson(request);
  const password = typeof body.password === 'string' ? body.password : '';
  const admin = await env.DB.prepare('SELECT password_hash FROM admin WHERE id = 1').first();

  const ok =
    !!admin &&
    password.length > 0 &&
    password.length <= 1024 &&
    (await verifyPassword(password, admin.password_hash));

  await env.DB.prepare('INSERT INTO login_logs (ip, success, user_agent) VALUES (?, ?, ?)')
    .bind(ip, ok ? 1 : 0, ua).run();

  if (!ok) throw new HttpError(401, 'Hatali sifre');

  await env.DB.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
  const token = randomToken();
  await env.DB.prepare("INSERT INTO sessions (token_hash, expires_at) VALUES (?, datetime('now', ?))")
    .bind(await sha256(token), `+${SESSION_HOURS} hours`).run();

  return json({ ok: true }, 200, {
    'Set-Cookie': sessionCookie(token, SESSION_HOURS * 3600),
  });
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
  return env.DB.prepare(
    "SELECT token_hash FROM sessions WHERE token_hash = ? AND expires_at > datetime('now')"
  ).bind(await sha256(token)).first();
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await pbkdf2(password, salt, PBKDF2_ITER);
  return `pbkdf2$${PBKDF2_ITER}$${b64(salt)}$${b64(bits)}`;
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
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256
  );
  return new Uint8Array(bits);
}

async function listLogs(env) {
  const { results } = await env.DB.prepare(
    'SELECT ip, success, user_agent, created_at FROM login_logs ORDER BY id DESC LIMIT 200'
  ).all();
  return json({ logs: results });
}

async function listContacts(env, url) {
  const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
  let stmt;
  if (q) {
    const like = `%${q}%`;
    stmt = env.DB.prepare(
      `SELECT * FROM contacts
       WHERE first_name LIKE ? OR last_name LIKE ? OR city LIKE ? OR tags LIKE ? OR email LIKE ?
       ORDER BY first_name COLLATE NOCASE, last_name COLLATE NOCASE LIMIT 500`
    ).bind(like, like, like, like, like);
  } else {
    stmt = env.DB.prepare(
      'SELECT * FROM contacts ORDER BY first_name COLLATE NOCASE, last_name COLLATE NOCASE LIMIT 500'
    );
  }
  const { results } = await stmt.all();
  return json({ contacts: results.map(formatContact) });
}

async function getContact(env, id) {
  const row = await findContact(env, id);
  return json({ contact: formatContact(row) });
}

async function createContact(request, env) {
  const data = sanitizeContact(await readJson(request));
  const row = await env.DB.prepare(
    `INSERT INTO contacts (first_name, last_name, birth_year, birth_month, birth_day, city, phone, email, socials, notes, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
  ).bind(...contactValues(data)).first();
  return json({ contact: formatContact(row) }, 201);
}

async function updateContact(request, env, id) {
  await findContact(env, id);
  const data = sanitizeContact(await readJson(request));
  const row = await env.DB.prepare(
    `UPDATE contacts SET first_name = ?, last_name = ?, birth_year = ?, birth_month = ?, birth_day = ?,
       city = ?, phone = ?, email = ?, socials = ?, notes = ?, tags = ?, updated_at = datetime('now')
     WHERE id = ? RETURNING *`
  ).bind(...contactValues(data), id).first();
  return json({ contact: formatContact(row) });
}

async function deleteContact(env, id) {
  const existing = await findContact(env, id);
  if (existing.photo_key) await env.PHOTOS.delete(existing.photo_key);
  await env.DB.prepare('DELETE FROM contacts WHERE id = ?').bind(id).run();
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

  const socials = [];
  if (Array.isArray(input.socials)) {
    for (const s of input.socials.slice(0, 20)) {
      const platform = typeof s?.platform === 'string' ? s.platform.toLowerCase() : '';
      const username = typeof s?.username === 'string' ? s.username.trim().replace(/^@/, '') : '';
      if (!SOCIAL_BASE[platform]) continue;
      if (!USERNAME_RE.test(username)) throw new HttpError(400, `Gecersiz kullanici adi: ${platform}`);
      socials.push({ platform, username });
    }
  }

  return {
    first_name: firstName,
    last_name: str(input.last_name, 100),
    birth_year: int(input.birth_year, 1900, new Date().getFullYear()),
    birth_month: int(input.birth_month, 1, 12),
    birth_day: int(input.birth_day, 1, 31),
    city: str(input.city, 100),
    phone,
    email,
    socials,
    notes: str(input.notes, 5000),
    tags: str(input.tags, 300),
  };
}

function contactValues(d) {
  return [
    d.first_name, d.last_name, d.birth_year, d.birth_month, d.birth_day,
    d.city, d.phone, d.email, JSON.stringify(d.socials), d.notes, d.tags,
  ];
}

function formatContact(row) {
  const socials = JSON.parse(row.socials || '[]').map((s) => ({
    platform: s.platform,
    username: s.username,
    url: SOCIAL_BASE[s.platform] + encodeURIComponent(s.username),
  }));
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    birth_year: row.birth_year,
    birth_month: row.birth_month,
    birth_day: row.birth_day,
    age: computeAge(row),
    age_exact: !!(row.birth_year && row.birth_month && row.birth_day),
    city: row.city,
    phone: row.phone,
    email: row.email,
    socials,
    notes: row.notes,
    tags: row.tags,
    photo_url: row.photo_key ? `/api/photos/${row.id}` : null,
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

async function uploadPhoto(request, env, id) {
  const contact = await findContact(env, id);

  const type = (request.headers.get('Content-Type') || '').split(';')[0].trim();
  if (!PHOTO_TYPES.has(type)) throw new HttpError(415, 'Yalnizca JPEG, PNG veya WebP');

  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > MAX_PHOTO_BYTES) throw new HttpError(413, 'Fotograf en fazla 5 MB olabilir');

  const buffer = await request.arrayBuffer();
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_PHOTO_BYTES) {
    throw new HttpError(413, 'Gecersiz fotograf boyutu');
  }

  const key = `contacts/${id}/${crypto.randomUUID()}`;
  await env.PHOTOS.put(key, buffer, { httpMetadata: { contentType: type } });
  await env.DB.prepare("UPDATE contacts SET photo_key = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(key, id).run();

  if (contact.photo_key) await env.PHOTOS.delete(contact.photo_key);
  return json({ photo_url: `/api/photos/${id}` });
}

async function getPhoto(env, id) {
  const contact = await findContact(env, id);
  if (!contact.photo_key) throw new HttpError(404, 'Fotograf yok');
  const object = await env.PHOTOS.get(contact.photo_key);
  if (!object) throw new HttpError(404, 'Fotograf bulunamadi');
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'private, max-age=300',
    },
  });
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
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
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
