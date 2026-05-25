# ✅ CHECKLIST DE VÉRIFICATION v6

## 📋 Avant le Déploiement

- [ ] Lire `INSTRUCTIONS_v6_FR.md` complètement
- [ ] Sauvegarder tout travail en cours
- [ ] Fermer les autres onglets navigateur (sauf celui en test)
- [ ] Django est arrêté (Ctrl+C confirme)
- [ ] Aucune autre instance Python ne tourne sur port 8000

---

## 🔧 Déploiement

- [ ] Copier `static/js/app-offline-unified.js` → `staticfiles/js/app-offline-unified.js`
- [ ] Copier `static/offline.html` → `staticfiles/offline.html`
- [ ] Exécuter: `python manage.py collectstatic --clear --noinput`
- [ ] Voir: "123 static files collected" (nombre varie)

---

## 🚀 Django Relancé

- [ ] Terminal affiche: "Starting development server at http://127.0.0.1:8000/"
- [ ] Navigateur: `http://127.0.0.1:8000/admin/` accessible
- [ ] Pas d'erreur 500 au démarrage

---

## 🧹 Cache Navigateur

- [ ] Appuyer Ctrl + Shift + Delete
- [ ] Sélectionner: ✅ "Cookies" ✅ "Cache images"
- [ ] Période: "All time"
- [ ] Cliquer: "Clear data"
- [ ] Voir message: "Cleared browsing data"

---

## 🔌 Mode Offline Activé

- [ ] Ouvrir DevTools: F12
- [ ] Aller à: Network tab
- [ ] Cocher: ☑️ Offline
- [ ] Navigateur affiche icône 🔴 "offline"
- [ ] Page `/fiches/` affiche fiches locales

---

## 🧪 Test 1: Supprimer

**Pré-condition:**
- [ ] Au moins 1 fiche locale existe
- [ ] Mode offline activé ✅
- [ ] Toast "✓ Fiche créée..." visible (si création test)

**Actions:**
- [ ] Cliquer bouton "🗑️ Supprimer" sur une fiche
- [ ] Fenêtre confirmation: "Supprimer définitivement cette fiche?"
- [ ] Cliquer "OK"

**Vérifications:**
- [ ] ✅ Fiche disparaît immédiatement
- [ ] ✅ Toast vert: "Fiche supprimée ✓"
- [ ] ✅ Console (F12) montre: `[FicheApp] 🗑️ Suppression demandée`
- [ ] ✅ Console montre: `[FicheApp] ✓ Fiche locale supprimée`
- [ ] ✅ Aucune erreur 503 dans Network tab
- [ ] ✅ Liste actualisée

**Résultat:** ☐ PASS ☐ FAIL

---

## 🧪 Test 2: Voir Détails

**Pré-condition:**
- [ ] Au moins 1 fiche locale existe
- [ ] Mode offline activé ✅
- [ ] Page `/fiches/` affichée

**Actions:**
- [ ] Cliquer bouton "👁️ Voir" sur une fiche

**Vérifications:**
- [ ] ✅ Modale s'ouvre au centre écran
- [ ] ✅ Titre: "📋 [Nom de l'entreprise]"
- [ ] ✅ Tableau avec tous les détails (SIRET, secteur, etc.)
- [ ] ✅ Bouton "Fermer" visible
- [ ] ✅ X en haut à droite visible
- [ ] ✅ Toast bleu: "Détails chargés ✓"
- [ ] ✅ Console montre: `[FicheApp] 👁️ Consultation demandée`
- [ ] ✅ Console montre: `[FicheApp] ✓ Fiche chargée pour affichage`

**Fermeture - Tester les 3 méthodes:**
1. [ ] Clic X → modale ferme
2. [ ] Clic "Fermer" → modale ferme
3. [ ] Clic dehors → modale ferme

**Résultat:** ☐ PASS ☐ FAIL

---

## 🧪 Test 3: Modifier

**Pré-condition:**
- [ ] Au moins 1 fiche locale existe
- [ ] Mode offline activé ✅
- [ ] Page `/fiches/` affichée

**Actions:**
- [ ] Cliquer bouton "✏️ Modifier" sur une fiche

