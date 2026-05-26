import React, { useEffect, useState } from 'react';
import { useSyncStatus } from '@/hooks/use-offline';
import { AlertCircle, CheckCircle, Loader, Wifi, WifiOff } from 'lucide-react';

interface SyncIndicatorProps {
  showDetails?: boolean;
  position?: 'top' | 'bottom' | 'floating';
}

/**
 * Composant pour afficher l'état de synchronisation
 */
export function SyncIndicator({ showDetails = false, position = 'top' }: SyncIndicatorProps) {
  const syncStatus = useSyncStatus();

  const getIcon = () => {
    if (!syncStatus.isOnline) {
      return <WifiOff className="w-4 h-4" />;
    }
    if (syncStatus.isSyncing) {
      return <Loader className="w-4 h-4 animate-spin" />;
    }
    if (syncStatus.error) {
      return <AlertCircle className="w-4 h-4" />;
    }
    return <CheckCircle className="w-4 h-4" />;
  };

  const getBgColor = () => {
    if (!syncStatus.isOnline) return 'bg-amber-50';
    if (syncStatus.isSyncing) return 'bg-blue-50';
    if (syncStatus.error) return 'bg-red-50';
    return 'bg-green-50';
  };

  const getTextColor = () => {
    if (!syncStatus.isOnline) return 'text-amber-700';
    if (syncStatus.isSyncing) return 'text-blue-700';
    if (syncStatus.error) return 'text-red-700';
    return 'text-green-700';
  };

  const positionClasses = {
    top: 'fixed top-0 left-0 right-0 z-50',
    bottom: 'fixed bottom-0 left-0 right-0 z-50',
    floating: 'fixed bottom-4 right-4 z-50 rounded-full',
  };

  return (
    <div className={`${positionClasses[position]}`}>
      <div
        className={`
          ${position === 'floating' ? 'rounded-full p-3 shadow-lg' : 'px-4 py-2'}
          ${getBgColor()}
          flex items-center gap-2
          border-l-4 border-current
          ${getTextColor()}
          font-medium text-sm
        `}
      >
        {getIcon()}
        <span>{syncStatus.message}</span>
        
        {showDetails && syncStatus.pendingCount > 0 && (
          <span className="ml-auto text-xs opacity-75">
            {syncStatus.pendingCount} en attente
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Composant détaillé de synchronisation
 */
export function SyncPanel() {
  const syncStatus = useSyncStatus();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          px-4 py-2 rounded-lg font-medium text-sm
          flex items-center gap-2
          transition-colors
          ${
            syncStatus.isOnline
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
          }
        `}
      >
        {syncStatus.isOnline ? (
          <Wifi className="w-4 h-4" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        {isOpen ? 'Masquer' : 'Statut'} synchronisation
      </button>

      {isOpen && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-gray-600">Connexion</p>
              <p className="font-medium">
                {syncStatus.isOnline ? '🟢 En ligne' : '🔴 Hors ligne'}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Statut</p>
              <p className="font-medium">
                {syncStatus.isSyncing ? '🔄 Synchronisation...' : '✓ À jour'}
              </p>
            </div>
            <div>
              <p className="text-gray-600">En attente</p>
              <p className="font-medium">{syncStatus.pendingCount}</p>
            </div>
            <div>
              <p className="text-gray-600">Échoués</p>
              <p className="font-medium">{syncStatus.failedCount}</p>
            </div>
          </div>

          {syncStatus.lastSync && (
            <div className="text-xs text-gray-500 mt-2">
              Dernière sync: {syncStatus.lastSync.toLocaleTimeString()}
            </div>
          )}

          {syncStatus.error && (
            <div className="mt-2 p-2 bg-red-100 text-red-700 rounded text-sm">
              Erreur: {syncStatus.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Composant pour afficher un message offline
 */
export function OfflineNotice() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsVisible(true);
    const handleOnline = () => setIsVisible(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
      <WifiOff className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h3 className="font-medium text-amber-900">Mode offline activé</h3>
        <p className="text-sm text-amber-700 mt-1">
          Vous êtes actuellement hors ligne. Les modifications seront synchronisées automatiquement
          quand la connexion sera rétablie.
        </p>
      </div>
    </div>
  );
}
