package com.mediflow.mediflowbackend.controller;

import com.mediflow.mediflowbackend.dto.PatientFormRequest;
import com.mediflow.mediflowbackend.dto.RespondTriageRequest;
import com.mediflow.mediflowbackend.dto.RespondTriageResponse;
import com.mediflow.mediflowbackend.dto.StartTriageResponse;
import com.mediflow.mediflowbackend.dto.TriageResultResponse;
import com.mediflow.mediflowbackend.dto.TriageValidationResponse;
import com.mediflow.mediflowbackend.dto.ValidateTriageRequest;
import com.mediflow.mediflowbackend.service.AuditLogService;
import com.mediflow.mediflowbackend.service.TriageService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Parcours de triage (page "Nouveau patient" puis "Agent IA" du frontend).
 * Réservé au rôle INFIRMIER (voir SecurityConfig). Chaque appel est
 * transmis au service IA FastAPI par TriageService.
 *
 * Choix technique : ce contrôleur ne contient aucune logique métier — chaque
 * méthode ne fait que déléguer à TriageService et transmettre l'adresse IP
 * (pour le journal d'audit). Le découpage en 4 endpoints distincts (start /
 * respond / result / validate) reflète directement les 4 étapes séquentielles
 * du parcours de triage côté frontend, plutôt qu'un unique endpoint générique.
 */
@RestController
@RequestMapping("/api/triage")
@RequiredArgsConstructor
public class TriageController {

    private final TriageService triageService;

    /** Démarre une session de triage à partir du formulaire d'accueil. */
    @PostMapping("/start")
    public StartTriageResponse start(@Valid @RequestBody PatientFormRequest request, HttpServletRequest httpRequest) {
        return triageService.start(request, AuditLogService.resolveIpAddress(httpRequest));
    }

    /** Un tour de l'interrogatoire guidé par l'agent IA. */
    @PostMapping("/respond")
    public RespondTriageResponse respond(@Valid @RequestBody RespondTriageRequest request) {
        return triageService.respond(request);
    }

    /** Résultat final (niveau ESI, règles de sécurité, résumé clinique). */
    @GetMapping("/result/{sessionId}")
    public TriageResultResponse result(@PathVariable String sessionId) {
        return triageService.getResult(sessionId);
    }

    /** Validation infirmière du niveau ESI final (confirmation ou correction de la suggestion de l'IA). */
    @PutMapping("/{id}/validate")
    public TriageValidationResponse validate(
            @PathVariable Long id,
            @Valid @RequestBody ValidateTriageRequest request,
            HttpServletRequest httpRequest) {
        return triageService.validate(id, request, AuditLogService.resolveIpAddress(httpRequest));
    }
}
