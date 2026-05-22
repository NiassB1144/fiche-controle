// ========================================================================
// FICHE-CONTROLE v5 — app-offline-unified.js
// Gestion IndexedDB, offline, synchronisation UNIFIÉE
// ========================================================================

const LOG_PREFIX = '[FicheApp]';
const DB_NAME = 'ficheControleDB';
const DB_VERSION = 5;
const STORE_NAME = 'fiches_locales';

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
  const bgClass = type === 'success' ? 'bg-success' : type === 'danger' ? 'bg-danger' : type === 'warning' ? 'bg-warning' : 'bg-info';
  toast.className = `toast align-items-center text-white ${bgClass} border-0 show`;
  toast.role = 'alert';
  toast.setAttribute('data-bs-autohide', 'true');
  toast.setAttribute('data-bs-delay', '4000');
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
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
// INDEXEDDB - INITILISATION UNIFIÉE
// ========================================================================
function ouvrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      
      // Créer ou mettre à jour l'objectStore
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'local_id' });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('server_pk', 'server_pk', { unique: false });
        store.createIndex('date_controle', 'date_controle', { unique: false });
        store.createIndex('statut', 'statut', { unique: false });
        logInfo('ObjectStore créé:', STORE_NAME);
      }
    };
    
    req.onsuccess = (e) => {
      logInfo('✓ DB ouverte');
      resolve(e.target.result);
    };
    req.onerror = (e) => {
      logError('Erreur DB', e.target.error);
      reject(e.target.error);
    };
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
    
    // Déterminer le local_id
    let local_id = donnees.local_id;
    if (!local_id) {
      local_id = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    const fiche = { 
      ...donnees, 
      local_id: local_id,
      synced: false,
      saved_at: new Date().toISOString()
    };
    
    return new Promise((resolve, reject) => {
      const req = store.put(fiche);
      req.onsuccess = () => {
        logInfo('✓ Fiche sauvegardée localement', { local_id });
        afficherNotification('Fiche sauvegardée ✓', 'success');
        resolve(local_id);
      };
      req.onerror = (e) => {
        logError('Erreur sauvegarde locale', e);
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
    return new Promise((resolve, reject) => {
      const req = tx.objectStore(STORE_NAME).get(String(local_id));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    logError('Erreur getFicheByLocalId', e);
    return null;
  }
}

async function getAllFiches() {
  try {
    const db = await ouvrirDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    return new Promise((resolve, reject) => {
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    logError('Erreur getAllFiches', e);
    return [];
  }
}

// ========================================================================
// CRUD - SUPPRESSION
// ========================================================================
async function deleteFiche(local_id) {
  try {
    const db = await ouvrirDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = tx.objectStore(STORE_NAME).delete(String(local_id));
      req.onsuccess = () => {
        logInfo('✓ Fiche supprimée', { local_id });
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
// CRUD - MODIFICATION
// ========================================================================
async function updateFiche(local_id, donnees) {
  try {
    const db = await ouvrirDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    return new Promise(async (resolve, reject) => {
      // Récupérer la fiche existante
      const getFicheReq = store.get(String(local_id));
      
      getFicheReq.onsuccess = () => {
        const fiche = getFicheReq.result;
        if (!fiche) {
          logError('Fiche non trouvée', { local_id });
          reject(new Error('Fiche non trouvée'));
          return;
        }
        
        const updatedFiche = {
          ...fiche,
          ...donnees,
          local_id: String(local_id),
          updated_at: new Date().toISOString(),
          synced: false // Réinitialiser le statut sync
        };
        
        const putReq = store.put(updatedFiche);
        putReq.onsuccess = () => {
          logInfo('✓ Fiche modifiée', { local_id });
          afficherNotification('Fiche mise à jour ✓', 'success');
          resolve(updatedFiche);
        };
        putReq.onerror = () => reject(putReq.error);
      };
      
      getFicheReq.onerror = () => reject(getFicheReq.error);
    });
  } catch (e) {
    logError('Erreur updateFiche', e);
    throw e;
  }
}

// ========================================================================
// SYNCHRONISATION
// ========================================================================
async function syncAll() {
  if (!navigator.onLine) {
    logWarn('Hors-ligne, synchronisation annulée');
    return { synced: 0, failed: 0 };
  }
  
  logInfo('🔄 Début synchronisation...');
  const fiches = await getAllFiches();
  const pending = fiches.filter(f => !f.synced);
  
  if (pending.length === 0) {
    logInfo('Aucune fiche à synchroniser');
    return { synced: 0, failed: 0 };
  }
  
  let synced = 0;
  let failed = 0;
  
  for (const fiche of pending) {
    try {
      const csrfToken = getCsrfToken();
      const url = fiche.server_pk ? `/api/fiche/${fiche.server_pk}/modifier/` : '/api/fiche/creer/';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'X-CSRFToken': csrfToken 
        },
        body: JSON.stringify(fiche)
      });
      
      if (response.ok) {
        const data = await response.json();
        const db = await ouvrirDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const updatedFiche = { 
          ...fiche, 
          synced: true, 
          server_pk: data.id, 
          synced_at: new Date().toISOString() 
        };
        store.put(updatedFiche);
        synced++;
        logInfo(`✓ Fiche synchronisée: ${fiche.entreprise}`);
      } else {
        failed++;
        logError(`✗ Échec synchronisation: ${fiche.entreprise}`);
      }
    } catch (e) {
      failed++;
      logError(`✗ Erreur réseau pour ${fiche.entreprise}`, e);
    }
  }
  
  afficherNotification(`${synced} sync✓, ${failed} échec(s)`, synced > 0 ? 'success' : 'warning');
  logInfo(`Synchronisation: ${synced} OK, ${failed} KO`);
  
  if (typeof window.updateSyncBanner === 'function') {
    await window.updateSyncBanner();
  }
  
  return { synced, failed };
}

// ========================================================================
// UTILITAIRES
// ========================================================================
function getCsrfToken() {
  const cookie = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
  if (cookie) return cookie.split('=')[1];
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute('content') : '';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========================================================================
// STATUT RÉSEAU
// ========================================================================
function updateNetworkStatus() {
  const statusBadge = document.getElementById('statut-connexion');
  if (!statusBadge) return;
  
  if (navigator.onLine) {
    statusBadge.innerHTML = '<i class="bi bi-wifi"></i> <span>En ligne</span>';
    statusBadge.classList.remove('offline');
  } else {
    statusBadge.innerHTML = '<i class="bi bi-wifi-off"></i> <span>Hors-ligne</span>';
    statusBadge.classList.add('offline');
  }
}

// ========================================================================
// COLLECTE DONNÉES FORMULAIRE
// ========================================================================
function collecterDonnees(statut) {
  const form = document.getElementById('form-fiche');
  if (!form) {
    logError('Formulaire non trouvé');
    return {};
  }
  
  const data = { statut: statut };
  
  form.querySelectorAll('input[name], select[name], textarea[name]').forEach(el => {
    if (el.type === 'checkbox') {
      data[el.name] = el.checked ? 'on' : '';
    } else if (el.type === 'radio') {
      if (el.checked) data[el.name] = el.value;
    } else {
      const value = el.value;
      if (value !== undefined && value !== null) {
        data[el.name] = value;
      }
    }
  });
  
  return data;
}

// ========================================================================
// RENDU FICHES LOCALES - LISTE
// ========================================================================
async function renderLocalFiches() {
  const container = document.getElementById('local-fiches-list');
  const section = document.getElementById('local-fiches-section');
  
  if (!container) return;
  
  try {
    const fiches = await getAllFiches();
    const pending = fiches.filter(f => !f.synced);
    
    if (pending.length === 0) {
      if (section) section.style.display = 'none';
      return;
    }
    
    if (section) section.style.display = 'block';
    
    container.innerHTML = pending.map(fiche => `
      <div class="fiche-card local-card p-3 mb-3" data-local-id="${fiche.local_id}">
        <div class="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div class="flex-grow-1">
            <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
              <h6 class="fw-bold mb-0">
                <i class="bi bi-building me-1 text-secondary"></i>
                ${escapeHtml(fiche.entreprise || 'Sans nom')}
              </h6>
              <span class="badge bg-secondary">
                <i class="bi bi-cloud-offline"></i> Hors-ligne
              </span>
              <span class="badge ${fiche.statut === 'soumis' ? 'bg-success' : 'bg-warning'}">
                ${fiche.statut === 'soumis' ? '<i class="bi bi-check-lg"></i> Soumis' : '<i class="bi bi-pencil"></i> Brouillon'}
              </span>
            </div>
            <div class="small text-muted d-flex flex-wrap gap-2">
              <span><i class="bi bi-geo-alt"></i> ${escapeHtml(fiche.lieu || '-')}</span>
              <span><i class="bi bi-calendar"></i> ${fiche.date_controle || '-'}</span>
            </div>
          </div>
          <div class="d-flex gap-2 flex-wrap justify-content-end">
            <a href="/fiches/creer/?local_id=${fiche.local_id}" class="btn btn-sm btn-outline-primary">
              <i class="bi bi-pencil"></i> Modifier
            </a>
            <button onclick="deleteFicheLocal('${fiche.local_id}')" class="btn btn-sm btn-outline-danger">
              <i class="bi bi-trash3"></i> Supprimer
            </button>
            <a href="javascript:viewLocalFiche('${fiche.local_id}')" class="btn btn-sm btn-outline-info">
              <i class="bi bi-eye"></i> Voir
            </a>
          </div>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    logError('Erreur renderLocalFiches', error);
  }
}

async function viewLocalFiche(local_id) {
  const fiche = await getFicheByLocalId(local_id);
  if (!fiche) {
    afficherNotification('Fiche non trouvée', 'danger');
    return;
  }
  
  // Afficher les détails (modal ou redirection)
  const details = Object.entries(fiche)
    .filter(([k]) => !['local_id', 'synced', 'server_pk', 'saved_at', 'updated_at', 'synced_at'].includes(k))
    .map(([k, v]) => `<dt>${k}</dt><dd>${escapeHtml(String(v))}</dd>`)
    .join('');
  
  alert(`📋 Détails Fiche:\n\n${Object.entries(fiche).filter(([k]) => !k.startsWith('_')).map(([k,v]) => `${k}: ${v}`).join('\n')}`);
}

async function deleteFicheLocal(local_id) {
  if (!confirm('Supprimer définitivement cette fiche locale ?')) return;
  await deleteFiche(local_id);
  await renderLocalFiches();
  afficherNotification('Fiche supprimée ✓', 'success');
}

// ========================================================================
// SOUMISSION FORMULAIRE
// ========================================================================
async function soumettreFormulaire(statut) {
  const entreprise = document.querySelector('[name="entreprise"]')?.value?.trim();
  const date_controle = document.querySelector('[name="date_controle"]')?.value?.trim();
  
  if (!entreprise || !date_controle) {
    afficherNotification('⚠️ Remplissez entreprise et date', 'warning');
    return;
  }
  
  const donnees = collecterDonnees(statut);
  
  // Vérifier si on édite une fiche locale
  const urlParams = new URLSearchParams(window.location.search);
  let editingLocalId = urlParams.get('local_id');
  let editingPk = window.editingPk || null;
  
  if (editingLocalId) {
    donnees.local_id = String(editingLocalId);
    const ficheLocale = await getFicheByLocalId(editingLocalId);
    if (ficheLocale?.server_pk) {
      editingPk = ficheLocale.server_pk;
    }
  }
  
  if (editingPk) donnees.server_pk = editingPk;
  
  // HORS-LIGNE: toujours sauvegarder localement
  if (!navigator.onLine) {
    try {
      if (editingLocalId) {
        await updateFiche(editingLocalId, donnees);
      } else {
        await sauvegarderLocalement(donnees);
      }
      afficherNotification('📱 Hors-ligne - Sauvegardé localement', 'success');
      setTimeout(() => { window.location.href = '/fiches/'; }, 1000);
    } catch (e) {
      afficherNotification('❌ Erreur sauvegarde', 'danger');
    }
    return;
  }
  
  // EN LIGNE: essayer l'API
  try {
    const csrfToken = getCsrfToken();
    const url = editingPk ? `/api/fiche/${editingPk}/modifier/` : '/api/fiche/creer/';
    
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'X-CSRFToken': csrfToken 
      },
      body: JSON.stringify(donnees)
    });
    
    if (resp.ok) {
      const data = await resp.json();
      if (editingLocalId) {
        await deleteFiche(editingLocalId);
      }
      afficherNotification('✅ Fiche enregistrée !', 'success');
      setTimeout(() => { window.location.href = `/fiches/${data.id}/`; }, 1500);
    } else {
      throw new Error('Erreur serveur');
    }
  } catch (e) {
    logError('Erreur réseau', e);
    // Fallback: sauvegarder localement
    try {
      if (editingLocalId) {
        await updateFiche(editingLocalId, donnees);
      } else {
        await sauvegarderLocalement(donnees);
      }
      afficherNotification('🌐 En-ligne échoué - Sauvegardé localement', 'warning');
      setTimeout(() => { window.location.href = '/fiches/'; }, 1000);
    } catch (e2) {
      afficherNotification('❌ Erreur', 'danger');
    }
  }
}

// ========================================================================
// INITIALISATION
// ========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  logInfo('🚀 App v5 - Offline Unified - Initialisation...');
  
  // Statut réseau
  updateNetworkStatus();
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  
  // Charger une fiche locale si présente
  const params = new URLSearchParams(window.location.search);
  const local_id = params.get('local_id');
  if (local_id) {
    const fiche = await getFicheByLocalId(local_id);
    if (fiche) {
      for (const [name, value] of Object.entries(fiche)) {
        const el = document.querySelector(`[name="${name}"]`);
        if (el) {
          if (el.type === 'checkbox') {
            el.checked = value === 'on';
          } else if (el.type === 'select-multiple') {
            Array.from(el.options).forEach(opt => opt.selected = (value || '').includes(opt.value));
          } else {
            el.value = value || '';
          }
        }
      }
      afficherNotification('📋 Fiche chargée depuis cache', 'info');
    }
  }
  
  // Rendre fiches locales sur page liste
  if (document.getElementById('local-fiches-list')) {
    await renderLocalFiches();
  }
  
  logInfo('✓ App prête');
});

// ========================================================================
// EXPORTS GLOBAUX
// ========================================================================
window.FicheApp = {
  sauvegarderLocalement,
  updateFiche,
  getFicheByLocalId,
  getAllFiches,
  deleteFiche,
  syncAll,
  soumettreFormulaire,
  collecterDonnees,
  renderLocalFiches,
  deleteFicheLocal,
  viewLocalFiche,
  afficherNotification,
  logInfo, logWarn, logError
};

logInfo('✓ app-offline-unified.js chargé');
