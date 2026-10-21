// Hesap olusturma: kullanici adi + parola + parmak izi. Her hesabin kendi kasasi olur.
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

  function buildDialog() {
    const dlg = document.createElement('dialog');
    dlg.id = 'signup-dialog';
    dlg.className = 'sheet';
    dlg.innerHTML = `
      <form id="signup-form" class="sheet-body form">
        <div class="sheet-grip"></div>
        <h2>Hesap olustur</h2>
        <p class="muted">Her hesabin kendine ozel rehberi olur. Parola ve parmak iziniz gerekir.</p>
        <input id="su-username" placeholder="Kullanici adi (3-30 karakter)" autocomplete="username" required maxlength="30">
        <input id="su-password" type="password" placeholder="Parola (en az 10 karakter)" autocomplete="new-password" required minlength="10">
        <input id="su-password2" type="password" placeholder="Parola tekrar" autocomplete="new-password" required minlength="10">
        <p id="su-error" class="error" role="alert"></p>
        <div class="form-actions">
          <button type="button" id="su-cancel" class="btn-ghost">Vazgec</button>
          <button type="submit" class="btn-primary">Parmak izi ile olustur</button>
        </div>
      </form>`;
    document.body.appendChild(dlg);
    return dlg;
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

    await post('/api/signup/finish', {
      user_id: start.user_id,
      id: cred.id,
      fp,
      response: {
        clientDataJSON: bufToB64u(cred.response.clientDataJSON),
        attestationObject: bufToB64u(cred.response.attestationObject),
      },
    });

    // Yeni hesabin kendi kasasi acilir (bos rehber)
    await unlockVault(password);
  }

  function bind() {
    const loginForm = $('#login-form');
    if (!loginForm) return;

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.id = 'open-signup';
    openBtn.className = 'btn-ghost';
    openBtn.textContent = 'Hesabiniz yok mu? Hesap olusturun';
    loginForm.appendChild(openBtn);

    const dlg = buildDialog();

    openBtn.addEventListener('click', () => {
      turnstileToken = window.turnstile ? window.turnstile.getResponse() : '';
      if (!turnstileToken) {
        $('#login-error').textContent = 'Once dogrulamayi tamamlayin, sonra hesap olusturun.';
        return;
      }
      $('#login-error').textContent = '';
      $('#su-error').textContent = '';
      dlg.showModal();
      $('#su-username').focus();
    });

    $('#su-cancel').addEventListener('click', () => dlg.close());

    $('#signup-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = $('#su-password').value;
      if (password !== $('#su-password2').value) {
        $('#su-error').textContent = 'Parolalar eslesmiyor.';
        return;
      }
      if (password.length < 10) {
        $('#su-error').textContent = 'Parola en az 10 karakter olmali.';
        return;
      }
      try {
        await signup(password);
        turnstileToken = '';
        window.turnstile?.reset();
        $('#su-password').value = '';
        $('#su-password2').value = '';
        dlg.close();
        showApp();
      } catch (err) {
        $('#su-error').textContent = err.message;
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
