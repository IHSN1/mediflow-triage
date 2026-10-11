"""
ai_service/main.py — Service IA (FastAPI)

CE QUE FAIT CE FICHIER :
Expose le travail Python déjà écrit et testé (orchestrator.py, triage_agent.py)
via une API HTTP, respectant strictement le contrat défini dans
docs_contrat_api.md, pour que le backend Spring Boot de la binôme puisse
l'utiliser sans jamais lire le code Python.

PLACEMENT : ai_service/main.py à la racine du projet (dossier ai_service/).

POUR LE LANCER :
    cd ai_service
    uvicorn main:app --reload --port 8000

Documentation Swagger générée automatiquement sur : http://localhost:8000/docs
(FastAPI la génère seul, aucune ligne de code supplémentaire nécessaire)
"""

import os
import sys
import uuid
from typing import Optional, List

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# --- Chemins robustes vers src/, agent/, utils/ (même principe que partout ailleurs) ---
THIS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(THIS_DIR)
sys.path.append(os.path.join(PROJECT_ROOT, "utils"))
sys.path.append(os.path.join(PROJECT_ROOT, "agent"))

from orchestrator import predict_triage_level, _load_artifacts   # noqa: E402
from triage_agent import TriageAgent                              # noqa: E402

app = FastAPI(
    title="MediFlow AI — Service IA",
    description="Expose le modèle XGBoost, la couche de sécurité et l'agent "
                "conversationnel via une API REST, conformément au contrat "
                "d'intégration défini dans docs_contrat_api.md.",
    version="1.0.0",
)

# Le modèle et le vectoriseur sont chargés UNE SEULE FOIS au démarrage du
# service, pas à chaque requête -- charger un modèle depuis le disque à
# chaque appel serait lent et inutile.
_model, _vectorizer = _load_artifacts()

# Stockage en mémoire des conversations actives : session_id -> état.
# Un dictionnaire Python suffit pour un prototype académique ; en production
# à plus grande échelle, ce serait remplacé par un cache partagé (Redis).
_sessions: dict = {}


# ============================================================
# SCHÉMAS DE DONNÉES (contrat exact avec Spring Boot)
#
# IMPORTANT : Spring Boot (TriageService.java / FastApiStartRequest.java /
# RespondTriageRequest.java) envoie les signes vitaux À PLAT (pas d'objet
# "vitals" imbriqué) et nomme le champ de réponse patient "answer" (pas
# "patient_answer"). Les champs ci-dessous suivent donc EXACTEMENT ce que
# Spring envoie réellement, déjà vérifié et testé avec le frontend.
# ============================================================
class StartRequest(BaseModel):
    chief_complaint: str
    temperature: Optional[float] = None
    heartrate: Optional[float] = None
    resprate: Optional[float] = None
    o2sat: Optional[float] = None
    sbp: Optional[float] = None
    dbp: Optional[float] = None
    pain: Optional[float] = None


class StartResponse(BaseModel):
    session_id: str
    question: str


class RespondRequest(BaseModel):
    session_id: str
    answer: str


class RespondResponse(BaseModel):
    question: str
    finished: bool


class ResultResponse(BaseModel):
    niveau_xgboost_brut: int
    niveau_final: int
    regle_declenchee: Optional[str]
    details_regle: List[str]
    resume_clinique: str
    # Score NEWS2 total (voir src/safety_rules.py) : toujours calculé, même
    # quand aucune règle ne s'est déclenchée -- utile pour l'affichage dans
    # la section "Explicabilité" du frontend.
    news2_score: Optional[int] = None


def _error(error_code: str, message: str, status_code: int) -> JSONResponse:
    """Construit une réponse d'erreur au format convenu avec la binôme."""
    return JSONResponse(status_code=status_code, content={"error": error_code, "message": message})


