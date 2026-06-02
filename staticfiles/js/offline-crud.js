/**
 * OFFLINE CRUD OPERATIONS
 * Gestion complète des fiches offline
 * Architecture: IndexedDB → sync_queue → Server (async)
 */

(function(window) {
  'use strict';

  const DB_NAME = 'ficheControleDB';
  const DB_VERSION = 5;
  const STORE = 'fiches_locales';
  const SYNC_QUEUE = 'sync_queue';

  const OfflineCRUD = {

    // ========================================================================
    // UTILITIES
    // ========================================================================

    async _getDB() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE)) {
            const store = db.createObjectStore(STORE, { keyPath: 'local_id' });
            store.createIndex('synced', 'synced', { unique: false });
            store.createIndex('server_pk', 'server_pk', { unique: false });
          }
          if (!db.objectStoreNames.contains(SYNC_QUEUE)) {
            db.createObjectStore(SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
          }
        };
      });
    },

    // ========================================================================
    // READ OPERATIONS
    // ========================================================================

    /**
     * Récupère une fiche offline par local_id
     * @param {number} local_id - Timestamp identifiant la fiche
     * @returns {Object|null} - Fiche ou null
     */
    async getFiche(local_id) {
      const db = await this._getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE], 'readonly');
        const store = tx.objectStore(STORE);
        const req = store.get(parseInt(local_id));
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    },

    /**
     * Récupère toutes les fiches offline
     * @returns {Array} - Tableau des fiches
     */
    async getAllFiches() {
      const db = await this._getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE], 'readonly');
        const store = tx.objectStore(STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    },

    /**
     * Récupère le statut de synchronisation d'une fiche
     * @param {number} local_id
     * @returns {Object} - {synced: bool, server_pk: int|null}
     */
    async getStatus(local_id) {
      const fiche = await this.getFiche(local_id);
      if (!fiche) {
        return { synced: false, server_pk: null, exists: false };
      }
      return {
        synced: fiche.synced || false,
        server_pk: fiche.server_pk || null,
        exists: true,
        local_id: fiche.local_id
      };
    },

    // ========================================================================
    // CREATE OPERATIONS
    // ========================================================================

    /**
     * Crée une nouvelle fiche offline
     * @param {Object} data - Données de la fiche (sans local_id)
     * @returns {number} - local_id créé
     */
    async createFiche(data) {
      const db = await this._getDB();
      
      const fiche = {
        local_id: Date.now(),
        synced: false,
        server_pk: null,
        created_offline_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...data
      };

      return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE, SYNC_QUEUE], 'readwrite');
        
        // Sauvegarder fiche
        const store = tx.objectStore(STORE);
        const putReq = store.put(fiche);
        
        // Ajouter à queue sync
        const queue = tx.objectStore(SYNC_QUEUE);
        queue.add({
          action: 'create',
          local_id: fiche.local_id,
          data: fiche,
          status: 'pending',
          created_at: new Date().toISOString(),
          attempts: 0
        });

        tx.oncomplete = () => resolve(fiche.local_id);
        tx.onerror = () => reject(tx.error);
      });
    },

    // ========================================================================
    // UPDATE OPERATIONS
    // ========================================================================

    /**
     * Met à jour une fiche offline
     * @param {number} local_id - Identifiant de la fiche
     * @param {Object} updates - Champs à mettre à jour
     * @returns {Object} - Fiche mise à jour
     */
    async updateFiche(local_id, updates) {
      const db = await this._getDB();
      const existing = await this.getFiche(local_id);

      if (!existing) {
        throw new Error(`Fiche ${local_id} non trouvée`);
      }

      const updated = {
        ...existing,
        ...updates,
        local_id: existing.local_id,
        synced: false, // Re-marquer pour sync après modification
        updated_at: new Date().toISOString()
      };

      return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE, SYNC_QUEUE], 'readwrite');

        // Mettre à jour fiche
        const store = tx.objectStore(STORE);
        store.put(updated);

        // Ajouter à queue sync
        const queue = tx.objectStore(SYNC_QUEUE);
        queue.add({
          action: 'update',
          local_id: local_id,
          data: updated,
          status: 'pending',
          created_at: new Date().toISOString(),
          attempts: 0
        });

        tx.oncomplete = () => resolve(updated);
        tx.onerror = () => reject(tx.error);
      });
    },

    /**
     * Marque une fiche comme étant en cours de modification
     * (sans la sauvegarder immédiatement)
     * @param {number} local_id
     * @param {Object} updates
     * @returns {Object}
     */
    async previewUpdates(local_id, updates) {
      const existing = await this.getFiche(local_id);
      if (!existing) {
        throw new Error(`Fiche ${local_id} non trouvée`);
      }
      return { ...existing, ...updates };
    },

    // ========================================================================
    // DELETE OPERATIONS
    // ========================================================================

    /**
     * Supprime une fiche offline
     * @param {number} local_id - Identifiant de la fiche
     * @returns {boolean} - true si succès
     */
    async deleteFiche(local_id) {
      const db = await this._getDB();
      const existing = await this.getFiche(local_id);

      if (!existing) {
        throw new Error(`Fiche ${local_id} non trouvée`);
      }

      return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE, SYNC_QUEUE], 'readwrite');

        // Supprimer fiche
        const store = tx.objectStore(STORE);
        store.delete(parseInt(local_id));

        // Ajouter à queue sync
        const queue = tx.objectStore(SYNC_QUEUE);
        queue.add({
          action: 'delete',
          local_id: local_id,
          data: { local_id: local_id, server_pk: existing.server_pk },
          status: 'pending',
          created_at: new Date().toISOString(),
          attempts: 0
        });

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    },

    // ========================================================================
    // BATCH OPERATIONS
    // ========================================================================

    /**
     * Récupère les fiches en attente de synchronisation
     * @returns {Array}
     */
    async getPendingSyncs() {
      const fiches = await this.getAllFiches();
      return fiches.filter(f => !f.synced);
    },

    /**
     * Compte les fiches non synchronisées
     * @returns {number}
     */
    async getPendingCount() {
      const pending = await this.getPendingSyncs();
      return pending.length;
    },

    /**
     * Marque une fiche comme synchronisée après succès du serveur
     * @param {number} local_id
     * @param {number} server_pk - ID Django du serveur
     * @returns {Object}
     */
    async markSynced(local_id, server_pk) {
      const fiche = await this.getFiche(local_id);
      if (!fiche) {
        throw new Error(`Fiche ${local_id} non trouvée`);
      }

      const updated = {
        ...fiche,
        synced: true,
        server_pk: server_pk,
        synced_at: new Date().toISOString()
      };

      const db = await this._getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE], 'readwrite');
        const store = tx.objectStore(STORE);
        store.put(updated);

        tx.oncomplete = () => resolve(updated);
        tx.onerror = () => reject(tx.error);
      });
    },

    /**
     * Marque une fiche pour suppression (après succès du serveur)
     * @param {number} local_id
     * @returns {boolean}
     */
    async markDeleted(local_id) {
      const db = await this._getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE], 'readwrite');
        const store = tx.objectStore(STORE);
        store.delete(parseInt(local_id));

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    },

    // ========================================================================
    // UTILITIES
    // ========================================================================

    /**
     * Exporte une fiche pour affichage/édition
     * Nettoie les champs non pertinents
     * @param {number} local_id
     * @returns {Object}
     */
    async exportFiche(local_id) {
      const fiche = await this.getFiche(local_id);
      if (!fiche) return null;

      // Copier tous les champs sauf les métadonnées internes
      const exported = {};
      for (const [key, value] of Object.entries(fiche)) {
        if (!['local_id', 'synced', 'server_pk', 'created_offline_at', 'updated_at', 'synced_at'].includes(key)) {
          exported[key] = value;
        }
      }
      return exported;
    },

    /**
     * Valide les données avant sauvegarde
     * @param {Object} data
     * @returns {Object} - {valid: bool, errors: []}
     */
    validateData(data) {
      const errors = [];

      if (!data.entreprise || !data.entreprise.trim()) {
        errors.push('Le nom de l\'entreprise est requis');
      }
      if (!data.date_controle) {
        errors.push('La date de contrôle est requise');
      }

      return {
        valid: errors.length === 0,
        errors: errors
      };
    }
  };

  // Exposer globalement
  window.OfflineCRUD = OfflineCRUD;

})(window);
