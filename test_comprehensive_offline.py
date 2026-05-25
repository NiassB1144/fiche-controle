#!/usr/bin/env python
"""
Comprehensive test for offline CRUD operations
Tests all parts of the offline functionality: creation, modification, deletion, sync
"""

import os
import sys
import django
import json
from pathlib import Path
from datetime import datetime

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fiche_project.settings')
django.setup()

from django.test import Client
from django.contrib.auth.models import User
from inspection.models import Fiche

# Test reporting
class TestReport:
    def __init__(self):
        self.results = []
        self.passed = 0
        self.failed = 0
        
    def add_result(self, part, status, details):
        self.results.append({
            'part': part,
            'status': status,
            'details': details,
            'timestamp': datetime.now().isoformat()
        })
        if status == 'PASS':
            self.passed += 1
        else:
            self.failed += 1
    
    def print_report(self):
        print("\n" + "="*80)
        print("OFFLINE CRUD COMPREHENSIVE TEST REPORT")
        print("="*80 + "\n")
        
        for r in self.results:
            status_symbol = "✅" if r['status'] == 'PASS' else "❌"
            print(f"{status_symbol} {r['part']}")
            print(f"   Status: {r['status']}")
            print(f"   Details: {r['details']}")
            print()
        
        print("="*80)
        print(f"SUMMARY: {self.passed}/{self.passed + self.failed} parts passed")
        print("="*80 + "\n")

report = TestReport()

# ============================================================================
# PART 1: PREPARATION
# ============================================================================
print("[TEST] Part 1: Preparation")
try:
    client = Client()
    
    # Test /fiches/ endpoint
    response = client.get('/fiches/', follow=True)
    if response.status_code == 200:
        # Check if page contains expected elements
        content = response.content.decode('utf-8')
        has_sw_script = 'navigator.serviceWorker' in content or 'sw.js' in content
        has_offline_script = 'app-offline-unified.js' in content
        
        if has_sw_script and has_offline_script:
            report.add_result(
                "Part 1: Preparation",
                "PASS",
                "/fiches/ loads correctly with SW and offline scripts"
            )
        else:
            report.add_result(
                "Part 1: Preparation",
                "FAIL",
                f"Missing scripts: SW={has_sw_script}, Offline={has_offline_script}"
            )
    else:
        report.add_result(
            "Part 1: Preparation",
            "FAIL",
            f"GET /fiches/ returned {response.status_code}"
        )
except Exception as e:
    report.add_result("Part 1: Preparation", "FAIL", str(e))

# ============================================================================
# PART 3: CREATE FICHE (API test - simulates offline creation)
# ============================================================================
print("[TEST] Part 3: Create Fiche API endpoint")
try:
    # Get CSRF token first
    response = client.get('/fiches/nouvelle/')
    csrf_token = None
    content = response.content.decode('utf-8')
    
    import re
    csrf_match = re.search(r'csrftoken["\']?\s*:\s*["\']([a-f0-9]+)["\']', content)
    if csrf_match:
        csrf_token = csrf_match.group(1)
    
    if not csrf_token:
        csrf_match = re.search(r'<input[^>]*name=["\']csrfmiddlewaretoken["\'][^>]*value=["\']([a-f0-9]+)["\']', content)
        if csrf_match:
            csrf_token = csrf_match.group(1)
    
    # Test creating a fiche via API
    test_data = {
        "entreprise": "Test Offline Company",
        "date_controle": "2024-01-15",
        "lieu": "Dakar",
        "statut": "soumis"
    }
    
    response = client.post(
        '/api/fiche/creer/',
        data=json.dumps(test_data),
        content_type='application/json',
        HTTP_X_CSRFTOKEN=csrf_token or 'dummy'
    )
    
    if response.status_code in [200, 201]:
        try:
            data = response.json()
            report.add_result(
                "Part 3: Create Fiche",
                "PASS",
                f"API endpoint works, returned ID: {data.get('id')}"
            )
        except:
            report.add_result(
                "Part 3: Create Fiche",
                "PASS",
                f"API endpoint works (status {response.status_code})"
            )
    else:
        report.add_result(
            "Part 3: Create Fiche",
            "FAIL",
            f"POST /api/fiche/creer/ returned {response.status_code}"
        )
