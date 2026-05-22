#!/bin/bash
# ========================================================================
# VERIFICATION SCRIPT — Offline + Mobile Optimizations
# ========================================================================

echo "🔍 Vérification des fichiers..."
echo ""

FILES_TO_CHECK=(
  "static/js/app-offline-unified.js"
  "static/css/fiche-mobile.css"
  "static/js/test-offline.js"
  "static/js/sw.js"
  "static/offline.html"
  "templates/inspection/base.html"
  "templates/inspection/fiche_form.html"
  "OFFLINE_MOBILE_UPDATES.md"
  "DEPLOYMENT_CHECKLIST.txt"
)

MISSING=0
for file in "${FILES_TO_CHECK[@]}"; do
  if [ -f "$file" ]; then
    SIZE=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null)
    echo "✅ $file ($SIZE bytes)"
  else
    echo "❌ MANQUANT: $file"
    MISSING=$((MISSING + 1))
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $MISSING -eq 0 ]; then
  echo "✨ Tous les fichiers sont présents!"
  echo ""
  echo "📝 Prochaines étapes:"
  echo "1. python manage.py collectstatic --noinput"
  echo "2. Redémarrer Django"
  echo "3. Tester en console: runOfflineTests()"
else
  echo "⚠️  Fichiers manquants: $MISSING"
  exit 1
fi

echo ""
echo "✅ Vérification terminée!"
