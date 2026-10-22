"""Yield models on the AHS 2024 crop × plot table.

Two complementary models:

1. **Practice associations** (per crop, OLS on log yield). For each farming practice we estimate
   how much higher yields are on plots that use it, compared with otherwise similar plots of the
   same crop in the same district and season. Standard errors are clustered by survey cluster.
   These are associations in observational data, not proven causal effects.

2. **Yield predictor** (one gradient-boosted model for all major crops). Predicts expected yield
   for a farm profile; the app uses it for the farmer advisor and for "what if" scenarios.
   Validated with cross-validation grouped by survey cluster, so neighbouring farms never sit on
   both sides of a split.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import statsmodels.formula.api as smf
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.inspection import permutation_importance
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import GroupKFold

MIN_RECORDS_PER_CROP = 300
MIN_GROUP_SIZE = 30  # users and non-users needed to estimate a practice's association
CV_FOLDS = 5
RANDOM_STATE = 42

# Practices a farmer or planner can act on, with the wording the app shows.
PRACTICES = {
    "improved_seed": "Improved seed",
    "inorganic_fertilizer": "Inorganic fertilizer",
    "organic_fertilizer": "Organic fertilizer (manure/compost)",
    "pesticide": "Pesticide or fungicide",
    "irrigated": "Irrigation",
    "anti_erosion": "Anti-erosion measures",
    "agroforestry": "Agroforestry trees",
    "extension_this_season": "Extension advice this season",
    "cooperative_member": "Cooperative membership",
}
# Controls: things that shape yield but are not the practice being compared.
CONTROLS = [
    "log_crop_area",
    "crop_share_pct",
    "n_crops_on_plot",
    "head_female",
    "household_size",
    "soil_threat_erosion",
    "soil_threat_fertility_loss",
]

CATEGORICAL_FEATURES = ["crop", "district", "season", "seed_type", "irrigation_status", "land_access", "head_education"]
NUMERIC_FEATURES = [
    "log_crop_area",
    "crop_share_pct",
    "n_crops_on_plot",
    "organic_fertilizer",
    "inorganic_fertilizer",
    "fertilizer_kg_ha",
    "pesticide",
    "anti_erosion",
    "agroforestry",
    "soil_threat_erosion",
    "soil_threat_fertility_loss",
    "soil_threat_landslide",
    "soil_threat_waterlogging",
    "land_titled",
    "head_female",
    "head_age",
    "household_size",
    "extension_this_season",
    "cooperative_member",
    "twigire_muhinzi",
    "farmer_field_school",
    "has_any_loan",
    "has_account",
    "received_agri_support",
    "planted_this_season",
]
FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES


def model_crops(df: pd.DataFrame) -> list[str]:
    counts = df.loc[df["yield_valid"], "crop"].value_counts()
    return sorted(counts[counts >= MIN_RECORDS_PER_CROP].index)


def prepare(df: pd.DataFrame) -> pd.DataFrame:
    """Valid-yield rows of the modelled crops, with model-ready columns."""
    data = df[df["yield_valid"] & df["crop"].isin(model_crops(df))].copy()
    data["log_yield"] = np.log(data["yield_kg_ha"])
    data["log_crop_area"] = np.log(data["crop_area_ha"])
    data["fertilizer_kg_ha"] = data["inorganic_fertilizer_kg_ha"].fillna(0)
    # Flags arrive as bool, nullable boolean or object depending on the source module.
    for col in set(PRACTICES) | set(NUMERIC_FEATURES) | set(CONTROLS):
        data[col] = pd.to_numeric(data[col].astype(object), errors="coerce").astype(float)
    return data.reset_index(drop=True)


# ---------------------------------------------------------------- associations


def practice_associations(data: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for crop, g in data.groupby("crop"):
        usable = [p for p in PRACTICES if MIN_GROUP_SIZE <= g[p].sum() <= len(g) - MIN_GROUP_SIZE]
        if not usable:
            continue
        g = g.dropna(subset=usable + CONTROLS + ["log_yield"])
        fixed = " + C(district)" + (" + C(season)" if g["season"].nunique() > 1 else "")
        formula = "log_yield ~ " + " + ".join(usable + CONTROLS) + fixed
        fit = smf.ols(formula, data=g).fit(cov_type="cluster", cov_kwds={"groups": g["cluster"]})
        ci = fit.conf_int()
        for p in usable:
            rows.append(
                {
                    "crop": crop,
                    "practice": p,
                    "practice_label": PRACTICES[p],
                    "n_obs": int(fit.nobs),
                    "n_users": int(g[p].sum()),
                    "effect_pct": np.expm1(fit.params[p]),
                    "ci_low_pct": np.expm1(ci.loc[p, 0]),
                    "ci_high_pct": np.expm1(ci.loc[p, 1]),
                    "p_value": fit.pvalues[p],
                }
            )
    out = pd.DataFrame(rows)
    out["significant"] = out["p_value"] < 0.05
    return out.sort_values(["crop", "effect_pct"], ascending=[True, False]).reset_index(drop=True)


# ---------------------------------------------------------------- predictor


def feature_frame(data: pd.DataFrame, categories: dict[str, list[str]] | None = None) -> pd.DataFrame:
    """Model inputs with fixed category levels, so training and the app encode identically."""
    X = data[FEATURES].copy()
    for col in CATEGORICAL_FEATURES:
        levels = categories[col] if categories else sorted(X[col].dropna().astype(str).unique())
        X[col] = pd.Categorical(X[col].astype("string").astype(object), categories=levels)
    X[NUMERIC_FEATURES] = X[NUMERIC_FEATURES].astype(float)
    return X


def new_regressor() -> HistGradientBoostingRegressor:
    return HistGradientBoostingRegressor(
        loss="squared_error",
        learning_rate=0.05,
        max_iter=500,
        max_leaf_nodes=31,
        # Every leaf summarises at least 50 plots: steadier predictions, and the saved model
        # carries no individual household's answers.
        min_samples_leaf=50,
        l2_regularization=1.0,
        categorical_features="from_dtype",
        random_state=RANDOM_STATE,
    )


def _baseline_predict(train: pd.DataFrame, test: pd.DataFrame) -> np.ndarray:
    """Benchmark: median log yield of the same crop in the same district (else nationally)."""
    by_cd = train.groupby(["crop", "district"])["log_yield"].median()
    by_c = train.groupby("crop")["log_yield"].median()
    keys = pd.MultiIndex.from_frame(test[["crop", "district"]])
    pred = by_cd.reindex(keys).to_numpy()
    return np.where(np.isnan(pred), by_c.reindex(test["crop"]).to_numpy(), pred)


def cross_validate(data: pd.DataFrame) -> tuple[dict, pd.DataFrame]:
    X = feature_frame(data)
    y = data["log_yield"].to_numpy()
    pred_model = np.empty_like(y)
    pred_base = np.empty_like(y)
    for train_idx, test_idx in GroupKFold(n_splits=CV_FOLDS).split(X, y, groups=data["cluster"]):
        reg = new_regressor().fit(X.iloc[train_idx], y[train_idx])
        pred_model[test_idx] = reg.predict(X.iloc[test_idx])
        pred_base[test_idx] = _baseline_predict(data.iloc[train_idx], data.iloc[test_idx])

    def scores(pred: np.ndarray, mask=slice(None)) -> dict:
        err = np.abs(np.expm1(pred[mask] - y[mask]))
        return {
            "r2_log": r2_score(y[mask], pred[mask]),
            "mae_log": mean_absolute_error(y[mask], pred[mask]),
            "median_abs_pct_error": float(np.median(err)),
        }

    metrics = {"n_obs": len(y), "n_crops": data["crop"].nunique(), "folds": CV_FOLDS,
               "model": scores(pred_model), "baseline_crop_district_median": scores(pred_base)}
    per_crop = []
    for crop in sorted(data["crop"].unique()):
        mask = (data["crop"] == crop).to_numpy()
        m, b = scores(pred_model, mask), scores(pred_base, mask)
        per_crop.append({"crop": crop, "n_obs": int(mask.sum()),
                         "r2_log_model": m["r2_log"], "r2_log_baseline": b["r2_log"],
                         "median_abs_pct_error_model": m["median_abs_pct_error"],
                         "median_abs_pct_error_baseline": b["median_abs_pct_error"]})
    return metrics, pd.DataFrame(per_crop)


def fit_predictor(data: pd.DataFrame) -> dict:
    """Fit on all data. Returns a bundle the app can load with joblib."""
    X = feature_frame(data)
    categories = {c: list(X[c].cat.categories) for c in CATEGORICAL_FEATURES}
    reg = new_regressor().fit(X, data["log_yield"])
    return {"model": reg, "categories": categories, "features": FEATURES,
            "numeric_features": NUMERIC_FEATURES, "categorical_features": CATEGORICAL_FEATURES}


def feature_importance(bundle: dict, data: pd.DataFrame, sample: int = 8000) -> pd.DataFrame:
    sub = data.sample(min(sample, len(data)), random_state=RANDOM_STATE)
    X = feature_frame(sub, bundle["categories"])
    result = permutation_importance(bundle["model"], X, sub["log_yield"], n_repeats=5,
                                    random_state=RANDOM_STATE, scoring="r2")
    return (pd.DataFrame({"feature": FEATURES, "importance_r2_drop": result.importances_mean,
                          "std": result.importances_std})
            .sort_values("importance_r2_drop", ascending=False).reset_index(drop=True))


def predict_kg_ha(bundle: dict, profiles: pd.DataFrame) -> np.ndarray:
    return np.exp(bundle["model"].predict(feature_frame(profiles, bundle["categories"])))


# ---------------------------------------------------------------- scenarios

MIN_ADOPTION_FOR_SCENARIO = 0.05


def scenario_inputs(data: pd.DataFrame) -> dict[str, dict[str, bool]]:
    """Per input, which crops have enough users (≥5% and ≥30 plots) to model switching it on."""
    out = {}
    for p in ("improved_seed", "inorganic_fertilizer"):
        g = data.groupby("crop")[p]
        out[p] = ((g.mean() >= MIN_ADOPTION_FOR_SCENARIO) & (g.sum() >= MIN_GROUP_SIZE)).to_dict()
    return out


def input_scenario(bundle: dict, data: pd.DataFrame) -> pd.DataFrame:
    """Model-estimated yield change per district and crop if plots without improved seed and
    inorganic fertilizer used both, at the median rate of fertilizer users growing that crop.

    This is a "what the model expects for similar plots" estimate, not a guaranteed gain.
    """
    users = data[data["inorganic_fertilizer"] == 1]
    rate = users.groupby("crop")["fertilizer_kg_ha"].median()
    # Only switch on an input for crops where enough farmers already use it; otherwise the model
    # would borrow the pattern from other crops (e.g. improved maize seed applied to soybean).
    eligible = scenario_inputs(data)
    seed_ok = data["crop"].map(eligible["improved_seed"]).fillna(False).astype(bool)
    fert_ok = data["crop"].map(eligible["inorganic_fertilizer"]).fillna(False).astype(bool)
    scenario = data.copy()
    add_seed = seed_ok & (data["improved_seed"] == 0)
    add_fert = fert_ok & (data["inorganic_fertilizer"] == 0)
    scenario.loc[add_seed, "seed_type"] = "Improved"
    scenario.loc[add_fert, "inorganic_fertilizer"] = 1.0
    scenario.loc[add_fert, "fertilizer_kg_ha"] = scenario.loc[add_fert, "crop"].map(rate).fillna(0)
    lacking = add_seed | add_fert
    base = predict_kg_ha(bundle, data)
    alt = predict_kg_ha(bundle, scenario)
    frame = data[["province", "district", "crop", "weight"]].assign(base=base, alt=alt, lacking=lacking)
    rows = []
    for (province, district, crop), g in frame.groupby(["province", "district", "crop"]):
        if len(g) < MIN_GROUP_SIZE:
            continue
        w = g["weight"]
        rows.append({
            "province": province, "district": district, "crop": crop, "n_obs": len(g),
            "share_without_inputs": float(np.average(g["lacking"], weights=w)),
            "predicted_kg_ha": float(np.average(g["base"], weights=w)),
            "scenario_kg_ha": float(np.average(g["alt"], weights=w)),
        })
    out = pd.DataFrame(rows)
    out["scenario_gain_pct"] = out["scenario_kg_ha"] / out["predicted_kg_ha"] - 1
    out["inputs_in_scenario"] = out["crop"].map(
        lambda c: " + ".join(PRACTICES[p] for p in ("improved_seed", "inorganic_fertilizer") if eligible[p].get(c, False))
    )
    out = out[out["inputs_in_scenario"] != ""]
    return out.sort_values(["crop", "scenario_gain_pct"], ascending=[True, False]).reset_index(drop=True)
