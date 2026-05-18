# 📚 Exemples d'Utilisation des Endpoints d'Export

## 1. Exporter en JSON depuis le navigateur

### URL directe
```
http://localhost:8000/inspection/api/fiche/1/export/json/
```

### Via lien HTML
```html
<a href="/inspection/api/fiche/1/export/json/" class="btn btn-primary">
  📥 Télécharger JSON
</a>
```

### Via JavaScript
```javascript
function downloadJSON(ficheId) {
  fetch(`/inspection/api/fiche/${ficheId}/export/json/`)
    .then(response => {
      // Obtenir le filename du header
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition ? 
        contentDisposition.split('filename=')[1].replace(/"/g, '') : 
        `fiche_${ficheId}.json`;
      
      return response.blob().then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      });
    })
    .catch(error => alert('Erreur: ' + error));
}

// Utilisation
downloadJSON(1);
```

---

## 2. Exporter en PDF depuis le navigateur

### URL directe
```
http://localhost:8000/inspection/api/fiche/1/export/pdf/
```

### Via lien HTML
```html
<a href="/inspection/api/fiche/1/export/pdf/" class="btn btn-danger">
  📥 Télécharger PDF
</a>
```

### Via JavaScript
```javascript
function downloadPDF(ficheId) {
  fetch(`/inspection/api/fiche/${ficheId}/export/pdf/`)
    .then(response => response.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fiche_${ficheId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    });
}

// Utilisation
downloadPDF(1);
```

---

## 3. Exporter via curl (command line)

### JSON
```bash
# Avec cookies
curl -b cookies.txt \
  http://localhost:8000/inspection/api/fiche/1/export/json/ \
  -o fiche_1.json

# Ou directement
curl http://localhost:8000/inspection/api/fiche/1/export/json/ \
  --output fiche_1.json
```

### PDF
```bash
# Avec cookies
curl -b cookies.txt \
  http://localhost:8000/inspection/api/fiche/1/export/pdf/ \
  -o fiche_1.pdf

# Ou directement
curl http://localhost:8000/inspection/api/fiche/1/export/pdf/ \
  --output fiche_1.pdf
```

### Avec authentification HTTP
```bash
curl -u username:password \
  http://localhost:8000/inspection/api/fiche/1/export/json/ \
  -o fiche.json
```

---

## 4. Exporter programmatiquement avec Python

### Via requests
```python
import requests

# Configuration
BASE_URL = 'http://localhost:8000'
FICHE_ID = 1
USERNAME = 'user@example.com'
PASSWORD = 'password123'

# Session avec authentification
session = requests.Session()
session.auth = (USERNAME, PASSWORD)

# Exporter en JSON
response = session.get(f'{BASE_URL}/inspection/api/fiche/{FICHE_ID}/export/json/')
if response.status_code == 200:
    with open(f'fiche_{FICHE_ID}.json', 'wb') as f:
        f.write(response.content)
    print('✓ JSON exporté')

# Exporter en PDF
response = session.get(f'{BASE_URL}/inspection/api/fiche/{FICHE_ID}/export/pdf/')
if response.status_code == 200:
    with open(f'fiche_{FICHE_ID}.pdf', 'wb') as f:
        f.write(response.content)
    print('✓ PDF exporté')
```

### Via Django test client
```python
from django.test import Client
from django.contrib.auth.models import User

# Créer client
client = Client()

# Se connecter
client.login(username='user', password='pass')

# Exporter JSON
response = client.get('/inspection/api/fiche/1/export/json/')
print(f'JSON Status: {response.status_code}')

# Exporter PDF
response = client.get('/inspection/api/fiche/1/export/pdf/')
print(f'PDF Status: {response.status_code}')

# Sauvegarder
with open('fiche.pdf', 'wb') as f:
    f.write(response.content)
```

---

## 5. Intégrer dans les templates Django

### Detail fiche avec boutons export
```html
{% extends "base.html" %}

{% block content %}
<div class="fiche-detail">
  <h1>{{ fiche.entreprise }}</h1>
  
  <div class="actions">
    <a href="{% url 'inspection:export_fiche_json' pk=fiche.pk %}" 
       class="btn btn-sm btn-info">
      📥 JSON
    </a>
    <a href="{% url 'inspection:export_fiche_pdf' pk=fiche.pk %}" 
       class="btn btn-sm btn-danger">
      📥 PDF
    </a>
  </div>
  
  <!-- Contenu de la fiche -->
  <div class="fiche-content">
    <!-- ... -->
  </div>
</div>
{% endblock %}
```

### Liste fiches avec exports
```html
{% extends "base.html" %}

{% block content %}
<table class="table">
  <thead>
    <tr>
      <th>Entreprise</th>
      <th>Date</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {% for fiche in fiches %}
    <tr>
      <td>{{ fiche.entreprise }}</td>
      <td>{{ fiche.date_controle }}</td>
      <td>
        <a href="{% url 'inspection:export_fiche_json' pk=fiche.pk %}" 
           title="Télécharger JSON">
          📥
        </a>
        <a href="{% url 'inspection:export_fiche_pdf' pk=fiche.pk %}" 
           title="Télécharger PDF">
          📄
        </a>
      </td>
    </tr>
    {% endfor %}
  </tbody>
</table>
{% endblock %}
```

---

## 6. Traitement du JSON exporté

### Charger et manipuler JSON
```python
import json

# Charger le fichier JSON
with open('fiche_1.json', 'r', encoding='utf-8') as f:
    fiche_data = json.load(f)

# Accéder aux données
print(f"Entreprise: {fiche_data['entreprise']}")
print(f"Date: {fiche_data['date_controle']}")
print(f"Inspecteur: {fiche_data['inspecteur_nom']}")

# Effectifs
cadres = fiche_data['cadres_hommes'] + fiche_data['cadres_femmes']
ouvriers = fiche_data['ouvriers_hommes'] + fiche_data['ouvriers_femmes']
print(f"Total: {cadres + ouvriers} (Cadres: {cadres}, Ouvriers: {ouvriers})")

# Exporter vers CSV
import csv

with open('export.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=fiche_data.keys())
    writer.writeheader()
    writer.writerow(fiche_data)
```

