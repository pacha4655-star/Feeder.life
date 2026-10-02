const CACHE_NAME = 'feeder-life-v1';

const STATIC_PRECACHE = [
  '/',
  '/offline.html',
  '/images/feeder-icon.svg',
  '/favicon.ico',
];

// Install: Precache shell & offline fallback
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Cleanup stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event with strict security filters
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Never cache non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 2. CRITICAL SECURITY GUARD:
  // Never cache private/authenticated APIs, messages, SOS sensitive details, or credentials
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/messages/') ||
    url.pathname.startsWith('/settings/')
  ) {
    return; // Pass through directly to network
  }

  // 3. Static assets: Stale-While-Revalidate (fonts, images, scripts, styles)
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 4. HTML Page Navigation: Network-First with Offline Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          return caches.open(CACHE_NAME).then((cache) => {
            return cache.match('/offline.html').then((offlineResponse) => {
              return offlineResponse || new Response('Offline', { status: 503 });
            });
          });
        })
    );
  }
});
