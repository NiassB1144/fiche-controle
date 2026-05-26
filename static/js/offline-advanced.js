/**
 * Système offline AVANCÉ pour Django
 * - Cache les pages de fiches quand visitées online
 * - Permet voir/modifier/supprimer en offline
 * - Auto-sync quand online
 */

(function() {
  'use strict';

  class OfflineApp {
    constructor() {
      this.db = null;
      this.isOnline = navigator.onLine;
    }

    async init() {
      try {
        await this.initDB();
        this.setupEventListeners();
        this.cacheCurrentFicheIfPresent();
        console.log('✓ Offline app initialisé');
      } catch (error) {
        console.error('Erreur init offline:', error);
      }
    }

    // ========== IndexedDB Setup ==========

    initDB() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open('FicheControleDB', 3);

        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          this.db = req.result;
          resolve();
        };

        req.onupgradeneeded = (event) => {
          const db = event.target.result;

          if (!db.objectStoreNames.contains('fiches')) {
            db.createObjectStore('fiches', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('sync_queue')) {
            const store = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
            store.createIndex('status', 'status');
          }
        };
      });
    }

    // ========== Caching ==========

    cacheCurrentFicheIfPresent() {
      // Extraire l'ID de la fiche depuis l'URL
      const match = window.location.pathname.match(/\/fiche\/(\d+)\//);
      if (!match) return;

      const ficheId = parseInt(match[1]);

      // Essayer de récupérer les données de la page
      const ficheData = this.extractFicheDataFromPage();
      if (ficheData) {
        ficheData.id = ficheId;
        this.saveFicheToDb(ficheData);
      }
    }

    extractFicheDataFromPage() {
      // Chercher les données de fiche dans la page (dataset, hidden inputs, etc.)
      const ficheScript = document.querySelector('script[type="application/json"][data-fiche]');
      if (ficheScript) {
        try {
          return JSON.parse(ficheScript.textContent);
        } catch (e) {
          console.warn('Erreur parsing fiche JSON:', e);
        }
      }

      // Alternative: chercher un formulaire
      const form = document.querySelector('form[data-fiche-id]');
      if (form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        data.id = parseInt(form.dataset.ficheId);
        return data;
      }

      return null;
    }

    saveFicheToDb(ficheData) {
      if (!this.db) return;

      const tx = this.db.transaction(['fiches'], 'readwrite');
      const store = tx.objectStore('fiches');

      store.put({
        ...ficheData,
        cached_at: new Date().toISOString(),
      });

      console.log('✓ Fiche cachée:', ficheData.id);
    }

    // ========== Offline Detection ==========

    setupEventListeners() {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());

      // Intercepter les soumissions de formulaires
      document.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    handleOnline() {
      console.log('✓ Vous êtes en ligne');
      this.isOnline = true;
      this.syncPendingItems();
    }

    handleOffline() {
      console.log('⚠️ Vous êtes hors ligne');
      this.isOnline = false;
    }

    // ========== Form Handling ==========

    handleFormSubmit(e) {
      // Si on est online, laisser passer
      if (this.isOnline) return;

      // Si c'est un formulaire de fiche, sauvegarder en offline
      const form = e.target;
      if (form.matches('[data-fiche-form]') || form.action.includes('/fiche/')) {
        this.handleFicheFormOffline(e, form);
      }
    }

    handleFicheFormOffline(e, form) {
      e.preventDefault();

      const formData = new FormData(form);
      const data = Object.fromEntries(formData);

      // Extraire l'ID si modification
      const match = form.action.match(/\/fiche\/(\d+)\//);
      if (match) {
        data.id = parseInt(match[1]);
      }

      this.saveFicheToDb(data);
      this.addToQueue('save', data);

      alert('✓ Fiche sauvegardée en offline (synchronisation en arrière-plan)');
    }

    // ========== Sync Queue ==========

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

    async syncPendingItems() {
      if (!this.db || !navigator.onLine) return;

      try {
        const tx = this.db.transaction(['sync_queue'], 'readonly');
        const store = tx.objectStore('sync_queue');
        const index = store.index('status');

        const items = await new Promise((resolve, reject) => {
          const req = index.getAll('pending');
          req.onerror = () => reject(req.error);
          req.onsuccess = () => resolve(req.result || []);
        });

        console.log(`🔄 Synchronisation de ${items.length} items...`);

        for (const item of items) {
          await this.syncItem(item);
        }

        console.log('✓ Synchronisation terminée');
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
          // Marquer comme synced
          const tx = this.db.transaction(['sync_queue'], 'readwrite');
          const store = tx.objectStore('sync_queue');
          item.status = 'synced';
          store.put(item);

          console.log(`✓ Item ${item.id} synchronisé`);
        } else {
          console.warn(`✗ Erreur sync item ${item.id}:`, response.status);
        }
      } catch (error) {
        console.error(`✗ Erreur sync item ${item.id}:`, error);
      }
    }

    getCSRFToken() {
      const name = 'csrftoken';
      let cookieValue = null;
      if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].trim();
          if (cookie.substring(0, name.length + 1) === name + '=') {
            cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
            break;
          }
        }
      }
      return cookieValue;
    }

    // ========== Getters ==========

    async getFiche(ficheId) {
      if (!this.db) return null;

      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(['fiches'], 'readonly');
        const store = tx.objectStore('fiches');
        const req = store.get(ficheId);

        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result);
      });
    }

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
  }

  // ============================================================================
  // Initialisation
  // ============================================================================

  let app;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      app = new OfflineApp();
      app.init();
    });
  } else {
    app = new OfflineApp();
    app.init();
  }

  // Exposer globalement
  window.OfflineApp = {
    getFiche: (id) => app?.getFiche(id),
    getAllFiches: () => app?.getAllFiches(),
    isOnline: () => navigator.onLine,
  };

  console.log('✓ Offline app (v3 - avancé) prêt');
})();
