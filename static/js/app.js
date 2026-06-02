// ========================================================================
// FICHE-CONTROLE v4 — app.js (complet avec offline/online + synchronisation)
// ========================================================================

const LOG_PREFIX = '[FicheApp]';
const DB_NAME = 'ficheControleDB';
const DB_VERSION = 5;
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
  
  // Initialiser Bootstrap toast si disponible
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
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function sauvegarderLocalement(donnees) {
  // Utiliser offline-crud.js si disponible
  if (typeof OfflineCRUD !== 'undefined') {
    try {
      const validation = OfflineCRUD.validateData(donnees);
      if (!validation.valid) {
        afficherNotification(validation.errors.join(', '), 'warning');
        return null;
      }
      const local_id = await OfflineCRUD.createFiche(donnees);
      logInfo('Fiche créée localement', { local_id });
      afficherNotification('Fiche sauvegardée localement', 'success');
      return local_id;
    } catch (error) {
      logError('Erreur OfflineCRUD.createFiche', error);
    }
  }

  // Fallback (ancien code)
  const db = await ouvrirDB();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  const fiche = { 
    ...donnees, 
    local_id: Date.now(), 
    synced: false,
    server_pk: null,
    created_offline_at: new Date().toISOString(),
    saved_at: new Date().toISOString()
  };
  store.put(fiche);
  logInfo('Fiche sauvegardée localement', { local_id: fiche.local_id });
  afficherNotification('Fiche sauvegardée localement', 'success');
  return fiche.local_id;
}

async function getFicheByLocalId(local_id) {
  const db = await ouvrirDB();
  const tx = db.transaction(STORE, 'readonly');
  return new Promise((resolve, reject) => {
    const req = tx.objectStore(STORE).get(parseInt(local_id));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllFiches() {
  const db = await ouvrirDB();
  const tx = db.transaction(STORE, 'readonly');
  return new Promise((resolve, reject) => {
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function deleteFiche(local_id) {
  const db = await ouvrirDB();
  const tx = db.transaction(STORE, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = tx.objectStore(STORE).delete(parseInt(local_id));
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

async function deleteLocalFiche(local_id) {
  return deleteFiche(local_id);
}

async function getPendingSyncCount() {
  const fiches = await getAllFiches();
  return fiches.filter(f => !f.synced).length;
}

// ========================================================================
// SYNCHRONISATION
// ========================================================================
async function syncAll() {
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
        // Mettre à jour la fiche locale comme synchronisée
        const db = await ouvrirDB();
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const updatedFiche = { ...fiche, synced: true, server_pk: data.id, synced_at: new Date().toISOString() };
        store.put(updatedFiche);
        synced++;
        logInfo(`✓ Fiche synchronisée: ${fiche.entreprise}`);
      } else {
        failed++;
        logError(`✗ Échec synchronisation: ${fiche.entreprise}`, await response.text());
      }
    } catch (e) {
      failed++;
      logError(`✗ Erreur réseau pour ${fiche.entreprise}`, e);
    }
  }
  
  afficherNotification(`${synced} fiche(s) synchronisée(s), ${failed} échec(s)`, synced > 0 ? 'success' : 'warning');
  logInfo(`Synchronisation terminée: ${synced} OK, ${failed} KO`);
  
  // Mettre à jour la bannière si disponible
  if (typeof window.updateSyncBanner === 'function') {
    await window.updateSyncBanner();
  }
  
  return { synced, failed };
}

function getCsrfToken() {
  const cookie = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
  if (cookie) return cookie.split('=')[1];
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute('content') : '';
}

// ========================================================================
// COLLECTE DES DONNEES DU FORMULAIRE
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
// RENDU DES FICHES LOCALES DANS LA LISTE
// ========================================================================
async function renderLocalFiches() {
  const container = document.getElementById('local-fiches-list');
  const section = document.getElementById('local-fiches-section');
  const localCountSpan = document.getElementById('local-count');
  const localCountHeader = document.getElementById('local-count-header');
  
  if (!container) {
    logInfo('Container local-fiches-list non trouvé');
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
    
    // Filtrer selon le statut actuel
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
      <div class="fiche-card local-card p-3" data-local-id="${fiche.local_id}" onclick="window.location.href = '/inspection/fiche/local/${fiche.local_id}/detail/'" style="cursor: pointer;">
        <div class="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div class="flex-grow-1">
            <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
              <h6 class="fw-bold mb-0">
                <i class="bi bi-building me-1 text-secondary"></i>
                ${escapeHtml(fiche.entreprise || 'Sans nom')}
              </h6>
              <span class="local-badge">
                <i class="bi bi-hdd"></i> Hors-ligne
              </span>
              <span class="fiche-badge ${fiche.statut === 'soumis' ? 'bg-success text-white' : 'bg-warning text-dark'}">
                ${fiche.statut === 'soumis' ? '<i class="bi bi-check-lg"></i> Soumis' : '<i class="bi bi-pencil"></i> Brouillon'}
              </span>
            </div>
            <div class="small text-muted d-flex flex-wrap gap-x-3 gap-y-1">
              <span><i class="bi bi-geo-alt me-1"></i> ${escapeHtml(fiche.lieu || 'Lieu non renseigné')}</span>
              <span><i class="bi bi-calendar-event me-1"></i> ${fiche.date_controle || 'Date non renseignée'}</span>
            </div>
            <div class="sync-status mt-1">
              <i class="bi bi-info-circle"></i> En attente de synchronisation
            </div>
          </div>
          <div class="d-flex gap-2">
            <a href="/inspection/fiche/local/${fiche.local_id}/edit/" class="btn btn-outline-primary btn-icon" title="Modifier" onclick="event.stopPropagation()">
              <i class="bi bi-pencil"></i> <span class="d-none d-sm-inline">Modifier</span>
            </a>
            <button onclick="if(window.FicheApp) window.FicheApp.deleteFicheLocal('${fiche.local_id}'); event.stopPropagation()" class="btn btn-outline-danger btn-icon" title="Supprimer">
              <i class="bi bi-trash3"></i> <span class="d-none d-sm-inline">Supprimer</span>
            </button>
          </div>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    logError('Erreur renderLocalFiches', error);
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function deleteFicheLocal(local_id) {
  if (!confirm('Supprimer définitivement cette fiche locale ?')) return;
  await deleteFiche(local_id);
  await renderLocalFiches();
  afficherNotification('Fiche locale supprimée', 'success');
  
  // Mettre à jour le compteur global
  if (typeof window.updateTotalCount === 'function') {
    window.updateTotalCount();
  }
}

// ========================================================================
// SOUMISSION FORMULAIRE (VERSION AMELIOREE)
// ========================================================================
async function soumettreFormulaire(statut) {
  const entreprise = document.querySelector('[name="entreprise"]')?.value?.trim();
  const date_controle = document.querySelector('[name="date_controle"]')?.value?.trim();
  
  if (!entreprise || !date_controle) {
    afficherNotification('Veuillez remplir le nom de l\'entreprise et la date du contrôle.', 'warning');
    return;
  }
  
  const donnees = collecterDonnees(statut);
  
  // Récupérer les IDs d'édition
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
  
  if (!navigator.onLine) {
    // Hors ligne
    const local_id = await sauvegarderLocalement(donnees);
    afficherNotification('Fiche sauvegardée localement (hors-ligne)', 'success');
    setTimeout(() => { window.location.href = '/fiches/'; }, 800);
    return;
  }
  
  // En ligne
  const csrfToken = getCsrfToken();
  const url = editingPk ? `/api/fiche/${editingPk}/modifier/` : '/api/fiche/creer/';
  
  try {
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
      afficherNotification('Fiche enregistrée avec succès !', 'success');
      setTimeout(() => { window.location.href = `/fiches/${data.id}/`; }, 1500);
    } else {
      const err = await resp.json();
      afficherNotification(`Erreur: ${err.error || 'Problème serveur'}`, 'danger');
      // Fallback: sauvegarde locale
      const local_id = await sauvegarderLocalement(donnees);
      afficherNotification('Sauvegarde locale effectuée', 'warning');
    }
  } catch (e) {
    logError('Erreur réseau', e);
    const local_id = await sauvegarderLocalement(donnees);
    afficherNotification('Connexion perdue. Fiche sauvegardée localement.', 'warning');
    setTimeout(() => { window.location.href = '/fiches/'; }, 800);
  }
}

// ========================================================================
// STATUT RESEAU
// ========================================================================
function updateNetworkStatus() {
  const statusBadge = document.getElementById('statut-connexion');
  if (!statusBadge) return;
  
  if (navigator.onLine) {
    statusBadge.innerHTML = '<i class="bi bi-wifi"></i> <span>En ligne</span>';
    statusBadge.classList.remove('offline');
  } else {
    statusBadge.innerHTML = '<i class="bi bi-wifi-off"></i> <span>Hors ligne</span>';
    statusBadge.classList.add('offline');
  }
}

// ========================================================================
// INITIALISATION
// ========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  logInfo('🚀 Initialisation application v4...');
  
  // Mettre à jour le statut réseau
  updateNetworkStatus();
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  
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
            el.value = value || '';
          }
        }
      }
      afficherNotification('Fiche locale chargée', 'info');
    } else {
      afficherNotification('Fiche locale introuvable', 'danger');
    }
  }
  
  // Rendre les fiches locales sur la page liste
  if (document.getElementById('local-fiches-list')) {
    await renderLocalFiches();
  }
  
  logInfo('✓ Application prête');
});

