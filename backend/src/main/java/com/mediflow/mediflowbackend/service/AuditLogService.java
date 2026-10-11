package com.mediflow.mediflowbackend.service;

import com.mediflow.mediflowbackend.model.AuditAction;
import com.mediflow.mediflowbackend.model.AuditLog;
import com.mediflow.mediflowbackend.model.User;
import com.mediflow.mediflowbackend.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Enregistre les événements tracés dans audit_logs (connexions, actions sur
 * les triages, gestion des comptes). Répond à l'exigence de traçabilité
 * ISO 27001 : chaque ligne conserve qui a fait quoi, quand et depuis quelle
 * adresse IP.
 */
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    /** Enregistre un événement d'audit pour l'utilisateur ayant réalisé l'action. */
    public void log(User actor, AuditAction action, String details, String ipAddress) {
        AuditLog entry = AuditLog.builder()
                .userId(actor.getId())
                .userName(actor.getFullName())
                .action(action)
                .details(details)
                .ipAddress(ipAddress)
                .build();
        auditLogRepository.save(entry);
    }

    /**
     * Résout l'adresse IP réelle du client, y compris derrière un proxy
     * (en-tête "X-Forwarded-For", posé par la plupart des reverse proxy /
     * load balancers) ; à défaut, retombe sur l'adresse de la connexion TCP.
     */
    public static String resolveIpAddress(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
