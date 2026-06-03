// ========================================================================
// FICHE-CONTROLE v5 — app.js (complet avec offline/online + synchronisation)
// VERSION UNIFIÉE CORRIGÉE
// ========================================================================

const LOG_PREFIX = '[FicheApp]';
const DB_NAME = 'ficheControleDB';
const DB_VERSION = 5;  // Version incrémentée pour éviter les conflits
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
// INDEXEDDB
// ========================================================================
function ouvrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'local_id' });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('server_pk', 'server_pk', { unique: false });
        store.createIndex('date_controle', 'date_controle', { unique: false });
        store.createIndex('entreprise', 'entreprise', { unique: false });
        logInfo('ObjectStore créé:', STORE);
      }
      
      // Créer la queue de synchronisation si elle n'existe pas
      if (!db.objectStoreNames.contains('sync_queue')) {
        const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        queueStore.createIndex('status', 'status', { unique: false });
        queueStore.createIndex('action', 'action', { unique: false });
        logInfo('Queue store créé: sync_queue');
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
    if (!donnees.entreprise || !donnees.entreprise.trim()) {
      afficherNotification('Le nom de l\'entreprise est requis', 'warning');
      return null;
    }
    if (!donnees.date_controle) {
      afficherNotification('La date de contrôle est requise', 'warning');
      return null;
    }

    const db = await ouvrirDB();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    
    // Utiliser l'ID existant ou en créer un nouveau
    let local_id = donnees.local_id;
    if (!local_id) {
      local_id = Date.now();
    } else {
      local_id = parseInt(local_id);
    }
    
    const fiche = { 
      ...donnees, 
      local_id: local_id, 
      synced: false,
      server_pk: donnees.server_pk || null,
      saved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    logInfo('[sauvegarderLocalement] Sauvegarde en cours...', { local_id });
    
    return new Promise((resolve, reject) => {
      const req = store.put(fiche);
      
      req.onsuccess = () => {
        logInfo('[sauvegarderLocalement] ✓ Succès', { local_id });
        afficherNotification('Fiche sauvegardée localement ✓', 'success');
        resolve(local_id);
      };
      
      req.onerror = () => {
        logError('[sauvegarderLocalement] ✗ Erreur IndexedDB', req.error);
        reject(req.error);
      };
    });
  } catch (err) {
    logError('[sauvegarderLocalement] Exception', err);
    afficherNotification('❌ Erreur: ' + err.message, 'danger');
    return null;
  }
}

// ========================================================================
// CRUD - LECTURE
// ========================================================================
async function getFicheByLocalId(local_id) {
  if (local_id === undefined || local_id === null) {
    logError('getFicheByLocalId: local_id invalide', local_id);
    return null;
  }
  try {
    const db = await ouvrirDB();
    const tx = db.transaction(STORE, 'readonly');
    return new Promise((resolve, reject) => {
      const id = parseInt(local_id);
      if (isNaN(id)) {
        logError('getFicheByLocalId: NaN après parseInt', local_id);
        resolve(null);
        return;
      }
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => {
        resolve(req.result || null);
      };
      req.onerror = () => {
        logError('getFicheByLocalId: erreur indexeddb', req.error);
        resolve(null);
      };
    });
  } catch (err) {
    logError('getFicheByLocalId: exception', err);
    return null;
  }
}

