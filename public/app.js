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

// ---------- Giris ----------

function showLogin(message = '') {
  $('#app-view').classList.add('hidden');
  $('#login-view').classList.remove('hidden');
  $('#password').value = '';
  $('#login-error').textContent = message;
  $('#username').focus();
}

function showApp() {
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
    await api('/api/login', {
      method: 'POST',
      body: { username: $('#username').value, password: $('#password').value, fp },
    });
    $('#login-error').textContent = '';
    showApp();
  } catch (err) {
    $('#login-error').textContent = err.message;
  }
});

$('#logout-btn').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST', body: {} }).catch(() => {});
  showLogin();
});

// ---------- Sekmeler ----------

document.querySelectorAll('.tab').forEach((btn) => {
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

// ---------- Kisiler ----------

async function loadContacts() {
  const q = $('#search').value.trim();
  const group = $('#group-filter').value;
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (group) params.set('group', group);
  const data = await api(`/api/contacts?${params}`);
  contacts = data.contacts;
  renderGroups();
  renderGrid();
}

function renderGroups() {
  const select = $('#group-filter');
  const current = select.value;
  const groups = [...new Set(contacts.map((c) => c.group_name).filter(Boolean))].sort();
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
  try {
    const [{ contact: c }, all] = await Promise.all([
      api(`/api/contacts/${id}`),
      api('/api/contacts'),
    ]);
    allContacts = all.contacts;
    $('#view-body').innerHTML = viewHtml(c);
    $('#view-dialog').showModal();
  } catch (err) {
    alertError(err);
  }
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
  const others = allContacts.filter((x) => x.id !== c.id);
  const relList = c.relations.length
    ? c.relations.map((r) => `
        <li>
          <span><span class="rel-role">${esc(r.role)}</span> · ${esc(r.other_name)}</span>
          <button class="btn-danger" data-del-rel="${Number(r.id)}">Kaldir</button>
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
  const delRel = e.target.closest('[data-del-rel]')?.dataset.delRel;
  if (act === 'close') $('#view-dialog').close();
  if (act === 'bulk') {
    $('#view-dialog').close();
    openBulk();
  }
  if (act === 'edit') {
    $('#view-dialog').close();
    try {
      const { contact } = await api(`/api/contacts/${viewingId}`);
      openEdit(contact);
    } catch (err) { alertError(err); }
  }
  if (act === 'delete') {
    if (!confirm('Bu kisi ve tum iliskileri silinsin mi?')) return;
    try {
      await api(`/api/contacts/${viewingId}`, { method: 'DELETE' });
      $('#view-dialog').close();
      await loadContacts();
    } catch (err) { if (err.message !== 'Islem iptal edildi') alertError(err); }
  }
  if (delRel) {
    try {
      await api(`/api/relations/${delRel}`, { method: 'DELETE' });
      await openView(viewingId);
    } catch (err) { if (err.message !== 'Islem iptal edildi') alertError(err); }
  }
});

$('#view-body').addEventListener('submit', async (e) => {
  if (e.target.id !== 'rel-form') return;
  e.preventDefault();
  try {
    await api('/api/relations', {
      method: 'POST',
      body: {
        from_id: viewingId,
        to_id: Number($('#rel-target').value),
        label: $('#rel-label').value,
        reverse_label: $('#rel-reverse').value,
      },
    });
    await openView(viewingId);
  } catch (err) { alertError(err); }
});

// ---------- Toplu iliski ----------

function openBulk() {
  bulkSelected = new Set();
  $('#bulk-error').textContent = '';
  const groups = [...new Set(allContacts.map((c) => c.group_name).filter(Boolean))].sort();
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
  return allContacts.filter((c) => c.id !== viewingId && (!g || c.group_name === g));
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
    const res = await api('/api/relations/bulk', {
      method: 'POST',
      body: {
        from_id: viewingId,
        to_ids: [...bulkSelected],
        label,
        reverse_label: $('#bulk-reverse').value.trim(),
      },
    });
    $('#bulk-dialog').close();
    await openView(viewingId);
    alert(`${res.added} iliski eklendi.`);
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
  const form = e.target;
  const num = (v) => (v === '' ? null : Number(v));
  const socials = [...$('#socials-list').querySelectorAll('.social-row')]
    .map((row) => ({ platform: row.querySelector('select').value, username: row.querySelector('input').value.trim() }))
    .filter((s) => s.username);
  const extra = [...$('#extra-list').querySelectorAll('.extra-row')]
    .map((row) => {
      const [l, v] = row.querySelectorAll('input');
      return { label: l.value.trim(), value: v.value.trim() };
    })
    .filter((x) => x.label && x.value);

  const body = {
    first_name: form.elements.first_name.value,
    last_name: form.elements.last_name.value,
    nickname: form.elements.nickname.value,
    birth_year: num(form.elements.birth_year.value),
    birth_month: num(form.elements.birth_month.value),
    birth_day: num(form.elements.birth_day.value),
    birthplace: form.elements.birthplace.value,
    city: form.elements.city.value,
    group_name: form.elements.group_name.value,
    school: form.elements.school.value,
    occupation: form.elements.occupation.value,
    how_we_met: form.elements.how_we_met.value,
    phone: form.elements.phone.value,
    email: form.elements.email.value,
    website: form.elements.website.value,
    tags: form.elements.tags.value,
    notes: form.elements.notes.value,
    socials,
    extra,
  };

  try {
    if (editingId) await api(`/api/contacts/${editingId}`, { method: 'PUT', body });
    else await api('/api/contacts', { method: 'POST', body });
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

api('/api/me').then(showApp).catch(() => showLogin());
