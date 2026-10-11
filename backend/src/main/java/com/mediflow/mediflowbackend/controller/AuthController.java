package com.mediflow.mediflowbackend.controller;

import com.mediflow.mediflowbackend.dto.LoginRequest;
import com.mediflow.mediflowbackend.dto.LoginResponse;
import com.mediflow.mediflowbackend.service.AuditLogService;
import com.mediflow.mediflowbackend.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Authentification. /login est accessible sans token JWT ; /logout exige
 * un JWT valide (voir SecurityConfig) car il faut savoir qui se déconnecte
 * pour journaliser l'événement dans audit_logs.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /** Écran de connexion : reçoit email/mot de passe/rôle choisi, retourne un JWT. */
    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        return authService.login(request, AuditLogService.resolveIpAddress(httpRequest));
    }

    /** Déconnexion : aucune session serveur à invalider (JWT stateless), journalise seulement l'événement. */
    @PostMapping("/logout")
    public void logout(HttpServletRequest httpRequest) {
        authService.logout(AuditLogService.resolveIpAddress(httpRequest));
    }
}

