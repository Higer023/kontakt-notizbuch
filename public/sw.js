const CACHE = 'rehber-shell-v3';
const SHELL = ['/', '/index.html', '/style.css', '/app.js', '/push.js', '/crypto.js', '/icon.svg', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

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

// Push: sunucu bos istek gonderir, metin burada yazilir.
self.addEventListener('push', (e) => {
  e.waitUntil(self.registration.showNotification('Rehber', {
    body: 'Yeni bir bildiriminiz var.',
    tag: 'rehber-push',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    if (list.length) return list[0].focus();
    return self.clients.openWindow('/');
  }));
});
