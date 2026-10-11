package com.mediflow.mediflowbackend.service;

import com.mediflow.mediflowbackend.dto.DashboardStatsResponse;
import com.mediflow.mediflowbackend.dto.EsiDistributionItem;
import com.mediflow.mediflowbackend.dto.LatestTriageItem;
import com.mediflow.mediflowbackend.model.Role;
import com.mediflow.mediflowbackend.model.Triage;
import com.mediflow.mediflowbackend.model.User;
import com.mediflow.mediflowbackend.repository.TriageRepository;
import com.mediflow.mediflowbackend.repository.UserRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Calcule les statistiques affichées sur le tableau de bord (GET
 * /api/dashboard/stats), à partir des triages déjà enregistrés en base
 * (aucun appel à FastAPI n'est nécessaire ici).
 *
 * Un(e) infirmier(ère) ne doit voir que son activité personnelle (comme
 * /api/history) ; le médecin continue de voir les statistiques de tout le
 * service (comme /api/patients). Seule "Charge du service" reste toujours
 * calculée sur l'ensemble des triages du jour : c'est une mesure de
 * l'occupation globale des urgences, pas de l'activité d'une seule personne.
 */
@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    /**
     * Capacité quotidienne de référence du service, utilisée pour estimer la
     * "charge du service" en pourcentage. Aucune formule officielle n'a été
     * fournie : ajuster cette valeur (ou remplacer par un vrai paramètre
     * métier) selon la capacité réelle du service des urgences.
     */
    private static final int CAPACITE_QUOTIDIENNE = 50;

    private final TriageRepository triageRepository;
    private final UserRepository userRepository;

    public DashboardStatsResponse getStats() {
        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        LocalDateTime now = LocalDateTime.now();

        User currentUser = getCurrentUser();
        boolean scopeToUser = currentUser.getRole() == Role.INFIRMIER;

        long globalTriagesToday = triageRepository.countByCreatedAtBetween(startOfToday, now);
        long triagesToday = scopeToUser
                ? triageRepository.countByCreatedByAndCreatedAtBetween(currentUser, startOfToday, now)
                : globalTriagesToday;
        long criticalCount = scopeToUser
                ? triageRepository.countByCreatedByAndNiveauIaInAndCreatedAtBetween(
                        currentUser, List.of(1, 2), startOfToday, now)
                : triageRepository.countByNiveauIaInAndCreatedAtBetween(List.of(1, 2), startOfToday, now);

        List<EsiDistributionItem> esiDistribution = IntStream.rangeClosed(1, 5)
                .mapToObj(level -> new EsiDistributionItem(
                        level,
                        scopeToUser
                                ? triageRepository.countByCreatedByAndNiveauIaAndCreatedAtBetween(
                                        currentUser, level, startOfToday, now)
                                : triageRepository.countByNiveauIaAndCreatedAtBetween(level, startOfToday, now)))
                .collect(Collectors.toList());

        List<LatestTriageItem> latest = (scopeToUser
                        ? triageRepository.findTop5ByCreatedByOrderByCreatedAtDesc(currentUser)
                        : triageRepository.findTop5ByOrderByCreatedAtDesc())
                .stream()
                .map(this::toLatestItem)
                .collect(Collectors.toList());

        return DashboardStatsResponse.builder()
                .triagesToday(triagesToday)
                // Non mesurable sans horodatage de fin de triage distinct de createdAt ;
                // à calculer réellement si un tel champ est ajouté au modèle Triage.
                .avgTriageMinutes(0.0)
                .criticalCount(criticalCount)
                // Toujours calculée sur l'activité globale du service, même pour un infirmier
                // scope à ses propres triages : c'est l'occupation des urgences, pas la sienne.
                .serviceLoad(computeServiceLoad(globalTriagesToday))
                .esiDistribution(esiDistribution)
                .latest(latest)
                .build();
    }

    /** Récupère l'utilisateur actuellement authentifié via le JWT (voir JwtAuthenticationFilter). */
    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilisateur introuvable"));
    }

    private LatestTriageItem toLatestItem(Triage triage) {
        return new LatestTriageItem(
                triage.getSessionId(),
                triage.getPatientFullName(),
                triage.getNiveauIa(),
                triage.getCreatedAt().format(TIME_FORMAT));
    }

    private int computeServiceLoad(long triagesToday) {
        int load = (int) Math.round((triagesToday * 100.0) / CAPACITE_QUOTIDIENNE);
        return Math.min(100, Math.max(0, load));
    }
}
