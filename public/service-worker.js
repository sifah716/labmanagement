const CACHE_NAME = 'lab-manager-v3.0';
const urlsToCache = [
  '/',
  '/assets/css/main.css',
  '/assets/js/app.js',
  '/manifest.json'
];

function isApiRequest(url) {
  const apiPaths = ['/auth/', '/barang/', '/kunjungan/', '/peminjaman/', '/stats/', '/announcements/', '/users/', '/api-'];
  return apiPaths.some(p => url.pathname.startsWith(p)) || url.pathname === '/auth/login';
}

function isMutationRequest(method) {
  return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
}

self.addEventListener('install', event => {
  self.skipWaiting(); // Force activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-only for API requests or mutation methods
  if (isApiRequest(url) || isMutationRequest(event.request.method)) {
    return;
  }

  // Network-first for HTML navigations
  if (event.request.mode === 'navigate' || event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for other static assets
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
