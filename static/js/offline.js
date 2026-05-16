/**
 * offline.js — Gestion hors-ligne pour Fiche de Contrôle IRTSS Louga
 * Sauvegarde les fiches dans IndexedDB quand hors-ligne
 * Synchronise automatiquement au retour de connexion
 */

const DB_NAME = 'ficheControleDB';
const DB_VERSION = 1;
const STORE_FICHES = 'fiches_hors_ligne';

// ─────────────────────────────────────────
// 1. INITIALISATION IndexedDB
// ─────────────────────────────────────────

function ouvrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_FICHES)) {
        const store = db.createObjectStore(STORE_FICHES, {
          keyPath: 'local_id',
        });
        store.createIndex('statut_sync', 'statut_sync', { unique: false });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

// ─────────────────────────────────────────
// 2. SAUVEGARDER une fiche localement
// ─────────────────────────────────────────

async function sauvegarderFicheLocale(donnees) {
  const db = await ouvrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FICHES, 'readwrite');
    const store = tx.objectStore(STORE_FICHES);

    // local_id unique basé sur timestamp
    if (!donnees.local_id) {
      donnees.local_id = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    donnees.statut_sync = 'en_attente';
    donnees.created_at_local = new Date().toISOString();

    const req = store.put(donnees);
    req.onsuccess = () => resolve(donnees.local_id);
    req.onerror = (e) => reject(e.target.error);
  });
}

// ─────────────────────────────────────────
// 3. RÉCUPÉRER les fiches en attente
// ─────────────────────────────────────────

async function getFichesEnAttente() {
  const db = await ouvrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FICHES, 'readonly');
    const store = tx.objectStore(STORE_FICHES);
    const index = store.index('statut_sync');
    const req = index.getAll('en_attente');
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

// ─────────────────────────────────────────
// 4. TOUTES les fiches locales
// ─────────────────────────────────────────

async function getToutesFichesLocales() {
  const db = await ouvrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FICHES, 'readonly');
    const store = tx.objectStore(STORE_FICHES);
    const req = store.getAll();
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

// ─────────────────────────────────────────
// 5. MARQUER une fiche comme synchronisée
// ─────────────────────────────────────────

async function marquerFicheSynchronisee(local_id, server_id) {
  const db = await ouvrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FICHES, 'readwrite');
    const store = tx.objectStore(STORE_FICHES);
    const getReq = store.get(local_id);
    getReq.onsuccess = (e) => {
      const fiche = e.target.result;
      if (fiche) {
        fiche.statut_sync = 'synchronisee';
        fiche.server_id = server_id;
        store.put(fiche);
      }
      resolve();
    };
    getReq.onerror = (e) => reject(e.target.error);
  });
}

// ─────────────────────────────────────────
// 6. SYNCHRONISATION avec le serveur
// ─────────────────────────────────────────

async function synchroniserFiches() {
  if (!navigator.onLine) return;

  const fiches = await getFichesEnAttente();
  if (fiches.length === 0) return;

  console.log(`[Sync] ${fiches.length} fiche(s) en attente de synchronisation...`);

  try {
    // Récupérer le token CSRF depuis le cookie
    const csrf = getCookie('csrftoken');

    const response = await fetch('/api/sync/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrf,
      },
      body: JSON.stringify({ fiches }),
    });

    if (!response.ok) {
      console.error('[Sync] Erreur serveur:', response.status);
      return;
    }

    const result = await response.json();
    console.log(`[Sync] ${result.synchronisees} fiche(s) synchronisée(s)`);

    // Marquer chaque fiche comme synchronisée
    for (const item of result.fiches) {
      await marquerFicheSynchronisee(item.local_id, item.id);
    }

    // Mettre à jour le badge
    mettreAJourBadgeSync();

    // Afficher notification de succès
    afficherNotificationSync(result.synchronisees);

  } catch (err) {
    console.error('[Sync] Échec de la synchronisation:', err);
  }
}

// ─────────────────────────────────────────
// 7. INTERCEPTER le formulaire hors-ligne
// ─────────────────────────────────────────

