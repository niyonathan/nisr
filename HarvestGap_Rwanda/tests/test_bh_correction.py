"""Simple test for the Benjamini-Hochberg false discovery rate adjustment."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from nisr.HarvestGap_Rwanda.src.harvestgap.statistics import bh_adjust

def test_bh_adjust_monotonic_and_bounded():
    values = [0.01, 0.04, 0.03, 0.50]
    adjusted = bh_adjust(values)
    assert all(0 <= x <= 1 for x in adjusted)
    assert adjusted[0] <= adjusted[3]

if __name__ == "__main__":
    test_bh_adjust_monotonic_and_bounded()
    print("BH correction test passed")
