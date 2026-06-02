/**
 * TEST OFFLINE-FIRST ARCHITECTURE
 * Vérifie que la page offline fonctionne correctement
 */

async function testOfflineFirstArchitecture() {
  console.group('🧪 Test Offline-First Architecture');

  try {
    // ============================================================
    // 1. Vérifier que offline-crud.js est chargé
    // ============================================================
    console.log('✓ Test 1: Vérifier OfflineCRUD.js est disponible');
    
    if (!window.OfflineCRUD) {
      throw new Error('❌ OfflineCRUD global object not found!');
    }
    console.log('✓ OfflineCRUD object exists');
    
    // ============================================================
    // 2. Créer une fiche de test
    // ============================================================
    console.log('✓ Test 2: Créer une fiche test');
    
    const testData = {
      entreprise: '🧪 Entreprise Test',
      forme_juridique: 'SARL',
      secteur_activite: 'Test',
      adresse: '123 rue test',
      codepostal: '12345',
      ville: 'Test City',
      date_controle: '2026-05-27',
      lieu_controle: 'Test Location',
      inspecteur_nom: 'Test Inspector'
    };

    const localId = await window.OfflineCRUD.createFiche(testData);
    console.log('✓ Fiche créée avec local_id:', localId);

    // ============================================================
    // 3. Vérifier que la fiche est dans IndexedDB
    // ============================================================
    console.log('✓ Test 3: Vérifier la fiche en IndexedDB');
    
    const fiche = await window.OfflineCRUD.getFiche(localId);
    if (!fiche) {
      throw new Error('❌ Fiche not found in IndexedDB!');
    }
    console.log('✓ Fiche trouvée en IndexedDB:', fiche);

    // ============================================================
    // 4: Test modifier la fiche
    // ============================================================
    console.log('✓ Test 4: Modifier la fiche');
    
    const updates = {
      entreprise: '🧪 Entreprise Test MODIFIÉ'
    };
    
    await window.OfflineCRUD.updateFiche(localId, updates);
    const ficheModifiée = await window.OfflineCRUD.getFiche(localId);
    
    if (ficheModifiée.entreprise !== '🧪 Entreprise Test MODIFIÉ') {
      throw new Error('❌ Update failed!');
    }
    console.log('✓ Fiche modifiée avec succès');

    // ============================================================
    // 5: Test URL pour accéder à la fiche
    // ============================================================
    console.log('✓ Test 5: URL pour accéder à la fiche offline');
    
    const offlineUrl = `/inspection/fiche/offline/?id=${localId}`;
    console.log('✓ URL officielle:', offlineUrl);
    console.log('   👉 Clique sur ce lien pour ouvrir la fiche:', offlineUrl);

    // ============================================================
    // 6: Test statut synchronisation
    // ============================================================
    console.log('✓ Test 6: Vérifier statut synchronisation');
    
    const status = await window.OfflineCRUD.getStatus(localId);
    console.log('✓ Statut fiche:', {
      synced: status.synced,
      server_pk: status.server_pk,
      exists: status.exists
    });

    // ============================================================
    // RÉSUMÉ
    // ============================================================
    console.log('');
    console.log('✅ TOUS LES TESTS SONT PASSÉS!');
    console.log('');
    console.log('Prochaines étapes:');
    console.log('1. Va à la page des fiches: /inspection/liste_fiches/');
    console.log('2. Tu dois voir une fiche 🧪 avec label "Hors-ligne"');
    console.log('3. Clique "Voir" ou "Modifier"');
    console.log('4. Cela ouvrira: ' + offlineUrl);
    console.log('5. La page doit charger depuis IndexedDB (pas Django!)');
    console.log('');

  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    console.log('');
    console.log('Debug info:');
    console.log('- window.OfflineCRUD:', window.OfflineCRUD);
    console.log('- navigator.serviceWorker:', navigator.serviceWorker);
  }

  console.groupEnd();
}

// Attendre que le DOM soit prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', testOfflineFirstArchitecture);
} else {
  testOfflineFirstArchitecture();
}
