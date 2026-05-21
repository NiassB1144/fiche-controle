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
function logInfo(msg, data = null) { /* ... comme avant ... */ }
function logWarn(msg, data = null) { /* ... */ }
function logError(msg, data = null) { /* ... */ }

// ========================================================================
// SECTION 2: NOTIFICATIONS TOAST
// ========================================================================
function afficherNotification(message, type = 'info') { /* ... */ }
function creerToastContainer() { /* ... */ }

// ========================================================================
// SECTION 3: GESTION CONNEXION & STATUT
// ========================================================================
async function verifierConnexionReelle() { /* ... */ }
async function mettreAJourStatut() { /* ... */ }
window.addEventListener('online', () => mettreAJourStatut());
window.addEventListener('offline', () => mettreAJourStatut());
document.addEventListener('DOMContentLoaded', () => mettreAJourStatut());

// ========================================================================
// SECTION 4: INDEXEDDB
// ========================================================================
function ouvrirDB() { /* ... */ }
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
async function renderLocalFiches() { /* ... */ }

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
async function syncLocale() { /* ... */ }

// ========================================================================
// SECTION 10: PWA - INSTALLATION
// ========================================================================
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => { /* ... */ });

// ========================================================================
// SECTION 11: FORMULAIRE - ENREGISTREMENT ONLINE/OFFLINE
// ========================================================================
async function soumettreFormulaire(statut) {
  const donnees = collecterDonnees(statut);

  if (!navigator.onLine) {
    // Mode hors ligne → sauvegarde locale
    const local_id = await sauvegarderLocalement(donnees);
    afficherNotification('Fiche sauvegardée hors ligne', 'success');
    window.location.href = '/fiches/nouvelle/?local_id=' + encodeURIComponent(local_id);
  } else {
    // Mode en ligne → envoi au serveur
    try {
      const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
      const resp = await fetch('/api/fiche/creer/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
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
// SECTION 12: INITIALISATION DOM
// ========================================================================
document.addEventListener('DOMContentLoaded', () => {
  logInfo('🚀 Initialisation application...');
  if (!window.indexedDB) {
    logWarn('⚠️ IndexedDB non disponible!');
    afficherNotification('Attention: Mode offline limité', 'warning');
  }
  majBanniereSync();
  renderLocalFiches();
  window.addEventListener('online', () => { mettreAJourStatut(); renderLocalFiches(); });
  window.addEventListener('offline', () => { renderLocalFiches(); });
  logInfo('✓ Application prête');
});

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
  verifierConnexionReelle, soumettreFormulaire
};
logInfo('✓ Fichier app.js v3 chargé');
