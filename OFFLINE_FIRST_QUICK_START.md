# 🚀 GUIDE OFFLINE-FIRST QUICK START

## ⚡ En 5 minutes

### 1. Démarre ton app
```bash
cd "C:\Users\DELL\Desktop\Inspection du travail\Projet\fiche-controle"
python manage.py runserver
```
Ouvre: http://localhost:8000/inspection/liste_fiches/

### 2. Désactive le WiFi/réseau (simule offline)
Ctrl+Shift+K dans Chrome → Mode offline

### 3. Crée une fiche
- Aller à http://localhost:8000/inspection/creer/
- Remplir le formulaire
- Clicker "Sauvegarder"
- ✅ Fiche créée en IndexedDB

### 4. Reviens à la liste
- Refresh la page
- Tu dois voir la fiche avec badge "🗄️ Hors-ligne"

### 5. Voir le détail
- Clicker "Voir" sur la fiche
- URL: `/inspection/fiche/offline/?id=1779806733307`
- ✅ Contenu chargé d'IndexedDB (pas Django!)

### 6. Modifie la fiche
- Clicker "Modifier"
- Change le nom de l'entreprise
- Clicker "Sauvegarder"
- ✅ Fiche modifiée en IndexedDB

### 7. Supprime la fiche
- Clicker "Supprimer"
- Confirmer
- ✅ Fiche supprimée de la liste

### 8. Réactive le réseau
Ctrl+Shift+K → Mode online (re-check)

---

## 🧪 TEST AUTOMATISÉ

Ouvre la **Console DevTools** (F12) et paste:

```javascript
fetch('/test-offline-first.js').then(r => r.text()).then(eval);
```

Tu dois voir:
```
✅ TOUS LES TESTS SONT PASSÉS!
✓ OfflineCRUD est disponible
✓ Fiche créée (local_id = 1779806733307)
✓ Fiche modifiée
✓ URL: /inspection/fiche/offline/?id=1779806733307
```

---

## 📱 TEST RÉALISTE

### Scénario 1: Création offline
1. Désactive WiFi
2. Va à `/inspection/creer/`
3. Remplis et sauvegarde
4. Reviens à la liste
5. ✅ Fiche doit apparaître avec badge "Hors-ligne"

### Scénario 2: Modification offline
1. Reste offline
2. Clicker "Voir" sur la fiche
3. URL doit être `/offline-fiche.html?id=XXX`
4. Clicker "Modifier"
5. Change le nom de l'entreprise
6. Soumet
7. ✅ Pas d'erreur, fiche modifiée

### Scénario 3: Suppression offline
1. Reste offline
2. Clicker "Supprimer"
3. Confirmer
4. ✅ Fiche disparaît

### Scénario 4: Multi-opérations offline
1. Désactive WiFi
2. Crée 3 fiches
3. Modifie la 1ère
4. Supprime la 2ème
5. Reviens online
6. ✅ Toutes les opérations doivent se synchroniser

---

## 🔍 VÉRIFICATION INDEXEDDB

**Chrome DevTools** → Application → **IndexedDB** → ficheControleDB

Dois voir:
```
📦 ficheControleDB
  🗂️ fiches_locales
    1779806733307
    1779806733308
    ...
  📋 sync_queue
    {action: 'create', local_id: 1779806733307}
    {action: 'update', local_id: 1779806733308}
    ...
```

---

## 🔍 VÉRIFICATION SERVICE WORKER

**Chrome DevTools** → Application → **Service Workers**

Dois voir:
```
✅ /public/sw.js
   Status: Active and running
   Scope: /
```

---

## 🔍 VÉRIFICATION CACHE

**Chrome DevTools** → Application → **Cache Storage** → fiche-static-v2-offline-first

Dois voir:
```
✅ /offline-fiche.html
✅ /static/js/offline-crud.js
✅ /manifest.json
```

---

## ⚠️ SI ÇA NE MARCHE PAS

### Erreur: "offline-fiche.html not found"
```
→ Vérifier que le fichier existe: C:\...\public\offline-fiche.html
→ Vérifier que les chemins sont corrects
```

### Erreur: "OfflineCRUD is not defined"
```
→ Vérifier que /static/js/offline-crud.js est chargé
→ Ouvrir Console → paste: await OfflineCRUD.getAllFiches()
```

### Erreur: "IndexedDB access denied"
```
→ Vérifier que tu n'es pas en mode Incognito
→ Essayer dans une fenêtre normale
```

### Page n'affiche rien
```
→ Ouvrir DevTools (F12)
→ Console tab: chercher les erreurs rouges
→ Network tab: vérifier que les fichiers se chargent
```

---

## 💡 ASTUCES

### Réinitialiser IndexedDB
```javascript
// Dans la Console
indexedDB.deleteDatabase('ficheControleDB');
// Refresh la page
```

### Réinitialiser le cache
**Chrome DevTools** → Application → **Clear site data**

### Forcer un refresh du SW
```javascript
// Dans la Console
if (navigator.serviceWorker) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => r.unregister());
  });
}
// Refresh la page
```

---

## 📊 Architecture EN 30 SECONDES

```
┌─────────────────────────────────────┐
│ Utilisateur Offline                │
└─────────────┬───────────────────────┘
              │
     Clicker "Voir" fiche
              │
              ↓
    Django sert /offline-fiche.html
              │
              ↓
   Service Worker retourne du cache
              │
              ↓
 offline-fiche.html charge JavaScript
              │
              ↓
  OfflineCRUD lit les données d'IndexedDB
              │
              ↓
   Page affiche le formulaire
              │
              ↓
  Utilisateur modifie et clicker "Sauvegarder"
              │
              ↓
  OfflineCRUD écrit en IndexedDB
              │
              ↓
   ✅ Pas d'appel Django!
```

---

## ✅ CHECKLIST

- [ ] App démarrée: http://localhost:8000
- [ ] Navigateur en offline
- [ ] Fiche créée
- [ ] Fiche affichée avec badge "Hors-ligne"
- [ ] Clicker "Voir" → URL: `/offline-fiche.html?id=XXX`
- [ ] Contenu affiché sans erreur
- [ ] Clicker "Modifier" → formulaire change
- [ ] Sauvegarder → pas d'erreur
- [ ] Clicker "Supprimer" → fiche disparaît
- [ ] IndexedDB contient la fiche
- [ ] Service Worker est "Active"
- [ ] Cache contient `/offline-fiche.html`

---

## 🎯 RÉSULTAT ATTENDU

En offline:
✅ Crée fiches
✅ Vois les détails
✅ Modifie les données
✅ Supprime les fiches
✅ Aucune erreur Django/404

C'est ça une vraie architecture **offline-first**! 🚀

---

**Dernière mise à jour:** 27/05/2026  
**Status:** 🟢 Prêt à l'emploi!
