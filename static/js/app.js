// ========================================================================
// FICHE-CONTRÔLE v3 - App.js (CORRIGÉ)
// ========================================================================

const LOG_PREFIX = '[FicheApp]';
const DB_NAME = 'ficheControleDB';
const DB_VERSION = 2;
const STORE = 'fiches_locales';
const OLD_STORE = 'fiches_hors_ligne';

// ========================================================================
// SECTION 1: LOGS
// ========================================================================
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
async function verifierConnexionReelle() {
  try {
    const test = await fetch('/manifest.json', {
      method: 'HEAD',
      cache: 'no-store',
      signal: AbortSignal.timeout(3000)
    });
    return test.ok;
  } catch {
    return false;
  }
}
async function mettreAJourStatut() {
  const el = document.getElementById('statut-connexion');
  if (!el) return;
  if (navigator.onLine) {
    el.innerHTML = '<i class="bi bi-wifi"></i> <span>En ligne</span>';
    el.style.background = 'rgba(255,255,255,0.2)';
    logInfo('📡 Connexion rétablie - vérification réelle...');
    setTimeout(async () => {
      const connecte = await verifierConnexionReelle();
      if (connecte) {
        logInfo('✓ Connexion confirmée - lancement sync');
        await syncLocale();
      } else {
        logInfo('⚠ navigator.onLine=true mais pas de connexion réelle');
      }
    }, 1500);
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
// SECTION 4: INDEXEDDB
// ========================================================================
function ouvrirDB() { /* ... comme dans ton code ... */ }
async function sauvegarderLocalement(donnees) { /* ... */ }
async function getFichesNonSynced() { /* ... */ }
async function getToutesFichesLocales() { /* ... */ }
async function getFicheByLocalId(local_id) { /* ... */ }
async function deleteLocalFiche(local_id) { /* ... */ }
async function marquerSynced(local_id, server_pk = null) { /* ... */ }

// ========================================================================
// SECTION 5: COMPTEURS & LISTES
// ========================================================================
async function getLocalFicheCount() { /* ... */ }
async function getLocalFichesList() { /* ... */ }

// ========================================================================
// SECTION 6: BANNIERE SYNC
// ========================================================================
async function majBanniereSync() { /* ... */ }

// ========================================================================
// SECTION 7: RENDU LISTE FICHES LOCALES
// ========================================================================
async function renderLocalFiches() { /* ... comme dans ton code ... */ }

// ========================================================================
// SECTION 8: TÉLÉCHARGEMENT FICHES
// ========================================================================
async function downloadFicheAsJson(local_id) { /* ... */ }
async function downloadFichePdf(local_id) { /* ... */ }

// ========================================================================
// SECTION 9: SYNCHRONISATION
// ========================================================================
let syncInProgress = false;
let syncRetryCount = 0;
const MAX_RETRIES = 2;
const RETRY_DELAY = 2000;
async function syncLocale() { /* ... comme dans ton code ... */ }

// ========================================================================
// SECTION 10: PWA - INSTALLATION
// ========================================================================
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => { /* ... */ });

// ========================================================================
// SECTION 12: INITIALISATION DOM
// ========================================================================
document.addEventListener('DOMContentLoaded', () => { /* ... */ });

// ========================================================================
// SECTION 13: EXPORTS GLOBAUX
// ========================================================================
window.FicheApp = {
  logInfo, logWarn, logError,
  getLocalFicheCount, getLocalFichesList,
  getFichesNonSynced, getToutesFichesLocales,
  getFicheByLocalId, deleteLocalFiche,
  sauvegarderLocalement, syncLocale,
  downloadFicheAsJson, downloadFichePdf,
  renderLocalFiches, afficherNotification,
  verifierConnexionReelle
};
logInfo('✓ Fichier app.js v3 chargé');
