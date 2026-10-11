export type Role = "infirmier" | "medecin" | "admin";

export interface AuthUser {
  token: string;
  role: Role;
  userId: string;
  fullName: string;
}

export interface PatientForm {
  first_name: string;
  last_name: string;
  age?: number;
  sex?: "M" | "F";
  chief_complaint: string;
  temperature?: number;
  heartrate?: number;
  resprate?: number;
  o2sat?: number;
  sbp?: number;
  dbp?: number;
  pain?: number;
}

export interface StartTriageResponse {
  session_id: string;
  question: string;
}

export interface RespondTriageResponse {
  question: string;
  finished: boolean;
}

export type EsiLevel = 1 | 2 | 3 | 4 | 5;

export interface TriageResult {
  /** Identifiant technique du triage en base, requis pour PUT /api/triage/{id}/validate. */
  id: number;
  niveau_xgboost_brut: EsiLevel;
  niveau_final: EsiLevel;
  /** Niveau ESI suggéré par l'IA — égal à niveau_final tant que l'infirmière n'a pas statué. */
  niveau_ia: EsiLevel;
  /** Décision finale de l'infirmière — null tant que le triage n'a pas été validé. */
  niveau_infirmiere: EsiLevel | null;
  motif_modification: string | null;
  regle_declenchee: string | null;
  details_regle: string[];
  /** Score NEWS2 total calculé par la couche de sécurité — null si aucune règle ne s'est déclenchée. */
  news2_score: number | null;
  /** Recommandation clinique générée par le LLM (Mistral-7B) — les points 1 à 3 du résumé
   * affiché sont composés côté frontend à partir du formulaire patient et du dialogue agent IA. */
  resume_clinique: string;
}

export interface HistoryEntry {
  id: number;
  session_id: string;
  date: string;
  patient: string;
  chief_complaint: string;
  niveau_final: EsiLevel;
  resume_clinique: string;
  niveau_xgboost_brut: EsiLevel;
  regle_declenchee: string | null;
  details_regle: string[];
  niveau_ia: EsiLevel;
  niveau_infirmiere: EsiLevel;
  motif_modification: string | null;
  news2_score: number | null;
}

export interface TriageValidationPayload {
  session_id: string;
  patient: string;
  chief_complaint: string;
  resume_clinique: string;
  niveau_xgboost_brut: EsiLevel;
  regle_declenchee: string | null;
  details_regle: string[];
  niveau_ia: EsiLevel;
  niveau_infirmiere: EsiLevel;
  motif_modification: string | null;
}

export interface HistoryFilters {
  search?: string;
  esi?: EsiLevel | "all";
  scope?: "mine" | "service";
}

export interface DashboardStats {
  triages_today: number;
  avg_triage_minutes: number;
  critical_count: number;
  service_load: number;
  esi_distribution: { level: EsiLevel; count: number }[];
  latest: { session_id: string; patient: string; niveau_final: EsiLevel; time: string }[];
}

export interface AppUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  active: boolean;
}

export interface NewUserPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: Role;
}
