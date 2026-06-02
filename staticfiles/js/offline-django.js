/**
 * Gestion du mode offline pour Django
 * Intégration simple avec le Service Worker existant
 */

(function() {
  'use strict';

  // ============================================================================
  // OfflineUIManager - Gère l'affichage du statut offline
  // ============================================================================

  class OfflineUIManager {
    constructor() {
      this.indicator = null;
      this.status = {
        isOnline: navigator.onLine,
        isSyncing: false,
        pendingCount: 0,
      };
    }

    async init() {
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
    }

    createIndicator() {
      // Créer le HTML
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
          min-width: 250px;
          font-size: 13px;
        ">
          <h4 style="margin: 0 0 10px 0;">Synchronisation</h4>
          <div id="sync-status-details" style="line-height: 1.8;"></div>
          <button id="sync-force" style="
            margin-top: 10px;
            padding: 6px 12px;
            background: #0ea5e9;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          ">Synchroniser maintenant</button>
        </div>
      `;

      const container = document.createElement('div');
      container.innerHTML = html;
      document.body.appendChild(container);

      this.indicator = document.getElementById('sync-indicator');

      // Event listeners
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

      if (!this.status.isOnline) {
        // Mode offline
        this.indicator.style.display = 'block';
        this.indicator.style.background = '#f59e0b';
        this.indicator.textContent = '📡 Mode offline - Les modifications seront synchronisées quand la connexion sera rétablie';
      } else if (wasOnline !== this.status.isOnline) {
        // Vient de revenir online
        this.indicator.style.display = 'block';
        this.indicator.style.background = '#10b981';
        this.indicator.textContent = '✓ Connexion rétablie - Synchronisation en cours...';

        // Cacher l'indicateur après 3s
        setTimeout(() => {
          this.indicator.style.display = 'none';
        }, 3000);

        // Forcer une sync
        this.forceSync();
      }

      this.updateDetails();
    }

    async checkPendingCount() {
      if (!navigator.onLine || !('serviceWorker' in navigator)) return;

      try {
        const reg = await navigator.serviceWorker.ready;
        const channel = new MessageChannel();

        reg.active.postMessage(
          { type: 'GET_PENDING_COUNT' },
          [channel.port2]
        );

        channel.port1.onmessage = (event) => {
          this.status.pendingCount = event.data.pending || 0;
          this.updateDetails();
        };
      } catch (error) {
        console.error('Erreur check pending:', error);
      }
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

    async forceSync() {
      if (!navigator.onLine || !('serviceWorker' in navigator)) {
        alert('Impossible de synchroniser en mode offline');
        return;
      }

      this.status.isSyncing = true;
      this.updateDetails();

      try {
        const reg = await navigator.serviceWorker.ready;
        reg.active.postMessage({ type: 'FORCE_SYNC' });

        // Attendre la sync
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
      // Optionnel: recharger la page ou mettre à jour l'UI
      this.checkPendingCount();
    }
  }

  // ============================================================================
  // Initialisation
  // ============================================================================

  let uiManager;

  // Attendre que le DOM soit prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      uiManager = new OfflineUIManager();
      uiManager.init();
    });
  } else {
    uiManager = new OfflineUIManager();
    uiManager.init();
  }

  // Exposer globalement
  window.OfflineManager = {
    getStatus: () => uiManager.status,
    forceSync: () => uiManager.forceSync(),
    checkPending: () => uiManager.checkPendingCount(),
  };

  console.log('✓ Offline manager initialisé');
})();
