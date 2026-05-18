const CACHE_NAME = 'fiche-controle-v3';

// Ne precacher que les fichiers STATIQUES garantis d'exister
// '/' et '/favicon.ico' sont mis en cache dynamiquement au premier accès
const ASSETS = [
  // CSS
  '/static/css/bootstrap.min.css',
  '/static/css/style.css',

  // JS
  '/static/js/bootstrap.bundle.min.js',
  '/static/js/app.js',

  // Icons
  '/static/icons/bootstrap-icons.css',

  // Manifest
  '/static/manifest.json',

  // Images
  '/static/icons/icon-192.png',
  '/static/icons/logo.png',
];


// INSTALLATION
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Impossible de mettre en cache : ${url}`, err);
          })
        )
      );
    })
  );

  self.skipWaiting();
});


// ACTIVATION
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});


// FETCH
self.addEventListener('fetch', (event) => {

  // Ignorer les requêtes non GET
  if (event.request.method !== 'GET') return;

  // Ignorer les URLs non-HTTP (chrome-extension, data:, etc.)
  if (!event.request.url.startsWith('http')) return;

  // Ignorer les requêtes cross-origin
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Pages HTML → Network First
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || caches.match('/');
          });
        })
    );
    return;
  }

  // Fichiers statiques → Cache First
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          console.warn(`[SW] Ressource indisponible : ${event.request.url}`);
          return new Response('', {
            status: 404,
            statusText: 'Not Found',
          });
        });
    })
  );
});