**Vérifications Phase 1: Navigation**
- [ ] ✅ Redirection à: `http://127.0.0.1:8000/fiches/creer/?local_id=...`
- [ ] ✅ URL contient "local_id=" (pas "undefined")
- [ ] ✅ Toast bleu: "📋 Fiche chargée depuis cache"
- [ ] ✅ Console montre: `[FicheApp] ✏️ Édition demandée`

**Vérifications Phase 2: Formulaire**
- [ ] ✅ Formulaire est pré-rempli (pas vide)
- [ ] ✅ Champs contiennent les données sauvegardées
- [ ] ✅ Exemple: "Nom entreprise" = "Entreprise Test"
- [ ] ✅ Console montre: `[FicheApp] 📋 Chargement détails`

**Vérifications Phase 3: Modification**
- [ ] ✅ Changer un champ (ex: nom entreprise)
- [ ] ✅ Cliquer "Enregistrer"
- [ ] ✅ Toast vert: "Fiche mise à jour ✓"
- [ ] ✅ Redirection retour `/fiches/`
- [ ] ✅ Vérifier changement sauvegardé (Consulter détails)

**Résultat:** ☐ PASS ☐ FAIL

---

## 🧪 Test 4: Créer (Vérification Régression)

**Pré-condition:**
- [ ] Mode offline toujours activé ✅

**Actions:**
- [ ] Aller à: `/fiches/creer/`
- [ ] Remplir formulaire (minimums: Entreprise, SIRET)
- [ ] Cliquer "Enregistrer"

**Vérifications:**
- [ ] ✅ Toast vert: "✓ Fiche créée avec succès"
- [ ] ✅ Redirection à `/fiches/`
- [ ] ✅ Fiche apparaît dans liste "Fiches locales"
- [ ] ✅ Peut cliquer les 3 boutons dessus

**Résultat:** ☐ PASS ☐ FAIL

---

## 🧪 Test 5: Sync Avec Serveur (Online)

**Pré-condition:**
- [ ] Test 1-4 tous réussis

**Actions:**
1. [ ] Mode offline: Décocher ☐ Offline
2. [ ] Navigateur: Aller à `/fiches/`
3. [ ] Attendre 5 secondes
4. [ ] Vérifier console pour logs sync

**Vérifications:**
- [ ] ✅ Fiches sync avec serveur
- [ ] ✅ Status IndexedDB: "synced: true"
- [ ] ✅ Pas d'erreur 503
- [ ] ✅ Toast: "Synchronisation réussie"

**Résultat:** ☐ PASS ☐ FAIL

---

## ⚠️ Vérification des Erreurs

**Erreurs à ÉVITER:**

```
❌ GET /fiches/undefined/ 503
   → Cause: getAttribute('data-local-id') ne marche pas
   → Solution: Vérifier fichier staticfiles synchronisé

❌ Modale ne s'ouvre pas
   → Cause: Fiche non trouvée dans IndexedDB
   → Solution: Créer fiche d'abord, hard refresh

❌ Bouton ne répond pas
   → Cause: Event listener non attaché
   → Solution: Mode offline doit être ON, refresh F5

❌ Formulaire vide au modification
   → Cause: Fiche pas chargée depuis cache
   → Solution: Vérifier toast "📋 Fiche chargée depuis cache"
```

---

## 📝 Résumé Final

- **Tests réussis:** ____ / 5
- **Erreurs rencontrées:** ________________________
- **Actions correctives:** ________________________

### Signature
- **Date:** __________
- **Testeur:** __________
- **Statut Final:** ☐ ✅ SUCCÈS ☐ ❌ ÉCHEC

---

## 🆘 Si Problème

**Vérifier dans cet ordre:**

1. **Fichiers synchronisés?**
   ```
   Chercher dans staticfiles/js/:
   - app-offline-unified.js (taille > 30KB)
   - offline.html (taille > 10KB)
   ```

2. **Django relancé?**
   ```
   Terminal: "Starting development server"
   ```

3. **Cache vidé?**
   ```
   F12 → Application → Clear All
   ```

4. **Mode offline activé?**
   ```
   F12 → Network tab → Offline ☑️
   ```

5. **IndexedDB contient fiches?**
   ```
   F12 → Application → IndexedDB → fiches-app
   ```

6. **Console affiche logs?**
   ```
   F12 → Console: [FicheApp] messages
   ```

---

**Besoin d'aide?** → Consulter `INSTRUCTIONS_v6_FR.md`
