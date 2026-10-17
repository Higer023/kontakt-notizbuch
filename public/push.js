// Bildirim aboneligi: ayarlar menusunden acilir. Metin yok, yalnizca abonelik kaydi.
(function () {
  function msg(t) { alert(t); }

  function b64uToBytes(s) {
    const pad = '='.repeat((4 - (s.length % 4)) % 4);
    const bin = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  }

  async function api(path, body) {
    const res = await fetch(path, {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Istek basarisiz');
    return data;
  }

  async function enable() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      return msg('Bu tarayici bildirimleri desteklemiyor.');
    }
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (isIOS && !standalone) {
      return msg('iPhone icin once Safari ile "Ana Ekrana Ekle" yapin ve uygulamayi oradan acin.');
    }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return msg('Bildirim izni verilmedi.');
    const reg = await navigator.serviceWorker.ready;
    const { key } = await api('/api/push/key');
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(key) });
    }
    await api('/api/push/subscribe', sub.toJSON());
    msg('Bildirimler acildi.');
  }

  async function test() {
    const r = await api('/api/push/test', {});
    msg(r.sent ? 'Test bildirimi gonderildi.' : 'Gonderilecek abonelik yok. Once bildirimleri acin.');
  }

  function bind() {
    const enableBtn = document.getElementById('push-enable');
    const testBtn = document.getElementById('push-test');
    if (enableBtn) enableBtn.addEventListener('click', () => enable().catch((e) => msg(e.message)));
    if (testBtn) testBtn.addEventListener('click', () => test().catch((e) => msg(e.message)));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
