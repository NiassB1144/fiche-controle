from django import forms
from django.contrib.auth.models import User
from .models import FicheControle

OUI_NON = [('', '—'), ('Oui', 'Oui'), ('Non', 'Non')]

WIDGET_OUI_NON = forms.Select(choices=OUI_NON, attrs={'class': 'form-select form-select-sm'})

class Section1Form(forms.ModelForm):
    class Meta:
        model = FicheControle
        fields = [
            'lieu', 'date_controle', 'entreprise',
            'adresse', 'telephone', 'email_entreprise', 'date_ouverture',
            'forme_juridique', 'activite_principale',
            'chef_nom', 'chef_cellulaire', 'chef_email',
            'representant_nom', 'representant_qualite',
            'representant_cellulaire', 'representant_email',
        ]
        widgets = {
            'lieu': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Ex: Louga'}),
            'date_controle': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'entreprise': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Nom complet', 'required': True}),
            'adresse': forms.TextInput(attrs={'class': 'form-control'}),
            'telephone': forms.TextInput(attrs={'class': 'form-control'}),
            'email_entreprise': forms.EmailInput(attrs={'class': 'form-control'}),
            'date_ouverture': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'forme_juridique': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Ex: SARL, SA, GIE...'}),
            'activite_principale': forms.TextInput(attrs={'class': 'form-control'}),
            'chef_nom': forms.TextInput(attrs={'class': 'form-control'}),
            'chef_cellulaire': forms.TextInput(attrs={'class': 'form-control'}),
            'chef_email': forms.EmailInput(attrs={'class': 'form-control'}),
            'representant_nom': forms.TextInput(attrs={'class': 'form-control'}),
            'representant_qualite': forms.TextInput(attrs={'class': 'form-control'}),
            'representant_cellulaire': forms.TextInput(attrs={'class': 'form-control'}),
            'representant_email': forms.EmailInput(attrs={'class': 'form-control'}),
        }
        labels = {
            'lieu': 'Lieu du contrôle',
            'date_controle': 'Date du contrôle',
            'entreprise': 'Entreprise ou Établissement',
            'adresse': 'Adresse',
            'telephone': 'Téléphone (standard)',
            'email_entreprise': 'E-mail',
            'date_ouverture': "Date d'ouverture",
            'forme_juridique': 'Forme juridique',
            'activite_principale': 'Activité principale',
            'chef_nom': 'Prénom et Nom',
            'chef_cellulaire': 'Cellulaire',
            'chef_email': 'E-mail',
            'representant_nom': 'Prénom et Nom',
            'representant_qualite': 'Qualité',
            'representant_cellulaire': 'Cellulaire',
            'representant_email': 'E-mail',
        }


class Section2Form(forms.ModelForm):
    class Meta:
        model = FicheControle
        fields = [
            'doe', 'registre_paie',
            'cadres_hommes', 'cadres_femmes',
            'ouvriers_hommes', 'ouvriers_femmes',
        ]
        widgets = {
            'doe': forms.Select(choices=OUI_NON, attrs={'class': 'form-select form-select-sm'}),
            'registre_paie': forms.Select(choices=OUI_NON, attrs={'class': 'form-select form-select-sm'}),
            'cadres_hommes': forms.NumberInput(attrs={'class': 'form-control form-control-sm', 'min': '0'}),
            'cadres_femmes': forms.NumberInput(attrs={'class': 'form-control form-control-sm', 'min': '0'}),
            'ouvriers_hommes': forms.NumberInput(attrs={'class': 'form-control form-control-sm', 'min': '0'}),
            'ouvriers_femmes': forms.NumberInput(attrs={'class': 'form-control form-control-sm', 'min': '0'}),
        }
        labels = {
            'doe': "Déclaration d'Ouverture d'Établissement (DOE) ?",
            'registre_paie': 'Registre de paie ?',
            'cadres_hommes': 'Hommes',
            'cadres_femmes': 'Femmes',
            'ouvriers_hommes': 'Hommes',
            'ouvriers_femmes': 'Femmes',
        }


