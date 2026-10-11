"""
orchestrator.py — Le "chef d'orchestre" du projet

CE QUE FAIT CE FICHIER :
Relie les 3 pièces déjà construites, pour UN patient donné :
1. XGBoost (models/xgboost_triage_model.pkl) -> prédit un niveau brut
2. safety_rules.py -> vérifie les seuils vitaux, ne peut que remonter le niveau
3. TriageAgent (agent/triage_agent.py) -> dialogue et résumé clinique

PLACEMENT : ce fichier va dans le dossier utils/ de ton projet.

POURQUOI DES CHEMINS "os.path.dirname(__file__)" ET PAS "../data/..." :
On a déjà eu plusieurs fois le problème des chemins relatifs qui changent
de sens selon le dossier depuis lequel on lance Python. Ici, on calcule le
chemin ABSOLU du dossier où SE TROUVE ce fichier, puis on construit tous les
autres chemins à partir de lui. Résultat : ce script fonctionne peu importe
d'où tu le lances (VS Code, terminal, ou plus tard depuis Streamlit) --
plus jamais de PermissionError ou FileNotFoundError liés au dossier courant.
"""

import os
import sys
import numpy as np
from scipy import sparse
import joblib

# --- Construction de chemins robustes, indépendants du dossier de lancement ---
THIS_DIR = os.path.dirname(os.path.abspath(__file__))       # .../medical_triage_ai_agent/utils
PROJECT_ROOT = os.path.dirname(THIS_DIR)                     # .../medical_triage_ai_agent

SRC_DIR = os.path.join(PROJECT_ROOT, "src")
AGENT_DIR = os.path.join(PROJECT_ROOT, "agent")
MODELS_DIR = os.path.join(PROJECT_ROOT, "models")
PROCESSED_DIR = os.path.join(PROJECT_ROOT, "data", "processed")

# On ajoute src/ et agent/ à la liste des dossiers où Python cherche les modules,
# pour pouvoir importer safety_rules.py et triage_agent.py depuis ici.
sys.path.append(SRC_DIR)
sys.path.append(AGENT_DIR)

from safety_rules import appliquer_regles_securite   # vient de src/safety_rules.py
from triage_agent import TriageAgent                  # vient de agent/triage_agent.py

# Même ordre de colonnes que dans prepare_data.py / train_model.py -- important
# de garder EXACTEMENT le même ordre, sinon le modèle reçoit les bonnes valeurs
# dans les mauvaises colonnes sans lever d'erreur (bug silencieux dangereux).
VITAL_COLS = ["temperature", "heartrate", "resprate", "o2sat", "sbp", "dbp", "pain"]


def _load_artifacts():
    """Charge le modèle XGBoost et le vectoriseur TF-IDF déjà entraînés."""
    model = joblib.load(os.path.join(MODELS_DIR, "xgboost_triage_model.pkl"))
    vectorizer = joblib.load(os.path.join(PROCESSED_DIR, "tfidf_vectorizer.pkl"))
    return model, vectorizer


def predict_triage_level(vitals: dict, chief_complaint: str, model=None, vectorizer=None) -> dict:
    """
    Prend les signes vitaux + motif de consultation d'UN patient,
    retourne le niveau XGBoost brut, le niveau final après règles de sécurité,
    et le détail de la règle si elle a été déclenchée.

    vitals : dict avec les clés de VITAL_COLS (valeurs manquantes = np.nan ou absentes)
    chief_complaint : texte libre du motif de consultation
    model, vectorizer : passe-les en argument si tu les as déjà chargés ailleurs
                        (évite de recharger le modèle à chaque patient dans Streamlit)
    """
    if model is None or vectorizer is None:
        model, vectorizer = _load_artifacts()

    # 1) Reconstituer le vecteur de features EXACTEMENT comme à l'entraînement
    vitals_vector = np.array([[vitals.get(col, np.nan) for col in VITAL_COLS]], dtype=float)
    text_vector = vectorizer.transform([chief_complaint])
    X = sparse.hstack([sparse.csr_matrix(vitals_vector), text_vector]).tocsr()

    # 2) Prédiction XGBoost (rappel : le modèle a été entraîné avec labels 0,1,2
    #    au lieu de 1,2,3 -- voir train_model.py -- donc on rajoute +1 ici)
    niveau_predit = int(model.predict(X)[0]) + 1

    # 3) Passage par la couche de sécurité -- ne peut QUE remonter la priorité
    resultat_regles = appliquer_regles_securite(niveau_predit, vitals)

    return {
        "niveau_xgboost_brut": niveau_predit,
        "niveau_final": resultat_regles.niveau_final,
        "regle_declenchee": resultat_regles.regle_declenchee,
        "details_regle": resultat_regles.details,
        # Nommé "news2_score" (et non "score_news2") pour correspondre
        # exactement à la clé JSON attendue par ai_service/main.py, Spring
        # Boot et le frontend (voir TriageResultResponse.java / types/index.ts).
        "news2_score": resultat_regles.score_news2,
    }


if __name__ == "__main__":
    # Test rapide en ligne de commande, à faire AVANT de brancher Streamlit
    print("=== Test du chef d'orchestre (XGBoost + règles de sécurité) ===\n")

    exemple_vitals = {
        "temperature": 37.2, "heartrate": 130, "resprate": 24,
        "o2sat": 91, "sbp": 100, "dbp": 65, "pain": 7,
    }
    exemple_motif = "chest pain radiating to arm"

    resultat = predict_triage_level(exemple_vitals, exemple_motif)
    print(f"Motif : {exemple_motif}")
    print(f"Signes vitaux : {exemple_vitals}\n")
    for cle, valeur in resultat.items():
        print(f"  {cle} : {valeur}")

    print("\n=== Démarrage du dialogue avec l'agent (nécessite ta clé Mistral) ===")
    try:
        agent = TriageAgent(chief_complaint=exemple_motif)
        premiere_question = agent.start()
        print("Agent :", premiere_question)
    except Exception as e:
        print(f"(Dialogue non testé ici : {e})")