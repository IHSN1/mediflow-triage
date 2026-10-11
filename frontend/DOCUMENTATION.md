# MediFlow AI — Documentation technique

Ce document explique **l'architecture** et les **choix techniques** du projet MediFlow AI, une plateforme d'aide au triage médical aux urgences (échelle ESI, niveaux 1 à 5 — 1 étant le plus critique). Il s'adresse à quelqu'un qui découvre le projet et n'a pas participé à son développement.

Le projet est organisé en **3 dépôts indépendants** :

| Dépôt                 | Rôle                                                         | Techno principale                     |
| ----------------------- | ------------------------------------------------------------- | ------------------------------------- |
| `mediflow-frontend`   | Interface clinique (infirmier, médecin, admin)               | React 19, TanStack Start              |
| `mediflow-backend`    | Gateway API, authentification, base de données               | Spring Boot 3, PostgreSQL             |
| `mediflow-ai-service` | Prédiction ESI, règles de sécurité, agent conversationnel | FastAPI, XGBoost, LangChain + Mistral |

```
[Frontend React]
       │  REST (JWT)
       ▼
[Backend Spring Boot]  ── PostgreSQL (utilisateurs, triages, audit)
       │  REST interne
       ▼
[Service IA FastAPI]   ── XGBoost + règles NEWS2 + agent Mistral
```

Le frontend ne parle **jamais** directement au service IA : tout passe par le backend Spring Boot, qui agit comme gateway. Cette séparation permet à chaque partie d'être développée, testée et déployée indépendamment.

---

## 1. Pourquoi ces choix technologiques

### Pourquoi Spring Boot et pas Node.js ?

Le backend gère des responsabilités où la robustesse compte plus que la vitesse de développement : authentification par rôle (infirmier / médecin / admin), accès à une base de données relationnelle, traçabilité (journal d'audit). Spring Security fournit un modèle d'autorisation par rôle éprouvé (`hasRole`, `hasAnyRole`, voir `SecurityConfig.java`) directement intégré au framework, sans dépendre de librairies tierces moins matures. Spring Data JPA réduit fortement le code répétitif d'accès aux données (les repositories du projet n'ont presque aucune implémentation manuelle — Spring génère les requêtes SQL à partir du nom des méthodes). Le typage statique de Java limite aussi une classe entière d'erreurs à l'exécution, un avantage non négligeable dans un contexte à vocation médicale où un bug silencieux peut avoir des conséquences réelles.

### Pourquoi XGBoost et pas Random Forest ?

Ce choix n'a pas été fait a priori : le projet compare explicitement 4 modèles sur les mêmes données (`src/compare_models.py`) — arbre de décision, régression logistique, Random Forest, XGBoost — avec la même méthode d'évaluation (F1-macro, validation croisée stratifiée). XGBoost est retenu à la fois parce que la littérature récente (Scientific Reports, 2025) le documente comme performant sur ce type de problème, et parce que cette comparaison empirique sur les données réelles du projet le confirme plutôt que de se reposer uniquement sur un article externe. Deux avantages pratiques s'ajoutent : XGBoost gère nativement les valeurs manquantes (fréquentes ici — les signes vitaux ne sont pas toujours tous mesurés à l'accueil), et il tend à mieux généraliser qu'un Random Forest sur des features hétérogènes combinant signes vitaux numériques et texte vectorisé (TF-IDF) du motif de consultation.

### Pourquoi Mistral et pas GPT-4 ?

L'agent conversationnel qui interroge le patient et rédige le résumé clinique fonctionne entièrement en français — le domaine de spécialité de Mistral. Mistral AI est une entreprise européenne (française), un critère pertinent pour un projet manipulant potentiellement des données de santé, dans un contexte où la souveraineté des données et la conformité RGPD sont des préoccupations réelles pour un système de santé. L'intégration via LangChain (`ChatMistralAI`) est immédiate et interchangeable — le code de `triage_agent.py` a d'ailleurs déjà servi à valider cette portabilité en basculant temporairement vers Groq le temps qu'un compte Mistral payant soit débloqué, sans changer une ligne de logique métier.

### Pourquoi JWT et pas des sessions ?

L'API est conçue **stateless** (`SessionCreationPolicy.STATELESS` dans `SecurityConfig.java`) : aucune session n'est conservée côté serveur. Chaque requête porte son propre jeton signé (header `Authorization: Bearer <token>`), vérifié par `JwtAuthenticationFilter` à chaque appel. Ce choix évite d'avoir à répliquer un état de session entre plusieurs instances du backend si l'application devait un jour être déployée à l'échelle, et correspond naturellement à une architecture où le frontend est une SPA découplée du backend. Le token expire au bout de 8 heures (`jwt.expiration-ms`), une durée de garde standard en milieu hospitalier (ISO 27001, limitation de la durée des sessions) : passé ce délai, l'infirmière doit se reconnecter.

### Pourquoi PostgreSQL (Neon) et pas MySQL ?

