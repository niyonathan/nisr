"""Build a crop-plot modelling table from AHS2024 Section 3/4.

The source file stores up to seven crops per plot in wide columns. This script
reshapes those crop slots to one row per plot/crop, builds a cautious target
(yield kg/ha), and excludes harvest outcome fields from predictors to reduce
leakage. Raw files remain unchanged.
"""
from __future__ import annotations
import warnings
import pandas as pd
import numpy as np
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "processed"
PUBLIC = ROOT / "data" / "public"
OUT.mkdir(parents=True, exist_ok=True); PUBLIC.mkdir(parents=True, exist_ok=True)

def main():
    candidates = list(RAW.glob("*Section3_4*.dta"))
    if not candidates:
        raise FileNotFoundError("Cannot find Section3_4 crop production/input dataset in data/raw")
    source = candidates[0]
    print(f"Reading {source.name} ...", flush=True)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        df = pd.read_stata(source, convert_categoricals=False)
    # Each slot corresponds to one crop reported for the plot.
    slots = []
    for slot in range(1, 8):
        crop_col = f"s3_q4_{slot}"
        target_col = f"s3_q20_{slot}"
        if crop_col not in df.columns or target_col not in df.columns:
            continue
        part = pd.DataFrame(index=df.index)
        # Identifiers/location/season/plot area shared across crop slots.
        for col in ["hhid", "clust", "Cluster_ID", "province", "district", "Season", "s2q1", "s2q2", "weight"]:
            if col in df.columns: part[col] = df[col]
        part["crop_slot"] = slot
        # Crop-specific fields collected before the harvest outcome.
        feature_candidates = [
            crop_col, f"s3_q4_{slot}a", f"s3_q4_{slot}b", f"s3_q5_{slot}",
            f"s3_q6_{slot}", f"s3_q7_{slot}", f"s3_q7_{slot}a", f"s3_q7_{slot}b",
            f"s3_q8_{slot}", f"s3_q9_{slot}", f"s3_q11_{slot}", f"s3_q11b_{slot}",
            f"s3_q12_{slot}", f"s3_q13_{slot}", f"s3_q14_{slot}", f"s3_q15_{slot}",
            f"s3_q16_{slot}",
        ]
        for col in feature_candidates:
            if col in df.columns:
                new_name = "crop_code" if col == crop_col else col.replace(f"_{slot}", "")
                part[new_name] = df[col]
        # Plot-level agricultural practices and inputs; only variables collected
        # as practice/input fields, not harvest totals or subjective production comparisons.
        plot_features = [
            "s4_q1", "s4_q3", "s4_q4", "s4_q5", "s4_q6", "s4_q7", "s4_q8",
            "s4_q9", "s4_q12", "s4_q14", "s4_q15", "s4_q16", "s4_q17",
            "s4_q18", "s4_q18_1", "s4_q18_2", "s4_q18_3", "s4_q19", "s4_q19_a1",
            "s4_q19_a2", "s4_q19_a3", "s4_q20", "s4_q22", "s4_q27", "s4_q30",
            "s4_q31", "s4_q33", "s4_q34", "s4_q35", "s4_q36"
        ]
        for col in plot_features:
            if col in df.columns: part[col] = df[col]
        part["harvest_total_kg"] = pd.to_numeric(df[target_col], errors="coerce")
        # Area variable is labelled area_sqm in Stata. Crop share is used where available.
        area_sqm = pd.to_numeric(part.get("s2q2"), errors="coerce")
        crop_share = pd.to_numeric(part.get("s3_q4a"), errors="coerce")
        if crop_share.notna().any():
            crop_area_sqm = area_sqm * crop_share.clip(lower=0, upper=100) / 100.0
        else:
            crop_area_sqm = area_sqm
        part["crop_area_ha"] = crop_area_sqm / 10000.0
        part["yield_kg_ha"] = part["harvest_total_kg"] / part["crop_area_ha"].replace(0, np.nan)
        slots.append(part)
    if not slots:
        raise ValueError("No crop slots were recognized; inspect the source variable names.")
    long = pd.concat(slots, ignore_index=True)
    # A crop slot without a crop code is an unused slot, not a zero-production observation.
    long = long[long["crop_code"].notna()].copy()
    long["crop_code"] = long["crop_code"].astype(str).str.replace(r"\.0$", "", regex=True)
    # Valid target and denominator are essential. Retain zero yields only if the survey explicitly records them.
    long = long[np.isfinite(long["yield_kg_ha"]) & (long["crop_area_ha"] > 0) & (long["harvest_total_kg"] > 0)].copy()
    # Flag rather than silently remove extreme values. Training script uses training-fold quantiles.
    long["yield_extreme_flag"] = False
    qlo, qhi = long["yield_kg_ha"].quantile([0.005, 0.995])
    long.loc[(long["yield_kg_ha"] < qlo) | (long["yield_kg_ha"] > qhi), "yield_extreme_flag"] = True
    out = OUT / "crop_plot_features.csv.gz"
    long.to_csv(out, index=False, compression="gzip")
    summary = {
        "source_file": source.name, "crop_plot_rows": int(len(long)),
        "unique_households": int(long["hhid"].nunique()) if "hhid" in long else None,
        "unique_clusters": int(long["clust"].nunique()) if "clust" in long else None,
        "crop_codes": sorted(long["crop_code"].dropna().unique().tolist()),
        "yield_kg_ha_quantiles": {str(q): float(long["yield_kg_ha"].quantile(q)) for q in [0.01,0.25,0.5,0.75,0.99]},
        "extreme_yield_flag_count": int(long["yield_extreme_flag"].sum()),
        "note": "Yield uses the source area_sqm field and crop share when present. Confirm units against official data dictionary before public operational use."
    }
    import json
    (PUBLIC / "crop_feature_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"Saved {len(long):,} plot-crop rows to {out}")
    print(f"Crop codes: {len(summary['crop_codes'])}; extreme yield flags: {summary['extreme_yield_flag_count']}")
if __name__ == "__main__": main()
