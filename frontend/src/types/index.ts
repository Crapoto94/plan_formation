export interface User {
  username: string;
  role: 'agent' | 'admin';
}

export interface Formation {
  id: number;
  libelle: string;
  description: string | null;
  active: boolean;
}

export interface Axe {
  id: number;
  libelle: string;
  description: string | null;
  active: boolean;
}

export interface Domaine {
  id: number;
  libelle: string;
  active: boolean;
}

export interface SoumissionDetail {
  id?: number;
  formation_id: number | null;
  domaine_id: number | null;
  axe_id: number | null;
  motivation: string;
  nb_agents: number;
  formation_libelle?: string;
  domaine_libelle?: string;
  axe_libelle?: string;
  axe_description?: string;
  type?: 'reglementaire' | 'autre';
  intitule?: string;
  objectif?: string;
  date_souhaitee?: string;
  organisme?: string;
  organisme_nom?: string;
  justification?: string;
  estimation_budget?: string;
  statut?: 'en_attente' | 'valide' | 'refuse';
  motif_refus?: string;
}

export interface Soumission {
  id: number;
  agent_name: string;
  agent_email: string | null;
  service: string;
  direction: string;
  statut: 'en_attente' | 'valide' | 'refuse';
  commentaire: string | null;
  motif_refus: string | null;
  details: SoumissionDetail[];
  created_at: string;
}
