from django.urls import path
from . import views

app_name = 'inspection'

urlpatterns = [
    path('api/fiche/<int:pk>/export/json/', views.export_fiche_json, name='export_fiche_json'),
    path('api/fiche/<int:pk>/export/pdf/', views.export_fiche_pdf, name='export_fiche_pdf'),
]
