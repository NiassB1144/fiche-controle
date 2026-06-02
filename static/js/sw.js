// ========================================================================
// SERVICE WORKER — fiche-controle-v13 (IndexedDB + offline optimisé)
// ========================================================================

const CACHE_NAME = 'fiche-controle-v13';
const DB_NAME = 'ficheControleDB';
const DB_VERSION = 5; // Synchronisé avec app-offline-unified.js
const STORE = 'fiches_locales';

const ASSETS = [
  '/',
  '/inspection/liste_fiches/',
  '/inspection/fiche/local/detail/',
  '/inspection/fiche/local/edit/',
  '/fiches/',
  '/fiches/creer/',
  '/connexion/',
  '/static/css/bootstrap.min.css',
  '/static/css/style.css',
  '/static/css/fiche-mobile.css',
  '/static/js/bootstrap.bundle.min.js',
  '/static/js/app.js',
  '/static/js/offline-v4.js',
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

// ── Sync automatique périodique ──────────────────────────────────────────
setInterval(async () => {
  if (navigator.onLine) {
    console.log('[SW] 🔄 Sync périodique...');
    await syncFiches();
  }
}, 30000);

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

function serveLocalFicheHTML(localId) {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fiche - Inspection du Travail</title>
    <link rel="stylesheet" href="/static/css/bootstrap.min.css">
    <link rel="stylesheet" href="/static/icons/bootstrap-icons.css">
    <style>
        body { background: #f5f7fa; padding: 2rem 0; }
        .container-lg { max-width: 1200px; }
        .fiche-card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .fiche-field { margin-bottom: 15px; }
        .fiche-label { font-weight: 600; color: #333; font-size: 0.9rem; }
        .fiche-value { background: #f8f9fa; padding: 12px; border-radius: 6px; margin-top: 6px; }
    </style>
</head>
<body class="bg-light">
    <div class="container-lg">
        <a href="/inspection/fiches/" class="btn btn-outline-secondary btn-sm mb-3">
            <i class="bi bi-arrow-left"></i> Retour à la liste
        </a>

        <div class="row gap-3">
            <div class="col-lg-8">
                <div class="fiche-card p-4">
                    <h3 id="fiche-titre" class="mb-4">Chargement...</h3>
                    <div id="fiche-content">
                        <div class="text-center py-5">
                            <div class="spinner-border mb-3" role="status"></div>
                            <p class="text-muted">Chargement des données...</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-lg-4">
                <div class="fiche-card p-4 sticky-top" style="top: 20px;">
                    <h5 class="mb-3">Actions</h5>
                    <div class="d-grid gap-2">
                        <button id="edit-btn" class="btn btn-primary"><i class="bi bi-pencil"></i> Modifier</button>
                        <button id="delete-btn" class="btn btn-danger"><i class="bi bi-trash3"></i> Supprimer</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="editModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Modifier la fiche</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="edit-form"></form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                    <button type="button" class="btn btn-primary" id="save-form-btn">Sauvegarder</button>
                </div>
            </div>
        </div>
    </div>

    <script src="/static/js/bootstrap.bundle.min.js"></script>
    <script>
        const localId = "${localId}";
        let ficheData = null;

        async function openDB() {
            return new Promise((r, x) => {
                const req = indexedDB.open('FicheControleDB', 5);
                req.onerror = () => x(req.error);
                req.onsuccess = () => r(req.target.result);
            });
        }

        async function getFicheFromDB(id) {
            const db = await openDB();
            return new Promise((r, x) => {
                const tx = db.transaction(['fiches'], 'readonly');
                const req = tx.objectStore('fiches').get(id);
                req.onerror = () => x(req.error);
                req.onsuccess = () => r(req.result);
            });
        }

        async function saveFicheToDB(data) {
            const db = await openDB();
            return new Promise((r, x) => {
                const tx = db.transaction(['fiches'], 'readwrite');
                const req = tx.objectStore('fiches').put(data);
                req.onerror = () => x(req.error);
                req.onsuccess = () => r(data);
            });
        }

        async function deleteFicheFromDB(id) {
            const db = await openDB();
            return new Promise((r, x) => {
                const tx = db.transaction(['fiches'], 'readwrite');
                const req = tx.objectStore('fiches').delete(id);
                req.onerror = () => x(req.error);
                req.onsuccess = () => r();
            });
        }

        async function addToSyncQueue(action, data) {
            const db = await openDB();
            return new Promise((r, x) => {
                const tx = db.transaction(['sync_queue'], 'readwrite');
                const req = tx.objectStore('sync_queue').add({
                    action, data, status: 'pending',
                    created_at: new Date().toISOString(), attempts: 0
                });
                req.onerror = () => x(req.error);
                req.onsuccess = () => r();
            });
        }

        async function loadFiche() {
            try {
                ficheData = await getFicheFromDB(localId);
                if (!ficheData) {
                    document.getElementById('fiche-content').innerHTML = '<div class="alert alert-danger"><i class="bi bi-exclamation-triangle"></i> Fiche non trouvée</div>';
                    return;
                }
                renderFiche(ficheData);
            } catch (error) {
                document.getElementById('fiche-content').innerHTML = '<div class="alert alert-danger">Erreur: ' + error.message + '</div>';
            }
        }

        function renderFiche(data) {
            document.getElementById('fiche-titre').textContent = data.entreprise || 'Fiche sans nom';
            let html = '';
            for (const [key, value] of Object.entries(data)) {
                if (!['id', 'local_id', 'cached_at', 'updated_at'].includes(key) && value) {
                    html += \`<div class="fiche-field"><div class="fiche-label">\${key.replace(/_/g, ' ')}</div><div class="fiche-value">\${value}</div></div>\`;
                }
            }
            document.getElementById('fiche-content').innerHTML = html || '<p class="text-muted">Aucune donnée</p>';
        }

        document.getElementById('edit-btn').addEventListener('click', () => {
            if (!ficheData) return;
            let form = '';
            for (const [key, value] of Object.entries(ficheData)) {
                if (['id', 'local_id', 'cached_at', 'updated_at'].includes(key)) continue;
                form += \`<div class="mb-3"><label class="form-label">\${key.replace(/_/g, ' ')}</label><input type="text" class="form-control" name="\${key}" value="\${String(value || '').replace(/"/g, '&quot;')}"></div>\`;
            }
            document.getElementById('edit-form').innerHTML = form;
            new bootstrap.Modal(document.getElementById('editModal')).show();
        });

        document.getElementById('save-form-btn').addEventListener('click', async () => {
            const form = document.getElementById('edit-form');
            const formData = new FormData(form);
            const updated = { ...ficheData, ...Object.fromEntries(formData) };
            await saveFicheToDB(updated);
            await addToSyncQueue('update', updated);
            ficheData = updated;
            renderFiche(ficheData);
            bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
            alert('✓ Modifiée! Sync en attente...');
        });

        document.getElementById('delete-btn').addEventListener('click', async () => {
            if (!confirm('Supprimer cette fiche?')) return;
            await addToSyncQueue('delete', { local_id: localId, id: ficheData?.id });
            await deleteFicheFromDB(localId);
            alert('✓ Supprimée!');
            setTimeout(() => { window.location.href = '/inspection/fiches/'; }, 1000);
        });

        loadFiche();
    </script>
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

  // ── API GET/POST/DELETE : Network First + cache (sauf DELETE/POST) ─────
  if (url.pathname.startsWith('/api/')) {
    // Ne pas mettre en cache les requêtes DELETE, POST, PUT
    if (event.request.method === 'DELETE' || event.request.method === 'POST' || event.request.method === 'PUT') {
      event.respondWith(
        fetch(event.request).catch(() =>
          new Response(JSON.stringify({ 
            error: 'offline', 
            message: 'Vous êtes hors-ligne. Requête ' + event.request.method + ' impossible.',
            data: []
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          })
        )
      );
      return;
    }
    
    // GET : Network First + cache
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
    // Pages locales /fiche/local/* ou /inspection/fiche/local/* doivent être servies en Network First
    // (le contenu vient du serveur Django mais avec données depuis IndexedDB côté client)
    if (url.pathname.startsWith('/fiche/local/') || url.pathname.startsWith('/inspection/fiche/local/')) {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            // Mettre en cache les réponses OK
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request.url, clone));
            }
            return response;
          })
          .catch(() => {
            // En cas d'erreur réseau, essayer le cache
            return caches.match(event.request).then((cached) => {
              if (cached) return cached;
              
              // Servir une page HTML générique qui charge depuis IndexedDB
              const localId = url.pathname.match(/\/fiche\/local\/([^\/]+)/)?.[1] || url.pathname.match(/\/inspection\/fiche\/local\/([^\/]+)/)?.[1];
              return serveLocalFicheHTML(localId || 'unknown');
            });
          })
      );
      return;
    }

    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Ignorer les redirections opaques
          if (response.type === 'opaqueredirect') {
            return response;
          }
          // Sauvegarder les réponses OK en cache (normalisé: sans query string)
          if (response.ok) {
            const clone = response.clone();
            const baseUrl = event.request.url.split('?')[0];
            caches.open(CACHE_NAME).then((cache) => cache.put(baseUrl, clone));
          }
          // Retourner la réponse (même les 404, 500, etc.)
          return response;
        })
        .catch(() => {
          // Erreur réseau = mode hors-ligne
          // Essayer de retourner la version en cache (normalisé: sans query string)
          const baseUrl = event.request.url.split('?')[0];
          return caches.match(baseUrl)
            .then((cached) => {
              if (cached) return cached;
              // Page pas en cache + pas de réseau = erreur 503
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