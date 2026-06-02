# 📊 FLOW DIAGRAM - ARCHITECTURE OFFLINE-FIRST

## SCÉNARIO 1: Utilisateur OFFLINE crée une fiche

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Navigateur OFFLINE                                      │
│    http://localhost:8000/inspection/creer/                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─→ Django reçoit GET /inspection/creer/
                 │   (Peut être en cache du SW ou non)
                 │
                 ├─→ Django sert templates/inspection/fiche_form.html
                 │   (Avec script: offline-crud.js)
                 │
                 └─→ Navigateur affiche le formulaire
                 
┌─────────────────────────────────────────────────────────────┐
│ 2. User remplit le formulaire                              │
│    - Nom entreprise: "Mon Entreprise"                       │
│    - Date: 27/05/2026                                       │
│    - ...                                                     │
│                                                             │
│    User clicker "Sauvegarder"                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─→ JavaScript: sauvegarderLocalement()
                 │   (app.js ou app-offline-unified.js)
                 │
                 ├─→ offline-crud.js: OfflineCRUD.createFiche(data)
                 │
                 ├─→ IndexedDB Transaction:
                 │   1. fiches_locales.put({
                 │        local_id: 1779806733307 (timestamp)
                 │        synced: false
                 │        server_pk: null
                 │        entreprise: "Mon Entreprise"
                 │        ...
                 │      })
                 │   2. sync_queue.add({
                 │        action: 'create'
                 │        local_id: 1779806733307
                 │        data: {...}
                 │        status: 'pending'
                 │      })
                 │
                 └─→ ✅ Fiche sauvegardée en IndexedDB
                 
┌─────────────────────────────────────────────────────────────┐
│ 3. Page retour à la liste (liste_fiches.html)             │
│                                                             │
│    afficherFichesLocales()                                  │
│    ↓                                                        │
│    OfflineCRUD.getAllFiches()                              │
│    ↓                                                        │
│    IndexedDB: SELECT * FROM fiches_locales                 │
│    ↓                                                        │
│    Affiche:                                                 │
│    ┌──────────────────────────────────┐                    │
│    │ Mon Entreprise    [🗄️ Hors-ligne]│                    │
│    │ 27/05/2026                        │                    │
│    │ [Voir] [Modifier] [Supprimer]    │                    │
│    └──────────────────────────────────┘                    │
│                                                             │
│    ✅ Fiche apparaît immédiatement                         │
└─────────────────────────────────────────────────────────────┘
```

---

## SCÉNARIO 2: Utilisateur OFFLINE clique "Voir"

```
┌─────────────────────────────────────────────────────────────┐
│ User clicker "Voir" sur la fiche                          │
│ Lien: /inspection/fiche/offline/?id=1779806733307         │
└────────────────┬────────────────────────────────────────────┘
                 │
    Service Worker intercepts (OFFLINE MODE)
                 │
                 ├─→ "GET /inspection/fiche/offline/?id=..."
                 │
                 ├─→ SW: path.includes('/inspection/fiche/offline/')
                 │   TRUE → event.respondWith(serveOfflineFiche(request))
                 │
                 ├─→ Essayer la réseau (fail - offline)
                 │
                 ├─→ Fallback cache.match('/offline-fiche.html')
                 │
                 └─→ ✅ Retour /offline-fiche.html depuis le cache
                 
