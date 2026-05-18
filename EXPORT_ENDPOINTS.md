# Documentation des Endpoints d'Export

## Endpoints Ajoutés

### 1. `export_fiche_json(request, pk)` - Exporter une fiche en JSON

**URL:** `/api/fiche/{pk}/export/json/`  
**Méthode:** `GET`  
**Authentification:** `@login_required`  

#### Description
Télécharge une fiche de contrôle au format JSON avec tous les champs sérialisés au format ISO.

#### Permissions
- **Utilisateur standard:** Peut exporter uniquement ses propres fiches
- **Utilisateur staff/admin:** Peut exporter n'importe quelle fiche

#### Réponse
- **Status 200:** Fichier JSON téléchargé
- **Status 404:** Fiche non trouvée ou accès non autorisé
- **Status 302:** Redirection vers la page de connexion si non authentifié

#### Format du fichier
```json
{
  "id": 1,
  "entreprise": "ACME SARL",
  "date_controle": "2024-01-15",
  "lieu": "Dakar",
  "statut": "brouillon",
  "adresse": "123 Rue de Test",
  "telephone": "+221 33 123 4567",
  "email_entreprise": "contact@acme.com",
  "chef_nom": "Jean Dupont",
  "cadres_hommes": 5,
  "cadres_femmes": 2,
  "ouvriers_hommes": 10,
  "ouvriers_femmes": 8,
  "cdi": 12,
  "cdd": 3,
  "observations_generales": "Observations du contrôle",
  "created_at": "2024-01-15T10:30:00+00:00",
  "updated_at": "2024-01-15T14:45:00+00:00",
  "inspecteur_id": 1,
  "inspecteur_nom": "Pierre Martin"
  // ... et tous les autres champs du modèle
}
```

#### Dates
- Toutes les dates et datetimes sont sérialisées au format ISO 8601
- Exemple: `2024-01-15T10:30:00+00:00`

#### Nom du fichier téléchargé
```
fiche_{pk}_{entreprise}.json
```
Exemple: `fiche_1_ACME_SARL.json`

#### Utilisation
```bash
# Via curl
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:8000/inspection/api/fiche/1/export/json/" \
  --output fiche.json

# Via JavaScript fetch
fetch('/inspection/api/fiche/1/export/json/')
  .then(r => r.blob())
  .then(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fiche.json';
    a.click();
  });
```

---

### 2. `export_fiche_pdf(request, pk)` - Exporter une fiche en PDF

**URL:** `/api/fiche/{pk}/export/pdf/`  
**Méthode:** `GET`  
**Authentification:** `@login_required`  

#### Description
Télécharge une fiche de contrôle au format PDF avec mise en page professionnelle incluant:
- Titre et informations générales
- Chef d'établissement
- Observations
- Tableaux des effectifs et contrats
- Suite des actions

#### Permissions
- **Utilisateur standard:** Peut exporter uniquement ses propres fiches
- **Utilisateur staff/admin:** Peut exporter n'importe quelle fiche

#### Dépendances
Requires `reportlab` package. Le code gère gracieusement son absence.

```bash
pip install reportlab
```

#### Réponse
- **Status 200:** Fichier PDF généré et téléchargé
- **Status 404:** Fiche non trouvée ou accès non autorisé
- **Status 302:** Redirection vers la page de connexion si non authentifié
- **Status 500:** ReportLab non disponible

#### Format du PDF
Le PDF contient les sections suivantes:

1. **En-tête**
   - Titre: "FICHE DE CONTRÔLE"
   - Nom de l'entreprise

2. **Informations générales** (Tableau)
   - Date du contrôle
   - Lieu
   - Statut
   - Inspecteur
   - Adresse
   - Téléphone
   - Email

3. **Chef d'établissement** (Tableau, si rempli)
   - Nom
   - Téléphone
   - Email

4. **Observations générales** (Texte libre)

5. **Observations Divers** (Texte libre)

6. **Suite des actions** (Listes à cocher)
   - Observations orales
   - Observations écrites
   - Mise en demeure
   - PV d'infraction
   - Référé

7. **Effectifs** (Tableau)
   | Catégorie | Hommes | Femmes | Total |
   |-----------|--------|--------|-------|
   | Cadres    | X      | Y      | Z     |
   | Ouvriers  | X      | Y      | Z     |
   | TOTAL     |        |        | Z     |

8. **Contrats de travail** (Tableau)
   | Type de contrat | Nombre |
   |-----------------|--------|
   | CDI             | X      |
   | CDD             | Y      |
   | CS              | Z      |
   | C APP           | A      |
   | Autres          | B      |
   | TOTAL           | N      |

9. **Pied de page**
   - Date et heure de génération

#### Nom du fichier téléchargé
```
fiche_{pk}_{entreprise}.pdf
```
Exemple: `fiche_1_ACME_SARL.pdf`

#### Utilisation
```bash
# Via curl
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:8000/inspection/api/fiche/1/export/pdf/" \
  --output fiche.pdf

# Via JavaScript fetch
fetch('/inspection/api/fiche/1/export/pdf/')
  .then(r => r.blob())
  .then(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fiche.pdf';
    a.click();
  });
```

---

## Intégration dans le Projet

### URLs
Les endpoints sont enregistrés dans `inspection/urls.py`:

```python
path('api/fiche/<int:pk>/export/json/', views.export_fiche_json, name='export_fiche_json'),
path('api/fiche/<int:pk>/export/pdf/', views.export_fiche_pdf, name='export_fiche_pdf'),
```

### Depuis les templates Django
```html
<!-- Exporter en JSON -->
<a href="{% url 'inspection:export_fiche_json' pk=fiche.pk %}" class="btn btn-info">
  📥 Télécharger JSON
</a>

<!-- Exporter en PDF -->
<a href="{% url 'inspection:export_fiche_pdf' pk=fiche.pk %}" class="btn btn-danger">
  📥 Télécharger PDF
</a>
```

### Via JavaScript
```javascript
// JSON
async function downloadJSON(ficheId) {
  const response = await fetch(`/inspection/api/fiche/${ficheId}/export/json/`);
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fiche_${ficheId}.json`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
}

// PDF
async function downloadPDF(ficheId) {
  const response = await fetch(`/inspection/api/fiche/${ficheId}/export/pdf/`);
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fiche_${ficheId}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
}
```

---

## Gestion des Erreurs

### Fiche non trouvée (404)
```json
{
  "error": "Not found"
}
```

### Accès refusé (404 pour non-propriétaire)
L'endpoint retourne un 404 au lieu de 403 pour éviter de divulguer l'existence des fiches.

### ReportLab non disponible (500)
```
ReportLab non disponible. Veuillez installer reportlab.
```

### Non authentifié (302)
Redirection automatique vers la page de connexion.

---

## Notes de Sécurité

1. **Authentification:** `@login_required` requis pour accéder à ces endpoints
2. **Autorisation:** Vérification que l'utilisateur est le propriétaire ou un staff
3. **Dates ISO:** Dates sérialisées au format ISO 8601 pour compatibilité
4. **UTF-8:** Encodage UTF-8 pour tous les fichiers (support des caractères accentués)
5. **Pas de cache:** Les fichiers ne sont pas cachés côté navigateur

---

## Testing

Pour tester les endpoints:

```bash
python test_exports.py
```

Ou manuellement:

```bash
# JSON export
curl -b cookies.txt http://localhost:8000/inspection/api/fiche/1/export/json/ -o test.json

# PDF export
curl -b cookies.txt http://localhost:8000/inspection/api/fiche/1/export/pdf/ -o test.pdf
```
