# MediFlow AI — Frontend

Interface clinique pour MediFlow AI, une plateforme d'aide au triage médical aux urgences (échelle ESI 1 à 5, règles de sécurité, explicabilité des décisions).

Ce dépôt contient **uniquement le frontend** (React, TypeScript, TanStack Start, Tailwind CSS, shadcn/ui). Aucun backend réel n'est branché : les appels réseau sont simulés dans `src/api/` avec un délai artificiel, prêts à être remplacés par de vrais appels `fetch` sans toucher aux composants.

## Stack technique

- [TanStack Start](https://tanstack.com/start) (React 19, SSR, file-based routing via `src/routes/`)
- [TanStack Router](https://tanstack.com/router) + [TanStack Query](https://tanstack.com/query)
- Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com) (`new-york` style)
- Vite 8 + Nitro

## Démarrage

Nécessite Node.js et [Bun](https://bun.sh).

```sh
bun install
bun run dev
```

Autres scripts :

```sh
bun run build     # build de production
bun run preview   # sert le build de production
bun run lint       # eslint
bun run format     # prettier --write
```

## Architecture backend cible (à connecter séparément)

```
[Frontend React]
       │
       ▼ REST API (port 8080)
[Spring Boot]
  ├── Auth (JWT)
  ├── Patients / Historique (PostgreSQL)
  ├── Gestion comptes
       │
       ▼ HTTP interne (port 8000)
[FastAPI — Service IA]
  ├── POST /triage/start    → démarre la session LangChain
  ├── POST /triage/respond  → tour de dialogue suivant
  └── GET  /triage/result   → résultat XGBoost + règles + résumé LLM
```

Le frontend n'appelle jamais FastAPI directement — tout passe par Spring Boot qui agit comme gateway. Toutes les fonctions réseau mock à remplacer vivent dans `src/api/` (une fonction par action).

## Rôles utilisateurs

| Rôle           | Pages visibles                                                       |
| -------------- | -------------------------------------------------------------------- |
| Infirmier(ère) | Tableau de bord · Nouveau patient · Agent IA · Résultat · Historique |
| Médecin        | Tableau de bord · Liste des patients                                 |
| Administrateur | Administration uniquement (aucun accès aux données patients)         |

## Contrat de données

### Résultat d'un triage (FastAPI → Frontend)

```json
{
  "niveau_xgboost_brut": 3,
  "niveau_final": 2,
  "regle_declenchee": "Point D (signes vitaux anormaux)",
  "details_regle": [
    "SpO2 = 91% (sous le seuil normal)",
    "Fréquence cardiaque 112 bpm",
    "Douleur thoracique irradiante"
  ],
  "resume_clinique": "1) Motif de consultation : douleur thoracique irradiante vers le bras gauche depuis 2 heures, intensité 7/10.\n2) Signes vitaux : TA 148/92 mmHg, FC 112 bpm, FR 22/min, SpO2 91% AA, T° 37.2°C.\n3) Antécédents rapportés : HTA connue, tabagisme actif (20 PA).\n4) Recommandation : orientation prioritaire vers box de cardiologie, ECG 12 dérivations à réaliser immédiatement, bilan biologique (troponines, D-dimères)."
}
```

`regle_declenchee` vaut `null` (aucune règle, niveau issu directement du modèle), `"Point A (sauvetage immédiat)"` (escalade vers ESI 1) ou `"Point D (signes vitaux anormaux)"` (escalade vers ESI 2).

### Formulaire nouveau patient (Frontend → Spring Boot → FastAPI)

```json
{
  "chief_complaint": "Douleur thoracique irradiante vers le bras gauche depuis 2 heures",
  "temperature": 37.2,
  "heartrate": 112,
  "resprate": 22,
  "o2sat": 91,
  "sbp": 148,
  "dbp": 92,
  "pain": 7
}
```

Les interfaces TypeScript dans `src/types/index.ts` reprennent exactement ces noms de champs (snake_case, sans renommage en camelCase).

## Structure du code

```
src/
├── api/            → une fonction par action réseau (auth, triage, history, dashboard, admin)
├── components/      → composants partagés (EsiBadge, Sidebar, AppShell, ...) + ui/ (shadcn)
├── pages/           → composants de page
├── routes/          → routes TanStack Start (file-based), chacune monte un composant de pages/
└── types/           → interfaces TypeScript du contrat de données
```
