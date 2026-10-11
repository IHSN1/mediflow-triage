package com.mediflow.mediflowbackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Réponse de POST /api/triage/start : { session_id, question }. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StartTriageResponse {

    @JsonProperty("session_id")
    private String sessionId;

    private String question;
}
