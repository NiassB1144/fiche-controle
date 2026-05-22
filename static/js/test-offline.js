// ========================================================================
// TEST SUITE — Vérifier le fonctionnement offline
// ========================================================================

console.log('🧪 Démarrage des tests...');

async function testOfflineFeatures() {
  console.log('\n=== TEST 1: IndexedDB Ouverture ===');
  try {
    if (typeof window.FicheApp === 'undefined') {
      throw new Error('FicheApp non chargé');
    }
    console.log('✓ FicheApp chargé');
    console.log('  - sauvegarderLocalement:', typeof window.FicheApp.sauvegarderLocalement);
    console.log('  - getFicheByLocalId:', typeof window.FicheApp.getFicheByLocalId);
    console.log('  - getAllFiches:', typeof window.FicheApp.getAllFiches);
    console.log('  - updateFiche:', typeof window.FicheApp.updateFiche);
    console.log('  - deleteFiche:', typeof window.FicheApp.deleteFiche);
  } catch (e) {
    console.error('✗ Erreur:', e.message);
    return;
  }

  console.log('\n=== TEST 2: Sauvegarder une fiche test ===');
  const testData = {
    entreprise: 'TEST-Company',
    date_controle: '2024-05-22',
    lieu: 'Louga',
    statut: 'brouillon'
  };
  
  try {
    const localId = await window.FicheApp.sauvegarderLocalement(testData);
    console.log('✓ Fiche sauvegardée avec local_id:', localId);
    window.testLocalId = localId; // Sauvegarder pour tests suivants
  } catch (e) {
    console.error('✗ Erreur:', e.message);
    return;
  }

  console.log('\n=== TEST 3: Récupérer la fiche ===');
  try {
    const fiche = await window.FicheApp.getFicheByLocalId(window.testLocalId);
    if (fiche) {
      console.log('✓ Fiche trouvée:', fiche);
      console.log('  - entreprise:', fiche.entreprise);
      console.log('  - synced:', fiche.synced);
      console.log('  - saved_at:', fiche.saved_at);
    } else {
      console.error('✗ Fiche non trouvée');
    }
  } catch (e) {
    console.error('✗ Erreur:', e.message);
  }

  console.log('\n=== TEST 4: Modifier la fiche ===');
  try {
    const updated = await window.FicheApp.updateFiche(window.testLocalId, {
      entreprise: 'TEST-Company-UPDATED',
      date_controle: '2024-05-23'
    });
    console.log('✓ Fiche modifiée:', updated);
  } catch (e) {
    console.error('✗ Erreur:', e.message);
  }

  console.log('\n=== TEST 5: Lister toutes les fiches ===');
  try {
    const fiches = await window.FicheApp.getAllFiches();
    console.log('✓ Fiches trouvées:', fiches.length);
    fiches.forEach((f, i) => {
      console.log(`  [${i}] ${f.entreprise} (${f.statut}) - synced: ${f.synced}`);
    });
  } catch (e) {
    console.error('✗ Erreur:', e.message);
  }

  console.log('\n=== TEST 6: Supprimer la fiche ===');
  try {
    await window.FicheApp.deleteFiche(window.testLocalId);
    console.log('✓ Fiche supprimée');
    
    const ficheAprès = await window.FicheApp.getFicheByLocalId(window.testLocalId);
    if (!ficheAprès) {
      console.log('✓ Confirmation: Fiche bien supprimée');
    } else {
      console.error('✗ Fiche toujours présente après suppression');
    }
  } catch (e) {
    console.error('✗ Erreur:', e.message);
  }

  console.log('\n=== TEST 7: Vérifier le statut réseau ===');
  console.log('📱 Online:', navigator.onLine);
  console.log('🌐 Peut faire requêtes:', typeof fetch === 'function');

  console.log('\n✅ Tests terminés!');
}

// Lancer tests quand app est prête
window.addEventListener('load', () => {
  setTimeout(testOfflineFeatures, 2000);
});

// Exporter pour console
window.runOfflineTests = testOfflineFeatures;
