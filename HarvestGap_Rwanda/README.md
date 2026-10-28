# HarvestGap Rwanda — Agricultural Productivity Intelligence

A Python research prototype built from the supplied AHS2024 agricultural household survey files. It includes dataset auditing, conservative cleaning, crop-plot feature engineering, several supervised production models, false-discovery-rate-corrected practice association analysis, a Streamlit interface, and a FastAPI prediction service.

> **Research prototype, not an operational agronomy service.** The survey is observational. Predictions are estimates, not guarantees; practice associations do not prove causation. Check variable codes and measurement units against the official NISR questionnaire/data dictionary before using the outputs to advise farmers.

## 1. Requirements

- Windows 10/11, macOS, or Linux
- Python 3.10–3.12 recommended (the packages support this range best)
- 8 GB RAM recommended; the 331-column crop survey can use several GB while loading/training
- Internet access only for initial Python package installation

## 2. Project structure

```text
HarvestGap_Rwanda/
├── app/streamlit_app.py             # Farmer/planner web interface
├── analysis/
│   ├── 01_audit_and_clean.py        # Audit and clean every raw .dta file
│   ├── 02_build_features.py         # Reshape crop slots and engineer yield features
│   └── 03_train_models.py           # Train/evaluate models and FDR associations
├── data/
│   ├── raw/                         # Original supplied Stata files; unchanged
│   ├── processed/                   # Generated cleaned CSV.gz files and model table
│   └── public/                      # Inventory, metrics and reports
├── models/                          # Trained joblib pipelines
├── reports/                         # Model training report
├── src/harvestgap/                  # Shared configuration, model serving, statistics
├── tests/                            # Basic test(s)
├── requirements.txt
└── README.md
```

## 3. Install on Windows PowerShell

Open PowerShell in the extracted `HarvestGap_Rwanda` directory.

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If PowerShell blocks activation, use this only for the current terminal:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

If Python 3.11 is not installed, install Python 3.11 or 3.12 and retry with the matching `py -3.12` command.

## 4. Run the full data workflow in order

Run each command from the project root, with `.venv` activated.

### Step A — Audit and clean all raw datasets

```powershell
python analysis/01_audit_and_clean.py
```

Outputs include:

- `data/processed/*.csv.gz`: cleaned table copies of all supplied `.dta` datasets
- `data/public/dataset_inventory.csv`: file/row/column inventory
- `data/public/column_quality_report.csv`: column types, missingness and unique counts
- `data/public/variable_labels.csv`: variable labels embedded in the original Stata files
- `data/public/value_label_dictionary.json`: value-label dictionaries embedded in the original Stata files, when present
- `data/public/data_quality_report.json`: detailed data-quality report

The script preserves the original files in `data/raw/`. It strips whitespace from string fields, normalizes common blank tokens, replaces numeric infinities with missing values, and flags exact duplicate rows for review without deleting them automatically. It also extracts variable labels and any embedded Stata value-label dictionaries. It intentionally does not convert all missing values to zero or guess what numeric survey codes mean.

### Step B — Build the crop modelling table

```powershell
python analysis/02_build_features.py
```

This reshapes the seven crop slots in the Section 3/4 source into one row per reported plot/crop and calculates yield in kg/ha using the source field labelled `area_sqm` and crop share when present. It excludes the reported harvest-total field from the predictors and does not use the already-harvested or remaining-harvest quantities as predictors.

**Unit verification required:** confirm the source area units, crop-share definition, and harvest quantities against the official questionnaire before treating calculated yield as final agronomic yield. Extreme yield records are flagged in the generated dataset rather than silently deleted.

### Step C — Train and evaluate models

```powershell
python analysis/03_train_models.py
```

The script attempts to train separate models for:

- Crop yield (kg/ha)
- Fruit production (kg)
- Egg production (count)
- Honey production (kg)
- Daily milk production (liters)

