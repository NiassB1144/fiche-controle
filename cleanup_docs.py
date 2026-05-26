#!/usr/bin/env python3
import os
import glob

# Fichiers à supprimer de la racine
doc_files = [
    'VERIFICATION_CHECKLIST_v6.md',
    'VERIFICATION_CHECKLIST.md',
    'OFFLINE_TEST_GUIDE_FR.md',
    'EXAMPLES.md',
    'OFFLINE_MOBILE_UPDATES.md',
    'DEPLOYMENT_GUIDE.md',
    'OFFLINE_FIXES_FINAL.md',
    'CHANGES_VISUAL.md',
    'OFFLINE_FINAL_SUMMARY.md',
    'APP_JS_V2_CONSOLIDATION.md',
    'OFFLINE_BUG_FIX_v6.md',
    'INTEGRATION_CHECKLIST.md',
    'INSTRUCTIONS_v6_FR.md',
    'INSTALL_GUIDE.md',
    'QUICK_START.md',
    'QUICK_DEPLOY_v6.md',
    'README_v6_OVERVIEW.md',
    'README_FINAL.md',
    'RELEASE_NOTES_v5.md',
    'SUMMARY_v6.md',
    'INDEX.md',
    'IMPLEMENTATION_SUMMARY.md',
    'FIXES_CHANGELOG.md',
    'EXPORT_ENDPOINTS.md',
    'START_HERE.md',
    'test_offline_complete.md',
    'TEST_DELETE_REPORT.md',
    'OFFLINE_MODE_FIXED.txt',
    'DEPLOYMENT_CHECKLIST.txt',
    'CORRECTIONS_SUMMARY.txt',
    'COMPLETION_REPORT.txt',
    'FINAL_REPORT_v5.txt',
    'test_offline_fixes.html'
]

deleted_count = 0
for file in doc_files:
    try:
        if os.path.exists(file):
            os.remove(file)
            print(f"✓ Supprimé: {file}")
            deleted_count += 1
    except Exception as e:
        print(f"✗ Erreur sur {file}: {e}")

print(f"\nTotal supprimé: {deleted_count} fichiers")
