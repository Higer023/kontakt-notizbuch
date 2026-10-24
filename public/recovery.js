// Wiederherstellungscode: wird per E-Mail gesendet. Der Code verschlüsselt das Anmeldepasswort; der Server kennt den Code nicht.
// Kurtarma kodu: e-postaya gonderilir. Kod, giris parolasini sifreler; sunucu kodu bilmez.
(function () {
  const $ = (sel) => document.querySelector(sel);
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const ITER = 310000;
  const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

  function normalize(code) {
    return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  // 160-Bit-Zufallscode, Base32, Fünfergruppen: ABCDE-FGHJK-...
  // 160 bit rastgele kod, Base32, 5'erli gruplar: ABCDE-FGHJK-...
  function newCode() {
    const bytes = crypto.getRandomValues(new Uint8Array(20));
    let bits = 0, val = 0, out = '';
    for (const x of bytes) {
      val = ((val << 8) | x) & 0xffffff;
      bits += 8;
      while (bits >= 5) { out += ALPH[(val >>> (bits - 5)) & 31]; bits -= 5; }
    }
    if (bits > 0) out += ALPH[(val << (5 - bits)) & 31];
    return out.match(/.{1,5}/g).join('-');
  }

  async function codeKey(code) {
    const base = await crypto.subtle.importKey('raw', enc.encode(normalize(code)), 'HKDF', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt: enc.encode('rehber-recovery-v1'), info: enc.encode('password-wrap') },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
  }

  async function wrapPassword(code, password) {
    const key = await codeKey(code);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(password));
    return JSON.stringify({ v: 1, iv: b64(iv), ct: b64(ct) });
  }

  async function unwrapPassword(code, blob) {
    const { iv, ct } = JSON.parse(blob);
    const key = await codeKey(code);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, key, unb64(ct));
    return dec.decode(pt);
  }

  // Überprüft anhand der Tresordaten, ob das Passwort korrekt ist, bevor neuer Code geschrieben wird
  // Yeni kod yazmadan once parolanin dogru oldugunu kasa verisiyle kontrol eder
  async function verifyVaultPassword(password) {
    const status = await api('/api/vault/status');
    if (!status.salt) return;
    const { contacts } = await api('/api/vault/contacts');
    if (!contacts || !contacts.length) return;
    const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: unb64(status.salt), iterations: ITER, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
    );
    try {
      const p = JSON.parse(contacts[0].payload);
      await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(p.iv) }, key, unb64(p.ct));
    } catch {
      throw new Error('Kasa parolasi hatali.');
    }
  }

  async function postPlain(path, body) {
    const res = await fetch(path, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Istek basarisiz');
    return data;
  }

  let awaitingCode = false;

  // Schritt 1: Passwort verwenden, Code generieren und per E-Mail senden
  // 1. adim: parolayi kullan, kod uret, e-postaya gonder
  async function sendRecoveryCode(password) {
    const turnstile = window.turnstile ? window.turnstile.getResponse() : '';
    if (!turnstile) throw new Error('Lutfen dogrulamayi tamamlayin.');
    $('#login-error').textContent = 'Konum izni isteniyor...';
    const geo = await getGeo();
    const fp = await getFingerprint(geo);
    const code = newCode();
    await postPlain('/api/recovery/send', { username: $('#username').value, password, code, blob: await wrapPassword(code, password), fp, turnstile });
    window.turnstile?.reset();
    awaitingCode = true;
    $('#login-error').textContent = 'Kurtarma kodu e-postaniza gonderildi. Dogrulamayi tekrar tamamlayip ayni dugmeye basin ve kodu girin.';
  }

  // Schritt 2: Code aus der E-Mail eingeben, einmalige Anmeldung
  // 2. adim: e-postadaki kodu gir, tek kullanimlik giris
  async function loginWithCode() {
    const code = prompt('E-postanizdaki kurtarma kodunu girin:');
    if (!code) return;
    if (!normalize(code)) throw new Error('Kod bos.');
    const typed = $('#password').value;
    if (!typed) throw new Error('Kasa parolasini girin.');
    const turnstile = window.turnstile ? window.turnstile.getResponse() : '';
    if (!turnstile) throw new Error('Lutfen dogrulamayi tamamlayin.');
    $('#login-error').textContent = 'Konum izni isteniyor...';
    const geo = await getGeo();
    const fp = await getFingerprint(geo);
    const r = await postPlain('/api/recovery/login', { username: $('#username').value, password: typed, code, fp, turnstile });
    let password;
    try { password = await unwrapPassword(code, r.blob); }
    catch { throw new Error('Kurtarma kodu hatali.'); }
    if (password !== typed) throw new Error('Kasa parolasi hatali.');
    try { await unlockVault(password); }
    catch (e) { await postPlain('/api/logout', {}).catch(() => {}); throw e; }
    awaitingCode = false;
    $('#login-error').textContent = '';
    showApp();
  }

  async function loginWithRecovery() {
    if (!awaitingCode) {
      const password = $('#password').value;
      if (!password) throw new Error('Once kasa parolasini girin, sonra kurtarma kodu isteyin.');
      return sendRecoveryCode(password);
    }
    return loginWithCode();
  }

  async function requestRecoveryMail() {
    const password = prompt('Yeni kurtarma kodu icin kasa parolanizi girin:');
    if (!password) return;
    await verifyVaultPassword(password);
    const code = newCode();
    await api('/api/recovery/rotate', { method: 'POST', body: { code, blob: await wrapPassword(code, password) } });
    alert('Yeni kurtarma kodu e-postaniza gonderildi. Eski kod artik gecersiz.');
  }

  function bind() {
    $('#recovery-login')?.addEventListener('click', () => {
      loginWithRecovery().catch((e) => {
        $('#login-error').textContent = e.message;
        window.turnstile?.reset();
      });
    });
    $('#recovery-request')?.addEventListener('click', () => {
      requestRecoveryMail().catch((e) => alert(e.message));
    });
  }

  window.RecoveryCrypto = { newCode, normalize, wrapPassword, unwrapPassword };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
