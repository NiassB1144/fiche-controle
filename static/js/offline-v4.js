/**
 * 🚀 SYSTÈME OFFLINE COMPLET v4
 * ✓ Cache automatique des fiches
 * ✓ Voir/modifier/supprimer offline
 * ✓ Sync auto quand online
 * ✓ Formulaires dynamiques
 */

class OfflineSystem {
  constructor() {
    this.db = null;
    this.isOnline = navigator.onLine;
    this.listeners = new Map();
  }

  async init() {
    try {
      await this.initDB();
      this.setupListeners();
      this.cacheCurrentPage();
      this.createUI();
      this.setupFormInterception();
      
      console.log('✅ Système offline v4 prêt');
    } catch (error) {
      console.error('❌ Erreur init:', error);
    }
  }

  // ==================== DB ====================

  initDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('FicheControleDB', 4);

      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        this.db = req.result;
        console.log('✓ DB initialisée');
        resolve();
      };

      req.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Store fiches
        if (!db.objectStoreNames.contains('fiches')) {
          const store = db.createObjectStore('fiches', { keyPath: 'id' });
          store.createIndex('updated_at', 'updated_at');
        }

        // Store sync queue
        if (!db.objectStoreNames.contains('sync_queue')) {
          const store = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
          store.createIndex('status', 'status');
          store.createIndex('action', 'action');
        }
      };
    });
  }

  // ==================== CACHE FICHES ====================

  cacheCurrentPage() {
    // Si on est sur une page de détail fiche
    const match = window.location.pathname.match(/\/fiche\/(\d+)/);
    if (match) {
      const ficheId = parseInt(match[1]);
      this.extractAndCacheFiche(ficheId);
    }

    // Si on est sur une page de liste, pré-cacher toutes les fiches visibles
    document.querySelectorAll('[data-fiche-id]').forEach(elem => {
      const ficheId = parseInt(elem.dataset.ficheId);
      this.extractFicheFromElement(ficheId, elem);
    });
  }

  extractAndCacheFiche(ficheId) {
    // Méthode 1: Chercher script JSON
    const jsonScript = document.querySelector(`script[data-fiche="${ficheId}"]`);
    if (jsonScript) {
      try {
        const data = JSON.parse(jsonScript.textContent);
        data.id = ficheId;
        data.cached_at = new Date().toISOString();
        this.saveFicheDB(data);
        console.log(`✓ Fiche ${ficheId} cachée (via JSON)`);
        return;
      } catch (e) {
        console.warn('Erreur parse JSON:', e);
      }
    }

    // Méthode 2: Chercher un formulaire
    const form = document.querySelector('form[data-fiche-id]');
    if (form) {
      const formData = new FormData(form);
      const data = Object.fromEntries(formData);
      data.id = ficheId;
      data.cached_at = new Date().toISOString();
      this.saveFicheDB(data);
      console.log(`✓ Fiche ${ficheId} cachée (via formulaire)`);
      return;
    }

    // Méthode 3: Chercher les données dans les champs visible
    const data = {
      id: ficheId,
      cached_at: new Date().toISOString(),
    };

    // Extraire tous les champs de fiche visibles
    const fields = [
      'entreprise', 'date_controle', 'lieu', 'adresse', 'telephone',
      'email_entreprise', 'statut', 'form_juridique', 'activite_principale'
    ];

    fields.forEach(field => {
      const elem = document.querySelector(`[name="${field}"]`);
      if (elem) {
        data[field] = elem.value;
      }
    });

    if (Object.keys(data).length > 2) {
      this.saveFicheDB(data);
      console.log(`✓ Fiche ${ficheId} cachée (via éléments)`);
    }
  }

  extractFicheFromElement(ficheId, elem) {
    const data = {
      id: ficheId,
      cached_at: new Date().toISOString(),
    };

    // Chercher les info dans l'élément ou ses enfants
    const textContent = elem.textContent;
    
    // Essayer d'extraire l'entreprise
    const nameElem = elem.querySelector('[data-fiche-name]');
    if (nameElem) {
      data.entreprise = nameElem.textContent.trim();
    }

    if (Object.keys(data).length > 2) {
      this.saveFicheDB(data);
    }
  }

  saveFicheDB(data) {
    if (!this.db) return;

    const tx = this.db.transaction(['fiches'], 'readwrite');
    const store = tx.objectStore('fiches');

    // Assurer que local_id est défini (pour les fiches créées offline)
    if (!data.local_id && !data.id) {
      data.local_id = Date.now().toString();
    }

    // Utiliser local_id comme clé primaire si pas d'id
    if (!data.id && data.local_id) {
      // Chercher d'abord s'il existe
      const getReq = store.get(data.local_id);
      getReq.onsuccess = () => {
        if (getReq.result) {
          // Mettre à jour
          Object.assign(getReq.result, data);
          store.put(getReq.result);
        } else {
          // Créer nouveau
          store.put(data);
        }
      };
    } else {
      store.put(data);
    }
  }

  // ==================== OFFLINE DB ACCESS ====================

  async getFichFromDB(ficheId) {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['fiches'], 'readonly');
      const store = tx.objectStore('fiches');
      
      // Chercher par ID numérique ou local_id string
      let req;
      if (typeof ficheId === 'string') {
        // C'est un local_id, chercher par index
        const index = store.index('local_id') || store;
        req = store.get(ficheId);
      } else {
        req = store.get(ficheId);
      }

      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
    });
  }

  async getAllFichesFromDB() {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['fiches'], 'readonly');
      const store = tx.objectStore('fiches');
      const req = store.getAll();

      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result || []);
    });
  }

  // ==================== FORM INTERCEPTION ====================

  setupFormInterception() {
    document.addEventListener('submit', (e) => this.handleFormSubmit(e));
    document.addEventListener('click', (e) => this.handleFicheClick(e));
  }

  async handleFicheClick(e) {
    // Intercepter les clics sur les liens de fiches
    const link = e.target.closest('a[href*="/fiche/"]');
    if (!link) return;

    const href = link.getAttribute('href');
    
    // Vérifier si c'est une fiche locale (créée offline)
    const localMatch = href.match(/local\/([^\/]+)/);
    if (localMatch) {
      const localId = localMatch[1];
      
      // Récupérer la fiche du cache
      const fiche = await this.getFichFromDB(localId);
      if (fiche) {
        // Laisser naviguer normalement vers la page locale
        return;
      } else {
        // Empêcher la navigation si la fiche n'existe pas en cache
        e.preventDefault();
        this.showNotification('❌ Fiche non trouvée en cache', 'error');
      }
    }
  }

  async handleFormSubmit(e) {
    if (this.isOnline) return; // Online = laisser passer normalement

    const form = e.target;
    
    // Vérifier si c'est un formulaire fiche
    if (!form.matches('[data-fiche-form], form[action*="/fiche/"], form[action*="creer"]')) {
      return;
    }

    e.preventDefault();
    e.stopImmediatePropagation();

    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    // Extraire l'ID si modification
    const idMatch = form.action.match(/\/fiche\/(\d+)\//);
    const ficheId = idMatch ? parseInt(idMatch[1]) : null;

    try {
      let localId = data.local_id;
      
      if (ficheId) {
        // Modification
        data.id = ficheId;
        if (!localId) {
          localId = ficheId.toString();
        }
        data.local_id = localId;
        
        await this.saveFicheDB(data);
        this.addToQueue('update', data);
        this.showNotification('✓ Fiche modifiée en offline');
        
        // Rediriger vers page de détail
        setTimeout(() => {
          window.location.href = `/fiche/local/${localId}/`;
        }, 1500);
      } else {
        // Création - générer local_id si absent
        if (!localId) {
          localId = Date.now().toString();
        }
        data.local_id = localId;
        data.id = undefined; // Pas d'ID serveur encore
        
        await this.saveFicheDB(data);
        this.addToQueue('create', data);
        this.showNotification('✓ Fiche créée en offline');
        
        // IMPORTANT: Rediriger vers la page locale, PAS vers /fiches/creer/
        setTimeout(() => {
          window.location.href = `/fiche/local/${localId}/`;
        }, 1500);
      }
    } catch (error) {
      this.showNotification('❌ Erreur: ' + error.message, 'error');
    }
  }

  // ==================== SYNC ====================

  addToQueue(action, data) {
    if (!this.db) return;

    const tx = this.db.transaction(['sync_queue'], 'readwrite');
    const store = tx.objectStore('sync_queue');

    store.add({
      action,
      data,
      status: 'pending',
      created_at: new Date().toISOString(),
      attempts: 0,
    });

    this.updatePendingCount();
  }

  async syncPending() {
    if (!navigator.onLine || !this.db) return;

    try {
      const tx = this.db.transaction(['sync_queue'], 'readonly');
      const index = tx.objectStore('sync_queue').index('status');
      
      const items = await new Promise((resolve, reject) => {
        const req = index.getAll('pending');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result || []);
      });

      console.log(`🔄 Syncing ${items.length} items...`);

      for (const item of items) {
        await this.syncItem(item);
      }

      console.log('✓ Sync terminé');
      this.updatePendingCount();
    } catch (error) {
      console.error('Erreur sync:', error);
    }
  }

  async syncItem(item) {
    try {
      const response = await fetch('/inspection/api/sync/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': this.getCSRFToken(),
        },
        body: JSON.stringify({
          action: item.action,
          data: item.data,
        }),
      });

      if (response.ok) {
        const txWrite = this.db.transaction(['sync_queue'], 'readwrite');
        const store = txWrite.objectStore('sync_queue');
        item.status = 'synced';
        store.put(item);

        console.log(`✓ Item ${item.id} synced`);
      } else {
        console.warn(`✗ Sync item ${item.id} failed: ${response.status}`);
        item.attempts++;
        if (item.attempts < 3) {
          const txWrite = this.db.transaction(['sync_queue'], 'readwrite');
          txWrite.objectStore('sync_queue').put(item);
        }
      }
    } catch (error) {
      console.error(`✗ Sync error ${item.id}:`, error);
      item.attempts++;
      if (item.attempts < 3) {
        const txWrite = this.db.transaction(['sync_queue'], 'readwrite');
        txWrite.objectStore('sync_queue').put(item);
      }
    }
  }

  // ==================== UI ====================

  createUI() {
    const html = `
      <div id="offline-indicator" style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        padding: 10px 20px;
        background: #f59e0b;
        color: white;
        z-index: 9999;
        display: none;
        font-weight: bold;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      ">
        📡 Mode offline - Modifications synchronisées automatiquement
        <button id="offline-details-btn" style="
          margin-left: 15px;
          padding: 4px 10px;
          background: rgba(255,255,255,0.3);
          border: none;
          color: white;
          border-radius: 3px;
          cursor: pointer;
          font-weight: bold;
        ">Détails</button>
      </div>

      <div id="offline-panel" style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 15px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9998;
        display: none;
        min-width: 300px;
        max-height: 400px;
        overflow-y: auto;
      ">
        <h3 style="margin-top: 0;">Synchronisation offline</h3>
        <div id="offline-status" style="font-size: 13px; line-height: 1.8;">
          <p id="online-status">Statut: Vérification...</p>
          <p id="pending-count">En attente: 0</p>
        </div>
        <button id="sync-now-btn" style="
          width: 100%;
          padding: 8px;
          background: #0ea5e9;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          margin-top: 10px;
        ">Synchroniser maintenant</button>
      </div>
    `;

    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);

    // Event listeners
    document.getElementById('offline-details-btn').addEventListener('click', () => {
      const panel = document.getElementById('offline-panel');
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('sync-now-btn').addEventListener('click', () => {
      this.syncPending();
    });
  }

  showNotification(message, type = 'success') {
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      top: 60px;
      left: 20px;
      padding: 15px 20px;
      background: ${type === 'error' ? '#ef4444' : '#10b981'};
      color: white;
      border-radius: 4px;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    div.textContent = message;
    document.body.appendChild(div);

    setTimeout(() => div.remove(), 3000);
  }

  updatePendingCount() {
    if (!this.db) return;

    const tx = this.db.transaction(['sync_queue'], 'readonly');
    const index = tx.objectStore('sync_queue').index('status');

    const req = index.getAll('pending');
    req.onsuccess = () => {
      const count = req.result.length;
      const elem = document.getElementById('pending-count');
      if (elem) {
        elem.textContent = `En attente: ${count}`;
      }
    };
  }

  getCSRFToken() {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie) {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        if (cookie.trim().startsWith(name + '=')) {
          cookieValue = decodeURIComponent(cookie.trim().substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue || '';
  }

  // ==================== LISTENERS ====================

  setupListeners() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  handleOnline() {
    console.log('✓ Online');
    this.isOnline = true;
    document.getElementById('offline-indicator').style.display = 'none';
    const statusElem = document.getElementById('online-status');
    if (statusElem) {
      statusElem.textContent = 'Statut: 🟢 En ligne';
    }
    this.syncPending();
  }

  handleOffline() {
    console.log('⚠️ Offline');
    this.isOnline = false;
    document.getElementById('offline-indicator').style.display = 'block';
    const statusElem = document.getElementById('online-status');
    if (statusElem) {
      statusElem.textContent = 'Statut: 🔴 Hors ligne';
    }
  }

  // ==================== GETTERS ====================

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}

// ============================================================================
// INITIALISATION
// ============================================================================

let offlineSystem;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    offlineSystem = new OfflineSystem();
    offlineSystem.init();
  });
} else {
  offlineSystem = new OfflineSystem();
  offlineSystem.init();
}

// API global
window.OfflineSystem = {
  getFiche: (id) => offlineSystem?.getFichFromDB(id),
  getAllFiches: () => offlineSystem?.getAllFichesFromDB(),
  sync: () => offlineSystem?.syncPending(),
  isOnline: () => navigator.onLine,
};

console.log('✅ Offline System v4 chargé');
