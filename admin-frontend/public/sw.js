// Simple, conservative service worker for admin frontend
// Purpose: allow installability while NEVER caching sensitive admin API responses.

self.addEventListener('install', (event) => {
  // Activate immediately
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

  // Never cache API requests — pass through to network
  if (url.pathname.startsWith('/api')) {
    event.respondWith(fetch(req));
    return;
  }

  // For navigation requests, try network first, fall back to cached /index.html if available
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For other GET requests, just fetch from the network (do not persistently cache)
  if (req.method === 'GET') {
    event.respondWith(fetch(req));
  }
});