# ============================================================
# ENDPOINT 1 — Démarrer un triage
# ============================================================
@app.post("/triage/start", response_model=StartResponse)
def start_triage(payload: StartRequest):
    """
    Démarre une nouvelle session de triage pour un patient.

    Paramètres :
        payload : identité implicite (chief_complaint obligatoire) + signes vitaux
            optionnels, tels qu'envoyés par Spring Boot (TriageService.start()).

    Retour :
        StartResponse (session_id généré ici + première question de l'agent),
        ou une erreur 503 "llm_unavailable" si Mistral est injoignable.

    Logique métier : crée un TriageAgent (dialogue uniquement — aucun calcul de
    triage à ce stade) et conserve son état ainsi que les signes vitaux/motif en
    mémoire (_sessions), pour les réutiliser inchangés à /triage/result une fois
    le dialogue terminé.
    """
    if not payload.chief_complaint.strip():
        raise HTTPException(
            status_code=422,
            detail=[{"msg": "chief_complaint ne peut pas être vide", "loc": ["body", "chief_complaint"]}],
        )

    session_id = str(uuid.uuid4())
    # vitals_dict : reconstruit ici (et non via payload.model_dump()) pour ne
    # garder que les clés attendues par predict_triage_level (VITAL_COLS),
    # sans y mêler chief_complaint qui fait partie du même objet StartRequest.
    vitals_dict = {
        "temperature": payload.temperature,
        "heartrate": payload.heartrate,
        "resprate": payload.resprate,
        "o2sat": payload.o2sat,
        "sbp": payload.sbp,
        "dbp": payload.dbp,
        "pain": payload.pain,
    }

    try:
        agent = TriageAgent(chief_complaint=payload.chief_complaint)
        premiere_question = agent.start()
    except Exception as e:
        return _error("llm_unavailable", f"Impossible de contacter l'agent conversationnel : {e}", 503)

    _sessions[session_id] = {
        "agent": agent,
        "vitals": vitals_dict,
        "chief_complaint": payload.chief_complaint,
    }

    return StartResponse(session_id=session_id, question=premiere_question)


# ============================================================
# ENDPOINT 2 — Répondre à une question
# ============================================================
@app.post("/triage/respond", response_model=RespondResponse)
def respond_triage(payload: RespondRequest):
    """
    Transmet la réponse du patient à l'agent et renvoie la question suivante.

    Paramètres :
        payload : session_id (obtenu à /triage/start) + answer (réponse brute
            saisie par l'infirmière au nom du patient).

    Retour :
        RespondResponse (question suivante, finished=True si l'agent a atteint
        sa limite de 5 questions ou décidé d'arrêter plus tôt), ou une erreur
        404 si la session est introuvable/expirée, 503 si Mistral est injoignable.

    Logique métier : ne fait aucun calcul de triage — se contente de faire
    avancer le dialogue de TriageAgent, dont l'état (historique des messages)
    vit en mémoire côté serveur pour la durée de la session.
    """
    session = _sessions.get(payload.session_id)
    if session is None:
        return _error("session_not_found", "Session introuvable ou expirée", 404)

    agent = session["agent"]
    try:
        next_message = agent.respond(payload.answer)
    except Exception as e:
        return _error("llm_unavailable", f"Erreur lors de l'appel à l'agent : {e}", 503)

    return RespondResponse(question=next_message, finished=agent.finished)


# ============================================================
# ENDPOINT 3 — Obtenir le résultat final
# ============================================================
@app.get("/triage/result/{session_id}", response_model=ResultResponse)
def get_result(session_id: str):
    """
    Calcule et renvoie le résultat final du triage pour une session terminée.

    Paramètres :
        session_id : identifiant de session obtenu à /triage/start.

    Retour :
        ResultResponse (niveau XGBoost brut, niveau final après règles de
        sécurité, règle éventuellement déclenchée + détails, score NEWS2,
        résumé clinique rédigé par Mistral), ou une erreur 404/500.

    Logique métier : c'est ici, et seulement ici, que le niveau ESI est
    réellement calculé — predict_triage_level() enchaîne la prédiction
    XGBoost puis la couche de règles NEWS2 (safety_rules.py), qui ne peut
    qu'escalader la priorité, jamais la réduire (voir DOCUMENTATION.md).
    generate_summary() est appelé dans le même bloc try : un échec du résumé
    Mistral fait échouer tout l'endpoint (500), le niveau ESI n'est renvoyé
    que si le résumé a lui aussi pu être généré.
    """
    session = _sessions.get(session_id)
    if session is None:
        return _error("session_not_found", "Session introuvable ou expirée", 404)

    agent = session["agent"]

    try:
        classification = predict_triage_level(
            session["vitals"], session["chief_complaint"], _model, _vectorizer
        )
        resume = agent.generate_summary()
    except Exception as e:
        return _error("internal_error", f"Erreur lors du calcul du résultat : {e}", 500)

    return ResultResponse(
        niveau_xgboost_brut=classification["niveau_xgboost_brut"],
        niveau_final=classification["niveau_final"],
        regle_declenchee=classification["regle_declenchee"],
        details_regle=classification["details_regle"],
        resume_clinique=resume,
        news2_score=classification["news2_score"],
    )


@app.get("/health")
def health_check():
    """Endpoint simple pour vérifier que le service tourne (utile pour Docker healthcheck)."""
    return {"status": "ok"}