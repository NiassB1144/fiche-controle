# 🎯 INSTRUCTIONS DÉPLOIEMENT v6 - Offline Delete/View/Modify Fix

## Problème Rapporté
```
✅ Créer une fiche en offline: MARCHE
❌ Supprimer une fiche en offline: NE MARCHE PAS
❌ Voir détails en offline: NE MARCHE PAS
❌ Modifier une fiche en offline: NE MARCHE PAS
```

## Solution Appliquée

**Bug identifié:** Extraction du `local_id` utilisait `dataset.localId` au lieu de `getAttribute('data-local-id')`

```javascript
// AVANT (CASSÉ):
const lid = deleteBtn.dataset.localId;  // ❌ FAUX

// APRÈS (FIXÉ):
const lid = deleteBtn.getAttribute('data-local-id');  // ✅ CORRECT
```

---

# 📋 ÉTAPES DE DÉPLOIEMENT (5-10 min)

## ⏸️ ÉTAPE 1: Arrêter Django
```
1. Localiser la fenêtre avec Django en cours d'exécution
2. Appuyer sur: Ctrl + C
3. Attendre le message: "Keyboard interrupt received"
4. Confirmer que le serveur s'est arrêté
```

---

## 📦 ÉTAPE 2: Synchroniser les Fichiers

### Option A: Utiliser le script batch (RECOMMANDÉ - Windows)
```
1. Ouvrir l'explorateur: C:\Users\DELL\Desktop\Inspection du travail\Projet\fiche-controle
2. Double-cliquer: DEPLOY_v6.bat
3. Suivre les instructions
4. Appuyer sur une touche
```

### Option B: Copie manuelle
```
1. Ouvrir l'explorateur
2. Aller à: static\js\
3. Copier: app-offline-unified.js
4. Coller à: staticfiles\js\ (remplacer)
5. Aller à: static\
6. Copier: offline.html
7. Coller à: staticfiles\ (remplacer)
```

### Option C: Ligne de commande
```bash
cd "C:\Users\DELL\Desktop\Inspection du travail\Projet\fiche-controle"
python manage.py collectstatic --clear --noinput
```

**Résultat attendu:**
```
123 static files collected
```

---

## 🚀 ÉTAPE 3: Relancer Django
```bash
# Dans le dossier du projet:
python manage.py runserver

# Attendez:
# Starting development server at http://127.0.0.1:8000/
```

---

## 🧹 ÉTAPE 4: Vider le Cache Navigateur

### Google Chrome / Microsoft Edge
```
1. Ouvrir DevTools: F12
2. Menu (⋮) → More tools → Clear browsing data
   OU
   Ctrl + Shift + Delete

3. Sélectionner:
   ✅ Cookies and other site data
   ✅ Cached images and files
   ✅ All time

4. Cliquer: "Clear data"

5. Hard refresh: Ctrl + Shift + R
```

### Firefox
```
1. Ouvrir DevTools: F12
2. Storage → Clear everything
   OU
   Ctrl + Shift + Delete

3. Cocher tout
4. Cliquer: "Clear Now"
5. Hard refresh: Ctrl + Shift + R
```

---

## ✅ ÉTAPE 5: Activer Mode Offline

```
1. Ouvrir DevTools: F12
2. Aller à: Network tab
3. Cocher: ☑️ Offline
4. Rafraîchir la page: F5

Vous devriez voir:
- Les fiches locales affichées
- Les boutons: Modifier | Voir | Supprimer
```

---

## 🧪 ÉTAPE 6: Tests Complets

### Test 1️⃣ : Supprimer une Fiche

**Conditions:**
- Mode offline ✅
- Au moins une fiche existe ✅

**Actions:**
```
1. Aller à: http://127.0.0.1:8000/fiches/
2. Localiser une fiche
3. Cliquer sur le bouton: 🗑️ Supprimer
4. Une fenêtre de confirmation apparaît
5. Cliquer: "OK"
```

**Résultats attendus:**
```
✅ Fiche disparaît de la liste
✅ Toast vert: "Fiche supprimée ✓"
✅ Console (F12) affiche:
   [FicheApp] 🗑️ Suppression demandée
   [FicheApp] ✓ Fiche locale supprimée
```

### Test 2️⃣ : Voir Détails d'une Fiche

**Conditions:**
- Mode offline ✅
- Au moins une fiche existe ✅

**Actions:**
```
1. Aller à: http://127.0.0.1:8000/fiches/
2. Localiser une fiche
3. Cliquer sur le bouton: 👁️ Voir
```

**Résultats attendus:**
```
✅ Une modale s'ouvre au centre
✅ Affiche le titre: "📋 Nom de l'entreprise"
✅ Contient un tableau avec tous les détails
✅ Bouton "Fermer" (et X en haut à droite)
✅ Toast bleu: "Détails chargés ✓"
✅ Peut fermer:
   - En cliquant le X
   - En cliquant le bouton "Fermer"
   - En cliquant dehors la modale
✅ Console (F12) affiche:
   [FicheApp] 👁️ Consultation demandée
   [FicheApp] ✓ Fiche chargée pour affichage
```

