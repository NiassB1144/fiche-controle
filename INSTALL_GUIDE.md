# Guide d'Installation des Endpoints d'Export

## ✅ Étapes d'installation

### 1. Installer reportlab

```bash
pip install reportlab
```

Ou ajouter à requirements.txt:
```
reportlab==4.0.9
```

Puis installer:
```bash
pip install -r requirements.txt
```

### 2. Vérifier l'installation

```bash
python -c "from reportlab.lib.pagesizes import A4; print('✓ ReportLab installé')"
```

### 3. Tester les endpoints

#### Depuis Django:
```bash
python manage.py shell
```

```python
from django.test import Client
from django.contrib.auth.models import User
from inspection.models import FicheControle

# Créer un utilisateur test
user = User.objects.create_user('test', 'test@test.com', 'pass123')

# Créer une fiche test
fiche = FicheControle.objects.create(
    inspecteur=user,
    entreprise='Test SARL',
    date_controle='2024-01-15'
)

# Tester avec un client
client = Client()
client.login(username='test', password='pass123')

# JSON export
response = client.get(f'/inspection/api/fiche/{fiche.pk}/export/json/')
print(f'JSON: {response.status_code}')

# PDF export
response = client.get(f'/inspection/api/fiche/{fiche.pk}/export/pdf/')
print(f'PDF: {response.status_code}')
```

#### Via script Python:
```bash
python test_exports.py
```

#### Via navigateur:
1. Ouvrir http://localhost:8000/
2. Se connecter
3. Accéder à: http://localhost:8000/inspection/api/fiche/1/export/json/
4. Ou à: http://localhost:8000/inspection/api/fiche/1/export/pdf/

---

## 📋 Configuration des URLs

Les URLs sont déjà configurées dans `inspection/urls.py`:

```python
path('api/fiche/<int:pk>/export/json/', views.export_fiche_json, name='export_fiche_json'),
path('api/fiche/<int:pk>/export/pdf/', views.export_fiche_pdf, name='export_fiche_pdf'),
```

Assurez-vous que `inspection/urls.py` est inclus dans `fiche_project/urls.py`:

```python
# fiche_project/urls.py
from django.urls import path, include

urlpatterns = [
    # ...
    path('inspection/', include('inspection.urls')),
]
```

---

## 🔧 Troubleshooting

### Erreur: "ModuleNotFoundError: No module named 'reportlab'"

**Solution:** Installer reportlab
```bash
pip install reportlab
```

### Erreur 500 au téléchargement PDF

**Vérifier:**
1. ReportLab est installé: `pip install reportlab`
2. La fiche existe: `FicheControle.objects.get(pk=1)`
3. Les logs Django pour plus de détails

### Erreur 404 au accès aux endpoints

**Vérifier:**
1. Les URLs sont configurées dans `inspection/urls.py`
2. Le projet inclurait `inspection/urls.py`
3. Vous êtes authentifié (essayer `/inspection/api/fiche/1/export/json/`)

### Fichier JSON corrompu

**Solution:** Vérifier l'encodage UTF-8
Les dates doivent être au format ISO: `2024-01-15T10:30:00+00:00`

---

## 🚀 Utilisation en Production

### Avec Gunicorn:

```bash
gunicorn fiche_project.wsgi:application --workers 4 --bind 0.0.0.0:8000
```

Les exports fonctionnent normalement avec Gunicorn.

### Avec Docker:

Ajouter à `requirements.txt`:
```
reportlab==4.0.9
```

Dockerfile exemple:
```dockerfile
FROM python:3.10
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["gunicorn", "fiche_project.wsgi:application"]
```

### Avec Apache/mod_wsgi:

Les exports PDF généreront les fichiers en mémoire, aucune configuration spéciale nécessaire.

---

## 📝 Notes d'implémentation

### Format des dates en JSON
Toutes les dates utilisent le format ISO 8601:
- Dates seules: `2024-01-15`
- DateTimes: `2024-01-15T10:30:00+00:00`

### Permissions
- Utilisateurs non-staff: Peuvent exporter uniquement leurs fiches
- Staff/Admins: Peuvent exporter n'importe quelle fiche
- Non-authentifiés: Redirection vers login

### Taille des fichiers
- **JSON:** Généralement 10-50 KB
- **PDF:** Généralement 50-200 KB

Pas de limite de taille imposée, mais à surveiller en production.

---

## 🧪 Test complet

```bash
# 1. Installer les dépendances
pip install -r requirements.txt

# 2. Lancer les tests
python test_exports.py

# 3. Valider la syntaxe
python validate_code.py

# 4. Tester manuellement
python manage.py runserver
# Puis accéder à http://localhost:8000/inspection/api/fiche/1/export/json/
```

---

## 📚 Documentation supplémentaire

- **EXPORT_ENDPOINTS.md** - Documentation complète des endpoints
- **IMPLEMENTATION_SUMMARY.md** - Résumé des modifications
- **test_exports.py** - Script de test
- **inspection/views.py** - Code source des endpoints
- **inspection/urls.py** - Configuration des routes
