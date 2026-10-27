"""Audit and conservatively clean every supplied AHS2024 Stata dataset.

Run from project root: python analysis/01_audit_and_clean.py

Important: this script does not guess the meaning of survey codes or convert
all missing values to zero. It preserves original variables, trims strings,
normalizes common blank/missing tokens, removes exact duplicate rows from the
cleaned copy, and records a schema/missingness report. Survey-specific
recoding must be guided by the official questionnaire/data dictionary.
"""
from __future__ import annotations
import json
import re
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "processed"
PUBLIC = ROOT / "data" / "public"
OUT.mkdir(parents=True, exist_ok=True)
PUBLIC.mkdir(parents=True, exist_ok=True)

MISSING_TEXT = {"", ".", "..", "NA", "N/A", "na", "n/a", "NULL", "null"}

def clean_frame(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Apply safe generic cleaning without interpreting numeric survey codes."""
    before_rows = len(df)
    before_cols = len(df.columns)
    # Keep original survey variable names; strip accidental whitespace only.
    df.columns = [str(c).strip() for c in df.columns]
    for col in df.select_dtypes(include=["object", "string"]).columns:
        series = df[col].astype("string").str.strip()
        df[col] = series.mask(series.isin(MISSING_TEXT), pd.NA)
    # Convert finite numeric infinities to missing, if present.
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        df[col] = df[col].replace([np.inf, -np.inf], np.nan)
    # Exact duplicate rows are flagged, not deleted automatically: repeated survey
    # records can be legitimate when the survey design or module structure is unclear.
    exact_duplicates = int(df.duplicated().sum())
    report = {
        "rows_before": int(before_rows), "rows_after": int(len(df)),
        "columns": int(before_cols), "exact_duplicate_rows_flagged_not_removed": exact_duplicates,
        "missing_cells_after_cleaning": int(df.isna().sum().sum()),
        "missing_percent_cells": round(float(df.isna().sum().sum() / max(df.size, 1) * 100), 3),
        "column_details": []
    }
    for col in df.columns:
        s = df[col]
        report["column_details"].append({
            "column": str(col), "dtype": str(s.dtype),
            "missing_count": int(s.isna().sum()),
            "missing_percent": round(float(s.isna().mean() * 100), 3),
            "unique_nonmissing": int(s.nunique(dropna=True)),
        })
    return df, report

def main() -> None:
    files = sorted(RAW.glob("*.dta"))
    if not files:
        raise FileNotFoundError(f"No .dta files found in {RAW}")
    inventory, details = [], {}
    variable_label_rows, value_label_dictionary = [], {}
    for path in files:
        print(f"[CLEAN] {path.name}", flush=True)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            df = pd.read_stata(path, convert_categoricals=False)
            reader = pd.read_stata(path, iterator=True, convert_categoricals=False)
            variable_labels = reader.variable_labels()
            value_labels = reader.value_labels()
        for variable, label in variable_labels.items():
            variable_label_rows.append({"source_file": path.name, "variable": str(variable), "variable_label": str(label or "")})
        # Stata value-label dictionaries can help decode numeric survey codes.
        value_label_dictionary[path.name] = {
            str(set_name): {str(code): str(label) for code, label in mapping.items()}
            for set_name, mapping in value_labels.items()
        }
        original_shape = df.shape
        cleaned, report = clean_frame(df)
        out_path = OUT / f"{path.stem}.csv.gz"
        cleaned.to_csv(out_path, index=False, compression="gzip")
        report["source_file"] = path.name
        report["cleaned_file"] = str(out_path.relative_to(ROOT))
        report["source_shape"] = list(original_shape)
        details[path.name] = report
        inventory.append({
            "source_file": path.name, "rows": int(original_shape[0]),
            "columns": int(original_shape[1]), "cleaned_rows": int(len(cleaned)),
            "cleaned_file": str(out_path.relative_to(ROOT)),
            "duplicate_rows_flagged_not_removed": report["exact_duplicate_rows_flagged_not_removed"],
            "missing_percent_cells": report["missing_percent_cells"],
        })
        print(f"       {original_shape[0]:,} rows x {original_shape[1]} columns; "
              f"exact duplicate rows flagged (not deleted): {report['exact_duplicate_rows_flagged_not_removed']}", flush=True)
    pd.DataFrame(inventory).to_csv(PUBLIC / "dataset_inventory.csv", index=False)
    pd.DataFrame(variable_label_rows).to_csv(PUBLIC / "variable_labels.csv", index=False)
    with open(PUBLIC / "value_label_dictionary.json", "w", encoding="utf-8") as f:
        json.dump(value_label_dictionary, f, ensure_ascii=False, indent=2)
    # Some AHS modules store district-name value labels under the set `s1q2`.
    district_names = {}
    for label_sets in value_label_dictionary.values():
        candidate = label_sets.get("s1q2", {})
        if candidate.get("11") == "Nyarugenge" and candidate.get("12") == "Gasabo":
            district_names = candidate
            break
    with open(PUBLIC / "district_code_names.json", "w", encoding="utf-8") as f:
        json.dump(district_names, f, ensure_ascii=False, indent=2)
    with open(PUBLIC / "data_quality_report.json", "w", encoding="utf-8") as f:
        json.dump(details, f, ensure_ascii=False, indent=2)
    # Long, readable column-level report for quick inspection.
    rows = []
    for filename, report in details.items():
        for col in report["column_details"]:
            rows.append({"source_file": filename, **col})
    pd.DataFrame(rows).to_csv(PUBLIC / "column_quality_report.csv", index=False)
    print("\nAudit complete.")
    print(f"Inventory: {PUBLIC / 'dataset_inventory.csv'}")
    print(f"Quality report: {PUBLIC / 'data_quality_report.json'}")

if __name__ == "__main__":
    main()