async function getAllFiches() {
  try {
    const db = await ouvrirDB();
    const tx = db.transaction(STORE, 'readonly');
    return new Promise((resolve, reject) => {
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        const fiches = req.result || [];
        const validFiches = fiches.filter(f => f && f.local_id);
        resolve(validFiches);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    logError('getAllFiches: exception', err);
    return [];
  }
}

// ========================================================================
// CRUD - SUPPRESSION
// ========================================================================
async function deleteFiche(local_id) {
  try {
    const db = await ouvrirDB();
    const tx = db.transaction(STORE, 'readwrite');
    return new Promise((resolve, reject) => {
      const id = parseInt(local_id);
      const req = tx.objectStore(STORE).delete(id);
      req.onsuccess = () => {
        logInfo('✓ Fiche supprimée', { local_id: id });
        afficherNotification('Fiche supprimée ✓', 'success');
        resolve(true);
      };
      req.onerror = () => {
        logError('Erreur suppression', req.error);
        reject(req.error);
      };
    });
  } catch (err) {
    logError('deleteFiche: exception', err);
    return false;
  }
}

async function deleteFicheLocal(local_id) {
  return deleteFiche(local_id);
}

// ========================================================================
// CRUD - MODIFICATION
// ========================================================================
async function updateFiche(local_id, donnees) {
  try {
    const existing = await getFicheByLocalId(local_id);
    if (!existing) {
      throw new Error('Fiche non trouvée');
    }
    
    const updatedFiche = {
      ...existing,
      ...donnees,
      local_id: parseInt(local_id),
      synced: false,
      updated_at: new Date().toISOString()
    };
    
    const db = await ouvrirDB();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    
    return new Promise((resolve, reject) => {
      const req = store.put(updatedFiche);
      req.onsuccess = () => {
        logInfo('✓ Fiche modifiée', { local_id });
        afficherNotification('Fiche mise à jour ✓', 'success');
        resolve(updatedFiche);
      };
      req.onerror = () => {
        logError('Erreur mise à jour', req.error);
        reject(req.error);
      };
    });
  } catch (err) {
    logError('updateFiche: exception', err);
    throw err;
  }
}

// ========================================================================
// SYNCHRONISATION
// ========================================================================
async function syncAll() {
  if (!navigator.onLine) {
    logWarn('Hors-ligne, synchronisation annulée');
    afficherNotification('Hors-ligne - Synchronisation automatique au retour de la connexion', 'warning');
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
      let url, method;
      
      if (fiche.server_pk) {
        url = `/api/fiche/${fiche.server_pk}/modifier/`;
        method = 'POST';
      } else {
        url = '/api/fiche/creer/';
        method = 'POST';
      }
      
      const response = await fetch(url, {
        method: method,
        headers: { 
          'Content-Type': 'application/json', 
          'X-CSRFToken': csrfToken 
        },
        body: JSON.stringify(fiche)
      });
      
      if (response.ok) {
        const data = await response.json();
        const db = await ouvrirDB();
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const updatedFiche = { 
          ...fiche, 
          synced: true, 
          server_pk: data.id || fiche.server_pk, 
          synced_at: new Date().toISOString() 
        };
        store.put(updatedFiche);
        synced++;
        logInfo(`✓ Fiche synchronisée: ${fiche.entreprise}`);
      } else {
        failed++;
        logError(`✗ Échec synchronisation: ${fiche.entreprise}`, response.status);
      }
    } catch (e) {
      failed++;
      logError(`✗ Erreur réseau pour ${fiche.entreprise}`, e);
    }
  }
  
  if (synced > 0) {
    afficherNotification(`${synced} fiche(s) synchronisée(s)`, 'success');
  }
  if (failed > 0) {
    afficherNotification(`${failed} échec(s) de synchronisation`, 'warning');
  }
  
  logInfo(`Synchronisation terminée: ${synced} OK, ${failed} KO`);
  
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
    logError('Formulaire non trouvé pour collecterDonnees');
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
  const localCountSpan = document.getElementById('local-count');
  const localCountHeader = document.getElementById('local-count-header');
  
  if (!container) {
    return;
  }
  
  try {
    const fiches = await getAllFiches();
    const pending = fiches.filter(f => !f.synced);
    
    if (pending.length === 0) {
      if (section) section.style.display = 'none';
      return;
    }
    
    if (section) section.style.display = 'block';
    if (localCountSpan) localCountSpan.textContent = pending.length;
    if (localCountHeader) localCountHeader.textContent = pending.length;
    
    const urlParams = new URLSearchParams(window.location.search);
    const statutFiltre = urlParams.get('statut');
    
    let filtered = pending;
    if (statutFiltre) {
      filtered = pending.filter(f => f.statut === statutFiltre);
    }
    
    if (filtered.length === 0) {
      container.innerHTML = `<div class="text-center text-muted py-3">Aucune fiche ${statutFiltre} en attente</div>`;
      return;
    }
    
    container.innerHTML = filtered.map(fiche => `
      <div class="fiche-card local-card p-3 mb-3" data-local-id="${fiche.local_id}">
        <div class="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div class="flex-grow-1">
            <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
              <h6 class="fw-bold mb-0">
                <i class="bi bi-building me-1 text-secondary"></i>
                ${escapeHtml(fiche.entreprise || 'Sans nom')}
              </h6>
              <span class="badge bg-secondary">
                <i class="bi bi-hdd"></i> Hors-ligne
              </span>
              <span class="badge ${fiche.statut === 'soumis' ? 'bg-success' : 'bg-warning'}">
                ${fiche.statut === 'soumis' ? '<i class="bi bi-check-lg"></i> Soumis' : '<i class="bi bi-pencil"></i> Brouillon'}
              </span>
            </div>
            <div class="small text-muted d-flex flex-wrap gap-2">
              <span><i class="bi bi-geo-alt"></i> ${escapeHtml(fiche.lieu || '-')}</span>
              <span><i class="bi bi-calendar"></i> ${fiche.date_controle || '-'}</span>
            </div>
            <div class="small text-warning mt-1">
              <i class="bi bi-cloud-arrow-up"></i> En attente de synchronisation
            </div>
          </div>
          <div class="d-flex gap-2">
            <a href="/inspection/fiche/local/${fiche.local_id}/edit/" class="btn btn-sm btn-outline-primary" title="Modifier">
              <i class="bi bi-pencil"></i>
            </a>
            <button class="btn btn-sm btn-outline-danger btn-delete-local" data-local-id="${fiche.local_id}" title="Supprimer">
              <i class="bi bi-trash3"></i>
            </button>
            <a href="/inspection/fiche/local/${fiche.local_id}/detail/" class="btn btn-sm btn-outline-info" title="Voir détails">
              <i class="bi bi-eye"></i>
            </a>
          </div>
        </div>
      </div>
    `).join('');
    
    // Gestion des boutons de suppression
    container.querySelectorAll('.btn-delete-local').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const lid = btn.getAttribute('data-local-id');
        if (confirm('Supprimer définitivement cette fiche ?')) {
          await deleteFiche(lid);
          await renderLocalFiches();
          afficherNotification('Fiche supprimée', 'success');
        }
      });
    });
    
  } catch (error) {
    logError('Erreur renderLocalFiches', error);
  }
}

