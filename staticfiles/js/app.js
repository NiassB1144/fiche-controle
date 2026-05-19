'use strict';

// ─── Indicateur connexion ──────────────────────────────────────────────────
function mettreAJourStatut() {
  const el = document.getElementById('statut-connexion');
  const alerte = document.getElementById('alerte-hors-ligne');
  if (!el) return;
  if (navigator.onLine) {
    el.innerHTML = '<i class="bi bi-wifi"></i> En ligne';
    el.className = 'badge bg-success';
    if (alerte) alerte.classList.add('d-none');
    syncLocale();
  } else {
    el.innerHTML = '<i class="bi bi-wifi-off"></i> Hors ligne';
    el.className = 'badge bg-danger';
    if (alerte) alerte.classList.remove('d-none');
  }
}

window.addEventListener('online', mettreAJourStatut);
window.addEventListener('offline', mettreAJourStatut);
document.addEventListener('DOMContentLoaded', mettreAJourStatut);

// ─── IndexedDB pour stockage hors-ligne ────────────────────────────────────
const DB_NAME = 'ficheControleDB';
const DB_VERSION = 1;
const STORE = 'fiches_locales';

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

async function marquerSynced(local_id) {
  try {
    const db = await ouvrirDB();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.get(local_id);
    req.onsuccess = () => {
      if (req.result) store.put({ ...req.result, synced: true });
    };
  } catch {}
}

// ─── Synchronisation automatique ──────────────────────────────────────────
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
        if (f.local_id) await marquerSynced(f.local_id);
      }
      if (data.synchronisees > 0) {
        afficherNotification(`${data.synchronisees} fiche(s) synchronisée(s) avec le serveur.`, 'success');
      }
    }
  } catch {}
}

// ─── Notification toast ───────────────────────────────────────────────────
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

// ─── PWA Install prompt ───────────────────────────────────────────────────
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.style.display = 'flex';
});

document.addEventListener('DOMContentLoaded', () => {
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

// ─── Enregistrement Service Worker ────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => console.log('SW enregistré:', reg.scope))
      .catch(err => console.warn('SW erreur:', err));
  });
}
