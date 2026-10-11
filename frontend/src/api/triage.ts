import type {
  EsiLevel,
  PatientForm,
  RespondTriageResponse,
  StartTriageResponse,
  TriageResult,
} from "@/types";
import { api } from "./client";

export const TRIAGE_STEPS = [
  "Précision des symptômes",
  "Localisation & durée",
  "Facteurs déclenchants",
  "Antécédents médicaux",
  "Informations complémentaires",
];

export function startTriage(patient: PatientForm): Promise<StartTriageResponse> {
  return api.post<StartTriageResponse>("/api/triage/start", patient);
}

export function respondToTriage(
  sessionId: string,
  answer: string,
  _askedCount: number,
): Promise<RespondTriageResponse> {
  return api.post<RespondTriageResponse>("/api/triage/respond", { session_id: sessionId, answer });
}

export function fetchTriageResult(sessionId: string): Promise<TriageResult> {
  return api.get<TriageResult>(`/api/triage/result/${sessionId}`);
}

/**
 * Décision finale de l'infirmière sur le niveau ESI (confirmation ou correction de la suggestion
 * IA). resumeClinique est le résumé complet en 4 points affiché à l'écran (voir
 * buildClinicalSummary) : il remplace en base la recommandation brute posée par
 * fetchTriageResult, pour que l'historique réaffiche exactement ce qui a été validé.
 */
export function validateTriage(
  triageId: number,
  niveauInfirmiere: EsiLevel,
  motifModification: string | null,
  resumeClinique: string,
): Promise<void> {
  return api.put<void>(`/api/triage/${triageId}/validate`, {
    niveau_infirmiere: niveauInfirmiere,
    motif_modification: motifModification,
    resume_clinique: resumeClinique,
  });
}
