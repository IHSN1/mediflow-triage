"""
triage_agent.py — Étape 4 : Agent conversationnel avec Mistral (via LangChain)

CE QUE FAIT CE FICHIER, EN TRÈS SIMPLE :
Ce code crée un "agent" qui discute avec un patient pour recueillir plus de
détails sur ses symptômes (max 5 questions), puis rédige un résumé clinique
en français. Il NE FAIT AUCUN calcul de triage — cette décision reste
entièrement entre XGBoost et safety_rules.py. Cet agent parle, c'est tout.

PLACEMENT : ce fichier va dans le dossier agent/ de ton projet.
POUR LE TESTER : ouvre un terminal, active ton venv, puis :
    cd agent
    python triage_agent.py
(le fichier .env doit être à la racine du projet, un niveau au-dessus de agent/,
d'où le "../.env" plus bas — même logique que pour les chemins relatifs
qu'on a déjà vue avec prepare_data.py)
"""

import os
from dotenv import load_dotenv
from langchain_mistralai import ChatMistralAI
from langchain_core.messages import SystemMessage, HumanMessage

# Étape 1 : charger la clé API depuis le fichier .env (à la racine du projet)
load_dotenv(dotenv_path="../.env")
# NOTE : on ne vérifie PAS la présence de la clé ici, au niveau du module.
# La vérifier seulement au moment de créer un TriageAgent (dans __init__)
# permet d'importer ce fichier ailleurs (ex. depuis orchestrator.py) sans
# forcément avoir besoin de la clé si on ne s'en sert pas encore.

# Étape 2 : le "system prompt" — les instructions données UNE SEULE FOIS
# à l'IA, au tout début. Le patient ne les voit jamais. Ça définit tout
# le comportement de l'agent pour le reste de la conversation.
SYSTEM_PROMPT = """Tu es un assistant clinique d'aide au triage aux urgences.

RÔLE :
- Tu poses des questions de suivi courtes et pertinentes sur les symptômes du patient.
- Tu ne poses JAMAIS plus de 5 questions au total.
- Tu ne donnes JAMAIS de diagnostic, JAMAIS de niveau de triage, JAMAIS de conseil médical.
- Ton seul but est de recueillir de l'information claire pour le personnel soignant.

STYLE :
- Une seule question à la fois, simple, directe, sans jargon médical complexe.
- Ton neutre et professionnel, jamais alarmiste.

Si tu juges avoir assez d'information avant la 5e question, tu peux arrêter
plus tôt en disant simplement : "Merci, j'ai assez d'informations pour le moment."
"""


