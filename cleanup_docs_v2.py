#!/usr/bin/env python3
"""
Supprime les fichiers de documentation (.md, .txt) sauf les essentiels
Préserve les fichiers template (.html) et config
"""

import os
import sys

# Racine du projet
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))

# Fichiers à GARDER
KEEP_FILES = {
    'README.md',  # Doc principale du projet
    'OFFLINE_V4_GUIDE.txt',  # Notre guide (à garder pour référence)
    '.gitignore',  # Config git
    'requirements.txt',  # Dépendances
    'manage.py',  # Django entrypoint
}

# Extensions à supprimer (à la racine du projet)
EXTENSIONS_TO_REMOVE = {'.md', '.txt'}

def cleanup():
    """Supprime les .md et .txt non essentiels"""
    
    removed = []
    skipped = []
    
    for filename in os.listdir(PROJECT_ROOT):
        filepath = os.path.join(PROJECT_ROOT, filename)
        
        # Ignorer les répertoires
        if os.path.isdir(filepath):
            continue
        
        # Vérifier extension
        _, ext = os.path.splitext(filename)
        if ext not in EXTENSIONS_TO_REMOVE:
            continue
        
        # Vérifier si à garder
        if filename in KEEP_FILES:
            skipped.append(filename)
            continue
        
        # Supprimer
        try:
            os.remove(filepath)
            removed.append(filename)
            print(f"✓ Supprimé: {filename}")
        except Exception as e:
            print(f"✗ Erreur {filename}: {e}")
    
    print(f"\n📊 Résumé:")
    print(f"   Supprimés: {len(removed)}")
    print(f"   Préservés: {len(skipped)}")
    
    if removed:
        print(f"\n📋 Fichiers supprimés:")
        for f in removed:
            print(f"   - {f}")
    
    if skipped:
        print(f"\n🔒 Fichiers préservés:")
        for f in skipped:
            print(f"   - {f}")

if __name__ == '__main__':
    print("🧹 Nettoyage des fichiers de documentation...")
    print(f"📁 Projet: {PROJECT_ROOT}\n")
    
    cleanup()
    print("\n✅ Fait!")
