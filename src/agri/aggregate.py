"""Survey-weighted aggregates that are safe to publish (no household-level records).

Every table suppresses groups with fewer than MIN_CELL_SIZE observations, both to protect
respondents and because smaller samples give unreliable estimates.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

MIN_CELL_SIZE = 30
LOW_SAMPLE_HOUSEHOLDS = 60
DECREASED = {"Was decreased", "Was highly decreased"}


def weighted_quantile(values: pd.Series, weights: pd.Series, q: float) -> float:
    mask = values.notna() & weights.notna()
    v, w = values[mask].to_numpy(float), weights[mask].to_numpy(float)
    if len(v) == 0:
        return np.nan
    order = np.argsort(v)
    v, w = v[order], w[order]
    cum = np.cumsum(w) - 0.5 * w
    return float(np.interp(q * w.sum(), cum, v))


def weighted_mean(values: pd.Series, weights: pd.Series) -> float:
    mask = values.notna() & weights.notna()
    if not mask.any():
        return np.nan
    return float(np.average(values[mask].astype(float), weights=weights[mask]))


def _rates(g: pd.DataFrame, cols: dict[str, pd.Series | str]) -> dict[str, float]:
    return {name: weighted_mean(g[col] if isinstance(col, str) else col.loc[g.index], g["weight"]) for name, col in cols.items()}


def plot_level(plot_crops: pd.DataFrame) -> pd.DataFrame:
    """Collapse the crop table back to one row per plot and season."""
    return plot_crops.drop_duplicates(["hhid", "plot_no", "season"])


def district_indicators(plot_crops: pd.DataFrame, households: pd.DataFrame) -> pd.DataFrame:
    plots = plot_level(plot_crops)
    status = plots["irrigation_status"]
    plot_rates = {
        "irrigated_rate": "irrigated",
        "no_water_rate": status.eq("No water available"),
        "cannot_afford_irrigation_rate": status.eq("Cannot afford"),
        "organic_fertilizer_rate": "organic_fertilizer",
        "inorganic_fertilizer_rate": "inorganic_fertilizer",
        "pesticide_rate": "pesticide",
        "anti_erosion_rate": "anti_erosion",
        "agroforestry_rate": "agroforestry",
        "soil_threat_rate": "soil_threat_any",
        "erosion_threat_rate": "soil_threat_erosion",
        "fertility_loss_threat_rate": "soil_threat_fertility_loss",
        "landslide_threat_rate": "soil_threat_landslide",
        "land_titled_rate": "land_titled",
    }
    rows = []
    for (province, district), g in plots.groupby(["province", "district"]):
        users = g[g["inorganic_fertilizer"]]
        rows.append(
            {
                "province": province,
                "district": district,
                "n_plots": len(g),
                **_rates(g, plot_rates),
                "fertilizer_kg_ha_users_median": weighted_quantile(
                    users["inorganic_fertilizer_kg_ha"], users["weight"], 0.5
                ),
            }
        )
    out = pd.DataFrame(rows)

    crops = plot_crops.groupby("district").apply(
        lambda g: pd.Series(
            {
                "improved_seed_rate": weighted_mean(g["improved_seed"], g["weight"]),
                "production_decreased_rate": weighted_mean(
                    g["production_vs_last_season"].isin(DECREASED), g["weight"]
                ),
            }
        ),
        include_groups=False,
    )
    hh_cols = [
        "poor", "extreme_poor", "head_female", "extension_this_season", "extension_post_harvest",
        "cooperative_member", "crop_insurance", "has_any_loan", "has_account", "received_agri_support",
    ]
    hh = households[households["agricultural_household"]].groupby("district").apply(
        lambda g: pd.Series({f"{c}_rate": weighted_mean(g[c], g["weight"]) for c in hh_cols}),
        include_groups=False,
    )
    hh["n_households"] = households[households["agricultural_household"]].groupby("district").size()
    out = out.merge(crops, on="district").merge(hh, on="district").sort_values(["province", "district"])
    # Kigali's urban districts have few farming households; the app should caveat them.
    out["low_sample"] = out["n_households"] < LOW_SAMPLE_HOUSEHOLDS
    return out


def _yield_stats(g: pd.DataFrame) -> dict[str, float]:
    valid = g[g["yield_valid"]]
    y, w = valid["yield_kg_ha"], valid["weight"]
    return {
        "n_obs": len(valid),
        "yield_p25_kg_ha": weighted_quantile(y, w, 0.25),
        "yield_median_kg_ha": weighted_quantile(y, w, 0.5),
        "yield_p75_kg_ha": weighted_quantile(y, w, 0.75),
        "yield_p90_kg_ha": weighted_quantile(y, w, 0.9),
        "improved_seed_rate": weighted_mean(g["improved_seed"], g["weight"]),
        "inorganic_fertilizer_rate": weighted_mean(g["inorganic_fertilizer"], g["weight"]),
        "organic_fertilizer_rate": weighted_mean(g["organic_fertilizer"], g["weight"]),
        "irrigated_rate": weighted_mean(g["irrigated"], g["weight"]),
        "production_decreased_rate": weighted_mean(g["production_vs_last_season"].isin(DECREASED), g["weight"]),
    }


def crop_yields(plot_crops: pd.DataFrame, by: list[str]) -> pd.DataFrame:
    rows = [
        {**dict(zip(by, key if isinstance(key, tuple) else (key,))), "crop_group": g["crop_group"].iat[0], **_yield_stats(g)}
        for key, g in plot_crops.groupby(by)
    ]
    out = pd.DataFrame(rows)
    return out[out["n_obs"] >= MIN_CELL_SIZE].sort_values(by).reset_index(drop=True)


def fruit_market(fruits: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for fruit, g in fruits.groupby("fruit"):
        w = g["weight"]
        produced = (g["production_kg"] * w).sum()
        rows.append(
            {
                "fruit": fruit,
                "n_households": len(g),
                "estimated_production_t": produced / 1000,
                "sold_share": (g["sold_kg"].fillna(0) * w).sum() / produced,
                "consumed_share": (g["consumed_kg"].fillna(0) * w).sum() / produced,
                "price_median_rwf_kg": weighted_quantile(g["price_rwf_kg"], w, 0.5),
                "top_district": g.groupby("district").apply(
                    lambda d: (d["production_kg"] * d["weight"]).sum(), include_groups=False
                ).idxmax(),
            }
        )
    out = pd.DataFrame(rows)
    return out[out["n_households"] >= MIN_CELL_SIZE].sort_values("estimated_production_t", ascending=False)


def milk_market(milk: pd.DataFrame) -> pd.DataFrame:
    rows = []
    # Few households produce milk, so district cells are too small; report by province.
    for province, g in milk.groupby("province"):
        w = g["weight"]
        total = (g["total_l"] * w).sum()
        rows.append(
            {
                "province": province,
                "n_households": len(g),
                "sold_share": (g["sold_l"] * w).sum() / total,
                "consumed_share": (g["consumed_l"] * w).sum() / total,
                "price_median_rwf_l": weighted_quantile(g["price_rwf_l"], w, 0.5),
            }
        )
    out = pd.DataFrame(rows)
    return out[out["n_households"] >= MIN_CELL_SIZE].reset_index(drop=True)
