"""Train and evaluate models supported by observed AHS2024 outcome variables.

Models are predictive/exploratory, not causal. Evaluation uses a cluster-held-out
split where a cluster identifier is available. Run after scripts 01 and 02.
"""
from __future__ import annotations
import json, warnings
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, FunctionTransformer
from sklearn.ensemble import RandomForestRegressor, ExtraTreesRegressor
from sklearn.model_selection import GroupShuffleSplit, train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error, median_absolute_error
import joblib
from scipy import stats
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path: sys.path.insert(0, str(ROOT))
RAW = ROOT / "data" / "raw"; PROC = ROOT / "data" / "processed"
MODELS = ROOT / "models"; PUBLIC = ROOT / "data" / "public"; REPORTS = ROOT / "reports"
for p in (MODELS,PUBLIC,REPORTS): p.mkdir(parents=True, exist_ok=True)


from src.harvestgap.statistics import bh_adjust


def feature_pipeline(frame, feature_cols, categorical_cols):
    cat = [c for c in categorical_cols if c in feature_cols]
    num = [c for c in feature_cols if c not in cat]
    transformers = []
    if num:
        transformers.append(("numeric", Pipeline([("imputer", SimpleImputer(strategy="median"))]), num))
    if cat:
        transformers.append(("categorical", Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", min_frequency=5))
        ]), cat))
    prep = ColumnTransformer(transformers=transformers, remainder="drop")
    return Pipeline([("preprocess", prep), ("model", ExtraTreesRegressor(
        n_estimators=30, min_samples_leaf=6, max_features=0.8,
        max_depth=12, random_state=42, n_jobs=2
    ))])


def train_regression(name, frame, target, features, categorical, model_path, group_col=None, log_target=False):
    data = frame.copy()
    for c in [target, *features]:
        if c not in data.columns: return {"model":name,"status":"skipped","reason":f"missing column {c}"}
    data[target] = pd.to_numeric(data[target], errors="coerce")
    data = data.replace([np.inf,-np.inf], np.nan)
    data = data[data[target].notna() & (data[target] >= 0)].copy()
    # Group-held-out validation requires a known cluster; retain original data in
    # cleaned outputs, but omit rows without group identifiers from this evaluation.
    if group_col and group_col in data.columns and data[group_col].notna().sum() >= 100:
        data = data[data[group_col].notna()].copy()
    # Remove rows that contain no usable predictor information.
    data = data[data[features].notna().any(axis=1)].copy()
    if len(data) < 100:
        return {"model":name,"status":"skipped","reason":f"only {len(data)} usable rows; minimum 100"}
    X = data[features].copy()
    for c in categorical:
        if c in X.columns:
            X[c] = X[c].astype("string").fillna("Missing")
    y_original = data[target].astype(float).to_numpy()
    y = np.log1p(y_original) if log_target else y_original
    groups = data[group_col] if group_col and group_col in data.columns else None
    if groups is not None and groups.nunique() >= 5:
        splitter = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=42)
        train_idx, test_idx = next(splitter.split(X, y, groups=groups))
        split_type = "cluster-held-out 80/20" if group_col == "clust" else f"group-held-out 80/20 ({group_col})"
    else:
        train_idx, test_idx = train_test_split(np.arange(len(data)), test_size=0.20, random_state=42)
        split_type = "random 80/20 (no adequate group column)"
    # Cap training size for reproducible runtimes on ordinary laptops; the split
    # is made first, and the held-out test set is never used for fitting.
    if len(train_idx) > 25000:
        rng = np.random.RandomState(42)
        train_idx = np.sort(rng.choice(train_idx, size=25000, replace=False))
    print(f"[FIT START] {name}: train={len(train_idx):,}, features={len(features)}", flush=True)
    model = feature_pipeline(data, features, categorical)
    model.fit(X.iloc[train_idx], y[train_idx])
    print(f"[FIT DONE] {name}", flush=True)
    pred_transformed = model.predict(X.iloc[test_idx])
    pred = np.expm1(pred_transformed).clip(min=0) if log_target else np.maximum(pred_transformed,0)
    actual = y_original[test_idx]
    actual_t = y[test_idx]
    # A simple training-set median baseline provides a minimum comparison point.
    baseline_model_scale = float(np.median(y[train_idx]))
    baseline_original = float(np.expm1(baseline_model_scale)) if log_target else baseline_model_scale
    baseline_predictions = np.full(len(test_idx), baseline_original, dtype=float)
    metrics = {
        "model":name,"status":"trained","rows_used":int(len(data)),"train_rows":int(len(train_idx)),"test_rows":int(len(test_idx)),
        "target":target,"features":features,"categorical_features":[c for c in categorical if c in features],
        "split_method":split_type,"target_transform":"log1p" if log_target else "none",
        "r2_model_scale":float(r2_score(actual_t,pred_transformed)),
        "baseline_r2_model_scale":float(r2_score(actual_t, np.full(len(test_idx), baseline_model_scale))),
        "baseline_mae_original_scale":float(mean_absolute_error(actual, baseline_predictions)),
        "mae_original_scale":float(mean_absolute_error(actual,pred)),
        "rmse_original_scale":float(np.sqrt(mean_squared_error(actual,pred))),
        "median_absolute_error_original_scale":float(median_absolute_error(actual,pred)),
        "test_target_median":float(np.median(actual)),"test_target_mean":float(np.mean(actual)),
        "model_file":str(model_path.relative_to(ROOT)),
        "warning":"Metrics describe this held-out sample, not guaranteed performance for future seasons or unseen districts."
    }
    model_path.parent.mkdir(parents=True,exist_ok=True)
    # Save safe input defaults/options so the app can build forms without exposing
    # row-level survey records.
    input_metadata = {}
    for col in features:
        if col in categorical:
            options = sorted(data[col].dropna().astype(str).unique().tolist())[:250]
            counts = data[col].dropna().astype(str).value_counts()
            default = str(counts.index[0]) if len(counts) else (options[0] if options else "1")
            if options and default not in options: default = options[0]
            input_metadata[col] = {"kind":"categorical", "options":options or [default], "default":default}
        else:
            values = pd.to_numeric(data[col], errors="coerce").dropna()
            input_metadata[col] = {"kind":"numeric", "default":float(values.median()) if len(values) else 0.0}
    joblib.dump({"pipeline":model,"feature_columns":features,"categorical_columns":categorical,"target":target,
                 "target_transform":"log1p" if log_target else "none","metrics":metrics,
                 "input_metadata":input_metadata},model_path)
    print(f"[MODEL] {name}: rows={len(data):,}, R2={metrics['r2_model_scale']:.3f}, MAE={metrics['mae_original_scale']:.3f}",flush=True)
    return metrics


