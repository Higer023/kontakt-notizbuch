const PLATFORMS = ['instagram', 'twitter', 'x', 'linkedin', 'facebook', 'github', 'tiktok', 'youtube'];
const $ = (sel) => document.querySelector(sel);

let contacts = [];
let editingId = null;
let searchTimer = null;

function esc(value) {
  const d = document.createElement('div');
  d.textContent = value ?? '';
  return d.innerHTML;
}

async function api(path, options = {}) {
  const opts = { credentials: 'same-origin', ...options, headers: { ...(options.headers || {}) } };
  if (options.body && !(options.body instanceof Blob)) {
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

function showLogin() {
  $('#app-view').classList.add('hidden');
  $('#login-view').classList.remove('hidden');
  $('#password').value = '';
  $('#password').focus();
}

function showApp() {
  $('#login-view').classList.add('hidden');
  $('#app-view').classList.remove('hidden');
  loadContacts();
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#login-error').textContent = '';
  try {
    await api('/api/login', { method: 'POST', body: { password: $('#password').value } });
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
  const data = await api(`/api/contacts${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  contacts = data.contacts;
  renderContacts();
}

function renderContacts() {
  const grid = $('#contacts-grid');
  if (!contacts.length) {
    grid.innerHTML = '<p class="meta">Henuz kisi yok.</p>';
    return;
  }
  grid.innerHTML = contacts.map(cardHtml).join('');
}

function cardHtml(c) {
  const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ');
  const initials = (c.first_name[0] || '?').toUpperCase();
  const avatar = c.photo_url
    ? `<img class="avatar" src="${esc(c.photo_url)}" alt="">`
    : `<div class="avatar">${esc(initials)}</div>`;

  const ageText = c.age !== null ? `${c.age} yas${c.age_exact ? '' : ' (yaklasik)'}` : '';
  const meta = [ageText, c.city].filter(Boolean).join(' · ');
  const tags = (c.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  const socials = c.socials
    .map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer nofollow">${esc(s.platform)}: @${esc(s.username)}</a>`)
    .join('');

  return `
    <article class="contact-card">
      <div class="contact-head">
        ${avatar}
        <div>
          <div class="contact-name">${esc(fullName)}</div>
          <div class="meta">${esc(meta)}</div>
        </div>
      </div>
      ${c.phone ? `<div class="meta">${esc(c.phone)}</div>` : ''}
      ${c.email ? `<div class="meta">${esc(c.email)}</div>` : ''}
      ${socials ? `<div class="social-links">${socials}</div>` : ''}
      ${tags.length ? `<div class="tags">${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
      ${c.notes ? `<div class="notes">${esc(c.notes)}</div>` : ''}
      <div class="card-actions">
        <button class="btn small" data-action="edit" data-id="${Number(c.id)}">Duzenle</button>
        <button class="btn small" data-action="delete" data-id="${Number(c.id)}">Sil</button>
      </div>
    </article>`;
}

$('#contacts-grid').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (btn.dataset.action === 'edit') openDialog(contacts.find((c) => c.id === id));
  if (btn.dataset.action === 'delete') deleteContact(id);
});

$('#search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadContacts().catch(alertError), 250);
});

function addSocialRow(platform = 'instagram', username = '') {
  const row = document.createElement('div');
  row.className = 'social-row';
  row.innerHTML = `
    <select>${PLATFORMS.map((p) => `<option value="${p}" ${p === platform ? 'selected' : ''}>${p}</option>`).join('')}</select>
    <input type="text" placeholder="kullaniciadi" maxlength="100">
    <button type="button" class="btn small ghost">x</button>`;
  row.querySelector('input').value = username;
  row.querySelector('button').addEventListener('click', () => row.remove());
  $('#socials-list').appendChild(row);
}

$('#add-social').addEventListener('click', () => addSocialRow());

function openDialog(contact = null) {
  const form = $('#contact-form');
  form.reset();
  $('#socials-list').innerHTML = '';
  $('#form-error').textContent = '';
  $('#photo-input').value = '';
  editingId = contact ? contact.id : null;
  $('#dialog-title').textContent = contact ? 'Kisiyi duzenle' : 'Yeni kisi';

  if (contact) {
    for (const name of ['first_name', 'last_name', 'birth_year', 'birth_month', 'birth_day', 'city', 'phone', 'email', 'tags', 'notes']) {
      form.elements[name].value = contact[name] ?? '';
    }
    contact.socials.forEach((s) => addSocialRow(s.platform, s.username));
  }
  $('#contact-dialog').showModal();
}

$('#add-btn').addEventListener('click', () => openDialog());
$('#cancel-btn').addEventListener('click', () => $('#contact-dialog').close());

$('#contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const num = (v) => (v === '' ? null : Number(v));

  const socials = [...$('#socials-list').querySelectorAll('.social-row')]
    .map((row) => ({
      platform: row.querySelector('select').value,
      username: row.querySelector('input').value.trim(),
    }))
    .filter((s) => s.username);

  const body = {
    first_name: form.elements.first_name.value,
    last_name: form.elements.last_name.value,
    birth_year: num(form.elements.birth_year.value),
    birth_month: num(form.elements.birth_month.value),
    birth_day: num(form.elements.birth_day.value),
    city: form.elements.city.value,
    phone: form.elements.phone.value,
    email: form.elements.email.value,
    tags: form.elements.tags.value,
    notes: form.elements.notes.value,
    socials,
  };

  try {
    const saved = editingId
      ? await api(`/api/contacts/${editingId}`, { method: 'PUT', body })
      : await api('/api/contacts', { method: 'POST', body });

    const file = $('#photo-input').files[0];
    if (file) {
      await api(`/api/contacts/${saved.contact.id}/photo`, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
    }
    $('#contact-dialog').close();
    await loadContacts();
  } catch (err) {
    $('#form-error').textContent = err.message;
  }
});

async function deleteContact(id) {
  if (!confirm('Bu kisi silinsin mi?')) return;
  try {
    await api(`/api/contacts/${id}`, { method: 'DELETE' });
    await loadContacts();
  } catch (err) {
    alertError(err);
  }
}

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
  alert(err.message || 'Bir hata olustu');
}

api('/api/me')
  .then(showApp)
  .catch(() => showLogin());
