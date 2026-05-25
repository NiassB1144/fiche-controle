# 🧪 GUIDE COMPLET DE TEST - MODE OFFLINE

## ✅ Vérifications Préalables

Avant de tester, vérifiez que:
- [x] Django est démarré (`python manage.py runserver`)
- [x] Cache navigateur vidé (Ctrl+Shift+Delete)
- [x] IndexedDB vide (fresh start)
- [x] Pas de messages d'erreur en console
- [x] Message de démarrage: `[FicheApp] ✓ app-offline-unified.js chargé`

---

## 🔄 TEST 1: CRÉER UNE FICHE EN MODE OFFLINE

### Préparation
```
1. Ouvrir DevTools (F12)
2. Onglet "Network"
3. Cliquer sur l'icône "No throttling" → "Offline"
   OU
   Chercher "Offline" dans la barre de recherche DevTools
```

### Procédure
```
1. Naviguer à http://127.0.0.1:8000/fiches/creer/
2. Remplir le formulaire:
   ├─ Entreprise: "TEST OFFLINE 001"
   ├─ Date: 2025-01-15
   ├─ Lieu: "Bureau A"
   └─ Cocher au moins 2 checkboxes (ex: "Sécurité OK", "Conformité OK")
3. Cliquer le bouton "Enregistrer"
```

### Résultats Attendus
**Console** (F12):
```
✓ [FicheApp] Fiche sauvegardée localement { local_id: 'local_...' }
```

**Notification utilisateur** (toast):
```
📱 Hors-ligne - Sauvegardé localement
```

**Redirection** après ~1.5s:
```
Page se recharge vers /fiches/
```

### ❌ Si ça échoue

**Erreur: "Remplissez entreprise et date"**
- Vérifier que les champs sont bien remplis
- Vérifier qu'il n'y a pas d'espaces invisibles

**Erreur: "Erreur sauvegarde"**
- Vérifier DevTools → Application → IndexedDB → ficheControleDB
- Créer devrait créer une nouvelle entrée

**Pas de redirection**
- Vérifier que le bouton s'appelle bien "Enregistrer"
- Vérifier pas d'erreurs console

---

## 📋 TEST 2: VOIR LA FICHE EN CACHE

### Préparation
- Rester en mode **Offline**
- Naviguer à http://127.0.0.1:8000/fiches/

### Procédure
```
1. Chercher la section "Fiches en attente de synchronisation" (grise, en haut)
2. Trouver "TEST OFFLINE 001"
3. Cliquer le bouton "👁️ Voir"
```

### Résultats Attendus
```
Modale s'ouvre avec:
├─ Titre: "📋 TEST OFFLINE 001"
├─ Tableau affichant TOUS les champs:
│  ├─ entreprise: TEST OFFLINE 001
│  ├─ date_controle: 2025-01-15
│  ├─ lieu: Bureau A
│  ├─ [checkbox fields]: on / ''
│  └─ ...autres champs...
├─ Bouton "Fermer" (clickable)
└─ Fermeture en cliquant en dehors
```

### ❌ Si ça échoue

**Modale ne s'ouvre pas**
- Vérifier console pour erreurs
- Vérifier que local_id existe dans IndexedDB

**Modale vide**
- Vérifier que la fiche a été créée correctement
- Vérifier IndexedDB contents

---

## ✏️ TEST 3: MODIFIER UNE FICHE EN MODE OFFLINE

### Préparation
- Rester en mode **Offline**
- Être sur http://127.0.0.1:8000/fiches/

### Procédure
```
1. Chercher "TEST OFFLINE 001"
2. Cliquer le bouton "✏️ Modifier"
3. Navigateur redirige vers /fiches/creer/?local_id=...
4. Vérifier que le formulaire est pré-rempli:
   ├─ Entreprise: "TEST OFFLINE 001" ✓
   ├─ Lieu: "Bureau A" ✓
   ├─ Checkboxes: rappel des sélections ✓
   └─ Notification: "📋 Fiche chargée depuis cache"
5. Modifier un champ:
   ├─ Changer Entreprise en "TEST OFFLINE 001 - MODIFIÉ"
   ├─ Ou changer un checkbox
6. Cliquer "Enregistrer"
```

### Résultats Attendus
**Console**:
```
[FicheApp] 🔄 Chargement fiche depuis cache { local_id: 'local_...', entreprise: 'TEST OFFLINE 001' }
[FicheApp] ✓ Fiche modifiée { local_id: 'local_...' }
```