┌─────────────────────────────────────────────────────────────┐
│ Navigateur affiche /offline-fiche.html                     │
│                                                             │
│ HTML structure:                                             │
│ ├─ <h1>Chargement...</h1>                                  │
│ ├─ <div id="loading-view">                                 │
│ ├─ <div id="view-mode">                                    │
│ ├─ <div id="edit-mode">                                    │
│ └─ <script src="/static/js/offline-crud.js"></script>     │
│                                                             │
│ JavaScript démarre:                                         │
│ ├─→ getLocalId() → "1779806733307"                         │
│ ├─→ OfflineCRUD.getFiche(1779806733307)                    │
│ │   ↓                                                      │
│ │   IndexedDB: fiches_locales.get(1779806733307)           │
│ │   ↓                                                      │
│ │   Retourne: {                                            │
│ │     local_id: 1779806733307                              │
│ │     synced: false                                        │
│ │     entreprise: "Mon Entreprise"                         │
│ │     date_controle: "27/05/2026"                          │
│ │     ...                                                  │
│ │   }                                                      │
│ └─→ renderView()                                           │
│    └─→ Affiche les champs:                                 │
│        • Entreprise: Mon Entreprise                        │
│        • Date: 27/05/2026                                  │
│        • Lieu: ...                                         │
│        • [Modifier] [Supprimer]                            │
│                                                             │
│ ✅ CONTENU CHARGÉ D'INDEXEDDB, PAS DJANGO!                │
└─────────────────────────────────────────────────────────────┘
```

---

## SCÉNARIO 3: Utilisateur OFFLINE clique "Modifier"

```
┌─────────────────────────────────────────────────────────────┐
│ Page affiche les 2 modes:                                  │
│                                                             │
│ MODE VIEW (visible):                                        │
│ ┌────────────────────────────┐                             │
│ │ Mon Entreprise             │                             │
│ │ Entreprise: Mon Entreprise │                             │
│ │ [Modifier] [Supprimer]     │                             │
│ └────────────────────────────┘                             │
│                                                             │
│ MODE EDIT (caché):                                          │
│ ├─ <form id="edit-form">                                   │
│ └─ <input name="entreprise" value="">                      │
│                                                             │
│ User clicker [Modifier]                                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─→ getElementById('btn-edit').addEventListener('click')
                 │
                 ├─→ Pré-remplir le formulaire:
                 │   form.querySelector('input[name=entreprise]')
                 │     .value = "Mon Entreprise"
                 │
                 ├─→ Switcher modes:
                 │   document.getElementById('view-mode').classList.add('hidden')
                 │   document.getElementById('edit-mode').classList.remove('hidden')
                 │
                 └─→ ✅ Formulaire visible avec les valeurs actuelles
                 
