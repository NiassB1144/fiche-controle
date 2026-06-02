/**
 * Gestionnaire offline en JavaScript vanilla pour Django
 * Pas de React, juste du JavaScript simple
 */

class OfflineManager {
  constructor() {
    this.db = null;
    this.isSyncing = false;
    this.queue = [];
    this.listeners = new Map();
    this.syncInterval = 60000; // 1 minute
  }

  async init() {
    try {
      // Enregistrer Service Worker
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.register('/static/js/sw.js');
        console.log('✓ Service Worker enregistré');
      }

      // Initialiser IndexedDB
      await this.initDB();

      // Démarrer sync périodique
      this.startPeriodicSync();

      // Écouter les changements de connexion
      window.addEventListener('online', () => this.onOnline());
      window.addEventListener('offline', () => this.onOffline());

      this.emit('initialized');
    } catch (error) {
      console.error('Erreur init offline:', error);
      this.emit('error', error);
    }
  }

  initDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('FicheControleDB', 2);

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
          store.createIndex('local_id', 'local_id', { unique: true });
        }

        // Queue
        if (!db.objectStoreNames.contains('sync_queue')) {
          const store = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
          store.createIndex('status', 'status');
        }
      };
    });
  }

  // ======== CRUD ========

  async saveFiche(data) {
    if (!this.db) throw new Error('DB non initialisée');

    const fiche = {
      ...data,
      local_id: data.local_id || `local_${Date.now()}`,
      updated_at: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['fiches'], 'readwrite');
      const store = tx.objectStore('fiches');
      const req = store.put(fiche);

      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        this.addToQueue('save', fiche);
        this.emit('fiche-saved', fiche);
        resolve(fiche.id || fiche.local_id);
      };
    });
  }

  async getFiche(id) {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['fiches'], 'readonly');
      const store = tx.objectStore('fiches');
      const req = store.get(id);

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

  async deleteFiche(id) {
    if (!this.db) throw new Error('DB non initialisée');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['fiches'], 'readwrite');
      const store = tx.objectStore('fiches');
      const req = store.delete(id);

      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        this.addToQueue('delete', { id });
        this.emit('fiche-deleted', { id });
        resolve();
      };
    });
  }

  // ======== Queue ========

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

  async updateQueueItem(id, status) {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['sync_queue'], 'readwrite');
      const store = tx.objectStore('sync_queue');
      const req = store.get(id);

      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const item = req.result;
        if (item) {
          item.status = status;
          item.updated_at = new Date().toISOString();
          const updateReq = store.put(item);
          updateReq.onerror = () => reject(updateReq.error);
          updateReq.onsuccess = () => resolve();
        }
      };
    });
  }

  // ======== Synchronisation ========

  async sync() {
    if (this.isSyncing || !navigator.onLine) return;

    this.isSyncing = true;
    this.emit('sync-start');

    try {
      const items = await this.getQueueItems();

      for (const item of items) {
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
            await this.updateQueueItem(item.id, 'synced');
            this.emit('sync-item-complete', { id: item.id });
          } else {
            item.attempts++;
            if (item.attempts >= 3) {
              await this.updateQueueItem(item.id, 'failed');
            }
          }
        } catch (error) {
          console.error('Erreur sync item:', error);
          item.attempts++;
          if (item.attempts >= 3) {
            await this.updateQueueItem(item.id, 'failed');
          }
        }
      }

      this.emit('sync-complete', { items: items.length });
    } catch (error) {
      console.error('Erreur sync:', error);
      this.emit('sync-error', error);
    } finally {
      this.isSyncing = false;
    }
  }

  startPeriodicSync() {
    // Sync au démarrage
    this.sync();

    // Sync périodique
    setInterval(() => {
      if (navigator.onLine) {
        this.sync();
      }
    }, this.syncInterval);
  }

  // ======== Événements ========

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Erreur event ${event}:`, error);
      }
    });
  }

  // ======== Handlers ========

  onOnline() {
    console.log('✓ Connexion rétablie');
    this.emit('online');
    this.sync();
  }

  onOffline() {
    console.log('⚠️ Mode offline');
    this.emit('offline');
  }

  // ======== Utilitaires ========

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

  isOnline() {
    return navigator.onLine;
  }

  getStatus() {
    return {
      isSyncing: this.isSyncing,
      isOnline: navigator.onLine,
    };
  }

  async clearAll() {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['fiches', 'sync_queue'], 'readwrite');

      tx.objectStore('fiches').clear();
      tx.objectStore('sync_queue').clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

// Singleton global
window.offlineManager = new OfflineManager();
window.offlineManager.init().catch(console.error);
