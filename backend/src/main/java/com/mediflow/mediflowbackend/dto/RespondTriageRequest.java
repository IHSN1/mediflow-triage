package com.mediflow.mediflowbackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Corps de la requête POST /api/triage/respond : { session_id, answer }. */
@Data
public class RespondTriageRequest {

    @NotBlank(message = "session_id est obligatoire")
    @JsonProperty("session_id")
    private String sessionId;

    @NotBlank(message = "La réponse ne peut pas être vide")
    private String answer;
}
