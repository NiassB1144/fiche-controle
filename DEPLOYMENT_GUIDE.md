# 🚀 GUIDE COMPLET DE DÉPLOIEMENT — v5

## Étapes de déploiement

### 1️⃣ Préparation
```bash
cd /c/Users/DELL/Desktop/Inspection\ du\ travail/Projet/fiche-controle/

# Vérifier que les fichiers sont présents
ls -la static/js/app-offline-unified.js
ls -la static/css/fiche-mobile.css
ls -la OFFLINE_MOBILE_UPDATES.md
```

### 2️⃣ Collectstatic (très important!)
```bash
# Copier les fichiers statiques dans staticfiles/
python manage.py collectstatic --noinput --clear

# Ou si vous voulez voir les détails:
python manage.py collectstatic --verbosity=2
```

### 3️⃣ Redémarrer Django
```bash
# Si vous utilisez runserver:
python manage.py runserver

# Si vous utilisez Gunicorn:
gunicorn fiche_project.wsgi --reload
```

### 4️⃣ Vérification Navigateur

#### 4a. Ouvrir l'application
```
http://localhost:8000/fiches/
```

#### 4b. Vérifier le chargement des fichiers
**DevTools → Network:**
- Chercher `app-offline-unified.js` ✓ Chargé
- Chercher `fiche-mobile.css` ✓ Chargé

**DevTools → Console:**
```javascript
// Doit afficher l'objet avec toutes les méthodes
console.log(window.FicheApp)

// Lancer la suite de tests complète
runOfflineTests()
```

#### 4c. Vérifier IndexedDB
**DevTools → Application → IndexedDB → ficheControleDB → fiches_locales**

Vous devez voir:
- Database: `ficheControleDB`
- Version: `5`
- Store: `fiches_locales`

### 5️⃣ Tests Offline

#### Test 1: Créer une fiche offline
```
1. Ouvrir DevTools > Network > Throttling
2. Sélectionner "Offline"
3. Aller à /fiches/creer/
4. Remplir le formulaire
5. Clic "Enregistrer"
6. Vérifier: Toast "Fiche sauvegardée localement"
7. Retour à /fiches/
8. Voir section "Fiches hors-ligne" avec la fiche
```

#### Test 2: Modifier une fiche offline
```
1. Rester en offline
2. Clic "Modifier" sur la fiche créée
3. Changer quelque chose
4. Clic "Enregistrer"
5. Vérifier: Toast "Fiche mise à jour"
6. Retour à /fiches/
7. La fiche toujours là avec modifications
```

#### Test 3: Suppression offline
```
1. Rester en offline
2. Clic "Supprimer" sur la fiche
3. Confirmer
4. Vérifier: Fiche disparue de la liste
5. IndexedDB: Fiche supprimée
```

#### Test 4: Synchronisation à la reconnexion
```
1. Créer une fiche en offline
2. DevTools > Network > Throttling > Online (ou décocher Offline)
3. Attendre ~5s ou recharger page
4. Vérifier:
   - Toast "✅ 1 fiche(s) synchronisée(s)"
   - Fiche n'est plus dans "Fiches hors-ligne"
   - Fiche apparaît dans "Toutes les fiches"
   - Badge changé de "⏳ En attente" à "✓ Synchronisé"
```

### 6️⃣ Tests Mobile (Responsive)

**DevTools → Toggle device toolbar (Ctrl+Shift+M)**

#### Test sur différentes tailles:
```
- iPhone SE (375x667) - Portrait
- iPad (768x1024) - Portrait & Landscape
- Desktop (1920x1080)
```

Vérifications:
- ✓ Inputs 48px minimum
- ✓ Boutons 48px minimum
- ✓ Navigation sticky bottom
- ✓ Pas de débordement horizontal
- ✓ Texte lisible
- ✓ Espacement adapté
- ✓ FAB button visible
- ✓ Checkboxes cliquables

### 7️⃣ Tests Dark Mode (Optionnel)

**DevTools → Rendering → Emulate CSS media feature: prefers-color-scheme**

Vérifications:
- ✓ Texte visible sur fond sombre
- ✓ Inputs lisibles
- ✓ Boutons contrastés


## Vérification Complète (Checklist)

```
□ npm/yarn dependencies OK
□ python manage.py check PASS
□ Migration database DONE
□ collectstatic EXECUTED
□ Django server RUNNING
□ Network tab shows: app-offline-unified.js ✓
□ Network tab shows: fiche-mobile.css ✓
□ Console shows: window.FicheApp defined ✓
□ IndexedDB v5 présente ✓
□ runOfflineTests() PASS ✓
□ Test créer fiche offline PASS ✓
□ Test modifier fiche offline PASS ✓
□ Test supprimer fiche offline PASS ✓
□ Test sync à reconnexion PASS ✓
□ Responsive design mobile PASS ✓
□ Toast notifications WORKING ✓
□ FAB button VISIBLE ✓
□ Service Worker ACTIVE ✓
```


