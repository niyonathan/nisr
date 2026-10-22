"""Read NISR Agricultural Household Survey (AHS) 2024 Stata files with their value labels."""
from __future__ import annotations

import os
import warnings
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = Path(os.environ.get("AHS_RAW_DIR", ROOT / "data" / "raw"))
PROCESSED_DIR = ROOT / "data" / "processed"  # unit-level outputs, never committed
PUBLIC_DIR = ROOT / "data" / "public"  # aggregated outputs, safe to publish

FILES = {
    "cover": "AHS2024_Section0.dta",
    "members": "AHS2024_Section1_HOUSEHOLD MEMBERS CHARACTERISTICS.dta",
    "land": "AHS2024_Section2_LAND TENURE.dta",
    "crops": "AHS2024_Section3_4_CROP GROWN, SEEDS AND PRODUCTION & AGRICULTURAL INPUTS AND PRACTICES.dta",
    "fruits": "AHS2024_Section5_FRUITS PRODUCTION.dta",
    "extension": "AHS2024_Section6_EXTENSION SERVICES AND AGRICULTURAL PROGRAMMES.dta",
    "tools": "AHS2024_Section7_AGRICULTURAL TOOLS.dta",
    "sustainable": "AHS2024_Section8_SUSTAINABLE AGRICULTURE.dta",
    "livestock": "AHS2024_Section9_10_12_LIVESTOCK AND ANIMAL INPUTS EXPENDITURES,.dta",
    "milk": "AHS2024_Section11_1_CATTLE MILK PRODUCTION AND USE.dta",
    "eggs": "AHS2024_Section11_2_EGG PRODUCTION.dta",
    "honey": "AHS2024_Section11_3_HONEY PRODUCTION.dta",
    "credit": "AHS2024_Credits.dta",
    "saving": "AHS2024_Saving.dta",
}


def read(key: str) -> tuple[pd.DataFrame, dict[str, dict[int, str]]]:
    """Return the raw codes and a {column: {code: label}} map for one AHS file."""
    path = RAW_DIR / FILES[key]
    if not path.exists():
        raise FileNotFoundError(
            f"{path} not found. Download the AHS 2024 microdata from "
            "microdata.statistics.gov.rw and put the .dta files in data/raw/ (or set AHS_RAW_DIR)."
        )
    with warnings.catch_warnings():
        # Some string fields are latin-1 encoded; pandas falls back correctly but warns.
        warnings.simplefilter("ignore")
        reader = pd.io.stata.StataReader(path)
        df = reader.read(convert_categoricals=False)
        value_labels = reader.value_labels()
        label_names = dict(zip(df.columns, reader._lbllist))
    labels = {
        col: {int(code): text.strip() for code, text in value_labels[name].items()}
        for col, name in label_names.items()
        if name in value_labels
    }
    # hhid is stored as float32/float64 depending on the file; normalise so joins match.
    if "hhid" in df:
        df = df[df["hhid"].notna()].copy()
        df["hhid"] = df["hhid"].round().astype("int64")
    return df, labels


def decode(series: pd.Series, mapping: dict[int, str]) -> pd.Series:
    """Map numeric codes to labels, leaving missing values as NA."""
    return series.map(lambda v: mapping.get(int(v)) if pd.notna(v) else None).astype("string")
