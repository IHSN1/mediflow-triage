import type { TriageQA } from "@/lib/store";
import type { PatientForm } from "@/types";

/**
 * Compose le résumé clinique structuré en 4 points affiché sur les pages Résultat et Historique.
 * Seul le point 4 (recommandation) provient du LLM côté backend ; les points 1 à 3 sont
 * reconstruits ici à partir des données réellement saisies (formulaire patient, dialogue agent IA).
 */
export function buildClinicalSummary(
  patient: PatientForm,
  qa: TriageQA[] | undefined,
  recommandationIA: string,
): string {
  const vitals: string[] = [];
  if (patient.sbp != null && patient.dbp != null)
    vitals.push(`TA ${patient.sbp}/${patient.dbp} mmHg`);
  if (patient.heartrate != null) vitals.push(`FC ${patient.heartrate} bpm`);
  if (patient.resprate != null) vitals.push(`FR ${patient.resprate}/min`);
  if (patient.o2sat != null) vitals.push(`SpO2 ${patient.o2sat}% AA`);
  if (patient.temperature != null) vitals.push(`T° ${patient.temperature}°C`);
  const vitalsText = vitals.length > 0 ? vitals.join(", ") : "Non renseignés";

  const answersText =
    qa && qa.length > 0
      ? qa.map((item) => item.answer).join(" ")
      : "Aucune réponse recueillie lors de l'interrogatoire.";

  return [
    `1) Motif de consultation : ${patient.chief_complaint || "Non renseigné"}.`,
    `2) Signes vitaux : ${vitalsText}.`,
    `3) Antécédents rapportés : ${answersText}`,
    `4) Recommandation : ${recommandationIA}`,
  ].join("\n");
}
