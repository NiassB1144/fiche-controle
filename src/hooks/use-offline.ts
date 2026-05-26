import { useEffect, useState, useCallback } from 'react';
import { initOfflineManager, getOfflineManager } from '@/lib/offline-sync';
import type { FicheControle, SyncStatus } from '@/lib/offline-types';

/**
 * Hook pour gérer le mode offline
 */
export function useOfflineManager(config = {}) {
  const [isReady, setIsReady] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSync: null,
    pendingCount: 0,
    failedCount: 0,
    error: null,
  });

  // Initialisation
  useEffect(() => {
    const manager = initOfflineManager(config);

    manager.initialize().then(() => {
      setIsReady(true);
      setSyncStatus(manager.getStatus());

      // Écouter les événements
      manager.on('sync-complete', () => {
        setSyncStatus(manager.getStatus());
      });

      manager.on('sync-error', (error) => {
        setSyncStatus(manager.getStatus());
      });

      manager.on('offline', () => {
        setIsOnline(false);
      });
    });

    // Écouter les changements de connectivité
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [config]);

  const manager = getOfflineManager();

  const saveFiche = useCallback(
    async (fiche: FicheControle): Promise<string> => {
      if (!isReady) throw new Error('Offline manager not ready');
      return manager.saveFiche(fiche);
    },
    [isReady]
  );

  const getFiche = useCallback(
    async (id: string): Promise<FicheControle | undefined> => {
      if (!isReady) return undefined;
      return manager.getFiche(id);
    },
    [isReady]
  );

  const deleteFiche = useCallback(
    async (id: string) => {
      if (!isReady) throw new Error('Offline manager not ready');
      return manager.deleteFiche(id);
    },
    [isReady]
  );

  const getAllFiches = useCallback(
    async (inspecteur?: string): Promise<FicheControle[]> => {
      if (!isReady) return [];
      return manager.getAllFiches(inspecteur);
    },
    [isReady]
  );

  const sync = useCallback(async () => {
    if (!isReady) throw new Error('Offline manager not ready');
    return manager.sync();
  }, [isReady]);

  return {
    isReady,
    isOnline,
    syncStatus,
    saveFiche,
    getFiche,
    deleteFiche,
    getAllFiches,
    sync,
  };
}

/**
 * Hook pour tracker une fiche spécifique
 */
export function useFiche(id?: string) {
  const { getFiche, saveFiche, deleteFiche, isReady } = useOfflineManager();
  const [fiche, setFiche] = useState<FicheControle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Charger la fiche
  useEffect(() => {
    if (!id || !isReady) return;

    const load = async () => {
      try {
        setLoading(true);
        const data = await getFiche(id);
        setFiche(data || null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Erreur chargement'));
        setFiche(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, isReady, getFiche]);

  const save = useCallback(
    async (data: Partial<FicheControle>) => {
      try {
        setLoading(true);
        const updated = { ...fiche, ...data } as FicheControle;
        const newId = await saveFiche(updated);
        setFiche(updated);
        return newId;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Erreur sauvegarde'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fiche, saveFiche]
  );

  const delete_ = useCallback(async () => {
    if (!id) throw new Error('Pas d\'ID pour supprimer');
    try {
      setLoading(true);
      await deleteFiche(id);
      setFiche(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erreur suppression'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [id, deleteFiche]);

  return { fiche, loading, error, save, delete: delete_ };
}

/**
 * Hook pour afficher l'état de synchronisation
 */
export function useSyncStatus() {
  const { syncStatus, isOnline } = useOfflineManager();

  const getStatusMessage = () => {
    if (!isOnline) return '📡 Mode offline';
    if (syncStatus.isSyncing) return '🔄 Synchronisation...';
    if (syncStatus.error) return `❌ ${syncStatus.error}`;
    if (syncStatus.lastSync) {
      const timeAgo = getTimeAgo(syncStatus.lastSync);
      return `✓ Synchro ${timeAgo}`;
    }
    return '⏳ En attente...';
  };

  const getStatusColor = () => {
    if (!isOnline) return 'amber';
    if (syncStatus.isSyncing) return 'blue';
    if (syncStatus.error) return 'red';
    return 'green';
  };

  return {
    ...syncStatus,
    isOnline,
    message: getStatusMessage(),
    color: getStatusColor(),
  };
}

// Utilitaire
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'à l\'instant';
  if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)}h`;
  return `il y a ${Math.floor(seconds / 86400)}j`;
}
