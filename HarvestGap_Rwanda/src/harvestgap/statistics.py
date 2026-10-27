"""Statistical helpers used by the analysis pipeline."""
import numpy as np

def bh_adjust(pvalues):
    """Benjamini-Hochberg FDR adjusted p-values; NaNs stay NaN."""
    p = np.asarray(pvalues, dtype=float)
    out = np.full(p.shape, np.nan, dtype=float)
    good = np.isfinite(p)
    vals = p[good]
    if not len(vals):
        return out
    vals = np.clip(vals, 0.0, 1.0)
    order = np.argsort(vals)
    ranked = vals[order]
    n = len(ranked)
    adjusted_sorted = ranked * n / np.arange(1, n + 1)
    adjusted_sorted = np.minimum.accumulate(adjusted_sorted[::-1])[::-1]
    restored = np.empty(n, dtype=float)
    restored[order] = np.clip(adjusted_sorted, 0, 1)
    out[good] = restored
    return out
