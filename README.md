# 🏥 MediFlow AI — Application Web d'Aide au Triage Médical aux Urgences

## 📋 Description

**MediFlow AI** est une plateforme web intelligente d'aide au triage médical aux urgences. Elle intègre un agent conversationnel basé sur LangChain et un modèle de classification XGBoost pour prédire automatiquement le niveau de priorité ESI (Emergency Severity Index) d'un patient, tout en garantissant la supervision humaine obligatoire par l'infirmière.

## 🏗️ Architecture

```
mediflow-triage/
├── frontend/          → Interface React + TypeScript + Tailwind CSS
├── backend/           → API REST Spring Boot + PostgreSQL (Neon)
└── ai-service/        → Agent IA FastAPI + XGBoost + LangChain + Mistral
```

```
[React Frontend :5173]
        ↕ REST API (JWT)
[Spring Boot Backend :8080]
        ↕ HTTP
[FastAPI AI Service :8000]
        ↕
[XGBoost] → [Règles NEWS2] → [LangChain + Mistral-7B]
        ↕
[PostgreSQL Neon — Frankfurt 🇩🇪]
```

---

## 👤 Les 3 rôles utilisateurs

| Rôle | Fonctionnalités |
|------|----------------|
| **Infirmière** | Créer un triage, dialoguer avec l'agent IA (5 questions), valider/modifier le niveau ESI, consulter l'historique, exporter CSV |
| **Médecin** | Voir tous les triages, liste des patients, exporter CSV, tableau de bord |
| **Administrateur** | Gérer les comptes utilisateurs (créer, activer/désactiver, supprimer) — aucun accès aux données patients |

---

## 🚀 Lancement du projet

### Prérequis

```
Node.js 18+
Java 17
Python 3.10+
Maven
```

### 1. Frontend React

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### 2. Backend Spring Boot

```bash
cd backend
# Configurer src/main/resources/application.properties avec vos identifiants Neon
mvn spring-boot:run
# → http://localhost:8080
```

### 3. Service IA FastAPI

```bash
cd ai-service
pip install -r requirements.txt
# Configurer .env avec MISTRAL_API_KEY
uvicorn ai_service.main:app --port 8000 --reload
# → http://localhost:8000
```

---

## ⚙️ Configuration

### Backend — `application.properties`

```properties
spring.datasource.url=jdbc:postgresql://[NEON_URL]/neondb?sslmode=require
spring.datasource.username=[USERNAME]
spring.datasource.password=[PASSWORD]
jwt.secret=[SECRET_KEY]
jwt.expiration-ms=28800000
fastapi.base-url=http://localhost:8000
cors.allowed-origin=http://localhost:5173
```

### Service IA — `.env`

```env
MISTRAL_API_KEY=[VOTRE_CLE_MISTRAL]
```

---

## 🔐 Comptes de démonstration

Les comptes sont créés automatiquement au premier démarrage (via `DataInitializer.java`) :

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Infirmier | infirmier@mediflow.fr | mediflow123 |
| Médecin | medecin@mediflow.fr | mediflow123 |
| Administrateur | admin@mediflow.fr | mediflow123 |

---

## 🤖 Pipeline IA

```
Motif d'admission (texte)
        ↓ TF-IDF vectorisation
XGBoost → niveau ESI brut (1-4)
        ↓
Règles de sécurité NEWS2 (safety_rules.py)
  • Règle A : score NEWS2 ≥ 7 → ESI 1
  • Règle B : un signe isolé = score 3 → ESI 1
  • Principe min() : jamais baisser la priorité
        ↓
LangChain + Mistral-7B
  → 5 questions de dialogue infirmière
  → Résumé clinique structuré
        ↓
Résultat : niveau_final + règle_déclenchée + résumé
```

---

## 🛠️ Stack technique

### Frontend
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query

### Backend
- Spring Boot 3.2 (Java 17)
- Spring Security + JWT (8h)
- PostgreSQL — Neon Cloud (Frankfurt 🇩🇪)
- Maven

### Service IA
- FastAPI (Python 3.10+)
- XGBoost — classification ESI
- Score NEWS2 — règles de sécurité médicales déterministes
- LangChain — orchestration du dialogue
- Mistral-7B — génération des questions et résumé clinique
- Dataset MIMIC-IV-ED (Harvard/MIT — accès PhysioNet)

