import json
from datetime import date, datetime
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .models import FicheControle
from .forms import CreerUtilisateurForm

try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    from reportlab.lib import colors
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False

SECTION_TITRES = [
    "Identification de l'entreprise",
    "Dispositions administratives & Effectifs",
    "Contrats de travail & Rémunération",
    "Temps de travail",
    "Sécurité sociale & Divers",
    "Conclusions & Signatures",
]

# Champs booléens du modèle
BOOL_FIELDS = [
    'remuneration_au_temps_1', 'remuneration_au_temps_2',
    'remuneration_a_la_piece_1', 'remuneration_a_la_piece_2',
    'remuneration_les_deux_1', 'remuneration_les_deux_2',
    'suite_observations_orales', 'suite_observations_ecrites',
    'suite_mise_en_demeure', 'suite_pv_infraction', 'suite_refere',
    'delai_reception', 'delai_un_mois', 'delai_autres',
]

# Champs entiers du modèle
INT_FIELDS = [
    'cadres_hommes', 'cadres_femmes', 'ouvriers_hommes', 'ouvriers_femmes',
    'cdi', 'cdd', 'cs', 'c_app', 'autres_contrats',
]

# Champs date du modèle
DATE_FIELDS = ['date_controle', 'date_ouverture']


def _construire_fiche(data, inspecteur, fiche=None):
    """Construit ou met à jour une FicheControle depuis un dict de données."""
    if fiche is None:
        fiche = FicheControle()
        fiche.inspecteur = inspecteur

    for field in FicheControle._meta.get_fields():
        fname = field.name
        if fname in ('id', 'inspecteur', 'created_at', 'updated_at', 'local_id'):
            continue
        if fname not in data:
            continue

        val = data[fname]

        if fname in BOOL_FIELDS:
            setattr(fiche, fname, val in (True, 'on', 'true', '1'))
        elif fname in INT_FIELDS:
            try:
                setattr(fiche, fname, int(val) if val not in ('', None) else 0)
            except (ValueError, TypeError):
                setattr(fiche, fname, 0)
        elif fname in DATE_FIELDS:
            if val and val != '':
                try:
                    from datetime import datetime
                    setattr(fiche, fname, datetime.strptime(str(val), '%Y-%m-%d').date())
                except (ValueError, TypeError):
                    if fname == 'date_controle':
                        setattr(fiche, fname, date.today())
            else:
                if fname == 'date_controle':
                    setattr(fiche, fname, date.today())
                else:
                    setattr(fiche, fname, None)
        else:
            setattr(fiche, fname, val or '')

    if not fiche.entreprise:
        fiche.entreprise = 'Sans nom'

    return fiche


def connexion(request):
    if request.user.is_authenticated:
        return redirect('tableau_de_bord')
    error = None
    if request.method == 'POST':
        email = request.POST.get('email', '').strip()
        mot_de_passe = request.POST.get('mot_de_passe', '')
        try:
            u = User.objects.get(email=email)
            user = authenticate(request, username=u.username, password=mot_de_passe)
            if user:
                login(request, user)
                return redirect('tableau_de_bord')
            else:
                error = "Mot de passe incorrect."
        except User.DoesNotExist:
            error = "Aucun compte associé à cet email."
    return render(request, 'inspection/connexion.html', {'error': error})


def deconnexion(request):
    logout(request)
    return redirect('connexion')


@login_required
def tableau_de_bord(request):
    user = request.user
    fiches = FicheControle.objects.all() if user.is_staff else FicheControle.objects.filter(inspecteur=user)
    total       = fiches.count()
    brouillons  = fiches.filter(statut='brouillon').count()
    soumises    = fiches.filter(statut='soumis').count()
    cette_annee = fiches.filter(created_at__year=timezone.now().year).count()
    recentes    = fiches[:5]
    return render(request, 'inspection/tableau_de_bord.html', {
        'total': total, 'brouillons': brouillons,
        'soumises': soumises, 'cette_annee': cette_annee, 'recentes': recentes,
    })


@login_required
def liste_fiches(request):
    user = request.user
    fiches = FicheControle.objects.all().select_related('inspecteur') if user.is_staff \
             else FicheControle.objects.filter(inspecteur=user)
    statut = request.GET.get('statut', '')
    if statut:
        fiches = fiches.filter(statut=statut)
    return render(request, 'inspection/liste_fiches.html', {'fiches': fiches, 'statut_filtre': statut})


