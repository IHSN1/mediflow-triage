package com.mediflow.mediflowbackend.config;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.http.HttpStatus;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Configuration centrale de la sécurité de l'API :
 * - API "stateless" (pas de session HTTP, chaque requête porte son JWT)
 * - CORS ouvert au frontend (http://localhost:5173)
 * - Une route protégée par rôle pour chaque module métier, conformément au
 *   cahier des charges : INFIRMIER -> /api/history, /api/triage ;
 *   MEDECIN -> /api/patients ; ADMIN -> /api/admin.
 *
 * Expiration du JWT : fixée à 8h maximum (voir jwt.expiration-ms dans
 * application.properties, lu par JwtService). Passé ce délai, le token
 * devient invalide : JwtAuthenticationFilter ne authentifie plus la requête
 * et authenticationEntryPoint (ci-dessous) répond 401, forçant une
 * reconnexion — conforme à ISO 27001 (limitation de la durée des sessions).
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Value("${cors.allowed-origin}")
    private String allowedOrigin;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(handling -> handling.authenticationEntryPoint(
                        new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .authorizeHttpRequests(auth -> auth
                        // Autorise les requêtes préliminaires CORS (preflight) du navigateur.
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // Seul /login est public : /logout doit savoir QUI se déconnecte
                        // (JWT requis) pour journaliser l'événement dans audit_logs.
                        .requestMatchers("/api/auth/login").permitAll()
                        .requestMatchers("/api/auth/logout").authenticated()
                        .requestMatchers("/api/dashboard/**").hasAnyRole("INFIRMIER", "MEDECIN")
                        // INFIRMIER : seul rôle autorisé sur le parcours de triage
                        // (création + PUT .../validate) et sur son historique
                        // personnel (filtré par utilisateur dans HistoryService).
                        .requestMatchers("/api/triage/**").hasRole("INFIRMIER")
                        .requestMatchers("/api/history/**").hasRole("INFIRMIER")
                        // MEDECIN : lecture/suppression/export de tous les triages,
                        // mais aucun accès à /api/triage (pas de création).
                        .requestMatchers("/api/patients/**").hasRole("MEDECIN")
                        // ADMIN : uniquement la gestion des comptes, aucun accès
                        // aux données patients ni aux triages.
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(allowedOrigin));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    /** Utilisé pour hasher les mots de passe (création de compte) et les vérifier (login). */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
