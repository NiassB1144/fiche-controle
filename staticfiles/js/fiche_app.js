// ========================================================================
// FICHE-CONTROLE v7 — fiche_app.js
// Version finale - Base propre
// ========================================================================

const LOG_PREFIX = '[FicheApp]';
const DB_NAME = 'ficheControleDB_v7';  // ← Nouvelle base
const DB_VERSION = 1;
const STORE_NAME = 'fiches_locales';

window.FicheAppReady = false;

function logInfo(msg, data) { console.log(LOG_PREFIX, msg, data || ''); }
function logWarn(msg, data) { console.warn(LOG_PREFIX, msg, data || ''); }
function logError(msg, data) { console.error(LOG_PREFIX, msg, data || ''); }

function escapeHtmlStatic(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getCsrfToken() {
  const cookie = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
  if (cookie) return cookie.split('=')[1];
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute('content') : '';
}

function ouvrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('entreprise', 'entreprise', { unique: false });
        logInfo('ObjectStore créé');
      }
    };
    
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function sauvegarderLocalement(donnees) {
  try {
    const db = await ouvrirDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    let id = donnees.local_id || donnees.id;
    if (!id) {
      id = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // Valider et nettoyer les données - s'assurer que c'est un objet valide
    const cleanedData = {};
    if (typeof donnees === 'object' && donnees !== null) {
      for (const [key, value] of Object.entries(donnees)) {
        // Ignorer les propriétés système non pertinentes
        if (!key.startsWith('_') && key !== 'csrfmiddlewaretoken') {
          cleanedData[key] = value;
        }
      }
    }
    
    const fiche = {
      id: id,
      local_id: id,
      data: cleanedData,
      entreprise: cleanedData.entreprise || 'Sans nom',
      date_controle: cleanedData.date_controle || '',
      synced: false,
      saved_at: new Date().toISOString()
    };
    
    return new Promise((resolve, reject) => {
      const req = store.put(fiche);
      req.onsuccess = () => {
        logInfo('✓ Fiche sauvegardée', { id });
        resolve({ local_id: id, id: id });
      };
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (e) {
    logError('Erreur sauvegarde', e);
    throw e;
  }
}

async function getFicheByLocalId(local_id) {
  try {
    const db = await ouvrirDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const req = store.get(String(local_id));
      req.onsuccess = () => {
        const result = req.result;
        if (result) {
          resolve({
            ...(result.data || result),
            id: result.id,
            local_id: result.id,
            synced: result.synced
          });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    logError('Erreur getFiche', e);
    return null;
  }
}

async function getAllFiches() {
  try {
    const db = await ouvrirDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    return new Promise((resolve, reject) => {
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => {
        const results = req.result || [];
        resolve(results.map(item => ({
          ...(item.data || item),
          id: item.id,
          local_id: item.id,
          synced: item.synced
        })));
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return [];
  }
}

async function deleteFiche(local_id) {
  try {
    const db = await ouvrirDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = tx.objectStore(STORE_NAME).delete(String(local_id));
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return false;
  }
}

async function updateFiche(local_id, donnees) {
  try {
    const existing = await getFicheByLocalId(local_id);
    if (!existing) throw new Error('Fiche non trouvée');
    
    const updatedData = { ...existing, ...donnees };
    return sauvegarderLocalement(updatedData);
  } catch (e) {
    logError('Erreur update', e);
    throw e;
  }
}

async function syncAll() {
  if (!navigator.onLine) return { synced: 0, failed: 0 };
  
  const fiches = await getAllFiches();
  const pending = fiches.filter(f => !f.synced);
  let synced = 0, failed = 0;
  
  for (const fiche of pending) {
    try {
      const response = await fetch('/inspection/api/fiche/creer/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        body: JSON.stringify(fiche.data || fiche)
      });
      if (response.ok) {
        await updateFiche(fiche.id, { synced: true });
        synced++;
      } else {
        failed++;
      }
    } catch (e) {
      failed++;
    }
  }
  return { synced, failed };
}

async function getPendingSyncCount() {
  const fiches = await getAllFiches();
  return fiches.filter(f => !f.synced).length;
}

window.FicheApp = {
  sauvegarderLocalement,
  saveFiche: sauvegarderLocalement,
  updateFiche,
  getFicheByLocalId,
  getFiche: getFicheByLocalId,
  getAllFiches,
  deleteFiche,
  syncAll,
  getPendingSyncCount
};

logInfo('✓ fiche_app.js v7 chargé - Base: ' + DB_NAME);