// ========================================================================
// MÉTHODES OFFLINE SIMPLIFIÉES (pour templates offline)
// ========================================================================
async function getFiche(local_id) {
  // Alias pour getFicheByLocalId
  return await getFicheByLocalId(local_id);
}

async function saveFiche(data) {
  // Créer une nouvelle fiche offline
  return await sauvegarderLocalement(data);
}

async function updateFiche(local_id, data) {
  // Mettre à jour une fiche existante
  const db = await ouvrirDB();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  
  const fiche = await getFicheByLocalId(local_id);
  if (!fiche) throw new Error('Fiche non trouvée');
  
  const updated = {
    ...fiche,
    ...data,
    local_id: fiche.local_id,
    saved_at: new Date().toISOString()
  };
  
  return new Promise((resolve, reject) => {
    const req = store.put(updated);
    req.onsuccess = () => resolve(updated);
    req.onerror = () => reject(req.error);
  });
}

// ========================================================================
// EXPORT GLOBAL
// ========================================================================
window.FicheApp = {
  sauvegarderLocalement,
  saveFiche,
  getFiche,
  getFicheByLocalId,
  updateFiche,
  getAllFiches,
  deleteFiche,
  deleteLocalFiche,
  getPendingSyncCount,
  syncAll,
  soumettreFormulaire,
  collecterDonnees,
  renderLocalFiches,
  deleteFicheLocal,
  afficherNotification,
  logInfo, logWarn, logError
};

// Exporter aussi les fonctions standalone pour compatibilité
window.syncLocale = () => window.FicheApp.syncAll();
window.sauvegarderLocalement = sauvegarderLocalement;
window.getFicheByLocalId = getFicheByLocalId;
window.deleteLocalFiche = deleteFiche;

logInfo('✓ Fichier app.js v4 chargé');