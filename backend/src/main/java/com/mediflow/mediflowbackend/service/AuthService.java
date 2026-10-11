package com.mediflow.mediflowbackend.service;



import com.mediflow.mediflowbackend.dto.LoginRequest;
import com.mediflow.mediflowbackend.dto.LoginResponse;
import com.mediflow.mediflowbackend.model.AuditAction;
import com.mediflow.mediflowbackend.model.Role;
import com.mediflow.mediflowbackend.model.User;
import com.mediflow.mediflowbackend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
/**
 * Logique métier de connexion : vérifie l'email, le mot de passe (BCrypt),
 * le statut actif du compte et le rôle sélectionné sur l'écran de
 * connexion, puis délivre un JWT.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String INVALID_CREDENTIALS = "Email ou mot de passe incorrect";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditLogService auditLogService;

    public LoginResponse login(LoginRequest request, String ipAddress) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, INVALID_CREDENTIALS));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, INVALID_CREDENTIALS);
        }

        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ce compte a été désactivé");
        }

        String token = jwtService.generateToken(user.getEmail(), user.getRole(), user.getId());

        // Traçabilité ISO 27001 : chaque connexion réussie est journalisée.
        auditLogService.log(user, AuditAction.LOGIN, "Connexion réussie (" + user.getRole().toLower() + ")", ipAddress);

        return LoginResponse.builder()
                .token(token)
                .role(user.getRole().toLower())
                .userId(user.getId())
                .fullName(user.getFullName())
                .build();
    }

    /**
     * Le JWT est "stateless" (aucune session côté serveur à invalider) :
     * se déconnecter consiste donc uniquement à journaliser l'événement.
     * Le frontend est responsable de supprimer le token qu'il détient.
     */
    public void logout(String ipAddress) {
        User user = getCurrentUser();
        auditLogService.log(user, AuditAction.LOGOUT, "Déconnexion (" + user.getRole().toLower() + ")", ipAddress);
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilisateur introuvable"));
    }


}

