"""
prepare_data.py — STEP 1: Data Preparation

Loads real MIMIC-IV-ED Demo triage.csv, cleans it, handles the severe class
imbalance discovered in EDA (acuity=4 has only 2 samples), and produces a
clean stratified train/test split ready for modeling.

KNOWN LIMITATION (documented for the report):
    MIMIC-IV-ED Demo is a small, publicly-downloadable sample (222 patients)
    of the full MIMIC-IV-ED dataset (200,000+ ED visits, requires PhysioNet
    credentialing). Because acuity=4 has only 2 patients in this demo subset,
    we merge acuity 4 into acuity 3 for modeling purposes (both represent
    "non-urgent, can wait" on the ESI scale). This is a dataset-size limitation,
    not a modeling choice — it should be revisited on the full MIMIC-IV-ED
    dataset once PhysioNet access is approved.
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
import joblib
import os

RAW_PATH = "../data/raw/triage.csv"
PROCESSED_DIR = "../data/processed"
os.makedirs(PROCESSED_DIR, exist_ok=True)

VITAL_COLS = ["temperature", "heartrate", "resprate", "o2sat", "sbp", "dbp", "pain"]


def load_and_clean(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)

    # Drop rows with no target label at all — can't train or evaluate on these
    n_before = len(df)
    df = df.dropna(subset=["acuity"]).copy()
    print(f"Dropped {n_before - len(df)} rows with missing acuity (target).")

    df["acuity"] = df["acuity"].astype(int)

    # Document original distribution before merging
    print("\nOriginal acuity distribution:")
    print(df["acuity"].value_counts().sort_index())

    # Merge acuity 4 into acuity 3 (see module docstring — demo dataset limitation)
    df["acuity_original"] = df["acuity"]  # keep for transparency / report
    df["acuity"] = df["acuity"].replace({4: 3})

    print("\nAcuity distribution after merging 4->3 (demo dataset limitation):")
    print(df["acuity"].value_counts().sort_index())

    # Fill missing chief complaint text (TF-IDF can't handle NaN)
    df["chiefcomplaint"] = df["chiefcomplaint"].fillna("unknown")

    # Note: vital sign NaNs are LEFT AS-IS on purpose. XGBoost handles missing
    # values natively (this is explicitly why XGBoost was chosen in the CDC),
    # so we don't impute here — imputing would inject assumptions and could
    # hide real clinical missingness patterns that are themselves informative.

    return df


def build_tfidf(train_text: pd.Series, test_text: pd.Series, max_features: int = 100):
    """Fit TF-IDF on train only (never on test, to avoid data leakage), transform both."""
    vectorizer = TfidfVectorizer(max_features=max_features, stop_words="english", lowercase=True)
    X_train_tfidf = vectorizer.fit_transform(train_text)
    X_test_tfidf = vectorizer.transform(test_text)
    return vectorizer, X_train_tfidf, X_test_tfidf


def main():
    df = load_and_clean(RAW_PATH)

    # Stratified split: keeps the same class proportions in train and test
    train_df, test_df = train_test_split(
        df, test_size=0.2, stratify=df["acuity"], random_state=42
    )

    print(f"\nTrain size: {len(train_df)} | Test size: {len(test_df)}")
    print("\nTrain acuity distribution:")
    print(train_df["acuity"].value_counts(normalize=True).sort_index().round(3))
    print("\nTest acuity distribution:")
    print(test_df["acuity"].value_counts(normalize=True).sort_index().round(3))

    # Fit TF-IDF on train text only, save vectorizer for reuse in Step 2 and inference
    vectorizer, X_train_tfidf, X_test_tfidf = build_tfidf(
        train_df["chiefcomplaint"], test_df["chiefcomplaint"]
    )
    joblib.dump(vectorizer, f"{PROCESSED_DIR}/tfidf_vectorizer.pkl")

    # Save clean CSVs (vitals + target), TF-IDF matrices saved separately as .npz
    train_df.to_csv(f"{PROCESSED_DIR}/train.csv", index=False)
    test_df.to_csv(f"{PROCESSED_DIR}/test.csv", index=False)

    from scipy import sparse
    sparse.save_npz(f"{PROCESSED_DIR}/X_train_tfidf.npz", X_train_tfidf)
    sparse.save_npz(f"{PROCESSED_DIR}/X_test_tfidf.npz", X_test_tfidf)

    print(f"\nSaved clean train/test CSVs and TF-IDF matrices to {PROCESSED_DIR}/")


if __name__ == "__main__":
    main()