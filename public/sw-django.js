/**
 * Service Worker pour le mode offline complet (Django)
 * Synchronisation automatique des fiches
 */

const CACHE_VERSION = 'v1';
const CACHE_NAMES = {
  STATIC: `fiche-static-${CACHE_VERSION}`,
  API: `fiche-api-${CACHE_VERSION}`,
};

const STATIC_ASSETS = [
  '/',
  '/static/js/offline.js',
  '/static/css/style.css',
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installation...');
  event.waitUntil(
    caches.open(CACHE_NAMES.STATIC).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        console.warn('[SW] Cache des assets partiellement échoué');
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activation...');
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((name) => !Object.values(CACHE_NAMES).includes(name))
          .map((name) => {
            console.log('[SW] Suppression ancien cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  // API - Network first
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/inspection/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Statique - Cache first
  if (url.pathname.includes('/static/')) {
    event.respondWith(cacheFirstStrategy(request, CACHE_NAMES.STATIC));
    return;
  }

  // Par défaut - Network first
  event.respondWith(networkFirstStrategy(request));
});

async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAMES.API);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    return getOfflineResponse();
  }
}

async function cacheFirstStrategy(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return getOfflineResponse();
  }
}

function getOfflineResponse() {
  return new Response(
    `<!DOCTYPE html>
     <html>
     <head>
       <meta charset="UTF-8">
       <title>Mode Offline</title>
       <style>
         body {
           font-family: system-ui, -apple-system, sans-serif;
           display: flex;
           align-items: center;
           justify-content: center;
           height: 100vh;
           margin: 0;
           background: #f5f5f5;
         }
         .offline {
           background: white;
           padding: 40px;
           border-radius: 8px;
           box-shadow: 0 2px 8px rgba(0,0,0,0.1);
           text-align: center;
           max-width: 400px;
         }
         h1 { color: #d32f2f; }
         p { color: #666; }
       </style>
     </head>
     <body>
       <div class="offline">
         <h1>📡 Mode Offline</h1>
         <p>Vous êtes hors ligne. La page sera disponible quand la connexion sera rétablie.</p>
       </div>
     </body>
     </html>`,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  );
}

console.log('[SW] Service Worker chargé');
