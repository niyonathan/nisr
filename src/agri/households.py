"""Household-level features: head characteristics, poverty, extension, finance."""
from __future__ import annotations

import pandas as pd

from .io import decode, read

POST_HARVEST_EXTENSION = 4  # s6q1 code: "Post-harvest handling and storage"
NO_EXTENSION = 26  # s6q1 code: "None"


def _any_yes(df: pd.DataFrame, col: str, yes: int = 1) -> pd.Series:
    return (df[col] == yes).groupby(df["hhid"]).any()


def _head() -> pd.DataFrame:
    members, labels = read("members")
    head = members[members["s1q2"] == 1].drop_duplicates("hhid").set_index("hhid")
    return pd.DataFrame(
        {
            "head_female": head["s1q1"] == 2,
            "head_age": head["s1q3y"],
            "head_education": decode(head["s4aq2"], labels["s4aq2"]).fillna("None"),
            "head_literate": head["s4bq4"] == 1,
            "head_has_phone": head["s4bq8"] == 1,
            "household_size": members.groupby("hhid").size(),
        }
    )


def _welfare() -> pd.DataFrame:
    land, _ = read("land")
    first = land.drop_duplicates("hhid").set_index("hhid")
    return pd.DataFrame(
        {
            "consumption_quintile": first["quintile"],
            "poor": first["pov_jan"] == 1,
            "extreme_poor": first["epov_jan"] == 1,
            "total_agri_land_ha": first["total_agr_land"],
        }
    )


def _extension() -> pd.DataFrame:
    ext, _ = read("extension")
    received = ext["s6q3"].astype("string").str.strip().fillna("").ne("") & (ext["s6q1"] != NO_EXTENSION)
    by_hh = received.groupby(ext["hhid"])
    return pd.DataFrame(
        {
            "extension_this_season": by_hh.any().astype(bool),
            "extension_topics": by_hh.sum().astype("int64"),
            "extension_post_harvest": (received & (ext["s6q1"] == POST_HARVEST_EXTENSION))
            .groupby(ext["hhid"])
            .any()
            .astype(bool),
            "twigire_muhinzi": _any_yes(ext, "s6q5"),
            "farmer_field_school": _any_yes(ext, "s6q6"),
            "contract_farming": _any_yes(ext, "s6q7"),
            "crop_insurance": _any_yes(ext, "s6q8"),
            "livestock_insurance": _any_yes(ext, "s6q9"),
            "cooperative_member": _any_yes(ext, "s6q10"),
            "received_agri_support": _any_yes(ext, "s6q14"),
        }
    )


def build_households() -> pd.DataFrame:
    cover, cover_labels = read("cover")
    hh = pd.DataFrame(
        {
            "hhid": cover["hhid"],
            "province": decode(cover["province"], cover_labels["province"]),
            "district": decode(cover["district"], cover_labels["district"]),
            "agricultural_household": cover["s0q14"] == 1,
            "weight": cover["weight"],
        }
    ).set_index("hhid")

    tools, _ = read("tools")
    sustainable, _ = read("sustainable")
    credit, _ = read("credit")
    saving, _ = read("saving")
    extension = _extension()
    hh = hh.join([_head(), _welfare(), extension])
    hh["bought_tools"] = _any_yes(tools, "s7qa")
    hh["env_risk_aware"] = _any_yes(sustainable, "s8q1")
    # Includes informal sources (tontines, relatives), which dominate.
    hh["has_any_loan"] = _any_yes(credit, "loan")
    hh["has_account"] = _any_yes(saving, "account")
    # Households missing from a module answered "no" to its filter question.
    flags = ["bought_tools", "env_risk_aware", "has_any_loan", "has_account", *extension.columns.drop("extension_topics")]
    hh[flags] = hh[flags].fillna(False).astype(bool)
    hh["extension_topics"] = hh["extension_topics"].fillna(0).astype("int64")
    return hh.reset_index()
