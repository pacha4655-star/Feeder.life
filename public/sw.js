// Feeder.life Online-Only Service Worker
// Automatically purges old caches and unregisters to enforce live network connectivity.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      return self.registration.unregister();
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Pass all requests directly through to the live network (No offline caching)
self.addEventListener('fetch', () => {
  // Let the browser handle standard live network requests directly
});
