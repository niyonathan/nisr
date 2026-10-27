"""Small shared prediction helpers used by the API and Streamlit application."""
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from .config import MODEL_DIR

MODEL_FILES = {
    "crop_yield_kg_ha": "crop_yield_model.joblib",
    "fruit_production_kg": "fruit_production_model.joblib",
    "egg_production_count": "egg_production_model.joblib",
    "honey_production_kg": "honey_production_model.joblib",
    "milk_daily_production_liters": "milk_production_model.joblib",
}

def load_model(name: str):
    filename = MODEL_FILES.get(name)
    if not filename:
        raise KeyError(f"Unknown model: {name}")
    path = MODEL_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"Model not found at {path}. Run `python analysis/03_train_models.py` first.")
    return joblib.load(path)

def predict_one(name: str, values: dict) -> dict:
    bundle = load_model(name)
    columns = bundle["feature_columns"]
    row = {col: values.get(col, np.nan) for col in columns}
    frame = pd.DataFrame([row], columns=columns)
    for col in bundle.get("categorical_columns", []):
        if col in frame:
            frame[col] = frame[col].astype("string")
    transformed = float(bundle["pipeline"].predict(frame)[0])
    if bundle.get("target_transform") == "log1p":
        prediction = max(0.0, float(np.expm1(transformed)))
    else:
        prediction = max(0.0, transformed)
    return {"model": name, "prediction": prediction, "target": bundle["target"],
            "metrics": bundle.get("metrics", {}),
            "disclaimer": "Model estimate from observational survey data; not a guarantee or causal recommendation."}
