/**
 * Service Worker pour mode offline complet
 * Gère le cache, la synchronisation en arrière-plan et les requêtes offline
 */

const CACHE_VERSION = 'v1';
const CACHE_NAMES = {
  STATIC: `fiche-static-${CACHE_VERSION}`,
  API: `fiche-api-${CACHE_VERSION}`,
  IMAGES: `fiche-images-${CACHE_VERSION}`,
};

// Fichiers statiques à mettre en cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
];

// Patterns pour le cache API
const API_PATTERNS = [
  /\/api\/fiches/,
  /\/api\/user/,
  /\/api\/metadata/,
];

// ============================================================
// Installation
// ============================================================
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[SW] Installation...');

  event.waitUntil(
    caches.open(CACHE_NAMES.STATIC).then((cache) => {
      console.log('[SW] Mise en cache des assets statiques');
      return cache.addAll(STATIC_ASSETS).catch((error) => {
        console.warn('[SW] Certains assets statiques ne pouvaient pas être cachés:', error);
      });
    })
  );
});

// ============================================================
// Activation
// ============================================================
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[SW] Activation...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (!Object.values(CACHE_NAMES).includes(name)) {
            console.log('[SW] Suppression du cache obsolète:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
});

// ============================================================
// Fetch - Stratégies de cache
// ============================================================
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les non-GET
  if (request.method !== 'GET') {
    return;
  }

  // API - Network first, fallback to cache
  if (isApiRequest(url)) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Images - Cache first
  if (isImageRequest(url)) {
    event.respondWith(cacheFirstStrategy(request, CACHE_NAMES.IMAGES));
    return;
  }

  // Statique - Cache first
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStrategy(request, CACHE_NAMES.STATIC));
    return;
  }

  // Par défaut - Network first
  event.respondWith(networkFirstStrategy(request));
});

// ============================================================
// Stratégie: Network First
// ============================================================
async function networkFirstStrategy(request: Request): Promise<Response> {
  const cacheName = CACHE_NAMES.API;

  try {
    // Essayer la réseau
    const response = await fetch(request);

    // Mettre en cache la réponse si succès
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Erreur réseau, utilisation du cache:', error);

    // Fallback au cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Pas de cache, retourner une réponse offline
    return getOfflineFallback(request);
  }
}

// ============================================================
// Stratégie: Cache First
// ============================================================
async function cacheFirstStrategy(request: Request, cacheName: string): Promise<Response> {
  try {
    // Chercher dans le cache d'abord
    const cached = await caches.match(request);
    if (cached) {
      // Mettre à jour en arrière-plan
      fetchAndUpdateCache(request, cacheName);
      return cached;
    }

    // Pas en cache, essayer la réseau
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Erreur cache-first:', error);
    return getOfflineFallback(request);
  }
}

// ============================================================
// Métaux utilitaires
// ============================================================
function isApiRequest(url: URL): boolean {
  return API_PATTERNS.some((pattern) => pattern.test(url.pathname));
}

function isImageRequest(url: URL): boolean {
  return /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(url.pathname);
}

function isStaticAsset(url: URL): boolean {
  const pathname = url.pathname;
  return /\.(js|css|woff|woff2|ttf|eot)$/i.test(pathname) || pathname === '/';
}

async function fetchAndUpdateCache(request: Request, cacheName: string): Promise<void> {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
  } catch (error) {
    console.log('[SW] Erreur mise à jour cache:', error);
  }
}

function getOfflineFallback(request: Request): Response {
  const url = new URL(request.url);

  // Page HTML fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
          .offline-container {
            text-align: center;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            max-width: 400px;
          }
          h1 { color: #d32f2f; margin: 0 0 16px 0; }
          p { color: #666; margin: 0; line-height: 1.6; }
          .status { color: #999; font-size: 14px; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="offline-container">
          <h1>📡 Mode Offline</h1>
          <p>Vous êtes actuellement en mode offline. Veuillez vérifier votre connexion réseau.</p>
          <p>Vos données seront synchronisées automatiquement quand la connexion sera rétablie.</p>
          <div class="status">Statut: En attente de connexion...</div>
        </div>
      </body>
      </html>
      `,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }

  // API JSON fallback
  if (request.headers.get('accept')?.includes('application/json')) {
    return new Response(
      JSON.stringify({
        error: 'offline',
        message: 'Mode offline - données non disponibles',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Fallback par défaut
  return new Response('Service unavailable (offline)', { status: 503 });
}

// ============================================================
// Background Sync
// ============================================================
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-fiches') {
    event.waitUntil(syncFiches());
  }
});

async function syncFiches(): Promise<void> {
  console.log('[SW] Synchronisation en arrière-plan...');

  try {
    // Envoyer un message au client pour déclencher la sync
    const clients = await (self as any).clients.matchAll();
    clients.forEach((client: any) => {
      client.postMessage({
        type: 'SYNC_REQUESTED',
        timestamp: Date.now(),
      });
    });
  } catch (error) {
    console.error('[SW] Erreur sync arrière-plan:', error);
  }
}

// ============================================================
// Messages depuis les clients
// ============================================================
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const { type, payload } = event.data;

  if (type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches());
  } else if (type === 'CACHE_ASSETS') {
    event.waitUntil(cacheAssets(payload));
  } else if (type === 'PREFETCH_URLS') {
    event.waitUntil(prefetchUrls(payload));
  }
});

async function clearAllCaches(): Promise<void> {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map((name) => {
      if (Object.values(CACHE_NAMES).includes(name)) {
        return caches.delete(name);
      }
    })
  );
}

async function cacheAssets(urls: string[]): Promise<void> {
  const cache = await caches.open(CACHE_NAMES.STATIC);
  try {
    await cache.addAll(urls);
  } catch (error) {
    console.warn('[SW] Erreur cache assets:', error);
  }
}

async function prefetchUrls(urls: string[]): Promise<void> {
  const cache = await caches.open(CACHE_NAMES.API);
  try {
    await Promise.all(
      urls.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            cache.put(url, response);
          }
        } catch (error) {
          console.warn(`[SW] Erreur prefetch ${url}:`, error);
        }
      })
    );
  } catch (error) {
    console.warn('[SW] Erreur prefetch:', error);
  }
}

console.log('[SW] Service Worker chargé');
