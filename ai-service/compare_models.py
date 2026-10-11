"""
compare_models.py — Comparaison systématique de plusieurs modèles

CE QUE FAIT CE FICHIER :
Au lieu de choisir XGBoost directement, ce script entraîne PLUSIEURS
modèles sur les mêmes données préparées (train.csv, test.csv, TF-IDF),
et compare leurs résultats avec la même méthode d'évaluation (F1-macro).

MODÈLES TESTÉS, DU PLUS SIMPLE AU PLUS COMPLEXE :
1. Arbre de décision (Decision Tree) — simple, interprétable, sert de référence
2. Régression logistique — modèle linéaire classique, très utilisé en clinique
3. Random Forest — plusieurs arbres combinés, plus robuste qu'un seul arbre
4. XGBoost — la méthode déjà justifiée par la littérature (Scientific Reports 2025)

POURQUOI CETTE DÉMARCHE, PAS JUSTE "XGBOOST DIRECTEMENT" :
En recherche comme en ingénierie, on ne choisit pas un modèle complexe sans
prouver qu'il apporte un vrai gain par rapport à des modèles plus simples.
Un arbre de décision est rapide à entraîner et facile à expliquer ; s'il
faisait aussi bien que XGBoost, il n'y aurait aucune raison de préférer un
modèle plus complexe. Ce script sert justement à vérifier ça, sur nos
propres données, pas seulement sur la base d'un article externe.

PLACEMENT : src/compare_models.py (à côté de prepare_data.py et train_model.py)
"""

import pandas as pd
import numpy as np
from scipy import sparse
import joblib
import os

from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.pipeline import make_pipeline
import xgboost as xgb
from sklearn.metrics import f1_score, classification_report
from sklearn.model_selection import StratifiedKFold, cross_val_score

PROCESSED_DIR = "../data/processed"
VITAL_COLS = ["temperature", "heartrate", "resprate", "o2sat", "sbp", "dbp", "pain"]


def load_features():
    """Recharge exactement les mêmes features que train_model.py (aucune divergence)."""
    train_df = pd.read_csv(f"{PROCESSED_DIR}/train.csv")
    test_df = pd.read_csv(f"{PROCESSED_DIR}/test.csv")

    X_train_tfidf = sparse.load_npz(f"{PROCESSED_DIR}/X_train_tfidf.npz")
    X_test_tfidf = sparse.load_npz(f"{PROCESSED_DIR}/X_test_tfidf.npz")

    for df_ in (train_df, test_df):
        df_["pain"] = pd.to_numeric(df_["pain"], errors="coerce")

    X_train_vitals = train_df[VITAL_COLS].values.astype(float)
    X_test_vitals = test_df[VITAL_COLS].values.astype(float)

    X_train = sparse.hstack([sparse.csr_matrix(X_train_vitals), X_train_tfidf]).tocsr()
    X_test = sparse.hstack([sparse.csr_matrix(X_test_vitals), X_test_tfidf]).tocsr()

    y_train = train_df["acuity"].values
    y_test = test_df["acuity"].values

    return X_train, X_test, y_train, y_test


def get_candidate_models():
    """
    La liste des modèles à comparer, du plus simple au plus complexe.

    DÉCOUVERTE IMPORTANTE, À MENTIONNER TELLE QUELLE :
    Contrairement à XGBoost, l'Arbre de décision, la Régression logistique
    et le Random Forest ne gèrent PAS nativement les valeurs manquantes
    (NaN) dans les signes vitaux -- ils lèvent une erreur si on essaie.
    On leur ajoute donc une étape d'imputation (remplacement des valeurs
    manquantes par la médiane de chaque colonne) via un pipeline, UNIQUEMENT
    pour ces 3 modèles -- XGBoost, lui, reçoit les données brutes, sans
    imputation, exactement comme prévu dans l'architecture initiale.
    C'est un vrai avantage pratique de XGBoost, indépendant de sa
    performance brute : moins de prétraitement, moins d'hypothèses
    injectées artificiellement dans les données.
    """
    imputer = SimpleImputer(strategy="median")
    return {
        "Arbre de décision": make_pipeline(imputer, DecisionTreeClassifier(max_depth=5, random_state=42)),
        "Régression logistique": make_pipeline(imputer, LogisticRegression(max_iter=1000, random_state=42)),
        "Random Forest": make_pipeline(imputer, RandomForestClassifier(n_estimators=100, random_state=42)),
        "XGBoost": xgb.XGBClassifier(
            objective="multi:softprob", num_class=3, eval_metric="mlogloss",
            random_state=42, n_estimators=100,
        ),
    }


