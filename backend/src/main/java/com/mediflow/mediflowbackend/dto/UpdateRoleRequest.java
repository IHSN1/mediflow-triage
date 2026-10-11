package com.mediflow.mediflowbackend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Corps de la requête PUT /api/admin/users/{id}/role. */
@Data
public class UpdateRoleRequest {

    /** "infirmier", "medecin" ou "admin". */
    @NotBlank(message = "Le rôle est obligatoire")
    private String role;
}
