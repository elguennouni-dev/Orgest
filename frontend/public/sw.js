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
