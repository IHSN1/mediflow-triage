package com.mediflow.mediflowbackend.service;

import com.mediflow.mediflowbackend.dto.CreateUserRequest;
import com.mediflow.mediflowbackend.dto.UserResponse;
import com.mediflow.mediflowbackend.model.AuditAction;
import com.mediflow.mediflowbackend.model.Role;
import com.mediflow.mediflowbackend.model.User;
import com.mediflow.mediflowbackend.repository.UserRepository;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Gestion des comptes utilisateurs, réservée à l'administrateur
 * (page "Administration" du frontend) : création, changement de rôle,
 * activation/désactivation, suppression. Aucune donnée patient n'est
 * manipulée ici.
 */
@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    public List<UserResponse> listUsers() {
        return userRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public UserResponse createUser(CreateUserRequest request, String ipAddress) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Un compte existe déjà avec cet email");
        }

        String fullName = (request.getFirstName() + " " + request.getLastName()).trim();

        User user = User.builder()
                .fullName(fullName)
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(parseRole(request.getRole()))
                .active(true)
                .build();

        User saved = userRepository.save(user);

        auditLogService.log(getCurrentAdmin(), AuditAction.USER_CREATED,
                "Compte créé : " + saved.getFullName() + " (" + saved.getEmail() + ", " + saved.getRole().toLower() + ")",
                ipAddress);

        return toResponse(saved);
    }

    public void updateRole(Long id, String role) {
        User user = getUserOrThrow(id);
        user.setRole(parseRole(role));
        userRepository.save(user);
    }

    public void updateStatus(Long id, boolean active, String ipAddress) {
        User user = getUserOrThrow(id);
        user.setActive(active);
        userRepository.save(user);

        // Seule la désactivation fait partie des événements tracés (pas de
        // réactivation dans la liste ISO 27001 des actions à journaliser).
        if (!active) {
            auditLogService.log(getCurrentAdmin(), AuditAction.USER_DISABLED,
                    "Compte désactivé : " + user.getFullName() + " (" + user.getEmail() + ")", ipAddress);
        }
    }

    public void deleteUser(Long id, String ipAddress) {
        User user = getUserOrThrow(id);
        String description = user.getFullName() + " (" + user.getEmail() + ", " + user.getRole().toLower() + ")";

        userRepository.deleteById(id);

        auditLogService.log(getCurrentAdmin(), AuditAction.USER_DELETED,
                "Compte supprimé : " + description, ipAddress);
    }

    private User getUserOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable : " + id));
    }

    private Role parseRole(String rawRole) {
        try {
            return Role.fromLower(rawRole);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rôle inconnu : " + rawRole);
        }
    }

    /** Administrateur actuellement authentifié via le JWT — l'acteur consigné dans audit_logs. */
    private User getCurrentAdmin() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilisateur introuvable"));
    }

    private UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole().toLower())
                .active(user.getActive())
                .build();
    }
}
