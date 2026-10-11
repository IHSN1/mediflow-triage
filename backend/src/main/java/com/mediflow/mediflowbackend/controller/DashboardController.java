package com.mediflow.mediflowbackend.controller;

import com.mediflow.mediflowbackend.dto.DashboardStatsResponse;
import com.mediflow.mediflowbackend.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Statistiques du tableau de bord. Accessible aux infirmiers et aux
 * médecins (voir SecurityConfig), pas aux administrateurs.
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    public DashboardStatsResponse stats() {
        return dashboardService.getStats();
    }
}
