// ========================================================================
// FICHE-CONTROLE v3 — app.js (corrigé avec offline/online + local_id)
// ========================================================================

const LOG_PREFIX = '[FicheApp]';
const DB_NAME = 'ficheControleDB';
const DB_VERSION = 2;
const STORE = 'fiches_locales';

// ========================================================================
// LOGGING
// ========================================================================
function logInfo(msg, data = null) { console.log(LOG_PREFIX, msg, data || ''); }
function logWarn(msg, data = null) { console.warn(LOG_PREFIX, msg, data || ''); }
function logError(msg, data = null) { console.error(LOG_PREFIX, msg, data || ''); }

// ========================================================================
// NOTIFICATIONS
// ========================================================================
function afficherNotification(message, type = 'info') {
  const container = document.getElementById('toast-container') || creerToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-bg-${type} border-0 show`;
  toast.role = 'alert';
  toast.innerHTML = `<div class="d-flex"><div class="toast-body">${message}</div></div>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
function creerToastContainer() {
  const c = document.createElement('div');
  c.id = 'toast-container';
  c.className = 'toast-container position-fixed bottom-0 end-0 p-3';
  document.body.appendChild(c);
  return c;
}

// ========================================================================
// INDEXEDDB
// ========================================================================
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
async function sauvegarderLocalement(donnees) {
  const db = await ouvrirDB();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  const fiche = { ...donnees, local_id: Date.now(), synced: false };
  store.put(fiche);
  return fiche.local_id;
}
async function getFicheByLocalId(local_id) {
  const db = await ouvrirDB();
  const tx = db.transaction(STORE, 'readonly');
  return new Promise((resolve, reject) => {
    const req = tx.objectStore(STORE).get(local_id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ========================================================================
// FORMULAIRE — ENREGISTREMENT ONLINE/OFFLINE
// ========================================================================
async function soumettreFormulaire(statut) {
  const donnees = collecterDonnees(statut);

  if (!navigator.onLine) {
    // Hors ligne → sauvegarde locale
    const local_id = await sauvegarderLocalement(donnees);
    afficherNotification('Fiche sauvegardée hors ligne', 'success');
    window.location.href = '/fiches/nouvelle/?local_id=' + encodeURIComponent(local_id);
  } else {
    // En ligne → envoi au serveur
    try {
      const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
      const resp = await fetch('/api/fiche/creer/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
        body: JSON.stringify(donnees)
      });
      if (resp.ok) {
        const data = await resp.json();
        afficherNotification('Fiche créée en ligne', 'success');
        window.location.href = '/fiches/' + data.id + '/';
      } else {
        afficherNotification('Erreur lors de la création en ligne', 'danger');
      }
    } catch (e) {
      logError('Erreur soumission en ligne', e);
      afficherNotification('Erreur réseau lors de la création', 'danger');
    }
  }
}

// ========================================================================
// INITIALISATION DOM
// ========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  logInfo('🚀 Initialisation application...');

  // Charger une fiche locale si ?local_id=... est présent
  const params = new URLSearchParams(window.location.search);
  const local_id = params.get('local_id');
  if (local_id) {
    const fiche = await getFicheByLocalId(parseInt(local_id));
    if (fiche) {
      for (const [name, value] of Object.entries(fiche)) {
        const el = document.querySelector(`[name="${name}"]`);
        if (el) {
          if (el.type === 'checkbox') {
            el.checked = value === 'on';
          } else {
            el.value = value;
          }
        }
      }
      afficherNotification('Fiche locale chargée', 'info');
    } else {
      afficherNotification('Fiche locale introuvable', 'danger');
    }
  }

  logInfo('✓ Application prête');
});

// ========================================================================
// EXPORT GLOBAL
// ========================================================================
window.FicheApp = {
  sauvegarderLocalement,
  getFicheByLocalId,
  soumettreFormulaire,
  afficherNotification,
  logInfo, logWarn, logError
};
logInfo('✓ Fichier app.js v3 chargé');
