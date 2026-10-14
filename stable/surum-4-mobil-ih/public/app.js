const PLATFORMS = [
  ['instagram', 'Instagram'], ['x', 'X (Twitter)'], ['linkedin', 'LinkedIn'], ['facebook', 'Facebook'],
  ['github', 'GitHub'], ['tiktok', 'TikTok'], ['youtube', 'YouTube'], ['snapchat', 'Snapchat'],
  ['whatsapp', 'WhatsApp (telefon)'], ['telegram', 'Telegram'], ['pinterest', 'Pinterest'],
  ['reddit', 'Reddit'], ['twitch', 'Twitch'], ['threads', 'Threads'], ['bluesky', 'Bluesky'], ['medium', 'Medium'],
];

// 25 hazir iliski: [bu kisi, karsi taraf] - secilen kisi icin "annesi" ise karsi taraf "cocugu"
const PRESETS = [
  ['annesi', 'cocugu'], ['babasi', 'cocugu'], ['kardesi', 'kardesi'], ['teyzesi', 'yegeni'],
  ['dayisi', 'yegeni'], ['halasi', 'yegeni'], ['amcasi', 'yegeni'], ['buyukannesi', 'torunu'],
  ['buyukbabasi', 'torunu'], ['esi', 'esi'], ['sevgilisi', 'sevgilisi'], ['crush', 'crush'],
  ['en yakin arkadasi', 'en yakin arkadasi'], ['arkadasi', 'arkadasi'], ['sinif arkadasi', 'sinif arkadasi'],
  ['okul arkadasi', 'okul arkadasi'], ['is arkadasi', 'is arkadasi'], ['patronu', 'calisani'],
  ['calisani', 'patronu'], ['ogretmeni', 'ogrencisi'], ['ogrencisi', 'ogretmeni'], ['komsusu', 'komsusu'],
  ['akrabasi', 'akrabasi'], ['kuzeni', 'kuzeni'], ['eski sevgilisi', 'eski sevgilisi'],
];

const $ = (sel) => document.querySelector(sel);

let contacts = [];
let allContacts = [];
let editingId = null;
let viewingId = null;
let searchTimer = null;
let trailOpen = false;
let reauthPending = null;
let bulkSelected = new Set();

function esc(value) {
  const d = document.createElement('div');
  d.textContent = value ?? '';
  return d.innerHTML;
}

function fullName(c) {
  return [c.first_name, c.last_name].filter(Boolean).join(' ');
}

function presetOptions() {
  return PRESETS.map(([a, b], i) => `<option value="${i}">${esc(a)}  ↔  ${esc(b)}</option>`).join('')
    + '<option value="-1">Ozel (kendiniz yazin)</option>';
}

// ---------- Ag katmani ----------

async function api(path, options = {}, retried = false) {
  const opts = { credentials: 'same-origin', ...options, headers: { ...(options.headers || {}) } };
  if (options.body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(options.body);
  }
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));

  if (res.status === 428 && !retried) {
    await requestReauth();
    return api(path, options, true);
  }
  if (res.status === 401 && path !== '/api/login' && path !== '/api/reauth') {
    showLogin();
    throw new Error('Oturum sona erdi');
  }
  if (!res.ok) throw new Error(data.error || 'Islem basarisiz');
  return data;
}

// ---------- Konum izni (zorunlu) ----------

function getGeo() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Bu cihaz konum bilgisini desteklemiyor. Giris yapilamaz.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({
        lat: p.coords.latitude,
        lon: p.coords.longitude,
        acc: Math.round(p.coords.accuracy),
        altitude: p.coords.altitude,
        speed: p.coords.speed,
        ts: p.timestamp,
      }),
      () => reject(new Error('Konum izni verilmedi. Konum izni olmadan giris yapilamaz.')),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });
}

// Cihaz ve tarayici bilgileri (ayak izi)
async function getFingerprint(geo) {
  const fp = {
    geo,
    screen: `${screen.width}x${screen.height}`,
    colorDepth: screen.colorDepth,
    dpr: window.devicePixelRatio,
    viewport: `${innerWidth}x${innerHeight}`,
    orientation: screen.orientation?.type || null,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    tz_offset: new Date().getTimezoneOffset(),
    lang: navigator.language,
    langs: (navigator.languages || []).slice(0, 4),
    platform: navigator.platform,
    ua_platform: navigator.userAgentData?.platform || null,
    ua_mobile: navigator.userAgentData?.mobile ?? null,
    vendor: navigator.vendor,
    cores: navigator.hardwareConcurrency,
    memory: navigator.deviceMemory,
    touch: navigator.maxTouchPoints,
    hover: matchMedia('(hover: hover)').matches,
    online: navigator.onLine,
    net: navigator.connection?.effectiveType || null,
    downlink: navigator.connection?.downlink ?? null,
    rtt: navigator.connection?.rtt ?? null,
    save_data: navigator.connection?.saveData ?? null,
    theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    visibility: document.visibilityState,
    webdriver: navigator.webdriver ?? false,
    cookies: navigator.cookieEnabled,
    ua: navigator.userAgent.slice(0, 300),
    referrer: document.referrer.slice(0, 200),
    at: new Date().toISOString(),
  };
  try {
    if (navigator.getBattery) {
      const b = await Promise.race([navigator.getBattery(), new Promise((r) => setTimeout(() => r(null), 1500))]);
      if (b) fp.battery = { level: Math.round(b.level * 100), charging: b.charging };
    }
  } catch { /* desteklenmiyor */ }
  try {
    if (navigator.storage?.estimate) {
      const s = await Promise.race([navigator.storage.estimate(), new Promise((r) => setTimeout(() => r(null), 1500))]);
      if (s) fp.storage_quota_mb = Math.round((s.quota || 0) / 1048576);
    }
  } catch { /* desteklenmiyor */ }
  return fp;
}

// ---------- Yeniden dogrulama ----------

function requestReauth() {
  return new Promise((resolve, reject) => {
    $('#reauth-password').value = '';
    $('#reauth-error').textContent = '';
    reauthPending = { resolve, reject };
    $('#reauth-dialog').showModal();
    $('#reauth-password').focus();
  });
}

$('#reauth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const geo = await getGeo();
    const fp = await getFingerprint(geo);
    await api('/api/reauth', { method: 'POST', body: { password: $('#reauth-password').value, fp } }, true);
    const pending = reauthPending;
    reauthPending = null;
    $('#reauth-dialog').close();
    pending?.resolve();
  } catch (err) {
    $('#reauth-error').textContent = err.message;
  }
});

$('#reauth-cancel').addEventListener('click', () => $('#reauth-dialog').close());
$('#reauth-dialog').addEventListener('close', () => {
  if (reauthPending) {
    reauthPending.reject(new Error('Islem iptal edildi'));
    reauthPending = null;
  }
});

