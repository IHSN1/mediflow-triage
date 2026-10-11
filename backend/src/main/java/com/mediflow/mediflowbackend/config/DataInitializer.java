package com.mediflow.mediflowbackend.config;

import com.mediflow.mediflowbackend.model.Role;
import com.mediflow.mediflowbackend.model.User;
import com.mediflow.mediflowbackend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Crée 3 comptes de démonstration (un par rôle) au premier démarrage, pour
 * pouvoir se connecter immédiatement sans passer par un script SQL manuel.
 * Ne s'exécute que si la table users est vide : ne touche jamais des
 * comptes déjà créés.
 *
 * Identifiants de démonstration (mot de passe identique pour les 3) :
 *   infermier@mediflow.ma / mediflow123
 *   medcin@mediflow.ma    / mediflow123
 *   admin@mediflow.ma     / mediflow123
 * À supprimer ou changer avant tout déploiement réel.
 *
 * Interactions : s'appuie sur PasswordEncoder (Bean défini dans
 * SecurityConfig) pour hasher le mot de passe exactement comme le ferait
 * AdminUserService.createUser() — un compte de démo doit rester
 * indiscernable, pour AuthService, d'un compte créé normalement.
 *
 * Choix technique : implémente CommandLineRunner (exécuté une fois au
 * démarrage de l'application) plutôt qu'un script SQL de seed séparé — garde
 * la logique de création dans le même langage/les mêmes garanties de type
 * que le reste du projet, et reste trivial à supprimer ou désactiver.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private static final String DEMO_PASSWORD = "mediflow123";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            return;
        }

        String hashed = passwordEncoder.encode(DEMO_PASSWORD);

        userRepository.save(User.builder()
                .fullName("Samar Rahimi")
                .email("infermier@mediflow.ma")
                .password(hashed)
                .role(Role.INFIRMIER)
                .active(true)
                .build());

        userRepository.save(User.builder()
                .fullName("Ali Bennani")
                .email("medcin@mediflow.ma")
                .password(hashed)
                .role(Role.MEDECIN)
                .active(true)
                .build());

        userRepository.save(User.builder()
                .fullName("Ahmed Khalil")
                .email("admin@mediflow.ma")
                .password(hashed)
                .role(Role.ADMIN)
                .active(true)
                .build());

        log.info("Comptes de démonstration créés (mot de passe : {})", DEMO_PASSWORD);
    }
}

