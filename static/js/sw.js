// ========================================================================
// SERVICE WORKER — fiche-controle-v14 (IndexedDB + offline complet)
// Version corrigée avec gestion CRUD complète
// ========================================================================

const CACHE_NAME = 'fiche-controle-v14';
const DB_NAME = 'ficheControleDB';
const DB_VERSION = 5;
const STORE = 'fiches_locales';

const ASSETS = [
  '/',
  '/inspection/fiches/',
  '/connexion/',
  '/static/css/bootstrap.min.css',
  '/static/css/style.css',
  '/static/css/fiche-mobile.css',
  '/static/js/bootstrap.bundle.min.js',
  '/static/js/app.js',
  '/static/js/offline-detail.js',
  '/static/js/offline-edit.js',
  '/static/icons/bootstrap-icons.css',
  '/manifest.json',
  '/static/icons/icon-192.png',
  '/static/icons/icon-512.png',
  '/static/icons/logo.png',
  '/offline/',
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
  
  let csrfToken = null;
  if (originalRequest) {
    csrfToken = originalRequest.headers.get('X-CSRFToken');
  }
  
  let local_id = body.local_id || Date.now();
  if (typeof local_id === 'string' && !isNaN(parseInt(local_id))) {
    local_id = parseInt(local_id);
  }
  
  const fiche = {
    ...body,
    local_id: local_id,
    synced: false,
    saved_at: new Date().toISOString(),
    csrf_token: csrfToken
  };
  
  return new Promise((resolve, reject) => {
    const req = store.put(fiche);
    req.onsuccess = () => {
      console.log('[SW] Fiche sauvegardée localement:', local_id);
      resolve(local_id);
    };
    req.onerror = () => reject(req.error);
  });
}

async function getFicheByServerPk(db, serverPk) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const index = tx.objectStore(STORE).index('server_pk');
    const req = index.get(serverPk);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function updateFicheInDB(db, fiche) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put(fiche);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function deleteFicheLocale(local_id) {
  const db = await ouvrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).delete(parseInt(local_id));
    req.onsuccess = () => {
      console.log('[SW] Fiche locale supprimée:', local_id);
      resolve();
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
    const req = store.get(parseInt(local_id));
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
      console.warn(`[SW] ⚠ Service Worker hors ligne - sync reportée: ${fiche.local_id}`);
    }
  }
  
  console.log(`[SW] Synchronisation terminée: ${synced} OK, ${failed} KO`);
  return { synced, failed };
}

