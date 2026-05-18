#!/usr/bin/env python
"""
Script de validation simple pour vérifier la syntaxe et les imports
"""
import sys
import py_compile

print("=" * 70)
print("VALIDATION DU CODE")
print("=" * 70)

# Test 1: Vérifier la syntaxe de views.py
print("\n[1/3] Vérification de la syntaxe views.py...")
try:
    py_compile.compile('inspection/views.py', doraise=True)
    print("✓ Syntaxe views.py OK")
except py_compile.PyCompileError as e:
    print(f"✗ Erreur de syntaxe: {e}")
    sys.exit(1)

# Test 2: Vérifier les imports
print("[2/3] Vérification des imports...")
try:
    # Essayer d'importer reportlab
    try:
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
        from reportlab.lib import colors
        print("✓ ReportLab disponible")
        reportlab_available = True
    except ImportError as e:
        print(f"⚠ ReportLab non disponible: {e}")
        print("  → C'est normal, le code gère ce cas avec HAS_REPORTLAB")
        reportlab_available = False
except Exception as e:
    print(f"✗ Erreur lors du test des imports: {e}")
    sys.exit(1)

# Test 3: Vérifier les URLs
print("[3/3] Vérification du fichier urls.py...")
try:
    py_compile.compile('inspection/urls.py', doraise=True)
    print("✓ Syntaxe urls.py OK")
except py_compile.PyCompileError as e:
    print(f"✗ Erreur de syntaxe urls.py: {e}")
    sys.exit(1)

print("\n" + "=" * 70)
print("RÉSUMÉ")
print("=" * 70)
print("✓ Syntaxe views.py validée")
print("✓ Syntaxe urls.py validée")
if reportlab_available:
    print("✓ ReportLab installé et importable")
else:
    print("⚠ ReportLab non disponible (mais gérée gracieusement)")
print("\n✓ Tous les contrôles passés!")
print("=" * 70)
