// Parmak izi (WebAuthn): kayit ve giris. Biyometri cihazda kalir, sunucuya sadece imza gider.
(function () {
  const $ = (sel) => document.querySelector(sel);

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

  function supported() {
    return !!(window.PublicKeyCredential && navigator.credentials);
  }

  function friendly(e) {
    if (e && e.name === 'NotAllowedError') return 'Parmak izi islemi iptal edildi veya zaman asimina ugradi.';
    return (e && e.message) || 'Bir hata olustu.';
  }

  async function postPlain(path, body) {
    const res = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Istek basarisiz');
    return data;
  }

  async function addPasskey() {
    if (!supported()) return alert('Bu tarayici parmak izi girisini desteklemiyor.');
    const opts = await api('/api/passkey/register/options', { method: 'POST', body: {} });
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: b64uToBuf(opts.challenge),
        rp: opts.rp,
        user: { id: b64uToBuf(opts.user.id), name: opts.user.name, displayName: opts.user.displayName },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        authenticatorSelection: { residentKey: 'required', userVerification: 'required', authenticatorAttachment: 'platform' },
        attestation: 'none',
        timeout: 60000,
        excludeCredentials: (opts.excludeCredentials || []).map((id) => ({ type: 'public-key', id: b64uToBuf(id) })),
      },
    });
    await api('/api/passkey/register/verify', {
      method: 'POST',
      body: {
        id: cred.id,
        response: {
          clientDataJSON: bufToB64u(cred.response.clientDataJSON),
          attestationObject: bufToB64u(cred.response.attestationObject),
        },
      },
    });
    alert('Parmak izi eklendi. Bir sonraki girisinizde bu cihazda parmak izi kullanabilirsiniz.');
  }

  async function managePasskeys() {
    const { items } = await api('/api/passkey/list');
    if (!items.length) return alert('Kayitli parmak izi yok.');
    const list = items.map((it, i) => (i + 1) + '. ' + it.created_at + ' (UTC)').join('\n');
    const pick = prompt('Kayitli parmak izleri:\n' + list + '\n\nSilmek icin numara girin (iptal icin bos birakin):');
    if (!pick) return;
    const item = items[Number(pick) - 1];
    if (!item) return alert('Gecersiz numara.');
    await api('/api/passkey/delete', { method: 'POST', body: { id: item.id } });
    alert('Parmak izi silindi.');
  }

  async function loginWithPasskey() {
    if (!supported()) throw new Error('Bu tarayici parmak izi girisini desteklemiyor.');
    const password = $('#password').value;
    if (!password) throw new Error('Once kasa parolasini girin, sonra parmak izi ile giris yapin.');
    const turnstile = window.turnstile ? window.turnstile.getResponse() : '';
    if (!turnstile) throw new Error('Lutfen dogrulamayi tamamlayin.');

    $('#login-error').textContent = 'Parmak izi bekleniyor...';
    const opts = await postPlain('/api/passkey/login/options', {});
    // Biyometri penceresi kullanici tiklamasinin hemen ardindan acilir.
    const a = await navigator.credentials.get({
      publicKey: {
        challenge: b64uToBuf(opts.challenge),
        rpId: opts.rpId,
        userVerification: 'required',
        timeout: 60000,
      },
    });

    $('#login-error').textContent = 'Konum izni isteniyor...';
    const geo = await getGeo();
    const fp = await getFingerprint(geo);
    await postPlain('/api/passkey/login/verify', {
      username: $('#username').value,
      password,
      assertion: {
        id: a.id,
        response: {
          clientDataJSON: bufToB64u(a.response.clientDataJSON),
          authenticatorData: bufToB64u(a.response.authenticatorData),
          signature: bufToB64u(a.response.signature),
        },
      },
      fp,
      turnstile,
    });

    try {
      await unlockVault(password);
    } catch (e) {
      // Kasa acilamadiysa sunucu oturumunu kapat
      await postPlain('/api/logout', {}).catch(() => {});
      throw e;
    }
    $('#login-error').textContent = '';
    showApp();
  }

  function bind() {
    $('#passkey-login')?.addEventListener('click', () => {
      loginWithPasskey().catch((e) => {
        $('#login-error').textContent = friendly(e);
        window.turnstile?.reset();
      });
    });
    $('#passkey-add')?.addEventListener('click', () => addPasskey().catch((e) => alert(friendly(e))));
    $('#passkey-manage')?.addEventListener('click', () => managePasskeys().catch((e) => alert(friendly(e))));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
