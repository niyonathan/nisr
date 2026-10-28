"""Bundle the published AHS 2024 summary tables into one JSON file for the React website.

Run from the HarvestGap_Rwanda folder:  python analysis/04_export_web_data.py
Reads only data/public/ (survey-weighted aggregates, groups of 30+ plots) and writes
web/public/data/harvestgap.json. No household-level data is included.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "data" / "public"
OUT = ROOT / "web" / "public" / "data" / "harvestgap.json"

# Survey facts reported by the AHS 2024 pipeline.
SURVEY = {"households": 3724, "districts": 30, "cropRecords": 74549, "validYields": 59161, "year": 2024}

PRACTICE_LABELS = {
    "improved_seed": "Improved seed",
    "inorganic_fertilizer": "Mineral fertilizer",
    "organic_fertilizer": "Manure or compost",
    "pesticide": "Pesticide or fungicide",
    "irrigated": "Irrigation",
    "anti_erosion": "Anti-erosion measures",
    "agroforestry": "Trees on the plot",
    "extension_this_season": "Extension advice",
    "cooperative_member": "Cooperative member",
}


def clean(value):
    """JSON-safe scalar: NaN becomes null, floats are rounded."""
    if isinstance(value, float):
        return None if math.isnan(value) else round(value, 4)
    if hasattr(value, "item"):
        return clean(value.item())
    return value


def records(df: pd.DataFrame, columns: dict[str, str]) -> list[dict]:
    """Rows as dicts, renaming columns to the short camelCase names the website uses."""
    out = df[list(columns)].rename(columns=columns)
    return [{k: clean(v) for k, v in row.items()} for row in out.to_dict("records")]


def main() -> None:
    read = lambda name: pd.read_csv(PUBLIC / name)
    yields_cols = {
        "crop": "crop", "crop_group": "group", "n_obs": "n", "yield_p25_kg_ha": "p25", "yield_median_kg_ha": "median",
        "yield_p75_kg_ha": "p75", "yield_p90_kg_ha": "p90", "improved_seed_rate": "seed", "inorganic_fertilizer_rate": "fert",
        "organic_fertilizer_rate": "organic", "irrigated_rate": "irrigated", "production_decreased_rate": "decreased",
    }
    indicators = read("district_indicators.csv")
    weights = indicators["n_plots"]
    national_rate = lambda col: clean(float((indicators[col] * weights).sum() / weights.sum()))

    effects = read("practice_effects.csv")
    effects["practice_label"] = effects["practice"].map(PRACTICE_LABELS).fillna(effects["practice_label"])

    data = {
        "survey": SURVEY,
        "national": {
            col.replace("_rate", ""): national_rate(col)
            for col in ["irrigated_rate", "no_water_rate", "cannot_afford_irrigation_rate", "inorganic_fertilizer_rate",
                        "organic_fertilizer_rate", "pesticide_rate", "anti_erosion_rate", "agroforestry_rate",
                        "erosion_threat_rate", "fertility_loss_threat_rate", "landslide_threat_rate", "improved_seed_rate",
                        "production_decreased_rate", "extension_this_season_rate", "extension_post_harvest_rate",
                        "cooperative_member_rate", "land_titled_rate"]
        },
        "districts": records(indicators, {c: c for c in indicators.columns}),
        "crops": records(read("crop_yields_national.csv"), yields_cols),
        "districtCrops": records(read("crop_yields_district.csv"), {"district": "district", "province": "province", **yields_cols}),
        "effects": records(effects, {"crop": "crop", "practice": "practice", "practice_label": "label", "n_users": "users",
                                     "effect_pct": "effect", "ci_low_pct": "low", "ci_high_pct": "high", "p_value": "p",
                                     "significant": "sig"}),
        "gaps": records(read("district_yield_gaps.csv"), {"district": "district", "crop": "crop", "yield_median_kg_ha": "median",
                                                          "national_p75_kg_ha": "target", "gap_to_national_p75_pct": "gap"}),
        "scenarios": records(read("input_scenario_district.csv"), {"district": "district", "crop": "crop", "share_without_inputs": "lacking",
                                                                   "predicted_kg_ha": "now", "scenario_kg_ha": "withInputs",
                                                                   "scenario_gain_pct": "gain", "inputs_in_scenario": "inputs"}),
        "fruit": records(read("fruit_market.csv"), {"fruit": "fruit", "n_households": "n", "estimated_production_t": "tonnes",
                                                    "sold_share": "sold", "consumed_share": "consumed",
                                                    "price_median_rwf_kg": "price", "top_district": "topDistrict"}),
        "milk": records(read("milk_market.csv"), {"province": "province", "n_households": "n", "sold_share": "sold",
                                                  "consumed_share": "consumed", "price_median_rwf_l": "price"}),
        "model": {
            "overall": json.loads((PUBLIC / "yield_model_metrics.json").read_text()),
            "byCrop": records(read("model_metrics_by_crop.csv"), {"crop": "crop", "n_obs": "n", "r2_log_model": "r2",
                                                                  "r2_log_baseline": "r2Baseline"}),
        },
        "geo": json.loads((PUBLIC / "rwanda_districts.geojson").read_text()),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