**Notification**:
```
Fiche mise à jour ✓
```

**Redirection**:
```
→ /fiches/
```

**Vérification**:
- Relancer TEST 2 (Voir)
- Vérifier que les modifications sont présentes

### ❌ Si ça échoue

**Formulaire non pré-rempli**
- Vérifier local_id dans l'URL
- Vérifier IndexedDB contient la fiche
- Vérifier console pour erreurs

**Erreur "Fiche non trouvée"**
- Vérifier que la fiche existe toujours (TEST 2)
- Vérifier que local_id n'a pas changé

---

## 🗑️ TEST 4: SUPPRIMER UNE FICHE EN MODE OFFLINE

### Préparation
- Créer une fiche supplémentaire pour test: "TEST DELETE 001"
- Rester en mode **Offline**
- Être sur http://127.0.0.1:8000/fiches/

### Procédure
```
1. Chercher "TEST DELETE 001"
2. Cliquer le bouton "🗑️ Supprimer"
3. Confirmer dans la popup "Supprimer définitivement cette fiche ?"
```

### Résultats Attendus
**Console**:
```
[FicheApp] ✓ Fiche supprimée { local_id: 'local_...' }
```

**Notification**:
```
Fiche supprimée ✓
```

**Page**:
```
"TEST DELETE 001" disparaît de la liste
La section "Fiches en attente" se met à jour
```

### ❌ Si ça échoue

**Popup ne s'affiche pas**
- Vérifier que le bouton s'appelle "Supprimer"
- Vérifier console pour erreurs JavaScript

**Fiche ne disparaît pas**
- Rafraîchir la page (F5)
- Vérifier IndexedDB (fiche ne doit pas apparaître)

**Erreur lors de la suppression**
- Vérifier que local_id existe
- Vérifier permissions IndexedDB

---

## 🌐 TEST 5: REVENIR EN LIGNE & SYNCHRONISER

### Préparation
- Mode **Offline** actuellement
- Au moins 1-2 fiches à synchroniser (TEST OFFLINE 001, etc.)

### Procédure
```
1. DevTools → Network → Changer "Offline" en "Online"
   OU Fermer DevTools et attendre (auto-détection)
2. Attendre 5-10 secondes (sync interval)
   OU Rafraîchir la page (F5)
3. Observer les notifications
```

### Résultats Attendus
**Console** (après quelques secondes):
```
[FicheApp] 🔄 Début synchronisation...
[FicheApp] ✓ Fiche synchronisée: TEST OFFLINE 001
[FicheApp] Synchronisation: 1 OK, 0 KO
```

**Notification Toast**:
```
1 sync✓, 0 échec(s)
```

**Badge de statut** (en haut):
```
Changement: [🔴 En attente] → [🟢 ✓ Synchronisé]
```

**Nouveau ID serveur**:
- Les fiches maintenant ont un `server_pk` dans IndexedDB
- Elles reçoivent un ID Django permanent

