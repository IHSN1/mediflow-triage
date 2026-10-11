"""
train_model.py — STEP 2: XGBoost Model Training

Trains a multi-class XGBoost classifier to predict ESI acuity level
(1=critical, 2=urgent, 3=non-urgent — after merging original 4 into 3,
see prepare_data.py for why) using vital signs + TF-IDF features from
chief complaint text.

Evaluation: F1-score macro (averages performance equally across all classes,
so it does not hide poor performance on rare classes) + confusion matrix.

--mode support (added for Airflow orchestration):
    --mode baseline  -> trains only train_baseline(), saves baseline_model.pkl
    --mode tuned     -> trains only tune_model(), saves tuned_model.pkl
    --mode compare   -> reads both saved scores, keeps the better model as
                        the final xgboost_triage_model.pkl
    --mode all       -> does everything in one go (default, same behavior
                        as the original single-script version)
This lets baseline and tuned run as two independent, parallel Airflow tasks,
with compare running only after both are done.
"""

import argparse
import pandas as pd
import numpy as np
from scipy import sparse
import joblib
import xgboost as xgb
from sklearn.metrics import f1_score, classification_report, confusion_matrix
from sklearn.model_selection import GridSearchCV, StratifiedKFold
import matplotlib.pyplot as plt
import seaborn as sns
import os

PROCESSED_DIR = "../data/processed"
MODELS_DIR = "../models"
FIGURES_DIR = "../notebooks/figures"
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(FIGURES_DIR, exist_ok=True)

VITAL_COLS = ["temperature", "heartrate", "resprate", "o2sat", "sbp", "dbp", "pain"]


def load_features():
    """Combine vital signs (numeric) with TF-IDF (text) into one feature matrix."""
    train_df = pd.read_csv(f"{PROCESSED_DIR}/train.csv")
    test_df = pd.read_csv(f"{PROCESSED_DIR}/test.csv")

    X_train_tfidf = sparse.load_npz(f"{PROCESSED_DIR}/X_train_tfidf.npz")
    X_test_tfidf = sparse.load_npz(f"{PROCESSED_DIR}/X_test_tfidf.npz")

    # 'pain' sometimes contains non-numeric entries in the raw data (e.g. "unable",
    # "UA", "Critical") instead of a 0-10 score. Coerce to numeric, turning anything
    # non-numeric into NaN -- XGBoost handles NaN natively (see prepare_data.py),
    # so this is a safe, minimal-assumption fix rather than guessing a value.
    for df_ in (train_df, test_df):
        df_["pain"] = pd.to_numeric(df_["pain"], errors="coerce")

    # XGBoost handles NaN natively -- we pass vitals through as-is (see prepare_data.py)
    X_train_vitals = train_df[VITAL_COLS].values.astype(float)
    X_test_vitals = test_df[VITAL_COLS].values.astype(float)

    # Combine sparse TF-IDF matrix with dense vitals matrix
    X_train = sparse.hstack([sparse.csr_matrix(X_train_vitals), X_train_tfidf]).tocsr()
    X_test = sparse.hstack([sparse.csr_matrix(X_test_vitals), X_test_tfidf]).tocsr()

    y_train = train_df["acuity"].values
    y_test = test_df["acuity"].values

    return X_train, X_test, y_train, y_test, train_df, test_df


def train_baseline(X_train, y_train):
    """First pass: default-ish XGBoost params, just to see where we stand."""
    # XGBoost wants labels starting at 0, so we shift 1,2,3 -> 0,1,2
    model = xgb.XGBClassifier(
        objective="multi:softprob",
        num_class=3,
        eval_metric="mlogloss",
        random_state=42,
        n_estimators=100,
    )
    model.fit(X_train, y_train - 1)
    return model


