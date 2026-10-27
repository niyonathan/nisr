# HarvestGap Rwanda — Model training report

Models are trained from the supplied Rwanda AHS2024 survey data. They are exploratory decision-support models, not causal models or guaranteed forecasts.

## Model results

### crop_yield_kg_ha
- Status: trained
- Usable rows: 59,283
- Validation: cluster-held-out 80/20
- R² on model target scale: 0.492 (log1p transformed)
- MAE on original scale: 2569.955
- Median-baseline MAE: 3320.943
- Median-baseline R² on model scale: -0.003
- RMSE on original scale: 7525.518

### fruit_production_kg
- Status: trained
- Usable rows: 6,889
- Validation: cluster-held-out 80/20
- R² on model target scale: 0.061 (original target scale)
- MAE on original scale: 68.853
- Median-baseline MAE: 70.158
- Median-baseline R² on model scale: -0.134
- RMSE on original scale: 162.943

### egg_production_count
- Status: trained
- Usable rows: 9,475
- Validation: cluster-held-out 80/20
- R² on model target scale: 0.337 (original target scale)
- MAE on original scale: 6.127
- Median-baseline MAE: 10.673
- Median-baseline R² on model scale: -0.162
- RMSE on original scale: 21.614

### honey_production_kg
- Status: trained
- Usable rows: 7,448
- Validation: cluster-held-out 80/20
- R² on model target scale: 0.235 (original target scale)
- MAE on original scale: 0.097
- Median-baseline MAE: 0.045
- Median-baseline R² on model scale: -0.011
- RMSE on original scale: 0.375

### milk_daily_production_liters
- Status: trained
- Usable rows: 12,209
- Validation: cluster-held-out 80/20
- R² on model target scale: 0.667 (original target scale)
- MAE on original scale: 21.558
- Median-baseline MAE: 46.271
- Median-baseline R² on model scale: -0.142
- RMSE on original scale: 70.853

## Practice associations
- Tests performed: 164
- Raw p < 0.05: 72
- Benjamini–Hochberg FDR q < 0.05: 65
- P-values were adjusted across the complete set of tests written to practice_associations.csv.
- Associations are observational and may be confounded; they do not prove that a practice causes yield changes.

## Limitations
- Verify survey variable codes, units, and category labels against the official NISR questionnaire/data dictionary before operational recommendations.
- Yield is calculated using the source field labelled area_sqm and crop share where available. Confirm these units before treating the values as final agronomic yield.
- Survey-weighted inference is not performed by these initial machine-learning models.
- Cluster-held-out validation is not a guarantee of performance on future seasons or unseen districts.
- Inputs available only after harvest are excluded from the crop-yield model to reduce target leakage.