## Troubleshooting

### Problème: "window.FicheApp is undefined"
```
Solution:
1. Vérifier que app-offline-unified.js est chargé
2. DevTools > Sources > app-offline-unified.js
3. Vérifier que base.html importe le bon fichier
4. Vider cache navigateur: Ctrl+Shift+Del
5. Recharger: Ctrl+Shift+R
```

### Problème: "IndexedDB version conflict"
```
Solution:
1. Ouvrir console
2. Exécuter: indexedDB.deleteDatabase('ficheControleDB')
3. Recharger page
4. IndexedDB se recrée avec v5
```

### Problème: "Fiches offline invisibles"
```
Solution:
1. Vérifier IndexedDB > fiches_locales
2. Console: await window.FicheApp.getAllFiches()
3. Si empty: Créer fiche test en offline
4. Vérifier renderLocalFiches() appelée
5. Vérifier CSS display de #local-fiches-section
```

### Problème: "Sync ne fonctionne pas"
```
Solution:
1. Vérifier: navigator.onLine == true
2. Vérifier: API endpoints /api/fiche/creer/ accessible
3. Vérifier: CSRF token présent
4. Check console pour erreurs
5. Network tab: voir requête POST
```

### Problème: "CSS mobile pas appliqué"
```
Solution:
1. Vérifier: collectstatic exécuté
2. Vérifier: staticfiles/css/fiche-mobile.css existe
3. DevTools > Network > fiche-mobile.css (200 OK?)
4. Vider cache: Ctrl+Shift+Del
5. Hard refresh: Ctrl+Shift+R
```

### Problème: "Service Worker n'update pas"
```
Solution:
1. DevTools > Application > Service Workers
2. Décocher "Update on reload"
3. Clic "Unregister" sur ancienne version
4. DevTools > Network > Offline
5. DevTools > Network > Online
6. Page auto-refresh avec nouveau SW
```


## Rollback (Si Problème)

Si vous devez revenir à l'ancienne version:

```bash
# 1. Revert les modifications
git checkout HEAD -- templates/inspection/

# 2. Revert le script dans base.html
git checkout HEAD -- templates/inspection/base.html

# 3. Utiliser ancien app.js
git checkout HEAD -- static/js/

# 4. Collectstatic
python manage.py collectstatic --noinput --clear

# 5. Restart Django
python manage.py runserver
```


## Post-Deployment

### Surveillance
```
1. Vérifier les logs d'erreur
2. Monitoring sync failures
3. Check IndexedDB quota usage
4. Monitor performance metrics
```

### Notifications utilisateurs
```
Email/Notif aux utilisateurs:

Sujet: "🎉 Fiche Contrôle v5 - Nouveau mode hors-ligne!"

Corps:
"L'application est maintenant optimisée pour le mobile et 
supporte le mode hors-ligne!

Vous pouvez désormais:
✓ Créer des fiches sans internet
✓ Modifier vos fiches en offline
✓ Consulter vos fiches même sans connexion
✓ Synchronisation automatique au retour online

Interface entièrement adaptée aux téléphones et tablettes!

Testé et approuvé pour production."
```


## Documentation pour Utilisateurs

**Créer doc utilisateur simple:**

### Guide Utilisateur - Mode Offline

1. **Qu'est-ce que le mode offline?**
   Vous pouvez utiliser l'app même sans internet!

2. **Comment créer une fiche hors-ligne?**
   - Créer fiche normalement
   - Clic "Enregistrer"
   - App enregistre localement
   - Au retour online, sync automatique

3. **Comment voir mes fiches offline?**
   - Page "Mes fiches"
   - Section "Fiches hors-ligne"
   - Voir, modifier, supprimer

4. **Comment fonctionne la sync?**
   - Auto à la reconnexion (5s check)
   - Ou toutes les 30s si online
   - Toast notification lors sync

5. **Questions fréquentes?**
   - Q: Mes données seront perdues?
   - A: Non! Stockées localement jusqu'à sync


## Validation Finale

```bash
# 1. Tests automatisés
python manage.py test inspection

# 2. Performance check
python manage.py shell
>>> from django.core.management import call_command
>>> call_command('collectstatic', verbosity=0)
>>> # OK si aucune erreur

# 3. Lint check (si disponible)
flake8 inspection/

# 4. Manual testing
# Voir checklist plus haut

# 5. Production ready?
echo "✅ Prêt pour production!"
```


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ Déploiement réussi! Bienvenue en v5! 🚀
