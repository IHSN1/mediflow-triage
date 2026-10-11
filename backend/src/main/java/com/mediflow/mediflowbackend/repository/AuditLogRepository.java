package com.mediflow.mediflowbackend.repository;

import com.mediflow.mediflowbackend.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Accès base de données pour l'entité AuditLog.
 * Spring Data JPA génère automatiquement l'implémentation.
 */
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
}
