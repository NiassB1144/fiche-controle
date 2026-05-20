// ========================================================================
// SERVICE WORKER — fiche-controle-v6 (CORRIGÉ)
// ========================================================================

const CACHE_NAME = 'fiche-controle-v6';

const ASSETS = [
  '/',
  '/fiches/',
  '/fiches/nouvelle/',
  '/connexion/',
  '/static/css/bootstrap.min.css',
  '/static/css/style.css',
  '/static/js/bootstrap.bundle.min.js',
  '/static/js/app.js',
  '/static/icons/bootstrap-icons.css',
  '/manifest.json',
  '/static/icons/icon-192.png',
  '/static/icons/icon-512.png',
  '/static/icons/logo.png',
];

// ── Install : précacher les assets ──────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(
          ASSETS.map((url) =>
            cache.add(url).catch((err) =>
              console.warn(`[SW] Impossible de cacher : ${url}`, err)
            )
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

// ── Activate : supprimer les anciens caches ──────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch : stratégies par type de requête ───────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/admin/')) return;

  // ── API GET : Network First + mise en cache pour hors ligne ─────────
  // ✅ CORRIGÉ — on NE bloque plus /api/, on cache les réponses GET
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => {
            if (cached) return cached;
            // Pas de cache dispo → réponse JSON vide valide pour ne pas faire planter le JS
            return new Response(JSON.stringify({ fiches: [], offline: true }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          })
        )
    );
    return;
  }

  // ── Pages HTML : Network First ────────────────────────────────────────
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || caches.match('/'))
        )
    );
    return;
  }

  // ── Fichiers statiques : Cache First ──────────────────────────────────
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => new Response('', { status: 404, statusText: 'Not Found' }));
    })
  );
});