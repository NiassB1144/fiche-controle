from django.db import models
from django.contrib.auth.models import User


class FicheControle(models.Model):
    STATUT_CHOICES = [
        ('brouillon', 'Brouillon'),
        ('soumis', 'Soumis'),
    ]

    inspecteur = models.ForeignKey(User, on_delete=models.CASCADE, related_name='fiches')
    entreprise = models.CharField(max_length=255, verbose_name="Entreprise ou Établissement")
    date_controle = models.DateField(verbose_name="Date du contrôle")
    lieu = models.CharField(max_length=100, default="Louga", verbose_name="Lieu")
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='soumis')
    local_id = models.CharField(max_length=100, blank=True, null=True)

    # Section 1 — Identification
    adresse = models.TextField(blank=True)
    telephone = models.CharField(max_length=50, blank=True)
    email_entreprise = models.EmailField(blank=True)
    date_ouverture = models.DateField(null=True, blank=True)
    forme_juridique = models.CharField(max_length=100, blank=True)
    activite_principale = models.CharField(max_length=200, blank=True)

    chef_nom = models.CharField(max_length=200, blank=True, verbose_name="Chef d'établissement - Prénom et Nom")
    chef_cellulaire = models.CharField(max_length=50, blank=True)
    chef_email = models.EmailField(blank=True)

    representant_nom = models.CharField(max_length=200, blank=True, verbose_name="Représentant travailleurs - Prénom et Nom")
    representant_qualite = models.CharField(max_length=100, blank=True)
    representant_cellulaire = models.CharField(max_length=50, blank=True)
    representant_email = models.EmailField(blank=True)

    # Section 2 — Dispositions administratives & Effectifs
    doe = models.CharField(max_length=3, blank=True, verbose_name="Déclaration d'Ouverture d'Établissement (DOE)")
    registre_paie = models.CharField(max_length=3, blank=True)

    cadres_hommes = models.PositiveIntegerField(null=True, blank=True, default=0)
    cadres_femmes = models.PositiveIntegerField(null=True, blank=True, default=0)
    ouvriers_hommes = models.PositiveIntegerField(null=True, blank=True, default=0)
    ouvriers_femmes = models.PositiveIntegerField(null=True, blank=True, default=0)

    # Section 3 — Contrats & Rémunération
    cdi = models.PositiveIntegerField(null=True, blank=True, default=0, verbose_name="CDI")
    cdd = models.PositiveIntegerField(null=True, blank=True, default=0, verbose_name="CDD")
    cs = models.PositiveIntegerField(null=True, blank=True, default=0, verbose_name="CS")
    c_app = models.PositiveIntegerField(null=True, blank=True, default=0, verbose_name="C APP")
    autres_contrats = models.PositiveIntegerField(null=True, blank=True, default=0, verbose_name="Autres")

    remuneration_au_temps_1 = models.BooleanField(default=False)
    remuneration_au_temps_2 = models.BooleanField(default=False)
    remuneration_a_la_piece_1 = models.BooleanField(default=False)
    remuneration_a_la_piece_2 = models.BooleanField(default=False)
    remuneration_les_deux_1 = models.BooleanField(default=False)
    remuneration_les_deux_2 = models.BooleanField(default=False)

    salaires_conformes_1 = models.CharField(max_length=3, blank=True)
    salaires_conformes_2 = models.CharField(max_length=3, blank=True)
    bulletins_paie_1 = models.CharField(max_length=3, blank=True)
    bulletins_paie_2 = models.CharField(max_length=3, blank=True)
    heures_sup_1 = models.CharField(max_length=3, blank=True)
    heures_sup_2 = models.CharField(max_length=3, blank=True)
    prime_anciennete_1 = models.CharField(max_length=3, blank=True)
    prime_anciennete_2 = models.CharField(max_length=3, blank=True)
    jours_feries_1 = models.CharField(max_length=3, blank=True)
    jours_feries_2 = models.CharField(max_length=3, blank=True)
    indemnites_transport_1 = models.CharField(max_length=3, blank=True)
    indemnites_transport_2 = models.CharField(max_length=3, blank=True)

    # Section 4 — Temps de travail
    horaires_affiches_1 = models.CharField(max_length=3, blank=True)
    horaires_affiches_2 = models.CharField(max_length=3, blank=True)
    amenagement_8h_5j_1 = models.CharField(max_length=3, blank=True)
    amenagement_8h_5j_2 = models.CharField(max_length=3, blank=True)
    amenagement_6h40_6j_1 = models.CharField(max_length=3, blank=True)
    amenagement_6h40_6j_2 = models.CharField(max_length=3, blank=True)
    pause_quotidienne_1 = models.CharField(max_length=3, blank=True)
    pause_quotidienne_2 = models.CharField(max_length=3, blank=True)
    repos_hebdomadaire_1 = models.CharField(max_length=3, blank=True)
    repos_hebdomadaire_2 = models.CharField(max_length=3, blank=True)

    # Section 5 — Sécurité sociale
    declaration_css_1 = models.CharField(max_length=3, blank=True)
    declaration_css_2 = models.CharField(max_length=3, blank=True)
    adhesion_css_1 = models.CharField(max_length=3, blank=True)
    adhesion_css_2 = models.CharField(max_length=3, blank=True)
    adhesion_ipres_1 = models.CharField(max_length=3, blank=True)
    adhesion_ipres_2 = models.CharField(max_length=3, blank=True)
    adhesion_ipm_1 = models.CharField(max_length=3, blank=True)
    adhesion_ipm_2 = models.CharField(max_length=3, blank=True)
    cotisations_css_1 = models.CharField(max_length=3, blank=True)
    cotisations_css_2 = models.CharField(max_length=3, blank=True)
    cotisations_ipres_1 = models.CharField(max_length=3, blank=True)
    cotisations_ipres_2 = models.CharField(max_length=3, blank=True)
    cotisations_ipm_1 = models.CharField(max_length=3, blank=True)
    cotisations_ipm_2 = models.CharField(max_length=3, blank=True)

    # Section 5 — Divers
    delegues_personnel_1 = models.CharField(max_length=3, blank=True)
    delegues_personnel_2 = models.CharField(max_length=3, blank=True)
    reglement_interieur_1 = models.CharField(max_length=3, blank=True)
    reglement_interieur_2 = models.CharField(max_length=3, blank=True)
    comite_hst_1 = models.CharField(max_length=3, blank=True)
    comite_hst_2 = models.CharField(max_length=3, blank=True)
    visite_medicale_1 = models.CharField(max_length=3, blank=True)
    visite_medicale_2 = models.CharField(max_length=3, blank=True)
    extincteurs_1 = models.CharField(max_length=3, blank=True)
    extincteurs_2 = models.CharField(max_length=3, blank=True)
    epi_disponible_1 = models.CharField(max_length=3, blank=True)
    epi_disponible_2 = models.CharField(max_length=3, blank=True)
    epi_effectif_1 = models.CharField(max_length=3, blank=True)
    epi_effectif_2 = models.CharField(max_length=3, blank=True)
    toilettes_1 = models.CharField(max_length=3, blank=True)
    toilettes_2 = models.CharField(max_length=3, blank=True)
    conges_1 = models.CharField(max_length=3, blank=True)
    conges_2 = models.CharField(max_length=3, blank=True)
    dasmo_bs_1 = models.CharField(max_length=3, blank=True)
    dasmo_bs_2 = models.CharField(max_length=3, blank=True)
    observations_divers = models.TextField(blank=True)

    # Section 6 — Conclusions
    observations_generales = models.TextField(blank=True)
    suite_observations_orales = models.BooleanField(default=False)
    suite_observations_ecrites = models.BooleanField(default=False)
    suite_mise_en_demeure = models.BooleanField(default=False)
    suite_pv_infraction = models.BooleanField(default=False)
    suite_refere = models.BooleanField(default=False)

    delai_reception = models.BooleanField(default=False)
    delai_un_mois = models.BooleanField(default=False)
    delai_autres = models.BooleanField(default=False)
    delai_autres_precision = models.CharField(max_length=200, blank=True)

    signature_equipe = models.CharField(max_length=200, blank=True)
    signature_gerant = models.CharField(max_length=200, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Fiche de contrôle"
        verbose_name_plural = "Fiches de contrôle"

    def __str__(self):
        return f"{self.entreprise} — {self.date_controle}"

    @property
    def cadres_total(self):
        return (self.cadres_hommes or 0) + (self.cadres_femmes or 0)

    @property
    def ouvriers_total(self):
        return (self.ouvriers_hommes or 0) + (self.ouvriers_femmes or 0)

    @property
    def effectif_total(self):
        return self.cadres_total + self.ouvriers_total

    @property
    def contrats_total(self):
        return (self.cdi or 0) + (self.cdd or 0) + (self.cs or 0) + (self.c_app or 0) + (self.autres_contrats or 0)