def practice_associations(frame):
    """Test within-crop practice associations and adjust all p-values globally."""
    rows=[]
    binary_cols=[c for c in ["s4_q1","s4_q12","s4_q19","s4_q31","s3_q7a","s3_q7b"] if c in frame]
    # Exclude crop area because yield is calculated by dividing production by area;
    # testing area against yield would create a partly mathematical association.
    continuous_cols=[c for c in ["s3_q12","s3_q15","s4_q3","s4_q30"] if c in frame]
    for crop, part in frame.groupby("crop_code",dropna=True):
        y=pd.to_numeric(part["yield_kg_ha"],errors="coerce")
        for col in binary_cols:
            x=pd.to_numeric(part[col],errors="coerce")
            tmp=pd.DataFrame({"x":x,"y":y}).dropna()
            vals=set(tmp.x.unique())
            if len(tmp)<60 or not vals.issubset({0,1,2}): continue
            # Binary questions often use 1=yes, 2=no. Compare coded groups without asserting label meaning.
            groups=[tmp.loc[tmp.x==v,"y"].to_numpy() for v in sorted(vals)]
            groups=[g for g in groups if len(g)>=20]
            if len(groups)!=2: continue
            try: stat,p=stats.mannwhitneyu(groups[0],groups[1],alternative="two-sided")
            except Exception: continue
            rows.append({"crop_code":str(crop),"feature":col,"test":"Mann-Whitney U by coded response",
                         "n":int(len(tmp)),"group_1_n":len(groups[0]),"group_2_n":len(groups[1]),
                         "group_1_median_yield":float(np.median(groups[0])),"group_2_median_yield":float(np.median(groups[1])),
                         "statistic":float(stat),"p_value":float(p),"effect_description":"difference between coded response groups; confirm value labels"})
        for col in continuous_cols:
            x=pd.to_numeric(part[col],errors="coerce")
            tmp=pd.DataFrame({"x":x,"y":y}).replace([np.inf,-np.inf],np.nan).dropna()
            if len(tmp)<60 or tmp.x.nunique()<5: continue
            try: rho,p=stats.spearmanr(tmp.x,tmp.y,nan_policy="omit")
            except Exception: continue
            if not np.isfinite(p): continue
            rows.append({"crop_code":str(crop),"feature":col,"test":"Spearman rank correlation",
                         "n":int(len(tmp)),"group_1_n":None,"group_2_n":None,
                         "group_1_median_yield":None,"group_2_median_yield":None,
                         "statistic":float(rho),"p_value":float(p),"effect_description":"Spearman rho; observational association, not causation"})
    out=pd.DataFrame(rows)
    if len(out):
        out["q_value_fdr_bh"]=bh_adjust(out["p_value"].to_numpy())
        out["raw_significant_p05"]=out["p_value"]<0.05
        out["fdr_significant_q05"]=out["q_value_fdr_bh"]<0.05
        out=out.sort_values(["q_value_fdr_bh","p_value"],na_position="last")
    out.to_csv(PUBLIC/"practice_associations.csv",index=False)
    print(f"[ASSOCIATIONS] {len(out)} tests; raw p<.05: {int((out.p_value<.05).sum()) if len(out) else 0}; FDR q<.05: {int((out.q_value_fdr_bh<.05).sum()) if len(out) else 0}")
    return out


