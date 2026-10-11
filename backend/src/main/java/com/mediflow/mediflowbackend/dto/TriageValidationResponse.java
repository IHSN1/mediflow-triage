package com.mediflow.mediflowbackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Réponse de PUT /api/triage/{id}/validate : le triage après validation infirmière. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TriageValidationResponse {

    private Long id;

    @JsonProperty("session_id")
    private String sessionId;

    @JsonProperty("niveau_ia")
    private Integer niveauIa;

    @JsonProperty("niveau_infirmiere")
    private Integer niveauInfirmiere;

    @JsonProperty("motif_modification")
    private String motifModification;
}
