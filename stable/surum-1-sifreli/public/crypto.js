// Istemci tarafli sifreleme (AES-GCM). Anahtar parolanizdan turetilir,
// yalnizca bellekte tutulur; sunucuya veya diske yazilmaz.
(function () {
  const ITER = 310000;
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let key = null;

  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

  async function deriveKey(password, saltB64) {
    const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: unb64(saltB64), iterations: ITER, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  function newSalt() {
    return b64(crypto.getRandomValues(new Uint8Array(16)));
  }

  async function unlock(password, saltB64) {
    key = await deriveKey(password, saltB64);
  }

  function lock() {
    key = null;
  }

  function isUnlocked() {
    return key !== null;
  }

  async function seal(obj) {
    if (!key) throw new Error('Kasa kilitli');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = enc.encode(JSON.stringify(obj));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
    return JSON.stringify({ v: 1, iv: b64(iv), ct: b64(ct) });
  }

  async function open(payload) {
    if (!key) throw new Error('Kasa kilitli');
    const { iv, ct } = JSON.parse(payload);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, key, unb64(ct));
    return JSON.parse(dec.decode(pt));
  }

  window.Vault = { newSalt, unlock, lock, isUnlocked, seal, open };
})();
