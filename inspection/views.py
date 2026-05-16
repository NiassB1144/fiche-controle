import json
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.db.models import Count
from django.utils import timezone
from .models import FicheControle
from .forms import (
    Section1Form, Section2Form, Section3Form,
    Section4Form, Section5Form, Section6Form,
    CreerUtilisateurForm
)

SECTION_FORMS = [Section1Form, Section2Form, Section3Form, Section4Form, Section5Form, Section6Form]
SECTION_TITRES = [
    "Identification de l'entreprise",
    "Dispositions administratives & Effectifs",
    "Contrats de travail & Rémunération",
    "Temps de travail",
    "Sécurité sociale & Divers",
    "Conclusions & Signatures",
]


def is_admin(user):
    return user.is_authenticated and (user.is_staff or user.groups.filter(name='admin').exists() or hasattr(user, 'profile') and False or user.last_name == '__admin__')


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
    if user.is_staff:
        fiches = FicheControle.objects.all()
    else:
        fiches = FicheControle.objects.filter(inspecteur=user)

    total = fiches.count()
    brouillons = fiches.filter(statut='brouillon').count()
    soumises = fiches.filter(statut='soumis').count()
    cette_annee = fiches.filter(created_at__year=timezone.now().year).count()
    recentes = fiches[:10]

    context = {
        'total': total,
        'brouillons': brouillons,
        'soumises': soumises,
        'cette_annee': cette_annee,
        'recentes': recentes,
    }
    return render(request, 'inspection/tableau_de_bord.html', context)


@login_required
def liste_fiches(request):
    user = request.user
    if user.is_staff:
        fiches = FicheControle.objects.all().select_related('inspecteur')
    else:
        fiches = FicheControle.objects.filter(inspecteur=user)

    statut = request.GET.get('statut', '')
    if statut:
        fiches = fiches.filter(statut=statut)

    return render(request, 'inspection/liste_fiches.html', {'fiches': fiches, 'statut_filtre': statut})


@login_required
def nouvelle_fiche(request):
    etape = int(request.GET.get('etape', 1))
    etape = max(1, min(etape, 6))

    fiche_id = request.session.get('fiche_en_cours')
    fiche = None
    if fiche_id:
        try:
            fiche = FicheControle.objects.get(pk=fiche_id, inspecteur=request.user)
        except FicheControle.DoesNotExist:
            fiche = None
            request.session.pop('fiche_en_cours', None)

    FormClass = SECTION_FORMS[etape - 1]

    if request.method == 'POST':
        form = FormClass(request.POST, instance=fiche)
        if form.is_valid():
            if fiche is None:
                fiche = form.save(commit=False)
                fiche.inspecteur = request.user
                if not fiche.entreprise:
                    fiche.entreprise = "Sans nom"
                if not fiche.date_controle:
                    from datetime import date
                    fiche.date_controle = date.today()
                fiche.save()
                request.session['fiche_en_cours'] = fiche.pk
            else:
                form.save()

            action = request.POST.get('action', 'suivant')
            if action == 'precedent' and etape > 1:
                return redirect(f'/fiches/nouvelle/?etape={etape - 1}')
            elif action == 'suivant' and etape < 6:
                return redirect(f'/fiches/nouvelle/?etape={etape + 1}')
            elif action in ('soumettre', 'enregistrer') or etape == 6:
                request.session.pop('fiche_en_cours', None)
                messages.success(request, f'Fiche "{fiche.entreprise}" enregistrée avec succès.')
                return redirect('detail_fiche', pk=fiche.pk)
        else:
            pass
    else:
        form = FormClass(instance=fiche)

    return render(request, 'inspection/fiche_form.html', {
        'form': form,
        'etape': etape,
        'total_etapes': 6,
        'titre_section': SECTION_TITRES[etape - 1],
        'fiche': fiche,
        'mode': 'creation',
    })


@login_required
def modifier_fiche(request, pk):
    if request.user.is_staff:
        fiche = get_object_or_404(FicheControle, pk=pk)
    else:
        fiche = get_object_or_404(FicheControle, pk=pk, inspecteur=request.user)

    etape = int(request.GET.get('etape', 1))
    etape = max(1, min(etape, 6))
    FormClass = SECTION_FORMS[etape - 1]

    if request.method == 'POST':
        form = FormClass(request.POST, instance=fiche)
        if form.is_valid():
            form.save()
            action = request.POST.get('action', 'suivant')
            if action == 'precedent' and etape > 1:
                return redirect(f'/fiches/{pk}/modifier/?etape={etape - 1}')
            elif action == 'suivant' and etape < 6:
                return redirect(f'/fiches/{pk}/modifier/?etape={etape + 1}')
            else:
                messages.success(request, 'Fiche mise à jour.')
                return redirect('detail_fiche', pk=pk)
    else:
        form = FormClass(instance=fiche)

    return render(request, 'inspection/fiche_form.html', {
        'form': form,
        'etape': etape,
        'total_etapes': 6,
        'titre_section': SECTION_TITRES[etape - 1],
        'fiche': fiche,
        'mode': 'modification',
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
                    username=username,
                    email=d['email'],
                    password=d['mot_de_passe'],
                    first_name=d['prenom'],
                    last_name=d['nom'],
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


@csrf_exempt
@login_required
def api_sync(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Méthode non autorisée'}, status=405)
    try:
        data = json.loads(request.body)
        fiches_data = data.get('fiches', [])
        created = []
        for f in fiches_data:
            from datetime import date
            fiche = FicheControle.objects.create(
                inspecteur=request.user,
                entreprise=f.get('entreprise', 'Sans nom'),
                date_controle=f.get('date_controle', str(date.today())),
                lieu=f.get('lieu', 'Louga'),
                statut=f.get('statut', 'brouillon'),
                local_id=f.get('local_id', ''),
            )
            created.append({'id': fiche.pk, 'local_id': fiche.local_id})
        return JsonResponse({'synchronisees': len(created), 'fiches': created})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
