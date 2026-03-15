self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Intentionally no caching for now.
// This avoids stale assets causing blank screens during rapid iteration.
self.addEventListener('fetch', () => {});
