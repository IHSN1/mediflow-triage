package com.mediflow.mediflowbackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Réponse de POST /api/triage/respond : { question, finished }. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RespondTriageResponse {
    private String question;
    private boolean finished;
}
