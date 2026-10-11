"""
test_safety_rules.py
=====================

Tests unitaires de la couche de règles de sécurité.

Pourquoi ces tests sont importants (pas juste "bonne pratique") :
C'est la seule partie du système qui peut rattraper une erreur grave
du modèle XGBoost. Si cette couche a un bug, tout l'argument de sécurité
du rapport (section 3, ISO 14971) s'effondre. On teste donc explicitement
la règle absolue : ESCALADE UNIQUEMENT, JAMAIS DE DÉGRADATION.

Lancer avec : python -m pytest src/test_safety_rules.py -v
(ou juste : python src/test_safety_rules.py si pytest n'est pas installé)
"""

from safety_rules import appliquer_regles_securite


def test_spo2_critique_force_niveau_1():
    """SpO2 < 90% doit forcer le niveau 1, même si XGBoost prédit niveau 4."""
    resultat = appliquer_regles_securite(niveau_predit=4, vitals={"o2sat": 82})
    assert resultat.niveau_final == 1
    assert resultat.regle_declenchee is not None


def test_signes_vitaux_anormaux_force_niveau_2():
    """Fréquence cardiaque très élevée doit forcer au moins le niveau 2."""
    resultat = appliquer_regles_securite(niveau_predit=3, vitals={"heartrate": 130})
    assert resultat.niveau_final == 2


def test_regle_ne_baisse_jamais_la_priorite():
    """
    TEST LE PLUS IMPORTANT DU PROJET.
    Si XGBoost prédit déjà un niveau plus urgent que ce que suggèrent
    les règles, le niveau final doit rester celui de XGBoost (le plus urgent).
    Ex : XGBoost dit niveau 1 (très urgent), les règles ne voient rien
    d'anormal -> le niveau final doit rester 1, pas remonter à 3.
    """
    resultat = appliquer_regles_securite(niveau_predit=1, vitals={"o2sat": 98, "heartrate": 75})
    assert resultat.niveau_final == 1
    assert resultat.regle_declenchee is None


def test_aucune_donnee_vitale_ne_bloque_pas():
    """Si les signes vitaux sont absents (dict vide), pas d'erreur, niveau inchangé."""
    resultat = appliquer_regles_securite(niveau_predit=3, vitals={})
    assert resultat.niveau_final == 3


def test_valeurs_normales_ne_declenchent_rien():
    """Des signes vitaux parfaitement normaux ne doivent déclencher aucune règle."""
    vitals_normaux = {"o2sat": 98, "heartrate": 72, "resprate": 15, "sbp": 118, "temperature": 37.0}
    resultat = appliquer_regles_securite(niveau_predit=3, vitals=vitals_normaux)
    assert resultat.niveau_final == 3
    assert resultat.regle_declenchee is None


def test_niveau_1_prioritaire_sur_niveau_2():
    """
    Si un patient a À LA FOIS un critère Niveau 1 (SpO2 critique)
    ET un critère Niveau 2 (fréquence cardiaque limite), le niveau 1
    (le plus grave) doit l'emporter, pas le niveau 2.
    """
    resultat = appliquer_regles_securite(niveau_predit=4, vitals={"o2sat": 85, "heartrate": 105})
    assert resultat.niveau_final == 1


def _executer_tests_sans_pytest():
    """Permet de lancer les tests même si pytest n'est pas installé."""
    tests = [
        test_spo2_critique_force_niveau_1,
        test_signes_vitaux_anormaux_force_niveau_2,
        test_regle_ne_baisse_jamais_la_priorite,
        test_aucune_donnee_vitale_ne_bloque_pas,
        test_valeurs_normales_ne_declenchent_rien,
        test_niveau_1_prioritaire_sur_niveau_2,
    ]
    reussis, echoues = 0, 0
    for test in tests:
        try:
            test()
            print(f"  OK   - {test.__name__}")
            reussis += 1
        except AssertionError:
            print(f"  ECHEC - {test.__name__}")
            echoues += 1
    print(f"\nRésultat : {reussis} réussi(s), {echoues} échoué(s)")


if __name__ == "__main__":
    _executer_tests_sans_pytest()