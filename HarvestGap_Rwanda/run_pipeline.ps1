# Run this script from the HarvestGap_Rwanda project root after installing requirements.
$ErrorActionPreference = 'Stop'
python analysis/01_audit_and_clean.py
if ($LASTEXITCODE -ne 0) { throw 'Dataset audit/cleaning failed.' }
python analysis/02_build_features.py
if ($LASTEXITCODE -ne 0) { throw 'Feature engineering failed.' }
python analysis/03_train_models.py
if ($LASTEXITCODE -ne 0) { throw 'Model training failed.' }
Write-Host 'Pipeline complete. Review reports/model_training_report.md and data/public/.'