// ========================================================================
// SOUMISSION FORMULAIRE
// ========================================================================
async function soumettreFormulaire(statut) {
  const entreprise = document.querySelector('[name="entreprise"]')?.value?.trim();
  const date_controle = document.querySelector('[name="date_controle"]')?.value?.trim();
  
  if (!entreprise || !date_controle) {
    afficherNotification('Veuillez remplir le nom de l\'entreprise et la date du contrôle.', 'warning');
    return;
  }
  
  const donnees = collecterDonnees(statut);
  
  let editingLocalId = null;
  let editingPk = null;
  
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('local_id')) {
    editingLocalId = parseInt(urlParams.get('local_id'));
    const ficheLocale = await getFicheByLocalId(editingLocalId);
    if (ficheLocale && ficheLocale.server_pk) {
      editingPk = ficheLocale.server_pk;
    }
  } else if (typeof window.editingPk !== 'undefined' && window.editingPk) {
    editingPk = window.editingPk;
  }
  
  if (editingLocalId) donnees.local_id = editingLocalId;
  if (editingPk) donnees.server_pk = editingPk;
  
  // ===== MODE HORS-LIGNE =====
  if (!navigator.onLine) {
    logInfo('🔴 Mode OFFLINE détecté');
    try {
      afficherNotification('⏳ Sauvegarde hors-ligne en cours...', 'info');
      
      let local_id;
      if (editingLocalId) {
        await updateFiche(editingLocalId, donnees);
        local_id = editingLocalId;
        logInfo('✅ Fiche mise à jour localement', { local_id });
        afficherNotification('✅ Fiche mise à jour localement', 'success');
      } else {
        local_id = await sauvegarderLocalement(donnees);
        logInfo('✅ Nouvelle fiche sauvegardée localement', { local_id });
      }
      
      if (!local_id) {
        throw new Error('Erreur lors de la sauvegarde');
      }
      
      setTimeout(() => {
        window.location.href = `/inspection/fiche/local/${local_id}/detail/`;
      }, 1000);
      return;
    } catch (error) {
      logError('💥 Erreur offline:', error);
      afficherNotification('❌ Erreur: ' + error.message, 'danger');
      return;
    }
  }
  
  // ===== MODE EN LIGNE =====
  logInfo('🟢 Mode ONLINE détecté');
  const csrfToken = getCsrfToken();
  const url = editingPk ? `/api/fiche/${editingPk}/modifier/` : '/api/fiche/creer/';
  
  try {
    afficherNotification('⏳ Enregistrement en cours...', 'info');
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
      body: JSON.stringify(donnees)
    });
    
    if (resp.ok) {
      const data = await resp.json();
      if (editingLocalId) {
        await deleteFiche(editingLocalId);
      }
      afficherNotification('✅ Fiche enregistrée avec succès !', 'success');
      setTimeout(() => { 
        window.location.href = `/inspection/fiche/${data.id}/detail/`; 
      }, 1500);
    } else {
      const err = await resp.json();
      afficherNotification(`❌ Erreur serveur: ${err.error || 'Problème inconnu'}`, 'danger');
      logError('Erreur serveur:', err);
      
      // Fallback: sauvegarde locale
      try {
        let local_id;
        if (editingLocalId) {
          await updateFiche(editingLocalId, donnees);
          local_id = editingLocalId;
        } else {
          local_id = await sauvegarderLocalement(donnees);
        }
        if (local_id) {
          afficherNotification('💾 Sauvegarde locale effectuée', 'warning');
          setTimeout(() => { 
            window.location.href = `/inspection/fiche/local/${local_id}/detail/`; 
          }, 1500);
        }
      } catch (e) {
        logError('Erreur fallback:', e);
      }
    }
  } catch (e) {
    logError('❌ Erreur réseau:', e);
    afficherNotification('❌ Erreur réseau. Tentative de sauvegarde locale...', 'warning');
    
    try {
      let local_id;
      if (editingLocalId) {
        await updateFiche(editingLocalId, donnees);
        local_id = editingLocalId;
      } else {
        local_id = await sauvegarderLocalement(donnees);
      }
      if (local_id) {
        afficherNotification('💾 Fiche sauvegardée localement', 'warning');
        setTimeout(() => { 
          window.location.href = `/inspection/fiche/local/${local_id}/detail/`; 
        }, 800);
      }
    } catch (err) {
      logError('Erreur sauvegarde locale:', err);
      afficherNotification('❌ Impossible de sauvegarder', 'danger');
    }
  }
}

