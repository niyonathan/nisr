"""Build the analysis datasets from the raw AHS 2024 microdata.

    python pipeline.py

Writes unit-level tables to data/processed/ (git-ignored: NISR microdata may not be
redistributed) and survey-weighted aggregates to data/public/ (used by the app).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "src"))

from agri import aggregate  # noqa: E402
from agri.crops import build_plot_crops  # noqa: E402
from agri.households import build_households  # noqa: E402
from agri.io import PROCESSED_DIR, PUBLIC_DIR  # noqa: E402
from agri.markets import build_fruits, build_milk  # noqa: E402


def main() -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

    print("Building crop × plot table ...")
    plot_crops = build_plot_crops()
    print("Building household features ...")
    households = build_households()
    print("Building fruit and milk market tables ...")
    fruits, milk = build_fruits(), build_milk()

    # Attach household features so the model table is self-contained.
    hh_features = households.drop(columns=["province", "district", "weight"])
    model_table = plot_crops.merge(hh_features, on="hhid", how="left", validate="many_to_one")

    processed = {"plot_crops": model_table, "households": households, "fruits": fruits, "milk": milk}
    for name, df in processed.items():
        df.to_parquet(PROCESSED_DIR / f"{name}.parquet", index=False)

    public = {
        "district_indicators": aggregate.district_indicators(plot_crops, households),
        "crop_yields_national": aggregate.crop_yields(plot_crops, ["crop"]),
        "crop_yields_district": aggregate.crop_yields(plot_crops, ["province", "district", "crop"]),
        "fruit_market": aggregate.fruit_market(fruits),
        "milk_market": aggregate.milk_market(milk),
    }
    for name, df in public.items():
        df.round(4).to_csv(PUBLIC_DIR / f"{name}.csv", index=False)

    print("\nProcessed (private):")
    for name, df in processed.items():
        print(f"  {name:<22} {len(df):>7,} rows × {df.shape[1]} cols")
    print("Public aggregates:")
    for name, df in public.items():
        print(f"  {name:<22} {len(df):>7,} rows × {df.shape[1]} cols")


if __name__ == "__main__":
    main()
