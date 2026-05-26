#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const filesToRemove = [
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
    'test_offline_fixes.html',
    'cleanup_docs.py',
    'DEPLOY_v6.bat',
    'deploy_v6.py',
    'sync_offline_fixes.py',
    'check_setup.bat',
    'create_screenshots.py',
    'quick_check.py',
    'test_comprehensive_offline.py',
    'test_delete_fiche_online.py',
    'test_exports.py',
    'test_fiche_online.py',
    'test_fixes.py',
    'validate_code.py',
    'verify-offline.sh',
    'verify_app_v2.py',
    'verify_delete_test.py',
    'build.sh',
];

const baseDir = process.cwd();
let removed = 0;

filesToRemove.forEach(file => {
    const filePath = path.join(baseDir, file);
    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
            console.log(`✓ Supprimé: ${file}`);
            removed++;
        } catch (error) {
            console.error(`✗ Erreur: ${file} - ${error.message}`);
        }
    }
});

console.log(`\n✅ Total supprimé: ${removed} fichiers`);
