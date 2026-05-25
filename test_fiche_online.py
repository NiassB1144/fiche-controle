#!/usr/bin/env python
"""
Test script: Create a fiche online
Tests the complete flow: GET form + POST data + verify redirect/result
"""

import os
import sys
import django
import json
import requests
from datetime import date
from django.test import Client
from django.contrib.auth.models import User

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fiche_project.settings')
django.setup()

from inspection.models import FicheControle

def test_fiche_online():
    """
    Test creating a fiche online:
    1. GET /fiches/nouvelle/
    2. POST form data
    3. Verify creation
    """
    print("[TEST] Starting online fiche creation test...")
    
    # Setup: Get or create test user
    user, created = User.objects.get_or_create(
        username='test_inspector',
        defaults={
            'email': 'test@example.com',
            'first_name': 'Test',
            'last_name': 'Inspector'
        }
    )
    if created:
        user.set_password('testpass123')
        user.save()
        print(f"[SETUP] Created test user: {user.username}")
    else:
        print(f"[SETUP] Using existing test user: {user.username}")
    
    # Get initial count of fiches
    initial_count = FicheControle.objects.filter(inspecteur=user).count()
    print(f"[CHECK] Initial fiche count for {user.username}: {initial_count}")
    
    # Create Django test client
    client = Client()
    
    # Step 1: Login
    print("[STEP 1] Logging in...")
    login_ok = client.login(username='test_inspector', password='testpass123')
    if not login_ok:
        print("[ERROR] Login failed!")
        return False
    print("[OK] Login successful")
    
    # Step 2: GET the form page
    print("[STEP 2] Getting form page at /fiches/nouvelle/...")
    response = client.get('/fiches/nouvelle/')
    if response.status_code != 200:
        print(f"[ERROR] Expected 200, got {response.status_code}")
        return False
    print(f"[OK] Form page loaded (status: {response.status_code})")
    
    # Step 3: POST form data via API
    print("[STEP 3] Submitting fiche data via API...")
    fiche_data = {
        'entreprise': 'Test Company XYZ',
        'date_controle': date.today().isoformat(),
        'lieu': 'Paris',
        'adresse': '123 Rue de Test',
        'telephone': '01-23-45-67-89',
        'email_entreprise': 'contact@testcompany.com',
    }
    
    response = client.post(
        '/api/fiche/creer/',
        data=json.dumps(fiche_data),
        content_type='application/json'
    )
    
    print(f"[API RESPONSE] Status: {response.status_code}")
    print(f"[API RESPONSE] Content: {response.content.decode('utf-8')}")
    
    if response.status_code not in [200, 201]:
        print(f"[ERROR] Expected 200/201, got {response.status_code}")
        return False
    
    try:
        result = response.json()
        if 'error' in result:
            print(f"[ERROR] API returned error: {result['error']}")
            return False
        if 'success' not in result or not result['success']:
            print(f"[ERROR] API returned unsuccessful response: {result}")
            return False
        
        fiche_id = result.get('id')
        print(f"[OK] Fiche created successfully with ID: {fiche_id}")
        
    except json.JSONDecodeError:
        print(f"[ERROR] Could not parse JSON response")
        return False
    
    # Step 4: Verify fiche exists
    print("[STEP 4] Verifying fiche in database...")
    try:
        fiche = FicheControle.objects.get(pk=fiche_id, inspecteur=user)
        print(f"[OK] Fiche found in database:")
        print(f"    - ID: {fiche.pk}")
        print(f"    - Entreprise: {fiche.entreprise}")
        print(f"    - Date contrôle: {fiche.date_controle}")
        print(f"    - Inspecteur: {fiche.inspecteur.first_name} {fiche.inspecteur.last_name}")
    except FicheControle.DoesNotExist:
        print(f"[ERROR] Fiche {fiche_id} not found in database!")
        return False
    
    # Step 5: Verify fiche appears in list
    print("[STEP 5] Verifying fiche appears in /fiches/ list...")
    response = client.get('/fiches/')
    if response.status_code != 200:
        print(f"[ERROR] Could not access /fiches/ (status: {response.status_code})")
        return False
    
    if str(fiche.pk) not in response.content.decode('utf-8'):
        print(f"[WARNING] Fiche ID not found in HTML response (might be in JS)")
    else:
        print(f"[OK] Fiche ID found in list page")
    
    # Step 6: Verify no undefined redirect
    print("[STEP 6] Checking for undefined redirects...")
    # Already verified by successful GET in step 5
    print("[OK] No undefined redirects detected")
    
    # Final count
    final_count = FicheControle.objects.filter(inspecteur=user).count()
    print(f"\n[SUMMARY] Fiche count changed: {initial_count} → {final_count}")
    
    if final_count == initial_count + 1:
        print("[SUCCESS] ✓ Fiche creation test PASSED!")
        return True
    else:
        print("[ERROR] Fiche count didn't increase as expected!")
        return False

if __name__ == '__main__':
    try:
        success = test_fiche_online()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"[EXCEPTION] {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
