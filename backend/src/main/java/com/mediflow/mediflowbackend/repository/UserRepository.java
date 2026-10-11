package com.mediflow.mediflowbackend.repository;

import com.mediflow.mediflowbackend.model.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Accès base de données pour l'entité User.
 * Spring Data JPA génère automatiquement l'implémentation à partir de la
 * signature des méthodes (aucun code SQL à écrire).
 */
public interface UserRepository extends JpaRepository<User, Long> {

    /** Utilisé par AuthService pour retrouver le compte lors du login. */
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);
}