**Page /fiches/**:
```
Les fiches apparaissent maintenant dans la liste principale
Les détails sont visibles (entreprise, date, etc.)
```

### Vérification POST-SYNC
```
1. Rafraîchir /fiches/
   ├─ Les fiches doivent toujours être visibles
   ├─ Section "Fiches en attente" doit être vide ou cachée
   └─ Pas de badges "Hors-ligne"
2. Cliquer sur une fiche dans la liste
   ├─ Vérifier URL: /fiches/{id}/
   ├─ Affichage complet des détails
   └─ Pas de banneau "Cache"
3. Éditer une fiche
   ├─ Modifier un champ
   ├─ Enregistrer
   └─ Vérifier modifiation sauvegardée en BD
```

### ❌ Si ça échoue

**Pas de notification de sync**
- Vérifier que le mode est bien "Online"
- Vérifier que le serveur Django répond: `curl http://127.0.0.1:8000/`
- Vérifier console pour erreurs réseau

**Erreur "CSRF token missing"**
- Vérifier que le navigateur accepte les cookies
- Vérifier que csrftoken est présent: DevTools → Application → Cookies

**Erreur "500 Server Error"**
- Vérifier Django logs: `python manage.py runserver` output
- Vérifier que les models acceptent les données

**Fiches disparaissent après sync**
- Vérifier Django DB: `python manage.py dbshell` → `SELECT * FROM fiche;`
- Vérifier qu'il n'y a pas de cascade delete

---

## 📱 TEST 6: CYCLE COMPLET (HYBRIDE)

### Procédure
```
Phase 1: En ligne
  1. Créer fiche "ONLINE 1"
  2. Vérifier dans la liste
  3. Modifier, vérifier

Phase 2: Passer offline
  2. DevTools → Network → Offline
  
Phase 3: Créer en offline
  1. Créer fiche "OFFLINE 1"
  2. Créer fiche "OFFLINE 2"
  3. Modifier fiche "OFFLINE 1"
  4. Consulter fiches
  5. Section "Fiches en attente" doit montrer 2 fiches

Phase 4: Revenir online
  1. DevTools → Network → Online
  2. Attendre sync
  3. Notification: "2 sync✓, 0 échec(s)"

Phase 5: Vérifier final
  1. Page /fiches/ doit afficher 3 fiches total
  2. "ONLINE 1", "OFFLINE 1", "OFFLINE 2" toutes présentes
  3. Pas d'erreurs console
  4. Pas de section "Fiches en attente" (ou vide)
```

---

## 🔍 VÉRIFICATIONS DÉVELOPPEUR (DevTools)

### Console Tab
```
✓ Pas d'erreurs rouges (Red X)
✓ Messages [FicheApp] pour chaque action
✓ Pas de "undefined" ou "null" errors
✓ Événement "FicheAppReady" dispatched
```

### Network Tab
```
Mode OFFLINE:
  ✓ Pas de requêtes réseau
  ✓ Les opérations sont locales
  
Mode ONLINE:
  ✓ POST requests à /api/fiche/creer/ ou /api/fiche/{id}/modifier/
  ✓ Réponses 200 OK
  ✓ Headers incluent X-CSRFToken
  ✓ Body JSON valide
```

### Application Tab → IndexedDB
```
ficheControleDB:
  fiches_locales (Object Store):
    ├─ local_id (string, keyPath) ← ⚠️ MUST be string!
    ├─ entreprise (string)
    ├─ date_controle (string)
    ├─ synced (boolean)
    ├─ server_pk (integer, after sync)
    ├─ saved_at (ISO string)
    ├─ updated_at (ISO string)
    └─ [autres champs du formulaire]
    
Indices:
  ├─ synced index (pour queries rapides)
  ├─ server_pk index
  ├─ date_controle index
  └─ statut index
```

### Storage Tab → Cookies
```
✓ csrftoken présent (pour POST requests)
✓ sessionid présent (authentification)
✓ Pas de tokens secrets exposés
```

---

## 🐛 BUGS CONNUS & SOLUTIONS

| Bug | Symptôme | Solution |
|-----|----------|----------|
| TypeError: Cannot read property 'local_id' | Champ non trouvé | Vérifier IndexedDB keyPath = 'local_id' (string) |
| 503 Service Unavailable | Erreur après création | Vérifier staticfiles/js/app-offline-unified.js v5 |
| Checkboxes non restaurées | Modifie toujours hors | Vérifier `el.checked = value === 'on'` |
| CSRF token missing | 403 Forbidden | Vider cookies, relancer page |
| Sync ne marche pas | Fiches restent "En attente" | Vérifier `/api/fiche/creer/` endpoint |

---

## ✅ CHECK-LIST FINALE

- [ ] Test 1 réussi (Créer offline)
- [ ] Test 2 réussi (Voir offline)
- [ ] Test 3 réussi (Modifier offline)
- [ ] Test 4 réussi (Supprimer offline)
- [ ] Test 5 réussi (Synchroniser)
- [ ] Test 6 réussi (Cycle hybride)
- [ ] Console: Pas d'erreurs critiques
- [ ] IndexedDB: Fiches présentes et bien structurées
- [ ] Network: Requêtes correctes en mode online
- [ ] Notifications: Tous les messages s'affichent
- [ ] Pas de 503 ou "undefined" errors
- [ ] Performance acceptable (< 2s par opération)

---

## 📞 SUPPORT

Si vous rencontrez un problème:

1. **D'abord**: Vérifier la console DevTools (F12 → Console)
2. **Puis**: Vérifier IndexedDB (DevTools → Application → IndexedDB)
3. **Ensuite**: Tester Test 1 à 5 dans l'ordre
4. **Enfin**: Consulter la section "❌ Si ça échoue" pour chaque test

---

**Version**: 1.0  
**Dernière mise à jour**: 2025-01-22  
**Testée sur**: Chrome/Chromium, Firefox, Safari
