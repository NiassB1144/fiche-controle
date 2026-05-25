from django.urls import path
from . import views

app_name = 'inspection'

urlpatterns = [
    # API JSON
    path('api/fiche/creer/', views.api_fiche_creer, name='api_fiche_creer'),
    path('api/fiche/<int:pk>/modifier/', views.api_fiche_modifier, name='api_fiche_modifier'),
    path('api/fiche/<int:pk>/supprimer/', views.api_fiche_supprimer, name='api_fiche_supprimer'),
    
    # Exports
    path('api/fiche/<int:pk>/export/json/', views.export_fiche_json, name='export_fiche_json'),
    path('api/fiche/<int:pk>/export/pdf/', views.export_fiche_pdf, name='export_fiche_pdf'),
]
