from django.urls import path
from . import views

app_name = 'inspection'

urlpatterns = [
    # Offline local fiche CRUD routes (HTML templates)
    path('fiche/local/<str:local_id>/detail/', views.detail_local_fiche, name='detail_local_fiche'),
    path('fiche/local/<str:local_id>/edit/', views.edit_local_fiche, name='edit_local_fiche'),
    path('api/fiche/local/<str:local_id>/delete/', views.delete_local_fiche, name='delete_local_fiche'),
]