# MediFlow AI — Backend

API REST du backend MediFlow AI, plateforme d'aide au triage médical aux urgences (échelle ESI 1 à 5, règles de sécurité, explicabilité des décisions).

Ce backend agit comme **gateway** : le frontend ne parle jamais directement au service IA (FastAPI, voir `ai-service/`), tout passe par ici — authentification (JWT), gestion des comptes, historique des triages, tableau de bord, et relais des appels vers le service IA.

## Stack technique

- Java 17, Spring Boot 3.2.5 (Web, Security, Data JPA)
- PostgreSQL (testé avec [Neon](https://neon.tech))
- JWT (jjwt) pour l'authentification
- Maven (via le wrapper `mvnw` / `mvnw.cmd`, aucune installation Maven requise)

## Configuration

Toutes les valeurs sensibles sont lues depuis des variables d'environnement (jamais codées en dur). À définir avant de démarrer l'application :

| Variable | Description |
|---|---|
| `DB_URL` | URL JDBC PostgreSQL, ex. `jdbc:postgresql://<host>/<db>?sslmode=require` |
| `DB_USERNAME` | Nom d'utilisateur PostgreSQL |
| `DB_PASSWORD` | Mot de passe PostgreSQL |
| `JWT_SECRET` | Clé secrète de signature des tokens JWT (HS256, 32 caractères minimum) |

Le reste de la configuration (port, CORS, URL du service IA) se trouve dans `src/main/resources/application.properties`.

## Démarrage

```sh
export DB_URL="jdbc:postgresql://<host>/<db>?sslmode=require"
export DB_USERNAME="..."
export DB_PASSWORD="..."
export JWT_SECRET="..."

./mvnw spring-boot:run
```

L'API écoute sur `http://localhost:8080`. Le service IA (FastAPI, `ai-service/`) doit tourner sur `http://localhost:8000` pour que les endpoints `/api/triage/*` fonctionnent.

## Comptes de démonstration

Au premier démarrage sur une base vide, `DataInitializer` crée automatiquement 3 comptes (un par rôle) — voir ce fichier pour les identifiants exacts.

## Structure du code

```
src/main/java/com/mediflow/mediflowbackend/
├── config/       → sécurité (JWT, CORS), initialisation des comptes de démo
├── controller/   → endpoints REST (auth, triage, historique, patients, dashboard, admin)
├── service/      → logique métier
├── repository/   → accès base de données (Spring Data JPA)
├── model/        → entités JPA (User, Triage, AuditLog)
└── dto/          → contrats de requête/réponse de l'API
```
