package com.mediflow.mediflowbackend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Corps de la requête POST /api/auth/login.
 * Le frontend envoie email + mot de passe.
 * Le rôle est récupéré automatiquement depuis la base de données.
 */
@Data
public class LoginRequest {

    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "Email invalide")
    private String email;

    @NotBlank(message = "Le mot de passe est obligatoire")
    private String password;
}