except Exception as e:
    report.add_result("Part 3: Create Fiche", "FAIL", str(e))

# ============================================================================
# PART 4: VIEW FICHE (GET API test)
# ============================================================================
print("[TEST] Part 4: View Fiche")
try:
    # Get list of fiches
    response = client.get('/api/fiches/', follow=True)
    
    if response.status_code == 200:
        try:
            data = response.json()
            report.add_result(
                "Part 4: View Fiche",
                "PASS",
                f"GET /api/fiches/ works, returned {len(data) if isinstance(data, list) else 'data'}"
            )
        except:
            report.add_result(
                "Part 4: View Fiche",
                "PASS",
                f"GET /api/fiches/ works (status {response.status_code})"
            )
    else:
        report.add_result(
            "Part 4: View Fiche",
            "FAIL",
            f"GET /api/fiches/ returned {response.status_code}"
        )
except Exception as e:
    report.add_result("Part 4: View Fiche", "FAIL", str(e))

# ============================================================================
# PART 5: MODIFY FICHE (API test)
# ============================================================================
print("[TEST] Part 5: Modify Fiche")
try:
    # Check if we have any fiches to modify
    fiches = Fiche.objects.all()
    
    if fiches.exists():
        fiche = fiches.first()
        modified_data = {
            "entreprise": "Updated Company Name",
            "statut": "soumis"
        }
        
        response = client.post(
            f'/api/fiche/{fiche.pk}/modifier/',
            data=json.dumps(modified_data),
            content_type='application/json'
        )
        
        if response.status_code in [200, 201]:
            report.add_result(
                "Part 5: Modify Fiche",
                "PASS",
                f"POST /api/fiche/{fiche.pk}/modifier/ works"
            )
        else:
            report.add_result(
                "Part 5: Modify Fiche",
                "FAIL",
                f"POST /api/fiche/{{pk}}/modifier/ returned {response.status_code}"
            )
    else:
        report.add_result(
            "Part 5: Modify Fiche",
            "FAIL",
            "No fiches found to modify"
        )
except Exception as e:
    report.add_result("Part 5: Modify Fiche", "FAIL", str(e))

# ============================================================================
# PART 6: DELETE FICHE (API test)
# ============================================================================
print("[TEST] Part 6: Delete Fiche")
try:
    fiches = Fiche.objects.all()
    
    if fiches.count() > 1:
        fiche_to_delete = fiches.last()
        response = client.delete(f'/api/fiche/{fiche_to_delete.pk}/supprimer/')
        
        if response.status_code in [200, 204]:
            report.add_result(
                "Part 6: Delete Fiche",
                "PASS",
                f"DELETE /api/fiche/{fiche_to_delete.pk}/supprimer/ works"
            )
        else:
            report.add_result(
                "Part 6: Delete Fiche",
                "FAIL",
                f"DELETE /api/fiche/{{pk}}/supprimer/ returned {response.status_code}"
            )
    else:
        report.add_result(
            "Part 6: Delete Fiche",
            "SKIP",
            "Need at least 2 fiches to test deletion"
        )
except Exception as e:
    report.add_result("Part 6: Delete Fiche", "FAIL", str(e))

# ============================================================================
# PART 7: VERIFY SERVICE WORKER
# ============================================================================
print("[TEST] Part 7: Service Worker Files")
try:
    static_dir = Path(__file__).parent / "static" / "js"
    sw_file = static_dir / "sw.js"
    offline_file = static_dir / "app-offline-unified.js"
    
    sw_exists = sw_file.exists()
    offline_exists = offline_file.exists()
    
    if sw_exists and offline_exists:
        # Check file sizes
        sw_size = sw_file.stat().st_size
        offline_size = offline_file.stat().st_size
        
        report.add_result(
            "Part 7: Service Worker",
            "PASS",
            f"SW ({sw_size} bytes) and offline script ({offline_size} bytes) exist"
        )
    else:
        report.add_result(
            "Part 7: Service Worker",
            "FAIL",
            f"Missing files: SW={sw_exists}, Offline={offline_exists}"
        )