### Valider JSON
```python
import json
from jsonschema import validate, ValidationError

schema = {
    "type": "object",
    "properties": {
        "id": {"type": "integer"},
        "entreprise": {"type": "string"},
        "date_controle": {"type": "string"},
    },
    "required": ["id", "entreprise", "date_controle"]
}

with open('fiche_1.json', 'r') as f:
    data = json.load(f)
    try:
        validate(instance=data, schema=schema)
        print("✓ JSON valide")
    except ValidationError as e:
        print(f"✗ Erreur: {e.message}")
```

---

## 7. Cas d'usage réels

### Sauvegarde automatique
```python
import os
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from inspection.models import FicheControle
from inspection.views import export_fiche_json, export_fiche_pdf
from django.test import RequestFactory
import json

class Command(BaseCommand):
    """Exporte toutes les fiches en JSON et PDF"""
    
    def handle(self, *args, **options):
        os.makedirs('exports', exist_ok=True)
        
        for fiche in FicheControle.objects.all():
            # Créer une requête fake
            factory = RequestFactory()
            request = factory.get('/')
            request.user = fiche.inspecteur
            
            # JSON
            response = export_fiche_json(request, fiche.pk)
            filename = f"exports/fiche_{fiche.pk}.json"
            with open(filename, 'wb') as f:
                f.write(response.content)
            print(f"✓ {filename}")
            
            # PDF
            response = export_fiche_pdf(request, fiche.pk)
            filename = f"exports/fiche_{fiche.pk}.pdf"
            with open(filename, 'wb') as f:
                f.write(response.content)
            print(f"✓ {filename}")
```

### Partage via API externe
```python
import requests
import json

def export_to_external_api(fiche_id):
    """Envoyer la fiche à une API externe"""
    
    # Récupérer la fiche
    response = requests.get(
        f'http://localhost:8000/inspection/api/fiche/{fiche_id}/export/json/',
        auth=('user', 'pass')
    )
    
    if response.status_code == 200:
        fiche_data = response.json()
        
        # Envoyer à API externe
        external_response = requests.post(
            'https://api.externe.com/fiches',
            json=fiche_data,
            headers={'Authorization': 'Bearer TOKEN'}
        )
        
        if external_response.status_code == 201:
            print(f"✓ Fiche {fiche_id} partagée")
        else:
            print(f"✗ Erreur: {external_response.status_code}")
```

---

## 8. Gestion des erreurs

### Try-catch JSON
```javascript
async function downloadWithErrorHandling(ficheId) {
  try {
    const response = await fetch(`/inspection/api/fiche/${ficheId}/export/json/`);
    
    if (response.status === 404) {
      alert('Fiche non trouvée');
      return;
    }
    
    if (response.status === 302) {
      alert('Vous devez vous connecter');
      window.location.href = '/login';
      return;
    }
    
    if (response.status === 200) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fiche_${ficheId}.json`;
      a.click();
    }
  } catch (error) {
    alert('Erreur: ' + error.message);
  }
}
```

### Try-catch PDF
```python
def safe_pdf_export(request, fiche_id):
    try:
        response = client.get(f'/inspection/api/fiche/{fiche_id}/export/pdf/')
        
        if response.status_code == 500:
            # ReportLab non disponible
            print("Installer reportlab: pip install reportlab")
            return None
        
        if response.status_code == 404:
            print("Fiche non trouvée ou accès refusé")
            return None
        
        if response.status_code == 200:
            return response.content
            
    except Exception as e:
        print(f"Erreur: {e}")
        return None
```

---

## 9. Performance et optimisation

### Exporter en batch
```python
def export_fiches_batch(fiche_ids):
    """Exporter plusieurs fiches"""
    import zipfile
    
    with zipfile.ZipFile('fiches.zip', 'w') as zf:
        for fiche_id in fiche_ids:
            # JSON
            response = client.get(f'/inspection/api/fiche/{fiche_id}/export/json/')
            zf.writestr(f'fiche_{fiche_id}.json', response.content)
            
            # PDF
            response = client.get(f'/inspection/api/fiche/{fiche_id}/export/pdf/')
            zf.writestr(f'fiche_{fiche_id}.pdf', response.content)
```

### Cache des PDF
```python
from django.views.decorators.cache import cache_page
from django.views.decorators.http import condition

@condition(etag_func=lambda r, pk: f"fiche-{pk}")
@cache_page(3600)  # Cache 1 heure
@login_required
def export_fiche_pdf(request, pk):
    # ... code existant
    pass
```

---

## 10. Intégration avec d'autres services

### Envoyer par email
```python
from django.core.mail import EmailMessage

def email_fiche(fiche_id, recipient_email):
    # Générer les exports
    client = Client()
    
    json_response = client.get(f'/inspection/api/fiche/{fiche_id}/export/json/')
    pdf_response = client.get(f'/inspection/api/fiche/{fiche_id}/export/pdf/')
    
    # Envoyer email
    email = EmailMessage(
        subject='Votre fiche de contrôle',
        body='Voir pièces jointes',
        from_email='noreply@example.com',
        to=[recipient_email],
    )
    
    email.attach(f'fiche_{fiche_id}.json', json_response.content, 'application/json')
    email.attach(f'fiche_{fiche_id}.pdf', pdf_response.content, 'application/pdf')
    
    email.send()
```

---

**Fin des exemples**
