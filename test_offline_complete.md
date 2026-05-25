# 🧪 Test Complet Offline/Online

## Checklist de Test

### 1. **CONNEXION & CHARGEMENT**
- [ ] Accéder à `/fiches/`
- [ ] Console check: `[FicheApp] ✓ app-offline-unified.js chargé`
- [ ] Console check: `[FicheApp] 🎉 Événement FicheAppReady dispatché!`
- [ ] Console check: `[Liste] ℹ️ FicheAppReady déjà true, setup immédiatement`

### 2. **CRÉER FICHE (ONLINE)**
- [ ] Aller à `/fiches/nouvelle/`
- [ ] Remplir: Entreprise (req), Date (req)
- [ ] Cliquer "Soumettre"
- [ ] Console: `✓ API Response` (pour debug)
- [ ] Redirection vers `/fiches/` (pas `/fiches/undefined/`)
- [ ] Nouvelle fiche visible dans la liste

### 3. **VOIR DÉTAILS (ONLINE)**
- [ ] Aller à `/fiches/`
- [ ] Cliquer "Voir" sur une fiche
- [ ] Détails affichés
- [ ] Pas d'erreur 404/500

### 4. **MODIFIER FICHE (ONLINE)**
- [ ] Aller à `/fiches/`
- [ ] Cliquer "Modifier" sur une fiche
- [ ] Changer un champ
- [ ] Cliquer "Soumettre"
- [ ] Confirmation que ça change

### 5. **SUPPRIMER FICHE (ONLINE)**
- [ ] Aller à `/fiches/`
- [ ] Cliquer "Supprimer" sur une fiche
- [ ] Confirmation dialog apparaît (system confirm(), pas template)
- [ ] Cliquer "OK"
- [ ] Console: `[Liste] 🗑️ DELETE serveur, pk=X`
- [ ] Fiche disparaît de la liste
- [ ] Network: Vérifier DELETE requête → 200 OK

### 6. **CRÉER FICHE (OFFLINE)**
- [ ] DevTools > Network > Throttling > Offline (ou arrêter serveur)
- [ ] Aller à `/fiches/nouvelle/` (page doit rester en cache)
- [ ] Remplir: Entreprise, Date
- [ ] Cliquer "Soumettre"
- [ ] Console: `[FicheApp] Fiche sauvegardée localement`
- [ ] Redirect vers `/fiches/` (offline page)
- [ ] Fiche visible dans section "LOCAL"

### 7. **VOIR DÉTAILS FICHE LOCAL (OFFLINE)**
- [ ] En mode offline
- [ ] Aller à `/fiches/`
- [ ] Cliquer sur icon eye d'une fiche LOCAL
- [ ] Modal affiche: Entreprise, Date, etc.
- [ ] Modal a boutons: Modifier, Supprimer

### 8. **MODIFIER FICHE LOCAL (OFFLINE)**
- [ ] En mode offline
- [ ] Dans section LOCAL, cliquer "Modifier" ou click sur fiche → modal → Modifier
- [ ] Aller à `/fiches/creer/?local_id=...` (offline page en cache)
- [ ] Champs pré-remplis avec les valeurs
- [ ] Changer un champ
- [ ] Cliquer "Soumettre"
- [ ] Console: `[FicheApp] Fiche mise à jour`
- [ ] Fiche mise à jour dans section LOCAL

### 9. **SUPPRIMER FICHE LOCAL (OFFLINE)**
- [ ] En mode offline
- [ ] Dans section LOCAL, cliquer "Supprimer"
- [ ] Confirmation dialog
- [ ] Cliquer "OK"
- [ ] Console: `[FicheApp] ✓ Fiche supprimée`
- [ ] Fiche disparaît de section LOCAL

### 10. **SYNCHRONISATION**
- [ ] Créer 2-3 fiches offline
- [ ] Modifier 1-2 fiches offline
- [ ] Supprimer 1 fiche offline
- [ ] Revenir online (DevTools network throttling OFF, ou restart serveur)
- [ ] Aller à `/fiches/`
- [ ] Cliquer FAB button (sync)
- [ ] Toast: `X fiche(s) synchronisée(s)`
- [ ] Fiches offline disparaissent de section LOCAL
- [ ] Fiches apparaissent dans section SERVER
- [ ] Modifications visibles
- [ ] Suppression confirmée (fiche absente)

### 11. **PERFORMANCE**
- [ ] Chaque action < 1 seconde
- [ ] Pas de `[Violation]` dans console
- [ ] Pas de 500 errors

### 12. **ERROR HANDLING**
- [ ] Si DELETE échoue → Toast "Erreur"
- [ ] Si Sync échoue → Toast "Erreur"
- [ ] Si form invalid → Toast "Erreur validation"
- [ ] Pas de page blanche/crash

---

## 📊 Score

- 12/12 ✅ = **COMPLET & FONCTIONNEL**
- 9-11 ⚠️ = Mineurs problèmes
- < 9 ❌ = Problèmes critiques

---

## 📝 Logging à Vérifier

```javascript
// Au chargement:
[FicheApp] ✓ app-offline-unified.js chargé
[FicheApp] 🚀 App v5 - Offline Unified - Initialisation...
[FicheApp] ✓ DB ouverte
[FicheApp] ✓ App prête
[FicheApp] 🎉 Événement FicheAppReady dispatché!
[Liste] ℹ️ FicheAppReady déjà true, setup immédiatement
[Liste] 🎯 setupDeleteListeners() appelée
[Liste] window.FicheAppReady? true
[Liste] window.FicheApp? true
[Liste] 🎣 Attachement des listeners de suppression...
[Liste] ✅ Listeners DELETE attachés et prêts!

// Au delete:
[Liste] 🗑️ DELETE serveur, pk=123
(confirmation dialog)
(fiche disparaît)
```

---

## 🐛 Debugging

Si ça ne marche pas:

1. **Delete button pas réactif?**
   - Vérifier console: `setupDeleteListeners()` appelée?
   - Vérifier: `window.FicheApp.deleteFicheServer` existe?

2. **Offline pas sauvegardé?**
   - Devtools > Application > IndexedDB > ficheControleDB > fiches_locales
   - Fiche doit apparaître avec local_id unique

3. **Sync ne marche pas?**
   - Vérifier Network tab: POST requêtes vers API?
   - Vérifier IndexedDB après sync: synced=true?

4. **500 Error?**
   - Vérifier Backend console pour stack trace
   - CSRF token mal envoyé?
   - Données form invalides?
