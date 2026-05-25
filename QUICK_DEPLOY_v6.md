# ⚡ DÉPLOIEMENT RAPIDE v6 - 5 MIN

## 🎯 Objectif
Fixer les 3 opérations en mode offline qui ne fonctionnaient pas:
- ✅ Supprimer une fiche
- ✅ Consulter détails
- ✅ Modifier une fiche

---

## ✋ ÉTAPE 1: ARRÊTER DJANGO (30s)

```bash
Ctrl+C

# Attendre:
# KeyboardInterrupt received, shutting down gracefully...
```

---

## 📋 ÉTAPE 2: SYNCHRONISER LES FICHIERS (1 min)

### Option A: Avec Python (RECOMMANDÉ)
```bash
python deploy_v6.py
```

### Option B: Avec Django
```bash
python manage.py collectstatic --clear --noinput
```

**Résultat attendu:**
```
✅ Collectstatic réussi
123 static files collected
```

---

## 🚀 ÉTAPE 3: REDÉMARRER DJANGO (30s)

```bash
python manage.py runserver

# Attendre:
# Starting development server at http://127.0.0.1:8000/
```

---

## 🧹 ÉTAPE 4: VIDER LE CACHE NAVIGATEUR (1 min)

```
1. F12 (DevTools)
2. Ctrl+Shift+Delete (cache)
   OU
   Application → Clear Storage
3. Sélectionner "Tout le temps"
4. Cocher TOUS les éléments
5. "Supprimer les données"
6. Ctrl+Shift+R (hard refresh)
```

---

## ✅ ÉTAPE 5: TESTER LES 3 OPÉRATIONS (2 min)

### Mode Offline
```
DevTools → Network → Offline
```

### Test 1: Supprimer ✅
```
1. Page /fiches/ (offline)
2. Cliquer "🗑️ Supprimer" sur une fiche
3. Confirmer
✓ Fiche disparaît
✓ Toast: "Fiche supprimée ✓"
✓ Console: "✓ Fiche locale supprimée"
```

### Test 2: Voir Détails ✅
```
1. Page /fiches/ (offline)
2. Cliquer "👁️ Voir"
✓ Modale s'ouvre
✓ Affiche tous les détails
✓ Peut fermer (X ou click dehors)
✓ Toast: "Détails chargés ✓"
```

### Test 3: Modifier ✅
```
1. Page /fiches/ (offline)
2. Cliquer "✏️ Modifier"
✓ Redirection /fiches/creer/?local_id=...
✓ Formulaire pré-rempli
✓ Toast: "📋 Fiche chargée depuis cache"
3. Modifier un champ
4. Enregistrer
✓ Toast: "Fiche mise à jour ✓"
```

---

## 🎉 SUCCÈS!

Si tous les tests passent, vous êtes DONE! ✅

**Qu'est-ce qui a changé:**

```javascript
// AVANT (CASSÉ):
const lid = deleteBtn.dataset.localId;  // ❌ Ne trouvait pas data-local-id

// APRÈS (FIXÉ):
const lid = deleteBtn.getAttribute('data-local-id');  // ✅ CORRECT!
```

---

## ❌ Si ça ne marche pas

### Problème: Bouton ne répond pas
**Solution:**
1. Vérifier console (F12) pour erreurs
2. Vérifier IndexedDB (DevTools → Application → IndexedDB)
3. Vider cache complètement
4. Redémarrer Django

### Problème: Modale ne s'ouvre pas
**Solution:**
1. Vérifier que fiche existe (console: `window.FicheApp.getAllFiches()`)
2. Vérifier console pour "Fiche non trouvée"
3. Hard refresh (Ctrl+Shift+R)

### Problème: Modification ne charge pas
**Solution:**
1. Vérifier URL contient `local_id`
2. Vérifier toast "📋 Fiche chargée depuis cache"
3. Vérifier console pour erreurs

---

## 📞 SUPPORT

Chercher dans console (F12):
```javascript
[FicheApp] ✓ ...    // Succès
[FicheApp] ❌ ...   // Erreur
```

---

**Durée totale**: ~5-10 minutes  
**Complexité**: ⭐ Très simple  
**Risk**: 🟢 Minimal (corrections de bugs uniquement)
