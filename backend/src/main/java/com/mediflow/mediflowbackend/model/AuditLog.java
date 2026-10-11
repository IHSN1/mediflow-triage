package com.mediflow.mediflowbackend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Entité JPA représentant une ligne de journal d'audit. Mappée vers la
 * table "audit_logs". Répond à l'exigence de traçabilité ISO 27001 (sécurité
 * de l'information) : toute connexion, déconnexion, création/modification de
 * triage et gestion de compte doit rester vérifiable a posteriori.
 *
 * userId/userName sont volontairement dupliqués (pas de relation @ManyToOne
 * vers User) : la ligne d'audit doit rester lisible et intègre même après la
 * suppression du compte concerné (cas USER_DELETED), sans qu'une contrainte
 * de clé étrangère n'empêche cette suppression.
 */
@Entity
@Table(name = "audit_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Identifiant de l'utilisateur ayant réalisé l'action (référence "logique" vers users, non contrainte en base). */
    @Column(name = "user_id")
    private Long userId;

    /** Nom complet de l'utilisateur au moment de l'action, conservé même si le compte est supprimé ensuite. */
    @Column(nullable = false)
    private String userName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuditAction action;

    @Column(columnDefinition = "TEXT")
    private String details;

    private String ipAddress;

    @Column(nullable = false, updatable = false)
    private LocalDateTime timestamp;

    @jakarta.persistence.PrePersist
    public void prePersist() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }
}
