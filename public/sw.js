const CACHE = 'rehber-shell-v7';
const SHELL = ['/', '/index.html', '/style.css', '/ui-plus.css', '/ui-plus.js', '/app.js', '/push.js', '/passkey.js', '/recovery.js', '/crypto.js', '/icon.svg', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/badge-96.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Once ag: guncel dosya. Ag yoksa kabuktan cevap. API istekleri ASLA onbellege alinmaz.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res.ok && SHELL.includes(url.pathname)) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('/index.html')))
  );
});

// Push: sunucu bos istek gonderir. Ayrintilar kuyruktan (sadece sayilar) okunur.
self.addEventListener('push', (e) => {
  e.waitUntil(showDigest());
});

async function showDigest() {
  let items = [];
  try {
    const r = await fetch('/api/push/pending', { credentials: 'same-origin' });
    if (r.ok) items = (await r.json()).items || [];
  } catch { /* ag yok: genel bildirim */ }

  const bday = items.find((i) => i.type === 'birthday' && i.count > 0);
  let title = 'Rehber';
  let body = 'Yeni bir bildiriminiz var.';
  let tag = 'rehber-general';
  let url = '/';
  if (bday) {
    title = 'Yaklasan dogum gunleri';
    body = bday.count === 1
      ? '1 kisinin dogum gunu 7 gun icinde.'
      : bday.count + ' kisinin dogum gunu 7 gun icinde.';
    tag = 'rehber-birthday';
    url = '/?open=birthdays';
  }

  await self.registration.showNotification(title, {
    body,
    tag,
    renotify: true,
    timestamp: Date.now(),
    icon: '/icons/icon-512.png',
    badge: '/icons/badge-96.png',
    vibrate: [80, 40, 80],
    data: { url },
    actions: [{ action: 'open', title: 'Ac' }],
  });

  if (bday) {
    try {
      await fetch('/api/push/consume', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
    } catch { /* bir sonraki kontrolde tekrar denenir */ }
  }
}

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    if (list.length) return list[0].focus();
    return self.clients.openWindow(url);
  }));
});
