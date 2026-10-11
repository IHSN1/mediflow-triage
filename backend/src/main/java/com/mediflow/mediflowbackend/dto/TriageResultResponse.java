package com.mediflow.mediflowbackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Réponse de GET /api/triage/result/{sessionId}.
 * Correspond exactement à l'interface TriageResult du frontend.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TriageResultResponse {

    /** Identifiant technique du triage en base, requis par PUT /api/triage/{id}/validate. */
    private Long id;

    @JsonProperty("niveau_xgboost_brut")
    private Integer niveauXgboostBrut;

    @JsonProperty("niveau_final")
    private Integer niveauFinal;

    /** Niveau ESI suggéré par l'IA — égal à niveauFinal tant que l'infirmière n'a pas statué. */
    @JsonProperty("niveau_ia")
    private Integer niveauIa;

    /** Décision finale de l'infirmière — null tant que le triage n'a pas été validé. */
    @JsonProperty("niveau_infirmiere")
    private Integer niveauInfirmiere;

    @JsonProperty("motif_modification")
    private String motifModification;

    /** "Point A (sauvetage immédiat)", "Point D (signes vitaux anormaux)" ou null. */
    @JsonProperty("regle_declenchee")
    private String regleDeclenchee;

    @JsonProperty("details_regle")
    private List<String> detailsRegle;

    @JsonProperty("resume_clinique")
    private String resumeClinique;

    /** Score NEWS2 total calculé par la couche de sécurité (voir safety_rules.py), pour la section "Explicabilité". */
    @JsonProperty("news2_score")
    private Integer news2Score;
}
