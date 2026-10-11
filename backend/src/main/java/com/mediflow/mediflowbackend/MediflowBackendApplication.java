package com.mediflow.mediflowbackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Point d'entrée de l'application Spring Boot.
 * Démarre le serveur Tomcat embarqué, initialise le contexte Spring
 * (contrôleurs, services, repositories, sécurité) et se connecte à la base
 * PostgreSQL Neon configurée dans application.properties.
 */
@SpringBootApplication
public class MediflowBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(MediflowBackendApplication.class, args);
    }
}