A model is saved only if its outcome and predictors are available and there are enough usable observations. This is deliberate: not every dataset has a valid predictive target by itself. Each model is compared with a simple training-set median baseline. Model outputs are saved under `models/`; metrics are written to `data/public/model_metrics.json`, `data/public/model_metrics.csv`, and `reports/model_training_report.md`.

The crop-yield validation uses a cluster-held-out split where the cluster identifier is available. Secondary models use a group-held-out split where possible. Metrics are exploratory and do not guarantee performance for future seasons or new districts.

Practice associations are written to `data/public/practice_associations.csv`. The file contains raw p-values and Benjamini–Hochberg adjusted `q_value_fdr_bh`, along with flags for raw p < 0.05 and adjusted q < 0.05. Category codes must be checked against the official data dictionary before interpreting which coded response is “yes” or “no”.

## 5. Run the web application

After the workflow above completes:

```powershell
streamlit run app/streamlit_app.py
```

Streamlit will print a local URL, usually `http://localhost:8501`. Open it in a browser. The interface includes:

- Crop-yield estimate form
- Observed district/crop yield analytics
- Secondary production model explorer (when models trained successfully)
- Model metrics and limitations

District and crop values are shown as source codes because a verified NISR label dictionary was not included in the supplied archive. Do not publish translated labels until the official codebook has been checked.

## 6. Run the prediction API (optional)

Open a second PowerShell window in the project root, activate `.venv`, then run:

```powershell
uvicorn src.harvestgap.api:app --reload
```

Open `http://127.0.0.1:8000/docs` for interactive API documentation.

Example request to `POST /predict`:

```json
{
  "model": "crop_yield_kg_ha",
  "features": {
    "crop_code": "106",
    "province": "1",
    "district": "11",
    "Season": "2",
    "crop_area_ha": 0.08
  }
}
```

The example is illustrative only. Supply the complete feature set expected by the saved model for best results. Missing numeric features are imputed by the trained pipeline; missing categorical features use the most frequent training category. This behavior should be reviewed before operational deployment.

## 7. Tests

```powershell
python tests/test_bh_correction.py
python tests/test_model_artifacts.py
```

## 8. What the initial validation says

The saved run currently reports these held-out results:

| Model | R² on model target scale | MAE | Median-baseline MAE | Interpretation |
|---|---:|---:|---:|---|
| Crop yield | 0.492 (log1p scale) | 2,570 kg/ha | 3,321 kg/ha | Improves on the simple baseline; yield units still need official verification. |
| Fruit production | 0.061 | 68.85 kg | 70.16 kg | Weak predictive signal; exploratory only. |
| Egg production | 0.337 | 6.13 eggs | 10.67 eggs | Improves on the baseline on this split. |
| Honey production | 0.235 | 0.097 kg | 0.045 kg | MAE is worse than the zero-heavy median baseline; do not rely on individual predictions. |
| Daily milk production | 0.667 | 21.56 L | 46.27 L | Improves on the baseline on this split. |

These are not accuracy percentages. The split is cluster-held-out, but it is not a test on a future year. The app warns about models with weak R² or worse MAE than the baseline.

## 9. Retraining after data changes

1. Put new original `.dta` files in `data/raw/`.
2. Run Step A, Step B, and Step C in order.
3. Review the data-quality report, metrics, association results, and limitations.
4. Test the app again.

## 10. Methodology and safeguards

- Raw Stata files are included unchanged.
- Cleaning is conservative; no blanket mean/median imputation is applied to raw files.
- Modelling pipelines impute missing predictor values inside the training pipeline.
- One-hot encoding is used for coded categorical predictors rather than treating codes as continuous measurements.
- The crop target is log-transformed for training to reduce the influence of skewness; metrics include transformed-scale R² and original-scale errors.
- Practice-association p-values are corrected across all tests in the generated association table using Benjamini–Hochberg FDR control.
- Models do not establish causation. Confounding, survey design, sample selection, and measurement error remain possible.
- Survey weights are preserved but are not used as model sample weights in this initial prototype. Nationally representative inference requires appropriate survey-design methodology.
- There are no live weather, satellite, soil-test, irrigation scheduling, or live market-price data feeds in this version. Such modules require additional verified data and domain validation.

