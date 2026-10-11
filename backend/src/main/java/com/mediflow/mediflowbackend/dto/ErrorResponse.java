package com.mediflow.mediflowbackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Corps de réponse générique pour les erreurs métier (voir
 * GlobalExceptionHandler#handleResponseStatusException) : le frontend lit
 * "message" pour afficher un texte explicite à l'utilisateur.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ErrorResponse {
    private int status;
    private String message;
}
