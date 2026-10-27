"""Shared paths and model feature definitions for HarvestGap Rwanda."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"
PUBLIC_DIR = ROOT / "data" / "public"
MODEL_DIR = ROOT / "models"
REPORT_DIR = ROOT / "reports"

for _path in (PROCESSED_DIR, PUBLIC_DIR, MODEL_DIR, REPORT_DIR):
    _path.mkdir(parents=True, exist_ok=True)
