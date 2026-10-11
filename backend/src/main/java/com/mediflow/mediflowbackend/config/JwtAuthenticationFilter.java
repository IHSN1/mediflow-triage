package com.mediflow.mediflowbackend.config;

import com.mediflow.mediflowbackend.service.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Filtre exécuté sur chaque requête HTTP entrante : lit l'en-tête
 * "Authorization: Bearer <token>", vérifie le JWT, puis authentifie la
 * requête auprès de Spring Security avec le rôle porté par le token
 * (sous forme d'autorité "ROLE_INFIRMIER", "ROLE_MEDECIN" ou "ROLE_ADMIN").
 * C'est ce qui permet à SecurityConfig.hasRole(...) de fonctionner.
 *
 * Pourquoi ce filtre existe : l'API est stateless (aucune session HTTP côté
 * serveur, voir SecurityConfig) — l'identité et le rôle de l'utilisateur ne
 * peuvent donc pas être lus depuis une session, ils doivent être reconstruits
 * à chaque requête à partir du seul token. C'est le rôle exclusif de ce filtre.
 *
 * Interactions : s'appuie sur JwtService pour décoder/vérifier le token
 * (jamais de décodage JWT fait ici directement), et s'insère dans la chaîne
 * de filtres Spring Security AVANT UsernamePasswordAuthenticationFilter (voir
 * SecurityConfig.addFilterBefore) pour que le contexte de sécurité soit déjà
 * peuplé quand les règles authorizeHttpRequests(...) sont évaluées.
 *
 * Choix technique : hérite de OncePerRequestFilter (et non d'un Filter brut)
 * pour garantir une seule exécution par requête même en cas de forward interne
 * (ex. dispatch vers /error) — un filtre standard pourrait sinon s'exécuter
 * deux fois sur une même requête.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String HEADER_NAME = "Authorization";
    private static final String PREFIX = "Bearer ";

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String header = request.getHeader(HEADER_NAME);

        if (header != null && header.startsWith(PREFIX)) {
            String token = header.substring(PREFIX.length());
            try {
                Claims claims = jwtService.parseClaims(token);
                String email = claims.getSubject();
                String role = claims.get("role", String.class);

                var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
                var authentication =
                        new UsernamePasswordAuthenticationToken(email, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (JwtException | IllegalArgumentException e) {
                // Token absent, invalide ou expiré : on n'authentifie pas la requête.
                // Les routes protégées répondront 401/403 via SecurityConfig.
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }
}

