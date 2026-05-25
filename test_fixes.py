#!/usr/bin/env python
"""
Test script pour vérifier les corrections du mode offline et des boutons de suppression.
"""

import os
import sys
import django
from pathlib import Path

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fiche_project.settings')
sys.path.insert(0, str(Path(__file__).parent))
django.setup()

from django.test import Client
from django.contrib.auth.models import User
from inspection.models import FicheControle
import json

def test_delete_api_endpoint():
    """Test l'endpoint DELETE API pour les fiches."""
    print("\n" + "="*60)
    print("TEST 1: Endpoint DELETE API")
    print("="*60)
    
    client = Client()
    
    # Créer un utilisateur de test
    user, created = User.objects.get_or_create(
        username='testuser',
        defaults={'email': 'test@example.com', 'password': 'testpass123'}
    )
    if created:
        user.set_password('testpass123')
        user.save()
    
    # Se connecter
    logged_in = client.login(username='testuser', password='testpass123')
    print(f"✓ Connexion: {'OK' if logged_in else 'FAILED'}")
    
    # Créer une fiche de test
    fiche = FicheControle.objects.create(
        entreprise='Test Entreprise',
        lieu='Test Lieu',
        date_controle='2026-05-25',
        inspecteur=user,
        statut='brouillon'
    )
    print(f"✓ Fiche créée: {fiche.pk}")
    
    # Tester le DELETE
    response = client.delete(
        f'/api/fiche/{fiche.pk}/supprimer/',
        HTTP_X_CSRFTOKEN=client.cookies.get('csrftoken').value if 'csrftoken' in client.cookies else ''
    )
    print(f"✓ Réponse DELETE: {response.status_code}")
    
    if response.status_code == 200:
        data = json.loads(response.content)
        print(f"✓ Message: {data.get('message', 'N/A')}")
        
        # Vérifier que la fiche est bien supprimée
        exists = FicheControle.objects.filter(pk=fiche.pk).exists()
        print(f"{'✗' if exists else '✓'} Fiche supprimée: {'NON' if exists else 'OUI'}")
    else:
        print(f"✗ Erreur: {response.status_code}")
        print(response.content)

def test_offline_page():
    """Test que la page offline.html charge correctement."""
    print("\n" + "="*60)
    print("TEST 2: Page offline.html")
    print("="*60)
    
    client = Client()
    response = client.get('/offline/')
    
    print(f"✓ Statut: {response.status_code}")
    
    if response.status_code == 200:
        content = response.content.decode('utf-8')
        checks = [
            ('Mode Hors-Ligne' in content, 'Titre "Mode Hors-Ligne"'),
            ('checkOnlineStatus' in content, 'Fonction checkOnlineStatus'),
            ('navigator.onLine' in content, 'Vérification navigator.onLine'),
            ('btn-primary' in content, 'Bouton primaire'),
        ]
        
        for check, desc in checks:
            print(f"{'✓' if check else '✗'} {desc}: {'OK' if check else 'MISSING'}")
    else:
        print(f"✗ Erreur: Page non trouvée")

def test_delete_button_js():
    """Vérifie que le JS des boutons delete est présent."""
    print("\n" + "="*60)
    print("TEST 3: JavaScript pour boutons DELETE")
    print("="*60)
    
    # Vérifier detail_fiche.html
    detail_path = Path(__file__).parent / 'templates' / 'inspection' / 'detail_fiche.html'
    if detail_path.exists():
        content = detail_path.read_text(encoding='utf-8')
        checks = [
            ('btn-delete-fiche' in content, 'Class btn-delete-fiche'),
            ('api/fiche' in content and 'supprimer' in content, 'API delete endpoint'),
            ('/api/fiche/${pk}/supprimer/' in content or '/api/fiche/` + pk + `/supprimer/' in content, 
             'Route DELETE API dans le JS'),
        ]
        
        for check, desc in checks:
            print(f"{'✓' if check else '✗'} detail_fiche.html - {desc}: {'OK' if check else 'MISSING'}")
    
    # Vérifier liste_fiches.html
    list_path = Path(__file__).parent / 'templates' / 'inspection' / 'liste_fiches.html'
    if list_path.exists():
        content = list_path.read_text(encoding='utf-8')
        checks = [
            ('window.deleteServerFiche' in content, 'Fonction deleteServerFiche'),
            ('window.deleteLocalFiche' in content, 'Fonction deleteLocalFiche'),
            ('onclick=' in content and 'deleteServerFiche' in content, 'onclick directe pour server delete'),
            ('showToast' in content and 'Erreur' in content, 'Gestion erreurs avec toast'),
        ]
        
        for check, desc in checks:
            print(f"{'✓' if check else '✗'} liste_fiches.html - {desc}: {'OK' if check else 'MISSING'}")
    
    # Vérifier app-offline-unified.js
    js_path = Path(__file__).parent / 'static' / 'js' / 'app-offline-unified.js'
    if js_path.exists():
        content = js_path.read_text(encoding='utf-8')
        checks = [
            ('async function deleteFicheServer' in content, 'Fonction deleteFicheServer'),
            ('async function deleteFicheLocal' in content, 'Fonction deleteFicheLocal'),
            ('afficherNotification' in content and 'delete' in content.lower(), 
             'Notifications pour delete'),
        ]
        
        for check, desc in checks:
            print(f"{'✓' if check else '✗'} app-offline-unified.js - {desc}: {'OK' if check else 'MISSING'}")

if __name__ == '__main__':
    print("\n🧪 TESTS DES CORRECTIONS - Offline Mode & Delete Buttons\n")
    
    try:
        test_delete_button_js()
        test_offline_page()
        test_delete_api_endpoint()
        
        print("\n" + "="*60)
        print("✓ TOUS LES TESTS TERMINÉS")
        print("="*60 + "\n")
    except Exception as e:
        print(f"\n✗ ERREUR: {e}\n")
        import traceback
        traceback.print_exc()
