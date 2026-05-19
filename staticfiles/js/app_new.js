'use strict';

// ========================================================================
// FICHE-CONTRÔLE v2 - App.js Consolidé
// Source unique de vérité pour gestion offline, sync, logging, téléchargement
// ========================================================================

// ========================================================================
// SECTION 1: CONFIGURATION & LOGGING
// ========================================================================

const LOG_PREFIX = '[FicheApp]';
const DB_NAME = 'ficheControleDB';
const DB_VERSION = 2;
const STORE = 'fiches_locales';
const OLD_STORE = 'fiches_hors_ligne';

function logInfo(msg, data = null) {
  const ts = new Date().toLocaleTimeString('fr-FR');
  console.log(`${LOG_PREFIX} [${ts}] ${msg}`, data || '');
}

function logWarn(msg, data = null) {
  const ts = new Date().toLocaleTimeString('fr-FR');
  console.warn(`${LOG_PREFIX} [${ts}] ⚠ ${msg}`, data || '');
}

function logError(msg, data = null) {
  const ts = new Date().toLocaleTimeString('fr-FR');
  console.error(`${LOG_PREFIX} [${ts}] ❌ ${msg}`, data || '');
}

// ========================================================================
// SECTION 2: NOTIFICATIONS TOAST
// ========================================================================

