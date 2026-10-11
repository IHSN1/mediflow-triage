package com.mediflow.mediflowbackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Corps de réponse renvoyé quand le service IA FastAPI est en panne ou ne
 * répond pas dans le délai imparti (voir GlobalExceptionHandler). Le
 * frontend peut se fier au champ "error" pour proposer le triage manuel.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceIaIndisponibleResponse {
    private String error;
    private String message;
}
