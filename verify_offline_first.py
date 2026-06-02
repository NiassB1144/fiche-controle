#!/usr/bin/env python
"""
🔍 VERIFICATION SCRIPT - Offline-First v2 Architecture
Vérifie que tout est correctement configuré avant le test
"""

import os
import sys
import json
from pathlib import Path

# Colors for output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def check_file_exists(path, description):
    """Vérifier qu'un fichier existe"""
    if os.path.exists(path):
        print(f"{Colors.GREEN}✓{Colors.END} {description}")
        return True
    else:
        print(f"{Colors.RED}✗{Colors.END} {description} - NOT FOUND: {path}")
        return False

def check_file_contains(path, pattern, description):
    """Vérifier qu'un fichier contient un pattern"""
    if not os.path.exists(path):
        print(f"{Colors.RED}✗{Colors.END} {description} - FILE NOT FOUND: {path}")
        return False
    
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            if pattern in content:
                print(f"{Colors.GREEN}✓{Colors.END} {description}")
                return True
            else:
                print(f"{Colors.RED}✗{Colors.END} {description} - PATTERN NOT FOUND")
                return False
    except Exception as e:
        print(f"{Colors.RED}✗{Colors.END} {description} - ERROR: {e}")
        return False

def main():
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}🔍 OFFLINE-FIRST v2 VERIFICATION{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}\n")
    
    results = {
        'files_created': 0,
        'files_checked': 0,
        'all_passed': True
    }
    
    # ============================================================
    # PHASE 1: Vérifier les fichiers créés
    # ============================================================
    print(f"\n{Colors.BLUE}Phase 1: Vérifier les FICHIERS CRÉÉS{Colors.END}")
    print("-" * 60)
    
    files_to_check = [
        ('public/offline-fiche.html', 'Page HTML offline'),
        ('public/test-offline-first.js', 'Tests automatisés'),
        ('README_OFFLINE_FIRST_V2.md', 'Documentation: README'),
        ('OFFLINE_FIRST_QUICK_START.md', 'Documentation: Quick Start'),
        ('OFFLINE_FIRST_ARCHITECTURE.md', 'Documentation: Architecture'),
        ('OFFLINE_FIRST_FLOW_DIAGRAM.md', 'Documentation: Flow Diagrams'),
        ('OFFLINE_FIRST_SUMMARY.md', 'Documentation: Summary'),
        ('CHANGELOG_OFFLINE_FIRST_V2.md', 'Documentation: Changelog'),
        ('CLEANUP_OLD_ROUTES.md', 'Documentation: Cleanup'),
        ('DEPLOYMENT_GUIDE.md', 'Documentation: Deployment'),
        ('INDEX_OFFLINE_FIRST_V2.md', 'Documentation: Index'),
        ('RESUME_SIMPLE_FR.md', 'Documentation: Resume (FR)'),
    ]
    
    for file_path, description in files_to_check:
        if check_file_exists(file_path, description):
            results['files_created'] += 1
        else:
            results['all_passed'] = False
        results['files_checked'] += 1
    
    # ============================================================
    # PHASE 2: Vérifier les modifications Django
    # ============================================================
    print(f"\n{Colors.BLUE}Phase 2: Vérifier les MODIFICATIONS DJANGO{Colors.END}")
    print("-" * 60)
    
    django_checks = [
        ('inspection/urls.py', "path('fiche/offline/'", "Route /fiche/offline/ définie"),
        ('inspection/views.py', 'def serve_offline_fiche', 'Vue serve_offline_fiche définie'),
        ('templates/inspection/liste_fiches.html', '/inspection/fiche/offline/?id=', 'Liens mis à jour'),
        ('public/sw.js', "path.includes('/inspection/fiche/offline/')", 'Service Worker route offline'),
    ]
    
    for file_path, pattern, description in django_checks:
        if check_file_contains(file_path, pattern, description):
            results['files_checked'] += 1
        else:
            results['all_passed'] = False
            results['files_checked'] += 1
    
    # ============================================================
    # PHASE 3: Vérifier offline-fiche.html
    # ============================================================
    print(f"\n{Colors.BLUE}Phase 3: Vérifier OFFLINE-FICHE.HTML{Colors.END}")
    print("-" * 60)
    
    offline_html_checks = [
        ('public/offline-fiche.html', '<div id="loading-view"', 'Section loading vue'),
        ('public/offline-fiche.html', '<div id="view-mode"', 'Section view mode'),
        ('public/offline-fiche.html', '<div id="edit-mode"', 'Section edit mode'),
        ('public/offline-fiche.html', '<script src="/static/js/offline-crud.js"', 'Import offline-crud.js'),
        ('public/offline-fiche.html', 'OfflineCRUD.getFiche', 'Appel OfflineCRUD.getFiche'),
        ('public/offline-fiche.html', 'OfflineCRUD.updateFiche', 'Appel OfflineCRUD.updateFiche'),
        ('public/offline-fiche.html', 'OfflineCRUD.deleteFiche', 'Appel OfflineCRUD.deleteFiche'),
    ]
    
    for file_path, pattern, description in offline_html_checks:
        if check_file_contains(file_path, pattern, description):
            results['files_checked'] += 1
        else:
            results['all_passed'] = False
            results['files_checked'] += 1
    
    # ============================================================
    # PHASE 4: Vérifier offline-crud.js est disponible
    # ============================================================
    print(f"\n{Colors.BLUE}Phase 4: Vérifier OFFLINE-CRUD.JS{Colors.END}")
    print("-" * 60)
    
    offline_crud_checks = [
        ('static/js/offline-crud.js', 'async getFiche', 'Méthode getFiche'),
        ('static/js/offline-crud.js', 'async createFiche', 'Méthode createFiche'),
        ('static/js/offline-crud.js', 'async updateFiche', 'Méthode updateFiche'),
        ('static/js/offline-crud.js', 'async deleteFiche', 'Méthode deleteFiche'),
    ]
    
    for file_path, pattern, description in offline_crud_checks:
        if check_file_contains(file_path, pattern, description):
            results['files_checked'] += 1
        else:
            results['all_passed'] = False
            results['files_checked'] += 1
    
    # ============================================================
    # PHASE 5: Vérifier Service Worker
    # ============================================================
    print(f"\n{Colors.BLUE}Phase 5: Vérifier SERVICE WORKER{Colors.END}")
    print("-" * 60)
    
    sw_checks = [
        ('public/sw.js', 'STATIC_ASSETS', 'Pré-cache assets défini'),
        ('public/sw.js', '/offline-fiche.html', 'offline-fiche.html en cache'),
        ('public/sw.js', '/static/js/offline-crud.js', 'offline-crud.js en cache'),
        ('public/sw.js', 'self.addEventListener(\'install\'', 'Event listener install'),
        ('public/sw.js', 'self.addEventListener(\'fetch\'', 'Event listener fetch'),
    ]
    
    for file_path, pattern, description in sw_checks:
        if check_file_contains(file_path, pattern, description):
            results['files_checked'] += 1
        else:
            results['all_passed'] = False
            results['files_checked'] += 1
    
    # ============================================================
    # SUMMARY
    # ============================================================
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}RÉSUMÉ{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}")
    
    if results['all_passed']:
        print(f"\n{Colors.GREEN}✓ TOUS LES TESTS SONT PASSÉS!{Colors.END}\n")
        print(f"✓ Fichiers créés: {results['files_created']}")
        print(f"✓ Fichiers vérifiés: {results['files_checked']}")
        print(f"\n{Colors.GREEN}Architecture Offline-First v2 est PRÊTE!{Colors.END}\n")
        return 0
    else:
        print(f"\n{Colors.RED}✗ CERTAINS TESTS ONT ÉCHOUÉ!{Colors.END}\n")
        print(f"✓ Fichiers créés: {results['files_created']}")
        print(f"✓ Fichiers vérifiés: {results['files_checked']}")
        print(f"\n{Colors.RED}Veuillez corriger les problèmes ci-dessus.{Colors.END}\n")
        return 1

if __name__ == '__main__':
    sys.exit(main())
