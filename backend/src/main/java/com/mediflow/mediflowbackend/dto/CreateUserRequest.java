package com.mediflow.mediflowbackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Corps de la requête POST /api/admin/users.
 * Correspond à l'interface NewUserPayload du frontend : prénom et nom sont
 * envoyés séparément puis concaténés par AdminUserService en un seul
 * champ fullName (tel que stocké dans l'entité User).
 */
@Data
public class CreateUserRequest {

    @NotBlank(message = "Le prénom est obligatoire")
    @JsonProperty("first_name")
    private String firstName;

    @NotBlank(message = "Le nom est obligatoire")
    @JsonProperty("last_name")
    private String lastName;

    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "Email invalide")
    private String email;

    @NotBlank(message = "Le mot de passe temporaire est obligatoire")
    private String password;

    /** "infirmier", "medecin" ou "admin". */
    @NotBlank(message = "Le rôle est obligatoire")
    private String role;
}
