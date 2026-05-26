# Mode Offline - Documentation

## Vue d'ensemble

Le système offline de Fiche Contrôle offre une synchronisation complète sans connexion réseau. Les données sont stockées localement et synchronisées automatiquement quand la connexion est rétablie.

## Architecture

### Composants principaux

1. **OfflineManager** (`src/lib/offline-sync.ts`)
   - Gère IndexedDB pour le stockage local
   - File d'attente de synchronisation
   - Gestion des événements

2. **Service Worker** (`public/sw.js`)
   - Cache des assets statiques
   - Intercept des requêtes réseau
   - Synchronisation en arrière-plan

3. **API Django** (`inspection/api.py`)
   - Endpoints de synchronisation
   - Gestion des conflits

4. **Hooks React** (`src/hooks/use-offline.ts`)
   - `useOfflineManager()` - Accès au manager
   - `useFiche()` - Gestion d'une fiche
   - `useSyncStatus()` - État de synchronisation

## Utilisation

### Initialisation

```typescript
import { initOfflineManager } from '@/lib/offline-sync';

// Dans App.tsx
useEffect(() => {
  initOfflineManager({
    enableOffline: true,
    enableServiceWorker: true,
    syncInterval: 60000, // 1 min
  });
}, []);
```

### Sauvegarder une fiche

```typescript
const { saveFiche } = useOfflineManager();

const handleSave = async (data) => {
  const id = await saveFiche({
    ...data,
    inspecteur: 'user123',
    date_controle: '2024-01-15',
  });
  console.log('Fiche sauvegardée:', id);
};
```

### Récupérer des fiches

```typescript
const { getAllFiches } = useOfflineManager();

const fiches = await getAllFiches('inspecteur_id');
```

### Utiliser le hook useFiche

```typescript
const { fiche, save, delete: deleteFiche } = useFiche(ficheId);

// Modifier la fiche
await save({ entreprise: 'Nouvelle entreprise' });

// Supprimer la fiche
await deleteFiche();
```

### Afficher le statut de synchronisation

```typescript
import { SyncIndicator, SyncPanel } from '@/components/sync-indicator';

// Indicateur simple
<SyncIndicator position="top" />

// Panneau détaillé
<SyncPanel />
```

## Structure de données

### FicheControle

```typescript
interface FicheControle {
  id?: string;              // ID serveur
  local_id?: string;        // ID local pour offline
  inspecteur: string;
  entreprise: string;
  date_controle: string;
  statut: 'brouillon' | 'soumis';
  // ... autres champs
}
```

### Queue de synchronisation

```typescript
interface SyncQueue {
  id: number;
  action: 'save' | 'delete' | 'update';
  data: any;
  status: 'pending' | 'synced' | 'failed';
  created_at: Date;
  attempts: number;
  error?: string;
}
```

## Stratégies de cache

### Assets statiques
- **Stratégie**: Cache First
- **Mise à jour**: En arrière-plan
- **TTL**: Permanent jusqu'à cache busting

### API
- **Stratégie**: Network First
- **Fallback**: Cache offline
- **TTL**: 1 heure

### Images
- **Stratégie**: Cache First
- **TTL**: 7 jours

## Événements

```typescript
const manager = getOfflineManager();

// Lors de la synchronisation
manager.on('sync-start', () => {
  console.log('Sync commencée');
});

manager.on('sync-complete', ({ items }) => {
  console.log(`${items} éléments synchronisés`);
});

manager.on('sync-error', (error) => {
  console.error('Erreur sync:', error);
});

// État offline/online
manager.on('offline', () => {
  console.log('Mode offline activé');
});

// Modifications
manager.on('fiche-saved', (fiche) => {
  console.log('Fiche sauvegardée:', fiche);
});

manager.on('fiche-deleted', ({ id }) => {
  console.log('Fiche supprimée:', id);
});
```

## API Endpoints

### Synchronisation

**POST** `/api/sync/`
```json
{
  "action": "save|delete|update",
  "data": { /* fiche data */ }
}
```

Response:
```json
{
  "success": true,
  "id": "fiche_id",
  "local_id": "local_id",
  "data": { /* fiche data */ }
}
```

### Récupérer les fiches

**GET** `/api/fiches/?inspecteur=ID`
```json
{
  "success": true,
  "data": [ /* array of fiches */ ]
}
```

**GET** `/api/fiches/<id>/`
```json
{
  "success": true,
  "data": { /* fiche */ }
}
```

## Configuration

### OfflineConfig

```typescript
interface OfflineConfig {
  enableOffline: boolean;      // Activer/désactiver
  enableServiceWorker: boolean; // Service Worker
  syncInterval: number;         // Intervalle (ms)
  maxQueueSize: number;         // Taille max queue
  maxStorageSize: number;       // Taille max storage (50MB)
}
```

## Troubleshooting

### Service Worker ne s'enregistre pas

```javascript
// Vérifier la console
navigator.serviceWorker.getRegistrations()
  .then(regs => console.log(regs));

// Nettoyer
caches.delete('fiche-static-v1');
caches.delete('fiche-api-v1');
```

### IndexedDB plein

```typescript
const manager = getOfflineManager();
const size = await manager.getStorageSize();
console.log('Utilisé:', size / 1024 / 1024, 'MB');
```

### Forcer une synchronisation

```typescript
const manager = getOfflineManager();
await manager.sync();
```

### Vider le cache local

```typescript
const manager = getOfflineManager();
await manager.clearAll();
```

## Performance

- **IndexedDB**: Optimisé pour 1000+ fiches
- **Service Worker**: Lazy loading assets
- **Cache**: Stratégies adaptées au type
- **Sync**: Batch processing avec retry

## Sécurité

- Vérification d'authentification sur API
- Validation des données côté serveur
- CSRF protection via Django
- Pas de données sensibles en cache non chiffré

## Déploiement

1. Vérifier `public/sw.js` déployé
2. Configurer `CACHE_NAMES` si version change
3. Mettre à jour `public/manifest.json`
4. Activer HTTPS en production

## Support

- Testé sur Chrome, Firefox, Edge
- Mobile: iOS 13.4+, Android 7+
- Offline: Fonctionne sans connexion
- Sync: Fonctionne en arrière-plan
