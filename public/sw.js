// Service worker: makes the game installable as an app and lets it start offline once played.
// Network-first, so an online player always gets the current build; anything already loaded is kept for offline use.
// Scoped to the folder it is served from, so the main build and a playtest build never share a cache.
const CACHE = 'sf-' + new URL(self.registration.scope).pathname;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin || req.headers.has('range')) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res.ok && res.status === 200) cache.put(req, res.clone()).catch(() => {});
      return res;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
      if (hit) return hit;
      if (req.mode === 'navigate') {
        const home = await cache.match(new URL('./', self.registration.scope).href);
        if (home) return home;
      }
      throw err;
    }
  })());
});