def evaluate_with_cross_validation(models, X_train, y_train):
    """
    Compare les modèles avec une validation croisée à 5 plis sur
    l'ENTRAÎNEMENT uniquement (le jeu de test reste intact pour l'évaluation
    finale) -- ça donne une estimation plus fiable que juste un seul split,
    important vu la petite taille du dataset (165 patients d'entraînement).
    """
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    results = {}
    # XGBoost veut des labels 0,1,2 -- les autres modèles acceptent 1,2,3 directement
    for name, model in models.items():
        y_fit = y_train - 1 if name == "XGBoost" else y_train
        scores = cross_val_score(model, X_train, y_fit, cv=cv, scoring="f1_macro", n_jobs=-1)
        results[name] = {"cv_mean": scores.mean(), "cv_std": scores.std()}
    return results


def evaluate_on_test(models, X_train, y_train, X_test, y_test):
    """Entraîne chaque modèle sur tout l'entraînement, évalue sur le vrai jeu de test."""
    results = {}
    for name, model in models.items():
        if name == "XGBoost":
            model.fit(X_train, y_train - 1)
            y_pred = model.predict(X_test) + 1
        else:
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
        f1_macro = f1_score(y_test, y_pred, average="macro")
        results[name] = {"f1_test": f1_macro, "model": model, "y_pred": y_pred}
    return results


def main():
    X_train, X_test, y_train, y_test = load_features()
    print(f"Train shape: {X_train.shape} | Test shape: {X_test.shape}\n")

    models = get_candidate_models()

    print("=== Validation croisée (5 plis, sur l'entraînement) ===")
    cv_results = evaluate_with_cross_validation(models, X_train, y_train)
    for name, r in cv_results.items():
        print(f"  {name:.<28} F1-macro = {r['cv_mean']:.3f} (± {r['cv_std']:.3f})")

    print("\n=== Évaluation finale (sur le vrai jeu de test, 42 patients) ===")
    test_results = evaluate_on_test(models, X_train, y_train, X_test, y_test)
    for name, r in test_results.items():
        print(f"  {name:.<28} F1-macro = {r['f1_test']:.3f}")

    # Tableau récapitulatif, trié du meilleur au moins bon
    print("\n=== Tableau comparatif final (trié par F1-macro test) ===")
    sorted_names = sorted(test_results.keys(), key=lambda n: test_results[n]["f1_test"], reverse=True)
    print(f"{'Modèle':<25}{'CV F1-macro':<18}{'Test F1-macro':<15}")
    for name in sorted_names:
        cv_str = f"{cv_results[name]['cv_mean']:.3f} ± {cv_results[name]['cv_std']:.3f}"
        print(f"{name:<25}{cv_str:<18}{test_results[name]['f1_test']:<15.3f}")

    winner = sorted_names[0]
    print(f"\nMeilleur modèle sur nos propres données : {winner}")

    # Sauvegarde du gagnant (comme dans train_model.py)
    os.makedirs("../models", exist_ok=True)
    joblib.dump(test_results[winner]["model"], "../models/best_model_comparison.pkl")
    print(f"Modèle sauvegardé : ../models/best_model_comparison.pkl")


if __name__ == "__main__":
    main()