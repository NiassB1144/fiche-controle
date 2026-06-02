# ⚡ QUICK REFERENCE - Offline-First v2

## Fichiers Clés

| Fichier | Rôle | Location |
|---------|------|----------|
| `offline-fiche.html` | Page CRUD offline | `public/` |
| `sw.js` | Service Worker cache | `public/` |
| `offline-crud.js` | Lib CRUD IndexedDB | `static/js/` |
| `views.py` | Django view | `inspection/` |
| `urls.py` | Django route | `inspection/` |
| `liste_fiches.html` | Template list | `templates/inspection/` |

## URLs

| URL | Rôle | Note |
|-----|------|------|
| `/inspection/creer/` | Créer fiche | Existing |
| `/inspection/liste_fiches/` | Liste fiches | Existing |
| `/inspection/fiche/offline/?id=123` | Fiche offline | NEW |
| `/api/fiche/creer/` | API create | Existing |
| `/api/fiche/sync/` | API sync | TODO |

## IndexedDB Stores

```javascript
// fiches_locales
{
  key: local_id,
  data: {
    local_id: "1705321200000",
    synced: false,
    server_pk: null,
    titre: "...",
    description: "...",
    created_at: timestamp,
    synced_at: null
  }
}

// sync_queue
{
  key: queue_id,
  data: {
    id: "queue_1",
    local_id: "1705321200000",
    action: "create|update|delete",
    data: {...},
    retries: 0,
    last_error: null
  }
}
```

## API Endpoints

### Create Offline
```
POST /inspection/creer/
Body: {titre, description}
Response: {id: "local_1705321200000"}
```

### Get Offline
```
GET /inspection/fiche/offline/?id=local_1705321200000
Response: HTML page (from cache)
```

### Modify Offline
```
Save in form → OfflineCRUD.updateFiche()
```

### Delete Offline
```
Confirm → OfflineCRUD.deleteFiche()
```

### Sync (TODO)
```
POST /api/fiche/sync/
Body: {operations: [...]}
Response: {results: [...]}
```

## JavaScript Functions

### OfflineCRUD (static/js/offline-crud.js)

```javascript
// Create
OfflineCRUD.createFiche(data)
  → Returns: {local_id}

// Read
OfflineCRUD.getFiche(local_id)
  → Returns: fiche object

// Update
OfflineCRUD.updateFiche(local_id, updates)
  → Returns: updated fiche

// Delete
OfflineCRUD.deleteFiche(local_id)
  → Returns: true

// List
OfflineCRUD.getAllFiches()
  → Returns: [fiche, ...]

// Sync
OfflineCRUD.getPendingSyncs()
  → Returns: sync_queue items
```

### App (static/js/app.js or alike)

```javascript
// Save locally
sauvegarderLocalement(titre, description)
  → Uses OfflineCRUD.createFiche()

// Auto-sync
synchroniserFiches()
  → Calls POST /api/fiche/creer/

// Display list
afficherFichesLocales()
  → Shows fiches with offline badge
```

## Service Worker (public/sw.js)

```javascript
// Pre-cache
STATIC_ASSETS = [
  '/offline-fiche.html',
  '/static/js/offline-crud.js'
]

// On install
sw.addEventListener('install', ...)

// On activate
sw.addEventListener('activate', ...)

// On fetch
sw.addEventListener('fetch', event => {
  if (offline route) → serveOfflineFiche()
  else if (static) → cache first
  else if (api) → network first
})

// Sync
self.addEventListener('sync', async event => {
  if (event.tag === 'sync-fiches') → syncFiches()
})
```

## Testing

### Manual Test Checklist

```
[ ] F12 → Offline
[ ] Create fiche → ✅ Works
[ ] See list → ✅ Shows badge
[ ] View detail → ✅ No 404
[ ] Modify → ✅ Saves
[ ] Delete → ✅ Removed
[ ] F12 → Online
[ ] Wait 30s → ✅ Syncs
[ ] Check Django → ✅ Exists
```

### Automated Tests

```bash
# Verify setup
python verify_offline_first.py

# Run tests in browser
fetch('/test-offline-first.js').then(r => r.text()).then(eval);

# Check IndexedDB
DevTools → Application → IndexedDB → ficheControleDB

# Check Service Worker
DevTools → Application → Service Workers

# Check Cache
DevTools → Cache Storage → offline-fiche-cache
```

## Debugging

### Check logs
```javascript
// Console
[FicheApp] ✓ DB ouverte
[FicheApp] ✓ Fiche chargée {local_id: '...'}
[SW] Fiche sauvegardée localement: ...
```

### Check IndexedDB
```javascript
// Console
let db = indexedDB.open('ficheControleDB');
db.onsuccess = e => {
  let store = e.target.result
    .transaction(['fiches_locales'])
    .objectStore('fiches_locales');
  store.getAll().onsuccess = e => console.log(e.target.result);
};
```

### Check Service Worker
```javascript
// Console
navigator.serviceWorker.getRegistrations()
  .then(regs => console.log(regs));
```

### Check Cache
```javascript
// Console
caches.keys().then(names => 
  Promise.all(names.map(name => 
    caches.open(name).then(cache => 
      cache.keys().then(reqs => 
        console.log(name, reqs.map(r => r.url))
      )
    )
  ))
);
```

## Common Issues

| Issue | Solution |
|-------|----------|
| offline-fiche.html not found | Check public/ folder, verify URLs |
| OfflineCRUD undefined | Check offline-crud.js imported, check path |
| IndexedDB quota exceeded | Clear old data, delete test records |
| Service Worker not active | Unregister old SW, refresh page |
| Fiche not syncing | Check network, check sync endpoint, check errors |
| Form not saving | Check browser console for errors, check validation |
| Offline badge not showing | Check list template, check local_id logic |

## Configuration

### Django Settings (for offline-fiche view)

```python
# settings.py
TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [],
    'APP_DIRS': True,
}]

# views.py
from django.http import HttpResponse
from django.conf import settings
import os

def serve_offline_fiche(request):
    file_path = os.path.join(settings.BASE_DIR, 'public', 'offline-fiche.html')
    with open(file_path, 'r', encoding='utf-8') as f:
        return HttpResponse(f.read(), content_type='text/html')
```

### URLs Configuration

```python
# urls.py
path('fiche/offline/', views.serve_offline_fiche, name='offline_fiche'),
```

## Performance Tips

1. **Minimize data:** Only store necessary fields in IndexedDB
2. **Batch operations:** Don't create 1000s of individual operations
3. **Clean up:** Delete old sync queue items after successful sync
4. **Compression:** Compress large data before storing
5. **Indexes:** Add indexes on frequently queried fields

## Security Tips

1. **Validate:** Always validate data on both client and server
2. **Encrypt:** Encrypt sensitive data before storing
3. **Authenticate:** Verify user before sync
4. **Authorize:** Check permissions before returning data
5. **Log:** Log all sync operations for audit

## Next Steps

**Immediate:**
1. Run `verify_offline_first.py`
2. Run `quick_start.bat` or `quick_start.sh`
3. Test manually

**Short term:**
1. Implement sync backend (v2.1)
2. Add error handling (v2.2)
3. Add all form fields (v2.3)

**Medium term:**
1. Add file support (v2.4)
2. Add conflict resolution (v2.5)
3. Add multi-device sync (v2.6)

See `ROADMAP.md` for detailed plan.

---

**Version:** 2.0  
**Status:** 🟢 READY  
**Last Updated:** 27/05/2026
