/**
 * Types pour le système offline
 */

export interface FicheControle {
  id?: string;
  local_id?: string;
  inspecteur: string;
  entreprise: string;
  date_controle: string;
  lieu: string;
  statut: 'brouillon' | 'soumis';
  
  // Section 1 - Identification
  adresse?: string;
  telephone?: string;
  email_entreprise?: string;
  date_ouverture?: string;
  forme_juridique?: string;
  activite_principale?: string;
  
  chef_nom?: string;
  chef_cellulaire?: string;
  chef_email?: string;
  
  representant_nom?: string;
  representant_qualite?: string;
  representant_cellulaire?: string;
  representant_email?: string;
  
  // Section 2 - Dispositions administratives
  doe?: string;
  registre_paie?: string;
  
  cadres_hommes?: number;
  cadres_femmes?: number;
  ouvriers_hommes?: number;
  ouvriers_femmes?: number;
  
  // Section 3 - Contrats
  cdi?: number;
  cdd?: number;
  cs?: number;
  c_app?: number;
  autres_contrats?: number;
  
  // Rémunération
  remuneration_au_temps_1?: boolean;
  remuneration_au_temps_2?: boolean;
  remuneration_a_la_piece_1?: boolean;
  remuneration_a_la_piece_2?: boolean;
  remuneration_les_deux_1?: boolean;
  remuneration_les_deux_2?: boolean;
  
  salaires_conformes_1?: string;
  salaires_conformes_2?: string;
  bulletins_paie_1?: string;
  bulletins_paie_2?: string;
  heures_sup_1?: string;
  heures_sup_2?: string;
  prime_anciennete_1?: string;
  prime_anciennete_2?: string;
  jours_feries_1?: string;
  jours_feries_2?: string;
  indemnites_transport_1?: string;
  indemnites_transport_2?: string;
  
  // Section 4 - Temps de travail
  horaires_affiches_1?: string;
  horaires_affiches_2?: string;
  amenagement_8h_5j_1?: string;
  amenagement_8h_5j_2?: string;
  amenagement_6h40_6j_1?: string;
  amenagement_6h40_6j_2?: string;
  pause_quotidienne_1?: string;
  pause_quotidienne_2?: string;
  repos_hebdomadaire_1?: string;
  repos_hebdomadaire_2?: string;
  
  // Section 5 - Sécurité sociale
  declaration_css_1?: string;
  declaration_css_2?: string;
  adhesion_css_1?: string;
  adhesion_css_2?: string;
  adhesion_ipres_1?: string;
  adhesion_ipres_2?: string;
  adhesion_ipm_1?: string;
  adhesion_ipm_2?: string;
  cotisations_css_1?: string;
  cotisations_css_2?: string;
  cotisations_ipres_1?: string;
  cotisations_ipres_2?: string;
  cotisations_ipm_1?: string;
  cotisations_ipm_2?: string;
  
  // Metadata
  created_at?: Date;
  updated_at?: Date;
  synced_at?: Date;
  [key: string]: any;
}

export interface SyncQueue {
  id: number;
  action: 'save' | 'delete' | 'update';
  data: any;
  status: 'pending' | 'synced' | 'failed';
  created_at: Date;
  updated_at?: Date;
  attempts: number;
  error?: string;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSync: Date | null;
  pendingCount: number;
  failedCount: number;
  error: string | null;
}

export interface OfflineEvent {
  type: 'initialized' | 'offline' | 'online' | 'sync-start' | 'sync-complete' | 'sync-error' | 'fiche-saved' | 'fiche-deleted' | 'cache-updated' | 'error';
  data: any;
  timestamp: Date;
}
