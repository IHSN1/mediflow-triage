package com.mediflow.mediflowbackend.model;

/**
 * Types d'événements tracés dans la table audit_logs, conformément à
 * ISO 27001 (traçabilité des accès et des actions sur un système
 * d'information de santé). Stocké en base comme du texte
 * (@Enumerated(EnumType.STRING) sur AuditLog.action).
 */
public enum AuditAction {
    LOGIN,
    LOGOUT,
    TRIAGE_CREATED,
    TRIAGE_MODIFIED,
    USER_CREATED,
    USER_DISABLED,
    USER_DELETED
}
