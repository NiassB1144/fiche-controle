// ========================================================================
// SERVICE WORKER — fiche-controle-v9 (corrigé avec POST + IndexedDB + redirect fix)
// ========================================================================

const CACHE_NAME = 'fiche-controle-v9';
const DB_NAME = 'ficheControleDB';
const DB_VERSION = 2;
const STORE = 'fiches_locales';

const ASSETS = [
  '/',
  '/fiches/',
  '/fiches/nouvelle/',
  '/connexion/',
  '/offline.html',
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

// ── Install ──────────────────────────────────────────────────────────────
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

// ── Activate ─────────────────────────────────────────────────────────────
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

// ── IndexedDB helpers ───────────────────────────────────────────────────
function ouvrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'local_id' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function saveFicheLocal(body) {
  const db = await ouvrirDB();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  const fiche = {
    ...body,
    local_id: Date.now(),
    synced: false
  };
  store.put(fiche);
  return tx.complete;
}

async function getFichesLocales() {
  const db = await ouvrirDB();
  const tx = db.transaction(STORE, 'readonly');
  return new Promise((resolve, reject) => {
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function syncFiches() {
  const fiches = await getFichesLocales();
  for (const f of fiches.filter(x => !x.synced)) {
    try {
      const res = await fetch('/api/fiches/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f)
      });
      if (res.ok) {
        const db = await ouvrirDB();
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        f.synced = true;
        store.put(f);
      }
    } catch (err) {
      console.warn('[SW] Sync échoué pour fiche locale', f.local_id, err);
    }
  }
}

// ── Fetch ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorer les requêtes externes ou admin
  if (!url.origin.startsWith(self.location.origin)) return;
  if (url.pathname.startsWith('/admin/')) return;

  // ── POST vers /api/fiches/ : sauvegarde hors ligne ─────────────────────
  if (event.request.method === 'POST' && url.pathname.startsWith('/api/fiches/')) {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const body = await event.request.clone().json();
        await saveFicheLocal(body);
        return new Response(JSON.stringify({ offline: true, saved: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // ── API GET : Network First + cache ────────────────────────────────────
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
            return new Response(JSON.stringify({ fiches: [], offline: true }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          })
        )
    );
    return;
  }

  // ── Pages HTML : Network First + cache ─────────────────────────────────
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // ✅ Correction : ignorer les redirections opaques
          if (response.ok && response.type !== 'opaqueredirect') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return caches.match('/offline.html')
              .then((offlinePage) => offlinePage || caches.match('/'));
          })
        )
    );
    return;
  }

  // ── Fichiers statiques : Cache First ───────────────────────────────────
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

// ── Background Sync ─────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-fiches') {
    event.waitUntil(syncFiches());
  }
});
