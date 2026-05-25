#!/usr/bin/env python3
"""
Déploiement rapide des fixes offline v6
Copie les fichiers vers staticfiles et relance Django
"""
import shutil
import subprocess
from pathlib import Path

def main():
    base_dir = Path(__file__).parent
    
    print("🔧 DÉPLOIEMENT OFFLINE FIX v6\n")
    
    # 1. Copier vers staticfiles
    print("1️⃣ Copie des fichiers...")
    files = {
        'static/js/app-offline-unified.js': 'staticfiles/js/app-offline-unified.js',
        'static/offline.html': 'staticfiles/offline.html',
    }
    
    for src_rel, dst_rel in files.items():
        src = base_dir / src_rel
        dst = base_dir / dst_rel
        if src.exists():
            shutil.copy2(src, dst)
            print(f"   ✅ {src_rel}")
        else:
            print(f"   ❌ {src_rel} (NOT FOUND)")
    
    # 2. Exécuter collectstatic
    print("\n2️⃣ Exécution collectstatic...")
    try:
        result = subprocess.run(
            ['python', 'manage.py', 'collectstatic', '--clear', '--noinput'],
            cwd=str(base_dir),
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print("   ✅ Collectstatic réussi")
        else:
            print(f"   ❌ Erreur: {result.stderr}")
    except Exception as e:
        print(f"   ❌ Impossible de lancer collectstatic: {e}")
    
    print("\n✅ PROCHAINES ÉTAPES:")
    print("   1. Redémarrer Django:")
    print("      Ctrl+C (arrêter Django)")
    print("      python manage.py runserver")
    print()
    print("   2. Navigateur:")
    print("      Ctrl+Shift+Delete (vider cache)")
    print("      Ctrl+Shift+R (hard refresh)")
    print()
    print("   3. Tester:")
    print("      ✏️ Modifier une fiche offline")
    print("      👁️ Voir détails d'une fiche offline")
    print("      🗑️ Supprimer une fiche offline")
    print()

if __name__ == '__main__':
    main()