Une première version du projet stockait l'historique en SQLite local (voir `utils/database.py`), pensée pour une interface Streamlit. Problème concret : le système de fichiers de Streamlit Cloud (offre gratuite) est éphémère — un fichier SQLite local est réinitialisé à chaque redéploiement, avec perte totale de l'historique. Neon (PostgreSQL serverless gratuit) règle ce problème en fournissant une base externe et persistante, sans serveur à gérer. PostgreSQL a été préféré à MySQL pour son support plus riche des types avancés (JSON, texte) et parce que Neon (l'offre serverless gratuite choisie) est spécifiquement une offre PostgreSQL.

### Pourquoi FastAPI et pas Flask ?

Le contrat entre le service IA et le backend Spring Boot doit rester strict et bien défini (voir section 3). FastAPI génère automatiquement une documentation interactive (Swagger, accessible sur `/docs`) directement à partir des modèles Pydantic du code — aucune ligne supplémentaire à écrire, et le contrat reste toujours synchronisé avec l'implémentation réelle. La validation des requêtes entrantes (types, champs obligatoires) est également intégrée nativement via Pydantic, ce que Flask n'offre pas sans bibliothèque tierce additionnelle. Le support asynchrone natif est un bénéfice secondaire pour un service qui enchaîne des appels réseau (Mistral).

### Pourquoi React et pas Angular ?

Le projet vise une interface clinique riche en interactions (formulaires dynamiques, dialogue en temps réel avec l'agent IA, tableaux filtrables) construite par une petite équipe. React, associé à TanStack Start (routage basé sur les fichiers, SSR, TanStack Query) et à shadcn/ui + Tailwind CSS, permet d'assembler rapidement des composants cohérents sans la charge de configuration et le formalisme plus lourd d'Angular. L'écosystème React est aussi plus large pour ce type de composants d'interface (graphiques avec Recharts, dialogues accessibles avec Radix UI).

### Pourquoi le NEWS2 et pas un autre score médical ?

Le NEWS2 (National Early Warning Score 2) n'est pas un barème inventé pour le projet : c'est un score clinique publié par le Royal College of Physicians (2017), rendu obligatoire dans tous les hôpitaux aigus du NHS anglais depuis 2018, et validé sur des centaines de milliers de patients dans de nombreuses études. C'est un outil réellement déployé à grande échelle, pensé précisément pour le problème posé ici : distinguer un signe isolé mais franchement dangereux (ex. SpO2 très basse) d'une combinaison de signes seulement modérément anormaux qui, cumulés, deviennent préoccupants. Adaptation assumée : le NEWS2 officiel utilise 6 paramètres (dont le niveau de conscience et le statut sous oxygène) ; le jeu de données utilisé pour ce projet (MIMIC-IV-ED, table `triage.csv`) n'en fournit que 5 (fréquence respiratoire, SpO2, tension systolique, fréquence cardiaque, température). C'est une adaptation nécessaire et documentée, pas le NEWS2 complet — voir `src/safety_rules.py` pour le détail des barèmes et les sources citées.

---

## 2. Logique métier clé

### La logique `min()` : pourquoi le minimum, et pas le maximum

Dans `safety_rules.py`, la fonction `appliquer_regles_securite` calcule :

```python
niveau_final = min(niveau_predit, niveau_suggere)
```

Ceci peut sembler contre-intuitif si l'on pense "plus grave → chiffre plus grand", mais l'échelle ESI fonctionne **à l'inverse** : le niveau **1** est le plus critique (urgence vitale immédiate), le niveau **5** le moins urgent. Prendre le **minimum** entre la prédiction XGBoost et le niveau suggéré par les règles NEWS2 revient donc à retenir systématiquement **le niveau le plus prioritaire des deux** (le chiffre le plus bas).

C'est l'invariant de sécurité central du projet, conforme à l'analyse de risques ISO 14971 (risque n°1 identifié : faux négatif critique, c'est-à-dire un patient réellement grave classé à tort comme non urgent) :

> La couche de règles de sécurité (NEWS2) peut **uniquement** rendre un patient plus prioritaire. Elle ne peut **jamais** le rendre moins prioritaire que ce que XGBoost a prédit.

Concrètement : si XGBoost prédit un niveau 3 (peu urgent) mais que les signes vitaux sont catastrophiques (ex. SpO2 = 85 %), le score NEWS2 déclenche un niveau suggéré de 1, et `min(3, 1) = 1` l'emporte. À l'inverse, si XGBoost prédit un niveau 1 (urgent) mais que les signes vitaux sont parfaitement normaux, aucune règle ne se déclenche (`niveau_suggere = None`), et le niveau XGBoost reste inchangé — la couche de sécurité ne peut pas *dégrader* une urgence détectée par le modèle.

### Le contrat JSON entre Spring Boot et le service IA

Le backend Spring Boot (`TriageService.java`) et le service IA FastAPI (`ai_service/main.py`) communiquent via 3 appels REST internes, avec un contrat de champs strict des deux côtés :

**1. `POST /triage/start`** — Spring envoie l'identité et les signes vitaux (`chief_complaint`, `temperature`, `heartrate`, `resprate`, `o2sat`, `sbp`, `dbp`, `pain`, **à plat**, sans objet `vitals` imbriqué). FastAPI crée une session `TriageAgent` et une entrée en mémoire, renvoie `session_id` + la première question de l'agent. Spring Boot crée en parallèle la ligne `Triage` en base (identité + signes vitaux), reliée par ce même `session_id`.

**2. `POST /triage/respond`** — un tour de dialogue. Spring relaie `session_id` + `answer` (le champ s'appelle bien `answer`, pas `patient_answer`) ; FastAPI renvoie la question suivante et un booléen `finished`.

**3. `GET /triage/result/{sessionId}`** — une fois le dialogue terminé, FastAPI calcule le résultat final : prédiction XGBoost (`niveau_xgboost_brut`), niveau après passage des règles de sécurité (`niveau_final`, qui **n'est qu'un alias JSON** de `niveau_ia` côté base — voir `Triage.java`), la règle éventuellement déclenchée (`regle_declenchee`, `details_regle`), le score NEWS2 total (`news2_score`) et le résumé clinique rédigé par Mistral (`resume_clinique`). `TriageService.getResult()` complète alors la ligne `Triage` déjà créée avec ces valeurs.

Ce contrat de noms de champs est répété à l'identique aux 3 niveaux de la chaîne (Pydantic côté FastAPI, DTOs Java côté Spring, interfaces TypeScript côté frontend) — un changement de nom d'un côté sans les deux autres casse silencieusement l'intégration, d'où l'importance des commentaires qui le rappellent explicitement dans chaque fichier concerné.

### La chaîne complète d'un triage, de bout en bout

1. **Accueil** (`NewPatient.tsx`, infirmier) : saisie de l'identité, du motif de consultation et des signes vitaux → `POST /api/triage/start` (Spring Boot).
2. **Spring Boot** relaie l'appel à FastAPI (`TriageService.start`), crée la ligne `Triage` en base (`created_by` = l'infirmière connectée, via le JWT), journalise `TRIAGE_CREATED` dans `audit_logs`, renvoie `session_id` + première question.
3. **Dialogue guidé** (`AgentIA.tsx`) : l'agent conversationnel (Mistral, `TriageAgent`) pose jusqu'à 5 questions de suivi courtes, sans jamais donner de diagnostic ni de niveau ESI — son seul rôle est de recueillir de l'information (`POST /api/triage/respond`, plusieurs tours).
4. **Calcul du résultat** (`GET /api/triage/result/{sessionId}`) : le service IA vectorise le motif de consultation (TF-IDF) et les signes vitaux, prédit un niveau brut via XGBoost, applique la couche de règles NEWS2 (qui ne peut qu'escalader le niveau, voir ci-dessus), puis demande à Mistral de rédiger une recommandation clinique courte à partir de tout l'historique de la conversation. Spring Boot persiste ces résultats sur la ligne `Triage` déjà créée.
5. **Affichage du résultat** (`Result.tsx`) : l'infirmière voit la suggestion IA (niveau, règle déclenchée, score NEWS2, résumé) et **doit** confirmer ou corriger ce niveau (`niveau_infirmiere`) — l'IA ne se substitue jamais à la décision clinique finale (ISO 14971). Si elle corrige, un motif de modification est obligatoire.
6. **Validation** (`PUT /api/triage/{id}/validate`) : la décision finale est enregistrée, journalisée (`TRIAGE_MODIFIED`), et c'est **seulement à partir de ce moment** que le triage apparaît dans l'historique (`HistoryService` filtre explicitement les triages dont `niveau_infirmiere` est renseigné) et dans le tableau de bord.
7. **Consultation ultérieure** : l'infirmière retrouve ses propres triages dans `/api/history` (filtré par `created_by`), le médecin voit tous les triages du service dans `/api/patients` (aucun filtre par créateur), et le tableau de bord affiche des statistiques scopées de la même façon (personnelles pour l'infirmier, globales pour le médecin).

---

## 3. Sécurité et conformité

- **Aucun secret en dur dans le code source** : identifiants de base de données et secret JWT sont fournis via variables d'environnement (`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`), jamais commités.
- **Traçabilité (ISO 27001)** : toute connexion, déconnexion, création/modification de triage et gestion de compte est journalisée dans `audit_logs`, avec l'identité et le nom de l'auteur conservés même si le compte est supprimé par la suite.
- **Séparation des rôles stricte** : chaque route API est explicitement restreinte à un rôle (`SecurityConfig.java`) — un infirmier ne peut pas accéder aux données d'administration, un administrateur n'a aucun accès aux données patients.
- **Le jugement clinique humain reste toujours final** (ISO 14971) : à aucun moment l'IA ne peut imposer un niveau ESI sans validation explicite de l'infirmière.
