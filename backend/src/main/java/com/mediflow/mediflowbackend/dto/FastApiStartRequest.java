package com.mediflow.mediflowbackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Corps envoyé par Spring Boot à FastAPI pour POST /triage/start.
 * Reprend le contrat "Formulaire nouveau patient" documenté dans le README
 * du frontend (Frontend → Spring Boot → FastAPI) : uniquement le motif et
 * les signes vitaux, sans l'identité du patient (FastAPI n'en a pas besoin
 * pour prédire le niveau ESI).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FastApiStartRequest {

    @JsonProperty("chief_complaint")
    private String chiefComplaint;

    private Double temperature;
    private Integer heartrate;
    private Integer resprate;
    private Integer o2sat;
    private Integer sbp;
    private Integer dbp;
    private Integer pain;
}
