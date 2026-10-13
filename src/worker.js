const PBKDF2_ITER = 100000;
const SESSION_HOURS = 8;
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;
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
  whatsapp: {
    slug: 'whatsapp', re: /^\+?[0-9]{6,15}$/,
    clean: (u) => u.replace(/\D/g, ''),
    url: (u) => `https://wa.me/${u}`,
  },
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
    "default-src 'self'; script-src 'self'; style-src 'self'; " +
    "img-src 'self' data: https://cdn.simpleicons.org; connect-src 'self'; " +
    "frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
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
  if (pathname === '/api/relations' && method === 'POST') return createRelation(request, env);

  const contactMatch = pathname.match(/^\/api\/contacts\/(\d+)$/);
  if (contactMatch) {
    const id = Number(contactMatch[1]);
    if (method === 'GET') return getContact(env, id);
    if (method === 'PUT') return updateContact(request, env, id);
    if (method === 'DELETE') return deleteContact(env, id);
  }

  const relMatch = pathname.match(/^\/api\/relations\/(\d+)$/);
  if (relMatch && method === 'DELETE') return deleteRelation(env, Number(relMatch[1]));

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
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const admin = await env.DB.prepare('SELECT username, password_hash FROM admin WHERE id = 1').first();

  const ok =
    !!admin &&
    username.length > 0 && username.length <= 100 &&
    password.length > 0 && password.length <= 1024 &&
    timingSafeEqualStr(username, admin.username) &&
    (await verifyPassword(password, admin.password_hash));

  await env.DB.prepare('INSERT INTO login_logs (ip, success, user_agent) VALUES (?, ?, ?)')
    .bind(ip, ok ? 1 : 0, ua).run();

  if (!ok) throw new HttpError(401, 'Kullanici adi veya sifre hatali');

  await env.DB.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
  const token = randomToken();
  await env.DB.prepare("INSERT INTO sessions (token_hash, expires_at) VALUES (?, datetime('now', ?))")
    .bind(await sha256(token), `+${SESSION_HOURS} hours`).run();

  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(token, SESSION_HOURS * 3600) });
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

async function listLogs(env) {
  const { results } = await env.DB.prepare(
    'SELECT ip, success, user_agent, created_at FROM login_logs ORDER BY id DESC LIMIT 200'
  ).all();
  return json({ logs: results });
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
       school, group_name, occupation, how_we_met, phone, email, website, socials, notes, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
  ).bind(...contactValues(data)).first();
  return json({ contact: formatContact(row) }, 201);
}

async function updateContact(request, env, id) {
  await findContact(env, id);
  const data = sanitizeContact(await readJson(request));
  const row = await env.DB.prepare(
    `UPDATE contacts SET first_name = ?, last_name = ?, nickname = ?, birth_year = ?, birth_month = ?, birth_day = ?,
       birthplace = ?, city = ?, school = ?, group_name = ?, occupation = ?, how_we_met = ?, phone = ?, email = ?,
       website = ?, socials = ?, notes = ?, tags = ?, updated_at = datetime('now')
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
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 300) : null;

  await findContact(env, fromId);
  await findContact(env, toId);
  try {
    await env.DB.prepare(
      'INSERT INTO relations (from_id, to_id, label, reverse_label, note) VALUES (?, ?, ?, ?, ?)'
    ).bind(fromId, toId, label, reverse || null, note || null).run();
  } catch {
    throw new HttpError(409, 'Bu iliski zaten var');
  }
  return json({ ok: true }, 201);
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
    notes: str(input.notes, 5000),
    tags: str(input.tags, 300),
  };
}

function contactValues(d) {
  return [
    d.first_name, d.last_name, d.nickname, d.birth_year, d.birth_month, d.birth_day, d.birthplace, d.city,
    d.school, d.group_name, d.occupation, d.how_we_met, d.phone, d.email, d.website,
    JSON.stringify(d.socials), d.notes, d.tags,
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