class TriageAgent:
    """
    Un objet qui représente UNE conversation avec UN patient.
    On en crée un nouveau à chaque nouveau patient.
    """

    def __init__(self, chief_complaint: str):
        """
        chief_complaint : le motif de consultation initial du patient,
        par exemple "douleur thoracique depuis ce matin".
        """
        if not os.getenv("MISTRAL_API_KEY"):
            raise ValueError(
                "MISTRAL_API_KEY introuvable. Vérifie que le fichier .env existe "
                "à la racine du projet (medical_triage_ai_agent/.env) et qu'il "
                "contient bien la ligne : MISTRAL_API_KEY=ta_clé_ici"
            )

        # ChatMistralAI = l'objet LangChain qui sait parler à l'API Mistral.
        # temperature=0.2 veut dire "réponses plutôt stables et prévisibles"
        # (proche de 0 = très factuel ; proche de 1 = plus créatif/varié).
        # Pour un contexte clinique, on veut de la stabilité, donc valeur basse.
        self.llm = ChatMistralAI(model="mistral-small-latest", temperature=0.2)

        self.max_questions = 5
        self.questions_asked = 0
        self.finished = False

        # CECI est toute la "mémoire" de la conversation : une simple liste
        # Python qui va grandir à chaque échange. On la renverra EN ENTIER
        # à Mistral à chaque appel, pour qu'il "se souvienne" de tout.
        self.messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(
                content=f"Motif de consultation initial du patient : {chief_complaint}. "
                         f"Pose ta première question de suivi."
            ),
        ]

    def _call_llm(self) -> str:
        """
        Envoie toute la liste self.messages à Mistral, récupère la réponse,
        l'ajoute à la liste (pour que le prochain appel s'en souvienne),
        et renvoie juste le texte de la réponse.
        """
        response = self.llm.invoke(self.messages)  # <- l'appel réseau réel a lieu ici
        self.messages.append(response)  # on garde la réponse dans l'historique
        return response.content

    def start(self) -> str:
        """Lance la conversation, retourne la toute première question de l'agent."""
        question = self._call_llm()
        self.questions_asked += 1
        return question

    def respond(self, patient_answer: str) -> str:
        """
        Envoie la réponse du patient à Mistral, retourne la question suivante
        (ou un message de fin si on a atteint la limite de 5 questions).
        """
        if self.finished:
            return "La conversation est déjà terminée."

        self.messages.append(HumanMessage(content=patient_answer))

        if self.questions_asked >= self.max_questions:
            self.finished = True
            return "Merci, j'ai assez d'informations pour le moment."

        next_message = self._call_llm()
        self.questions_asked += 1

        # Si le modèle a lui-même décidé d'arrêter plus tôt (voir system prompt)
        if "assez d'informations" in next_message.lower():
            self.finished = True

        return next_message

    def generate_summary(self) -> str:
        """
        Une fois la conversation terminée, demande à Mistral de rédiger
        UNIQUEMENT une recommandation clinique courte (orientation, examens
        à réaliser) à partir de tout l'historique.

        IMPORTANT — contrat avec le frontend (voir
        frontend/src/lib/clinicalSummary.ts) : ce texte constitue SEULEMENT
        le point 4 ("Recommandation") du résumé en 4 points affiché à
        l'écran. Les points 1 à 3 (motif, signes vitaux, antécédents) sont
        déjà reconstruits côté frontend à partir du formulaire patient et du
        dialogue — il ne faut donc PAS renvoyer ici un résumé structuré
        complet qui les redupliquerait, seulement la recommandation finale.
        """
        summary_request = HumanMessage(content=(
            "En te basant sur toute la conversation ci-dessus, rédige UNE SEULE "
            "phrase ou un court paragraphe de recommandation clinique en français : "
            "orientation à privilégier (ex. box de cardiologie, déchocage, "
            "consultation programmée) et examens complémentaires à envisager "
            "(ex. ECG, bilan biologique, imagerie). "
            "Ne répète PAS le motif de consultation, les signes vitaux ni les "
            "antécédents déjà évoqués : ils sont affichés séparément. "
            "N'utilise ni titre, ni liste numérotée, ni Markdown — un texte brut "
            "uniquement. Reste strictement factuel : ne donne aucun diagnostic, "
            "aucun niveau de priorité ESI, aucun conseil médical direct au patient."
        ))
        # On ne modifie pas self.messages ici : on construit une copie temporaire
        # + la demande de résumé, pour ne pas polluer l'historique si jamais
        # on voulait continuer la conversation après.
        temp_messages = self.messages + [summary_request]
        response = self.llm.invoke(temp_messages)
        return response.content


if __name__ == "__main__":
    # Mode test interactif : tu joues le rôle du patient directement
    # dans le terminal, pour vérifier que tout fonctionne avant de
    # brancher ça à l'interface Streamlit.
    print("=== Test interactif de l'agent de triage ===")
    print("(tape 'quit' à tout moment pour arrêter avant la fin)\n")

    chief_complaint = input("Motif de consultation initial du patient : ")

    agent = TriageAgent(chief_complaint)
    question = agent.start()
    print(f"\nAgent : {question}")

    while not agent.finished:
        answer = input("\nPatient : ")
        if answer.lower() == "quit":
            break
        question = agent.respond(answer)
        print(f"\nAgent : {question}")

    print("\n=== Résumé clinique généré ===")
    print(agent.generate_summary())