function afficherNotification(message, type = 'info') {
  const container = document.getElementById('toast-container') || creerToastContainer();
  const id = 'toast_' + Date.now();
  const icons = { success: '✓', warning: '⚠', danger: '❌', info: 'ℹ' };
  const icon = icons[type] || icons.info;
  
  const html = `
    <div id="${id}" class="toast align-items-center text-bg-${type} border-0" role="alert">
      <div class="d-flex">
        <div class="toast-body"><span style="margin-right: 8px;">${icon}</span>${message}</div>
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

// ========================================================================
// SECTION 3: GESTION CONNEXION & STATUT
// ========================================================================

async function mettreAJourStatut() {
  const el = document.getElementById('statut-connexion');
  if (!el) return;
  
  if (navigator.onLine) {
    el.innerHTML = '<i class="bi bi-wifi"></i> <span>En ligne</span>';
    el.style.background = 'rgba(255,255,255,0.2)';
    logInfo('📡 Connexion rétablie - tentative de sync...');
    await syncLocale();
  } else {
    el.innerHTML = '<i class="bi bi-wifi-off"></i> <span>Hors ligne</span>';
    el.style.background = 'rgba(220,53,69,0.8)';
    logInfo('📴 Vous êtes maintenant hors ligne');
  }
}

window.addEventListener('online', () => mettreAJourStatut());
window.addEventListener('offline', () => mettreAJourStatut());
document.addEventListener('DOMContentLoaded', () => mettreAJourStatut());

// ========================================================================
// SECTION 4: INDEXEDDB - OPÉRATIONS DE BASE
// ========================================================================

function ouvrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    
    req.onupgradeneeded = async (e) => {
      const db = e.target.result;
      logInfo('📦 Mise à niveau IndexedDB...', { version: DB_VERSION });
      
      // Créer le store actuel si nécessaire
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'local_id' });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('saved_at', 'saved_at', { unique: false });
        logInfo('✓ Store créé:', STORE);
      }
      
      // Migrer l'ancien store si des données existent
      if (db.objectStoreNames.contains(OLD_STORE)) {
        logInfo('🔄 Migration depuis ancien store:', OLD_STORE);
        const oldStore = e.target.transaction.objectStore(OLD_STORE);
        const newStore = e.target.transaction.objectStore(STORE);
        
        const getAllReq = oldStore.getAll();
        getAllReq.onsuccess = (event) => {
          const oldFiches = event.target.result || [];
          logInfo(`🔄 Migration de ${oldFiches.length} fiche(s)...`);
          
          oldFiches.forEach(item => {
            const fiche = {
              ...item,
              synced: item.synced === true,
              saved_at: item.created_at_local || item.saved_at || new Date().toISOString(),
            };
            newStore.put(fiche);
          });
          logInfo('✓ Migration terminée');
        };
      }
    };
    
    req.onsuccess = (e) => {
      logInfo('✓ IndexedDB ouvert');
      resolve(e.target.result);
    };
    
    req.onerror = (e) => {
      logError('Erreur ouverture IndexedDB', e.target.error);
      reject(e.target.error);
    };
  });
}

async function sauvegarderLocalement(donnees) {
  try {
    logInfo('💾 Sauvegarde locale...', donnees);
    const db = await ouvrirDB();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    
    const local_id = donnees.local_id || 'fiche_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    const fiche = {
      ...donnees,
      local_id,
      synced: false,
      saved_at: new Date().toISOString()
    };
    
    store.put(fiche);
    await majBanniereSync();
    logInfo('✓ Fiche sauvegardée localement:', { local_id });
    afficherNotification('Fiche sauvegardée localement', 'success');
    return local_id;
  } catch (e) {
    logWarn('IndexedDB non disponible', e);
    afficherNotification('Erreur sauvegarde locale', 'danger');
    return null;
  }
}

async function getFichesNonSynced() {
  try {
    const db = await ouvrirDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.getAll();
      
      req.onsuccess = () => {
        const fiches = (req.result || []).filter(item => item.synced !== true);
        resolve(fiches);
      };
      req.onerror = () => {
        logWarn('Erreur lecture fiches non syncées');
        resolve([]);
      };
    });
  } catch (e) {
    logError('Erreur getFichesNonSynced', e);
    return [];
  }
}

async function getFicheByLocalId(local_id) {
  try {
    const db = await ouvrirDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.get(local_id);
      
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => {
        logWarn('Erreur lecture fiche', { local_id });
        resolve(null);
      };
    });
  } catch (e) {
    logError('Erreur getFicheByLocalId', e);
    return null;
  }
}

async function deleteLocalFiche(local_id) {
  try {
    logInfo('🗑️  Suppression fiche locale...', { local_id });
    const db = await ouvrirDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.delete(local_id);
      
      req.onsuccess = () => {
        logInfo('✓ Fiche supprimée:', { local_id });
        majBanniereSync();
        resolve();
      };
      req.onerror = (e) => {
        logError('Erreur suppression fiche', e);
        reject(e.target.error);
      };
    });
  } catch (e) {
    logError('Erreur deleteLocalFiche', e);
  }
}

async function marquerSynced(local_id, server_pk = null) {
  try {
    const db = await ouvrirDB();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.get(local_id);
    
    req.onsuccess = () => {
      if (req.result) {
        const updated = {
          ...req.result,
          synced: true,
          synced_at: new Date().toISOString()
        };
        if (server_pk) updated.server_pk = server_pk;
        store.put(updated);
        logInfo('✓ Fiche marquée syncée:', { local_id, server_pk });
      }
    };
    req.onerror = () => logWarn('Erreur marquerSynced', { local_id });
  } catch (e) {
    logError('Erreur marquerSynced', e);
  }
}

// ========================================================================
// SECTION 5: COMPTEURS & LISTES
// ========================================================================

async function getLocalFicheCount() {
  const fiches = await getFichesNonSynced();
  return fiches.length;
}

async function getLocalFichesList() {
  try {
    const fiches = await getFichesNonSynced();
    return fiches.map(f => ({
      local_id: f.local_id,
      entreprise: f.entreprise || '(Sans nom)',
      date_controle: f.date_controle || 'N/A',
      saved_at: f.saved_at,
      synced: f.synced === true
    }));
  } catch (e) {
    logError('Erreur getLocalFichesList', e);
    return [];
  }
}

// ========================================================================
// SECTION 6: BANNIERE SYNC
// ========================================================================

async function majBanniereSync() {
  try {
    const fiches = await getFichesNonSynced();
    const banner = document.getElementById('sync-banner');
    const badge = document.getElementById('sync-count');
    
    if (!banner) return;
    
    if (fiches.length > 0) {
      banner.style.display = 'flex';
      if (badge) badge.textContent = fiches.length;
      logInfo(`📢 Bannière sync mise à jour: ${fiches.length} fiche(s)`);
    } else {
      banner.style.display = 'none';
      logInfo('📢 Bannière sync cachée');
    }
  } catch (e) {
    logError('Erreur majBanniereSync', e);
  }
}

// ========================================================================
// SECTION 7: RENDU LISTE FICHES LOCALES
// ========================================================================

async function renderLocalFiches() {
  try {
    const container = document.getElementById('local-fiches-list');
    if (!container) return;
    
    const fiches = await getFichesNonSynced();
    container.innerHTML = '';
    
    if (!fiches || !fiches.length) {
      container.innerHTML = '<div class="small text-muted">Aucune fiche locale en attente.</div>';
      logInfo('✓ Affichage: aucune fiche locale');
      return;
    }
    
    logInfo(`✓ Affichage ${fiches.length} fiche(s) locale(s)`);
    
    fiches.forEach(f => {
      const div = document.createElement('div');
      div.className = 'fiche-card p-3 mb-2';
      const entreprise = f.entreprise || '(Sans nom)';
      const datec = f.date_controle || 'N/A';
      const savedAt = new Date(f.saved_at).toLocaleDateString('fr-FR');
      
      div.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-grow-1">
            <div class="fw-bold">${entreprise}</div>
            <div class="small text-muted">
              <i class="bi bi-calendar"></i> ${datec}
            </div>
            <div class="small text-muted">
              <i class="bi bi-clock"></i> Sauvegardée: ${savedAt}
            </div>
          </div>
          <div class="d-flex gap-2 flex-wrap justify-content-end">
            <button class="btn btn-outline-info btn-sm" data-local-download-json="${f.local_id}" title="Télécharger JSON">
              <i class="bi bi-download"></i> JSON
            </button>
            <button class="btn btn-outline-secondary btn-sm" data-local-download-pdf="${f.local_id}" title="Télécharger PDF">
              <i class="bi bi-file-pdf"></i> PDF
            </button>
            <button class="btn btn-outline-primary btn-sm" data-local-edit="${f.local_id}" title="Modifier">
              <i class="bi bi-pencil"></i> Modifier
            </button>
            <button class="btn btn-outline-danger btn-sm" data-local-delete="${f.local_id}" title="Supprimer">
              <i class="bi bi-trash3"></i> Supprimer
            </button>
          </div>
        </div>`;
      
      container.appendChild(div);
    });
    
    // Événements
    container.querySelectorAll('[data-local-edit]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-local-edit');
        window.location.href = '/fiches/nouvelle/?local_id=' + encodeURIComponent(id);
      });
    });
    
    container.querySelectorAll('[data-local-delete]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-local-delete');
        if (!confirm('Supprimer cette fiche locale ?')) return;
        await deleteLocalFiche(id);
        renderLocalFiches();
      });
    });
    
    container.querySelectorAll('[data-local-download-json]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-local-download-json');
        await downloadFicheAsJson(id);
      });
    });
    
    container.querySelectorAll('[data-local-download-pdf]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-local-download-pdf');
        await downloadFichePdf(id);
      });
    });
  } catch (e) {
    logError('Erreur renderLocalFiches', e);
  }
}

