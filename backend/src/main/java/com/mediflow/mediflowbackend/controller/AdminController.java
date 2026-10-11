package com.mediflow.mediflowbackend.controller;

import com.mediflow.mediflowbackend.dto.CreateUserRequest;
import com.mediflow.mediflowbackend.dto.UpdateRoleRequest;
import com.mediflow.mediflowbackend.dto.UpdateStatusRequest;
import com.mediflow.mediflowbackend.dto.UserResponse;
import com.mediflow.mediflowbackend.service.AdminUserService;
import com.mediflow.mediflowbackend.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Gestion des comptes utilisateurs (page "Administration" du frontend).
 * Réservé au rôle ADMIN (voir SecurityConfig).
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminUserService adminUserService;

    @GetMapping("/users")
    public List<UserResponse> listUsers() {
        return adminUserService.listUsers();
    }

    @PostMapping("/users")
    public UserResponse createUser(@Valid @RequestBody CreateUserRequest request, HttpServletRequest httpRequest) {
        return adminUserService.createUser(request, AuditLogService.resolveIpAddress(httpRequest));
    }

    @PutMapping("/users/{id}/role")
    public void updateRole(@PathVariable Long id, @Valid @RequestBody UpdateRoleRequest request) {
        adminUserService.updateRole(id, request.getRole());
    }

    @PutMapping("/users/{id}/status")
    public void updateStatus(
            @PathVariable Long id, @Valid @RequestBody UpdateStatusRequest request, HttpServletRequest httpRequest) {
        adminUserService.updateStatus(id, request.getActive(), AuditLogService.resolveIpAddress(httpRequest));
    }

    @DeleteMapping("/users/{id}")
    public void deleteUser(@PathVariable Long id, HttpServletRequest httpRequest) {
        adminUserService.deleteUser(id, AuditLogService.resolveIpAddress(httpRequest));
    }
}