### Test 3️⃣ : Modifier une Fiche

**Conditions:**
- Mode offline ✅
- Au moins une fiche existe ✅

**Actions:**
```
1. Aller à: http://127.0.0.1:8000/fiches/
2. Localiser une fiche
3. Cliquer sur le bouton: ✏️ Modifier
```

**Résultats attendus:**
```
✅ Redirection vers: http://127.0.0.1:8000/fiches/creer/?local_id=...
✅ Formulaire pré-rempli avec les données
✅ Toast bleu: "📋 Fiche chargée depuis cache"
✅ Modifier un champ, ex: "Nom entreprise"
✅ Cliquer: "Enregistrer"
✅ Toast vert: "Fiche mise à jour ✓"
✅ Retour à la liste
✅ Vérifier que le changement est visible
✅ Console (F12) affiche:
   [FicheApp] ✏️ Édition demandée
   [FicheApp] 📋 Chargement détails
```

---

## 📊 Résumé des Changements

| Fonction | Avant | Après | Fichier |
|----------|-------|-------|---------|
| **renderLocalFiches()** | Utilise `dataset.localId` (cassé) | Utilise `getAttribute('data-local-id')` (fixé) | app-offline-unified.js |
| **editFicheLocal()** | Pas de vérification | Valide existence + redirection | app-offline-unified.js |
| **viewLocalFiche()** | Ne faisait rien | Ouvre modale stylisée + toast | app-offline-unified.js |
| **deleteFicheLocal()** | Code complexe erroné | Simple + efficace + toast | app-offline-unified.js |

---

## ❌ Dépannage

### Problème: Boutons ne répondent pas
```
✓ Vérifier que mode offline est activé (Network → Offline ☑️)
✓ Vérifier console F12 pour erreurs
✓ Vérifier IndexedDB (DevTools → Application → IndexedDB → fiches-app)
✓ Si fiches vides: créer d'abord en offline
✓ Hard refresh: Ctrl + Shift + R
```

### Problème: "Fiche non trouvée"
```
✓ Cela signifie qu'IndexedDB ne contient pas la fiche
✓ Vérifier IndexedDB dans DevTools
✓ Créer une fiche offline d'abord
✓ Vérifier toast: "✓ Fiche créée avec succès"
```

### Problème: Modale ne s'ouvre pas
```
✓ Vérifier console F12 pour "[FicheApp] ❌" messages
✓ Vérifier que fiche n'est pas vide
✓ Hard refresh cache complet
✓ Réactiver offline mode
```

### Problème: Formulaire modificat ion ne charge pas
```
✓ Vérifier URL contient "local_id="
✓ Vérifier toast "📋 Fiche chargée depuis cache"
✓ Vérifier IndexedDB pour la fiche
✓ Vérifier console pour erreurs
```

---

## 🆘 Support

**Pour déboguer, ouvrir la console (F12) et chercher:**

```javascript
// Succès - vous devriez voir ces logs:
[FicheApp] 🗑️ Suppression demandée
[FicheApp] ✓ Fiche locale supprimée

[FicheApp] 👁️ Consultation demandée
[FicheApp] ✓ Fiche chargée pour affichage

[FicheApp] ✏️ Édition demandée
[FicheApp] 📋 Chargement détails

// Erreurs - contactez-moi si vous voyez:
[FicheApp] ❌ Erreur...
GET /fiches/undefined/ 503
```

---

## ✨ Fichiers Modifiés

```
✅ static/js/app-offline-unified.js
   - renderLocalFiches() (lignes 448-465)
   - editFicheLocal() (lignes 472-482)
   - viewLocalFiche() (lignes 484-554)
   - deleteFicheLocal() (lignes 556-566)

✅ staticfiles/js/app-offline-unified.js
   - À synchroniser (via collectstatic ou copie)

📄 Docs:
   - OFFLINE_BUG_FIX_v6.md (détails techniques)
   - QUICK_DEPLOY_v6.md (guide rapide)
   - DEPLOY_v6.bat (script Windows)
   - deploy_v6.py (script Python)
```

---

## 🎉 Success Criteria

```
✅ Test 1 (Supprimer): Fiche disparaît
✅ Test 2 (Voir): Modale s'ouvre
✅ Test 3 (Modifier): Formulaire pré-rempli
✅ Tous les toasts affichés
✅ Aucune erreur console 503
✅ Créer/Modifier/Voir/Supprimer: TOUS FONCTIONNELS
```

---

**Version**: 6.0  
**Date**: 2024  
**Status**: ✅ Ready for Testing

Pour toute question, consulter le dossier `/fiches/Documentation/` ou les fichiers markdown.