// ========================================================================
// SECTION 8: TÉLÉCHARGEMENT FICHES
// ========================================================================

async function downloadFicheAsJson(local_id) {
  try {
    logInfo('💾 Téléchargement JSON...', { local_id });
    const fiche = await getFicheByLocalId(local_id);
    
    if (!fiche) {
      afficherNotification('Fiche non trouvée', 'danger');
      logWarn('Fiche non trouvée', { local_id });
      return;
    }
    
    const jsonStr = JSON.stringify(fiche, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const entreprise = fiche.entreprise || 'fiche';
    const dateStr = new Date(fiche.saved_at).toISOString().split('T')[0];
    link.href = url;
    link.download = `fiche_${entreprise}_${dateStr}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    logInfo('✓ JSON téléchargé:', { local_id });
    afficherNotification('Fiche téléchargée en JSON', 'success');
  } catch (e) {
    logError('Erreur downloadFicheAsJson', e);
    afficherNotification('Erreur téléchargement JSON', 'danger');
  }
}

async function downloadFichePdf(local_id) {
  try {
    logInfo('📄 Téléchargement PDF...', { local_id });
    const fiche = await getFicheByLocalId(local_id);
    
    if (!fiche) {
      afficherNotification('Fiche non trouvée', 'danger');
      logWarn('Fiche non trouvée pour PDF', { local_id });
      return;
    }
    
    // Vérifier si html2pdf est disponible
    if (!window.html2pdf) {
      afficherNotification('Bibliothèque PDF non disponible. Essai JSON...', 'warning');
      logWarn('html2pdf non disponible, fallback JSON');
      await downloadFicheAsJson(local_id);
      return;
    }
    
    // Créer le contenu HTML du PDF
    const html = `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { border-bottom: 2px solid #007bff; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; color: #007bff; }
            .section { margin: 20px 0; }
            .section-title { font-weight: bold; color: #007bff; margin: 15px 0 10px 0; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            .field { margin: 8px 0; }
            .field-label { font-weight: bold; color: #555; }
            .field-value { margin-left: 10px; }
            .footer { margin-top: 40px; font-size: 12px; color: #999; border-top: 1px solid #ddd; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Fiche de Contrôle</h1>
            <p><small>Générée le ${new Date().toLocaleString('fr-FR')}</small></p>
          </div>
          
          <div class="section">
            <div class="section-title">Informations Entreprise</div>
            <div class="field">
              <span class="field-label">Entreprise:</span>
              <span class="field-value">${fiche.entreprise || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="field-label">Date de Contrôle:</span>
              <span class="field-value">${fiche.date_controle || 'N/A'}</span>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Données Complètes</div>
            <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 11px;">
${JSON.stringify(fiche, null, 2).replace(/</g, '&lt;').replace(/>/g, '&gt;')}
            </pre>
          </div>
          
          <div class="footer">
            <p>Document généré localement • ID: ${fiche.local_id}</p>
          </div>
        </body>
      </html>
    `;
    
    const element = document.createElement('div');
    element.innerHTML = html;
    const opt = {
      margin: 10,
      filename: `fiche_${fiche.entreprise || 'export'}_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };
    
    html2pdf().set(opt).from(html).save();
    logInfo('✓ PDF téléchargé:', { local_id });
    afficherNotification('Fiche téléchargée en PDF', 'success');
  } catch (e) {
    logError('Erreur downloadFichePdf', e);
    afficherNotification('Erreur téléchargement PDF', 'danger');
  }
}

// ========================================================================
// SECTION 9: SYNCHRONISATION
// ========================================================================

let syncInProgress = false;
let syncRetryCount = 0;
const MAX_RETRIES = 2;
const RETRY_DELAY = 2000; // 2 secondes

async function syncLocale() {
  // Éviter les syncs simultanés
  if (syncInProgress) {
    logInfo('⏳ Sync déjà en cours...');
    return;
  }
  
  // Vérifier connexion
  if (!navigator.onLine) {
    logInfo('📴 Hors ligne - sync annulée');
    return;
  }
  
  const fiches = await getFichesNonSynced();
  if (!fiches.length) {
    logInfo('✓ Aucune fiche à synchroniser');
    return;
  }
  
  syncInProgress = true;
  logInfo(`🔄 Démarrage sync... (${fiches.length} fiche(s))`);
  afficherNotification(`Synchronisation de ${fiches.length} fiche(s)...`, 'info');
  
  try {
    const csrfToken = document.cookie.split('; ')
      .find(r => r.startsWith('csrftoken='))?.split('=')[1] || '';
    
    const resp = await fetch('/api/sync/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken
      },
      body: JSON.stringify({ fiches }),
      timeout: 15000
    });
    
    if (resp.ok) {
      const data = await resp.json();
      logInfo('📨 Réponse serveur reçue', { synchronisees: data.synchronisees });
      
      // Marquer comme syncées
      for (const f of (data.fiches || [])) {
        if (f.local_id) {
          await marquerSynced(f.local_id, f.server_pk);
        }
      }
      
      await majBanniereSync();
      await renderLocalFiches();
      
      if (data.synchronisees > 0) {
        afficherNotification(`✓ ${data.synchronisees} fiche(s) synchronisée(s)!`, 'success');
        logInfo('✓ Sync réussie!', { synchronisees: data.synchronisees });
      }
      
      syncRetryCount = 0;
    } else {
      throw new Error(`Erreur serveur: ${resp.status} ${resp.statusText}`);
    }
  } catch (e) {
    logError('Erreur sync', e.message);
    
    // Retry automatique après 2s (max 2 tentatives)
    if (syncRetryCount < MAX_RETRIES && navigator.onLine) {
      syncRetryCount++;
      logInfo(`⏱️  Retry ${syncRetryCount}/${MAX_RETRIES} dans ${RETRY_DELAY}ms...`);
      afficherNotification(`Tentative ${syncRetryCount}/${MAX_RETRIES} dans 2s...`, 'warning');
      
      setTimeout(() => {
        syncInProgress = false;
        syncLocale();
      }, RETRY_DELAY);
      return;
    }
    
    afficherNotification('Sync échouée - réessai au retour de la connexion', 'danger');
    syncRetryCount = 0;
  } finally {
    syncInProgress = false;
  }
}

// ========================================================================
// SECTION 10: PWA - INSTALLATION
// ========================================================================

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const banner = document.getElementById('pwa-install-banner');
  if (banner) {
    banner.style.display = 'flex';
    logInfo('📱 PWA install prompt disponible');
  }
});

// ========================================================================
// SECTION 11: SERVICE WORKER
// ========================================================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => {
        logInfo('✓ Service Worker enregistré:', reg.scope);
      })
      .catch(err => {
        logWarn('Erreur enregistrement Service Worker:', err);
      });
  });
}

