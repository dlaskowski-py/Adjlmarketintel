"""
Volume-at-price ("volume shelves") from daily bars.

Each bar's volume is distributed uniformly across its high-low range, which is
the standard approximation when intraday ticks are unavailable. Real volume
profile is built from tick or minute data - this is a coarser view, and shelf
levels from daily bars will be blurrier than what a profile tool draws.

Definitions used:
  POC   point of control - the price bin holding the most volume
  VA    value area - the contiguous bins around POC holding 70% of volume
  HVN   high-volume node, a "shelf" - price levels with heavy prior trade
  LVN   low-volume node - thin levels price tends to traverse quickly
"""
import sys
sys.path.insert(0, '/home/user/Adjlmarketintel/backtest')


def profile_at(h, l, v, i, lookback=60, bins=40):
    """Volume histogram over [i-lookback, i). Returns (edges, hist, lo, hi)."""
    lo = min(l[i - lookback:i])
    hi = max(h[i - lookback:i])
    if hi <= lo:
        return None
    w = (hi - lo) / bins
    hist = [0.0] * bins
    for j in range(i - lookback, i):
        bl, bh, bv = l[j], h[j], v[j]
        if bh <= bl:
            k = min(bins - 1, max(0, int((bl - lo) / w)))
            hist[k] += bv
            continue
        span = bh - bl
        k0 = min(bins - 1, max(0, int((bl - lo) / w)))
        k1 = min(bins - 1, max(0, int((bh - lo) / w)))
        for k in range(k0, k1 + 1):
            edge_lo = lo + k * w
            edge_hi = edge_lo + w
            ov = min(bh, edge_hi) - max(bl, edge_lo)
            if ov > 0:
                hist[k] += bv * ov / span
    return lo, hi, w, hist


def poc_value_area(prof, va_frac=0.70):
    lo, hi, w, hist = prof
    total = sum(hist)
    if total <= 0:
        return None
    poc_k = max(range(len(hist)), key=lambda k: hist[k])
    lo_k = hi_k = poc_k
    acc = hist[poc_k]
    while acc < va_frac * total and (lo_k > 0 or hi_k < len(hist) - 1):
        down = hist[lo_k - 1] if lo_k > 0 else -1
        up = hist[hi_k + 1] if hi_k < len(hist) - 1 else -1
        if up >= down:
            hi_k += 1
            acc += hist[hi_k]
        else:
            lo_k -= 1
            acc += hist[lo_k]
    return {
        "poc": lo + (poc_k + 0.5) * w,
        "val": lo + lo_k * w,
        "vah": lo + (hi_k + 1) * w,
        "poc_k": poc_k, "lo": lo, "w": w, "hist": hist,
    }


def node_strength(pa, price):
    """Volume in the bin containing `price`, relative to the mean bin."""
    hist, lo, w = pa["hist"], pa["lo"], pa["w"]
    k = int((price - lo) / w)
    if k < 0 or k >= len(hist):
        return 0.0
    mean = sum(hist) / len(hist)
    return hist[k] / mean if mean > 0 else 0.0


# ------------------------------------------------------------------ signals
def _scan(d, o, h, l, c, v, warm, step, test):
    out = []
    for i in range(warm, len(c) - 60, step):
        prof = profile_at(h, l, v, i)
        if prof is None:
            continue
        pa = poc_value_area(prof)
        if pa is None:
            continue
        r = test(pa, c, i)
        if r:
            out.append((i, r))
    return out


def sig_va_breakout(d, o, h, l, c, v, warm=300, step=1):
    """Close breaks above the value-area high having been inside it."""
    return _scan(d, o, h, l, c, v, warm, step,
                 lambda pa, c, i: "long" if c[i] > pa["vah"] and c[i - 1] <= pa["vah"] else None)


def sig_poc_retest(d, o, h, l, c, v, warm=300, step=1):
    """Pullback onto the shelf from above - POC as support."""
    def t(pa, c, i):
        near = abs(c[i] - pa["poc"]) / pa["poc"] < 0.01
        return "long" if near and c[i - 5] > pa["poc"] and c[i] > pa["val"] else None
    return _scan(d, o, h, l, c, v, warm, step, t)


def sig_lvn(d, o, h, l, c, v, warm=300, step=1):
    """Price sitting in a thin node - little prior trade to slow it down."""
    return _scan(d, o, h, l, c, v, warm, step,
                 lambda pa, c, i: "long" if node_strength(pa, c[i]) < 0.35 else None)


def sig_on_shelf(d, o, h, l, c, v, warm=300, step=1):
    """Price sitting ON a heavy shelf - the opposite case, as a control."""
    return _scan(d, o, h, l, c, v, warm, step,
                 lambda pa, c, i: "long" if node_strength(pa, c[i]) > 2.0 else None)
