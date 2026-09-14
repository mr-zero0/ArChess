/**
 * ARCHESS — Service Worker (Offline Combat & PWA Shell Engine)
 * Version: 2.9.7
 */

const CACHE_NAME = 'archess-cache-v2.9.7';
const CORE_ASSETS = [
  '/',
  '/play',
  '/arsenal',
  '/leaderboard',
  '/manifest.json',
  '/static/css/style.css',
  '/static/js/main.js',
  '/static/js/auth.js',
  '/static/js/game.js',
  '/static/js/react-chessboard-bundle.js',
  '/static/media/logo.png'
];

// Install: Cache critical game shell assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use Promise.allSettled to ensure resilient caching even if an individual asset is temporarily unreachable
      return Promise.allSettled(
        CORE_ASSETS.map((url) => {
          return fetch(url, { cache: 'no-cache' }).then((response) => {
            if (response && response.ok) {
              return cache.put(url, response);
            }
          }).catch((err) => {
            console.warn('[SW] Pre-cache miss for:', url, err);
          });
        })
      );
    })
  );
});

// Activate: Prune stale cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Purging outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Strategy routing based on request destination
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-HTTP/HTTPS schemes (e.g. chrome-extension://)
  if (!request.url.startsWith('http')) return;

  // Handle Navigation Requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallbackPlay = await caches.match('/play');
          if (fallbackPlay) return fallbackPlay;
          const fallbackIndex = await caches.match('/');
          if (fallbackIndex) return fallbackIndex;
          return new Response('<h1>ArChess Offline</h1><p>Arena cache unavailable.</p>', {
            headers: { 'Content-Type': 'text/html' }
          });
        })
    );
    return;
  }

  // Handle API Requests: Network-first, return JSON offline response on disconnect
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            offline: true,
            message: 'ArChess running in offline mode. Tactical telemetry preserved locally.'
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 503
          }
        );
      })
    );
    return;
  }

  // Handle Static Assets (CSS, JS, Fonts, Images): Cache-First with Network Revalidation
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
