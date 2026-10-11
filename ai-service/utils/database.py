"""
database.py — Étape 6 : Stockage PostgreSQL (Neon) de l'historique des triages

CE QUE FAIT CE FICHIER :
Gère l'historique des triages dans une vraie base PostgreSQL hébergée sur
Neon (gratuit), plutôt qu'un simple fichier SQLite local.

POURQUOI CE CHANGEMENT (raison technique, pas juste "c'est plus demandé") :
Le système de fichiers de Streamlit Cloud (version gratuite) est éphémère :
à chaque redémarrage/redéploiement de l'app, un fichier SQLite local risque
d'être réinitialisé -- tu perdrais tout l'historique. PostgreSQL sur Neon
est une base externe et persistante : l'historique survit aux redémarrages
de ton app Streamlit.

CE QU'IL FAUT AVANT DE LANCER CE FICHIER :
1. Un compte gratuit sur neon.tech, un projet créé
2. La "Connection string" copiée depuis le dashboard Neon (commence par
   "postgresql://...")
3. Cette ligne ajoutée dans le fichier .env à la racine du projet :
   DATABASE_URL=ta_connection_string_ici
"""

import os
import json
import pandas as pd
import psycopg2
from sqlalchemy import create_engine
from dotenv import load_dotenv

# Chemin robuste vers le .env à la racine du projet, même principe qu'ailleurs
THIS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(THIS_DIR)
load_dotenv(dotenv_path=os.path.join(PROJECT_ROOT, ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")

# SQLAlchemy est utilisé UNIQUEMENT pour pd.read_sql_query (get_history) --
# pandas recommande officiellement un moteur SQLAlchemy plutôt qu'une connexion
# psycopg2 brute pour cette fonction précise, pour un support plus robuste.
# Pour l'écriture (save_triage, init_db), on garde psycopg2 directement,
# plus simple pour de l'INSERT/CREATE TABLE classique.
_engine = None


def _get_engine():
    global _engine
    if _engine is None:
        if not DATABASE_URL:
            raise ValueError(
                "DATABASE_URL introuvable. Vérifie que le fichier .env contient "
                "bien la ligne : DATABASE_URL=ta_connection_string_neon"
            )
        _engine = create_engine(DATABASE_URL)
    return _engine


def _get_connection():
    """Ouvre une nouvelle connexion à la base Postgres à chaque appel.
    (Pour un prototype académique à faible trafic, rouvrir une connexion
    à chaque opération est largement suffisant -- pas besoin d'un pool
    de connexions, qui ajouterait de la complexité sans bénéfice réel ici.)
    """
    if not DATABASE_URL:
        raise ValueError(
            "DATABASE_URL introuvable. Vérifie que le fichier .env contient "
            "bien la ligne : DATABASE_URL=ta_connection_string_neon"
        )
    return psycopg2.connect(DATABASE_URL)


def init_db():
    """Crée la table 'triages' si elle n'existe pas encore."""
    conn = _get_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS triages (
            id SERIAL PRIMARY KEY,
            date_heure TIMESTAMP DEFAULT NOW(),
            motif TEXT,
            signes_vitaux TEXT,
            niveau_xgboost_brut INTEGER,
            niveau_final INTEGER,
            regle_declenchee TEXT,
            resume_clinique TEXT
        )
    """)
    conn.commit()
    cur.close()
    conn.close()


def save_triage(motif: str, vitals: dict, resultat: dict, resume: str):
    """
    Enregistre un triage complet.
    NOTE TECHNIQUE : psycopg2 utilise '%s' comme marqueur de paramètre,
    contrairement à sqlite3 qui utilise '?' -- c'est la principale
    différence de syntaxe entre les deux, le reste est très similaire.
    """
    conn = _get_connection()
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO triages
           (motif, signes_vitaux, niveau_xgboost_brut, niveau_final,
            regle_declenchee, resume_clinique)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (
            motif,
            json.dumps(vitals),
            resultat["niveau_xgboost_brut"],
            resultat["niveau_final"],
            resultat["regle_declenchee"] or "",
            resume,
        ),
    )
    conn.commit()
    cur.close()
    conn.close()


def get_history() -> pd.DataFrame:
    """Renvoie tout l'historique, du plus récent au plus ancien."""
    engine = _get_engine()
    df = pd.read_sql_query("SELECT * FROM triages ORDER BY id DESC", engine)
    return df


def get_stats() -> dict:
    """Statistiques simples pour la page Dashboard."""
    df = get_history()
    if df.empty:
        return {"total": 0, "niveau_1": 0, "niveau_2": 0, "niveau_3": 0}
    return {
        "total": len(df),
        "niveau_1": int((df["niveau_final"] == 1).sum()),
        "niveau_2": int((df["niveau_final"] == 2).sum()),
        "niveau_3": int((df["niveau_final"] == 3).sum()),
    }


if __name__ == "__main__":
    # Petit test rapide : crée la table, insère un faux triage, relit l'historique
    init_db()
    faux_resultat = {"niveau_xgboost_brut": 2, "niveau_final": 1, "regle_declenchee": "Point A (test)"}
    save_triage(
        motif="test unitaire",
        vitals={"o2sat": 85, "heartrate": 120},
        resultat=faux_resultat,
        resume="Ceci est un résumé de test.",
    )
    print("=== Historique après insertion de test ===")
    print(get_history())
    print("\n=== Statistiques ===")
    print(get_stats())