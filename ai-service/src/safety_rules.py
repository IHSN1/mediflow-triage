"""
safety_rules.py
================

Couche de règles de sécurité déterministes, basée sur le NEWS2
(National Early Warning Score 2).

POURQUOI LE NEWS2, ET PAS DES SEUILS INVENTÉS :
Le NEWS2 est un système de score clinique publié par le Royal College of
Physicians (2017), mandaté par le NHS England dans tous les hôpitaux aigus
depuis 2018, et validé sur des centaines de milliers de patients dans de
nombreuses études (voir sources en bas de fichier). Ce n'est pas un choix
arbitraire -- c'est un outil réellement déployé à grande échelle, pensé
précisément pour ce problème : distinguer un signe isolé mais franchement
dangereux d'une combinaison de signes seulement modérément anormaux.

ADAPTATION FAITE ICI, À ASSUMER CLAIREMENT EN SOUTENANCE :
Le NEWS2 officiel utilise 6 paramètres (fréquence respiratoire, SpO2,
tension systolique, fréquence cardiaque, température, ET le niveau de
conscience, plus le statut "sous oxygène ou non"). Le dataset utilisé
dans ce projet (MIMIC-IV-ED, table triage.csv) ne contient ni le niveau
de conscience, ni le statut d'oxygénothérapie -- seulement 5 des 6
paramètres sont donc utilisés ici. C'est une adaptation nécessaire et
documentée, pas le NEWS2 complet.

RÈGLE ABSOLUE (inchangée, justifiée par l'analyse de risques ISO 14971,
risque n°1 - faux négatif critique) :
    Cette couche peut UNIQUEMENT rendre un patient plus prioritaire.
    Elle ne peut JAMAIS le rendre moins prioritaire.
"""

from dataclasses import dataclass, field


@dataclass
class ResultatRegles:
    niveau_predit_xgboost: int
    niveau_suggere_par_regles: int | None
    niveau_final: int
    regle_declenchee: str | None
    score_news2: int
    details: list[str] = field(default_factory=list)


def _score_resprate(resprate) -> tuple[int, str | None]:
    """Fréquence respiratoire (/min) -- barème officiel NEWS2."""
    if resprate is None:
        return 0, None
    if resprate <= 8 or resprate >= 25:
        return 3, f"Fréquence respiratoire = {resprate}/min (score NEWS2 = 3)"
    if 21 <= resprate <= 24:
        return 2, f"Fréquence respiratoire = {resprate}/min (score NEWS2 = 2)"
    if 9 <= resprate <= 11:
        return 1, f"Fréquence respiratoire = {resprate}/min (score NEWS2 = 1)"
    return 0, None


def _score_o2sat(o2sat) -> tuple[int, str | None]:
    """SpO2 (%) -- barème officiel NEWS2, échelle 1 (patients standards)."""
    if o2sat is None:
        return 0, None
    if o2sat <= 91:
        return 3, f"SpO2 = {o2sat}% (score NEWS2 = 3)"
    if 92 <= o2sat <= 93:
        return 2, f"SpO2 = {o2sat}% (score NEWS2 = 2)"
    if 94 <= o2sat <= 95:
        return 1, f"SpO2 = {o2sat}% (score NEWS2 = 1)"
    return 0, None


def _score_sbp(sbp) -> tuple[int, str | None]:
    """Tension artérielle systolique (mmHg) -- barème officiel NEWS2."""
    if sbp is None:
        return 0, None
    if sbp <= 90 or sbp >= 220:
        return 3, f"Tension systolique = {sbp} mmHg (score NEWS2 = 3)"
    if 91 <= sbp <= 100:
        return 2, f"Tension systolique = {sbp} mmHg (score NEWS2 = 2)"
    if 101 <= sbp <= 110:
        return 1, f"Tension systolique = {sbp} mmHg (score NEWS2 = 1)"
    return 0, None


def _score_heartrate(heartrate) -> tuple[int, str | None]:
    """Fréquence cardiaque (/min) -- barème officiel NEWS2."""
    if heartrate is None:
        return 0, None
    if heartrate <= 40 or heartrate >= 131:
        return 3, f"Fréquence cardiaque = {heartrate}/min (score NEWS2 = 3)"
    if 111 <= heartrate <= 130:
        return 2, f"Fréquence cardiaque = {heartrate}/min (score NEWS2 = 2)"
    if 41 <= heartrate <= 50 or 91 <= heartrate <= 110:
        return 1, f"Fréquence cardiaque = {heartrate}/min (score NEWS2 = 1)"
    return 0, None


def _score_temperature(temperature) -> tuple[int, str | None]:
    """Température (°C) -- barème officiel NEWS2."""
    if temperature is None:
        return 0, None
    if temperature <= 35.0:
        return 3, f"Température = {temperature}°C (score NEWS2 = 3)"
    if temperature >= 39.1:
        return 2, f"Température = {temperature}°C (score NEWS2 = 2)"
    if 35.1 <= temperature <= 36.0 or 38.1 <= temperature <= 39.0:
        return 1, f"Température = {temperature}°C (score NEWS2 = 1)"
    return 0, None


