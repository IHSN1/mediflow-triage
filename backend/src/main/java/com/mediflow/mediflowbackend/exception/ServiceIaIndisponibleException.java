package com.mediflow.mediflowbackend.exception;

/**
 * Levée par TriageService lorsque le service IA FastAPI ne répond pas
 * (panne, réseau indisponible ou dépassement du délai de 5 secondes).
 * Interceptée par GlobalExceptionHandler pour ne jamais laisser passer une
 * erreur technique brute (message d'exception, stack trace) jusqu'au
 * frontend : seule une réponse SERVICE_IA_INDISPONIBLE exploitable par
 * l'infirmier(ère) est renvoyée.
 */
public class ServiceIaIndisponibleException extends RuntimeException {

    public ServiceIaIndisponibleException(String message, Throwable cause) {
        super(message, cause);
    }
}
