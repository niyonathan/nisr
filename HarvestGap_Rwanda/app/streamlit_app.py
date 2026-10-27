﻿"""Interactive, farmer-first HarvestGap Rwanda dashboard.

Run from project root: streamlit run app/streamlit_app.py
The interface intentionally asks farmers for a short set of understandable inputs.
Other model inputs are filled from documented training-set defaults because the
original survey variables are coded and should not be exposed as farmer questions
until the official questionnaire has been mapped.
"""
import sys
import json
import base64
from urllib.parse import quote
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pandas as pd
import streamlit as st
from nisr.HarvestGap_Rwanda.src.harvestgap.config import PUBLIC_DIR, MODEL_DIR
from nisr.HarvestGap_Rwanda.src.harvestgap.predict import MODEL_FILES, predict_one, load_model

st.set_page_config(page_title="HarvestGap Rwanda | Farmer Dashboard", page_icon="ðŸŒ±", layout="wide", initial_sidebar_state="expanded")

# ---------- Visual system ----------
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap');
:root { --forest:#075b45; --forest2:#0b7658; --ink:#132d26; --muted:#657a72; --line:#dce9e2; --pale:#f3f8f5; }
html, body, [class*="css"] { font-family:'DM Sans',sans-serif; color:var(--ink); }
.stApp { background:#f7faf8; }
.block-container { max-width:1600px; padding-top:1.2rem; padding-bottom:2rem; }
[data-testid="stSidebar"] { background:#073a32; border-right:1px solid #164c42; }
[data-testid="stSidebar"] * { color:#f4fbf7 !important; }
.sidebar-nav { display:flex; flex-direction:column; gap:6px; margin:10px 0 18px; }
.sidebar-nav a { display:flex; align-items:center; gap:12px; text-decoration:none !important; color:#eef8f3 !important; padding:11px 12px; border-radius:9px; font-size:13px; font-weight:600; transition:background .15s ease; }
.sidebar-nav a:hover { background:#14584a; }
.sidebar-nav a.active { background:#087452; color:#fff !important; box-shadow:inset 3px 0 #8de0ae; }
.sidebar-nav .nav-emoji { width:22px; text-align:center; font-size:16px; }
.topline { display:flex; justify-content:space-between; align-items:center; padding:3px 2px 15px; color:#58756a; font-size:12px; }
.home-hero { position:relative; overflow:hidden; background:linear-gradient(100deg,#e8f4eb 0%,#edf6f0 65%,#d8eadf 100%); border:1px solid #d5e7da; border-radius:17px; padding:24px 26px; min-height:160px; }
.home-hero h1 { font-family:Manrope,sans-serif; color:#123e30; font-size:28px; line-height:1.18; margin:7px 0; letter-spacing:-.8px; }
.home-hero p { color:#496b5d; font-size:13px; max-width:650px; margin:0; }
.action-card { border:1px solid #dce9e2; border-radius:13px; padding:14px; background:#fff; min-height:116px; }
.action-card h4 { font-size:13px; margin:7px 0 4px; color:#163d30; }
.action-card p { color:#708178; font-size:11px; line-height:1.4; margin:0; }
.right-panel { border:1px solid #dce9e2; background:#fff; border-radius:14px; padding:15px; margin-bottom:12px; }
.advice-row { display:flex; gap:10px; align-items:flex-start; border:1px solid #e2ece5; border-radius:10px; padding:11px; margin:9px 0; background:#fff; }
.advice-symbol { min-width:36px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:10px; background:#e4f5e9; font-size:18px; }
.advice-row strong { display:block; color:#173b30; font-size:12px; }
.advice-row span { display:block; color:#708178; font-size:11px; line-height:1.4; margin-top:4px; }
[data-testid="stSidebar"] a { color:#eef8f3; }

[data-testid="stSidebar"] hr { border-color:#47766b; }
.brand { display:flex; align-items:center; gap:10px; padding:8px 3px 4px; }
.brand-mark { width:43px; height:43px; border-radius:13px; display:flex; align-items:center; justify-content:center; background:#d7f2df; color:#075b45; font-size:25px; }
.brand-title { font-family:Manrope,sans-serif; font-size:22px; line-height:1.05; font-weight:800; letter-spacing:-.7px; }
.brand-sub { color:#b9d9cc; font-size:11px; margin-top:5px; }
.eyebrow { text-transform:uppercase; letter-spacing:1.4px; font-size:10px; font-weight:800; color:#4e7a68; }
.hero { background:#e6f3eb; border:1px solid #d6e9dc; border-radius:18px; padding:24px 27px; min-height:154px; }
.hero h1 { font-family:Manrope,sans-serif; font-size:28px; letter-spacing:-1px; color:#103d30; margin:4px 0 7px; }
.hero p { color:#42675a; margin:0; font-size:14px; max-width:680px; }
.hero-chip { display:inline-block; margin-top:14px; background:#fff; color:#176348; padding:6px 10px; border-radius:20px; font-size:11px; font-weight:700; }
.section-title { font-family:Manrope,sans-serif; font-size:18px; font-weight:800; color:#173b30; margin:6px 0 2px; }
.section-sub { color:#6b7f76; font-size:12px; margin-bottom:12px; }
.metric-card { background:#fff; border:1px solid var(--line); border-radius:14px; padding:15px 16px; min-height:104px; }
.metric-label { color:#6b7f76; font-size:11px; font-weight:600; }
.metric-value { color:#173b30; font-family:Manrope,sans-serif; font-size:24px; font-weight:800; margin-top:7px; }
.metric-note { color:#4e8a68; font-size:11px; margin-top:2px; }
.quick-card { background:#fff; border:1px solid var(--line); border-radius:14px; padding:17px; min-height:118px; }
.quick-icon { font-size:23px; margin-bottom:8px; }
.quick-title { color:#183d30; font-weight:800; font-size:14px; }
.quick-text { color:#718178; font-size:12px; margin-top:5px; line-height:1.45; }
.panel { background:#fff; border:1px solid var(--line); border-radius:16px; padding:18px; }
.tip { background:#eef8f1; border-left:4px solid #2c9665; padding:12px 14px; border-radius:8px; color:#285742; font-size:13px; }
.warning-note { background:#fff7e7; border:1px solid #f2dfb4; border-radius:10px; padding:11px 13px; color:#77551b; font-size:12px; }
div.stButton > button[kind="primary"] { background:#087452; border:1px solid #087452; color:white; border-radius:9px; min-height:43px; font-weight:700; }
div.stButton > button[kind="primary"]:hover { background:#065e43; border-color:#065e43; }
div.stButton > button { border-radius:9px; }
[data-testid="stForm"] { background:#fff; border:1px solid var(--line); padding:18px; border-radius:14px; }
[data-testid="stMetric"] { background:#fff; border:1px solid var(--line); padding:12px 14px; border-radius:12px; }
[data-testid="stDataFrame"] { border:1px solid var(--line); border-radius:10px; overflow:hidden; }
footer {visibility:hidden;}
@media (max-width: 900px) { .hero h1 {font-size:23px;} .block-container {padding-left:1rem;padding-right:1rem;} }

/* Premium dashboard polish: consistent spacing, real outline icons, responsive panels */
:root { --forest:#064b3b; --forest2:#087b58; --ink:#142d25; --muted:#65786f; --line:#dce8e1; --pale:#f4f8f5; }
.stApp { background:#f4f7f5; }
.block-container { max-width:1720px; padding-top:1.15rem; padding-bottom:2.2rem; }
[data-testid="stSidebar"] { background:linear-gradient(180deg,#052f2b 0%,#063b32 58%,#052b28 100%); border-right:1px solid #16483f; }
[data-testid="stSidebar"] > div:first-child { padding-top:1.15rem; }
.brand { display:flex; align-items:center; gap:11px; padding:8px 4px 13px; }
.brand-logo { width:47px; height:47px; object-fit:contain; background:#fff; border-radius:12px; padding:4px; flex:0 0 47px; }
.brand-fallback { width:47px;height:47px;display:flex;align-items:center;justify-content:center;background:#d9f4e4;color:#075b45;border-radius:12px;font-weight:900;font-size:18px;flex:0 0 47px; }
.brand-title { font-family:Manrope,sans-serif; font-size:21px; line-height:1.02; font-weight:800; letter-spacing:-.6px; color:#f4fbf7; }
.brand-title span { color:#51d3a0; }
.brand-sub { color:#b8d8cd; font-size:10px; margin-top:6px; }
.sidebar-tagline,.nav-section-label { color:#8fb7a9; font-size:9px; letter-spacing:1.5px; font-weight:800; margin:5px 4px 13px; }
.nav-section-label { margin-top:18px; margin-bottom:8px; }
.sidebar-nav { display:flex; flex-direction:column; gap:5px; margin:8px 0 18px; }
.sidebar-nav a.sidebar-link { display:flex; align-items:center; gap:12px; text-decoration:none !important; color:#e5f2ec !important; padding:12px 13px; border-radius:10px; font-size:12px; font-weight:600; transition:all .16s ease; border:1px solid transparent; }
.sidebar-nav a.sidebar-link:hover { background:#104b40; border-color:#1b5e4d; transform:translateX(1px); }
.sidebar-nav a.sidebar-link.active { background:#087a59; color:#fff !important; box-shadow:inset 3px 0 #6fe2ae; border-color:#138765; }
.nav-icon { width:19px; height:19px; flex:0 0 19px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; opacity:.95; }
.sidebar-bottom { border-top:1px solid #24574b; margin-top:25px; padding:17px 4px 5px; }
.sidebar-bottom-title { color:#e9f8f1; font-size:12px; font-weight:700; }
.sidebar-bottom-copy { color:#a7cabe; font-size:10px; line-height:1.55; margin-top:5px; }
.sidebar-version { color:#6d9d8c; font-size:9px; margin-top:20px; letter-spacing:.7px; }
.topline { display:flex; justify-content:space-between; align-items:center; padding:2px 2px 12px; color:#698278; font-size:10px; letter-spacing:.7px; font-weight:700; }
.home-hero { display:flex; position:relative; overflow:hidden; background:linear-gradient(110deg,#e8f4eb 0%,#edf6ef 52%,#d5eadc 100%); border:1px solid #d4e6da; border-radius:17px; padding:23px 25px; min-height:164px; box-shadow:0 3px 12px rgba(26,73,49,.035); }
.hero-copy { position:relative; z-index:2; width:68%; }
.home-hero h1 { font-family:Manrope,sans-serif; color:#123e30; font-size:26px; line-height:1.13; margin:7px 0; letter-spacing:-.8px; }
.home-hero p { color:#496b5d; font-size:12px; max-width:500px; margin:0; line-height:1.55; }
.hero-chip { display:inline-flex; align-items:center; gap:7px; margin-top:12px; background:rgba(255,255,255,.82); color:#176348; padding:6px 10px; border-radius:20px; font-size:10px; font-weight:700; }
.hero-chip-dot { width:7px;height:7px;border-radius:50%;background:#20a66d;display:inline-block; }
.hero-art { position:absolute; right:0; top:0; width:42%; height:100%; overflow:hidden; background:linear-gradient(180deg,rgba(222,240,224,.1),rgba(179,217,188,.4)); }
.sun { position:absolute; right:24%; top:18%; width:27px;height:27px;background:#f7c95b;border-radius:50%; box-shadow:0 0 0 8px rgba(247,201,91,.16); }
.hill { position:absolute; bottom:-24%; width:120%; height:78%; border-radius:50% 50% 0 0; transform:rotate(-8deg); }
.hill-back { right:-22%; background:#a6d2a9; bottom:-28%; }
.hill-front { right:-30%; bottom:-43%; background:linear-gradient(140deg,#4eaa77,#0e7753); }
.crop-line { position:absolute; bottom:0; width:2px; height:47%; background:rgba(235,255,236,.65); transform:rotate(24deg); border-radius:4px; }
.crop-one { right:28%; height:39%; }.crop-two { right:19%; height:48%; }.crop-three { right:10%; height:34%; }
.action-card { border:1px solid #dce8e1; border-radius:12px; padding:13px 13px 11px; background:#fff; min-height:145px; box-shadow:0 2px 7px rgba(25,67,48,.025); transition:transform .15s ease,box-shadow .15s ease; }
.action-card:hover { transform:translateY(-2px); box-shadow:0 8px 20px rgba(25,67,48,.07); }
.action-icon { width:37px;height:37px;display:flex;align-items:center;justify-content:center;border-radius:10px;margin-bottom:9px; }
.action-icon.green { background:#e0f5e8;color:#087452; }.action-icon.blue {background:#e4f0ff;color:#2876ce}.action-icon.amber {background:#fff1d9;color:#b9770e}.action-icon.purple {background:#eee8ff;color:#7652c8}
.card-icon { width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round; }
.action-card h4 { font-size:12px; margin:0 0 5px; color:#163d30; font-weight:800; }
.action-card p { color:#708178; font-size:10px; line-height:1.45; margin:0 0 10px; min-height:28px; }
.card-link { display:flex; justify-content:space-between; align-items:center; border-top:1px solid #eef3ef; padding-top:8px; font-size:10px; font-weight:800; color:#087452 !important; text-decoration:none !important; }
.panel,.right-panel { box-shadow:0 2px 9px rgba(25,67,48,.025); }
.right-panel { border:1px solid #dce8e1; background:#fff; border-radius:14px; padding:14px; margin-bottom:12px; }
.advice-row { display:flex; gap:10px; align-items:flex-start; border:1px solid #e2ece5; border-radius:10px; padding:10px; margin:8px 0; background:#fff; }
.advice-symbol { min-width:34px; height:34px; display:flex; align-items:center; justify-content:center; border-radius:9px; background:#e4f5e9; font-size:0; }
.advice-symbol:after { content:'âœ“'; font-size:16px; color:#087452; font-weight:800; }
.stButton button, .stDownloadButton button { border-radius:9px; font-weight:700; }
div.stButton > button[kind="primary"] { background:#087452; border:1px solid #087452; box-shadow:0 2px 4px rgba(8,116,82,.13); }
div.stButton > button[kind="primary"]:hover { background:#065e43; border-color:#065e43; }
@media (max-width:1100px) { .hero-copy{width:78%;}.hero-art{width:35%;opacity:.65}.home-hero h1{font-size:23px;} }
@media (max-width:760px) { .hero-art{display:none}.hero-copy{width:100%}.home-hero{padding:18px}.home-hero h1{font-size:22px;} }

/* Home and prediction views: airy, reference-inspired workspace */
.stApp { background:#f5f8f7; }
.block-container { max-width:1680px; padding-top:.65rem; }
.topbar { display:flex; align-items:center; justify-content:space-between; gap:18px; height:48px; margin:0 0 12px; padding:0 2px; color:#244b40; }
.searchbox { display:flex; align-items:center; gap:11px; width:min(520px,65%); padding:10px 15px; background:#fff; border:1px solid #dce7e5; border-radius:10px; color:#71867e; font-size:12px; }
.user-chip { display:flex; align-items:center; gap:9px; font-size:11px; font-weight:700; color:#163d32; }
.user-avatar { width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#087452;color:white;font-size:15px; }
.home-hero,.predict-hero { background:linear-gradient(100deg,#e7f4ed 0%,#eaf4ee 52%,#cee7d8 100%); min-height:178px; }
.home-hero { background-image:linear-gradient(90deg,rgba(233,246,238,.97) 0%,rgba(233,246,238,.91) 43%,rgba(233,246,238,.04) 100%),url('/app/static/rwanda_highlands_hero.jpg'); background-position:center; background-size:cover; }
.home-hero h1,.predict-hero h1 { font-size:28px; }
.home-hero p,.predict-hero p { max-width:520px; }
.dashboard-grid { display:grid; grid-template-columns:minmax(0,1.55fr) minmax(0,1.3fr); gap:14px; align-items:start; }
.dashboard-panel { background:white;border:1px solid #dce8e3;border-radius:13px;padding:15px;box-shadow:0 3px 12px rgba(22,66,48,.035); margin-bottom:12px; }
.dashboard-panel .section-title { font-size:16px; }
.predict-layout { display:grid; grid-template-columns:minmax(0,1.6fr) minmax(300px,.78fr); gap:14px; align-items:start; }
.predict-form-wrap { background:white;border:1px solid #dce8e3;border-radius:14px;padding:18px; }
.result-highlight { background:linear-gradient(110deg,#e8f7ef,#f4fbf7); border:1px solid #d5eee0; border-radius:13px; padding:17px; }
.result-highlight .metric-value { font-size:30px; }
.factor-row { display:grid;grid-template-columns:105px 1fr 36px;gap:9px;align-items:center;font-size:11px;color:#49665b;margin:11px 0; }
.factor-track { height:8px;background:#edf2f1;border-radius:99px;overflow:hidden; }
.factor-fill { height:100%;background:#0a8058;border-radius:99px; }
.advice-row { align-items:center; }
.home-feature-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin:12px 0; }
.home-body-grid { display:grid; grid-template-columns:minmax(0,1.18fr) minmax(0,1fr); gap:14px; align-items:stretch; }
.home-split-panel { background:#fff;border:1px solid #dce8e3;border-radius:13px;padding:15px;box-shadow:0 3px 12px rgba(22,66,48,.035); }
.home-split-panel .section-title { font-size:15px; }
.home-estimate-grid { display:grid;grid-template-columns:1.1fr 1.1fr .8fr;gap:10px;align-items:end; }
.home-estimate-grid .stFormSubmitButton { grid-column:1/-1; }
.impact-strip { display:grid;grid-template-columns:1.5fr repeat(4,1fr);gap:8px;padding:13px 16px;margin-top:13px;background:#eaf6ef;border:1px solid #deeee4;border-radius:12px; }
.impact-item { border-left:1px solid #cfe5d7;padding-left:13px;color:#174635;font-size:11px;font-weight:700; }
.impact-item span { display:block;color:#6c8176;font-size:10px;font-weight:400;margin-top:3px; }
.sidebar-promo {margin-top:38px;padding:15px 13px;border:1px solid #276052;border-radius:11px;color:#eef9f1;background:linear-gradient(145deg,rgba(13,92,65,.65),rgba(4,45,39,.7));font-size:11px;line-height:1.55}
.sidebar-promo span {display:block;margin:8px 0 0 25px;color:#b5d2c4;font-size:10px}
.sidebar-quick {margin-top:22px;padding-top:12px;border-top:1px solid #27564b}
.sidebar-quick a {display:block;color:#eaf7f0!important;text-decoration:none;padding:8px 5px;font-size:11px}
.home-hero { min-height:205px; }
.predict-hero { min-height:190px; }
.predict-hero { background-image:linear-gradient(90deg,rgba(233,246,238,.97) 0%,rgba(233,246,238,.88) 48%,rgba(233,246,238,.05) 100%),url('/app/static/rwanda_highlands_hero.jpg');background-position:center;background-size:cover; }
.form-inner { background:#fff;border:1px solid #dce8e3;border-radius:14px;padding:17px;box-shadow:0 3px 12px rgba(22,66,48,.035); }
.form-inner .stForm { border:0;padding:0;background:transparent; }
.result-rail { background:#fff;border:1px solid #dce8e3;border-radius:14px;padding:15px;box-shadow:0 3px 12px rgba(22,66,48,.035); }
.home-appbar {display:flex;justify-content:flex-end;align-items:center;height:45px;margin-bottom:11px;color:#244b40}
.home-search {margin-right:auto;width:min(520px,64%);padding:10px 15px;border:1px solid #dce7e5;background:white;border-radius:9px;color:#71867e;font-size:12px}
@media(max-width:1100px){.home-body-grid{grid-template-columns:1fr}.impact-strip{grid-template-columns:repeat(2,1fr)}}
@media(max-width:700px){.home-feature-grid{grid-template-columns:repeat(2,1fr)}.home-estimate-grid{grid-template-columns:1fr}.impact-strip{grid-template-columns:1fr 1fr}.home-hero{min-height:160px}}
@media(max-width:950px){.dashboard-grid,.predict-layout{grid-template-columns:1fr}.home-hero{background-image:linear-gradient(90deg,rgba(233,246,238,.96),rgba(233,246,238,.72)),url('/app/static/rwanda_highlands_hero.jpg')}}

</style>
""", unsafe_allow_html=True)

# ---------- Data helpers ----------
def read_json(path, fallback):
    try:
        return json.loads(path.read_text(encoding="utf-8")) if path.exists() else fallback
    except Exception:
        return fallback

metrics_path = PUBLIC_DIR / "model_metrics.json"
model_metrics = read_json(metrics_path, [])
trained_metrics = {m.get("model"): m for m in model_metrics if m.get("status") == "trained"}
metadata = read_json(PUBLIC_DIR / "app_feature_metadata.json", {"features": {}})
district_names = read_json(PUBLIC_DIR / "district_code_names.json", {})
summary_path = PUBLIC_DIR / "district_crop_yield_summary.csv"
association_path = PUBLIC_DIR / "practice_associations.csv"

# Codes are intentionally labelled as survey crop codes until the official crop codebook is available.
def crop_name_dictionary():
    """Read crop labels embedded in the supplied NISR Stata value-label dictionary."""
    labels = read_json(PUBLIC_DIR / "value_label_dictionary.json", {})
    for filename, variables in labels.items():
        if "CROP GROWN" in filename.upper():
            for variable, mapping in variables.items():
                if variable.upper().startswith("S3_Q4_1") and isinstance(mapping, dict):
                    return {str(k): str(v).strip() for k, v in mapping.items()}
    return {}

CROP_NAMES = crop_name_dictionary()

def crop_options():
    bundle = load_model("crop_yield_kg_ha")
    opts = bundle.get("input_metadata", {}).get("crop_code", {}).get("options", [])
    if not opts:
        opts = metadata.get("features", {}).get("crop_code", {}).get("options", ["101"])
    return [str(x) for x in opts]

def district_options():
    raw = metadata.get("features", {}).get("district", {}).get("options", [])
    result = []
    for code in raw:
        key = str(code)
        try: key = str(int(float(code)))
        except (ValueError, TypeError): pass
        name = district_names.get(key, f"District code {key}")
        result.append((f"{name}", str(code)))
    return result

def model_default_values(bundle):
    """Create a complete model row from stored training metadata defaults."""
    values = {}
    imeta = bundle.get("input_metadata", {})
    for col in bundle.get("feature_columns", []):
        meta = imeta.get(col, metadata.get("features", {}).get(col, {}))
        default = meta.get("default", 0)
        if col in bundle.get("categorical_columns", []):
            values[col] = str(default)
        else:
            try: values[col] = float(default)
            except (TypeError, ValueError): values[col] = 0.0
    return values

def header(eyebrow, title, subtitle):
    st.markdown(f'<div class="eyebrow">{eyebrow}</div><div class="section-title" style="font-size:25px;margin-top:5px">{title}</div><div class="section-sub">{subtitle}</div>', unsafe_allow_html=True)

def metric_card(label, value, note=""):
    st.markdown(f'<div class="metric-card"><div class="metric-label">{label}</div><div class="metric-value">{value}</div><div class="metric-note">{note}</div></div>', unsafe_allow_html=True)

# ---------- Brand assets and professional outline icons ----------
def find_logo():
    """Find the official logo.png without requiring any other project file to change."""
    candidates = [ROOT / "logo.png", ROOT / "assets" / "logo.png", ROOT / "app" / "logo.png", ROOT / "assets" / "images" / "logo.png"]
    return next((path for path in candidates if path.exists()), None)

_logo_path = find_logo()
if _logo_path:
    _logo_b64 = base64.b64encode(_logo_path.read_bytes()).decode("ascii")
    _logo_html = f'<img class="brand-logo" src="data:image/png;base64,{_logo_b64}" alt="HarvestGap Rwanda logo" />'
else:
    # The official logo will be used automatically when logo.png is in the project root.
    _logo_html = '<div class="brand-fallback">HG</div>'

# Streamlit serves files placed in app/static at a stable same-origin path.
hero_asset = ROOT / "assets" / "rwanda_highlands_hero.jpg"
static_dir = ROOT / "app" / "static"
static_dir.mkdir(exist_ok=True)
static_hero = static_dir / hero_asset.name
if hero_asset.exists() and (not static_hero.exists() or hero_asset.stat().st_mtime_ns > static_hero.stat().st_mtime_ns):
    static_hero.write_bytes(hero_asset.read_bytes())

ICON_SVG = {
    "Home": '<svg viewBox="0 0 24 24"><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-7h6v7"/></svg>',
    "Predict my harvest": '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/><path d="M8 7h8M8 11h6"/></svg>',
    "Farm advice": '<svg viewBox="0 0 24 24"><path d="M12 21V11"/><path d="M12 14C5 14 4 8 4 4c5 0 9 2 9 8"/><path d="M12 11c0-5 3-8 8-8 0 5-2 9-8 10"/></svg>',
    "District insights": '<svg viewBox="0 0 24 24"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>',
    "Practice evidence": '<svg viewBox="0 0 24 24"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M8 15h8"/></svg>',
    "Other production": '<svg viewBox="0 0 24 24"><path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9"/><circle cx="12" cy="12" r="9"/></svg>',
    "About HarvestGap": '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2-2.4 3.8M12 17.5h.01"/></svg>',
    "Water": '<svg viewBox="0 0 24 24"><path d="M12 3s7 7.3 7 12a7 7 0 0 1-14 0c0-4.7 7-12 7-12Z"/><path d="M9 16a3 3 0 0 0 3 3"/></svg>',
    "Markets": '<svg viewBox="0 0 24 24"><path d="M3 10h18l-2-6H5l-2 6Z"/><path d="M5 10v10h14V10M9 20v-6h6v6"/><path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/></svg>',
}

def svg_icon(name, css_class="icon-svg"):
    svg = ICON_SVG.get(name, ICON_SVG["Farm advice"])
    return svg.replace('<svg ', f'<svg class="{css_class}" aria-hidden="true" ', 1)

# ---------- Link-based navigation ----------
PAGES = [
    ("Home", "Home"),
    ("Predict my harvest", "Predict my harvest"),
    ("Farm advice", "Farm advice"),
    ("District insights", "District insights"),
    ("Practice evidence", "Practice evidence"),
    ("Other production", "Other production"),
    ("About HarvestGap", "About HarvestGap"),
]
# Real URL links keep navigation accessible and allow direct links/bookmarks.
try:
    requested_page = st.query_params.get("page", "Home")
except Exception:
    requested_page = "Home"
if requested_page not in [x[0] for x in PAGES]:
    requested_page = "Home"
page = requested_page
with st.sidebar:
    st.markdown(f'<div class="brand">{_logo_html}<div><div class="brand-title">HarvestGap<br/><span>Rwanda</span></div><div class="brand-sub">Better data. Higher yields.</div></div></div>', unsafe_allow_html=True)
    st.markdown('<div class="sidebar-tagline">AGRICULTURE INTELLIGENCE</div><hr/>', unsafe_allow_html=True)
    st.markdown('<div class="nav-section-label">YOUR FARM</div>', unsafe_allow_html=True)
    links = []
    for label, icon_name in PAGES:
        active = " active" if label == page else ""
        links.append(f'<a class="sidebar-link{active}" href="?page={quote(label)}">{svg_icon(icon_name, "nav-icon")}<span>{label}</span></a>')
    st.markdown('<nav class="sidebar-nav">' + ''.join(links) + '</nav>', unsafe_allow_html=True)
    st.markdown('<div class="sidebar-bottom"><div class="sidebar-bottom-title">Made for Rwandaâ€™s farmers</div><div class="sidebar-bottom-copy">Simple insights to support better farm decisions.</div><div class="sidebar-version">RESEARCH PROTOTYPE Â· AHS2024</div></div>', unsafe_allow_html=True)
    st.markdown('<div class="sidebar-promo"><b>🌱 &nbsp; Better Decisions<br/> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; for Higher Yields</b><span>Data-driven solutions for Rwanda’s farmers.</span></div><div class="sidebar-quick"><div class="nav-section-label">QUICK ACTIONS</div><a href="?page=Practice%20evidence">▤ &nbsp; Practice Evidence</a><a href="?page=Other%20production">♧ &nbsp; Other Production Models</a><a href="?page=About%20HarvestGap">ⓘ &nbsp; About &amp; Help</a></div>', unsafe_allow_html=True)

# ---------- Home dashboard ----------
if page == "Home":
    st.markdown('<div class="home-appbar"><div class="home-search">⌕ &nbsp; Search for information...</div><div class="user-chip"><span class="user-avatar">JD</span><span>Farmer workspace<br/><span style="font-weight:400;color:#71867e">Rwanda</span></span></div></div>', unsafe_allow_html=True)
    left_col, advice_col = st.columns([2.15, .95], gap="medium")
    with left_col:
        st.markdown('''<div class="home-hero"><div class="hero-copy"><div class="eyebrow">YOUR FARM Â· YOUR NEXT STEP</div><h1>Empowering Rwandan Farmers<br/>with Data-Driven Insights</h1><p>Estimate your harvest, explore district productivity, and find practical next steps for your farm.</p><span class="hero-chip"><span class="hero-chip-dot"></span> Better farms · Brighter future</span></div><div class="hero-art" aria-hidden="true"><div class="sun"></div><div class="hill hill-back"></div><div class="hill hill-front"></div><div class="crop-line crop-one"></div><div class="crop-line crop-two"></div><div class="crop-line crop-three"></div></div></div>''', unsafe_allow_html=True)
        st.write("")
        # Four primary tasks match the shortcut row in the design reference.
        q1,q2,q3,q4 = st.columns(4, gap="small")
        cards = [
            (q1, "Predict my harvest", "Predict Your Harvest", "Get an estimate for your crop and location.", "Predict my harvest", "green"),
            (q2, "District insights", "Explore District Data", "Compare observed productivity by district.", "District insights", "blue"),
            (q3, "Farm advice", "Get Farm Advice", "Find practical next steps for your farm.", "Farm advice", "amber"),
            (q4, "Other production", "Other Production", "Explore fruit, eggs, honey and milk.", "Other production", "purple"),
        ]
        for col, icon_name, title, desc, target, tone in cards:
            with col:
                st.markdown(f'<div class="action-card"><div class="action-icon {tone}">{svg_icon(icon_name, "card-icon")}</div><h4>{title}</h4><p>{desc}</p><a class="card-link" href="?page={quote(target)}">Open task <span>â†’</span></a></div>', unsafe_allow_html=True)
        st.write("")
        estimate_col, district_col = st.columns([1.12,1], gap="small")
        with estimate_col:
            st.markdown('<div class="home-split-panel"><div class="section-title">🌱 &nbsp; Quick Harvest Prediction</div><div class="section-sub">Fill in a few details about your farm to get an estimate.</div>', unsafe_allow_html=True)
            model_file = MODEL_DIR / MODEL_FILES["crop_yield_kg_ha"]
            if model_file.exists():
                bundle = load_model("crop_yield_kg_ha")
                all_values = model_default_values(bundle)
                districts = district_options()
                crop_codes = crop_options()
                with st.form("home_quick_yield_form", clear_on_submit=False):
                    a,b,c = st.columns([1.1,1.1,0.8])
                    district_labels = [x[0] for x in districts] or ["District not listed"]
                    with a:
                        selected_district = st.selectbox("District", district_labels, key="home_district")
                    with b:
                        selected_crop = st.selectbox("Crop", crop_codes, format_func=lambda code: CROP_NAMES.get(str(code), f"Crop {code}"), key="home_crop")
                    with c:
                        area = st.number_input("Land size (ha)", min_value=0.001, max_value=10000.0, value=0.25, step=0.05, key="home_area")
                    go = st.form_submit_button("✦  Get Prediction", type="primary", use_container_width=True)
                if go:
                    try:
                        district_code = districts[district_labels.index(selected_district)][1] if districts else str(all_values.get("district", "11"))
                        all_values["district"] = str(district_code)
                        all_values["crop_code"] = str(selected_crop)
                        all_values["crop_area_ha"] = float(area)
                        try:
                            dnum = int(float(district_code)); all_values["province"] = str({1:1,2:2,3:3,4:4,5:5}.get(dnum // 10, all_values.get("province", "1")))
                        except (TypeError, ValueError):
                            pass
                        result = predict_one("crop_yield_kg_ha", all_values)
                        yield_value = max(0.0, float(result["prediction"]))
                        st.session_state["last_prediction"] = {"yield_kg_ha":yield_value,"area_ha":float(area),"total_kg":yield_value*float(area),"district":selected_district,"crop":selected_crop,"season":"Selected from model defaults","concern":"Harvest quantity","metrics":result.get("metrics",{})}
                    except Exception as exc:
                        st.error(f"Prediction could not be completed: {exc}")
            else:
                st.warning("The crop-yield model is not available. Follow the model setup steps in README.md.")
            pred = st.session_state.get("last_prediction")
            if pred:
                st.markdown(f'<div class="result-highlight"><div class="metric-label">Estimated Yield</div><div class="metric-value">{pred["yield_kg_ha"]:,.0f} <span style="font-size:14px">kg/ha</span></div><div class="metric-note">{pred["total_kg"]:,.0f} kg estimated total harvest · exploratory estimate</div></div>', unsafe_allow_html=True)
            st.markdown('</div>', unsafe_allow_html=True)
        with district_col:
            st.markdown('<div class="home-split-panel"><div class="section-title">▥ &nbsp; District Productivity</div><div class="section-sub">Explore observed productivity across Rwanda.</div>', unsafe_allow_html=True)
            if summary_path.exists():
                try:
                    summary = pd.read_csv(summary_path, low_memory=False)
                    if not summary.empty and "median_yield_kg_ha" in summary:
                        chart_data = summary.copy()
                        if "district" in chart_data:
                            chart_data["district_name"] = chart_data["district"].map(lambda x: district_names.get(str(int(float(x))), f"District {x}") if pd.notna(x) else "Unknown")
                            chart = chart_data.groupby("district_name")["median_yield_kg_ha"].median().sort_values(ascending=False).head(8)
                            st.image(str(ROOT / "assets" / "rwanda_yield_districts.png"), use_container_width=True)
                        st.caption("District medians summarize observed crop-specific medians. They are not survey-weighted district estimates.")
                    else:
                        st.info("District summary has no rows to display yet.")
                except Exception:
                    st.info("District analytics could not be loaded. Open District insights for details.")
            else:
                st.info("District analytics will appear after the data pipeline has generated its summary.")
            st.markdown('</div>', unsafe_allow_html=True)
        st.markdown('<div class="impact-strip"><div><b>Our Impact</b><span>Supporting Rwanda’s agricultural transformation</span></div><div class="impact-item">Better yields<span>More food, more income</span></div><div class="impact-item">Informed farmers<span>Data for better decisions</span></div><div class="impact-item">Sustainable farming<span>Healthy soil, healthy future</span></div><div class="impact-item">Stronger Rwanda<span>Agriculture drives growth</span></div></div>', unsafe_allow_html=True)
    with advice_col:
        st.markdown('<div class="topline"><span>FARM SUPPORT</span><span>ðŸŒ¿</span></div>', unsafe_allow_html=True)
        st.markdown('<div class="right-panel"><div class="section-title">Farm recommendations</div><div class="section-sub">Useful starting points, not guaranteed outcomes.</div><div class="advice-row"><div class="advice-symbol">ðŸŒ±</div><div><strong>Choose suitable seed</strong><span>Ask a local extension officer about varieties suited to your crop and district.</span></div></div><div class="advice-row"><div class="advice-symbol">ðŸ’§</div><div><strong>Plan water use</strong><span>Check crop stage, water access and feasible irrigation options before investing.</span></div></div><div class="advice-row"><div class="advice-symbol">ðŸŒ¾</div><div><strong>Protect harvested produce</strong><span>Plan drying, clean storage and transport before harvest time.</span></div></div><a href="?page=Farm%20advice" style="font-size:12px;color:#087452;font-weight:800;text-decoration:none">View all farm advice â†’</a></div>', unsafe_allow_html=True)
        st.markdown('<div class="right-panel" style="background:#edf6ff;border-color:#d8e9f7"><div class="section-title">Ask HarvestGap</div><div class="section-sub">Choose a question to get a simple starting point.</div></div>', unsafe_allow_html=True)
        ask = st.selectbox("What do you need help with?", ["How can I improve crop yield?", "What should I do about water shortage?", "How can I protect produce after harvest?", "How should I compare buyers?"], label_visibility="collapsed", key="home_ask")
        ask_map = {"How can I improve crop yield?":"Improving crop yield","What should I do about water shortage?":"Water and irrigation","How can I protect produce after harvest?":"Post-harvest storage","How should I compare buyers?":"Selling my produce"}
        if st.button("Get guidance â†’", type="primary", use_container_width=True, key="home_ask_button"):
            st.session_state["selected_advice_topic"] = ask_map[ask]
            st.query_params["page"] = "Farm advice"
            st.rerun()
        st.markdown('<div class="warning-note"><b>Remember:</b> HarvestGap is a research prototype. Confirm crop-specific decisions with your local agricultural extension officer.</div>', unsafe_allow_html=True)

# ---------- Farmer-first yield prediction ----------
elif page == "Predict my harvest":
    st.markdown('<div class="home-appbar"><div class="home-search">⌕ &nbsp; Search for crops, districts or farming tips...</div><div class="user-chip"><span class="user-avatar">JD</span><span>Farmer workspace<br/><span style="font-weight:400;color:#71867e">Rwanda</span></span></div></div>', unsafe_allow_html=True)
    st.markdown('''<div class="home-hero predict-hero"><div class="hero-copy"><div class="eyebrow">HARVEST ESTIMATE · RWANDA</div><h1>Predict Your Harvest</h1><p>Get an exploratory yield estimate from your farm details and discover practical next steps for your next harvest.</p><span class="hero-chip"><span class="hero-chip-dot"></span> Better decisions · Higher productivity</span></div><div class="hero-art" aria-hidden="true"><div class="sun"></div><div class="hill hill-back"></div><div class="hill hill-front"></div><div class="crop-line crop-one"></div><div class="crop-line crop-two"></div><div class="crop-line crop-three"></div></div></div>''', unsafe_allow_html=True)
    st.write("")
    model_file = MODEL_DIR / MODEL_FILES["crop_yield_kg_ha"]
    if not model_file.exists():
        st.error("The crop-yield model is missing. Run the model-training steps in README.md first.")
    else:
        bundle = load_model("crop_yield_kg_ha")
        all_values = model_default_values(bundle)
        districts = district_options()
        crop_codes = crop_options()
        left, right = st.columns([1.65, .85], gap="medium")
        with left:
            st.markdown('<div class="form-inner"><div class="section-title">▦ &nbsp; Enter Your Farm Details</div><div class="section-sub">Fill in the information below to get your harvest estimate and practical next steps.</div>', unsafe_allow_html=True)
            with st.form("farmer_yield_form", clear_on_submit=False):
                a,b,c = st.columns(3)
                with a:
                    district_labels = [x[0] for x in districts] or ["District not listed"]
                    default_district_code = str(all_values.get("district", "11.0"))
                    default_idx = next((i for i, (_, code) in enumerate(districts) if code == default_district_code), 0)
                    chosen_district_label = st.selectbox("District *", district_labels, index=default_idx, help="Choose where your field is located.")
                    chosen_district_code = districts[district_labels.index(chosen_district_label)][1] if districts else default_district_code
                with b:
                    crop_choice = st.selectbox("Crop *", crop_codes, index=crop_codes.index(str(all_values.get("crop_code", crop_codes[0]))) if str(all_values.get("crop_code", crop_codes[0])) in crop_codes else 0, format_func=lambda code: f"{CROP_NAMES.get(str(code), 'Other / code ' + str(code))}")
                with c:
                    land_area = st.number_input("Land size (hectares) *", min_value=0.001, max_value=10000.0, value=0.25, step=0.05)
                d,e = st.columns(2)
                with d:
                    season_choice = st.selectbox("Season *", ["Season 1", "Season 2", "Season 3"], index=0, help="Choose the season represented in your farming plan.")
                with e:
                    farming_notes = st.selectbox("What would you like help with?", ["Harvest quantity", "Water shortage", "Soil fertility", "Pests or crop health", "Storage after harvest", "Finding a market"])
                st.markdown('<div class="section-sub" style="margin:12px 0 8px"><b>What would you like to explore?</b> Choose a topic for practical guidance.</div>', unsafe_allow_html=True)
                service_choice = st.radio("Explore", ["Harvest yield", "Farming practices", "Water & soil", "Post-harvest storage", "Market opportunities"], horizontal=True, label_visibility="collapsed")
                submitted = st.form_submit_button("▥  Get Prediction & Advice  →", type="primary", use_container_width=True)
            st.markdown('<div class="warning-note"><b>Note:</b> Estimates use historical survey data and model defaults for some coded inputs. They show likely outcomes, not guarantees. Confirm decisions with a local agricultural extension officer.</div></div>', unsafe_allow_html=True)
            if submitted:
                all_values["crop_code"] = str(crop_choice)
                all_values["district"] = str(chosen_district_code)
                all_values["crop_area_ha"] = float(land_area)
                all_values["Season"] = str(float(season_choice.split()[-1]))
                try:
                    district_num = int(float(chosen_district_code))
                    all_values["province"] = {1:"1",2:"2",3:"3",4:"4",5:"5"}.get(district_num // 10, str(all_values.get("province", "1")))
                except (TypeError, ValueError):
                    pass
                try:
                    result = predict_one("crop_yield_kg_ha", all_values)
                    yield_value = max(0.0, float(result["prediction"]))
                    st.session_state["last_prediction"] = {"yield_kg_ha":yield_value,"area_ha":float(land_area),"total_kg":yield_value*float(land_area),"district":chosen_district_label,"crop":crop_choice,"season":season_choice,"concern":farming_notes,"metrics":result.get("metrics",{})}
                except Exception as exc:
                    st.error(f"We could not calculate the estimate. Please check your inputs and model files. Details: {exc}")
        with right:
            pred = st.session_state.get("last_prediction")
            if pred:
                st.markdown(f'<div class="result-rail"><div class="section-title">▥ &nbsp; Your Prediction Results</div><div class="section-sub">{pred["district"]} · {CROP_NAMES.get(str(pred["crop"]), "Crop " + str(pred["crop"]))} · {pred["season"]}</div><div class="result-highlight"><div class="metric-label">Estimated Yield</div><div class="metric-value">{pred["yield_kg_ha"]:,.0f} <span style="font-size:15px">kg/ha</span></div><div class="metric-note">Exploratory model estimate</div></div><div class="advice-row"><div class="advice-symbol">▣</div><div><strong>Total expected harvest</strong><span>{pred["total_kg"]:,.0f} kg · from {pred["area_ha"]:,.2f} ha</span></div></div><div class="section-title" style="font-size:14px;margin-top:18px">Model validation</div><div class="section-sub">Validation details are available below; this prototype does not compute a per-farm confidence score.</div></div>', unsafe_allow_html=True)
                concern_guidance = {
                    "Harvest quantity": "Compare the estimate with your previous harvest and discuss crop-specific practices with your local extension officer.",
                    "Water shortage": "Ask your local extension officer about crop-stage water needs, water harvesting, and feasible small-scale irrigation options for your field.",
                    "Soil fertility": "Consider soil testing where available and ask an extension officer to recommend amendments appropriate to your crop and soil.",
                    "Pests or crop health": "Inspect the affected plants and seek crop-specific diagnosis before applying pesticides or other treatments.",
                    "Storage after harvest": "Plan drying, clean storage, pest protection, and transport before harvest; suitable methods depend on the crop.",
                    "Finding a market": "Check current local buyer prices and transport costs before deciding when or where to sell. Live market prices are not connected to this prototype."
                }
                st.markdown(f'<div class="dashboard-panel"><div class="section-title">♧ &nbsp; Recommended next step</div><div class="section-sub">{concern_guidance[pred["concern"]]}</div></div>', unsafe_allow_html=True)
                metrics = pred.get("metrics", {})
                if metrics.get("mae_original_scale", 0) > metrics.get("baseline_mae_original_scale", float("inf")):
                    st.warning("Model validation shows a larger absolute error than the median baseline. Treat this result as exploratory only.")
                with st.expander("How this estimate was calculated"):
                    st.write("The model predicts yield per hectare; estimated total production is calculated by multiplying that estimate by the area you entered. Other coded inputs use stored model defaults.")
                    st.json(metrics)
            else:
                st.markdown('<div class="result-rail"><div class="section-title">▥ &nbsp; Your Prediction Results</div><div class="section-sub">Your estimate will appear here after you enter your field details.</div><div class="result-highlight"><div class="metric-label">Estimated Yield</div><div class="metric-value">— <span style="font-size:15px">kg/ha</span></div><div class="metric-note">Complete the farm details to begin</div></div><div class="advice-row"><div class="advice-symbol">✦</div><div><strong>Practical guidance</strong><span>Choose a farming topic in the form to tailor your next steps.</span></div></div></div>', unsafe_allow_html=True)
# ---------- Farm advice ----------
elif page == "Farm advice":
    header("PRACTICAL GUIDANCE", "Explore advice for your next farming decision", "Choose the challenge you are facing. Recommendations are cautious and distinguish survey evidence from general next steps.")
    advice_topics = ["Improving crop yield", "Water and irrigation", "Soil fertility", "Post-harvest storage", "Pests and crop health", "Selling my produce"]
    default_topic = st.session_state.get("selected_advice_topic", advice_topics[0])
    topic = st.selectbox("What do you need help with?", advice_topics, index=advice_topics.index(default_topic) if default_topic in advice_topics else 0)
    advice = {
        "Improving crop yield": ("Start with the basics", ["Use seed suitable for your crop and local conditions.", "Keep a simple record of planting date, inputs, rainfall, and harvest quantity.", "Compare results across seasons rather than relying on one field or one estimate.", "Ask an extension officer which local practices are recommended for your crop."], "The survey can show associations between coded practices and yield; it cannot prove a practice will cause higher yield."),
        "Water and irrigation": ("Plan water around crop needs", ["Check the crop growth stage and local rainfall outlook.", "Explore rainwater harvesting or small-scale irrigation where feasible.", "Avoid investing in equipment before checking water availability, costs, and maintenance.", "Seek local advice on safe and efficient irrigation methods."], "This prototype does not currently connect live rainfall, soil-moisture, or irrigation data."),
        "Soil fertility": ("Make soil decisions with evidence", ["Where available, use soil testing to guide nutrient decisions.", "Record manure, compost, fertilizer type, and application timing.", "Prevent erosion using locally suitable conservation practices.", "Ask an extension officer about crop-specific nutrient rates."], "The prototype cannot prescribe a fertilizer dose from the current survey model."),
        "Post-harvest storage": ("Protect the harvest you already grew", ["Harvest at a suitable maturity stage for the crop.", "Dry produce adequately before storage when appropriate.", "Use clean, dry, pest-protected storage and inspect it regularly.", "Plan transport and buyers before harvest where possible."], "Storage losses and crop-specific storage performance are not directly predicted by this prototype."),
        "Pests and crop health": ("Identify the problem before treating it", ["Check several plants and note visible symptoms and affected area.", "Ask a trained local officer to identify the pest or disease.", "Use only locally approved treatments and follow product labels.", "Keep records of symptoms, treatment, and outcome."], "This system does not diagnose crop diseases from images or symptoms."),
        "Selling my produce": ("Compare the full cost of selling", ["Check current prices with more than one buyer.", "Include transport, packaging, storage, and market fees in your comparison.", "Consider whether safe storage can give you more flexibility.", "Coordinate with farmer groups where that is practical."], "Live market prices and buyer listings are not connected yet.")
    }
    title, items, caveat = advice[topic]
    st.markdown(f'<div class="panel"><div class="section-title">{title}</div></div>', unsafe_allow_html=True)
    for i, item in enumerate(items, 1):
        st.markdown(f'<div class="quick-card" style="min-height:0;margin-bottom:8px;display:flex;gap:12px;align-items:flex-start"><div style="background:#e4f4e9;color:#087452;border-radius:9px;min-width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-weight:800">{i}</div><div style="font-size:13px;padding-top:5px">{item}</div></div>', unsafe_allow_html=True)
    st.markdown(f'<div class="warning-note"><b>Evidence note:</b> {caveat}</div>', unsafe_allow_html=True)
    if association_path.exists():
        assoc = pd.read_csv(association_path, low_memory=False)
        if not assoc.empty:
            st.write("")
            st.markdown("**Survey evidence available to explore**")
            if "fdr_significant_q05" in assoc.columns:
                sig = assoc[assoc["fdr_significant_q05"].astype(str).str.lower().isin(["true", "1"])]
            else:
                sig = pd.DataFrame()
            st.caption(f"The current analysis contains {len(assoc):,} tested associations; {len(sig):,} meet the FDR-adjusted q < 0.05 threshold. These results require crop-code and questionnaire interpretation before farmer-facing practice claims.")
            if st.button("Review evidence table â†’"):
                st.session_state["nav_target"] = "Practice evidence"
                st.rerun()

# ---------- District insights ----------
elif page == "District insights":
    header("LOCAL AGRICULTURAL DATA", "Explore crop productivity", "Filter observed survey summaries by crop and district. These are descriptive statistics, not guaranteed district forecasts.")
    if not summary_path.exists():
        st.warning("Crop productivity summary not found. Run the pipeline in README.md first.")
    else:
        data = pd.read_csv(summary_path, low_memory=False)
        if data.empty:
            st.info("No crop productivity summary rows are available.")
        else:
            crop_col = "crop_code" if "crop_code" in data else None
            district_col = "district" if "district" in data else None
            c1,c2 = st.columns(2)
            crop_values = sorted(data[crop_col].dropna().astype(str).unique()) if crop_col else []
            crop_choice = c1.selectbox("Crop", ["All crop codes"] + crop_values, format_func=lambda code: "All crop codes" if code == "All crop codes" else CROP_NAMES.get(str(code), f"Crop code {code}"))
            district_pairs = []
            if district_col:
                for code in sorted(data[district_col].dropna().unique(), key=lambda x: float(x)):
                    key = str(int(float(code)))
                    district_pairs.append((district_names.get(key, f"District code {key}"), str(code)))
            district_choice = c2.selectbox("District", ["All districts"] + [x[0] for x in district_pairs])
            view = data.copy()
            if crop_choice != "All crop codes" and crop_col:
                view = view[view[crop_col].astype(str) == crop_choice]
            if district_choice != "All districts" and district_col:
                selected_code = district_pairs[[x[0] for x in district_pairs].index(district_choice)][1]
                view = view[view[district_col].map(lambda x: str(x) == selected_code or str(int(float(x))) == str(int(float(selected_code)) if pd.notna(x) else ""))]
            m1,m2,m3 = st.columns(3)
            with m1: st.metric("Cropâ€“district rows", f"{len(view):,}")
            with m2: st.metric("Crop codes", f"{view[crop_col].nunique():,}" if crop_col and len(view) else "0")
            with m3: st.metric("Median yield", f"{view['median_yield_kg_ha'].median():,.0f} kg/ha" if "median_yield_kg_ha" in view and len(view) else "â€”")
            if len(view) and "median_yield_kg_ha" in view:
                st.markdown("**Observed median yield by district**")
                chart_data = view.copy()
                chart_data["district_name"] = chart_data[district_col].map(lambda x: district_names.get(str(int(float(x))), f"District {x}")) if district_col else "District"
                chart = chart_data.groupby("district_name")["median_yield_kg_ha"].median().sort_values(ascending=False).head(20)
                st.bar_chart(chart, use_container_width=True)
                st.caption("This chart takes the median of crop-specific median yields. It is not a survey-weighted district estimate.")
                display_cols = [c for c in ["district", "crop_code", "observations", "median_yield_kg_ha", "mean_yield_kg_ha"] if c in view]
                st.dataframe(view[display_cols].sort_values("observations", ascending=False) if "observations" in view else view[display_cols], use_container_width=True, hide_index=True)
                st.download_button("Download filtered data (CSV)", view[display_cols].to_csv(index=False).encode("utf-8"), "harvestgap_district_insights.csv", "text/csv")

# ---------- Practice evidence ----------
elif page == "Practice evidence":
    header("SURVEY EVIDENCE", "Agricultural practices and observed yields", "Filter the statistical results. These are associations in survey data, not proof that a practice causes higher yield.")
    if not association_path.exists():
        st.info("Practice-association results are not available. Run the model pipeline first.")
    else:
        assoc = pd.read_csv(association_path, low_memory=False)
        if assoc.empty:
            st.info("No eligible practice-association tests were produced.")
        else:
            crops = sorted(assoc["crop_code"].dropna().astype(str).unique()) if "crop_code" in assoc else []
            crop_filter = st.selectbox("Crop", ["All crops"] + crops, format_func=lambda code: "All crops" if code == "All crops" else CROP_NAMES.get(str(code), f"Crop code {code}"))
            only_fdr = st.checkbox("Show only FDR-adjusted significant results (q < 0.05)", value=True)
            view = assoc.copy()
            if crop_filter != "All crops" and "crop_code" in view:
                view = view[view["crop_code"].astype(str) == crop_filter]
            if only_fdr and "fdr_significant_q05" in view:
                view = view[view["fdr_significant_q05"].astype(str).str.lower().isin(["true", "1"])]
            st.metric("Results matching your filters", f"{len(view):,}")
            st.caption("Feature names may still be survey variable codes. Consult the official NISR questionnaire before translating any association into specific farm advice.")
            if len(view):
                cols = [c for c in ["crop_code", "feature", "test", "n", "statistic", "p_value", "q_value_fdr_bh", "group_1_median_yield", "group_2_median_yield", "effect_description"] if c in view]
                st.dataframe(view[cols], use_container_width=True, hide_index=True)
                st.download_button("Download results as CSV", view[cols].to_csv(index=False).encode("utf-8"), "harvestgap_practice_evidence.csv", "text/csv")
            else:
                st.info("No results match these filters. Try another crop or turn off the FDR filter.")

# ---------- Other production ----------
elif page == "Other production":
    header("OTHER FARM ENTERPRISES", "Explore additional production estimates", "These models use survey-coded inputs. Use them for exploratory analysis only until each input has been mapped to the official questionnaire.")
    available = [name for name, file in MODEL_FILES.items() if name != "crop_yield_kg_ha" and (MODEL_DIR / file).exists()]
    labels = {"fruit_production_kg":"Fruit production", "egg_production_count":"Egg production", "honey_production_kg":"Honey production", "milk_daily_production_liters":"Daily milk production"}
    if not available:
        st.info("No secondary production models are available. See the model training report.")
    else:
        chosen = st.selectbox("Choose production type", available, format_func=lambda x: labels.get(x, x))
        bundle = load_model(chosen)
        st.info("To avoid asking you to interpret survey codes, this prototype uses training metadata defaults for coded inputs. That makes this an example estimate, not a personalized prediction.")
        if st.button("Show example estimate", type="primary"):
            try:
                result = predict_one(chosen, model_default_values(bundle))
                st.metric("Example model estimate", f"{result['prediction']:,.2f}")
                if result["metrics"].get("mae_original_scale", 0) > result["metrics"].get("baseline_mae_original_scale", float("inf")):
                    st.warning("This model performs worse than the median baseline on held-out MAE. Do not use this estimate for decisions.")
                with st.expander("Validation details"):
                    st.json(result["metrics"])
            except Exception as exc:
                st.error(f"Estimate unavailable: {exc}")

# ---------- About ----------
elif page == "About HarvestGap":
    header("ABOUT THIS TOOL", "Agricultural intelligence for Rwanda", "A research prototype using the supplied AHS2024 survey data.")
    st.markdown('<div class="panel"><div class="section-title">What HarvestGap can do today</div><ul><li>Estimate crop yield using a trained model and a short farmer form.</li><li>Calculate a rough total harvest from estimated yield per hectare and area entered.</li><li>Explore observed crop productivity summaries by district and crop code.</li><li>Review statistical evidence about coded agricultural practices.</li><li>Provide general next-step guidance for common farming questions.</li></ul></div>', unsafe_allow_html=True)
    st.write("")
    st.markdown('<div class="warning-note"><b>Limitations:</b> This is not a certified agronomic advisory service. Survey responses are observational, coded inputs still need official questionnaire mapping, units should be verified, and estimates may not generalize to future seasons or every farm. Live weather, soil, market prices, pest diagnosis, and validated irrigation recommendations are not integrated.</div>', unsafe_allow_html=True)
    st.write("")
    st.markdown("**Model validation overview**")
    if model_metrics:
        cols = [c for c in ["model", "status", "rows_used", "r2_model_scale", "mae_original_scale", "baseline_mae_original_scale", "warning"] if any(c in m for m in model_metrics)]
        st.dataframe(pd.DataFrame(model_metrics)[cols], use_container_width=True, hide_index=True)
    else:
        st.info("No model metrics file found. Run the model training pipeline first.")

st.markdown("<div style='text-align:center;color:#80948a;font-size:11px;padding:22px 0 5px'>HarvestGap Rwanda Â· Better data. Better harvests. Â· Research prototype</div>", unsafe_allow_html=True)