┌─────────────────────────────────────────────────────────────┐
│ User modifie le formulaire:                                │
│                                                             │
│ AVANT: "Mon Entreprise"                                     │
│ APRÈS: "Mon Entreprise Modifiée"                           │
│                                                             │
│ User clicker [Sauvegarder]                                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─→ form.addEventListener('submit', async (e) => {
                 │
                 ├─→ FormData → Object:
                 │   { entreprise: "Mon Entreprise Modifiée" }
                 │
                 ├─→ OfflineCRUD.updateFiche(1779806733307, updates)
                 │
                 ├─→ IndexedDB Transaction:
                 │   1. Get current fiche
                 │   2. Merge with updates
                 │   3. Set: synced = false (re-mark for sync)
                 │   4. Set: updated_at = new Date()
                 │   5. fiches_locales.put(updated)
                 │   6. sync_queue.add({
                 │        action: 'update'
                 │        local_id: 1779806733307
                 │        data: {...}
                 │      })
                 │
                 ├─→ Re-render view:
                 │   renderView() → Affiche les nouvelles données
                 │
                 ├─→ Switcher modes (back to VIEW)
                 │
                 └─→ ✅ Fiche modifiée en IndexedDB, message de succès
                 
┌─────────────────────────────────────────────────────────────┐
│ Résultat en IndexedDB:                                      │
│                                                             │
│ ficheControleDB                                             │
│ └─ fiches_locales                                           │
│    └─ 1779806733307                                         │
│       ├─ entreprise: "Mon Entreprise Modifiée" ← CHANGÉ     │
│       ├─ synced: false ← RE-MARKED FOR SYNC                │
│       ├─ updated_at: "2026-05-27T15:42:15Z" ← NOUVEAU      │
│       └─ ...                                                │
│                                                             │
│ sync_queue                                                  │
│ └─ {                                                        │
│      action: 'update'                                       │
│      local_id: 1779806733307                                │
│      data: {...} ← Données mises à jour                    │
│      status: 'pending'                                      │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## SCÉNARIO 4: Utilisateur OFFLINE clique "Supprimer"

```
┌─────────────────────────────────────────────────────────────┐
│ User clicker [Supprimer]                                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─→ document.getElementById('btn-delete')
                 │   .addEventListener('click')
                 │
                 ├─→ if (!confirm('Êtes-vous sûr?')) return;
                 │   User clicks OK
                 │
                 └─→ OfflineCRUD.deleteFiche(1779806733307)
                 
┌─────────────────────────────────────────────────────────────┐
│ IndexedDB Transaction:                                      │
│                                                             │
│ 1. fiches_locales.delete(1779806733307)                    │
│    ✅ Fiche supprimée d'IndexedDB                          │
│                                                             │
│ 2. sync_queue.add({                                         │
│      action: 'delete'                                       │
│      local_id: 1779806733307                                │
│      data: {                                                │
│        local_id: 1779806733307                              │
│        server_pk: null ← était null (pas encore sync)      │
│      }                                                      │
│      status: 'pending'                                      │
│    })                                                       │
│    ✅ Suppression enregistrée dans la queue                │
│                                                             │
│ 3. Transaction complete                                     │
│    ✅ Résultat: true                                       │
│                                                             │
│ 4. Afficher message: "✓ Fiche supprimée!"                  │
│                                                             │
│ 5. setTimeout(() => {                                       │
│      window.location.href = '/inspection/liste_fiches/'    │
│    }, 1500);                                                │
│                                                             │
│    Redirection vers la liste après 1.5 sec                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Résultat en IndexedDB:                                      │
│                                                             │
│ ficheControleDB                                             │
│ └─ fiches_locales                                           │
│    └─ (vide - fiche supprimée) ✅                          │
│                                                             │
│ sync_queue                                                  │
│ └─ {                                                        │
│      action: 'delete' ← À traiter lors du sync              │
│      local_id: 1779806733307                                │
│      data: { local_id: ..., server_pk: null }              │
│      status: 'pending'                                      │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## SCÉNARIO 5: Utilisateur ONLINE (quand connexion revient)

```
┌─────────────────────────────────────────────────────────────┐
│ Utilisateur revient online                                 │
│ (WiFi est reconnectée)                                     │
│                                                             │
│ Service Worker détecte: navigator.onLine === true         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─→ Sync periodic trigger:
                 │   self.addEventListener('sync')
                 │
                 ├─→ syncFiches()
                 │
                 ├─→ Message aux clients:
                 │   postMessage({
                 │     type: 'SYNC_REQUEST'
                 │   })
                 │
                 └─→ app.js reçoit: syncPendingFiches()
                 
┌─────────────────────────────────────────────────────────────┐
│ app.js: Traiter la sync_queue                              │
│                                                             │
│ 1. OfflineCRUD.getPendingSyncs()                           │
│    IndexedDB: SELECT * FROM sync_queue WHERE status='pending'
│                                                             │
│ 2. Pour chaque item en queue:                              │
│    ├─→ if action === 'create':                            │
│    │   └─→ POST /api/fiche/creer/                         │
│    │       Django crée la fiche                            │
│    │       Retourne: {pk: 6666, ...}                       │
│    │       update fiche:                                   │
│    │         ├─ synced: true                               │
│    │         ├─ server_pk: 6666                            │
│    │         └─ created_at: now                            │
│    │       update queue: status: 'done'                    │
│    │                                                       │
│    ├─→ if action === 'update':                            │
│    │   └─→ PUT /api/fiche/{pk}/modifier/                 │
│    │       Django met à jour la fiche                      │
│    │       update queue: status: 'done'                    │
│    │                                                       │
│    └─→ if action === 'delete':                            │
│        └─→ DELETE /api/fiche/{pk}/supprimer/              │
│            Django supprime la fiche                        │
│            delete from fiches_locales                      │
│            update queue: status: 'done'                    │
│                                                             │
│ 3. setTimeout(() => location.reload(), 1000)              │
│    → Recharger la page (liste va afficher les versions    │
│      synchronisées)                                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Résultat en IndexedDB APRÈS SYNC:                          │
│                                                             │
│ ficheControleDB                                             │
│ └─ fiches_locales                                           │
│    └─ 1779806733307                                         │
│       ├─ local_id: 1779806733307                            │
│       ├─ synced: true ← CHANGÉ                             │
│       ├─ server_pk: 6666 ← NOUVEAU (reçu de Django)        │
│       ├─ entreprise: "Mon Entreprise Modifiée"             │
│       └─ ...                                                │
│                                                             │
│ sync_queue (vide - tout traité)                            │
│ └─ (vide) ✅                                                │
│                                                             │
│ Résultat en Django:                                         │
│ └─ FicheControle.objects.all()                             │
│    └─ pk=6666                                               │
│       ├─ entreprise: "Mon Entreprise Modifiée"             │
│       └─ ...                                                │
│                                                             │
│ ✅ FICHE EXISTE MAINTENANT DANS DJANGO!                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Résultat en liste_fiches.html:                             │
│                                                             │
│ afficherFichesLocales() + afficherFichesServeur()          │
│                                                             │
│ AVANT:                                                      │
│ ┌──────────────────────────────────┐                       │
│ │ Mon Entreprise [🗄️ Hors-ligne]  │                       │
│ │ 27/05/2026                        │                       │
│ └──────────────────────────────────┘                       │
│                                                             │
│ APRÈS:                                                      │
│ ┌──────────────────────────────────┐                       │
│ │ Mon Entreprise [☁️ Synchronisé]   │                       │
│ │ 27/05/2026                        │                       │
│ └──────────────────────────────────┘                       │
│                                                             │
│ Badge change de "Hors-ligne" à "Synchronisé" ✅            │
│ Fiche peut maintenant être vue/modifiée via Django API     │
└─────────────────────────────────────────────────────────────┘
```

---

## RÉSUMÉ: Flux Complet Offline-First

```
┌─────────────────────────────────────────────────┐
│ OFFLINE MODE (Pas de Django!)                  │
├─────────────────────────────────────────────────┤
│ • Créer fiche → IndexedDB + sync_queue         │
│ • Voir fiche → IndexedDB (offline-fiche.html) │
│ • Modifier → IndexedDB + sync_queue            │
│ • Supprimer → IndexedDB + sync_queue           │
│                                                 │
│ TOUT AVEC JAVASCRIPT, ZÉRO APPEL DJANGO!      │
└─────────────────────────────────────────────────┘
                      ↓ (connexion revient)
┌─────────────────────────────────────────────────┐
│ SYNC MODE (Mise à jour Django)                 │
├─────────────────────────────────────────────────┤
│ • sync_queue traitée                           │
│ • POST/PUT/DELETE → API Django                 │
│ • Récupérer server_pk                          │
│ • Marquer synced=true                          │
│                                                 │
│ FICHE EXISTE MAINTENANT DANS DJANGO!           │
└─────────────────────────────────────────────────┘
                      ↓ (maintenant synchronized)
┌─────────────────────────────────────────────────┐
│ ONLINE MODE (Normal)                           │
├─────────────────────────────────────────────────┤
│ • Voir fiche → Django API                      │
│ • Modifier → Django Forms                      │
│ • Supprimer → Django                           │
│                                                 │
│ FICHE FONCTIONNE NORMALEMENT SUR TOUS LES      │
│ APPAREILS! (Synchronized across devices)       │
└─────────────────────────────────────────────────┘
```

---

**C'est ça une vraie architecture Offline-First!** 🚀
