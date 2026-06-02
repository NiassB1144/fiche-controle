#!/bin/bash
# 🚀 QUICK START SCRIPT - Offline-First v2

echo "╔════════════════════════════════════════════════════╗"
echo "║  🚀 OFFLINE-FIRST v2 - QUICK START                 ║"
echo "║     Architecture Complète Offline-First            ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================
# STEP 1: Vérifier les fichiers
# ============================================================
echo -e "${BLUE}STEP 1: Vérification des fichiers...${NC}"
echo "--------"

python verify_offline_first.py
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Vérification échouée!${NC}"
    exit 1
fi
echo ""

# ============================================================
# STEP 2: Démarrer Django
# ============================================================
echo -e "${BLUE}STEP 2: Démarrage du serveur Django...${NC}"
echo "--------"
echo -e "${YELLOW}▶ Commande:${NC} python manage.py runserver 0.0.0.0:8000"
echo ""
echo -e "${YELLOW}ℹ Attendez le message 'Quit the server with CONTROL-C'${NC}"
echo ""

python manage.py runserver 0.0.0.0:8000 &
SERVER_PID=$!

# Attendre que le serveur démarre
sleep 3

if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo -e "${RED}✗ Serveur n'a pas démarré!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Serveur démarré (PID: $SERVER_PID)${NC}"
echo ""

# ============================================================
# STEP 3: Afficher les instructions
# ============================================================
echo -e "${BLUE}STEP 3: Instructions de test...${NC}"
echo "--------"
echo ""
echo "🌐 OUVRE LE NAVIGATEUR:"
echo "   http://localhost:8000/inspection/liste_fiches/"
echo ""
echo "📱 ACTIVE LE MODE OFFLINE:"
echo "   Chrome/Firefox → DevTools (F12)"
echo "   → Application ou Network tab"
echo "   → Offline checkbox"
echo ""
echo "📝 CRÉER UNE FICHE:"
echo "   1. Aller à: http://localhost:8000/inspection/creer/"
echo "   2. Remplir le formulaire"
echo "   3. Clicker 'Sauvegarder'"
echo ""
echo "✅ VÉRIFIER LA LISTE:"
echo "   1. Retour à: http://localhost:8000/inspection/liste_fiches/"
echo "   2. La fiche doit apparaître avec badge '🗄️ Hors-ligne'"
echo ""
echo "👁️ VOIR LE DÉTAIL:"
echo "   1. Clicker 'Voir' sur la fiche"
echo "   2. URL doit être: /inspection/fiche/offline/?id=XXX"
echo "   3. Contenu doit charger sans erreur Django"
echo ""
echo "✏️ MODIFIER:"
echo "   1. Clicker 'Modifier'"
echo "   2. Changer le nom de l'entreprise"
echo "   3. Clicker 'Sauvegarder'"
echo "   4. Pas d'erreur = ✅ SUCCESS"
echo ""
echo "🗑️ SUPPRIMER:"
echo "   1. Clicker 'Supprimer'"
echo "   2. Confirmer"
echo "   3. Fiche disparaît = ✅ SUCCESS"
echo ""
echo "🔍 VÉRIFIER INDEXEDDB:"
echo "   DevTools → Application → IndexedDB → ficheControleDB"
echo "   Voir les fiches en fiches_locales"
echo ""
echo "🔍 VÉRIFIER SERVICE WORKER:"
echo "   DevTools → Application → Service Workers"
echo "   Voir que sw.js est 'Active and running'"
echo ""
echo "🔍 VÉRIFIER CACHE:"
echo "   DevTools → Application → Cache Storage"
echo "   Voir que /offline-fiche.html est en cache"
echo ""
echo "📊 EXÉCUTER LES TESTS AUTOMATISÉS:"
echo "   DevTools Console (F12 → Console)"
echo "   Paste:"
echo "   fetch('/test-offline-first.js').then(r => r.text()).then(eval)"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}✓ Serveur en cours d'exécution!${NC}"
echo -e "${GREEN}✓ Prêt pour les tests!${NC}"
echo ""
echo "Appuie sur CTRL+C pour arrêter le serveur"
echo ""

# Garder le serveur en cours d'exécution
wait $SERVER_PID
