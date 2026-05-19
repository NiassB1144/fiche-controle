from django.contrib import admin
from django.urls import path
from django.http import HttpResponse
from django.conf import settings
from django.views.generic.base import RedirectView
from inspection import views
import os
import json


def serve_sw(request):
    candidates = [
        os.path.join(settings.BASE_DIR, 'static', 'js', 'sw.js'),
        os.path.join(settings.BASE_DIR, 'staticfiles', 'js', 'sw.js'),
    ]
    content = None
    for path_candidate in candidates:
        if os.path.exists(path_candidate):
            with open(path_candidate, 'r', encoding='utf-8') as f:
                content = f.read()
            break
    if content is None:
        return HttpResponse('/* sw.js introuvable */', content_type='application/javascript', status=404)
    response = HttpResponse(content, content_type='application/javascript')
    response['Service-Worker-Allowed'] = '/'
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return response


def serve_manifest(request):
    candidates = [
        os.path.join(settings.BASE_DIR, 'static', 'manifest.json'),
        os.path.join(settings.BASE_DIR, 'staticfiles', 'manifest.json'),
    ]
    content = None
    for path_candidate in candidates:
        if os.path.exists(path_candidate):
            with open(path_candidate, 'r', encoding='utf-8') as f:
                content = f.read()
            break
    if content is None:
        return HttpResponse('{}', content_type='application/json', status=404)
    response = HttpResponse(content, content_type='application/manifest+json')
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return response


urlpatterns = [
    # PWA — toujours en premier
    path('sw.js', serve_sw, name='sw'),
    path('manifest.json', serve_manifest, name='manifest'),

    # Favicon
    path('favicon.ico', RedirectView.as_view(url='/static/icons/icon-192.png', permanent=True)),

    # Admin
    path('admin/', admin.site.urls),

    # Auth
    path('connexion/', views.connexion, name='connexion'),
    path('deconnexion/', views.deconnexion, name='deconnexion'),

    # Dashboard
    path('', views.tableau_de_bord, name='tableau_de_bord'),

    # Fiches
    path('fiches/', views.liste_fiches, name='liste_fiches'),
    path('fiches/nouvelle/', views.nouvelle_fiche, name='nouvelle_fiche'),
    path('fiches/<int:pk>/', views.detail_fiche, name='detail_fiche'),
    path('fiches/<int:pk>/modifier/', views.modifier_fiche, name='modifier_fiche'),
    path('fiches/<int:pk>/supprimer/', views.supprimer_fiche, name='supprimer_fiche'),

    # Administration
    path('administration/', views.administration, name='administration'),
    path('administration/creer-utilisateur/', views.creer_utilisateur, name='creer_utilisateur'),
    path('administration/supprimer-utilisateur/<int:pk>/', views.supprimer_utilisateur, name='supprimer_utilisateur'),

    # API JSON — formulaire single-page + sync hors-ligne
    path('api/fiche/creer/', views.api_fiche_creer, name='api_fiche_creer'),
    path('api/fiche/<int:pk>/modifier/', views.api_fiche_modifier, name='api_fiche_modifier'),
    path('api/sync/', views.api_sync, name='api_sync'),
    
    # API Export — téléchargement fiches
    path('api/fiche/<int:pk>/export/json/', views.export_fiche_json, name='export_fiche_json'),
    path('api/fiche/<int:pk>/export/pdf/', views.export_fiche_pdf, name='export_fiche_pdf'),
]