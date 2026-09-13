"""
Cross-sectional study: does options-flow positioning predict relative returns?

Method - on each date, rank the universe by a flow feature, then measure the
return of a long-short spread (top-ranked minus bottom-ranked) over the next
N trading days. Because every date is long and short in equal measure, market
direction cancels: the drift that made every earlier test look good cannot
manufacture an edge here.

Reported per feature:
  IC        Spearman rank correlation between feature and forward return,
            averaged across dates. This is the honest effect size.
  spread    Mean long-short return per period.
  hit       Share of dates the spread was positive.
"""
import sys, math, statistics
sys.path.insert(0, '/home/user/Adjlmarketintel/flow')
sys.path.insert(0, '/home/user/Adjlmarketintel/backtest')
from features import features
from index_chains import build_index
from engine import load

FEATS = ["pc_vol", "pc_oi", "vol_oi", "skew25", "net_prem", "atm_iv"]


def spearman(xs, ys):
    n = len(xs)
    if n < 3:
        return None
    def rank(v):
        order = sorted(range(len(v)), key=lambda i: v[i])
        r = [0.0] * len(v)
        i = 0
        while i < len(order):
            j = i
            while j + 1 < len(order) and v[order[j + 1]] == v[order[i]]:
                j += 1
            avg = (i + j) / 2 + 1
            for k in range(i, j + 1):
                r[order[k]] = avg
            i = j + 1
        return r
    rx, ry = rank(xs), rank(ys)
    mx, my = sum(rx) / n, sum(ry) / n
    num = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    dx = math.sqrt(sum((a - mx) ** 2 for a in rx))
    dy = math.sqrt(sum((b - my) ** 2 for b in ry))
    return num / (dx * dy) if dx and dy else None


def fwd_return(sym, date, horizon, px):
    d, c = px[sym]
    if date not in d:
        return None
    i = d.index(date)
    j = i + horizon
    if j >= len(c):
        return None
    return (c[j] / c[i] - 1) * 100


def run(horizon=21, min_names=6):
    idx = build_index()
    syms = sorted({s for s, _ in idx})
    px = {}
    for s in syms:
        try:
            d, o, h, l, c = load(f'/home/user/Adjlmarketintel/data/{s}_daily_adj.csv')
            px[s] = (d, c)
        except FileNotFoundError:
            pass

    dates = sorted({d for _, d in idx})
    rows = {}      # date -> [(sym, featdict, fwd)]
    for dt_ in dates:
        rec = []
        for s in syms:
            if s not in px or (s, dt_) not in idx:
                continue
            f = features(idx[(s, dt_)], dt_)
            r = fwd_return(s, dt_, horizon, px)
            if f and r is not None:
                rec.append((s, f, r))
        if len(rec) >= min_names:
            rows[dt_] = rec

    print(f"usable dates: {len(rows)}  (>= {min_names} names each, {horizon}-day forward)")
    for d_ in sorted(rows):
        print(f"   {d_}: {len(rows[d_])} names")
    if not rows:
        return

    print()
    print("="*104)
    print(f"CROSS-SECTIONAL PREDICTIVE POWER — {horizon}-day forward relative return")
    print("="*104)
    print(f"{'feature':<12}{'dates':>7}{'mean IC':>10}{'IC stderr':>11}{'t-stat':>9}"
          f"{'L-S spread':>13}{'hit rate':>10}")
    for f in FEATS:
        ics, spreads = [], []
        for d_ in sorted(rows):
            rec = [(s, fd[f], r) for s, fd, r in rows[d_] if fd.get(f) is not None]
            if len(rec) < 4:
                continue
            ic = spearman([x[1] for x in rec], [x[2] for x in rec])
            if ic is not None:
                ics.append(ic)
            rec.sort(key=lambda x: x[1])
            k = max(1, len(rec) // 3)
            lo = sum(x[2] for x in rec[:k]) / k        # low feature value
            hi = sum(x[2] for x in rec[-k:]) / k       # high feature value
            spreads.append(hi - lo)
        if len(ics) < 3:
            print(f"{f:<12}{len(ics):>7}   insufficient")
            continue
        m = statistics.mean(ics)
        se = statistics.stdev(ics) / math.sqrt(len(ics)) if len(ics) > 1 else float('nan')
        t = m / se if se else float('nan')
        sp = statistics.mean(spreads)
        hit = 100 * sum(1 for x in spreads if x > 0) / len(spreads)
        print(f"{f:<12}{len(ics):>7}{m:>10.3f}{se:>11.3f}{t:>9.2f}{sp:>12.2f}%{hit:>9.0f}%")
    print()
    print("  |t| > 2.0 is the rough bar for significance. With few dates, treat")
    print("  anything below that as noise regardless of how the spread looks.")


if __name__ == "__main__":
    h = int(sys.argv[1]) if len(sys.argv) > 1 else 21
    run(horizon=h)