// ========================================================================
// SECTION 12: INITIALISATION DOM
// ========================================================================

document.addEventListener('DOMContentLoaded', () => {
  logInfo('🚀 Initialisation application...');
  
  // Vérifier IndexedDB
  if (!window.indexedDB) {
    logWarn('⚠️  IndexedDB non disponible!');
    afficherNotification('Attention: Mode offline limité (IndexedDB non disponible)', 'warning');
  }
  
  // Initialiser UI
  majBanniereSync();
  renderLocalFiches();
  logInfo('✓ UI initialisée');
  
  // Événement retour en ligne
  window.addEventListener('online', () => {
    logInfo('📡 Événement: retour en ligne détecté');
    mettreAJourStatut();
  });
  
  // Événement déconnexion
  window.addEventListener('offline', () => {
    logInfo('📴 Événement: déconnexion détectée');
  });
  
  // Bouton installer PWA
  const btnInstallerPwa = document.getElementById('btn-installer-pwa');
  if (btnInstallerPwa) {
    btnInstallerPwa.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      logInfo('📱 Installation PWA demandée par utilisateur');
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      logInfo('📱 Résultat installation:', { outcome });
      deferredPrompt = null;
      const banner = document.getElementById('pwa-install-banner');
      if (banner) banner.style.display = 'none';
    });
  }
  
  // Bouton fermer PWA banner
  const btnFermerPwa = document.getElementById('btn-fermer-pwa');
  if (btnFermerPwa) {
    btnFermerPwa.addEventListener('click', () => {
      const banner = document.getElementById('pwa-install-banner');
      if (banner) banner.style.display = 'none';
      logInfo('📱 PWA banner fermée');
    });
  }
  
  // Sync auto au chargement si en ligne
  if (navigator.onLine) {
    const interval = setInterval(async () => {
      const count = await getLocalFicheCount();
      if (count > 0) {
        logInfo('🔄 Sync auto au chargement...');
        syncLocale();
        clearInterval(interval);
      }
    }, 2000);
  }
  
  logInfo('✓ Application prête');
});

// ========================================================================
// SECTION 13: EXPORTS GLOBAUX (pour console & debugging)
// ========================================================================

window.FicheApp = {
  logInfo,
  logWarn,
  logError,
  getLocalFicheCount,
  getLocalFichesList,
  getFichesNonSynced,
  getFicheByLocalId,
  deleteLocalFiche,
  sauvegarderLocalement,
  syncLocale,
  downloadFicheAsJson,
  downloadFichePdf,
  renderLocalFiches,
  afficherNotification
};

logInfo('✓ Fichier app.js v2 chargé - commandes disponibles dans FicheApp');
