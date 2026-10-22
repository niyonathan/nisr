"""Commercialisation of fruit and milk: how much of what households produce reaches the market."""
from __future__ import annotations

import pandas as pd

from .io import decode, read


def build_fruits() -> pd.DataFrame:
    """One row per fruit type reported by a household."""
    raw, labels = read("fruits")
    fruits = pd.DataFrame(
        {
            "hhid": raw["hhid"],
            "province": decode(raw["province"], labels["province"]),
            "district": decode(raw["district"], labels["district"]),
            "fruit": decode(raw["s5_q2"], labels["s5_q2"]),
            "trees": raw["s5_q3"],
            "trees_harvested": raw["s5_q4"],
            "production_kg": raw["s5_q5"],
            "sold_kg": raw["s5_q6"],
            "price_rwf_kg": raw["s5_q7"],
            "consumed_kg": raw["s5_q8"],
            "other_use_kg": raw["s6_q9"],
            "weight": raw["weight"],
        }
    )
    return fruits[fruits["fruit"].notna() & (fruits["production_kg"] > 0)].reset_index(drop=True)


def build_milk() -> pd.DataFrame:
    """Household totals of milk produced and how it was used over the last 6 months (litres)."""
    raw, labels = read("milk")
    raw = raw[raw["s10q1_0"] == 1]
    uses = {"consumed_l": "s11q1_7", "sold_l": "s11q1_8", "gift_l": "s11q1_10", "other_use_l": "s11q1_11"}
    milk = raw.groupby("hhid").agg(
        district=("district", "first"),
        province=("province", "first"),
        weight=("weight", "first"),
        **{name: (col, "sum") for name, col in uses.items()},
    )
    milk["district"] = decode(milk["district"], labels["district"])
    milk["province"] = decode(milk["province"], labels["province"])
    milk["total_l"] = milk[list(uses)].sum(axis=1)
    # Price is per breed; keep the household's highest reported price as its market price.
    price_cols = [c for c in ["s11q1_9_1", "s11q1_9_2", "s11q1_9_3"] if c in raw]
    milk["price_rwf_l"] = raw.groupby("hhid")[price_cols].max().max(axis=1)
    return milk[milk["total_l"] > 0].reset_index()
