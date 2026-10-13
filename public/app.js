const PLATFORMS = [
  ['instagram', 'Instagram'], ['x', 'X (Twitter)'], ['linkedin', 'LinkedIn'], ['facebook', 'Facebook'],
  ['github', 'GitHub'], ['tiktok', 'TikTok'], ['youtube', 'YouTube'], ['snapchat', 'Snapchat'],
  ['whatsapp', 'WhatsApp (telefon)'], ['telegram', 'Telegram'], ['pinterest', 'Pinterest'],
  ['reddit', 'Reddit'], ['twitch', 'Twitch'], ['threads', 'Threads'], ['bluesky', 'Bluesky'], ['medium', 'Medium'],
];
const PLATFORM_SLUG = {
  instagram: 'instagram', x: 'x', linkedin: 'linkedin', facebook: 'facebook', github: 'github', tiktok: 'tiktok',
  youtube: 'youtube', snapchat: 'snapchat', whatsapp: 'whatsapp', telegram: 'telegram', pinterest: 'pinterest',
  reddit: 'reddit', twitch: 'twitch', threads: 'threads', bluesky: 'bluesky', medium: 'medium',
};
const $ = (sel) => document.querySelector(sel);

let contacts = [];
let editingId = null;
let viewingId = null;
let searchTimer = null;

function esc(value) {
  const d = document.createElement('div');
  d.textContent = value ?? '';
  return d.innerHTML;
}

function hueOf(text) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

async function api(path, options = {}) {
  const opts = { credentials: 'same-origin', ...options, headers: { ...(options.headers || {}) } };
  if (options.body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(options.body);
  }
  const res = await fetch(path, opts);
  if (res.status === 401 && path !== '/api/login') {
    showLogin();
    throw new Error('Oturum sona erdi');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Islem basarisiz');
  return data;
}

function fullName(c) {
  return [c.first_name, c.last_name].filter(Boolean).join(' ');
}

function showLogin() {
  $('#app-view').classList.add('hidden');
  $('#login-view').classList.remove('hidden');
  $('#password').value = '';
  $('#username').focus();
}

function showApp() {
  $('#login-view').classList.add('hidden');
  $('#app-view').classList.remove('hidden');
  loadContacts().catch(alertError);
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#login-error').textContent = '';
  try {
    await api('/api/login', { method: 'POST', body: { username: $('#username').value, password: $('#password').value } });
    showApp();
  } catch (err) {
    $('#login-error').textContent = err.message;
  }
});

$('#logout-btn').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST', body: {} }).catch(() => {});
  showLogin();
});

document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    $('#contacts-tab').classList.toggle('hidden', tab !== 'contacts');
    $('#logs-tab').classList.toggle('hidden', tab !== 'logs');
    if (tab === 'logs') loadLogs().catch(alertError);
  });
});

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
    grid.innerHTML = '<p class="meta">Henuz kisi yok.</p>';
    return;
  }
  grid.innerHTML = contacts.map((c, i) => cardHtml(c, i)).join('');
}

