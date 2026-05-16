from django.contrib import admin
from .models import FicheControle

@admin.register(FicheControle)
class FicheControleAdmin(admin.ModelAdmin):
    list_display = ['entreprise', 'date_controle', 'lieu', 'inspecteur', 'statut', 'created_at']
    list_filter = ['statut', 'lieu', 'date_controle']
    search_fields = ['entreprise', 'inspecteur__username']
