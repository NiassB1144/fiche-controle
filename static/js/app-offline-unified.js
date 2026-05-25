// ========================================================================
// FICHE-CONTROLE v5 — app-offline-unified.js
// Gestion IndexedDB, offline, synchronisation UNIFIÉE
// ========================================================================

const LOG_PREFIX = '[FicheApp]';
const DB_NAME = 'ficheControleDB';
const DB_VERSION = 5;
const STORE_NAME = 'fiches_locales';

// Flag de ready pour signaler quand l'app est complètement chargée
window.FicheAppReady = false;

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
      // Toujours convertir en string pour correspondre au keyPath
      const id = String(local_id);
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => {
        logInfo('✓ Fiche chargée', { local_id: id });
        resolve(req.result);
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
      // Toujours convertir en string pour correspondre au keyPath
      const id = String(local_id);
      const req = tx.objectStore(STORE_NAME).delete(id);
      
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
    
    // Convertir en string pour correspondre au keyPath
    const id = String(local_id);
    
    return new Promise((resolve, reject) => {
      const getFicheReq = store.get(id);
      
      getFicheReq.onsuccess = () => {
        const fiche = getFicheReq.result;
        if (!fiche) {
          logError('Fiche non trouvée', { local_id: id });
          reject(new Error(`Fiche ${id} non trouvée`));
          return;
        }
        
        const updatedFiche = {
          ...fiche,
          ...donnees,
          local_id: id,
          updated_at: new Date().toISOString(),
          synced: false
        };
        
        const putReq = store.put(updatedFiche);
        
        putReq.onsuccess = () => {
          logInfo('✓ Fiche modifiée', { local_id: id });
          afficherNotification('Fiche mise à jour ✓', 'success');
          resolve(updatedFiche);
        };
        
        putReq.onerror = () => {
          logError('Erreur mise à jour', putReq.error);
          reject(putReq.error);
        };
      };
      
      getFicheReq.onerror = () => {
        logError('Erreur lecture', getFicheReq.error);
        reject(getFicheReq.error);
      };
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
  
  if (synced > 0 || failed > 0) {
    afficherNotification(`${synced} sync✓, ${failed} échec(s)`, synced > 0 ? 'success' : 'warning');
  }
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
              <span class="badge bg-success">
                <i class="bi bi-check-lg"></i> Soumis
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
            <button class="btn btn-sm btn-outline-danger btn-delete-local" data-local-id="${fiche.local_id}">
              <i class="bi bi-trash3"></i> Supprimer
            </button>
            <button class="btn btn-sm btn-outline-info btn-view-local" data-local-id="${fiche.local_id}">
              <i class="bi bi-eye"></i> Voir
            </button>
          </div>
        </div>
      </div>
    `).join('');
    
    // Event delegation pour les boutons offline
    container.addEventListener('click', async (e) => {
      const deleteBtn = e.target.closest('.btn-delete-local');
      const viewBtn = e.target.closest('.btn-view-local');
      
      if (deleteBtn) {
        const lid = deleteBtn.getAttribute('data-local-id');
        logInfo('🗑️ Suppression demandée', { local_id: lid });
        if (confirm('Supprimer définitivement cette fiche ?')) {
          await window.FicheApp.deleteFicheLocal(lid);
          await renderLocalFiches(); // Rafraîchir la liste
        }
      } else if (viewBtn) {
        const lid = viewBtn.getAttribute('data-local-id');
        logInfo('👁️ Consultation demandée', { local_id: lid });
        await window.FicheApp.viewLocalFiche(lid);
      }
    });
    
  } catch (error) {
    logError('Erreur renderLocalFiches', error);
  }
}

async function editFicheLocal(local_id) {
  logInfo('✏️ Édition demandée', { local_id });
  // Vérifier que la fiche existe
  const fiche = await getFicheByLocalId(local_id);
  if (!fiche) {
    afficherNotification('Fiche non trouvée', 'danger');
    return;
  }
  // Redirection vers le formulaire avec le local_id
  window.location.href = `/fiches/creer/?local_id=${encodeURIComponent(local_id)}`;
}

async function viewLocalFiche(local_id) {
  try {
    logInfo('📋 Chargement détails', { local_id });
    const fiche = await getFicheByLocalId(local_id);
    if (!fiche) {
      afficherNotification('Fiche non trouvée', 'danger');
      logError('Fiche non trouvée', { local_id });
      return;
    }
    
    logInfo('✓ Fiche chargée pour affichage', { entreprise: fiche.entreprise });
    
    // Créer une modale pour afficher les détails
    let modal = document.getElementById('fiche-detail-modal');
    if (modal) modal.remove(); // Supprimer ancienne modale
    
    modal = document.createElement('div');
    modal.id = 'fiche-detail-modal';
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); display: flex; align-items: center;
      justify-content: center; z-index: 9999;
    `;
    
    const details = Object.entries(fiche)
      .filter(([k]) => !['local_id', 'synced', 'server_pk', 'saved_at', 'updated_at', 'synced_at', 'statut'].includes(k))
      .map(([k, v]) => {
        const val = String(v || '-');
        return `<tr><td class="fw-bold" style="padding: 8px; border-bottom: 1px solid #eee;">${k}</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(val)}</td></tr>`;
      })
      .join('');
    
    modal.innerHTML = `
      <div style="background: white; border-radius: 12px; padding: 2rem; max-width: 95%; max-height: 85vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h5 class="fw-bold" style="margin: 0;">📋 ${escapeHtml(fiche.entreprise || 'Détails Fiche')}</h5>
          <button style="background: none; border: none; font-size: 1.5rem; cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">×</button>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tbody>${details}</tbody>
        </table>
        <div style="margin-top: 1.5rem; display: flex; gap: 0.5rem; justify-content: flex-end;">
          <button class="btn btn-secondary btn-sm">Fermer</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    // Fermer en cliquant le X
    const closeBtn = modal.querySelector('button');
    closeBtn.addEventListener('click', () => {
      logInfo('Fermeture modale');
      modal.remove();
    });
    
    // Fermer en cliquant dehors
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        logInfo('Fermeture modale (clic dehors)');
        modal.remove();
      }
    });
    
    afficherNotification('Détails chargés ✓', 'info');
  } catch (e) {
    logError('Erreur viewLocalFiche', e);
    afficherNotification('Erreur lors du chargement', 'danger');
  }
}

async function deleteFicheLocal(local_id) {
  try {
    logInfo('🗑️ Suppression en cours', { local_id });
    await deleteFiche(local_id);
    afficherNotification('Fiche supprimée ✓', 'success');
    logInfo('✓ Fiche locale supprimée:', { local_id });
  } catch (e) {
    logError('Erreur suppression locale', e);
    afficherNotification('Erreur lors de la suppression', 'danger');
  }
}

async function deleteFicheServer(server_pk) {
  try {
    const csrfToken = getCsrfToken();
    const response = await fetch(`/api/fiche/${server_pk}/supprimer/`, {
      method: 'DELETE',
      headers: { 'X-CSRFToken': csrfToken }
    });
    
    if (response.ok) {
      afficherNotification('Fiche supprimée ✓', 'success');
      logInfo('✓ Fiche supprimée:', { server_pk });
      // Attendre 1s avant de rediriger
      setTimeout(() => { window.location.href = '/fiches/'; }, 1000);
    } else {
      const data = await response.json();
      logError('✗ Suppression échouée:', data);
      afficherNotification('Erreur: ' + (data.error || 'Suppression échouée'), 'danger');
    }
  } catch (e) {
    logError('Erreur delete API', e);
    afficherNotification('Erreur réseau: ' + e.message, 'danger');
  }
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
  
  // Déterminer si on édite une fiche locale ou serveur
  const urlParams = new URLSearchParams(window.location.search);
  let editingLocalId = window.editingLocalId || urlParams.get('local_id');
  let editingPk = window.editingPk || null;
  
  // Si on édite une fiche locale, vérifier si elle a un server_pk
  if (editingLocalId) {
    const ficheLocale = await getFicheByLocalId(editingLocalId);
    if (ficheLocale) {
      donnees.local_id = String(editingLocalId);
      if (ficheLocale.server_pk) {
        editingPk = ficheLocale.server_pk;
      }
    }
  }
  
  if (editingPk) {
    donnees.server_pk = editingPk;
  }
  
  // HORS-LIGNE: toujours sauvegarder localement
  if (!navigator.onLine) {
    try {
      if (editingLocalId) {
        await updateFiche(editingLocalId, donnees);
        logInfo('✓ Fiche locale mise à jour', { local_id: editingLocalId });
      } else {
        const newLocalId = await sauvegarderLocalement(donnees);
        logInfo('✓ Nouvelle fiche sauvegardée', { local_id: newLocalId });
      }
      afficherNotification('📱 Hors-ligne - Sauvegardé localement', 'success');
      setTimeout(() => { window.location.href = '/fiches/'; }, 1500);
    } catch (e) {
      logError('Erreur sauvegarde hors-ligne', e);
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
      logInfo('✓ API Response:', data);
      
      // Supprimer la fiche locale si elle existait
      if (editingLocalId) {
        await deleteFiche(editingLocalId);
        logInfo('✓ Fiche locale supprimée après sync', { local_id: editingLocalId });
      }
      
      afficherNotification('✅ Fiche enregistrée !', 'success');
      setTimeout(() => { window.location.href = '/fiches/'; }, 1500);
    } else {
      throw new Error(`Erreur serveur: ${resp.status}`);
    }
  } catch (e) {
    logError('Erreur API, fallback local', e);
    // Fallback: sauvegarder localement
    try {
      if (editingLocalId) {
        await updateFiche(editingLocalId, donnees);
        logInfo('✓ Fiche mise à jour localement (fallback)', { local_id: editingLocalId });
      } else {
        const newLocalId = await sauvegarderLocalement(donnees);
        logInfo('✓ Fiche sauvegardée localement (fallback)', { local_id: newLocalId });
      }
      afficherNotification('🌐 En-ligne échoué - Sauvegardé localement', 'warning');
      setTimeout(() => { window.location.href = '/fiches/'; }, 1500);
    } catch (e2) {
      logError('Erreur fallback', e2);
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
      logInfo('🔄 Chargement fiche depuis cache', { local_id, entreprise: fiche.entreprise });
      
      for (const [name, value] of Object.entries(fiche)) {
        const el = document.querySelector(`[name="${name}"]`);
        if (!el) continue;
        
        if (el.type === 'checkbox') {
          // Les checkboxes sont stockées comme 'on' ou ''
          el.checked = value === 'on' || value === true;
        } else if (el.type === 'radio') {
          if (el.value === value) el.checked = true;
        } else if (el.multiple) {
          // Pour select multiple
          Array.from(el.options).forEach(opt => {
            opt.selected = (Array.isArray(value) ? value : [value]).includes(opt.value);
          });
        } else {
          // Text, textarea, etc.
          el.value = (value !== null && value !== undefined) ? value : '';
        }
      }
      afficherNotification('📋 Fiche chargée depuis cache', 'info');
      
      // Sauvegarder le local_id global pour la soumission
      window.editingLocalId = local_id;
    }
  }
  
  // Rendre fiches locales sur page liste
  if (document.getElementById('local-fiches-list')) {
    await renderLocalFiches();
  }
  
  logInfo('✓ App prête');
  
  // Signal que l'app est complètement prête avec un événement custom
  window.FicheAppReady = true;
  const event = new CustomEvent('FicheAppReady', { detail: { timestamp: Date.now() } });
  document.dispatchEvent(event);
  console.log('[FicheApp] 🎉 Événement FicheAppReady dispatché!');
});

// ========================================================================
// COMPTER LES FICHES EN ATTENTE DE SYNC
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
  deleteFicheServer,
  editFicheLocal,
  viewLocalFiche,
  afficherNotification,
  getPendingSyncCount,
  logInfo, logWarn, logError
};

logInfo('✓ app-offline-unified.js chargé');
