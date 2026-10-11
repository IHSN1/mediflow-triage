package com.mediflow.mediflowbackend.model;

/**
 * Les 3 rôles utilisateurs de MediFlow AI.
 * Stocké en base sous forme de texte (ex: "INFIRMIER") grâce à
 * @Enumerated(EnumType.STRING) sur User.role, mais le frontend envoie et
 * attend ces valeurs en minuscules (ex: "infirmier") : toLower()/fromLower()
 * font la conversion aux frontières de l'API (DTO), jamais en base.
 */
public enum Role {
    INFIRMIER,
    MEDECIN,
    ADMIN;

    /** Convertit le rôle vers le format attendu par le frontend (minuscules). */
    public String toLower() {
        return name().toLowerCase();
    }

    /** Parse une valeur reçue du frontend ("infirmier", "medecin", "admin"), insensible à la casse. */
    public static Role fromLower(String value) {
        if (value == null) {
            throw new IllegalArgumentException("Rôle manquant");
        }
        return Role.valueOf(value.trim().toUpperCase());
    }
}
