\# Pipeline Airflow — MediFlow AI



Automatise l'entraînement du modèle : nettoyage -> entraînement (baseline + tuned en parallèle) -> comparaison -> validation.



\## Lancer en local

1\. Copier ce dossier `airflow/` dans un dossier séparé (ex: `airflow-mediflow/`)

2\. Créer un fichier `.env` avec : `AIRFLOW\_UID=50000`

3\. Créer les dossiers vides : `dags`, `logs`, `plugins`, `config`

4\. Dans `docker-compose.yaml`, ajouter le chemin absolu du repo dans les volumes de `x-airflow-common`

5\. `docker compose build`

6\. `docker compose up airflow-init`

7\. `docker compose up -d`

8\. Ouvrir http://localhost:8080 (airflow / airflow)

