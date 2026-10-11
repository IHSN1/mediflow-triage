package com.mediflow.mediflowbackend.service;

import com.mediflow.mediflowbackend.model.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import java.security.Key;
import java.util.Date;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Génère et vérifie les tokens JWT utilisés pour authentifier les requêtes
 * de l'API (header "Authorization: Bearer <token>").
 * Le token transporte l'email (subject), le rôle et l'identifiant de
 * l'utilisateur : JwtAuthenticationFilter les relit à chaque requête pour
 * reconstruire le contexte de sécurité, sans avoir à requêter la base.
 *
 * Interactions : generateToken() est appelé par AuthService au moment du
 * login (une seule fois, le token est ensuite conservé côté client) ;
 * parseClaims()/isValid() sont appelés par JwtAuthenticationFilter à CHAQUE
 * requête protégée.
 *
 * Choix technique : HS256 (clé symétrique unique) plutôt qu'un algorithme
 * asymétrique (RS256) — suffisant ici car un seul service (ce backend) émet
 * ET vérifie les tokens ; RS256 ne se justifierait que si un autre service
 * devait vérifier les tokens sans connaître le secret de signature.
 */
@Service
public class JwtService {

    private final Key signingKey;
    private final long expirationMs;

    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration-ms}") long expirationMs) {
        // HS256 exige une clé d'au moins 256 bits : la valeur de jwt.secret
        // (application.properties) doit faire au moins 32 caractères.
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes());
        this.expirationMs = expirationMs;
    }

    /** Construit un token signé pour l'utilisateur connecté. */
    public String generateToken(String email, Role role, Long userId) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .setSubject(email)
                .claim("role", role.name())
                .claim("userId", userId)
                .setIssuedAt(now)
                .setExpiration(expiry)
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();
    }

    /** Décode et vérifie la signature/expiration du token ; lève JwtException si invalide. */
    public Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(signingKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    /** true si le token est valide et non expiré. */
    public boolean isValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}

