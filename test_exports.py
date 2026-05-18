#!/usr/bin/env python
"""
Script de test pour valider les endpoints d'export JSON et PDF
"""
import os
import sys
import django
from pathlib import Path

# Configure Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fiche_project.settings')
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
django.setup()

from django.test import Client
from django.contrib.auth.models import User
from inspection.models import FicheControle
from datetime import date, datetime

def test_exports():
    """Test les endpoints d'export"""
    print("=" * 70)
    print("TEST DES ENDPOINTS D'EXPORT")
    print("=" * 70)
    
    # Créer un utilisateur test
    user, created = User.objects.get_or_create(
        username='test_user',
        defaults={
            'email': 'test@example.com',
            'first_name': 'Test',
            'last_name': 'User'
        }
    )
    user.set_password('password123')
    user.save()
    print(f"\n✓ Utilisateur créé/récupéré: {user.username}")
    
    # Créer une fiche de test
    fiche, created = FicheControle.objects.get_or_create(
        entreprise='Test Entreprise SARL',
        date_controle=date.today(),
        defaults={
            'inspecteur': user,
            'lieu': 'Dakar',
            'statut': 'brouillon',
            'adresse': '123 Rue de Test, Dakar',
            'telephone': '+221 33 123 4567',
            'email_entreprise': 'contact@test.com',
            'chef_nom': 'Jean Dupont',
            'chef_cellulaire': '+221 77 123 4567',
            'cadres_hommes': 5,
            'cadres_femmes': 2,
            'ouvriers_hommes': 10,
            'ouvriers_femmes': 8,
            'cdi': 12,
            'cdd': 3,
            'observations_generales': 'Observations test pour la fiche',
        }
    )
    print(f"✓ Fiche créée/récupérée: {fiche.pk} - {fiche.entreprise}")
    
    # Tester les endpoints
    client = Client()
    
    # 1. Test JSON export
    print("\n" + "=" * 70)
    print("TEST 1: Export JSON")
    print("=" * 70)
    
    client.login(username='test_user', password='password123')
    response = client.get(f'/inspection/api/fiche/{fiche.pk}/export/json/')
    
    if response.status_code == 200:
        print(f"✓ Status: {response.status_code}")
        content_type = response.get('Content-Type')
        print(f"✓ Content-Type: {content_type}")
        
        disposition = response.get('Content-Disposition')
        print(f"✓ Disposition: {disposition}")
        
        content = response.content.decode('utf-8')
        import json
        data = json.loads(content)
        print(f"✓ JSON valide: {len(data)} champs")
        print(f"  - Entreprise: {data.get('entreprise')}")
        print(f"  - Date contrôle: {data.get('date_controle')}")
        print(f"  - Inspecteur: {data.get('inspecteur_nom')}")
        print(f"  - Effectif total: {data.get('cadres_hommes', 0) + data.get('cadres_femmes', 0) + data.get('ouvriers_hommes', 0) + data.get('ouvriers_femmes', 0)}")
    else:
        print(f"✗ Erreur: Status {response.status_code}")
        print(f"  Contenu: {response.content}")
    
    # 2. Test PDF export
    print("\n" + "=" * 70)
    print("TEST 2: Export PDF")
    print("=" * 70)
    
    response = client.get(f'/inspection/api/fiche/{fiche.pk}/export/pdf/')
    
    if response.status_code == 200:
        print(f"✓ Status: {response.status_code}")
        content_type = response.get('Content-Type')
        print(f"✓ Content-Type: {content_type}")
        
        disposition = response.get('Content-Disposition')
        print(f"✓ Disposition: {disposition}")
        
        content_length = len(response.content)
        print(f"✓ Taille du PDF: {content_length} bytes")
        
        # Vérifier que c'est un PDF valide (commence par %PDF)
        if response.content[:4] == b'%PDF':
            print(f"✓ Format PDF valide détecté")
        else:
            print(f"⚠ Attention: Peut-être pas un PDF valide")
            print(f"  Début du contenu: {response.content[:50]}")
    else:
        print(f"✗ Erreur: Status {response.status_code}")
        print(f"  Contenu: {response.content.decode('utf-8', errors='ignore')[:500]}")
    
    # 3. Test permissions (utilisateur non autorisé)
    print("\n" + "=" * 70)
    print("TEST 3: Permissions (utilisateur non autorisé)")
    print("=" * 70)
    
    # Créer un second utilisateur
    user2, _ = User.objects.get_or_create(
        username='other_user',
        defaults={'email': 'other@example.com', 'first_name': 'Other', 'last_name': 'User'}
    )
    user2.set_password('password123')
    user2.save()
    
    client.logout()
    client.login(username='other_user', password='password123')
    
    response = client.get(f'/inspection/api/fiche/{fiche.pk}/export/json/')
    if response.status_code == 404:
        print(f"✓ Accès refusé (404) pour utilisateur non autorisé")
    else:
        print(f"✗ Erreur: Utilisateur non autorisé a reçu le statut {response.status_code}")
    
    # 4. Test without login
    print("\n" + "=" * 70)
    print("TEST 4: Sans authentification")
    print("=" * 70)
    
    client.logout()
    response = client.get(f'/inspection/api/fiche/{fiche.pk}/export/json/')
    if response.status_code in [302, 301]:  # Redirect to login
        print(f"✓ Redirection vers login (Status {response.status_code})")
    else:
        print(f"⚠ Status reçu: {response.status_code}")
    
    print("\n" + "=" * 70)
    print("TESTS TERMINES")
    print("=" * 70)

if __name__ == '__main__':
    test_exports()
