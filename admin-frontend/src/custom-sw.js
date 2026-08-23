import { precacheAndRoute } from 'workbox-precaching';

// Custom service worker for admin-frontend (injectManifest)
// Uses the injected __WB_MANIFEST (array of {url, revision}) provided by vite-plugin-pwa in injectManifest mode.

// Precache and route using workbox
precacheAndRoute(self.__WB_MANIFEST || []);

const CACHE_NAME = 'df-admin-appshell-v1';

self.addEventListener('activate', (event) => {
  // Cleanup old caches if any
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Do not handle cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Network-only for API calls (do not cache admin APIs)
  if (url.pathname.startsWith('/api')) {
    event.respondWith(fetch(req));
    return;
  }

  // Don't cache POST/PUT/DELETE etc
  if (req.method !== 'GET') return;

  // Navigation requests: try network first, fallback to precached index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For other GET requests, try cache first then network
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      // Only cache simple same-origin requests for static assets (images, CSS, JS)
      if (res && res.type === 'basic' && /\.(?:js|css|png|jpg|jpeg|svg|webp)$/.test(url.pathname)) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
      }
      return res;
    }).catch(() => caches.match('/index.html')))
  );
});

// Listen for skipWaiting message from the client to activate new SW immediately
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
