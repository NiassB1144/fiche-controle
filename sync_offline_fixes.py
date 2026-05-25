#!/usr/bin/env python3
"""
Script de synchronisation des corrections offline
Copie les fichiers corrigés de static/ vers staticfiles/
"""
import os
import shutil
import sys
from pathlib import Path

def sync_offline_files():
    """Synchroniser les fichiers offline de static/ vers staticfiles/"""
    
    base_dir = Path(__file__).parent
    
    files_to_sync = [
        ('static/js/app-offline-unified.js', 'staticfiles/js/app-offline-unified.js'),
        ('static/offline.html', 'staticfiles/offline.html'),
    ]
    
    success_count = 0
    
    for src_rel, dst_rel in files_to_sync:
        src = base_dir / src_rel
        dst = base_dir / dst_rel
        
        if not src.exists():
            print(f"❌ Source manquante: {src}")
            continue
        
        dst.parent.mkdir(parents=True, exist_ok=True)
        
        try:
            shutil.copy2(src, dst)
            print(f"✓ Synchronisé: {src_rel}")
            success_count += 1
        except Exception as e:
            print(f"❌ Erreur: {src_rel} → {e}")
    
    print(f"\n✓ {success_count}/{len(files_to_sync)} fichiers synchronisés")
    return success_count == len(files_to_sync)

if __name__ == '__main__':
    if sync_offline_files():
        print("\n🎉 Synchronisation réussie!")
        sys.exit(0)
    else:
        print("\n⚠️  Erreurs durant la synchronisation")
        sys.exit(1)
