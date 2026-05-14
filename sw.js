// Service worker. Stale-while-revalidate with auto-reload on update.
// VERSION is replaced at deploy time by deploy.sh with the git short hash.

const VERSION = '__VERSION__';
const CACHE = `tr-${VERSION}`;
const ASSETS = [
  '/',
  '/script.js',
  '/favicon.svg',
  '/jbm.woff2',
  '/jbm-italic.woff2',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  // Use cache:'reload' so each asset is fetched fresh from the network,
  // bypassing the browser's HTTP cache. Without this, the SW would
  // pick up stale copies of files like script.js (1-week max-age)
  // even though the server has new content from a recent deploy.
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(ASSETS.map((url) =>
        fetch(url, { cache: 'reload' }).then((resp) => {
          if (resp && resp.ok) return c.put(url, resp);
        })
      ))
    )
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fresh = fetch(e.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fresh;
    })
  );
});
