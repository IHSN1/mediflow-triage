package com.mediflow.mediflowbackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Une ligne de GET /api/history ou GET /api/patients.
 * Correspond à l'interface HistoryEntry du frontend, avec en plus "id"
 * (identifiant technique en base) utilisé pour DELETE /api/history/{id} et
 * DELETE /api/patients/{id}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HistoryEntryResponse {

    /** Identifiant technique (clé primaire) du triage. */
    private Long id;

    @JsonProperty("session_id")
    private String sessionId;

    /** Date/heure du triage, format "yyyy-MM-dd HH:mm". */
    private String date;

    private String patient;

    @JsonProperty("chief_complaint")
    private String chiefComplaint;

    @JsonProperty("niveau_final")
    private Integer niveauFinal;

    @JsonProperty("resume_clinique")
    private String resumeClinique;

    @JsonProperty("niveau_xgboost_brut")
    private Integer niveauXgboostBrut;

    /** "Point A (sauvetage immédiat)", "Point D (signes vitaux anormaux)" ou null. */
    @JsonProperty("regle_declenchee")
    private String regleDeclenchee;

    @JsonProperty("details_regle")
    private List<String> detailsRegle;

    @JsonProperty("niveau_ia")
    private Integer niveauIa;

    @JsonProperty("niveau_infirmiere")
    private Integer niveauInfirmiere;

    @JsonProperty("motif_modification")
    private String motifModification;

    /** Score NEWS2 total calculé par la couche de sécurité (voir safety_rules.py), affiché dans "Explicabilité". */
    @JsonProperty("news2_score")
    private Integer news2Score;
}