---

## 📋 Endpoints API

### Authentification
```
POST /api/auth/login    → connexion (public)
POST /api/auth/logout   → déconnexion (JWT requis)
```

### Triage (INFIRMIER uniquement)
```
POST /api/triage/start           → démarrer un triage (dialogue IA)
POST /api/triage/respond         → répondre à une question de l'agent
GET  /api/triage/result/{id}     → récupérer le résultat
PUT  /api/triage/{id}/validate   → validation infirmière (niveau + motif)
```

### Historique (INFIRMIER)
```
GET    /api/history         → historique personnel de l'infirmière
DELETE /api/history/{id}    → supprimer un triage
GET    /api/history/export  → exporter en CSV
```

### Patients (MÉDECIN)
```
GET /api/patients        → tous les triages
GET /api/patients/export → exporter en CSV
```

### Tableau de bord
```
GET /api/dashboard/stats → statistiques (INFIRMIER + MÉDECIN)
```

### Administration (ADMIN)
```
GET    /api/admin/users              → liste des comptes
POST   /api/admin/users              → créer un compte
PUT    /api/admin/users/{id}/role    → changer le rôle
PUT    /api/admin/users/{id}/status  → activer/désactiver
DELETE /api/admin/users/{id}         → supprimer un compte
```

---

## 🛡️ Normes et conformité

| Norme | Application dans MediFlow AI |
|-------|------------------------------|
| **ISO 27001** | BCrypt, JWT 8h, 3 rôles stricts, audit log horodaté avec IP, SSL/TLS, Frankfurt |
| **ISO 14971** | Score NEWS2, principe min(), validation infirmière obligatoire, explicabilité, gestion de panne |
| **AI Act 2024** | Système à haut risque (Annexe III) — explicabilité, traçabilité, supervision humaine, non-discrimination |
| **RGPD / Loi 09-08** | Données hébergées en Europe (Frankfurt), accès limité par rôle, audit log complet |

---

## 🗄️ Base de données (PostgreSQL — Neon)

```sql
-- Comptes utilisateurs
users (id, fullName, email, password_bcrypt, role, active, createdAt)

-- Triages médicaux
triages (id, sessionId, patientName, age, sexe, chiefComplaint,
         temperature, heartrate, resprate, o2sat, sbp, dbp, pain,
         niveauXgboostBrut, niveauFinal, niveauIa, niveauInfirmiere,
         motifModification, regleDeclenchee, detailsRegle, resumeClinique,
         createdBy, createdAt)

-- Audit log ISO 27001
audit_logs (id, userId, userName, action, details, ipAddress, timestamp)
```

---

## 📁 Structure du projet

```
frontend/
└── src/
    ├── api/          → auth.ts, triage.ts, history.ts, dashboard.ts, admin.ts
    ├── pages/        → Login, Dashboard, NewPatient, AgentIA, Result, History, Admin
    ├── components/   → EsiBadge, Sidebar, ...
    └── types/        → interfaces TypeScript

backend/
└── src/main/java/com/mediflow/
    ├── config/       → SecurityConfig.java, JwtAuthenticationFilter.java, DataInitializer.java
    ├── controller/   → AuthController, TriageController, HistoryController,
    │                   PatientsController, DashboardController, AdminController
    ├── service/      → AuthService, JwtService, TriageService, AuditLogService
    ├── repository/   → UserRepository, TriageRepository, AuditLogRepository
    ├── model/        → User, Triage, AuditLog, Role, AuditAction
    └── dto/          → LoginRequest, LoginResponse, PatientForm, TriageResult...

ai-service/
├── agent/
│   └── triage_agent.py      → LangChain + Mistral (dialogue 5 questions + résumé)
├── src/
│   └── safety_rules.py      → Règles NEWS2 déterministes (Point A + Point D)
├── utils/
│   └── orchestrator.py      → Orchestration XGBoost + règles de sécurité
├── models/
│   └── xgboost_triage_model.pkl
└── ai_service/
    └── main.py              → FastAPI (POST /triage/start, POST /triage/respond, GET /triage/result/{id})
```

---
