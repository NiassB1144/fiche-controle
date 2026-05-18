'use strict';

// Indicateur connexion
function mettreAJourStatut() {
  const el = document.getElementById('statut-connexion');
  if (!el) return;
  if (navigator.onLine) {
    el.innerHTML = '<i class="bi bi-wifi"></i> <span>En ligne</span>';
    el.style.background = 'rgba(255,255,255,0.2)';
    syncLocale();
  } else {
    el.innerHTML = '<i class="bi bi-wifi-off"></i> <span>Hors ligne</span>';
    el.style.background = 'rgba(220,53,69,0.8)';
  }
}

window.addEventListener('online', mettreAJourStatut);
window.addEventListener('offline', mettreAJourStatut);
document.addEventListener('DOMContentLoaded', mettreAJourStatut);

// IndexedDB
const DB_NAME    = 'ficheControleDB';
const DB_VERSION = 1;
const STORE      = 'fiches_locales';

function ouvrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'local_id' });
        store.createIndex('synced', 'synced', { unique: false });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function sauvegarderLocalement(donnees) {
  try {
    const db = await ouvrirDB();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const local_id = donnees.local_id || 'fiche_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    store.put({ ...donnees, local_id, synced: false, saved_at: new Date().toISOString() });
    await majBanniereSync();
    return local_id;
  } catch (e) {
    console.warn('IndexedDB non disponible:', e);
  }
}

async function getFichesNonSynced() {
  try {
    const db = await ouvrirDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result || []).filter(item => item.synced !== true));
      req.onerror = () => resolve([]);
    });
  } catch { return []; }
}

// Récupérer une fiche locale par local_id
async function getFicheByLocalId(local_id) {
  try {
    const db = await ouvrirDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.get(local_id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) { return null; }
}

// Supprimer une fiche locale par local_id
async function deleteLocalFiche(local_id) {
  try {
    const db = await ouvrirDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.delete(local_id);
      req.onsuccess = () => { majBanniereSync(); resolve(); };
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (e) { console.warn('deleteLocalFiche error', e); }
}

// Rendre la liste des fiches locales non synchronisées dans la page
async function renderLocalFiches() {
  const container = document.getElementById('local-fiches-list');
  if (!container) return;
  const fiches = await getFichesNonSynced();
  container.innerHTML = '';
  if (!fiches || !fiches.length) {
    container.innerHTML = '<div class="small text-muted">Aucune fiche locale en attente.</div>';
    return;
  }
  fiches.forEach(f => {
    const div = document.createElement('div');
    div.className = 'fiche-card p-3 mb-2';
    const entreprise = f.entreprise || '(Sans nom)';
    const datec = f.date_controle || '';
    div.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <div class="fw-bold">${entreprise}</div>
          <div class="small text-muted">${datec}</div>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-primary btn-sm" data-local-edit="${f.local_id}"><i class="bi bi-pencil"></i> Modifier</button>
          <button class="btn btn-outline-danger btn-sm" data-local-delete="${f.local_id}"><i class="bi bi-trash3"></i> Supprimer</button>
        </div>
      </div>`;
    container.appendChild(div);
  });

  // Listeners
  container.querySelectorAll('[data-local-edit]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-local-edit');
      // Ouvrir le formulaire en mode création mais avec ?local_id=...
      window.location.href = '/fiches/nouvelle/?local_id=' + encodeURIComponent(id);
    });
  });
  container.querySelectorAll('[data-local-delete]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-local-delete');
      if (!confirm('Supprimer cette fiche locale ?')) return;
      await deleteLocalFiche(id);
      renderLocalFiches();
      afficherNotification('Fiche locale supprimée.', 'success');
    });
  });
}

async function marquerSynced(local_id, server_pk = null) {
  try {
    const db = await ouvrirDB();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.get(local_id);
    req.onsuccess = () => {
      if (req.result) {
        const updated = { ...req.result, synced: true };
        if (server_pk) updated.server_pk = server_pk;
        store.put(updated);
      }
    };
  } catch (e) {
    console.warn('marquerSynced error', e);
  }
}

// Banniere sync
async function majBanniereSync() {
  const fiches = await getFichesNonSynced();
  const banner = document.getElementById('sync-banner');
  const badge  = document.getElementById('sync-count');
  if (!banner) return;
  if (fiches.length > 0) {
    banner.style.display = 'flex';
    if (badge) badge.textContent = fiches.length;
  } else {
    banner.style.display = 'none';
  }
}

// Synchronisation automatique
async function syncLocale() {
  const fiches = await getFichesNonSynced();
  if (!fiches.length) return;

  try {
    const csrfToken = document.cookie.split('; ')
      .find(r => r.startsWith('csrftoken='))?.split('=')[1] || '';

    const resp = await fetch('/api/sync/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
      body: JSON.stringify({ fiches }),
    });

    if (resp.ok) {
      const data = await resp.json();
      for (const f of (data.fiches || [])) {
        if (f.local_id) await marquerSynced(f.local_id, f.server_pk);
      }
      await majBanniereSync();
      if (data.synchronisees > 0) {
        afficherNotification(`${data.synchronisees} fiche(s) synchronisée(s) avec le serveur.`, 'success');
      }
    }
  } catch (e) {
    console.warn('Sync échouée:', e);
  }
}

// Notification toast
function afficherNotification(message, type = 'info') {
  const container = document.getElementById('toast-container') || creerToastContainer();
  const id = 'toast_' + Date.now();
  const html = `
    <div id="${id}" class="toast align-items-center text-bg-${type} border-0" role="alert">
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>`;
  container.insertAdjacentHTML('beforeend', html);
  const el = document.getElementById(id);
  if (el && window.bootstrap) {
    const toast = new bootstrap.Toast(el, { delay: 4000 });
    toast.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
  }
}

function creerToastContainer() {
  const div = document.createElement('div');
  div.id = 'toast-container';
  div.className = 'toast-container position-fixed bottom-0 end-0 p-3';
  div.style.zIndex = '9999';
  document.body.appendChild(div);
  return div;
}

// PWA install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.style.display = 'flex';
});

document.addEventListener('DOMContentLoaded', () => {
  // Mettre à jour la banniere sync et lister fiches locales
  majBanniereSync();
  renderLocalFiches();

  // Sync au retour en ligne
  window.addEventListener('online', () => {
    console.log('[Sync] Connexion rétablie...');
    syncLocale();
  });

  // Bouton installer PWA
  const btn = document.getElementById('btn-installer-pwa');
  if (btn) {
    btn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      const banner = document.getElementById('pwa-install-banner');
      if (banner) banner.style.display = 'none';
    });
  }

  const btnFermer = document.getElementById('btn-fermer-pwa');
  if (btnFermer) {
    btnFermer.addEventListener('click', () => {
      const banner = document.getElementById('pwa-install-banner');
      if (banner) banner.style.display = 'none';
    });
  }
});

// Service Worker — enregistrement unique ici
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => console.log('[SW] Enregistré:', reg.scope))
      .catch(err => console.warn('[SW] Erreur:', err));
  });
}