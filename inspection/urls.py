from django.urls import path
from . import views, api

app_name = 'inspection'

urlpatterns = [
    # API Offline Sync
    path('api/sync/', api.sync_endpoint, name='api_sync'),
    path('api/fiches/', api.get_fiches, name='api_fiches'),
    path('api/fiches/<int:fiche_id>/', api.get_fiche, name='api_fiche'),
    path('api/local/<str:local_id>/', api.get_local_fiche, name='api_local_fiche'),
    
    # Offline local fiche CRUD routes
    path('fiche/local/<str:local_id>/detail/', views.detail_local_fiche, name='detail_local_fiche'),
    path('fiche/local/<str:local_id>/edit/', views.edit_local_fiche, name='edit_local_fiche'),
    path('api/fiche/local/<str:local_id>/delete/', views.delete_local_fiche, name='delete_local_fiche'),
    
    # API JSON (anciens endpoints)
    path('api/fiche/creer/', views.api_fiche_creer, name='api_fiche_creer'),
    path('api/fiche/<int:pk>/modifier/', views.api_fiche_modifier, name='api_fiche_modifier'),
    path('api/fiche/<int:pk>/supprimer/', views.api_fiche_supprimer, name='api_fiche_supprimer'),
    
    # Exports
    path('api/fiche/<int:pk>/export/json/', views.export_fiche_json, name='export_fiche_json'),
    path('api/fiche/<int:pk>/export/pdf/', views.export_fiche_pdf, name='export_fiche_pdf'),
]
