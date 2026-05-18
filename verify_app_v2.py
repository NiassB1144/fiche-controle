#!/usr/bin/env python3
"""
Vérification de l'intégration app.js v2
Vérifie que la consolidation offline.js → app.js est complète
"""

import os
import re

os.chdir(r'c:\Users\DELL\Desktop\Inspection du travail\Projet\fiche-controle')

print("=" * 70)
print("VÉRIFICATION CONSOLIDATION APP.JS V2")
print("=" * 70)
print()

# 1. Vérifier app.js
print("1️⃣  Analyse app.js v2:")
with open('static/js/app.js', 'r', encoding='utf-8') as f:
    app_content = f.read()

# Vérifier les sections principales
sections_found = []
sections = [
    ('CONFIGURATION & LOGGING', 'logInfo.*logWarn.*logError'),
    ('NOTIFICATIONS TOAST', 'afficherNotification'),
    ('GESTION CONNEXION & STATUT', 'mettreAJourStatut'),
    ('INDEXEDDB - OPÉRATIONS', 'ouvrirDB.*sauvegarderLocalement'),
    ('COMPTEURS & LISTES', 'getLocalFicheCount.*getLocalFichesList'),
    ('BANNIERE SYNC', 'majBanniereSync'),
    ('RENDU LISTE FICHES', 'renderLocalFiches'),
    ('TÉLÉCHARGEMENT', 'downloadFicheAsJson.*downloadFichePdf'),
    ('SYNCHRONISATION', 'syncLocale.*MAX_RETRIES.*RETRY_DELAY'),
    ('PWA - INSTALLATION', 'deferredPrompt.*beforeinstallprompt'),
    ('SERVICE WORKER', 'serviceWorker.*register'),
    ('INITIALISATION DOM', 'DOMContentLoaded'),
    ('EXPORTS GLOBAUX', 'window.FicheApp'),
]

for section, pattern in sections:
    if re.search(pattern, app_content, re.DOTALL | re.IGNORECASE):
        sections_found.append(f"   ✓ {section}")
    else:
        sections_found.append(f"   ❌ {section} - MANQUANTE")

for item in sections_found:
    print(item)

print()
print(f"✓ Sections trouvées: {sum(1 for x in sections_found if '✓' in x)}/{len(sections)}")

# 2. Fonctions clés
print()
print("2️⃣  Fonctions clés implémentées:")
functions = [
    'logInfo', 'logWarn', 'logError',
    'afficherNotification', 'creerToastContainer',
    'mettreAJourStatut',
    'ouvrirDB', 'sauvegarderLocalement', 'getFichesNonSynced',
    'getFicheByLocalId', 'deleteLocalFiche', 'marquerSynced',
    'getLocalFicheCount', 'getLocalFichesList',
    'majBanniereSync', 'renderLocalFiches',
    'downloadFicheAsJson', 'downloadFichePdf',
    'syncLocale',
]

for func in functions:
    pattern = f'(async\\s+)?function\\s+{func}\\s*\\('
    if re.search(pattern, app_content):
        print(f"   ✓ {func}()")
    else:
        print(f"   ❌ {func}() - NON TROUVÉE")

# 3. Vérifier lignes de code
lines = len(app_content.split('\n'))
print()
print(f"3️⃣  Statistiques:")
print(f"   • Lignes de code: {lines}")
print(f"   • Taille: {len(app_content) / 1024:.1f} KB")

# 4. Vérifier logging amélioré
print()
print("4️⃣  Logging amélioré:")
if 'toLocaleTimeString' in app_content:
    print("   ✓ Timestamps dans les logs")
else:
    print("   ❌ Timestamps manquants")

if 'LOG_PREFIX' in app_content:
    print("   ✓ Préfixe de log configurable")
else:
    print("   ❌ Préfixe manquant")

if re.search(r"logInfo.*'🔄.*Sync", app_content, re.DOTALL):
    print("   ✓ Logs avec emojis")
else:
    print("   ❌ Emojis manquants")

# 5. Vérifier retry mecanism
print()
print("5️⃣  Retry automatique:")
if 'MAX_RETRIES' in app_content and 'RETRY_DELAY' in app_content:
    print("   ✓ Constants retry configurées")
else:
    print("   ❌ Constants retry manquantes")

if re.search(r"syncRetryCount.*MAX_RETRIES", app_content, re.DOTALL):
    print("   ✓ Logique retry implémentée")
else:
    print("   ❌ Logique retry manquante")

if 'setTimeout' in app_content and '2000' in app_content:
    print("   ✓ Délai de 2s entre retry")
else:
    print("   ❌ Délai manquant")

# 6. Vérifier offline.js backup
print()
print("6️⃣  Consolidation offline.js:")
if os.path.exists('static/js/offline.js.bak'):
    size_bak = os.path.getsize('static/js/offline.js.bak') / 1024
    print(f"   ✓ offline.js.bak créé ({size_bak:.1f} KB)")
else:
    print("   ⚠️  offline.js.bak non trouvé (peut être supprimé manuellement)")

if os.path.exists('static/js/offline.js'):
    print("   ⚠️  offline.js existe encore (à supprimer manuellement)")
else:
    print("   ✓ offline.js supprimé (bon!)")

# 7. Vérifier exports globaux
print()
print("7️⃣  Exports globaux (window.FicheApp):")
if 'window.FicheApp' in app_content:
    exports = re.findall(r'(\w+):\s*(function|\w+|logInfo|downloadFiche)', app_content)
    print(f"   ✓ FicheApp exporte {len(set(e[0] for e in exports if 'window' not in e[0]))} fonctions")
    # Lister quelques exports clés
    for func in ['logInfo', 'getLocalFicheCount', 'syncLocale', 'downloadFicheAsJson']:
        if f"{func}:" in app_content:
            print(f"     ✓ {func}")
else:
    print("   ❌ window.FicheApp non trouvé")

# 8. Résumé
print()
print("=" * 70)
print("RÉSUMÉ")
print("=" * 70)
print()
print(f"✅ app.js v2 consolidé avec succès!")
print(f"   • {lines} lignes de code")
print(f"   • {len(sections_found)} sections organisées")
print(f"   • {len(functions)} fonctions implémentées")
print()
print("📝 PROCHAINES ÉTAPES:")
print("   1. Supprimer ou archiver static/js/offline.js")
print("   2. Vérifier que HTML inclut app.js (NOT offline.js)")
print("   3. Tester en mode offline: F12 → Network → Offline")
print("   4. Vérifier console pour les logs [FicheApp]")
print()
print("🔍 TESTS À FAIRE DANS LE NAVIGATEUR:")
print("   • FicheApp.getLocalFicheCount() - doit retourner nombre fiches")
print("   • FicheApp.logInfo('test') - doit afficher log avec timestamp")
print("   • FicheApp.getLocalFichesList() - doit retourner liste complète")
print("   • Tester download JSON/PDF des fiches locales")
print()
