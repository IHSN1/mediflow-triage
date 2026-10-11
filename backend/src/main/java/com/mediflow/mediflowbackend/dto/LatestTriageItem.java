package com.mediflow.mediflowbackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Une ligne de la liste "derniers triages" affichée sur le tableau de bord. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LatestTriageItem {

    @JsonProperty("session_id")
    private String sessionId;

    private String patient;

    @JsonProperty("niveau_final")
    private Integer niveauFinal;

    /** Heure au format "HH:mm". */
    private String time;
}
