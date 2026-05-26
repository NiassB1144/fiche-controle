/**
 * Système complet de synchronisation offline
 * Gère IndexedDB, localStorage, service workers et sync API
 */

import type { FicheControle, SyncQueue } from './offline-types';

// ============================================================
// Configuration
// ============================================================
const DB_NAME = 'FicheControleDB';
const DB_VERSION = 3;
const STORES = {
  FICHES: 'fiches',
  SYNC_QUEUE: 'sync_queue',
  METADATA: 'metadata',
  USERS: 'users',
  CACHE: 'cache',
};

// ============================================================
// Types
// ============================================================
interface OfflineConfig {
  enableOffline: boolean;
  enableServiceWorker: boolean;
  syncInterval: number;
  maxQueueSize: number;
  maxStorageSize: number;
}

interface SyncStatus {
  isSyncing: boolean;
  lastSync: Date | null;
  pendingCount: number;
  failedCount: number;
  error: string | null;
}

// ============================================================
// OfflineManager
// ============================================================
export class OfflineManager {
  private db: IDBDatabase | null = null;
  private config: OfflineConfig;
  private syncStatus: SyncStatus;
  private syncWorker: Worker | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor(config: Partial<OfflineConfig> = {}) {
    this.config = {
      enableOffline: true,
      enableServiceWorker: true,
      syncInterval: 60000, // 1 min
      maxQueueSize: 1000,
      maxStorageSize: 50 * 1024 * 1024, // 50 MB
      ...config,
    };

    this.syncStatus = {
      isSyncing: false,
      lastSync: null,
      pendingCount: 0,
      failedCount: 0,
      error: null,
    };
  }

  // ============================================================
  // Initialisation
  // ============================================================
  async initialize(): Promise<void> {
    if (!this.config.enableOffline) return;

    try {
      // Initialiser IndexedDB
      await this.initIndexedDB();

      // Initialiser Service Worker
      if (this.config.enableServiceWorker && 'serviceWorker' in navigator) {
        this.registerServiceWorker();
      }

      // Démarrer le sync périodique
      this.startPeriodicSync();

      this.emit('initialized', null);
    } catch (error) {
      console.error('Erreur initialisation offline:', error);
      this.syncStatus.error = error instanceof Error ? error.message : 'Erreur inconnue';
      this.emit('error', error);
    }
  }

  private initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Fiches contrôle
        if (!db.objectStoreNames.contains(STORES.FICHES)) {
          const store = db.createObjectStore(STORES.FICHES, { keyPath: 'id' });
          store.createIndex('inspecteur', 'inspecteur', { unique: false });
          store.createIndex('date', 'date_controle', { unique: false });
          store.createIndex('local_id', 'local_id', { unique: true });
        }

