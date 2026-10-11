package com.mediflow.mediflowbackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Corps de la requête PUT /api/triage/{id}/validate : la décision finale de
 * l'infirmière sur le niveau ESI, avec justification si elle diffère de la
 * suggestion de l'IA (niveau_ia).
 */
@Data
public class ValidateTriageRequest {

    @NotNull(message = "Le niveau ESI retenu par l'infirmière est obligatoire")
    @Min(value = 1, message = "Le niveau ESI doit être compris entre 1 et 5")
    @Max(value = 5, message = "Le niveau ESI doit être compris entre 1 et 5")
    @JsonProperty("niveau_infirmiere")
    private Integer niveauInfirmiere;

    @JsonProperty("motif_modification")
    private String motifModification;

    /**
     * Résumé clinique complet en 4 points, tel que composé et affiché côté
     * frontend au moment de la validation (voir buildClinicalSummary dans
     * frontend/src/lib/clinicalSummary.ts) : motif, signes vitaux,
     * antécédents et recommandation. Remplace en base la valeur posée par
     * /api/triage/result (qui ne contenait que la recommandation brute de
     * l'IA), pour que l'historique réaffiche exactement ce que l'infirmière
     * a validé, et non une recommandation isolée.
     */
    @JsonProperty("resume_clinique")
    private String resumeClinique;
}