function intercepterFormulaire() {
  const form = document.getElementById('form-fiche');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    // Si en ligne → comportement normal
    if (navigator.onLine) return;

    // Si hors-ligne → on intercepte
    e.preventDefault();

    const formData = new FormData(form);
    const donnees = {};

    for (const [key, value] of formData.entries()) {
      if (key === 'csrfmiddlewaretoken') continue;
      // Gérer les checkboxes (valeurs multiples)
      if (donnees[key] !== undefined) {
        if (!Array.isArray(donnees[key])) donnees[key] = [donnees[key]];
        donnees[key].push(value);
      } else {
        donnees[key] = value;
      }
    }

    // Valeur par défaut pour les champs obligatoires
    if (!donnees.entreprise) donnees.entreprise = 'Sans nom (hors-ligne)';
    if (!donnees.date_controle) donnees.date_controle = new Date().toISOString().split('T')[0];
    if (!donnees.lieu) donnees.lieu = 'Louga';
    donnees.statut = donnees.statut || 'brouillon';

    try {
      const local_id = await sauvegarderFicheLocale(donnees);
      console.log('[Offline] Fiche sauvegardée localement:', local_id);

      // Mettre à jour le badge
      mettreAJourBadgeSync();

      // Afficher message de confirmation
      afficherMessageHorsLigne();

    } catch (err) {
      console.error('[Offline] Erreur sauvegarde locale:', err);
      alert('Erreur lors de la sauvegarde hors-ligne. Veuillez réessayer.');
    }
  });
}

// ─────────────────────────────────────────
// 8. BADGE compteur de fiches en attente
// ─────────────────────────────────────────

async function mettreAJourBadgeSync() {
  const fiches = await getFichesEnAttente();
  const count = fiches.length;

  // Supprimer l'ancien badge
  const ancienBadge = document.getElementById('badge-sync');
  if (ancienBadge) ancienBadge.remove();

  if (count === 0) return;

  // Créer le badge dans la navbar
  const navbar = document.querySelector('.navbar-modern');
  if (!navbar) return;

  const badge = document.createElement('div');
  badge.id = 'badge-sync';
  badge.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #ffc107;
    color: #1e2a3e;
    border-radius: 40px;
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  `;
  badge.innerHTML = `
    <i class="bi bi-cloud-upload"></i>
    ${count} fiche${count > 1 ? 's' : ''} en attente de sync
  `;
  badge.onclick = () => synchroniserFiches();
  document.body.appendChild(badge);
}

// ─────────────────────────────────────────
// 9. MESSAGES utilisateur
// ─────────────────────────────────────────

function afficherMessageHorsLigne() {
  // Supprimer ancien message
  const ancien = document.getElementById('msg-hors-ligne');
  if (ancien) ancien.remove();

  const msg = document.createElement('div');
  msg.id = 'msg-hors-ligne';
  msg.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 20px;
    padding: 1rem 1.5rem;
    z-index: 9999;
    box-shadow: 0 8px 20px rgba(0,0,0,0.1);
    max-width: 90vw;
    text-align: center;
    font-weight: 500;
  `;
  msg.innerHTML = `
    <i class="bi bi-wifi-off me-2 text-warning"></i>
    <strong>Fiche sauvegardée localement</strong><br>
    <small>Elle sera synchronisée automatiquement au retour de connexion.</small>
    <br><br>
    <a href="/fiches/" class="btn btn-sm btn-outline-dark" style="border-radius:40px">
      <i class="bi bi-arrow-left me-1"></i>Retour aux fiches
    </a>
  `;
  document.body.appendChild(msg);

  // Disparaît après 8 secondes
  setTimeout(() => msg.remove(), 8000);
}

function afficherNotificationSync(count) {
  const notif = document.createElement('div');
  notif.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: #d1e7dd;
    border: 1px solid #006633;
    border-radius: 20px;
    padding: 0.8rem 1.5rem;
    z-index: 9999;
    box-shadow: 0 8px 20px rgba(0,0,0,0.1);
    font-weight: 500;
    text-align: center;
  `;
  notif.innerHTML = `
    <i class="bi bi-check-circle-fill me-2 text-success"></i>
    <strong>${count} fiche${count > 1 ? 's' : ''} synchronisée${count > 1 ? 's' : ''} avec succès !</strong>
  `;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 5000);
}

// ─────────────────────────────────────────
// 10. UTILITAIRE — lire un cookie
// ─────────────────────────────────────────

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : '';
}

// ─────────────────────────────────────────
// 11. INITIALISATION au chargement
// ─────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Intercepter le formulaire
  intercepterFormulaire();

  // Mettre à jour le badge au chargement
  await mettreAJourBadgeSync();

  // Sync automatique au retour en ligne
  window.addEventListener('online', async () => {
    console.log('[Offline] Connexion rétablie — synchronisation...');
    await synchroniserFiches();
    await mettreAJourBadgeSync();
  });
});