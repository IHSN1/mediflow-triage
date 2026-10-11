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
 * Entité JPA représentant un compte utilisateur (infirmier, médecin ou
 * administrateur). Mappée vers la table "users".
 */
@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String email;

    /** Mot de passe hashé avec BCrypt (jamais stocké en clair). */
    @Column(nullable = false)
    private String password;

    /** Stocké en base comme du texte ("INFIRMIER", "MEDECIN", "ADMIN"). */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true; // valeur par défaut = true
                                   //quand on crée un utilisateur
                                   //il est actif par défaut

    @Column(nullable = false, updatable = false) // La date de création ne peut pas être modifiée après la création
    private LocalDateTime createdAt;

    /** Renseigne automatiquement la date de création avant la première sauvegarde. */
    @jakarta.persistence.PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}