function cardHtml(c, i) {
  const name = fullName(c) || c.first_name;
  const initials = (c.first_name[0] || '?').toUpperCase();
  const ageText = c.age !== null ? `${c.age} yas${c.age_exact ? '' : ' (yaklasik)'}` : '';
  const meta = [c.group_name, ageText, c.city].filter(Boolean).join(' - ');
  const tags = (c.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  const icons = c.socials.map((s) => `<img src="${esc(s.icon)}" alt="" title="${esc(s.platform)}" width="16" height="16" loading="lazy">`).join('');
  return `
    <article class="contact-card tilt" style="--i:${i}" data-id="${Number(c.id)}">
      <div class="contact-head">
        <div class="avatar" style="--h:${hueOf(name)}">${esc(initials)}</div>
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

// 3D egim ve isik efekti
document.addEventListener('pointermove', (e) => {
  const card = e.target.closest?.('.tilt');
  if (!card) return;
  const r = card.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  card.style.transform = `perspective(900px) rotateX(${(-y * 10).toFixed(2)}deg) rotateY(${(x * 12).toFixed(2)}deg)`;
  card.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`);
  card.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`);
});
document.addEventListener('pointerout', (e) => {
  const card = e.target.closest?.('.tilt');
  if (card && !card.contains(e.relatedTarget)) card.style.transform = '';
});

$('#search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadContacts().catch(alertError), 250);
});
$('#group-filter').addEventListener('change', () => loadContacts().catch(alertError));

// ---------- Inceleme paneli ----------

async function openView(id) {
  viewingId = id;
  try {
    const { contact: c } = await api(`/api/contacts/${id}`);
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
  ].filter(([, v]) => v);
  const rowsHtml = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  const web = c.website ? `<dt>Web</dt><dd><a href="${esc(c.website)}" target="_blank" rel="noopener noreferrer nofollow">${esc(c.website)}</a></dd>` : '';

  const socials = c.socials.map((s) =>
    `<a class="chip" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer nofollow"><img src="${esc(s.icon)}" alt="">${esc(s.platform)} @${esc(s.username)}</a>`
  ).join('');

  const tags = (c.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  const others = contacts.filter((x) => x.id !== c.id);
  const relList = c.relations.length
    ? c.relations.map((r) => `
        <li>
          <span><span class="rel-role">${esc(r.role)}</span>: ${esc(r.other_name)}</span>
          <button class="btn small danger" data-del-rel="${Number(r.id)}">Kaldir</button>
        </li>`).join('')
    : '<li class="meta">Henuz iliski eklenmedi.</li>';
  const options = others.map((o) => `<option value="${Number(o.id)}">${esc(fullName(o))}</option>`).join('');

  return `
    <div class="view-head">
      <div class="avatar xl" style="--h:${hueOf(name)}">${esc((c.first_name[0] || '?').toUpperCase())}</div>
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
      <h3>Iliskiler</h3>
      <ul class="rel-list">${relList}</ul>
      ${others.length ? `
      <form id="rel-form" class="rel-form">
        <label>Kisi<select id="rel-target" required>${options}</select></label>
        <label>Bu kisi, ${esc(name)}'in ne?<input id="rel-label" maxlength="60" placeholder="annesi, crush" required></label>
        <label>${esc(name)}, onun ne?<input id="rel-reverse" maxlength="60" placeholder="cocugu, crush"></label>
        <button class="btn primary" type="submit">Ekle</button>
      </form>` : '<p class="meta">Iliski kurmak icin once baska kisi ekleyin.</p>'}
    </div>

    <div class="view-actions">
      <button class="btn ghost" data-act="close">Kapat</button>
      <button class="btn danger" data-act="delete">Sil</button>
      <button class="btn primary" data-act="edit">Duzenle</button>
    </div>`;
}

$('#view-body').addEventListener('click', async (e) => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  const delRel = e.target.closest('[data-del-rel]')?.dataset.delRel;
  if (act === 'close') $('#view-dialog').close();
  if (act === 'edit') {
    $('#view-dialog').close();
    const { contact } = await api(`/api/contacts/${viewingId}`).catch(alertError) || {};
    if (contact) openEdit(contact);
  }
  if (act === 'delete') {
    if (!confirm('Bu kisi ve tum iliskileri silinsin mi?')) return;
    try {
      await api(`/api/contacts/${viewingId}`, { method: 'DELETE' });
      $('#view-dialog').close();
      await loadContacts();
    } catch (err) { alertError(err); }
  }
  if (delRel) {
    try {
      await api(`/api/relations/${delRel}`, { method: 'DELETE' });
      await openView(viewingId);
    } catch (err) { alertError(err); }
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

// ---------- Ekleme / duzenleme ----------

function addSocialRow(platform = 'instagram', username = '') {
  const row = document.createElement('div');
  row.className = 'social-row';
  row.innerHTML = `
    <select>${PLATFORMS.map(([k, label]) => `<option value="${k}" ${k === platform ? 'selected' : ''}>${label}</option>`).join('')}</select>
    <input type="text" placeholder="kullanici adi / numara" maxlength="100">
    <button type="button" class="btn small ghost">x</button>`;
  row.querySelector('input').value = username;
  row.querySelector('button').addEventListener('click', () => row.remove());
  $('#socials-list').appendChild(row);
}

$('#add-social').addEventListener('click', () => addSocialRow());

function openEdit(contact = null) {
  const form = $('#contact-form');
  form.reset();
  $('#socials-list').innerHTML = '';
  $('#form-error').textContent = '';
  editingId = contact ? contact.id : null;
  $('#dialog-title').textContent = contact ? 'Kisiyi duzenle' : 'Yeni kisi';

  if (contact) {
    for (const name of ['first_name', 'last_name', 'nickname', 'birth_year', 'birth_month', 'birth_day', 'birthplace',
      'city', 'group_name', 'school', 'occupation', 'how_we_met', 'phone', 'email', 'website', 'tags', 'notes']) {
      form.elements[name].value = contact[name] ?? '';
    }
    contact.socials.forEach((s) => addSocialRow(s.platform, s.username));
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

// ---------- Loglar ----------

async function loadLogs() {
  const { logs } = await api('/api/logs');
  $('#logs-body').innerHTML = logs.map((l) => `
    <tr>
      <td>${esc(l.created_at)}</td>
      <td>${esc(l.ip)}</td>
      <td class="${l.success ? 'ok' : 'fail'}">${l.success ? 'Basarili' : 'Basarisiz'}</td>
      <td>${esc((l.user_agent || '').slice(0, 80))}</td>
    </tr>`).join('');
}

function alertError(err) {
  alert(err?.message || 'Bir hata olustu');
}

api('/api/me').then(showApp).catch(() => showLogin());
