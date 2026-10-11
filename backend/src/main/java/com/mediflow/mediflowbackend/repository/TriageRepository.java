package com.mediflow.mediflowbackend.repository;

import com.mediflow.mediflowbackend.model.Triage;
import com.mediflow.mediflowbackend.model.User;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Accès base de données pour l'entité Triage.
 * Chaque méthode "find.../count..." est traduite par Spring Data JPA en
 * requête SQL à partir de son nom, sans code d'implémentation à écrire.
 */
public interface TriageRepository extends JpaRepository<Triage, Long> {

    /** Retrouve le triage créé lors de /api/triage/start pour le compléter à /api/triage/result. */
    Optional<Triage> findBySessionId(String sessionId);

    /** GET /api/history (scope infirmier : uniquement ses propres triages). */
    List<Triage> findByCreatedByOrderByCreatedAtDesc(User createdBy);

    /** GET /api/patients (scope médecin : tous les triages du service). */
    List<Triage> findAllByOrderByCreatedAtDesc();

    /** Bloc "derniers triages" du tableau de bord (médecin : tout le service). */
    List<Triage> findTop5ByOrderByCreatedAtDesc();

    /** Bloc "derniers triages" du tableau de bord (infirmier : uniquement ses triages). */
    List<Triage> findTop5ByCreatedByOrderByCreatedAtDesc(User createdBy);

    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    long countByCreatedByAndCreatedAtBetween(User createdBy, LocalDateTime start, LocalDateTime end);

    long countByNiveauIaInAndCreatedAtBetween(List<Integer> niveaux, LocalDateTime start, LocalDateTime end);

    long countByCreatedByAndNiveauIaInAndCreatedAtBetween(
            User createdBy, List<Integer> niveaux, LocalDateTime start, LocalDateTime end);

    long countByNiveauIaAndCreatedAtBetween(Integer niveauIa, LocalDateTime start, LocalDateTime end);

    long countByCreatedByAndNiveauIaAndCreatedAtBetween(
            User createdBy, Integer niveauIa, LocalDateTime start, LocalDateTime end);
}
