// Hesap olusturma ve kurtarma: kullanici adi + parola + parmak izi + kurtarma kodu.
(function () {
  const $ = (sel) => document.querySelector(sel);
  let turnstileToken = '';

  function b64uToBuf(s) {
    const pad = '='.repeat((4 - (s.length % 4)) % 4);
    const bin = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  }

  function bufToB64u(buf) {
    let s = '';
    for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  async function sha256Hex(text) {
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function post(path, body) {
    const res = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Islem basarisiz');
    return data;
  }

  // Tarayici hata adlarini kullaniciya anlasilir metne cevirir
  function friendly(err) {
    if (err && err.name === 'NotAllowedError') return 'Parmak izi islemi iptal edildi veya zaman asimina ugradi.';
    if (err && err.name === 'InvalidStateError') return 'Bu cihaz icin zaten bir parmak izi kayitli.';
    return (err && err.message) || 'Bir hata olustu.';
  }

  function el(tag, attrs, text) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) n.setAttribute(k, v);
    if (text !== undefined) n.textContent = text;
    return n;
  }

  // ---------- Kayit penceresi ----------

  function buildSignupDialog() {
    const dlg = el('dialog', { id: 'signup-dialog', class: 'sheet' });
    const form = el('form', { id: 'signup-form', class: 'sheet-body form' });
    form.appendChild(el('div', { class: 'sheet-grip' }));
    form.appendChild(el('h2', {}, 'Hesap olustur'));
    form.appendChild(el('p', { class: 'muted' }, 'Her hesabin kendine ozel rehberi olur. Parola, parmak izi ve kurtarma kodu gerekir.'));
    form.appendChild(el('input', { id: 'su-username', placeholder: 'Kullanici adi (3-30 karakter)', autocomplete: 'username', required: '', maxlength: '30' }));
    form.appendChild(el('input', { id: 'su-email', type: 'email', placeholder: 'E-posta (kurtarma kodu gonderilecek)', autocomplete: 'email', required: '', maxlength: '254' }));
    form.appendChild(el('input', { id: 'su-password', type: 'password', placeholder: 'Parola (en az 10 karakter)', autocomplete: 'new-password', required: '', minlength: '10' }));
    form.appendChild(el('input', { id: 'su-password2', type: 'password', placeholder: 'Parola tekrar', autocomplete: 'new-password', required: '', minlength: '10' }));
    form.appendChild(el('p', { id: 'su-error', class: 'error', role: 'alert' }));
    const actions = el('div', { class: 'form-actions' });
    actions.appendChild(el('button', { type: 'button', id: 'su-cancel', class: 'btn-ghost' }, 'Vazgec'));
    actions.appendChild(el('button', { type: 'submit', class: 'btn-primary' }, 'Parmak izi ile olustur'));
    form.appendChild(actions);
    dlg.appendChild(form);
    document.body.appendChild(dlg);
    return dlg;
  }

  // Kurtarma kodu bir kez gosterilir; kullanici onaylayana kadar kayit tamamlanmaz
  function showRecoveryCode(code) {
    return new Promise((resolve, reject) => {
      const dlg = el('dialog', { id: 'rc-show-dialog', class: 'sheet' });
      const body = el('div', { class: 'sheet-body form' });
      body.appendChild(el('div', { class: 'sheet-grip' }));
      body.appendChild(el('h2', {}, 'Kurtarma kodunuz'));
      body.appendChild(el('p', { class: 'muted' }, 'Parolanizi unutursaniz bu kodla hesabiniza girebilirsiniz. Kodu guvenli bir yere kaydedin. Bu kod bir daha gosterilmez.'));
      body.appendChild(el('code', { class: 'recovery-code' }, code));
      const actions = el('div', { class: 'form-actions' });
      const copy = el('button', { type: 'button', class: 'btn-ghost' }, 'Kopyala');
      const cancel = el('button', { type: 'button', class: 'btn-ghost' }, 'Vazgec');
      const ok = el('button', { type: 'button', class: 'btn-primary' }, 'Kaydettim, devam et');
      actions.appendChild(copy); actions.appendChild(cancel); actions.appendChild(ok);
      body.appendChild(actions);
      dlg.appendChild(body);
      document.body.appendChild(dlg);

      copy.addEventListener('click', () => navigator.clipboard?.writeText(code).catch(() => {}));
      cancel.addEventListener('click', () => { dlg.close(); dlg.remove(); reject(new Error('Kayit iptal edildi.')); });
      dlg.addEventListener('cancel', (e) => e.preventDefault());
      ok.addEventListener('click', () => { dlg.close(); dlg.remove(); resolve(); });
      dlg.showModal();
    });
  }

  async function signup(password) {
    const username = $('#su-username').value.trim();
    if (!window.PublicKeyCredential || !navigator.credentials) {
      throw new Error('Bu tarayici parmak izi desteklemiyor.');
    }
    const geo = await getGeo();
    const fp = await getFingerprint(geo);
    const salt = window.Vault.newSalt();

    const start = await post('/api/signup/start', { username, password, salt, fp, turnstile: turnstileToken });

    $('#su-error').textContent = 'Parmak izi bekleniyor...';
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: b64uToBuf(start.challenge),
        rp: start.rp,
        user: { id: b64uToBuf(start.user.id), name: start.user.name, displayName: start.user.displayName },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        authenticatorSelection: { residentKey: 'required', userVerification: 'required', authenticatorAttachment: 'platform' },
        attestation: 'none',
        timeout: 60000,
      },
    });

    // Kurtarma kodu: parola kodla sifrelenir; sunucu yalnizca kodun ozetini ve sifreli parolayi tutar
    const code = window.RecoveryCrypto.newCode();
    const blob = await window.RecoveryCrypto.wrapPassword(code, password);
    const codeHash = await sha256Hex(window.RecoveryCrypto.normalize(code));

    $('#su-error').textContent = '';
    // Kod ekranda gosterilmez; yalnizca e-posta adresine gonderilir
    $('#su-error').textContent = 'Kurtarma kodu e-posta adresinize gonderiliyor...';

    await post('/api/signup/finish', {
      user_id: start.user_id,
      id: cred.id,
      fp,
      email: $('#su-email').value.trim(),
      code: window.RecoveryCrypto.normalize(code),
      recovery: { code_hash: codeHash, blob },
      response: {
        clientDataJSON: bufToB64u(cred.response.clientDataJSON),
        attestationObject: bufToB64u(cred.response.attestationObject),
      },
    });

    await unlockVault(password);
  }

  // ---------- Kurtarma girisi penceresi ----------

  function buildRecoveryDialog() {
    const dlg = el('dialog', { id: 'rl-dialog', class: 'sheet' });
    const form = el('form', { id: 'rl-form', class: 'sheet-body form' });
    form.appendChild(el('div', { class: 'sheet-grip' }));
    form.appendChild(el('h2', {}, 'Kurtarma kodu ile giris'));
    form.appendChild(el('p', { class: 'muted' }, 'Kullanici adiniz ve kayit sirasinda aldiginiz kurtarma kodunu girin.'));
    form.appendChild(el('input', { id: 'rl-username', placeholder: 'Kullanici adi', autocomplete: 'username', required: '' }));
    form.appendChild(el('input', { id: 'rl-code', placeholder: 'Kurtarma kodu (ABCDE-FGHJK-...)', autocomplete: 'off', spellcheck: 'false', required: '' }));
    form.appendChild(el('p', { id: 'rl-error', class: 'error', role: 'alert' }));
    const actions = el('div', { class: 'form-actions' });
    actions.appendChild(el('button', { type: 'button', id: 'rl-cancel', class: 'btn-ghost' }, 'Vazgec'));
    actions.appendChild(el('button', { type: 'submit', class: 'btn-primary' }, 'Giris yap'));
    form.appendChild(actions);
    dlg.appendChild(form);
    document.body.appendChild(dlg);
    return dlg;
  }

  async function recoveryLogin() {
    const username = $('#rl-username').value.trim();
    const code = $('#rl-code').value;
    const geo = await getGeo();
    const fp = await getFingerprint(geo);
    const r = await post('/api/recovery/user', { username, code, fp, turnstile: turnstileToken });
    let password;
    try {
      password = await window.RecoveryCrypto.unwrapPassword(code, r.blob);
    } catch {
      throw new Error('Kurtarma kodu hatali.');
    }
    try {
      await unlockVault(password);
    } catch (e) {
      // Kasa acilamadiysa sunucu oturumunu kapat
      await post('/api/logout', {}).catch(() => {});
      throw e;
    }
  }

  // ---------- Baglanti ----------

  function bind() {
    const loginForm = $('#login-form');
    if (!loginForm) return;

    const signupDlg = buildSignupDialog();
    const recDlg = buildRecoveryDialog();

    const openSignup = el('button', { type: 'button', id: 'open-signup', class: 'btn-ghost' }, 'Hesabiniz yok mu? Hesap olusturun');
    const openRec = el('button', { type: 'button', id: 'open-recovery', class: 'btn-ghost' }, 'Parolamu unuttum (kurtarma kodu)');
    loginForm.appendChild(openSignup);
    loginForm.appendChild(openRec);

    function requireTurnstile() {
      turnstileToken = window.turnstile ? window.turnstile.getResponse() : '';
      if (!turnstileToken) {
        $('#login-error').textContent = 'Once dogrulamayi tamamlayin.';
        return false;
      }
      $('#login-error').textContent = '';
      return true;
    }

    openSignup.addEventListener('click', () => {
      if (!requireTurnstile()) return;
      $('#su-error').textContent = '';
      signupDlg.showModal();
      $('#su-username').focus();
    });

    openRec.addEventListener('click', () => {
      if (!requireTurnstile()) return;
      $('#rl-error').textContent = '';
      recDlg.showModal();
      $('#rl-username').focus();
    });

    $('#su-cancel').addEventListener('click', () => signupDlg.close());
    $('#rl-cancel').addEventListener('click', () => recDlg.close());

    $('#signup-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = $('#su-password').value;
      if (password !== $('#su-password2').value) { $('#su-error').textContent = 'Parolalar eslesmiyor.'; return; }
      if (password.length < 10) { $('#su-error').textContent = 'Parola en az 10 karakter olmali.'; return; }
      try {
        await signup(password);
        turnstileToken = '';
        window.turnstile?.reset();
        $('#su-password').value = '';
        $('#su-password2').value = '';
        signupDlg.close();
        showApp();
      } catch (err) {
        $('#su-error').textContent = friendly(err);
        if (/dogrulama|Dogrulama|Turnstile/i.test(err.message || '')) window.turnstile?.reset();
        turnstileToken = '';
      }
    });

    $('#rl-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await recoveryLogin();
        turnstileToken = '';
        window.turnstile?.reset();
        $('#rl-code').value = '';
        recDlg.close();
        showApp();
      } catch (err) {
        $('#rl-error').textContent = friendly(err);
        if (/dogrulama|Dogrulama|Turnstile/i.test(err.message || '')) window.turnstile?.reset();
        turnstileToken = '';
      }
    });
  }

  // Ayarlar penceresinde: yeni kurtarma kodu (parola + e-posta)
  function initSettingsRecovery() {
    const sd = document.getElementById('settings-dialog');
    if (!sd) return;
    const dlg = el('dialog', { id: 'rot-dialog', class: 'sheet' });
    const form = el('form', { id: 'rot-form', class: 'sheet-body form' });
    form.appendChild(el('div', { class: 'sheet-grip' }));
    form.appendChild(el('h2', {}, 'Yeni kurtarma kodu gonder'));
    form.appendChild(el('p', { class: 'muted' }, 'Eski kurtarma kodu gecersiz olur. Yeni kod e-posta adresinize gonderilir.'));
    form.appendChild(el('input', { id: 'rot-email', type: 'email', placeholder: 'E-posta (kurtarma kodu gonderilecek)', autocomplete: 'email', required: '', maxlength: '254' }));
    form.appendChild(el('input', { id: 'rot-password', type: 'password', placeholder: 'Parola', autocomplete: 'current-password', required: '' }));
    form.appendChild(el('p', { id: 'rot-error', class: 'error', role: 'alert' }));
    const actions = el('div', { class: 'form-actions' });
    actions.appendChild(el('button', { type: 'button', id: 'rot-cancel', class: 'btn-ghost' }, 'Vazgec'));
    actions.appendChild(el('button', { type: 'submit', class: 'btn-primary' }, 'Onayla'));
    form.appendChild(actions);
    dlg.appendChild(form);
    document.body.appendChild(dlg);

    $('#rot-cancel').addEventListener('click', () => dlg.close());
    dlg.addEventListener('close', () => { $('#rot-password').value = ''; $('#rot-error').textContent = ''; });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const password = $('#rot-password').value;
        const email = $('#rot-email').value.trim();
        const geo = await getGeo();
        const fp = await getFingerprint(geo);
        await post('/api/reauth', { password, fp });
        const code = window.RecoveryCrypto.newCode();
        const blob = await window.RecoveryCrypto.wrapPassword(code, password);
        await post('/api/user/recovery/rotate', { email, code: window.RecoveryCrypto.normalize(code), blob });
        dlg.close();
        alert('Yeni kurtarma kodu e-posta adresinize gonderildi. Eski kod artik gecersiz.');
      } catch (err) {
        $('#rot-error').textContent = friendly(err);
      }
    });

    const inject = () => {
      if (sd.querySelector('#rot-open')) return;
      const body = sd.querySelector('.sheet-body') || sd;
      const btn = el('button', { type: 'button', id: 'rot-open', class: 'pill glass small' }, 'Yeni kurtarma kodu gonder');
      btn.addEventListener('click', () => { $('#rot-error').textContent = ''; dlg.showModal(); });
      body.appendChild(btn);
    };
    new MutationObserver(() => { if (sd.open) inject(); }).observe(sd, { attributes: true, attributeFilter: ['open'] });
  }
  initSettingsRecovery();

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
