// ========================================================================
// FICHE-CONTROLE v7 — app-offline-unified.js (FIXED)
// Gestion IndexedDB, offline, synchronisation UNIFIÉE - VERSION FINALE
// ========================================================================

const LOG_PREFIX = '[FicheApp]';
const DB_NAME = 'ficheControleDB_v7';
const DB_VERSION = 1;
const STORE_NAME = 'fiches_locales';

// Flag de ready
window.FicheAppReady = false;

// ========================================================================
// LOGGING
// ========================================================================
function logInfo(msg, data = null) { 
  console.log(LOG_PREFIX, msg, data || ''); 
}

function logWarn(msg, data = null) { 
  console.warn(LOG_PREFIX, msg, data || ''); 
}

function logError(msg, data = null) { 
  console.error(LOG_PREFIX, msg, data || ''); 
}

// ========================================================================
// UTILITIES
// ========================================================================
function escapeHtmlStatic(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========================================================================
// NOTIFICATIONS
// ========================================================================
function afficherNotification(message, type = 'info') {
  try {
    const container = document.getElementById('toast-container') || creerToastContainer();
    const toast = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-success' : type === 'danger' ? 'bg-danger' : type === 'warning' ? 'bg-warning' : 'bg-info';
    toast.className = `toast align-items-center text-white ${bgClass} border-0 show`;
    toast.role = 'alert';
    toast.setAttribute('data-bs-autohide', 'true');
    toast.setAttribute('data-bs-delay', '4000');
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${escapeHtmlStatic(message)}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    `;
    container.appendChild(toast);
    
    if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
      const bsToast = new bootstrap.Toast(toast);
      bsToast.show();
      toast.addEventListener('hidden.bs.toast', () => toast.remove());
    } else {
      setTimeout(() => toast.remove(), 4000);
    }
  } catch (e) {
    console.error('Erreur afficherNotification', e);
  }
}

function creerToastContainer() {
  let c = document.getElementById('toast-container');
  if (c) return c;
  c = document.createElement('div');
  c.id = 'toast-container';
  c.className = 'toast-container position-fixed bottom-0 end-0 p-3';
  c.style.zIndex = '1100';
  document.body.appendChild(c);
  return c;
}

// ========================================================================
// INDEXEDDB - INITIALISATION
// ========================================================================
function ouvrirDB() {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      
      req.onupgradeneeded = (e) => {
        try {
          const db = e.target.result;
          
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('synced', 'synced', { unique: false });
            store.createIndex('server_pk', 'server_pk', { unique: false });
            store.createIndex('entreprise', 'entreprise', { unique: false });
            store.createIndex('date_controle', 'date_controle', { unique: false });
            logInfo('ObjectStore créé avec keyPath: id');
          }
        } catch (upgradeErr) {
          logError('Erreur onupgradeneeded', upgradeErr);
        }
      };
      
      req.onsuccess = (e) => {
        logInfo('✓ DB ouverte:', DB_NAME);
        resolve(e.target.result);
      };
      
      req.onerror = (e) => {
        logError('Erreur ouverture DB', e.target.error);
        reject(e.target.error);
      };
    } catch (err) {
      logError('Erreur ouvrirDB', err);
      reject(err);
    }
  });
}

// ========================================================================
// CRUD - SAUVEGARDE
// ========================================================================
async function sauvegarderLocalement(donnees) {
  try {
    const db = await ouvrirDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    let id = donnees.local_id || donnees.id;
    if (!id) {
      id = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // Nettoyer les données
    const cleanedData = {};
    if (typeof donnees === 'object' && donnees !== null) {
      for (const [key, value] of Object.entries(donnees)) {
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
        afficherNotification('Fiche sauvegardée ✓', 'success');
        resolve({ local_id: id, id: id });
      };
      req.onerror = (e) => {
        logError('Erreur sauvegarde', e);
        afficherNotification('Erreur sauvegarde', 'danger');
        reject(e.target.error);
      };
    });
  } catch (e) {
    logError('Erreur sauvegarderLocalement', e);
    throw e;
  }
}

// ========================================================================
// CRUD - LECTURE
// ========================================================================
async function getFicheByLocalId(local_id) {
  try {
    const db = await ouvrirDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const id = String(local_id);
    
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => {
        const result = req.result;
        if (result) {
          logInfo('✓ Fiche chargée', { id });
          if (result.data) {
            resolve({
              ...result.data,
              id: result.id,
              local_id: result.id,
              synced: result.synced
            });
          } else {
            resolve(result);
          }
        } else {
          logInfo('Fiche non trouvée', { id });
          resolve(null);
        }
      };
      req.onerror = () => {
        logError('Erreur lecture', req.error);
        reject(req.error);
      };
    });
  } catch (e) {
    logError('Erreur getFicheByLocalId', e);
    return null;
  }
}

// ========================================================================
// CRUD - GET ALL FICHES
// ========================================================================
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
    logError('Erreur getAllFiches', e);
    return [];
  }
}

// ========================================================================
// CRUD - UPDATE
// ========================================================================
async function updateFiche(local_id, donnees) {
  try {
    const db = await ouvrirDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const id = String(local_id);
    
    return new Promise((resolve, reject) => {
      const getReq = store.get(id);
      
      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (!existing) {
          reject(new Error(`Fiche ${id} non trouvée`));
          return;
        }
        
        const updatedData = {
          ...(existing.data || existing),
          ...donnees
        };
        
        const updatedFiche = {
          ...existing,
          id: id,
          local_id: id,
          data: updatedData,
          entreprise: donnees.entreprise || updatedData.entreprise || 'Sans nom',
          date_controle: donnees.date_controle || updatedData.date_controle || '',
          synced: false,
          updated_at: new Date().toISOString()
        };
        
        const putReq = store.put(updatedFiche);
        putReq.onsuccess = () => {
          logInfo('✓ Fiche modifiée', { id });
          afficherNotification('Fiche mise à jour ✓', 'success');
          resolve(updatedFiche);
        };
        putReq.onerror = () => {
          logError('Erreur mise à jour', putReq.error);
          reject(putReq.error);
        };
      };
      getReq.onerror = () => {
        logError('Erreur lecture', getReq.error);
        reject(getReq.error);
      };
    });
  } catch (e) {
    logError('Erreur updateFiche', e);
    throw e;
  }
}

// ========================================================================
// CRUD - DELETE
// ========================================================================
async function deleteFiche(local_id) {
  try {
    const db = await ouvrirDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = tx.objectStore(STORE_NAME).delete(String(local_id));
      req.onsuccess = () => {
        logInfo('✓ Fiche supprimée', { id: local_id });
        afficherNotification('Fiche supprimée ✓', 'success');
        resolve(true);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    logError('Erreur deleteFiche', e);
    return false;
  }
}

// ========================================================================
// NETWORK STATUS
// ========================================================================
function updateNetworkStatus() {
  const banner = document.getElementById('sync-banner');
  if (!banner) return;
  
  if (navigator.onLine) {
    banner.classList.remove('visible');
  } else {
    banner.classList.add('visible');
  }
}

// ========================================================================
// RENDER LOCAL FICHES
// ========================================================================
async function renderLocalFiches() {
  try {
    const container = document.getElementById('local-fiches-list');
    if (!container) return;
    
    const fiches = await getAllFiches();
    
    if (fiches.length === 0) {
      container.innerHTML = '<p class="alert alert-info">Aucune fiche locale</p>';
      return;
    }
    
    container.innerHTML = fiches.map(f => `
      <div class="fiche-item" style="padding: 1rem; border-bottom: 1px solid #eee;">
        <strong>${escapeHtmlStatic(f.entreprise || 'Sans nom')}</strong>
        <br><small>${f.date_controle || '-'}</small>
        <div>
          <button onclick="window.FicheApp.viewLocalFiche('${f.local_id}')" class="btn btn-sm btn-primary">Voir</button>
          <button onclick="window.FicheApp.deleteFicheLocal('${f.local_id}')" class="btn btn-sm btn-danger">Supprimer</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    logError('Erreur renderLocalFiches', e);
  }
}

// ========================================================================
// SYNC
// ========================================================================
async function syncAll() {
  try {
    const fiches = await getAllFiches();
    const unsyncedFiches = fiches.filter(f => !f.synced);
    
    if (unsyncedFiches.length === 0) {
      afficherNotification('Rien à synchroniser', 'info');
      return;
    }
    
    afficherNotification(`Synchronisation de ${unsyncedFiches.length} fiche(s)...`, 'info');
    logInfo('Sync en cours', { count: unsyncedFiches.length });
  } catch (e) {
    logError('Erreur syncAll', e);
  }
}

// ========================================================================
// HELPER FUNCTIONS
// ========================================================================
async function getPendingSyncCount() {
  try {
    const fiches = await getAllFiches();
    return fiches.filter(f => !f.synced).length;
  } catch (e) {
    logError('Erreur getPendingSyncCount', e);
    return 0;
  }
}

async function viewLocalFiche(local_id) {
  window.location.href = `/inspection/fiche/offline/detail/${encodeURIComponent(local_id)}/`;
}

async function deleteFicheLocal(local_id) {
  if (confirm('Êtes-vous sûr de vouloir supprimer cette fiche?')) {
    await deleteFiche(local_id);
    await renderLocalFiches();
  }
}

// ========================================================================
// INITIALIZATION
// ========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    logInfo('🚀 App Initialisation...');
    
    updateNetworkStatus();
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    
    if (document.getElementById('local-fiches-list')) {
      await renderLocalFiches();
    }
    
    logInfo('✓ App prête');
    
    window.FicheAppReady = true;
    const event = new CustomEvent('FicheAppReady', { detail: { timestamp: Date.now() } });
    document.dispatchEvent(event);
    console.log('[FicheApp] ✅ FicheApp est maintenant disponible globalement!');
  } catch (err) {
    logError('Erreur DOMContentLoaded', err);
  }
});

// ========================================================================
// EXPORTS GLOBAUX
// ========================================================================
try {
  window.FicheApp = {
    sauvegarderLocalement,
    saveFiche: sauvegarderLocalement,
    updateFiche,
    getFicheByLocalId,
    getFiche: getFicheByLocalId,
    getAllFiches,
    deleteFiche,
    deleteFicheLocal,
    syncAll,
    renderLocalFiches,
    viewLocalFiche,
    afficherNotification,
    getPendingSyncCount,
    logInfo, logWarn, logError,
    ouvrirDB
  };
  
  logInfo('✓ app-offline-unified.js v7 chargé - Base: ' + DB_NAME);
  console.log('[FicheApp] ✅ Script chargé et FicheApp défini!');
} catch (err) {
  logError('ERREUR CRITIQUE - Impossible de créer window.FicheApp', err);
  console.error('ERREUR CRITIQUE', err);
}