// ---------- Bosta kalinca oturumu kapat (15 dk) ----------

const IDLE_MS = 15 * 60 * 1000;
let idleTimer = null;
let idleLastTouch = 0;
let idleBound = false;

function resetIdle() {
  const now = Date.now();
  if (now - idleLastTouch < 1000) return;
  idleLastTouch = now;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(idleLogout, IDLE_MS);
}

function startIdle() {
  if (!idleBound) {
    ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach((ev) =>
      document.addEventListener(ev, resetIdle, { passive: true }));
    idleBound = true;
  }
  resetIdle();
}

function stopIdle() {
  clearTimeout(idleTimer);
  idleTimer = null;
}

async function idleLogout() {
  stopIdle();
  await api('/api/logout', { method: 'POST', body: {} }).catch(() => {});
  showLogin('Uzun sure islem yapilmadigi icin oturum kapatildi.');
}

// ---------- Giris ----------

function showLogin(message = '') {
  stopIdle();
  Vault.lock();
  records.clear();
  window.turnstile?.reset();
  $('#app-view').classList.add('hidden');
  $('#login-view').classList.remove('hidden');
  $('#password').value = '';
  $('#login-error').textContent = message;
  $('#username').focus();
}

function showApp() {
  startIdle();
  $('#login-view').classList.add('hidden');
  $('#app-view').classList.remove('hidden');
  loadContacts().catch(alertError);
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#login-error').textContent = 'Konum izni isteniyor...';
  try {
    const geo = await getGeo();
    const fp = await getFingerprint(geo);
    const turnstile = window.turnstile ? window.turnstile.getResponse() : '';
    if (!turnstile) throw new Error('Lutfen dogrulamayi tamamlayin.');
    const password = $('#password').value;
    await api('/api/login', {
      method: 'POST',
      body: { username: $('#username').value, password, fp, turnstile },
    });
    await unlockVault(password);
    $('#login-error').textContent = '';
    showApp();
  } catch (err) {
    $('#login-error').textContent = err.message;
    window.turnstile?.reset();
  }
});

$('#logout-btn').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST', body: {} }).catch(() => {});
  showLogin();
});

// ---------- Sekmeler ----------

document.querySelectorAll('.tab[data-tab]').forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $('#contacts-tab').classList.toggle('hidden', tab !== 'contacts');
  $('#security-tab').classList.toggle('hidden', tab !== 'security');
  $('#add-btn').classList.toggle('hidden', tab !== 'contacts');
  $('#page-title').textContent = tab === 'contacts' ? 'Kisiler' : 'Guvenlik';
  if (tab === 'security') loadSecurity().catch(alertError);
  window.scrollTo({ top: 0 });
}

// ---------- Sifreli veri (tarayicida cozulur) ----------

const SOCIAL_URL = {
  instagram: (u) => `https://instagram.com/${u}`, x: (u) => `https://x.com/${u}`,
  twitter: (u) => `https://x.com/${u}`, linkedin: (u) => `https://www.linkedin.com/in/${u}`,
  facebook: (u) => `https://facebook.com/${u}`, github: (u) => `https://github.com/${u}`,
  tiktok: (u) => `https://www.tiktok.com/@${u}`, youtube: (u) => `https://www.youtube.com/@${u}`,
  snapchat: (u) => `https://www.snapchat.com/add/${u}`, whatsapp: (u) => `https://wa.me/${u}`,
  telegram: (u) => `https://t.me/${u}`, pinterest: (u) => `https://www.pinterest.com/${u}`,
  reddit: (u) => `https://www.reddit.com/user/${u}`, twitch: (u) => `https://www.twitch.tv/${u}`,
  threads: (u) => `https://www.threads.net/@${u}`, bluesky: (u) => `https://bsky.app/profile/${u}`,
  medium: (u) => `https://medium.com/@${u}`,
};
const SOCIAL_SLUG = {
  instagram: 'instagram', x: 'x', twitter: 'x', linkedin: 'linkedin', facebook: 'facebook', github: 'github',
  tiktok: 'tiktok', youtube: 'youtube', snapchat: 'snapchat', whatsapp: 'whatsapp', telegram: 'telegram',
  pinterest: 'pinterest', reddit: 'reddit', twitch: 'twitch', threads: 'threads', bluesky: 'bluesky', medium: 'medium',
};
const USER_RE = /^[A-Za-z0-9._-]{1,100}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const PHONE_RE = /^[+0-9 ()-]{0,30}$/;

// Cozulmus kayitlar: id -> { id, data }. Sunucu bu veriyi gormez.
const records = new Map();

