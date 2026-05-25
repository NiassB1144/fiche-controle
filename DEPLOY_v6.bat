@echo off
REM ============================================================
REM DÉPLOIEMENT RAPIDE v6 - Offline Fix
REM ============================================================

echo.
echo 🔧 DEPLOIEMENT OFFLINE FIX v6
echo ============================================================
echo.

REM 1. Arrêter Django
echo ⏹️ ÉTAPE 1: Arrêtez Django avec Ctrl+C avant de continuer
echo.
echo Appuyez sur une touche quand Django est arrêté...
pause

REM 2. Copier fichiers
echo.
echo 📋 ÉTAPE 2: Synchronisation des fichiers...
echo.

echo   - Copie app-offline-unified.js...
copy "static\js\app-offline-unified.js" "staticfiles\js\app-offline-unified.js" >nul 2>&1
if errorlevel 1 (
    echo     ❌ Erreur lors de la copie
) else (
    echo     ✅ Copie réussie
)

echo   - Copie offline.html...
copy "static\offline.html" "staticfiles\offline.html" >nul 2>&1
if errorlevel 1 (
    echo     ❌ Erreur lors de la copie
) else (
    echo     ✅ Copie réussie
)

REM 3. Exécuter collectstatic
echo.
echo 🗂️ ÉTAPE 3: Exécution collectstatic...
python manage.py collectstatic --clear --noinput
if errorlevel 1 (
    echo     ❌ Erreur lors de collectstatic
) else (
    echo     ✅ Collectstatic réussi
)

REM 4. Information finale
echo.
echo ============================================================
echo ✅ DÉPLOIEMENT TERMINÉ!
echo ============================================================
echo.
echo 🚀 PROCHAINES ÉTAPES:
echo.
echo   1️⃣ Relancer Django:
echo      python manage.py runserver
echo.
echo   2️⃣ Navigateur - Vider cache:
echo      Ctrl+Shift+Delete
echo      Sélectionner tout
echo      Supprimer
echo.
echo   3️⃣ Hard refresh:
echo      Ctrl+Shift+R
echo.
echo   4️⃣ Aller en mode offline (DevTools - Network - Offline)
echo.
echo   5️⃣ Tester:
echo      - Cliquer "Supprimer" ✓
echo      - Cliquer "Voir" ✓
echo      - Cliquer "Modifier" ✓
echo.
pause
