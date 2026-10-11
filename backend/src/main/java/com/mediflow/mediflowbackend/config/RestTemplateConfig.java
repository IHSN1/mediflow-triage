package com.mediflow.mediflowbackend.config;

import java.time.Duration;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * Fournit le client HTTP utilisé par TriageService pour appeler le service
 * IA FastAPI (POST /triage/start, POST /triage/respond, GET /triage/result).
 *
 * Délai de 5 secondes maximum (connexion + lecture) : si FastAPI ne répond
 * pas dans ce délai, l'appel échoue par un timeout que TriageService
 * transforme en réponse SERVICE_IA_INDISPONIBLE plutôt que de bloquer
 * indéfiniment l'infirmier(ère) en attente du résultat.
 */
@Configuration
public class RestTemplateConfig {

    private static final Duration FASTAPI_TIMEOUT = Duration.ofSeconds(5);

    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
                .setConnectTimeout(FASTAPI_TIMEOUT)
                .setReadTimeout(FASTAPI_TIMEOUT)
                .build();
    }
}
