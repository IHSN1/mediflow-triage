package com.mediflow.mediflowbackend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** Corps de la requête PUT /api/admin/users/{id}/status. */
@Data
public class UpdateStatusRequest {

    @NotNull(message = "Le statut actif/inactif est obligatoire")
    private Boolean active;
}
