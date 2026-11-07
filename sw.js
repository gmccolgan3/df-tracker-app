// Offline support: always try the network first (so edits show up at once),
// and fall back to the cached copy when there is no connection.
// Bump VERSION when you add or rename files so the cache list is refreshed.
const VERSION = 'dft-v4';
const SHELL = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest',
  'js/db.js', 'js/schema.js', 'js/varieties-seed.js', 'js/core.js', 'js/ui.js', 'js/data.js',
  'js/views.js', 'js/detail.js', 'js/form.js', 'js/app.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async (cache) => {
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch {
      return (await cache.match(req, { ignoreSearch: true })) || Response.error();
    }
  }));
});