// ── Page HTML pour les fiches locales ────────────────────────────────────
function serveLocalFicheHTML(localId) {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Fiche de contrôle - Inspection du Travail</title>
    <link rel="stylesheet" href="/static/css/bootstrap.min.css">
    <link rel="stylesheet" href="/static/icons/bootstrap-icons.css">
    <style>
        body { background: #f5f7fa; padding: 1.5rem 0; }
        .container-lg { max-width: 1200px; }
        .fiche-card { background: white; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
        .fiche-field { margin-bottom: 1rem; }
        .fiche-label { font-weight: 600; color: #495057; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; }
        .fiche-value { background: #f8f9fa; padding: 0.75rem 1rem; border-radius: 10px; margin-top: 0.25rem; color: #212529; }
        .fiche-fields { display: flex; flex-direction: column; gap: 1rem; }
        @media (max-width: 768px) {
            body { padding: 0.75rem 0; }
            .fiche-card { border-radius: 12px; }
        }
    </style>
</head>
<body>
    <div class="container-lg">
        <div class="mb-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
            <a href="/inspection/fiches/" class="btn btn-outline-secondary btn-sm">
                <i class="bi bi-arrow-left"></i> Retour
            </a>
            <div class="d-flex gap-2">
                <button id="sync-btn" class="btn btn-outline-info btn-sm">
                    <i class="bi bi-arrow-repeat"></i> Synchroniser
                </button>
            </div>
        </div>

        <div class="row g-3">
            <div class="col-lg-8">
                <div class="fiche-card p-4">
                    <h3 id="fiche-titre" class="mb-4 fs-4 fw-bold">Chargement...</h3>
                    <div id="fiche-content">
                        <div class="text-center py-5">
                            <div class="spinner-border text-primary mb-3" role="status"></div>
                            <p class="text-muted">Chargement des données...</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-lg-4">
                <div class="fiche-card p-4 sticky-top" style="top: 20px;">
                    <h5 class="mb-3 fw-semibold">Actions</h5>
                    <div class="d-grid gap-2">
                        <button id="edit-btn" class="btn btn-primary">
                            <i class="bi bi-pencil"></i> Modifier
                        </button>
                        <button id="delete-btn" class="btn btn-outline-danger">
                            <i class="bi bi-trash3"></i> Supprimer
                        </button>
                    </div>
                    <hr class="my-3">
                    <div class="small text-muted">
                        <i class="bi bi-info-circle"></i> Cette fiche est stockée localement.<br>
                        Elle sera synchronisée automatiquement quand vous serez en ligne.
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="/static/js/bootstrap.bundle.min.js"></script>
    <script src="/static/js/offline-detail.js"></script>
</body>
</html>`;
  
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

// ── Fetch ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorer les requêtes externes ou admin
  if (!url.origin.startsWith(self.location.origin)) return;
  if (url.pathname.startsWith('/admin/')) return;

  // ── POST création ou modification : sauvegarde hors ligne ──
  if (event.request.method === 'POST' && 
      (url.pathname.match(/^\/api\/fiche\/creer\/$/) || 
       url.pathname.match(/^\/api\/fiche\/\d+\/modifier\/$/))) {
    event.respondWith(
      fetch(event.request.clone()).catch(async (error) => {
        console.log('[SW] Mode hors-ligne, sauvegarde locale du POST');
        try {
          const body = await event.request.clone().json();
          const localId = await saveFicheLocal(body, event.request);
          
          return new Response(JSON.stringify({ 
            offline: true, 
            saved: true, 
            message: 'Fiche sauvegardée localement (hors-ligne)',
            local_id: localId
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

  // ── DELETE : suppression hors ligne ──
  if (event.request.method === 'DELETE' && url.pathname.match(/\/api\/fiche\/\d+\/supprimer\//)) {
    event.respondWith(
      fetch(event.request.clone()).catch(async (error) => {
        console.log('[SW] Mode hors-ligne, suppression locale');
        try {
          const match = url.pathname.match(/\/api\/fiche\/(\d+)\/supprimer\//);
          const serverId = match ? parseInt(match[1]) : null;
          
          if (serverId) {
            const db = await ouvrirDB();
            const fiche = await getFicheByServerPk(db, serverId);
            if (fiche) {
              await deleteFicheLocale(fiche.local_id);
            }
          }
          
          return new Response(JSON.stringify({ 
            offline: true, 
            deleted: true, 
            message: 'Suppression sauvegardée localement'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (e) {
          console.error('[SW] Erreur suppression locale:', e);
          return new Response(JSON.stringify({ 
            offline: true, 
            deleted: false, 
            error: 'Erreur lors de la suppression' 
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      })
    );
    return;
  }

  // ── API GET : Network First + cache ──
  if (url.pathname.startsWith('/api/')) {
    if (event.request.method === 'GET') {
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
    
    // Autres méthodes API (PUT, etc.) - erreur 503
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ 
          error: 'offline', 
          message: 'Vous êtes hors-ligne. Requête impossible.'
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // ── Pages HTML locales : Network First + fallback personnalisé ──
  if (event.request.headers.get('accept')?.includes('text/html')) {
    if (url.pathname.match(/\/inspection\/fiche\/local\/(\d+)\/detail\//) ||
        url.pathname.match(/\/inspection\/fiche\/local\/(\d+)\/edit\//)) {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request.url, clone));
            }
            return response;
          })
          .catch(() => {
            const match = url.pathname.match(/\/inspection\/fiche\/local\/(\d+)\//);
            const localId = match ? match[1] : 'unknown';
            return serveLocalFicheHTML(localId);
          })
      );
      return;
    }

    // Autres pages HTML
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok && response.type !== 'opaqueredirect') {
            const clone = response.clone();
            const baseUrl = event.request.url.split('?')[0];
            caches.open(CACHE_NAME).then((cache) => cache.put(baseUrl, clone));
          }
          return response;
        })
        .catch(() => {
          const baseUrl = event.request.url.split('?')[0];
          return caches.match(baseUrl)
            .then((cached) => {
              if (cached) return cached;
              return new Response('Connexion perdue - page non disponible en cache', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
              });
            });
        })
    );
    return;
  }

  // ── Fichiers statiques : Cache First ──
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
          if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
            return caches.match('/static/icons/icon-192.png');
          }
          return new Response('', { status: 404, statusText: 'Not Found' });
        });
    })
  );
});

// ── Background Sync ──
self.addEventListener('sync', (event) => {
  console.log('[SW] Événement sync reçu:', event.tag);
  if (event.tag === 'sync-fiches') {
    event.waitUntil(syncFiches());
  }
});

// ── Message handling ──
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

// ── Periodic Sync ──
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'periodic-sync-fiches') {
      event.waitUntil(syncFiches());
    }
  });
}

console.log('[SW] Service Worker chargé - version v14');