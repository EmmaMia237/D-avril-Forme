// Manual, conservative service worker for admin-frontend
// Purpose: make the app installable without using vite-plugin-pwa / workbox, and NEVER cache admin API responses.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Never cache API requests — network-only
  if (url.pathname.startsWith('/api')) {
    event.respondWith(fetch(req));
    return;
  }

  // For navigation requests, try network first, fallback to /index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For other GET requests, prefer network but allow caching of static assets if present
  if (req.method === 'GET') {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
  }
});
