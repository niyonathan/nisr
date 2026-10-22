"""Build the core analysis table: one row per crop grown on a plot in a season.

AHS Section 3/4 stores each plot as one row with up to seven crop "slots" (s3_q4_1 ... s3_q4_7)
plus plot-level inputs and practices (fertilizer, irrigation, soil conservation, ...).
We reshape the slots into long form and attach the plot-level fields to every crop on the plot.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .io import decode, read

MAX_CROP_SLOTS = 7
MIN_CROP_AREA_HA = 0.001  # 10 m²; smaller areas give meaningless yields
MAX_FERTILIZER_KG_HA = 1000

IRRIGATION_STATUS = {
    1: "Irrigated",
    2: "Not needed",
    3: "Cannot afford",
    4: "No water available",
}
SEED_TYPE = {1: "Traditional", 2: "Improved", 3: "Mixed"}
SOIL_THREATS = {1: "erosion", 2: "fertility_loss", 3: "waterlogging", 4: "salinization", 5: "landslide"}

# Crop code ranges follow the AHS crop list (1xx seasonal, 2xx annual, 3xx perennial, 4xx fruit, 5xx fodder).
CROP_GROUPS = {
    "Cereals": {101, 102, 103, 104, 105, 138},
    "Pulses & oilseeds": {106, 107, 108, 109, 122, 123, 124, 130, 135, 140},
    "Roots & tubers": {110, 111, 112, 113, 114, 305},
    "Bananas": {301, 302, 303},
    "Export & industrial crops": {201, 202, 205, 206, 304, 306, 307, 308, 309, 310},
}


def crop_group(code: float) -> str:
    if pd.isna(code):
        return "Other"
    code = int(code)
    for group, codes in CROP_GROUPS.items():
        if code in codes:
            return group
    if 115 <= code <= 149:
        return "Vegetables & herbs"
    if 400 <= code < 500:
        return "Fruits"
    if code >= 500 or code == 204:
        return "Fodder"
    return "Other"


def _slot_col(df: pd.DataFrame, *candidates: str) -> pd.Series:
    """The survey file is not perfectly consistent in naming (e.g. ss3_q21_1_2)."""
    for name in candidates:
        if name in df:
            return df[name]
    return pd.Series(pd.NA, index=df.index)


def _fertilizer_kg(df: pd.DataFrame) -> pd.Series:
    """Total solid inorganic fertilizer on the plot in kg (liquids are excluded)."""
    total = pd.Series(0.0, index=df.index)
    for suffix in ["", "_2", "_3", "_4"]:
        unit, qty = df[f"s4_q7{suffix}"], df[f"s4_q8{suffix}"].fillna(0)
        total += np.where(unit == 1, qty, 0) + np.where(unit == 2, qty / 1000, 0)
    return total


def _code_flags(codes: pd.Series, mapping: dict[int, str], prefix: str) -> pd.DataFrame:
    """Multi-select answers are stored as concatenated single-digit codes, e.g. '12'."""
    text = codes.astype("string").fillna("")
    return pd.DataFrame(
        {f"{prefix}{name}": text.str.contains(str(code), regex=False) for code, name in mapping.items()}
    )


def build_plots(df: pd.DataFrame, labels: dict) -> pd.DataFrame:
    """Plot-level inputs and practices shared by every crop on the plot."""
    plots = pd.DataFrame(
        {
            "hhid": df["hhid"],
            "plot_no": df["s2q1"].astype("int64"),
            "season_code": df["Season"],
            "season": decode(df["Season"], labels["Season"]).str.replace("Season ", "", regex=False),
            "province": decode(df["province"], labels["province"]),
            "district": decode(df["district"], labels["district"]),
            "plot_area_ha": df["s2q2"] / 10_000,
            "organic_fertilizer": df["s4_q1"] == 1,
            "inorganic_fertilizer": df["s4_q4"] == 1,
            "inorganic_fertilizer_type": decode(df["s4_q6"], labels["s4_q6"]),
            "inorganic_fertilizer_kg": _fertilizer_kg(df),
            "pesticide": df["s4_q12"] == 1,
            "anti_erosion": df["s4_q19"] == 1,
            "anti_erosion_type": decode(df["s4_q19_a1"], labels["s4_q19_a1"]),
            "anti_erosion_cost_rwf": df["s4_q21"],
            "irrigation_status": df["s4_q22"].map(IRRIGATION_STATUS).astype("string"),
            "irrigation_technique": decode(df["s4_q23"], labels["s4_q23"]),
            "irrigation_water_source": decode(df["s4_q24_1"], labels["s4_q24_1"]),
            "irrigation_tool": decode(df["s4_q25_1"], labels["s4_q25_1"]),
            "irrigation_cost_rwf": df["s4_q26"],
            "mechanized": df["s4_q27"] == 1,
            "agroforestry": df["s4_q31"] == 1,
            "other_costs_rwf": df["s4_q30"],
            "weight": df["weight"],
        }
    )
    plots["irrigated"] = plots["irrigation_status"] == "Irrigated"
    rate = plots["inorganic_fertilizer_kg"] / plots["plot_area_ha"].where(plots["plot_area_ha"] >= MIN_CROP_AREA_HA)
    # Above ~1 t/ha is far beyond any agronomic recommendation and comes from tiny plot areas.
    plots["inorganic_fertilizer_kg_ha"] = rate.where(rate <= MAX_FERTILIZER_KG_HA)
    threats = _code_flags(df["s4_q18"], SOIL_THREATS, "soil_threat_")
    plots = pd.concat([plots, threats], axis=1)
    plots["soil_threat_any"] = threats.any(axis=1)
    return plots


def build_crop_rows(df: pd.DataFrame, labels: dict) -> pd.DataFrame:
    """One row per (plot, crop slot) with the crop-specific answers."""
    crop_names = labels["s3_q4_1"]
    frames = []
    for i in range(1, MAX_CROP_SLOTS + 1):
        code = df[f"s3_q4_{i}"]
        slot = pd.DataFrame(
            {
                "hhid": df["hhid"],
                "plot_no": df["s2q1"].astype("int64"),
                "season_code": df["Season"],
                "crop_slot": i,
                "crop_code": code,
                "crop_share_pct": df[f"s3_q4_{i}a"],
                "planted_this_season": df[f"s3_q7_{i}a"] == 1,
                "harvested_this_season": df[f"s3_q7_{i}b"] == 1,
                "seed_type": df[f"s3_q9_{i}"].map(SEED_TYPE).astype("string"),
                "seed_cost_rwf": df[f"s3_q13_{i}"].fillna(0) + df[f"s3_q16_{i}"].fillna(0),
                "harvest_unit": decode(df[f"s3_q17_{i}"], labels.get(f"s3_q17_{i}", labels["s3_q17_1"])),
                "harvest_kg": df[f"s3_q20_{i}"],
                "production_vs_last_season": decode(
                    df[f"s2q23_{i}"], labels.get(f"s2q23_{i}", labels["s2q23_1"])
                ),
                # Letter codes for the reasons behind the production change; decoded once
                # we have the questionnaire's answer list.
                "production_reason_codes": _slot_col(df, f"s3_q21_1_{i}", f"ss3_q21_1_{i}")
                .astype("string")
                .str.strip()
                .replace("", pd.NA),
                "n_perennial_plants": df[f"s3_q5_{i}"],
            }
        )
        frames.append(slot[code.notna()])
    rows = pd.concat(frames, ignore_index=True)
    rows["crop"] = decode(rows["crop_code"], crop_names)
    rows["crop_group"] = rows["crop_code"].map(crop_group)
    rows["improved_seed"] = rows["seed_type"].isin(["Improved", "Mixed"])
    return rows


def flag_valid_yields(df: pd.DataFrame) -> pd.Series:
    """Rows usable for yield analysis: positive harvest/area and not an extreme outlier for that crop."""
    basic = (df["harvest_kg"] > 0) & (df["crop_area_ha"] >= MIN_CROP_AREA_HA)
    log_yield = np.log(df["yield_kg_ha"].where(basic))
    grouped = log_yield.groupby(df["crop"])
    q1, q3 = grouped.transform(lambda s: s.quantile(0.25)), grouped.transform(lambda s: s.quantile(0.75))
    iqr = q3 - q1
    # 3×IQR on the log scale only removes implausible values (unit or data-entry errors).
    return basic & log_yield.between(q1 - 3 * iqr, q3 + 3 * iqr)


def build_plot_crops() -> pd.DataFrame:
    raw, labels = read("crops")
    plots = build_plots(raw, labels)
    crops = build_crop_rows(raw, labels)
    out = crops.merge(plots, on=["hhid", "plot_no", "season_code"], how="left", validate="many_to_one")
    out = out.drop(columns="season_code")

    land, land_labels = read("land")
    tenure = pd.DataFrame(
        {
            "hhid": land["hhid"],
            "plot_no": land["s2q1"].astype("int64"),
            "land_access": decode(land["s2q4"], land_labels["s2q4"]),
            "land_titled": land["s2q7"] == 1,
        }
    ).drop_duplicates(["hhid", "plot_no"])
    out = out.merge(tenure, on=["hhid", "plot_no"], how="left", validate="many_to_one")

    out["crop_area_ha"] = out["plot_area_ha"] * out["crop_share_pct"].fillna(100) / 100
    out["yield_kg_ha"] = out["harvest_kg"] / out["crop_area_ha"].where(out["crop_area_ha"] > 0)
    out["yield_valid"] = flag_valid_yields(out)
    out["n_crops_on_plot"] = out.groupby(["hhid", "plot_no"])["crop_slot"].transform("size")
    return out
