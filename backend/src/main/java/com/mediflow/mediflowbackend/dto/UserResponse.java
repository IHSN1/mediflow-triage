package com.mediflow.mediflowbackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Une ligne de GET /api/admin/users.
 * Correspond à l'interface AppUser du frontend : { id, fullName, email, role, active }.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {
    private Long id;
    private String fullName;
    private String email;
    /** "infirmier", "medecin" ou "admin". */
    private String role;
    private Boolean active;
}