@login_required
def nouvelle_fiche(request):
    """Vue simplifiée — le formulaire est géré en JS single-page."""
    return render(request, 'inspection/fiche_form.html', {'mode': 'creation'})


@login_required
def modifier_fiche(request, pk):
    if request.user.is_staff:
        fiche = get_object_or_404(FicheControle, pk=pk)
    else:
        fiche = get_object_or_404(FicheControle, pk=pk, inspecteur=request.user)

    # Sérialiser la fiche pour pré-remplir le formulaire JS
    fiche_data = {}
    for field in FicheControle._meta.get_fields():
        fname = field.name
        if fname in ('id', 'inspecteur', 'created_at', 'updated_at'):
            continue
        val = getattr(fiche, fname, None)
        if val is None:
            fiche_data[fname] = ''
        elif hasattr(val, 'strftime'):
            fiche_data[fname] = val.strftime('%Y-%m-%d')
        elif isinstance(val, bool):
            fiche_data[fname] = 'on' if val else ''
        else:
            fiche_data[fname] = str(val)

    return render(request, 'inspection/fiche_form.html', {
        'mode': 'modification',
        'fiche': fiche,
        'fiche_json': json.dumps(fiche_data),
    })


@login_required
def detail_fiche(request, pk):
    if request.user.is_staff:
        fiche = get_object_or_404(FicheControle, pk=pk)
    else:
        fiche = get_object_or_404(FicheControle, pk=pk, inspecteur=request.user)
    return render(request, 'inspection/detail_fiche.html', {'fiche': fiche})


@login_required
def supprimer_fiche(request, pk):
    if request.user.is_staff:
        fiche = get_object_or_404(FicheControle, pk=pk)
    else:
        fiche = get_object_or_404(FicheControle, pk=pk, inspecteur=request.user)
    if request.method == 'POST':
        nom = fiche.entreprise
        fiche.delete()
        messages.success(request, f'Fiche "{nom}" supprimée.')
        return redirect('liste_fiches')
    return render(request, 'inspection/confirmer_suppression.html', {'fiche': fiche})


@login_required
def administration(request):
    if not request.user.is_staff:
        messages.error(request, 'Accès réservé aux administrateurs.')
        return redirect('tableau_de_bord')
    utilisateurs = User.objects.all().order_by('date_joined')
    form = CreerUtilisateurForm()
    return render(request, 'inspection/administration.html', {'utilisateurs': utilisateurs, 'form': form})


@login_required
def creer_utilisateur(request):
    if not request.user.is_staff:
        return redirect('tableau_de_bord')
    if request.method == 'POST':
        form = CreerUtilisateurForm(request.POST)
        if form.is_valid():
            d = form.cleaned_data
            if User.objects.filter(email=d['email']).exists():
                messages.error(request, 'Un compte avec cet email existe déjà.')
            else:
                username = d['email'].split('@')[0] + str(User.objects.count())
                user = User.objects.create_user(
                    username=username, email=d['email'], password=d['mot_de_passe'],
                    first_name=d['prenom'], last_name=d['nom'],
                )
                if d['role'] == 'admin':
                    user.is_staff = True
                    user.save()
                messages.success(request, f'Compte créé pour {d["prenom"]} {d["nom"]}.')
    return redirect('administration')


@login_required
def supprimer_utilisateur(request, pk):
    if not request.user.is_staff:
        return redirect('tableau_de_bord')
    if request.method == 'POST':
        user = get_object_or_404(User, pk=pk)
        if user == request.user:
            messages.error(request, 'Vous ne pouvez pas supprimer votre propre compte.')
        else:
            nom = f"{user.first_name} {user.last_name}"
            user.delete()
            messages.success(request, f'Compte de {nom} supprimé.')
    return redirect('administration')


# ──────────────────────────────────────────────────────────────────────────────
# API JSON — Créer une fiche (utilisée par le formulaire single-page)
# ──────────────────────────────────────────────────────────────────────────────
@login_required
def api_fiche_creer(request):
    """Reçoit toutes les données de la fiche en JSON et crée la fiche."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Méthode non autorisée'}, status=405)
    try:
        data = json.loads(request.body)
        fiche = _construire_fiche(data, request.user)
        fiche.save()
        return JsonResponse({'success': True, 'id': fiche.pk, 'entreprise': fiche.entreprise})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


# ──────────────────────────────────────────────────────────────────────────────
# API JSON — Modifier une fiche existante
# ──────────────────────────────────────────────────────────────────────────────
@login_required
def api_fiche_modifier(request, pk):
    """Reçoit toutes les données de la fiche en JSON et met à jour la fiche."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Méthode non autorisée'}, status=405)
    if request.user.is_staff:
        fiche = get_object_or_404(FicheControle, pk=pk)
    else:
        fiche = get_object_or_404(FicheControle, pk=pk, inspecteur=request.user)
    try:
        data = json.loads(request.body)
        fiche = _construire_fiche(data, request.user, fiche)
        fiche.save()
        return JsonResponse({'success': True, 'id': fiche.pk})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


