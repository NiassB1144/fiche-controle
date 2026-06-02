/**
 * Gestion complète du mode offline pour Django
 * Permet: voir détails, modifier, supprimer en offline
 */

(function() {
  'use strict';

  // ============================================================================
  // OfflineDB - Gestion des fiches en IndexedDB
  // ============================================================================

  class OfflineDB {
    constructor() {
      this.db = null;
    }

    async init() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open('FicheControleDB', 3);

        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          this.db = req.result;
          resolve();
        };

        req.onupgradeneeded = (event) => {
          const db = event.target.result;

          // Fiches
          if (!db.objectStoreNames.contains('fiches')) {
            const store = db.createObjectStore('fiches', { keyPath: 'id' });
            store.createIndex('local_id', 'local_id', { unique: false });
          }

          // Queue sync
          if (!db.objectStoreNames.contains('sync_queue')) {
            const store = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
            store.createIndex('status', 'status');
          }
        };
      });
    }

    // Sauvegarder une fiche
    async saveFiche(fiche) {
      if (!this.db) throw new Error('DB non initialisée');

      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(['fiches'], 'readwrite');
        const store = tx.objectStore('fiches');
        const req = store.put(fiche);

        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          this.addToQueue('save', fiche);
          resolve(fiche.id);
        };
      });
    }

    // Récupérer une fiche
    async getFiche(id) {
      if (!this.db) return null;

      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(['fiches'], 'readonly');
        const store = tx.objectStore('fiches');
        const req = store.get(Number(id));

        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result);
      });
    }

    // Récupérer toutes les fiches
    async getAllFiches() {
      if (!this.db) return [];

      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(['fiches'], 'readonly');
        const store = tx.objectStore('fiches');
        const req = store.getAll();

        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result || []);
      });
    }

    // Supprimer une fiche
    async deleteFiche(id) {
      if (!this.db) throw new Error('DB non initialisée');

      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(['fiches'], 'readwrite');
        const store = tx.objectStore('fiches');
        const req = store.delete(Number(id));

        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          this.addToQueue('delete', { id });
          resolve();
        };
      });
    }

    // Ajouter à la queue de sync
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
    }

    // Récupérer items à synchroniser
    async getQueueItems() {
      if (!this.db) return [];

      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(['sync_queue'], 'readonly');
        const store = tx.objectStore('sync_queue');
        const index = store.index('status');
        const req = index.getAll('pending');

        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result || []);
      });
    }

    // Marquer item comme synced
    async markAsSynced(queueId) {
      if (!this.db) return;

      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(['sync_queue'], 'readwrite');
        const store = tx.objectStore('sync_queue');
        const req = store.get(queueId);

        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const item = req.result;
          if (item) {
            item.status = 'synced';
            store.put(item);
          }
          resolve();
        };
      });
    }
  }

  // ============================================================================
  // OfflineUIManager - UI + Interactions offline
  // ============================================================================

  class OfflineUIManager {
    constructor() {
      this.db = new OfflineDB();
      this.indicator = null;
      this.status = {
        isOnline: navigator.onLine,
        isSyncing: false,
        pendingCount: 0,
        isOfflineMode: false,
      };
    }

    async init() {
      try {
        await this.db.init();

        // Créer l'indicateur
        this.createIndicator();

        // Écouter les événements
        window.addEventListener('online', () => this.updateStatus());
        window.addEventListener('offline', () => this.updateStatus());

        // Sync toutes les minutes
        setInterval(() => this.checkPendingCount(), 60000);

        // Écouter les messages du Service Worker
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data.type === 'FICHE_SYNCED') {
              this.onFicheSynced(event.data.payload);
            }
          });
        }

        // Initial status
        this.updateStatus();

        // Intercepter les clics sur les liens de détails
        this.interceptDetailLinks();

        console.log('✓ Offline manager initialisé');
      } catch (error) {
        console.error('Erreur init offline:', error);
      }
    }

    createIndicator() {
      const html = `
        <div id="sync-indicator" style="
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          padding: 10px;
          background: #10b981;
          color: white;
          text-align: center;
          font-size: 14px;
          z-index: 9999;
          transition: background-color 0.3s;
          display: none;
        ">
          <span id="sync-message">Synchronisation...</span>
          <button id="sync-details" style="
            margin-left: 10px;
            padding: 4px 8px;
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            border-radius: 3px;
            cursor: pointer;
          ">Détails</button>
        </div>

        <div id="sync-panel" style="
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          z-index: 9998;
          display: none;
          min-width: 300px;
          font-size: 13px;
          max-height: 400px;
          overflow-y: auto;
        ">
          <h4 style="margin: 0 0 10px 0;">Synchronisation</h4>
          <div id="sync-status-details" style="line-height: 1.8; margin-bottom: 10px;"></div>
          <button id="sync-force" style="
            width: 100%;
            padding: 6px 12px;
            background: #0ea5e9;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
          ">Synchroniser maintenant</button>
        </div>
      `;

      const container = document.createElement('div');
      container.innerHTML = html;
      document.body.appendChild(container);

      this.indicator = document.getElementById('sync-indicator');

      document.getElementById('sync-details').addEventListener('click', () => {
        const panel = document.getElementById('sync-panel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      });

      document.getElementById('sync-force').addEventListener('click', () => {
        this.forceSync();
      });
    }

    updateStatus() {
      const wasOnline = this.status.isOnline;
      this.status.isOnline = navigator.onLine;
      this.status.isOfflineMode = !navigator.onLine;

      if (!this.status.isOnline) {
        this.indicator.style.display = 'block';
        this.indicator.style.background = '#f59e0b';
        this.indicator.textContent = '📡 Mode offline - Les modifications seront synchronisées automatiquement';
      } else if (wasOnline !== this.status.isOnline) {
        this.indicator.style.display = 'block';
        this.indicator.style.background = '#10b981';
        this.indicator.textContent = '✓ Connexion rétablie - Synchronisation...';

        setTimeout(() => {
          this.indicator.style.display = 'none';
        }, 3000);

        this.forceSync();
      }

      this.updateDetails();
    }

    updateDetails() {
      const details = document.getElementById('sync-status-details');
      if (!details) return;

      const statusText = this.status.isOnline ? '🟢 En ligne' : '🔴 Hors ligne';
      const syncText = this.status.isSyncing ? '🔄 Synchronisation...' : '✓ À jour';

      details.innerHTML = `
        <div><strong>Connexion:</strong> ${statusText}</div>
        <div><strong>Statut:</strong> ${syncText}</div>
        <div><strong>En attente:</strong> ${this.status.pendingCount}</div>
      `;
    }

    async checkPendingCount() {
      try {
        const items = await this.db.getQueueItems();
        this.status.pendingCount = items.length;
        this.updateDetails();
      } catch (error) {
        console.error('Erreur check pending:', error);
      }
    }

    async forceSync() {
      if (!navigator.onLine || !('serviceWorker' in navigator)) {
        return;
      }

      this.status.isSyncing = true;
      this.updateDetails();

      try {
        const reg = await navigator.serviceWorker.ready;
        reg.active.postMessage({ type: 'FORCE_SYNC' });

        setTimeout(() => {
          this.status.isSyncing = false;
          this.checkPendingCount();
        }, 2000);
      } catch (error) {
        console.error('Erreur force sync:', error);
        this.status.isSyncing = false;
      }
    }

    onFicheSynced(payload) {
      console.log('✓ Fiche synchronisée:', payload);
      this.checkPendingCount();
    }

    // ========== Interception liens détails ==========

    interceptDetailLinks() {
      document.addEventListener('click', async (e) => {
        const link = e.target.closest('a[href*="/inspection/fiche/"][href*="/detail/"]');
        if (!link) return;

        // Si offline, charger depuis IndexedDB
        if (!navigator.onLine) {
          e.preventDefault();
          const ficheId = this.extractFicheIdFromURL(link.href);
          if (ficheId) {
            await this.showDetailOffline(ficheId);
          }
        }
      });
    }

    extractFicheIdFromURL(url) {
      const match = url.match(/\/fiche\/(\d+)\//);
      return match ? parseInt(match[1]) : null;
    }

    async showDetailOffline(ficheId) {
      try {
        const fiche = await this.db.getFiche(ficheId);
        if (!fiche) {
          alert('Fiche non trouvée en cache');
          return;
        }

        // Créer une modal avec les détails
        this.showFicheModal(fiche);
      } catch (error) {
        console.error('Erreur affichage détails:', error);
        alert('Erreur: ' + error.message);
      }
    }

    showFicheModal(fiche) {
      const html = `
        <div id="fiche-modal-overlay" style="
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            background: white;
            border-radius: 8px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            padding: 20px;
            position: relative;
          ">
            <button onclick="document.getElementById('fiche-modal-overlay').remove()" style="
              position: absolute;
              top: 10px;
              right: 10px;
              background: none;
              border: none;
              font-size: 24px;
              cursor: pointer;
            ">×</button>

            <h2 style="margin-top: 0;">Fiche: ${this.escapeHtml(fiche.entreprise || 'Sans nom')}</h2>

            <div style="margin-bottom: 20px;">
              <p><strong>Date contrôle:</strong> ${fiche.date_controle || 'N/A'}</p>
              <p><strong>Lieu:</strong> ${this.escapeHtml(fiche.lieu || 'N/A')}</p>
              <p><strong>Adresse:</strong> ${this.escapeHtml(fiche.adresse || 'N/A')}</p>
              <p><strong>Téléphone:</strong> ${this.escapeHtml(fiche.telephone || 'N/A')}</p>
              <p><strong>Email:</strong> ${this.escapeHtml(fiche.email_entreprise || 'N/A')}</p>
              <p><strong>Statut:</strong> ${this.escapeHtml(fiche.statut || 'N/A')}</p>
            </div>

            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
              ${!navigator.onLine ? `
                <p style="color: #f59e0b; margin-bottom: 10px;">
                  📡 Mode offline - Les modifications seront synchronisées quand vous serez en ligne
                </p>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
                  padding: 8px 16px;
                  background: #0ea5e9;
                  color: white;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                ">Fermer</button>
              ` : `
                <a href="${window.location.origin}/inspection/fiche/${fiche.id}/detail/" style="
                  padding: 8px 16px;
                  background: #0ea5e9;
                  color: white;
                  border: none;
                  border-radius: 4px;
                  text-decoration: none;
                  display: inline-block;
                ">Modifier</a>
              `}
            </div>
          </div>
        </div>
      `;

      const container = document.createElement('div');
      container.innerHTML = html;
      document.body.appendChild(container);
    }

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  }

  // ============================================================================
  // Initialisation
  // ============================================================================

  let uiManager;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      uiManager = new OfflineUIManager();
      uiManager.init();
    });
  } else {
    uiManager = new OfflineUIManager();
    uiManager.init();
  }

  window.OfflineManager = {
    getStatus: () => uiManager?.status,
    forceSync: () => uiManager?.forceSync(),
    checkPending: () => uiManager?.checkPendingCount(),
    db: uiManager?.db,
  };

  console.log('✓ Offline manager (v2 - avec détails) initialisé');
})();