// ========================================================================
// NOMBRE DE FICHES EN ATTENTE
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

// ========================================================================
// INITIALISATION
// ========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  logInfo('🚀 Initialisation application v5...');
  
  updateNetworkStatus();
  window.addEventListener('online', () => {
    updateNetworkStatus();
    syncAll();
  });
  window.addEventListener('offline', updateNetworkStatus);
  
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
            el.value = value || '';
          }
        }
      }
      window.editingLocalId = parseInt(local_id);
      afficherNotification('Fiche locale chargée', 'info');
    }
  }
  
  if (document.getElementById('local-fiches-list')) {
    await renderLocalFiches();
  }
  
  logInfo('✓ Application prête');
});

// ========================================================================
// EXPORTS GLOBAUX
// ========================================================================
window.FicheApp = {
  sauvegarderLocalement,
  saveFiche: sauvegarderLocalement,
  getFiche: getFicheByLocalId,
  getFicheByLocalId,
  updateFiche,
  getAllFiches,
  deleteFiche,
  deleteFicheLocal,
  getPendingSyncCount,
  syncAll,
  soumettreFormulaire,
  collecterDonnees,
  renderLocalFiches,
  afficherNotification,
  logInfo, logWarn, logError
};

window.sauvegarderLocalement = sauvegarderLocalement;
window.getFicheByLocalId = getFicheByLocalId;
window.syncAll = syncAll;
window.deleteLocalFiche = deleteFiche;

logInfo('✓ app.js v5 chargé');