function parseArr(s) {
  try { const v = JSON.parse(s || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}

function legacyToData(row, rels) {
  return {
    first_name: row.first_name, last_name: row.last_name, nickname: row.nickname,
    birth_year: row.birth_year, birth_month: row.birth_month, birth_day: row.birth_day,
    birthplace: row.birthplace, city: row.city, school: row.school, group_name: row.group_name,
    occupation: row.occupation, how_we_met: row.how_we_met, phone: row.phone, email: row.email,
    website: row.website, socials: parseArr(row.socials), extra: parseArr(row.extra),
    notes: row.notes, tags: row.tags, relations: rels,
  };
}

function buildFormData(form) {
  const num = (v) => (v === '' ? null : Number(v));
  const str = (v, max) => (v || '').trim().slice(0, max) || null;
  const socials = [...$('#socials-list').querySelectorAll('.social-row')]
    .map((row) => {
      const platform = row.querySelector('select').value;
      let username = row.querySelector('input').value.trim().replace(/^@/, '');
      if (platform === 'whatsapp') username = username.replace(/\D/g, '');
      return { platform, username };
    })
    .filter((s) => s.username);
  const extra = [...$('#extra-list').querySelectorAll('.extra-row')]
    .map((row) => {
      const [l, v] = row.querySelectorAll('input');
      return { label: l.value.trim().slice(0, 40), value: v.value.trim().slice(0, 300) };
    })
    .filter((x) => x.label && x.value);
  return {
    first_name: str(form.elements.first_name.value, 100),
    last_name: str(form.elements.last_name.value, 100),
    nickname: str(form.elements.nickname.value, 60),
    birth_year: num(form.elements.birth_year.value),
    birth_month: num(form.elements.birth_month.value),
    birth_day: num(form.elements.birth_day.value),
    birthplace: str(form.elements.birthplace.value, 100),
    city: str(form.elements.city.value, 100),
    school: str(form.elements.school.value, 120),
    group_name: str(form.elements.group_name.value, 60),
    occupation: str(form.elements.occupation.value, 100),
    how_we_met: str(form.elements.how_we_met.value, 500),
    phone: str(form.elements.phone.value, 30),
    email: str(form.elements.email.value, 254),
    website: str(form.elements.website.value, 300),
    socials, extra,
    notes: str(form.elements.notes.value, 5000),
    tags: str(form.elements.tags.value, 300),
  };
}

function validate(d) {
  if (!d.first_name) throw new Error('Isim zorunludur');
  if (d.email && !EMAIL_RE.test(d.email)) throw new Error('Gecersiz e-posta');
  if (d.phone && !PHONE_RE.test(d.phone)) throw new Error('Gecersiz telefon');
  if (d.website) {
    try {
      const u = new URL(d.website);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('x');
    } catch { throw new Error('Gecersiz web sitesi (http/https ile baslamali)'); }
  }
  const thisYear = new Date().getFullYear();
  if (d.birth_year !== null && (!Number.isInteger(d.birth_year) || d.birth_year < 1900 || d.birth_year > thisYear)) throw new Error('Gecersiz dogum yili');
  if (d.birth_month !== null && (!Number.isInteger(d.birth_month) || d.birth_month < 1 || d.birth_month > 12)) throw new Error('Gecersiz dogum ayi');
  if (d.birth_day !== null && (!Number.isInteger(d.birth_day) || d.birth_day < 1 || d.birth_day > 31)) throw new Error('Gecersiz dogum gunu');
  for (const s of d.socials) {
    if (!SOCIAL_URL[s.platform]) throw new Error(`Desteklenmeyen hesap: ${s.platform}`);
    const re = s.platform === 'whatsapp' ? /^\+?[0-9]{6,15}$/ : USER_RE;
    if (!re.test(s.username)) throw new Error(`Gecersiz hesap bilgisi: ${s.platform}`);
  }
}

function computeAge(d) {
  if (!d.birth_year) return null;
  const now = new Date();
  let age = now.getFullYear() - d.birth_year;
  if (d.birth_month) {
    const m = now.getMonth() + 1;
    const day = now.getDate();
    if (m < d.birth_month || (m === d.birth_month && d.birth_day && day < d.birth_day)) age--;
  }
  return age;
}

// Gorunum modeli: iliskiler iki yonlu hesaplanir
function buildViews() {
  const views = new Map();
  for (const rec of records.values()) {
    const d = rec.data;
    views.set(rec.id, {
      id: rec.id, ...d,
      socials: (d.socials || []).map((s) => ({
        platform: s.platform, username: s.username,
        url: SOCIAL_URL[s.platform] ? SOCIAL_URL[s.platform](encodeURIComponent(s.username)) : null,
        icon: SOCIAL_SLUG[s.platform] ? `https://cdn.simpleicons.org/${SOCIAL_SLUG[s.platform]}` : null,
      })),
      extra: d.extra || [],
      age: computeAge(d),
      age_exact: !!(d.birth_year && d.birth_month && d.birth_day),
      relations: [],
    });
  }
  for (const rec of records.values()) {
    for (const r of rec.data.relations || []) {
      const src = views.get(rec.id);
      const dst = views.get(r.to);
      if (!src || !dst) continue;
      const key = `${rec.id}|${r.to}|${r.label}`;
      src.relations.push({ key, owner: rec.id, to: r.to, label: r.label, other_name: fullName(dst), role: r.label });
      dst.relations.push({ key, owner: rec.id, to: r.to, label: r.label, other_name: fullName(src), role: r.reverse || r.label });
    }
  }
  return [...views.values()].sort((a, b) =>
    (a.first_name || '').localeCompare(b.first_name || '', 'tr', { sensitivity: 'base' })
    || (a.last_name || '').localeCompare(b.last_name || '', 'tr', { sensitivity: 'base' }));
}

function viewById(id) {
  return buildViews().find((c) => c.id === id);
}

// ---------- Sifre cozme, gecis, kayit ----------

async function loadRecords() {
  const { contacts: rows } = await api('/api/vault/contacts');
  records.clear();
  for (const row of rows) {
    records.set(row.id, { id: row.id, data: await Vault.open(row.payload) });
  }
}

// Eski duz metin kayitlari bir kez sifreleyip yazar (ids korunur)
async function migrateLegacy() {
  const legacy = await api('/api/vault/legacy');
  const relsBy = new Map();
  for (const r of legacy.relations) {
    if (!relsBy.has(r.from_id)) relsBy.set(r.from_id, []);
    relsBy.get(r.from_id).push({ to: r.to_id, label: r.label, reverse: r.reverse_label || '' });
  }
  const CHUNK = 20;
  if (!legacy.contacts.length) {
    await api('/api/vault/import', { method: 'POST', body: { records: [], final: true } });
    return;
  }
  for (let i = 0; i < legacy.contacts.length; i += CHUNK) {
    const slice = legacy.contacts.slice(i, i + CHUNK);
    const payloads = [];
    for (const row of slice) {
      const data = legacyToData(row, relsBy.get(row.id) || []);
      payloads.push({ id: row.id, payload: await Vault.seal(data) });
    }
    const final = i + CHUNK >= legacy.contacts.length;
    await api('/api/vault/import', { method: 'POST', body: { records: payloads, final } });
  }
}

async function unlockVault(password) {
  const status = await api('/api/vault/status');
  let salt = status.salt;
  if (!salt) {
    const init = await api('/api/vault/init', { method: 'POST', body: { salt: Vault.newSalt() } });
    salt = init.salt;
  }
  await Vault.unlock(password, salt);
  if (!status.migrated) await migrateLegacy();
  try {
    await loadRecords();
  } catch {
    Vault.lock();
    throw new Error('Sifreli veriler acilamadi. Parolanizi kontrol edin.');
  }
}

async function persist(id, data) {
  const payload = await Vault.seal(data);
  if (id) {
    await api(`/api/vault/contacts/${id}`, { method: 'PUT', body: { payload } });
    records.set(id, { id, data });
    return id;
  }
  const res = await api('/api/vault/contacts', { method: 'POST', body: { payload } });
  records.set(res.contact.id, { id: res.contact.id, data });
  return res.contact.id;
}

async function deleteContactById(id) {
  const puts = [];
  const updates = [];
  for (const rec of records.values()) {
    if (rec.id === id) continue;
    const rels = rec.data.relations || [];
    const kept = rels.filter((r) => r.to !== id);
    if (kept.length !== rels.length) {
      const data = { ...rec.data, relations: kept };
      puts.push({ id: rec.id, payload: await Vault.seal(data) });
      updates.push({ id: rec.id, data });
    }
  }
  await api('/api/vault/batch', { method: 'POST', body: { puts, deletes: [id] } });
  records.delete(id);
  for (const u of updates) records.set(u.id, u);
}

async function addRelations(fromId, toIds, label, reverse) {
  const rec = records.get(fromId);
  const rels = [...(rec.data.relations || [])];
  let added = 0;
  for (const to of toIds) {
    if (to === fromId || !records.has(to)) continue;
    if (rels.some((r) => r.to === to && r.label === label)) continue;
    rels.push({ to, label, reverse: reverse || '' });
    added++;
  }
  if (added) await persist(fromId, { ...rec.data, relations: rels });
  return added;
}

async function removeRelation(entry) {
  const rec = records.get(entry.owner);
  if (!rec) return;
  const rels = (rec.data.relations || []).filter((r) => !(r.to === entry.to && r.label === entry.label));
  await persist(entry.owner, { ...rec.data, relations: rels });
}

// ---------- Kisiler ----------

async function loadContacts() {
  if (!Vault.isUnlocked()) throw new Error('Kasa kilitli');
  const q = $('#search').value.trim().toLowerCase();
  const group = $('#group-filter').value;
  const all = buildViews();
  renderGroups(all);
  contacts = all
    .filter((c) => !group || c.group_name === group)
    .filter((c) => !q || [c.first_name, c.last_name, c.nickname, c.city, c.school, c.group_name, c.occupation, c.tags, c.email]
      .filter(Boolean).join(' ').toLowerCase().includes(q))
    .slice(0, 500);
  renderGrid();
}

function renderGroups(all) {
  const select = $('#group-filter');
  const current = select.value;
  const groups = [...new Set(all.map((c) => c.group_name).filter(Boolean))].sort();
  if (current && !groups.includes(current)) groups.push(current);
  select.innerHTML = '<option value="">Tum gruplar</option>' +
    groups.map((g) => `<option value="${esc(g)}">${esc(g)}</option>`).join('');
  select.value = current;
}

function renderGrid() {
  const grid = $('#contacts-grid');
  if (!contacts.length) {
    grid.innerHTML = '<div class="glass empty" style="border-radius:24px">Henuz kisi yok. + ile ekleyin.</div>';
    return;
  }
  grid.innerHTML = contacts.map((c, i) => cardHtml(c, i)).join('');
}

function cardHtml(c, i) {
  const name = fullName(c) || c.first_name;
  const initials = (c.first_name[0] || '?').toUpperCase();
  const ageText = c.age !== null ? `${c.age} yas${c.age_exact ? '' : ' (yaklasik)'}` : '';
  const meta = [c.group_name, ageText, c.city].filter(Boolean).join(' · ');
  const tags = (c.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  const icons = c.socials.map((s) => `<img src="${esc(s.icon)}" alt="${esc(s.platform)}" title="${esc(s.platform)}" width="17" height="17" loading="lazy">`).join('');
  return `
    <article class="glass contact-card tilt" style="--i:${i}" data-id="${Number(c.id)}">
      <div class="contact-head">
        <div class="avatar">${esc(initials)}</div>
        <div>
          <div class="contact-name">${esc(name)}${c.nickname ? ` <span class="meta">(${esc(c.nickname)})</span>` : ''}</div>
          <div class="meta">${esc(meta)}</div>
        </div>
      </div>
      ${icons ? `<div class="social-links">${icons}</div>` : ''}
      ${tags.length ? `<div class="tags">${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
    </article>`;
}

$('#contacts-grid').addEventListener('click', (e) => {
  const card = e.target.closest('.contact-card');
  if (card) openView(Number(card.dataset.id));
});

if (window.matchMedia('(hover: hover)').matches) {
  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest?.('.tilt');
    if (!card) return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `perspective(900px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg)`;
    card.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`);
    card.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`);
  });
  document.addEventListener('pointerout', (e) => {
    const card = e.target.closest?.('.tilt');
    if (card && !card.contains(e.relatedTarget)) card.style.transform = '';
  });
}

$('#search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadContacts().catch(alertError), 250);
});
$('#group-filter').addEventListener('change', () => loadContacts().catch(alertError));

// ---------- Inceleme ----------

async function openView(id) {
  viewingId = id;
  const c = viewById(id);
  if (!c) return;
  $('#view-body').innerHTML = viewHtml(c);
  if (!$('#view-dialog').open) $('#view-dialog').showModal();
}

function viewHtml(c) {
  const name = fullName(c) || c.first_name;
  const ageText = c.age !== null ? `${c.age} yas${c.age_exact ? '' : ' (yaklasik)'}` : '';
  const rows = [
    ['Takma ad', c.nickname], ['Grup / sinif', c.group_name], ['Okul', c.school], ['Meslek', c.occupation],
    ['Dogum', [c.birth_day, c.birth_month, c.birth_year].filter(Boolean).join('.')], ['Dogum yeri', c.birthplace],
    ['Yas', ageText], ['Sehir', c.city], ['Telefon', c.phone], ['E-posta', c.email],
    ['Nasil tanistik', c.how_we_met],
    ...c.extra.map((x) => [x.label, x.value]),
  ].filter(([, v]) => v);
  const rowsHtml = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  const web = c.website ? `<dt>Web</dt><dd><a href="${esc(c.website)}" target="_blank" rel="noopener noreferrer nofollow">${esc(c.website)}</a></dd>` : '';

  const socials = c.socials.map((s) =>
    `<a class="chip" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer nofollow"><img src="${esc(s.icon)}" alt="">${esc(s.platform)} @${esc(s.username)}</a>`
  ).join('');

  const tags = (c.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  const others = buildViews().filter((x) => x.id !== c.id);
  const relList = c.relations.length
    ? c.relations.map((r) => `
        <li>
          <span><span class="rel-role">${esc(r.role)}</span> · ${esc(r.other_name)}</span>
          <button class="btn-danger" data-del-rel="${esc(r.key)}">Kaldir</button>
        </li>`).join('')
    : '<li class="meta">Henuz iliski eklenmedi.</li>';
  const options = others.map((o) => `<option value="${Number(o.id)}">${esc(fullName(o))}</option>`).join('');

  return `
    <div class="sheet-grip"></div>
    <div class="view-head">
      <div class="avatar xl">${esc((c.first_name[0] || '?').toUpperCase())}</div>
      <div>
        <h2>${esc(name)}</h2>
        ${c.nickname ? `<div class="meta">"${esc(c.nickname)}"</div>` : ''}
        ${c.group_name ? `<div class="meta">${esc(c.group_name)}</div>` : ''}
      </div>
    </div>
    ${rowsHtml || web ? `<dl class="info">${rowsHtml}${web}</dl>` : ''}
    ${socials ? `<div class="social-links">${socials}</div>` : ''}
    ${tags.length ? `<div class="tags" style="margin-top:12px">${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
    ${c.notes ? `<p class="notes" style="margin-top:14px">${esc(c.notes)}</p>` : ''}

    <div class="section">
      <div class="section-title">
        <h3>Iliskiler</h3>
        ${others.length ? '<button type="button" class="pill glass small" data-act="bulk">Toplu ekle</button>' : ''}
      </div>
      <ul class="rel-list">${relList}</ul>
      ${others.length ? `
      <form id="rel-form" class="rel-form">
        <label>Iliski turu<select id="rel-preset">${presetOptions()}</select></label>
        <label>Kisi<select id="rel-target" required>${options}</select></label>
        <div class="row2">
          <label>Bu kisi, ${esc(name)}'in ne?<input id="rel-label" maxlength="60" required value="${esc(PRESETS[0][0])}"></label>
          <label>${esc(name)}, onun ne?<input id="rel-reverse" maxlength="60" value="${esc(PRESETS[0][1])}"></label>
        </div>
        <button class="btn-primary" type="submit">Iliski ekle</button>
      </form>` : '<p class="meta">Iliski kurmak icin once baska kisi ekleyin.</p>'}
    </div>

    <div class="view-actions">
      <button class="btn-ghost" data-act="close">Kapat</button>
      <button class="btn-danger" data-act="delete">Sil</button>
      <button class="btn-primary" data-act="edit">Duzenle</button>
    </div>`;
}

$('#view-body').addEventListener('change', (e) => {
  if (e.target.id !== 'rel-preset') return;
  const i = Number(e.target.value);
  if (i < 0) return;
  $('#rel-label').value = PRESETS[i][0];
  $('#rel-reverse').value = PRESETS[i][1];
});

$('#view-body').addEventListener('click', async (e) => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  const delKey = e.target.closest('[data-del-rel]')?.dataset.delRel;
  if (act === 'close') $('#view-dialog').close();
  if (act === 'bulk') {
    $('#view-dialog').close();
    openBulk();
  }
  if (act === 'edit') {
    $('#view-dialog').close();
    openEdit(viewById(viewingId));
  }
  if (act === 'delete') {
    if (!confirm('Bu kisi ve tum iliskileri silinsin mi?')) return;
    try {
      await deleteContactById(viewingId);
      $('#view-dialog').close();
      await loadContacts();
    } catch (err) { if (err.message !== 'Islem iptal edildi') alertError(err); }
  }
  if (delKey) {
    try {
      const entry = viewById(viewingId).relations.find((r) => r.key === delKey);
      if (entry) await removeRelation(entry);
      await openView(viewingId);
      await loadContacts();
    } catch (err) { if (err.message !== 'Islem iptal edildi') alertError(err); }
  }
});

$('#view-body').addEventListener('submit', async (e) => {
  if (e.target.id !== 'rel-form') return;
  e.preventDefault();
  try {
    const label = $('#rel-label').value.trim();
    if (!label) throw new Error('Iliski etiketi zorunludur');
    const added = await addRelations(viewingId, [Number($('#rel-target').value)], label, $('#rel-reverse').value.trim());
    if (!added) throw new Error('Bu iliski zaten var');
    await openView(viewingId);
    await loadContacts();
  } catch (err) { alertError(err); }
});

// ---------- Toplu iliski ----------

function openBulk() {
  bulkSelected = new Set();
  $('#bulk-error').textContent = '';
  const all = buildViews();
  const groups = [...new Set(all.map((c) => c.group_name).filter(Boolean))].sort();
  $('#bulk-group').innerHTML = '<option value="">Tum kisiler</option>' +
    groups.map((g) => `<option value="${esc(g)}">${esc(g)}</option>`).join('');
  $('#bulk-preset').innerHTML = presetOptions();
  $('#bulk-label').value = PRESETS[0][0];
  $('#bulk-reverse').value = PRESETS[0][1];
  renderBulkList();
  $('#bulk-dialog').showModal();
}

function bulkVisible() {
  const g = $('#bulk-group').value;
  return buildViews().filter((c) => c.id !== viewingId && (!g || c.group_name === g));
}

function renderBulkList() {
  const list = bulkVisible();
  $('#bulk-list').innerHTML = list.length ? list.map((c) => `
    <label class="pick">
      <input type="checkbox" value="${Number(c.id)}" ${bulkSelected.has(c.id) ? 'checked' : ''}>
      <span>${esc(fullName(c))}</span>
      <small>${esc(c.group_name || '')}</small>
    </label>`).join('') : '<div class="empty">Bu grupta kisi yok.</div>';
  $('#bulk-count').textContent = `${bulkSelected.size} kisi secili`;
}

$('#bulk-group').addEventListener('change', renderBulkList);
$('#bulk-preset').addEventListener('change', (e) => {
  const i = Number(e.target.value);
  if (i < 0) return;
  $('#bulk-label').value = PRESETS[i][0];
  $('#bulk-reverse').value = PRESETS[i][1];
});
$('#bulk-list').addEventListener('change', (e) => {
  const id = Number(e.target.value);
  if (e.target.checked) bulkSelected.add(id);
  else bulkSelected.delete(id);
  $('#bulk-count').textContent = `${bulkSelected.size} kisi secili`;
});
$('#bulk-all').addEventListener('click', () => {
  bulkVisible().forEach((c) => bulkSelected.add(c.id));
  renderBulkList();
});
$('#bulk-none').addEventListener('click', () => {
  bulkSelected = new Set();
  renderBulkList();
});
$('#bulk-cancel').addEventListener('click', () => {
  $('#bulk-dialog').close();
  if (viewingId) openView(viewingId);
});

$('#bulk-confirm').addEventListener('click', async () => {
  $('#bulk-error').textContent = '';
  const label = $('#bulk-label').value.trim();
  if (!bulkSelected.size) { $('#bulk-error').textContent = 'En az bir kisi secin.'; return; }
  if (!label) { $('#bulk-error').textContent = 'Iliski turu bos olamaz.'; return; }
  try {
    const added = await addRelations(viewingId, [...bulkSelected], label, $('#bulk-reverse').value.trim());
    $('#bulk-dialog').close();
    await openView(viewingId);
    await loadContacts();
    alert(`${added} iliski eklendi.`);
  } catch (err) {
    $('#bulk-error').textContent = err.message;
  }
});

// ---------- Ekleme / duzenleme ----------

function addSocialRow(platform = 'instagram', username = '') {
  const row = document.createElement('div');
  row.className = 'social-row';
  row.innerHTML = `
    <div class="row-x">
      <select>${PLATFORMS.map(([k, label]) => `<option value="${k}" ${k === platform ? 'selected' : ''}>${label}</option>`).join('')}</select>
      <button type="button" class="btn-danger">Sil</button>
    </div>
    <input type="text" placeholder="kullanici adi / numara" maxlength="100">`;
  row.querySelector('input').value = username;
  row.querySelector('.btn-danger').addEventListener('click', () => row.remove());
  $('#socials-list').appendChild(row);
}

function addExtraRow(label = '', value = '') {
  const row = document.createElement('div');
  row.className = 'extra-row';
  row.innerHTML = `
    <div class="pair">
      <input type="text" placeholder="Alan adi (orn. Ek telefon)" maxlength="40">
      <input type="text" placeholder="Deger" maxlength="300">
      <button type="button" class="btn-danger">x</button>
    </div>`;
  const [l, v] = row.querySelectorAll('input');
  l.value = label;
  v.value = value;
  row.querySelector('.btn-danger').addEventListener('click', () => row.remove());
  $('#extra-list').appendChild(row);
}

$('#add-social').addEventListener('click', () => addSocialRow());
$('#add-extra').addEventListener('click', () => addExtraRow());

function openEdit(contact = null) {
  const form = $('#contact-form');
  form.reset();
  $('#socials-list').innerHTML = '';
  $('#extra-list').innerHTML = '';
  $('#form-error').textContent = '';
  editingId = contact ? contact.id : null;
  $('#dialog-title').textContent = contact ? 'Kisiyi duzenle' : 'Yeni kisi';

  if (contact) {
    for (const name of ['first_name', 'last_name', 'nickname', 'birth_year', 'birth_month', 'birth_day', 'birthplace',
      'city', 'group_name', 'school', 'occupation', 'how_we_met', 'phone', 'email', 'website', 'tags', 'notes']) {
      form.elements[name].value = contact[name] ?? '';
    }
    contact.socials.forEach((s) => addSocialRow(s.platform, s.username));
    contact.extra.forEach((x) => addExtraRow(x.label, x.value));
  }
  $('#contact-dialog').showModal();
}

$('#add-btn').addEventListener('click', () => openEdit());
$('#cancel-btn').addEventListener('click', () => $('#contact-dialog').close());

$('#contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = buildFormData(e.target);
    validate(data);
    // Duzenlemede mevcut iliskiler korunur
    data.relations = editingId ? (records.get(editingId)?.data.relations || []) : [];
    await persist(editingId, data);
    $('#contact-dialog').close();
    await loadContacts();
  } catch (err) {
    $('#form-error').textContent = err.message;
  }
});

// ---------- Guvenlik ----------

function deviceName(ua = '') {
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Bilinmeyen cihaz';
}

function footprintLines(l) {
  const fp = l.fingerprint || {};
  const client = fp.client || {};
  const server = fp.server || {};
  const geo = client.geo;
  const place = [server.city, server.country].filter(Boolean).join(', ') || 'Sunucu konumu yok';
  const gpsText = geo ? `${geo.lat.toFixed(5)}, ${geo.lon.toFixed(5)} (±${geo.acc} m)` : 'izin verilmedi';
  const bat = client.battery ? `${client.battery.level}%${client.battery.charging ? ' (sarjda)' : ''}` : 'bilinmiyor';
  const lines = [
    `Cihaz <b>${esc(deviceName(l.user_agent || client.ua))}</b> · ${esc(client.ua_platform || client.platform || '-')} · ${client.ua_mobile ? 'mobil' : 'masaustu'}`,
    `GPS <b>${esc(gpsText)}</b> · Yaklasik yer <b>${esc(place)}</b>`,
    `Pil <b>${esc(bat)}</b> · Ekran <b>${esc(client.screen || '-')}</b> (${esc(client.colorDepth || '-')} bit) · DPR <b>${esc(client.dpr ?? '-')}</b>`,
    `Dil <b>${esc(client.lang || '-')}</b> · Saat dilimi <b>${esc(client.tz || '-')}</b> · Hafiza <b>${esc(client.memory ?? '-')} GB</b> · Cekirdek <b>${esc(client.cores ?? '-')}</b>`,
    `Ag <b>${esc(server.org || '-')}</b> · Baglanti <b>${esc(client.net || '-')}</b> · Hiz <b>${esc(client.downlink ?? '-')} Mb/s</b> · Gecikme <b>${esc(client.rtt ?? '-')} ms</b>`,
    `Yonlendiren <b>${esc(client.referrer || server.referer || '-')}</b> · Tarayici otomasyonu <b>${client.webdriver ? 'evet' : 'hayir'}</b>`,
  ];
  return lines.map((x) => `<div>${x}</div>`).join('');
}

async function loadSecurity() {
  const data = await api('/api/security');
  $('#stat-total').textContent = data.totals.total;
  $('#stat-fail').textContent = data.totals.fails;
  $('#stat-blocked').textContent = data.totals.blocked;

  $('#ip-list').innerHTML = data.ips.length ? data.ips.map((r) => `
    <div class="glass row-card">
      <div class="info-col">
        <div class="ip">${esc(r.ip)}${r.blocked ? '<span class="badge block">Engelli</span>' : ''}</div>
        <div class="meta">${Number(r.total)} deneme · ${Number(r.fails)} basarisiz · ${esc(r.last_at)}</div>
      </div>
      ${r.blocked ? '' : `<button class="btn-danger" data-block="${esc(r.ip)}">Engelle</button>`}
    </div>`).join('') : '<div class="empty">Kayit yok.</div>';

  $('#blocked-list').innerHTML = data.blocked.length ? data.blocked.map((b) => `
    <div class="glass row-card">
      <div class="info-col">
        <div class="ip">${esc(b.ip)}</div>
        <div class="meta">${esc(b.created_at)} tarihinde engellendi</div>
      </div>
      <button class="pill glass small" data-unblock="${esc(b.ip)}">Engeli kaldir</button>
    </div>`).join('') : '<div class="empty">Engellenen adres yok.</div>';

  if (trailOpen) await loadTrail();
}

async function loadTrail() {
  const { logs } = await api('/api/logs?limit=40');
  const kindName = { login: 'Giris', reauth: 'Yeniden dogrulama', login_no_geo: 'Konum izni yok', reauth_no_geo: 'Konum izni yok (dogrulama)' };
  $('#trail').innerHTML = logs.length ? logs.map((l) => {
    const result = l.success ? '<span class="badge ok">Basarili</span>' : '<span class="badge bad">Basarisiz</span>';
    return `
      <div class="glass row-card" style="align-items:flex-start">
        <div class="info-col">
          <div class="ip">${esc(l.ip)} ${result}</div>
          <div class="meta">${esc(l.created_at)} · ${esc(kindName[l.event] || l.event)}</div>
          <div class="fp-line">${footprintLines(l)}</div>
        </div>
      </div>`;
  }).join('') : '<div class="empty">Ayak izi yok.</div>';
}

$('#toggle-trail').addEventListener('click', async () => {
  trailOpen = !trailOpen;
  $('#trail').classList.toggle('hidden', !trailOpen);
  $('#toggle-trail').textContent = trailOpen ? 'Kapat' : 'Ayrintili goster';
  if (trailOpen) await loadTrail().catch(alertError);
});

$('#security-tab').addEventListener('click', async (e) => {
  const blockIp = e.target.closest('[data-block]')?.dataset.block;
  const unblockIp = e.target.closest('[data-unblock]')?.dataset.unblock;
  try {
    if (blockIp) {
      if (!confirm(`${blockIp} adresi engellensin mi?`)) return;
      await api('/api/blocks', { method: 'POST', body: { ip: blockIp } });
      await loadSecurity();
    }
    if (unblockIp) {
      await api(`/api/blocks?ip=${encodeURIComponent(unblockIp)}`, { method: 'DELETE' });
      await loadSecurity();
    }
  } catch (err) { if (err.message !== 'Islem iptal edildi') alertError(err); }
});

function alertError(err) {
  alert(err?.message || 'Bir hata olustu');
}

// ---------- Ozet, tema, iliski haritasi ----------

// Ozet: tum istatistikler ve ortalamalar (sol ustteki Ozet dugmesinde)
function summaryHtml(all) {
  const n = all.length;
  if (!n) return '<div class="empty">Henuz kisi yok.</div>';
  const groups = new Map(), cities = new Map();
  const ages = [];
  let edges = 0, noRel = 0, topPerson = null, topN = 0;
  for (const c of all) {
    if (c.group_name) groups.set(c.group_name, (groups.get(c.group_name) || 0) + 1);
    if (c.city) cities.set(c.city, (cities.get(c.city) || 0) + 1);
    if (typeof c.age === 'number') ages.push(c.age);
    edges += c.relations.filter((r) => r.owner === c.id).length; // her iliski bir kez sayilir
    const deg = c.relations.length;
    if (!deg) noRel++;
    if (deg > topN) { topN = deg; topPerson = c; }
  }
  const top = (m) => { let b = '-', k = 0; for (const [x, v] of m) if (v > k) { b = x; k = v; } return b; };
  const avg = (arr, d = 1) => (arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(d) : '-');
  const latest = [...records.values()].sort((a, b) => b.id - a.id).slice(0, 3)
    .map((r) => [r.data.first_name, r.data.last_name].filter(Boolean).join(' '));
  const tiles = [
    [n, 'Kisi'], [groups.size, 'Grup'], [edges, 'Iliski'], [noRel, 'Iliskisiz kisi'],
    [((edges * 2) / n).toFixed(1), 'Kisi basi ort. iliski'],
    [avg(ages, 1), 'Ortalama yas'], [groups.size ? (n / groups.size).toFixed(1) : '-', 'Grup basi ort. kisi'],
    [esc(top(groups)), 'En buyuk grup'], [esc(top(cities)), 'En cok sehir'],
  ];
  const tilesHtml = tiles.map(([v, l]) => `<div class="glass"><b>${v}</b><span>${l}</span></div>`).join('');
  const topHtml = topPerson && topN
    ? `<div class="glass stats-latest">En cok iliskisi olan: ${esc(fullName(topPerson))} (${topN})</div>` : '';
  return `<div class="stats-bar">${tilesHtml}${topHtml}` +
    `<div class="glass stats-latest">Son eklenenler: ${latest.map((x) => esc(x)).join(', ')}</div></div>`;
}

function openSummary() {
  $('#summary-box').innerHTML = summaryHtml(buildViews());
  $('#summary-dialog').showModal();
}
$('#summary-btn').addEventListener('click', openSummary);
$('#summary-close').addEventListener('click', () => $('#summary-dialog').close());

// Iliskisi olan kisilerden SVG agi. Iliski yoksa null doner.
const GRAPH_SIZE = 600;
let graphW = GRAPH_SIZE;
let gv = { x: 0, y: 0, w: GRAPH_SIZE, h: GRAPH_SIZE }; // gorunum (viewBox)
let graphLocked = false;   // kilitliyken dokunma/tekerlek ile hareket kapali
let graphLabels = null;    // null: yakinlasinca otomatik, true/false: elle
const gPointers = new Map();
let gPinch = null;
let gDist = 0;             // toplam hareket (tiklama ile surukleme ayrimi)
let gMoved = false;

function ringLayout(n) {
  const pts = [];
  let left = n, r = 60, ring = 0;
  while (left > 0) {
    const cap = Math.min(left, Math.max(6, Math.floor((2 * Math.PI * r) / 26)));
    for (let k = 0; k < cap; k++) {
      const a = (2 * Math.PI * k) / cap - Math.PI / 2 + ring * 0.35;
      pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
    }
    left -= cap;
    r += 34;
    ring++;
  }
  return pts;
}

function graphSvg(all) {
  const nodes = all.filter((c) => c.relations.length);
  if (!nodes.length) return null;
  const raw = ringLayout(nodes.length);
  const maxR = raw.reduce((m, p) => Math.max(m, Math.hypot(p.x, p.y)), 0);
  graphW = Math.max(GRAPH_SIZE, Math.ceil(2 * (maxR + 50)));
  const c = graphW / 2;
  const nodeR = nodes.length <= 20 ? 16 : nodes.length <= 80 ? 11 : 8;
  const pos = new Map();
  nodes.forEach((n, i) => pos.set(n.id, { x: c + raw[i].x, y: c + raw[i].y }));
  const edges = [];
  for (const n of nodes) {
    for (const r of n.relations) {
      if (r.owner !== n.id || !pos.has(r.to)) continue;
      edges.push({ a: pos.get(n.id), b: pos.get(r.to), label: r.label });
    }
  }
  const svgEdges = edges.map((e) => {
    const mx = (e.a.x + e.b.x) / 2, my = (e.a.y + e.b.y) / 2;
    return `<line class="edge" x1="${e.a.x}" y1="${e.a.y}" x2="${e.b.x}" y2="${e.b.y}"/>` +
      `<text class="edge-label" x="${mx}" y="${my}" text-anchor="middle">${esc(e.label)}</text>`;
  }).join('');
  const svgNodes = nodes.map((n) => {
    const p = pos.get(n.id);
    return `<g class="node" data-id="${Number(n.id)}"><circle cx="${p.x}" cy="${p.y}" r="${nodeR}"/>` +
      `<text x="${p.x}" y="${p.y + nodeR + 13}">${esc(n.first_name)}</text></g>`;
  }).join('');
  gv = { x: 0, y: 0, w: graphW, h: graphW };
  return `<svg viewBox="0 0 ${graphW} ${graphW}" role="img" aria-label="Iliski haritasi">${svgEdges}${svgNodes}</svg>`;
}

function graphLabelsOn() {
  return graphLabels === null ? gv.w <= graphW * 0.55 : graphLabels;
}

function applyGraphView() {
  const svg = document.querySelector('#graph-box svg');
  if (!svg) return;
  svg.setAttribute('viewBox', `${gv.x} ${gv.y} ${gv.w} ${gv.h}`);
  svg.classList.toggle('show-labels', graphLabelsOn());
}

// Ekran noktasini harita koordinatina cevirir
function gScreenToSvg(clientX, clientY) {
  const svg = document.querySelector('#graph-box svg');
  const rect = svg.getBoundingClientRect();
  return {
    x: gv.x + ((clientX - rect.left) / rect.width) * gv.w,
    y: gv.y + ((clientY - rect.top) / rect.height) * gv.h,
  };
}

function zoomAt(factor, cx, cy) {
  const nw = Math.min(graphW * 1.1, Math.max(graphW * 0.06, gv.w * factor));
  const ax = (cx - gv.x) / gv.w, ay = (cy - gv.y) / gv.h;
  gv = { x: cx - ax * nw, y: cy - ay * nw, w: nw, h: nw };
  applyGraphView();
}

function zoomGraph(factor) {
  zoomAt(factor, gv.x + gv.w / 2, gv.y + gv.h / 2);
}

function resetGraphView() {
  gv = { x: 0, y: 0, w: graphW, h: graphW };
  applyGraphView();
}

function refreshGraphMenu() {
  $('#menu-lock').textContent = graphLocked ? 'Haritayi ac' : 'Haritayi kilitle';
  $('#menu-labels').textContent = graphLabelsOn() ? 'Etiketleri gizle' : 'Etiketleri goster';
}

function openGraph() {
  const svg = graphSvg(buildViews());
  if (!svg) { alert('Henuz iliski yok.'); return; }
  $('#graph-box').innerHTML = svg;
  $('#graph-box').classList.toggle('locked', graphLocked);
  applyGraphView();
  refreshGraphMenu();
  document.body.style.overflow = 'hidden'; // sayfa arkada kaymasin
  $('#graph-dialog').showModal();
}

$('#graph-btn').addEventListener('click', openGraph);
$('#graph-close').addEventListener('click', () => $('#graph-dialog').close());
$('#graph-dialog').addEventListener('close', () => { document.body.style.overflow = ''; });

const gBox = $('#graph-box');

// Tekerlek ile imlec noktasina yakinlastirma (masaustu)
gBox.addEventListener('wheel', (e) => {
  if (graphLocked || !document.querySelector('#graph-box svg')) return;
  e.preventDefault();
  const p = gScreenToSvg(e.clientX, e.clientY);
  zoomAt(e.deltaY > 0 ? 1.15 : 1 / 1.15, p.x, p.y);
}, { passive: false });

gBox.addEventListener('pointerdown', (e) => {
  gBox.setPointerCapture(e.pointerId);
  gPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  gMoved = false;
  gDist = 0;
  if (gPointers.size === 2) {
    const [a, b] = [...gPointers.values()];
    gPinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  }
});

gBox.addEventListener('pointermove', (e) => {
  if (!gPointers.has(e.pointerId) || graphLocked) return;
  const prev = gPointers.get(e.pointerId);
  gPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const svg = document.querySelector('#graph-box svg');
  if (!svg) return;
  const rect = svg.getBoundingClientRect();

  if (gPointers.size >= 2 && gPinch) {
    // Iki parmak: yakinlastir/uzaklastir + orta noktayla kaydir
    const [a, b] = [...gPointers.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    if (dist > 0 && gPinch.dist > 0) {
      const p = gScreenToSvg(mx, my);
      zoomAt(gPinch.dist / dist, p.x, p.y);
    }
    gv = { ...gv, x: gv.x - (mx - gPinch.mx) * (gv.w / rect.width), y: gv.y - (my - gPinch.my) * (gv.h / rect.height) };
    applyGraphView();
    gPinch = { dist, mx, my };
    gMoved = true;
    return;
  }

  // Tek parmak: kaydir
  const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
  gDist += Math.abs(dx) + Math.abs(dy);
  if (gDist > 8) gMoved = true;
  gv = { ...gv, x: gv.x - dx * (gv.w / rect.width), y: gv.y - dy * (gv.h / rect.height) };
  applyGraphView();
});

const gEnd = (e) => {
  gPointers.delete(e.pointerId);
  if (gPointers.size < 2) gPinch = null;
};
gBox.addEventListener('pointerup', gEnd);
gBox.addEventListener('pointercancel', gEnd);

// Kaydirma/yakinlastirma olmadiysa dugume dokunmak kisiyi acar
gBox.addEventListener('click', (e) => {
  if (gMoved) return;
  const id = Number(e.target.closest('.node')?.dataset.id);
  if (!id) return;
  $('#graph-dialog').close();
  openView(id);
});

// Alt bar menusu (hamburger)
$('#graph-menu-btn').addEventListener('click', () => {
  refreshGraphMenu();
  $('#graph-menu').showModal();
});
$('#graph-menu').addEventListener('click', (e) => {
  const act = e.target.closest('[data-g]')?.dataset.g;
  if (!act) return;
  if (act === 'in') zoomGraph(1 / 1.4);
  if (act === 'out') zoomGraph(1.4);
  if (act === 'reset') resetGraphView();
  if (act === 'labels') { graphLabels = !graphLabelsOn(); applyGraphView(); }
  if (act === 'lock') { graphLocked = !graphLocked; gBox.classList.toggle('locked', graphLocked); }
  $('#graph-menu').close();
});

function applyTheme(theme) {
  if (theme === 'light') document.documentElement.dataset.theme = 'light';
  else delete document.documentElement.dataset.theme;
}
// Depolama engelliyse (bazi gizli modlar) uygulama yine acilir
function savedTheme() {
  try { return localStorage.getItem('theme'); } catch { return null; }
}
function saveTheme(theme) {
  try { localStorage.setItem('theme', theme); } catch { /* yoksay */ }
}
$('#theme-btn').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  saveTheme(next);
  applyTheme(next);
});
applyTheme(savedTheme() || 'dark');

api('/api/me').then(() => {
  if (Vault.isUnlocked()) showApp();
  else showLogin('Sifreli verileriniz icin tekrar giris yapin.');
}).catch(() => showLogin());
