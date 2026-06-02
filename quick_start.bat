@echo off
REM 🚀 QUICK START SCRIPT - Offline-First v2 (Windows)

echo.
echo ╔════════════════════════════════════════════════════╗
echo ║  🚀 OFFLINE-FIRST v2 - QUICK START                 ║
echo ║     Architecture Complète Offline-First            ║
echo ╚════════════════════════════════════════════════════╝
echo.

REM Colors not supported in batch, using simple format
setlocal enabledelayedexpansion

REM ============================================================
REM STEP 1: Vérifier les fichiers
REM ============================================================
echo [STEP 1] Vérification des fichiers...
echo --------
python verify_offline_first.py
if errorlevel 1 (
    echo ✗ Vérification échouée!
    exit /b 1
)
echo.

REM ============================================================
REM STEP 2: Instructions
REM ============================================================
echo [STEP 2] Instructions de test...
echo --------
echo.
echo 🌐 OUVRE LE NAVIGATEUR:
echo    http://localhost:8000/inspection/liste_fiches/
echo.
echo 📱 ACTIVE LE MODE OFFLINE:
echo    Chrome/Firefox ^> DevTools (F12)
echo    ^> Application ou Network tab
echo    ^> Offline checkbox
echo.
echo 📝 CRÉER UNE FICHE:
echo    1. Aller à: http://localhost:8000/inspection/creer/
echo    2. Remplir le formulaire
echo    3. Clicker 'Sauvegarder'
echo.
echo ✅ VÉRIFIER LA LISTE:
echo    1. Retour à: http://localhost:8000/inspection/liste_fiches/
echo    2. La fiche doit apparaître avec badge '🗄️ Hors-ligne'
echo.
echo 👁️ VOIR LE DÉTAIL:
echo    1. Clicker 'Voir' sur la fiche
echo    2. URL doit être: /inspection/fiche/offline/?id=XXX
echo    3. Contenu doit charger sans erreur Django
echo.
echo ✏️ MODIFIER:
echo    1. Clicker 'Modifier'
echo    2. Changer le nom de l'entreprise
echo    3. Clicker 'Sauvegarder'
echo    4. Pas d'erreur = ✅ SUCCESS
echo.
echo 🗑️ SUPPRIMER:
echo    1. Clicker 'Supprimer'
echo    2. Confirmer
echo    3. Fiche disparaît = ✅ SUCCESS
echo.
echo 🔍 VÉRIFIER INDEXEDDB:
echo    DevTools ^> Application ^> IndexedDB ^> ficheControleDB
echo    Voir les fiches en fiches_locales
echo.
echo 🔍 VÉRIFIER SERVICE WORKER:
echo    DevTools ^> Application ^> Service Workers
echo    Voir que sw.js est 'Active and running'
echo.
echo 🔍 VÉRIFIER CACHE:
echo    DevTools ^> Application ^> Cache Storage
echo    Voir que /offline-fiche.html est en cache
echo.
echo 📊 EXÉCUTER LES TESTS AUTOMATISÉS:
echo    DevTools Console (F12 ^> Console)
echo    Paste:
echo    fetch('/test-offline-first.js').then(r ^> r.text()).then(eval)
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

REM ============================================================
REM STEP 3: Démarrer Django
REM ============================================================
echo [STEP 3] Démarrage du serveur Django...
echo --------
echo.
echo ▶ Commande: python manage.py runserver 0.0.0.0:8000
echo.
echo ℹ Attendez le message 'Starting development server at'
echo.

python manage.py runserver 0.0.0.0:8000

REM If we get here, server stopped
echo.
echo ✓ Serveur arrêté
echo.