class Section3Form(forms.ModelForm):
    class Meta:
        model = FicheControle
        fields = [
            'cdi', 'cdd', 'cs', 'c_app', 'autres_contrats',
            'remuneration_au_temps_1', 'remuneration_au_temps_2',
            'remuneration_a_la_piece_1', 'remuneration_a_la_piece_2',
            'remuneration_les_deux_1', 'remuneration_les_deux_2',
            'salaires_conformes_1', 'salaires_conformes_2',
            'bulletins_paie_1', 'bulletins_paie_2',
            'heures_sup_1', 'heures_sup_2',
            'prime_anciennete_1', 'prime_anciennete_2',
            'jours_feries_1', 'jours_feries_2',
            'indemnites_transport_1', 'indemnites_transport_2',
        ]
        widgets = {
            'cdi': forms.NumberInput(attrs={'class': 'form-control form-control-sm', 'min': '0'}),
            'cdd': forms.NumberInput(attrs={'class': 'form-control form-control-sm', 'min': '0'}),
            'cs': forms.NumberInput(attrs={'class': 'form-control form-control-sm', 'min': '0'}),
            'c_app': forms.NumberInput(attrs={'class': 'form-control form-control-sm', 'min': '0'}),
            'autres_contrats': forms.NumberInput(attrs={'class': 'form-control form-control-sm', 'min': '0'}),
            'remuneration_au_temps_1': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'remuneration_au_temps_2': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'remuneration_a_la_piece_1': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'remuneration_a_la_piece_2': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'remuneration_les_deux_1': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'remuneration_les_deux_2': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'salaires_conformes_1': forms.Select(choices=OUI_NON, attrs={'class': 'form-select form-select-sm'}),
            'salaires_conformes_2': forms.Select(choices=OUI_NON, attrs={'class': 'form-select form-select-sm'}),
            'bulletins_paie_1': forms.Select(choices=OUI_NON, attrs={'class': 'form-select form-select-sm'}),
            'bulletins_paie_2': forms.Select(choices=OUI_NON, attrs={'class': 'form-select form-select-sm'}),
            'heures_sup_1': forms.Select(choices=OUI_NON, attrs={'class': 'form-select form-select-sm'}),
            'heures_sup_2': forms.Select(choices=OUI_NON, attrs={'class': 'form-select form-select-sm'}),
            'prime_anciennete_1': forms.Select(choices=OUI_NON, attrs={'class': 'form-select form-select-sm'}),
            'prime_anciennete_2': forms.Select(choices=OUI_NON, attrs={'class': 'form-select form-select-sm'}),
            'jours_feries_1': forms.Select(choices=OUI_NON, attrs={'class': 'form-select form-select-sm'}),
            'jours_feries_2': forms.Select(choices=OUI_NON, attrs={'class': 'form-select form-select-sm'}),
            'indemnites_transport_1': forms.Select(choices=OUI_NON, attrs={'class': 'form-select form-select-sm'}),
            'indemnites_transport_2': forms.Select(choices=OUI_NON, attrs={'class': 'form-select form-select-sm'}),
        }


class Section4Form(forms.ModelForm):
    class Meta:
        model = FicheControle
        fields = [
            'horaires_affiches_1', 'horaires_affiches_2',
            'amenagement_8h_5j_1', 'amenagement_8h_5j_2',
            'amenagement_6h40_6j_1', 'amenagement_6h40_6j_2',
            'pause_quotidienne_1', 'pause_quotidienne_2',
            'repos_hebdomadaire_1', 'repos_hebdomadaire_2',
        ]
        widgets = {f: forms.Select(choices=OUI_NON, attrs={'class': 'form-select form-select-sm'}) for f in [
            'horaires_affiches_1', 'horaires_affiches_2',
            'amenagement_8h_5j_1', 'amenagement_8h_5j_2',
            'amenagement_6h40_6j_1', 'amenagement_6h40_6j_2',
            'pause_quotidienne_1', 'pause_quotidienne_2',
            'repos_hebdomadaire_1', 'repos_hebdomadaire_2',
        ]}


