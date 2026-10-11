package com.mediflow.mediflowbackend.exception;

import com.mediflow.mediflowbackend.dto.ErrorResponse;
import com.mediflow.mediflowbackend.dto.ServiceIaIndisponibleResponse;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

/**
 * Traduit les exceptions techniques en réponses HTTP exploitables par le
 * frontend, sans jamais exposer de détail d'implémentation (message brut
 * d'exception, stack trace) — conforme à ISO 27001 (ne pas divulguer
 * d'information technique sensible dans les réponses d'erreur).
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    /** Panne ou délai dépassé (5s) du service IA FastAPI : voir TriageService et RestTemplateConfig. */
    @ExceptionHandler(ServiceIaIndisponibleException.class)
    public ResponseEntity<ServiceIaIndisponibleResponse> handleServiceIaIndisponible(
            ServiceIaIndisponibleException e) {
        log.warn("Service IA (FastAPI) indisponible : {}", e.getCause() != null ? e.getCause().toString() : e.getMessage());

        ServiceIaIndisponibleResponse body = ServiceIaIndisponibleResponse.builder()
                .error("SERVICE_IA_INDISPONIBLE")
                .message("Service IA temporairement indisponible — veuillez procéder au triage manuel")
                .build();

        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(body);
    }

    /**
     * Erreurs métier levées volontairement (identifiants invalides, compte
     * désactivé, etc. — voir AuthService) : renvoie un corps JSON simple
     * {status, message} au lieu de la page d'erreur par défaut de Spring Boot.
     */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorResponse> handleResponseStatusException(ResponseStatusException e) {
        HttpStatusCode status = e.getStatusCode();

        ErrorResponse body = ErrorResponse.builder()
                .status(status.value())
                .message(e.getReason())
                .build();

        return ResponseEntity.status(status).body(body);
    }

    /**
     * Échec de validation @Valid sur un DTO de requête (ex : champ @NotBlank
     * manquant). Gérée explicitement ici — et non laissée à la résolution
     * par défaut de Spring MVC — car celle-ci répond via un mécanisme
     * d'erreur servlet (sendError) qui redéclenche un forward interne vers
     * "/error", lequel retraverse la chaîne de sécurité Spring Security et
     * se fait bloquer par elle (401 vide, au lieu du 400 attendu, y compris
     * sur des requêtes déjà authentifiées). Répondre directement ici évite
     * ce forward et son 401 trompeur.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(err -> err.getDefaultMessage())
                .distinct()
                .collect(Collectors.joining(" ; "));

        ErrorResponse body = ErrorResponse.builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .message(message.isBlank() ? "Requête invalide" : message)
                .build();

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }
}
