// ========================================================================
// SERVICE WORKER — fiche-controle-v12 (IndexedDB + offline optimisé)
// ========================================================================

const CACHE_NAME = 'fiche-controle-v12';
const DB_NAME = 'ficheControleDB';
const DB_VERSION = 5; // Synchronisé avec app-offline-unified.js
const STORE = 'fiches_locales';

const ASSETS = [
  '/',
  '/fiches/',
  '/fiches/creer/',
  '/connexion/',
  '/offline.html',
  '/static/css/bootstrap.min.css',
  '/static/css/style.css',
  '/static/css/fiche-mobile.css',
  '/static/js/bootstrap.bundle.min.js',
  '/static/js/app-offline-unified.js',
  '/static/icons/bootstrap-icons.css',
  '/manifest.json',
  '/static/icons/icon-192.png',
  '/static/icons/icon-512.png',
  '/static/icons/logo.png',
];

// ── Install ──────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installation...');
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
      .then(() => {
        console.log('[SW] Installation terminée');
        return self.skipWaiting();
      })
  );
});

// ── Activate ─────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation...');
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => {
            console.log('[SW] Suppression ancien cache:', key);
            return caches.delete(key);
          })
        )
      )
      .then(() => {
        console.log('[SW] Activation terminée');
        return self.clients.claim();
      })
  );
});

// ── IndexedDB helpers ───────────────────────────────────────────────────
function ouvrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'local_id' });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('server_pk', 'server_pk', { unique: false });
        console.log('[SW] Base IndexedDB créée/mise à jour');
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function saveFicheLocal(body, originalRequest) {
  const db = await ouvrirDB();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  
  // Extraire le token CSRF si présent
  let csrfToken = null;
  if (originalRequest) {
    csrfToken = originalRequest.headers.get('X-CSRFToken');
  }
  
  const fiche = {
    ...body,
    local_id: Date.now(),
    synced: false,
    saved_at: new Date().toISOString(),
    csrf_token: csrfToken
  };
  
  return new Promise((resolve, reject) => {
    const req = store.put(fiche);
    req.onsuccess = () => {
      console.log('[SW] Fiche sauvegardée localement:', fiche.local_id);
      resolve(fiche.local_id);
    };
    req.onerror = () => reject(req.error);
  });
}

async function getAllFichesLocales() {
  const db = await ouvrirDB();
  const tx = db.transaction(STORE, 'readonly');
  return new Promise((resolve, reject) => {
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function markFicheAsSynced(local_id) {
  const db = await ouvrirDB();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  
  return new Promise((resolve, reject) => {
    const req = store.get(local_id);
    req.onsuccess = () => {
      const fiche = req.result;
      if (fiche) {
        fiche.synced = true;
        fiche.synced_at = new Date().toISOString();
        store.put(fiche);
        console.log('[SW] Fiche marquée comme synchronisée:', local_id);
      }
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

async function deleteFicheLocale(local_id) {
  const db = await ouvrirDB();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  return new Promise((resolve, reject) => {
    const req = store.delete(local_id);
    req.onsuccess = () => {
      console.log('[SW] Fiche locale supprimée:', local_id);
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

async function syncFiches() {
  console.log('[SW] Début synchronisation des fiches...');
  const fiches = await getAllFichesLocales();
  const pending = fiches.filter(f => !f.synced);
  
  if (pending.length === 0) {
    console.log('[SW] Aucune fiche à synchroniser');
    return { synced: 0, failed: 0 };
  }
  
  let synced = 0;
  let failed = 0;
  
  for (const fiche of pending) {
    try {
      const url = fiche.server_pk ? `/api/fiche/${fiche.server_pk}/modifier/` : '/api/fiche/creer/';
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (fiche.csrf_token) {
        headers['X-CSRFToken'] = fiche.csrf_token;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(fiche)
      });
      
      if (response.ok) {
        const data = await response.json();
        await markFicheAsSynced(fiche.local_id);
        synced++;
        console.log(`[SW] ✓ Fiche synchronisée: ${fiche.entreprise || fiche.local_id}`);
        
        // Notifier les clients ouverts
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'FICHE_SYNCED',
            payload: { local_id: fiche.local_id, server_id: data.id }
          });
        });
      } else {
        failed++;
        console.warn(`[SW] ✗ Échec sync ${fiche.local_id}:`, response.status);
      }
    } catch (err) {
      failed++;
      console.error(`[SW] ✗ Erreur sync ${fiche.local_id}:`, err);
    }
  }
  
  console.log(`[SW] Synchronisation terminée: ${synced} OK, ${failed} KO`);
  return { synced, failed };
}

// ── Fetch ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorer les requêtes externes ou admin
  if (!url.origin.startsWith(self.location.origin)) return;
  if (url.pathname.startsWith('/admin/')) return;

  // ── POST vers /api/fiche/creer/ ou /api/fiche/*/modifier/ : sauvegarde hors ligne ──
  if (event.request.method === 'POST' && 
      (url.pathname.match(/^\/api\/fiche\/creer\/$/) || 
       url.pathname.match(/^\/api\/fiche\/\d+\/modifier\/$/))) {
    event.respondWith(
      fetch(event.request.clone()).catch(async (error) => {
        console.log('[SW] Mode hors-ligne, sauvegarde locale du POST');
        try {
          const body = await event.request.clone().json();
          await saveFicheLocal(body, event.request);
          
          // Retourner une réponse simulée pour que l'app continue
          return new Response(JSON.stringify({ 
            offline: true, 
            saved: true, 
            message: 'Fiche sauvegardée localement (hors-ligne)',
            local_id: Date.now()
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (e) {
          console.error('[SW] Erreur sauvegarde locale:', e);
          return new Response(JSON.stringify({ 
            offline: true, 
            saved: false, 
            error: 'Erreur lors de la sauvegarde' 
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
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
            return new Response(JSON.stringify({ 
              error: 'offline', 
              message: 'Vous êtes hors-ligne',
              data: [] 
            }), {
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
          // Ignorer les redirections opaques
          if (response.type === 'opaqueredirect') {
            return response;
          }
          if (response.ok) {
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
      if (cached) {
        return cached;
      }
      return fetch(event.request)
        .then((response) => {
          if (response.ok && response.type !== 'opaque') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Pour les images manquantes, retourner un placeholder
          if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
            return caches.match('/static/icons/icon-192.png');
          }
          return new Response('', { status: 404, statusText: 'Not Found' });
        });
    })
  );
});

// ── Background Sync ─────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  console.log('[SW] Événement sync reçu:', event.tag);
  if (event.tag === 'sync-fiches') {
    event.waitUntil(syncFiches());
  }
});

// ── Message handling (depuis l'app) ─────────────────────────────────────
self.addEventListener('message', (event) => {
  console.log('[SW] Message reçu:', event.data);
  
  if (event.data && event.data.type === 'FORCE_SYNC') {
    event.waitUntil(syncFiches());
  }
  
  if (event.data && event.data.type === 'GET_PENDING_COUNT') {
    getAllFichesLocales().then(fiches => {
      const pending = fiches.filter(f => !f.synced).length;
      event.ports[0].postMessage({ pending });
    });
  }
});

// ── Periodic Sync (si supporté) ─────────────────────────────────────────
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'periodic-sync-fiches') {
      event.waitUntil(syncFiches());
    }
  });
}

console.log('[SW] Service Worker chargé - version v12');