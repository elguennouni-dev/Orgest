/* Orgest service worker — coque de l'application uniquement. Jamais d'API : les données restent toujours fraîches et privées. */
const CACHE = 'orgest-shell-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.add('/index.html')).catch(() => {})); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (req.mode === 'navigate' && /^\/(app|admin|login)(\/|$)/.test(url.pathname)) {
    e.respondWith(fetch(req).then((r) => { if (r.ok) caches.open(CACHE).then((c) => c.put('/index.html', r.clone())); return r; })
      .catch(() => caches.match('/index.html')));
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok) caches.open(CACHE).then((c) => c.put(req, r.clone())); return r; })));
  }
});

/* ----- Notifications push (une par vente) ----- */
self.addEventListener('push', (e) => {
  let d = { title: 'Orgest', body: '', url: '/app' };
  try { d = { ...d, ...e.data.json() }; } catch { /* message vide */ }
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body, icon: '/assets/icon-192.png', badge: '/assets/favicon.png', data: { url: d.url }, tag: 'orgest-sale-' + Date.now(),
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const raw = (e.notification.data && e.notification.data.url) || '/app';
  const url = raw.startsWith('/') ? raw : '/app';       // jamais d'URL externe
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    for (const c of cs) { if ('focus' in c) { c.navigate(url); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
