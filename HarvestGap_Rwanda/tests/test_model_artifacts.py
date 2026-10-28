"""Smoke test that saved model bundles load and accept their default inputs."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.harvestgap.predict import MODEL_FILES, load_model, predict_one


def test_saved_models():
    for name, filename in MODEL_FILES.items():
        path = Path(__file__).resolve().parents[1] / "models" / filename
        if not path.exists():
            continue  # Allows running tests before the training workflow is complete.
        bundle = load_model(name)
        values = {col: meta.get("default", 0.0) for col, meta in bundle.get("input_metadata", {}).items()}
        result = predict_one(name, values)
        assert result["prediction"] >= 0
        assert result["model"] == name

if __name__ == "__main__":
    test_saved_models()
    print("Saved model smoke tests passed")