# ──────────────────────────────────────────────────────────────────────────────
# API JSON — Sync hors-ligne (fiches sauvegardées dans IndexedDB)
# ──────────────────────────────────────────────────────────────────────────────
@login_required
def api_sync(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Méthode non autorisée'}, status=405)
    try:
        data = json.loads(request.body)
        fiches_data = data.get('fiches', [])
        synchronisees = 0
        result_fiches = []

        for f in fiches_data:
            local_id = f.get('local_id', '')
            server_pk = f.get('server_pk')
            fiche = None

            if server_pk:
                try:
                    fiche = FicheControle.objects.get(pk=server_pk)
                    if not request.user.is_staff and fiche.inspecteur != request.user:
                        fiche = None
                except FicheControle.DoesNotExist:
                    fiche = None

            if fiche is None and local_id:
                try:
                    fiche = FicheControle.objects.get(local_id=local_id)
                    if not request.user.is_staff and fiche.inspecteur != request.user:
                        fiche = None
                except FicheControle.DoesNotExist:
                    fiche = None

            if fiche is None:
                fiche = _construire_fiche(f, request.user)
            else:
                fiche = _construire_fiche(f, request.user, fiche)

            fiche.local_id = local_id or fiche.local_id or ''
            fiche.save()
            synchronisees += 1
            result_fiches.append({'local_id': fiche.local_id, 'server_pk': fiche.pk})

        return JsonResponse({'synchronisees': synchronisees, 'fiches': result_fiches})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


# ──────────────────────────────────────────────────────────────────────────────
# API Export — Télécharger une fiche en JSON
# ──────────────────────────────────────────────────────────────────────────────
@login_required
def export_fiche_json(request, pk):
    """Exporte une fiche en JSON."""
    if request.user.is_staff:
        fiche = get_object_or_404(FicheControle, pk=pk)
    else:
        fiche = get_object_or_404(FicheControle, pk=pk, inspecteur=request.user)
    
    fiche_data = {}
    for field in FicheControle._meta.get_fields():
        fname = field.name
        if fname in ('id', 'inspecteur', 'created_at', 'updated_at', 'local_id'):
            continue
        val = getattr(fiche, fname, None)
        if val is None:
            fiche_data[fname] = None
        elif hasattr(val, 'isoformat'):
            fiche_data[fname] = val.isoformat()
        elif isinstance(val, User):
            fiche_data[fname] = val.id
        else:
            fiche_data[fname] = val
    
    fiche_data['id'] = fiche.pk
    fiche_data['inspecteur_id'] = fiche.inspecteur.id
    fiche_data['inspecteur_nom'] = f"{fiche.inspecteur.first_name} {fiche.inspecteur.last_name}"
    fiche_data['created_at'] = fiche.created_at.isoformat()
    fiche_data['updated_at'] = fiche.updated_at.isoformat()
    
    filename = f"fiche_{fiche.pk}_{fiche.entreprise.replace(' ', '_')}.json"
    response = HttpResponse(
        json.dumps(fiche_data, indent=2, ensure_ascii=False),
        content_type='application/json; charset=utf-8'
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


# ──────────────────────────────────────────────────────────────────────────────
# API Export — Télécharger une fiche en PDF
# ──────────────────────────────────────────────────────────────────────────────
@login_required
def export_fiche_pdf(request, pk):
    """Exporte une fiche en PDF."""
    if request.user.is_staff:
        fiche = get_object_or_404(FicheControle, pk=pk)
    else:
        fiche = get_object_or_404(FicheControle, pk=pk, inspecteur=request.user)
    
    if not HAS_REPORTLAB:
        return HttpResponse(
            'ReportLab non disponible. Veuillez installer reportlab.',
            status=500,
            content_type='text/plain; charset=utf-8'
        )
    
    filename = f"fiche_{fiche.pk}_{fiche.entreprise.replace(' ', '_')}.pdf"
    response = HttpResponse(content_type='application/pdf; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    
    doc = SimpleDocTemplate(response, pagesize=A4)
    story = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#1f4788'),
        spaceAfter=12,
        alignment=1
    )
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor('#2d5aa8'),
        spaceAfter=10,
        spaceBefore=10,
    )
    
    story.append(Paragraph(f"FICHE DE CONTRÔLE", title_style))
    story.append(Paragraph(f"Entreprise: {fiche.entreprise}", styles['Normal']))
    story.append(Spacer(1, 0.2*inch))
    
    infos_generales = [
        ['Champ', 'Valeur'],
        ['Date du contrôle', fiche.date_controle.isoformat() if fiche.date_controle else ''],
        ['Lieu', fiche.lieu],
        ['Statut', fiche.get_statut_display()],
        ['Inspecteur', f"{fiche.inspecteur.first_name} {fiche.inspecteur.last_name}"],
        ['Adresse', fiche.adresse],
        ['Téléphone', fiche.telephone],
        ['Email', fiche.email_entreprise],
    ]
    
    table = Table(infos_generales, colWidths=[2*inch, 4*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d5aa8')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f0f0f0')]),
    ]))
    
    story.append(Paragraph("Informations générales", heading_style))
    story.append(table)
    story.append(Spacer(1, 0.3*inch))
    
    if fiche.chef_nom:
        story.append(Paragraph("Chef d'établissement", heading_style))
        chef_data = [
            ['Nom', fiche.chef_nom],
            ['Téléphone', fiche.chef_cellulaire],
            ['Email', fiche.chef_email],
        ]
        chef_table = Table(chef_data, colWidths=[2*inch, 4*inch])
        chef_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#d0d0d0')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ]))
        story.append(chef_table)
        story.append(Spacer(1, 0.2*inch))
    
    if fiche.observations_generales:
        story.append(Paragraph("Observations générales", heading_style))
        story.append(Paragraph(fiche.observations_generales, styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
    
    if fiche.observations_divers:
        story.append(Paragraph("Observations (Divers)", heading_style))
        story.append(Paragraph(fiche.observations_divers, styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
    
    suite_actions = []
    if fiche.suite_observations_orales:
        suite_actions.append("✓ Observations orales")
    if fiche.suite_observations_ecrites:
        suite_actions.append("✓ Observations écrites")
    if fiche.suite_mise_en_demeure:
        suite_actions.append("✓ Mise en demeure")
    if fiche.suite_pv_infraction:
        suite_actions.append("✓ PV d'infraction")
    if fiche.suite_refere:
        suite_actions.append("✓ Référé")
    
    if suite_actions:
        story.append(Paragraph("Suite des actions", heading_style))
        for action in suite_actions:
            story.append(Paragraph(action, styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
    
    effectifs_data = [
        ['Catégorie', 'Hommes', 'Femmes', 'Total'],
        ['Cadres', str(fiche.cadres_hommes or 0), str(fiche.cadres_femmes or 0), str(fiche.cadres_total)],
        ['Ouvriers', str(fiche.ouvriers_hommes or 0), str(fiche.ouvriers_femmes or 0), str(fiche.ouvriers_total)],
        ['TOTAL', '', '', str(fiche.effectif_total)],
    ]
    
    story.append(Paragraph("Effectifs", heading_style))
    effectifs_table = Table(effectifs_data, colWidths=[1.5*inch, 1*inch, 1*inch, 1*inch])
    effectifs_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d5aa8')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e0e0e0')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
    ]))
    story.append(effectifs_table)
    story.append(Spacer(1, 0.2*inch))
    
    contrats_data = [
        ['Type de contrat', 'Nombre'],
        ['CDI', str(fiche.cdi or 0)],
        ['CDD', str(fiche.cdd or 0)],
        ['CS', str(fiche.cs or 0)],
        ['C APP', str(fiche.c_app or 0)],
        ['Autres', str(fiche.autres_contrats or 0)],
        ['TOTAL', str(fiche.contrats_total)],
    ]
    
    story.append(Paragraph("Contrats de travail", heading_style))
    contrats_table = Table(contrats_data, colWidths=[2*inch, 1.5*inch])
    contrats_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d5aa8')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e0e0e0')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
    ]))
    story.append(contrats_table)
    
    story.append(Spacer(1, 0.4*inch))
    story.append(Paragraph(f"Généré le: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}", styles['Normal']))
    
    doc.build(story)
    return response