def calculer_score_news2(vitals: dict) -> tuple[int, int, list[str]]:
    """
    Calcule le score NEWS2 total (adapté, 5 paramètres disponibles).

    Retourne :
    - le score total (somme des 5 sous-scores)
    - le score individuel maximum atteint (pour la règle "1 seul
      paramètre à 3 déclenche, peu importe le total")
    - la liste des détails de chaque paramètre anormal
    """
    fonctions = [_score_resprate, _score_o2sat, _score_sbp, _score_heartrate, _score_temperature]
    cles = ["resprate", "o2sat", "sbp", "heartrate", "temperature"]

    score_total = 0
    score_max_individuel = 0
    details = []

    for fonction, cle in zip(fonctions, cles):
        score, detail = fonction(vitals.get(cle))
        score_total += score
        score_max_individuel = max(score_max_individuel, score)
        if detail is not None:
            details.append(detail)

    return score_total, score_max_individuel, details


def appliquer_regles_securite(niveau_predit: int, vitals: dict) -> ResultatRegles:
    """
    Applique les seuils d'escalade officiels du NEWS2 :
    - un score ≥7 sur le total, OU un score de 3 sur un seul paramètre
      (peu importe le total) -> équivalent "réponse d'urgence" -> Niveau 1
    - un score total de 5 ou 6 -> "revue clinique urgente" -> Niveau 2
    - un score total de 1 à 4 -> surveillance infirmière renforcée,
      mais pas de remontée automatique du niveau ESI
    - un score de 0 -> rien à signaler

    Comme toujours : niveau_final = min(niveau_predit, niveau_suggéré),
    donc la priorité ne peut jamais être abaissée par cette couche.
    """
    score_total, score_max_individuel, details = calculer_score_news2(vitals)

    if score_max_individuel >= 3 and score_total < 7:
        # Un seul paramètre franchement anormal déclenche seul, même si le
        # total reste bas -- distinct du cas "score total >= 7" ci-dessous
        # pour ne jamais annoncer un total >= 7 qui serait faux.
        niveau_suggere = 1
        regle = "NEWS2 — Paramètre isolé à 3 : intervention immédiate"
    elif score_total >= 7:
        niveau_suggere = 1
        regle = "NEWS2 — Score ≥ 7 : intervention immédiate"
    elif score_total >= 5:
        niveau_suggere = 2
        regle = "NEWS2 — Score 5-6 : revue clinique urgente"
    else:
        niveau_suggere = None
        regle = None

    if niveau_suggere is not None:
        niveau_final = min(niveau_predit, niveau_suggere)
    else:
        niveau_final = niveau_predit

    regle_declenchee_finale = regle if niveau_final != niveau_predit else None
    # Le détail par paramètre + une ligne de total, uniquement quand la règle
    # a réellement changé le niveau (même logique que regle_declenchee).
    details_finaux = (
        [*details, f"Total NEWS2 = {score_total}"] if regle_declenchee_finale else []
    )

    return ResultatRegles(
        niveau_predit_xgboost=niveau_predit,
        niveau_suggere_par_regles=niveau_suggere,
        niveau_final=niveau_final,
        regle_declenchee=regle_declenchee_finale,
        score_news2=score_total,
        details=details_finaux,
    )


if __name__ == "__main__":
    print("=== Exemple 1 : UN SEUL signe franchement anormal (FC à 135) ===")
    r = appliquer_regles_securite(3, {"heartrate": 135, "o2sat": 98, "resprate": 16, "sbp": 120, "temperature": 37.0})
    print(f"  Score NEWS2 total : {r.score_news2}")
    print(f"  Niveau final : {r.niveau_final} (attendu : 1, un seul paramètre à 3 déclenche seul)")
    print(f"  Détails : {r.details}\n")

    print("=== Exemple 2 : plusieurs signes MODÉRÉMENT anormaux ===")
    r = appliquer_regles_securite(3, {"heartrate": 105, "resprate": 22, "sbp": 95, "o2sat": 98, "temperature": 37.0})
    print(f"  Score NEWS2 total : {r.score_news2}")
    print(f"  Niveau final : {r.niveau_final}")
    print(f"  Détails : {r.details}\n")

    print("=== Exemple 3 : un seul signe légèrement anormal (FC à 95) ===")
    r = appliquer_regles_securite(3, {"heartrate": 95, "o2sat": 98, "resprate": 16, "sbp": 120, "temperature": 37.0})
    print(f"  Score NEWS2 total : {r.score_news2}")
    print(f"  Niveau final : {r.niveau_final} (attendu : 3, inchangé -- score trop faible)\n")

    print("=== Exemple 4 : signes parfaitement normaux ===")
    r = appliquer_regles_securite(3, {"heartrate": 75, "o2sat": 98, "resprate": 16, "sbp": 120, "temperature": 37.0})
    print(f"  Score NEWS2 total : {r.score_news2}")
    print(f"  Niveau final : {r.niveau_final} (attendu : 3, inchangé)")

# ---------------------------------------------------------------------------
# SOURCES (à citer dans le rapport) :
# - Royal College of Physicians. National Early Warning Score (NEWS) 2.
#   Standardising the assessment of acute-illness severity in the NHS.
#   Updated report of a working party. London: RCP, 2017.
# - NHS England & NHS Improvement. Patient Safety Alert: NEWS2, avril 2018.
# - NICE. National Early Warning Score systems that alert to deteriorating
#   adult patients in hospital. Advice MIB205.
# ---------------------------------------------------------------------------