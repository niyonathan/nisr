"""FastAPI endpoints for serving HarvestGap trained models.

Start from project root with: uvicorn src.harvestgap.api:app --reload
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Any
from .predict import predict_one, MODEL_FILES
from .config import MODEL_DIR

app = FastAPI(title="HarvestGap Rwanda API", version="1.0.0",
              description="Exploratory agricultural decision-support models trained on AHS2024 data.")

class PredictionRequest(BaseModel):
    model: str = Field(..., description="One of the available model names")
    features: dict[str, Any] = Field(default_factory=dict)

@app.get("/")
def root():
    available = [name for name, file in MODEL_FILES.items() if (MODEL_DIR/file).exists()]
    return {"service":"HarvestGap Rwanda API", "available_models":available,
            "docs":"/docs", "warning":"Predictions are exploratory estimates, not guarantees or causal advice."}

@app.get("/health")
def health():
    return {"status":"ok"}

@app.post("/predict")
def predict(request: PredictionRequest):
    try:
        return predict_one(request.model, request.features)
    except (KeyError, FileNotFoundError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Prediction failed: {exc}") from exc