        // Queue de synchronisation
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const store = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
        }

        // Metadata
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
        }

        // Users
        if (!db.objectStoreNames.contains(STORES.USERS)) {
          const store = db.createObjectStore(STORES.USERS, { keyPath: 'id' });
          store.createIndex('email', 'email', { unique: true });
        }

        // Cache
        if (!db.objectStoreNames.contains(STORES.CACHE)) {
          const store = db.createObjectStore(STORES.CACHE, { keyPath: 'key' });
          store.createIndex('expires', 'expires', { unique: false });
        }
      };
    });
  }

  private registerServiceWorker(): void {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker enregistré:', registration);
        // Écouter les messages du SW
        navigator.serviceWorker.onmessage = (event) => {
          this.handleServiceWorkerMessage(event.data);
        };
      })
      .catch((error) => {
        console.warn('Service Worker non disponible:', error);
      });
  }

  private startPeriodicSync(): void {
    // Sync au démarrage
    this.sync();

    // Sync périodique
    setInterval(() => {
      if (navigator.onLine) {
        this.sync();
      }
    }, this.config.syncInterval);

    // Sync quand la connexion revient
    window.addEventListener('online', () => {
      console.log('Connexion rétablie');
      this.sync();
    });

    window.addEventListener('offline', () => {
      console.log('Mode offline');
      this.syncStatus.error = 'Pas de connexion réseau';
      this.emit('offline', null);
    });
  }

  // ============================================================
  // CRUD Fiches
  // ============================================================
  async saveFiche(fiche: FicheControle): Promise<string> {
    if (!this.db) throw new Error('DB non initialisée');

    const id = fiche.id || this.generateLocalId();
    const localId = fiche.local_id || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const data = {
      ...fiche,
      id,
      local_id: localId,
      updated_at: new Date(),
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.FICHES], 'readwrite');
      const store = tx.objectStore(STORES.FICHES);
      const request = store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.addToSyncQueue('save', data);
        this.emit('fiche-saved', data);
        resolve(id);
      };
    });
  }

  async getFiche(id: string): Promise<FicheControle | undefined> {
    if (!this.db) throw new Error('DB non initialisée');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.FICHES], 'readonly');
      const store = tx.objectStore(STORES.FICHES);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async deleteFiche(id: string): Promise<void> {
    if (!this.db) throw new Error('DB non initialisée');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.FICHES], 'readwrite');
      const store = tx.objectStore(STORES.FICHES);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.addToSyncQueue('delete', { id });
        this.emit('fiche-deleted', { id });
        resolve();
      };
    });
  }

  async getAllFiches(inspecteur?: string): Promise<FicheControle[]> {
    if (!this.db) throw new Error('DB non initialisée');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.FICHES], 'readonly');
      const store = tx.objectStore(STORES.FICHES);

      let request: IDBRequest;
      if (inspecteur) {
        const index = store.index('inspecteur');
        request = index.getAll(inspecteur);
      } else {
        request = store.getAll();
      }

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  // ============================================================
  // Queue de synchronisation
  // ============================================================
  private addToSyncQueue(action: 'save' | 'delete' | 'update', data: any): void {
    if (!this.db) return;

    const tx = this.db.transaction([STORES.SYNC_QUEUE], 'readwrite');
    const store = tx.objectStore(STORES.SYNC_QUEUE);

    store.add({
      action,
      data,
      status: 'pending',
      created_at: new Date(),
      attempts: 0,
    });
  }

  private async getQueueItems(status = 'pending'): Promise<SyncQueue[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.SYNC_QUEUE], 'readonly');
      const store = tx.objectStore(STORES.SYNC_QUEUE);
      const index = store.index('status');
      const request = index.getAll(status);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  private async updateQueueItem(id: number, status: string, error?: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.SYNC_QUEUE], 'readwrite');
      const store = tx.objectStore(STORES.SYNC_QUEUE);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const item = request.result;
        if (item) {
          item.status = status;
          if (error) item.error = error;
          item.updated_at = new Date();
          const updateRequest = store.put(item);
          updateRequest.onerror = () => reject(updateRequest.error);
          updateRequest.onsuccess = () => resolve();
        }
      };
    });
  }

  // ============================================================
  // Synchronisation
  // ============================================================
  async sync(): Promise<void> {
    if (this.syncStatus.isSyncing || !navigator.onLine) return;

    this.syncStatus.isSyncing = true;
    this.emit('sync-start', null);

    try {
      const items = await this.getQueueItems('pending');
      this.syncStatus.pendingCount = items.length;

      for (const item of items) {
        try {
          await this.syncItem(item);
          await this.updateQueueItem(item.id, 'synced');
        } catch (error) {
          item.attempts = (item.attempts || 0) + 1;
          if (item.attempts >= 3) {
            await this.updateQueueItem(
              item.id,
              'failed',
              error instanceof Error ? error.message : 'Erreur inconnue'
            );
            this.syncStatus.failedCount++;
          }
        }
      }

      this.syncStatus.lastSync = new Date();
      this.syncStatus.error = null;
      this.emit('sync-complete', { items: items.length });
    } catch (error) {
      this.syncStatus.error = error instanceof Error ? error.message : 'Erreur sync';
      this.emit('sync-error', error);
    } finally {
      this.syncStatus.isSyncing = false;
    }
  }

  private async syncItem(item: SyncQueue): Promise<void> {
    const response = await fetch('/api/sync/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: item.action,
        data: item.data,
      }),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }

    const result = await response.json();
    // Mettre à jour l'ID si créé côté serveur
    if (item.action === 'save' && result.id && !item.data.id) {
      const fiche = await this.getFiche(item.data.local_id);
      if (fiche) {
        fiche.id = result.id;
        await this.saveFiche(fiche);
      }
    }
  }

  private handleServiceWorkerMessage(data: any): void {
    if (data.type === 'CACHE_UPDATED') {
      this.emit('cache-updated', data.payload);
    } else if (data.type === 'SYNC_COMPLETE') {
      this.sync();
    }
  }

  // ============================================================
  // Metadata & Cache
  // ============================================================
  async setMetadata(key: string, value: any): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.METADATA], 'readwrite');
      const store = tx.objectStore(STORES.METADATA);
      const request = store.put({ key, value, updated_at: new Date() });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getMetadata(key: string): Promise<any> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.METADATA], 'readonly');
      const store = tx.objectStore(STORES.METADATA);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result?.value);
    });
  }

  async setCacheItem(key: string, value: any, ttl = 3600000): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.CACHE], 'readwrite');
      const store = tx.objectStore(STORES.CACHE);
      const request = store.put({
        key,
        value,
        expires: Date.now() + ttl,
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getCacheItem(key: string): Promise<any> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.CACHE], 'readonly');
      const store = tx.objectStore(STORES.CACHE);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const item = request.result;
        if (item && item.expires > Date.now()) {
          resolve(item.value);
        } else {
          resolve(null);
        }
      };
    });
  }

  // ============================================================
  // Status & Events
  // ============================================================
  getStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any): void {
    this.eventListeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  // ============================================================
  // Utilitaires
  // ============================================================
  private generateLocalId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async clearAll(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(Object.values(STORES), 'readwrite');

      Object.values(STORES).forEach((store) => {
        const request = tx.objectStore(store).clear();
        request.onerror = () => reject(request.error);
      });

      tx.oncomplete = () => resolve();
    });
  }

  async getStorageSize(): Promise<number> {
    if (!navigator.storage || !navigator.storage.estimate) return 0;

    const estimate = await navigator.storage.estimate();
    return estimate.usage || 0;
  }
}

// Singleton
let offlineManager: OfflineManager | null = null;

export function initOfflineManager(config?: Partial<OfflineConfig>): OfflineManager {
  if (!offlineManager) {
    offlineManager = new OfflineManager(config);
  }
  return offlineManager;
}

export function getOfflineManager(): OfflineManager {
  if (!offlineManager) {
    throw new Error('OfflineManager not initialized');
  }
  return offlineManager;
}
