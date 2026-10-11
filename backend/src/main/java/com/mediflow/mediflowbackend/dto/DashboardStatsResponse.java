package com.mediflow.mediflowbackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Réponse de GET /api/dashboard/stats.
 *
 * NOTE : les noms de champs JSON suivent exactement le contrat déjà utilisé
 * par le frontend (interface DashboardStats dans
 * frontend/src/types/index.ts et frontend/src/api/dashboard.ts) :
 * triages_today, avg_triage_minutes, critical_count, service_load,
 * esi_distribution, latest — plutôt que triages_effectues/temps_moyen/...
 * afin que le frontend existant fonctionne sans aucune modification une
 * fois les appels mock remplacés par de vrais fetch().
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardStatsResponse {

    @JsonProperty("triages_today")
    private long triagesToday;

    @JsonProperty("avg_triage_minutes")
    private double avgTriageMinutes;

    @JsonProperty("critical_count")
    private long criticalCount;

    /** Charge du service en pourcentage (0 à 100). */
    @JsonProperty("service_load")
    private int serviceLoad;

    @JsonProperty("esi_distribution")
    private List<EsiDistributionItem> esiDistribution;

    private List<LatestTriageItem> latest;
}