def tune_model(X_train, y_train):
    """GridSearchCV optimization, as required by the CDC. Small grid given tiny dataset."""
    param_grid = {
        "max_depth": [3, 4, 5],
        "learning_rate": [0.05, 0.1, 0.2],
        "n_estimators": [50, 100, 200],
    }
    base_model = xgb.XGBClassifier(
        objective="multi:softprob", num_class=3, eval_metric="mlogloss", random_state=42
    )
    # Small dataset (165 rows) -> use 5-fold CV, stratified to preserve class balance in each fold
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    grid = GridSearchCV(
        base_model, param_grid, scoring="f1_macro", cv=cv, n_jobs=-1, verbose=0
    )
    grid.fit(X_train, y_train - 1)
    print(f"Best params: {grid.best_params_}")
    print(f"Best CV F1-macro: {grid.best_score_:.3f}")
    return grid.best_estimator_


def evaluate(model, X_test, y_test):
    y_pred = model.predict(X_test) + 1  # shift back to 1,2,3
    f1_macro = f1_score(y_test, y_pred, average="macro")

    print(f"\n=== EVALUATION ===")
    print(f"F1-score macro: {f1_macro:.3f}")
    print("\nClassification report:")
    print(classification_report(y_test, y_pred))

    cm = confusion_matrix(y_test, y_pred, labels=[1, 2, 3])
    fig, ax = plt.subplots(figsize=(5, 4))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=[1, 2, 3], yticklabels=[1, 2, 3], ax=ax)
    ax.set_xlabel("Prediction")
    ax.set_ylabel("Vraie valeur (acuity)")
    ax.set_title(f"Matrice de confusion (F1-macro = {f1_macro:.2f})")
    plt.tight_layout()
    plt.savefig(f"{FIGURES_DIR}/confusion_matrix.png", dpi=120)
    plt.close()

    return f1_macro, y_pred


def main(mode="all"):
    X_train, X_test, y_train, y_test, train_df, test_df = load_features()
    print(f"Train shape: {X_train.shape} | Test shape: {X_test.shape}")

    if mode in ("baseline", "all"):
        print("\n--- Baseline model ---")
        baseline = train_baseline(X_train, y_train)
        f1_baseline, _ = evaluate(baseline, X_test, y_test)
        joblib.dump(baseline, f"{MODELS_DIR}/baseline_model.pkl")
        with open(f"{MODELS_DIR}/baseline_score.txt", "w") as f:
            f.write(str(f1_baseline))
        print(f"Baseline F1-macro: {f1_baseline:.3f}")

    if mode in ("tuned", "all"):
        print("\n--- GridSearchCV tuning ---")
        tuned = tune_model(X_train, y_train)
        f1_tuned, y_pred = evaluate(tuned, X_test, y_test)
        joblib.dump(tuned, f"{MODELS_DIR}/tuned_model.pkl")
        with open(f"{MODELS_DIR}/tuned_score.txt", "w") as f:
            f.write(str(f1_tuned))
        print(f"Tuned F1-macro: {f1_tuned:.3f}")

    if mode == "compare":
        with open(f"{MODELS_DIR}/baseline_score.txt") as f:
            f1_baseline = float(f.read())
        with open(f"{MODELS_DIR}/tuned_score.txt") as f:
            f1_tuned = float(f.read())

        best_path = (
            f"{MODELS_DIR}/tuned_model.pkl" if f1_tuned >= f1_baseline
            else f"{MODELS_DIR}/baseline_model.pkl"
        )
        best_model = joblib.load(best_path)
        joblib.dump(best_model, f"{MODELS_DIR}/xgboost_triage_model.pkl")
        print(f"Baseline F1: {f1_baseline:.3f} | Tuned F1: {f1_tuned:.3f}")
        print(f"Modèle final sauvegardé depuis : {best_path}")

    if mode == "all":
        # Same behavior as the original script: compare and save immediately,
        # without needing separate baseline/tuned score files.
        final_model = tuned if f1_tuned >= f1_baseline else baseline
        joblib.dump(final_model, f"{MODELS_DIR}/xgboost_triage_model.pkl")
        print(f"\nSaved final model to {MODELS_DIR}/xgboost_triage_model.pkl")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--mode",
        choices=["baseline", "tuned", "compare", "all"],
        default="all",
        help="baseline: train only train_baseline(); tuned: train only tune_model(); "
             "compare: pick the best of the two already-saved models; "
             "all: original single-run behavior (default).",
    )
    args = parser.parse_args()
    main(mode=args.mode)