# 🚀 EXÉCUTE LES SCRIPTS - COMMANDES EXACTES

## 💻 SUR TON ORDINATEUR WINDOWS

### ÉTAPE 1: Ouvre PowerShell

1. **Win + R** → Tape `powershell` → Enter
2. **OU:** Clic droit sur le dossier du projet → "Open PowerShell here"

### ÉTAPE 2: Va dans le dossier

```powershell
cd "C:\Users\DELL\Desktop\Inspection du travail\Projet\fiche-controle"
```

### ÉTAPE 3: Vérifie que tout est bon

```powershell
python verify_offline_first.py
```

**Tu dois voir:**
```
✅ TOUS LES TESTS SONT PASSÉS!
```

**Si ça dit "python not found":**
```powershell
# Utilise python3
python3 verify_offline_first.py
```

### ÉTAPE 4: Démarre l'app

```powershell
quick_start.bat
```

**Le script va:**
- Vérifier Python ✅
- Activer venv ✅
- Installer requirements ✅
- Démarrer Django ✅
- Afficher l'URL ✅

**Tu dois voir:**
```
Starting development server at http://127.0.0.1:8000/
```

### ÉTAPE 5: Ouvre dans le navigateur

```
http://localhost:8000/inspection/liste_fiches/
```

---

## 🐧 SUR LINUX/MAC

### Ouvre Terminal

### Va dans le dossier

```bash
cd ~/Desktop/Inspection\ du\ travail/Projet/fiche-controle
```

### Vérifie

```bash
python verify_offline_first.py
```

### Démarre

```bash
bash quick_start.sh
```

### Ouvre navigateur

```
http://localhost:8000/inspection/liste_fiches/
```

---

## 🧪 TESTER OFFLINE

### Dans le Navigateur

1. **Appuie:** `F12`
2. **Clique:** "Network" tab
3. **Coche:** Checkbox "Offline"
4. **Retour à l'app** (refresh si nécessaire)
5. **Crée une fiche**
6. **Test tout:**
   - Voir détail ✅
   - Modifier ✅
   - Supprimer ✅

### Pas d'erreur Django? ✅ SUCCÈS!

---

## ⚡ COMMANDE UNIQUE (Recommandé)

### Windows - Copie/colle tout:

```powershell
cd "C:\Users\DELL\Desktop\Inspection du travail\Projet\fiche-controle" ; python verify_offline_first.py ; quick_start.bat
```

### Linux/Mac - Copie/colle tout:

```bash
cd ~/Desktop/Inspection\ du\ travail/Projet/fiche-controle && python verify_offline_first.py && bash quick_start.sh
```

---

## 🎯 C'EST PRÊT!

Maintenant:
1. ✅ verify_offline_first.py exécuté
2. ✅ App démarrée
3. ✅ Teste offline
4. ✅ Lis START_HERE.md

---

## ❓ Si Erreur

**Python not found:**
```
pip install python
```

**Module not found:**
```
pip install -r requirements.txt
```

**Port occupé:**
```
python manage.py runserver 8001
```

**Aide complète:**
```
Lis: HOW_TO_RUN.md (ce fichier)
Lis: START_HERE.md
```

---

**Vas-y! Exécute maintenant!** 🚀