class Section5Form(forms.ModelForm):
    class Meta:
        model = FicheControle
        fields = [
            'declaration_css_1', 'declaration_css_2',
            'adhesion_css_1', 'adhesion_css_2',
            'adhesion_ipres_1', 'adhesion_ipres_2',
            'adhesion_ipm_1', 'adhesion_ipm_2',
            'cotisations_css_1', 'cotisations_css_2',
            'cotisations_ipres_1', 'cotisations_ipres_2',
            'cotisations_ipm_1', 'cotisations_ipm_2',
            'delegues_personnel_1', 'delegues_personnel_2',
            'reglement_interieur_1', 'reglement_interieur_2',
            'comite_hst_1', 'comite_hst_2',
            'visite_medicale_1', 'visite_medicale_2',
            'extincteurs_1', 'extincteurs_2',
            'epi_disponible_1', 'epi_disponible_2',
            'epi_effectif_1', 'epi_effectif_2',
            'toilettes_1', 'toilettes_2',
            'conges_1', 'conges_2',
            'dasmo_bs_1', 'dasmo_bs_2',
            'observations_divers',
        ]
        widgets = {
            **{f: forms.Select(choices=OUI_NON, attrs={'class': 'form-select form-select-sm'}) for f in [
                'declaration_css_1', 'declaration_css_2',
                'adhesion_css_1', 'adhesion_css_2',
                'adhesion_ipres_1', 'adhesion_ipres_2',
                'adhesion_ipm_1', 'adhesion_ipm_2',
                'cotisations_css_1', 'cotisations_css_2',
                'cotisations_ipres_1', 'cotisations_ipres_2',
                'cotisations_ipm_1', 'cotisations_ipm_2',
                'delegues_personnel_1', 'delegues_personnel_2',
                'reglement_interieur_1', 'reglement_interieur_2',
                'comite_hst_1', 'comite_hst_2',
                'visite_medicale_1', 'visite_medicale_2',
                'extincteurs_1', 'extincteurs_2',
                'epi_disponible_1', 'epi_disponible_2',
                'epi_effectif_1', 'epi_effectif_2',
                'toilettes_1', 'toilettes_2',
                'conges_1', 'conges_2',
                'dasmo_bs_1', 'dasmo_bs_2',
            ]},
            'observations_divers': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
        }


class Section6Form(forms.ModelForm):
    class Meta:
        model = FicheControle
        fields = [
            'observations_generales',
            'suite_observations_orales', 'suite_observations_ecrites',
            'suite_mise_en_demeure', 'suite_pv_infraction', 'suite_refere',
            'delai_reception', 'delai_un_mois', 'delai_autres', 'delai_autres_precision',
            'signature_equipe', 'signature_gerant',
            'statut',
        ]
        widgets = {
            'observations_generales': forms.Textarea(attrs={'class': 'form-control', 'rows': 6}),
            'suite_observations_orales': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'suite_observations_ecrites': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'suite_mise_en_demeure': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'suite_pv_infraction': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'suite_refere': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'delai_reception': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'delai_un_mois': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'delai_autres': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'delai_autres_precision': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Préciser...'}),
            'signature_equipe': forms.TextInput(attrs={'class': 'form-control', 'placeholder': "Nom de l'équipe de contrôle"}),
            'signature_gerant': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Nom du gérant/directeur'}),
            'statut': forms.Select(attrs={'class': 'form-select'}),
        }
        labels = {
            'suite_observations_orales': 'Observations orales',
            'suite_observations_ecrites': 'Observations écrites',
            'suite_mise_en_demeure': 'Mise en demeure',
            'suite_pv_infraction': "Procès-verbal d'infraction",
            'suite_refere': 'Référé',
            'delai_reception': 'Dès réception de la lettre d\'observation ou de la mise en demeure',
            'delai_un_mois': 'Dans un (01) mois',
            'delai_autres': 'Autres (à préciser)',
        }


class CreerUtilisateurForm(forms.Form):
    prenom = forms.CharField(max_length=150, label='Prénom', widget=forms.TextInput(attrs={'class': 'form-control'}))
    nom = forms.CharField(max_length=150, label='Nom', widget=forms.TextInput(attrs={'class': 'form-control'}))
    email = forms.EmailField(label='Email', widget=forms.EmailInput(attrs={'class': 'form-control'}))
    mot_de_passe = forms.CharField(label='Mot de passe', widget=forms.PasswordInput(attrs={'class': 'form-control'}))
    role = forms.ChoiceField(
        label='Rôle',
        choices=[('inspecteur', 'Inspecteur'), ('admin', 'Administrateur')],
        widget=forms.Select(attrs={'class': 'form-select'})
    )
