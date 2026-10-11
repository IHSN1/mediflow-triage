package com.mediflow.mediflowbackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Réponse de POST /api/auth/login.
 * Correspond exactement au type AuthUser du frontend (src/types/index.ts) :
 * { token, role, userId, fullName }.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginResponse {
    private String token;
    /** "infirmier", "medecin" ou "admin". */
    private String role;
    private Long userId;
    private String fullName;
}