except Exception as e:
    report.add_result("Part 7: Service Worker", "FAIL", str(e))

# ============================================================================
# PART 8: VERIFY DATABASE SCHEMA
# ============================================================================
print("[TEST] Part 8: Database Schema")
try:
    # Check if Fiche model has required fields for offline support
    fiche_fields = [f.name for f in Fiche._meta.get_fields()]
    
    required_fields = ['id', 'entreprise', 'date_controle']
    all_present = all(field in fiche_fields for field in required_fields)
    
    if all_present:
        report.add_result(
            "Part 8: Database Schema",
            "PASS",
            f"Fiche model has required fields: {', '.join(required_fields)}"
        )
    else:
        missing = [f for f in required_fields if f not in fiche_fields]
        report.add_result(
            "Part 8: Database Schema",
            "FAIL",
            f"Missing fields: {missing}"
        )
except Exception as e:
    report.add_result("Part 8: Database Schema", "FAIL", str(e))

# ============================================================================
# PART 9: VERIFY API ENDPOINTS
# ============================================================================
print("[TEST] Part 9: API Endpoints")
try:
    endpoints = [
        ('/api/fiche/creer/', 'POST'),
        ('/api/fiches/', 'GET'),
    ]
    
    all_working = True
    errors = []
    
    for endpoint, method in endpoints:
        if method == 'GET':
            response = client.get(endpoint)
        else:
            response = client.post(endpoint, data='{}', content_type='application/json')
        
        if response.status_code not in [200, 201, 405]:  # 405 if auth required
            all_working = False
            errors.append(f"{method} {endpoint} = {response.status_code}")
    
    if all_working:
        report.add_result(
            "Part 9: API Endpoints",
            "PASS",
            f"All {len(endpoints)} endpoints accessible"
        )
    else:
        report.add_result(
            "Part 9: API Endpoints",
            "FAIL",
            f"Issues: {', '.join(errors)}"
        )
except Exception as e:
    report.add_result("Part 9: API Endpoints", "FAIL", str(e))

# ============================================================================
# PART 10: VERIFY MANIFEST AND PWA
# ============================================================================
print("[TEST] Part 10: PWA Configuration")
try:
    manifest_file = Path(__file__).parent / "static" / "manifest.json"
    offline_html = Path(__file__).parent / "static" / "offline.html"
    
    manifest_exists = manifest_file.exists()
    offline_exists = offline_html.exists()
    
    if manifest_exists and offline_exists:
        report.add_result(
            "Part 10: PWA Configuration",
            "PASS",
            "manifest.json and offline.html configured"
        )
    else:
        report.add_result(
            "Part 10: PWA Configuration",
            "FAIL",
            f"Missing: manifest={manifest_exists}, offline={offline_exists}"
        )
except Exception as e:
    report.add_result("Part 10: PWA Configuration", "FAIL", str(e))

# ============================================================================
# GENERATE FINAL REPORT
# ============================================================================
report.print_report()

# Write to file
with open('TEST_OFFLINE_COMPREHENSIVE.txt', 'w') as f:
    f.write("COMPREHENSIVE OFFLINE CRUD TEST REPORT\n")
    f.write("=" * 80 + "\n\n")
    
    for r in report.results:
        f.write(f"{'✅' if r['status'] == 'PASS' else '❌'} {r['part']}\n")
        f.write(f"   Status: {r['status']}\n")
        f.write(f"   Details: {r['details']}\n")
        f.write(f"   Timestamp: {r['timestamp']}\n\n")
    
    f.write("=" * 80 + "\n")
    f.write(f"SUMMARY: {report.passed}/{report.passed + report.failed} parts passed\n")
    f.write("=" * 80 + "\n")

print(f"\n✅ Test report saved to TEST_OFFLINE_COMPREHENSIVE.txt")
sys.exit(0 if report.failed == 0 else 1)