## 11. Recommended next improvements before public/competition deployment

See `DEPLOYMENT.md` for GitHub, Streamlit Cloud, and API deployment instructions.

1. Obtain the official NISR questionnaire/data dictionary and confirm category labels, district codes, area units, and yield definitions.
2. Review model performance by crop and district, add uncertainty intervals, and test on an external season or geographic holdout if data become available.
3. Validate agronomic recommendations with local extension officers and field evidence.
4. Add consent, privacy, and safe handling procedures if collecting farmer-entered information.
5. Deploy only after environment, API, and user-input testing. Do not expose raw household records in the public repository.
6. Include an AI-use disclosure and acknowledge NISR and all data sources in the hackathon submission, following the organizers' rules.

## Farmer-first interactive dashboard (redesigned)

The Streamlit interface in `app/streamlit_app.py` has a farmer-focused navigation and shorter workflow:

- **Home:** simple task cards and a compact overview.
- **Predict my harvest:** district, crop, planted area, season, and the farmer's main concern. The crop names are read from the supplied NISR value-label dictionary. Because several remaining model variables are survey-coded and are not yet safely translated to farmer language, the app fills those inputs from training metadata defaults and explicitly warns that this is an exploratory estimate, not a fully personalized forecast.
- **Farm advice:** cautious, practical next steps for yield, water, soil, crop health, storage, and markets. These are general guidance prompts, not diagnoses or prescriptions.
- **District insights:** filters observed productivity summaries and allows CSV download.
- **Practice evidence:** filters association results and can show FDR-adjusted findings.
- **Other production:** displays exploratory estimates for secondary models.
- **About HarvestGap:** model metrics and limitations.

Navigation buttons route to the relevant page. The sidebar intentionally has no promotional image to keep the space focused on tasks. To run locally:

```powershell
.\.venv\Scripts\Activate.ps1
streamlit run app/streamlit_app.py
```

The dashboard requires internet access only to load the optional Google Fonts stylesheet; it remains usable without the custom font if that request is blocked.

## Home dashboard data

The home page uses survey-weighted aggregates of the AHS 2024 data in `data/public/`, with any group of fewer than 30 plots left out:

- `crop_yields_district.csv`, `crop_yields_national.csv`: typical (median) yield and the middle-half range (25th–75th percentile) by crop and district.
- `district_indicators.csv`: irrigation status, erosion threats, post-harvest advice coverage and other indicators by district.
- `practice_effects.csv`: per crop, the yield difference on plots using each practice compared with similar plots (same district and season, similar plot size), with 95% confidence intervals.
- `rwanda_districts.geojson`: district boundaries from [geoBoundaries](https://www.geoboundaries.org) (Runfola et al. 2020; source: Open Data Rwanda), licensed CC BY 4.0.

The "Quick Harvest Estimate" shows the typical yield that surveyed farms of the same crop reach in the same district. It does not use the crop-yield model, because with default inputs that model currently underestimates yields by about half.

## Website (React + Tailwind)

The public website lives in `web/`. It is a static React app (Vite, Tailwind CSS, Recharts) that reads one JSON file of survey-weighted summaries, so it needs no server or database.

```bash
# 1. Rebuild the website data from data/public/ (only after the summaries change)
.venv/bin/python analysis/04_export_web_data.py

# 2. Run the site locally (Node 18+)
cd web
npm install
npm run dev          # http://localhost:5173

# 3. Production build (output in web/dist/)
npm run build
```

Pages: Overview, My Farm, Irrigation, Soil & Fertility, Productivity, Post-harvest & Value, Exports, Districts (with a profile for each of the 30 districts) and About & Method. `web/vercel.json` lets the site be deployed on Vercel with working page links.