def main():
    metrics=[]
    crop_file=PROC/"crop_plot_features.csv.gz"
    if not crop_file.exists():
        raise FileNotFoundError("Run python analysis/02_build_features.py first")
    crop=pd.read_csv(crop_file,low_memory=False)
    # Export aggregated, non-row-level analytics and safe form metadata for the app.
    summary=(crop.groupby(["district","crop_code"],dropna=True)
             .agg(observations=("yield_kg_ha","size"), median_yield_kg_ha=("yield_kg_ha","median"),
                  mean_yield_kg_ha=("yield_kg_ha","mean"))
             .reset_index())
    summary.to_csv(PUBLIC/"district_crop_yield_summary.csv",index=False)
    crop_features=[c for c in ["crop_code","province","district","Season","crop_area_ha","s3_q4a","s3_q4b","s3_q5","s3_q6","s3_q7","s3_q7a","s3_q7b","s3_q8","s3_q9","s3_q11","s3_q12","s3_q13","s3_q14","s3_q15","s3_q16","s4_q1","s4_q3","s4_q12","s4_q18","s4_q19","s4_q19_a1","s4_q19_a2","s4_q19_a3","s4_q30","s4_q31"] if c in crop]
    crop_cat=[c for c in ["crop_code","province","district","Season","s3_q7","s3_q8","s3_q9","s3_q11","s3_q14","s3_q7a","s3_q7b","s4_q1","s4_q12","s4_q18","s4_q19","s4_q31"] if c in crop_features]
    form_metadata={"features":{},"note":"Categories are raw survey codes. Interpret them using the official questionnaire/data dictionary."}
    for col in crop_features:
        if col in crop_cat:
            form_metadata["features"][col]={"kind":"categorical","options":sorted(crop[col].dropna().astype(str).unique().tolist())[:250],"default":"1"}
            if form_metadata["features"][col]["default"] not in form_metadata["features"][col]["options"] and form_metadata["features"][col]["options"]:
                form_metadata["features"][col]["default"]=form_metadata["features"][col]["options"][0]
        else:
            values=pd.to_numeric(crop[col],errors="coerce").dropna()
            form_metadata["features"][col]={"kind":"numeric","default":float(values.median()) if len(values) else 0.0,
                                             "min":float(values.quantile(.01)) if len(values) else 0.0,
                                             "max":float(values.quantile(.99)) if len(values) else 1.0}
    (PUBLIC/"app_feature_metadata.json").write_text(json.dumps(form_metadata,indent=2),encoding="utf-8")
    metrics.append(train_regression("crop_yield_kg_ha",crop,"yield_kg_ha",crop_features,crop_cat,MODELS/"crop_yield_model.joblib",group_col="clust",log_target=True))
    assoc=practice_associations(crop)
    # Additional outcome models use only pre-outcome variables; each target is separate.
    def read_stata_by_pattern(pattern):
        files=list(RAW.glob(pattern))
        if not files: return None
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            return pd.read_stata(files[0],convert_categoricals=False)
    fruit=read_stata_by_pattern("*Section5_FRUITS*.dta")
    if fruit is not None:
        fruit_features=[c for c in ["province","district","Season","s5_q1","s5_q2","s5_q3","s5_q4"] if c in fruit]
        metrics.append(train_regression("fruit_production_kg",fruit,"s5_q5",fruit_features,[c for c in ["province","district","Season","s5_q1","s5_q2"] if c in fruit_features],MODELS/"fruit_production_model.joblib",group_col="clust"))
    eggs=read_stata_by_pattern("*Section11_2_EGG*.dta")
    if eggs is not None:
        # Embedded survey value labels identify 1=Yes and 2=No for egg production.
        # A clear No is a valid zero outcome; an unanswered Yes remains missing.
        if "s11q2_1" in eggs and "s11q2_4" in eggs:
            eggs["s11q2_4"] = pd.to_numeric(eggs["s11q2_4"], errors="coerce")
            eggs.loc[(eggs["s11q2_1"] == 2) & eggs["s11q2_4"].isna(), "s11q2_4"] = 0.0
        egg_features=[c for c in ["province","district","s11q2_1","s11q2_3"] if c in eggs]
        metrics.append(train_regression("egg_production_count",eggs,"s11q2_4",egg_features,[c for c in ["province","district","s11q2_1"] if c in egg_features],MODELS/"egg_production_model.joblib",group_col="clust"))
    honey=read_stata_by_pattern("*Section11_3_HONEY*.dta")
    if honey is not None:
        honey=honey.copy()
        for c in ["s11q3_4","s11q3_5"]:
            honey[c]=pd.to_numeric(honey[c],errors="coerce")
        honey["honey_produced_kg"] = honey[["s11q3_4","s11q3_5"]].sum(axis=1, min_count=1)
        # Code 2 means no beekeeping in the embedded yes/no label set.
        honey.loc[(honey["s11q3_1"] == 2) & honey["honey_produced_kg"].isna(), "honey_produced_kg"] = 0.0
        honey_features=[c for c in ["province","district","s11q3_2","s11q3_3"] if c in honey]
        metrics.append(train_regression("honey_production_kg",honey,"honey_produced_kg",honey_features,[c for c in ["province","district"] if c in honey_features],MODELS/"honey_production_model.joblib",group_col="clust"))
    milk=read_stata_by_pattern("*Section11_1_CATTLE MILK*.dta")
    if milk is not None:
        milk_features=[c for c in ["province","district","s11q1_4","s11q1_5"] if c in milk]
        metrics.append(train_regression("milk_daily_production_liters",milk,"s11q1_6",milk_features,[c for c in ["province","district"] if c in milk_features],MODELS/"milk_production_model.joblib",group_col="clust"))
    # Publish metrics and a transparent training note.
    (PUBLIC/"model_metrics.json").write_text(json.dumps(metrics,indent=2),encoding="utf-8")
    pd.DataFrame([{k:v for k,v in m.items() if not isinstance(v,(list,dict))} for m in metrics]).to_csv(PUBLIC/"model_metrics.csv",index=False)
    fdr_count=int(assoc["fdr_significant_q05"].sum()) if len(assoc) else 0
    raw_count=int(assoc["raw_significant_p05"].sum()) if len(assoc) else 0
    report=["# HarvestGap Rwanda — Model training report","", "Models are trained from the supplied Rwanda AHS2024 survey data. They are exploratory decision-support models, not causal models or guaranteed forecasts.", "", "## Model results", ""]
    for m in metrics:
        report += [f"### {m['model']}", f"- Status: {m['status']}"]
        if m["status"]=="trained":
            report += [f"- Usable rows: {m['rows_used']:,}",f"- Validation: {m['split_method']}",f"- R² on model target scale: {m['r2_model_scale']:.3f} ({'log1p transformed' if m.get('target_transform') == 'log1p' else 'original target scale'})",f"- MAE on original scale: {m['mae_original_scale']:.3f}",f"- Median-baseline MAE: {m['baseline_mae_original_scale']:.3f}",f"- Median-baseline R² on model scale: {m['baseline_r2_model_scale']:.3f}",f"- RMSE on original scale: {m['rmse_original_scale']:.3f}"]
        else: report += [f"- Reason: {m.get('reason','not available')}"]
        report.append("")
    report += ["## Practice associations",f"- Tests performed: {len(assoc)}",f"- Raw p < 0.05: {raw_count}",f"- Benjamini–Hochberg FDR q < 0.05: {fdr_count}","- P-values were adjusted across the complete set of tests written to practice_associations.csv.","- Associations are observational and may be confounded; they do not prove that a practice causes yield changes.","", "## Limitations", "- Verify survey variable codes, units, and category labels against the official NISR questionnaire/data dictionary before operational recommendations.","- Yield is calculated using the source field labelled area_sqm and crop share where available. Confirm these units before treating the values as final agronomic yield.","- Survey-weighted inference is not performed by these initial machine-learning models.","- Cluster-held-out validation is not a guarantee of performance on future seasons or unseen districts.","- Inputs available only after harvest are excluded from the crop-yield model to reduce target leakage."]
    (REPORTS/"model_training_report.md").write_text("\n".join(report)+"\n",encoding="utf-8")
    print(f"\nSaved metrics to {PUBLIC/'model_metrics.json'}")

if __name__=="__main__": main()
