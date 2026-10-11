package com.mediflow.mediflowbackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Un point du graphique "répartition des patients par niveau ESI" du tableau de bord. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EsiDistributionItem {
    /** Niveau ESI de 1 à 5. */
    private int level;
    private long count;
}
