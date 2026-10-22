# Rwanda Agricultural Intelligence Platform

NISR Big Data Hackathon 2026 · Track 1: Agricultural Productivity

A decision-support platform built on the NISR **Agricultural Household Survey (AHS) 2024**
that helps farmers and agricultural planners act on productivity, irrigation, soil and fertility
management, post-harvest handling and market opportunities.

## Data

The source is the AHS 2024 microdata from the [NISR Microdata Portal](https://microdata.statistics.gov.rw).
NISR microdata may not be redistributed, so **raw and household/plot-level files are not in
this repository**. To rebuild:

1. Download the AHS 2024 Stata (`.dta`) files and place them in `data/raw/`
   (or point `AHS_RAW_DIR` at their folder).
2. Run the pipeline:

```bash
python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python pipeline.py
```

### Outputs

| File | Level | Published | Contents |
|---|---|---|---|
| `data/processed/plot_crops.parquet` | crop × plot × season | no | Yield, seed, fertilizer, irrigation, soil conservation, tenure + household features |
| `data/processed/households.parquet` | household | no | Head characteristics, poverty, extension, cooperatives, finance |
| `data/processed/fruits.parquet`, `milk.parquet` | household | no | Production and commercialisation |
| `data/public/district_indicators.csv` | district | yes | Irrigation gaps, input adoption, soil threats, extension, poverty |
| `data/public/crop_yields_national.csv` | crop | yes | Weighted yield distribution and input adoption |
| `data/public/crop_yields_district.csv` | district × crop | yes | Same, by district |
| `data/public/fruit_market.csv` | fruit | yes | Production, sold share, prices |
| `data/public/milk_market.csv` | province | yes | Milk sold share and prices |

All published estimates use the AHS survey weights and suppress groups with fewer than 30
observations.

### Method notes

- **Yield** = harvest (kg) ÷ (plot area × crop's share of the plot). Rows with crop area below
  10 m² or a log-yield beyond 3×IQR of that crop are flagged `yield_valid = False`.
- **Fertilizer rate** is per plot (shared by intercropped crops) and capped at 1,000 kg/ha.
- AHS is observational. Relationships between practices and yield are **associations**, not
  proven causal effects, and the platform words its recommendations accordingly.
- Kigali's urban districts have few farming households and are flagged `low_sample`.

## AI use disclosure

AI assistants (Claude) were used to help write the data pipeline code and documentation.
The team reviewed, ran and validated all outputs and is responsible for the submission.

## Yield model

```bash
.venv/bin/python analysis/yield_model.py
```

Fits two models on the crop × plot table and writes `reports/yield_model.md`:

- **Practice associations**: one regression per crop (district and season fixed effects, errors
  clustered by survey cluster) estimating how much higher yields are on plots using each practice →
  `data/public/practice_associations.csv`.
- **Yield predictor**: gradient-boosted trees for 20 major crops, validated with cluster-grouped
  cross-validation against a crop × district median benchmark → `models/yield_model.joblib`,
  `data/public/model_metrics.json`, `model_metrics_by_crop.csv`, `feature_importance.csv`.
- **Scenarios and gaps**: model-estimated yield if non-users adopted improved seed and fertilizer
  (`input_scenario_district.csv`) and each district's gap to the national 75th-percentile yield
  (`district_yield_gaps.csv`).

Every leaf of the saved model summarises at least 50 plots, so it holds no individual household's answers.
