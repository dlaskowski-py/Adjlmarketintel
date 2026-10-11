#!/usr/bin/env python3
"""How much of the TDPS edge is survivorship bias?

The 124-name universe was built by taking what trades today and pulling its
history back to 1999. Every one of them survived 27 years. That is the worst
possible selection for this strategy: TDPS buys an oversold dip inside an
uptrend, and its failure mode is a dip that never recovers. The universe has
deleted every name that did exactly that.

This re-runs the same entry and exit rules on names that were delisted, drawn
as a random sample (seed 11) from the 792 Alpha Vantage lists as plain-ticker
operating companies that IPO'd before 2000 and delisted after 2001 -- so the
sample contains both acquisitions, which often end at a premium, and genuine
failures. Cherry-picking famous blowups would overstate the bias.

The random draw turned out to contain ZERO failures -- all 16 names were bought
or merged, and their final years show takeover premiums, not death spirals.
That is a property of the source: a company heading for Chapter 11 is usually
moved to a Q-suffix ticker, and Alpha Vantage serves most of those with only
post-filing penny data. Five whose full operating history did survive under the
Q ticker were added by hand, and the two groups are reported separately,
because they answer different questions. The acquisition group measures what
trading eventual takeover targets would have done. Only the bankruptcy group
measures the risk the survivor universe actually hides.

One asymmetry is corrected here. The survivor backtest drops a position still
open when the series ends, which is harmless for a name that keeps trading. For
a delisted name that would delete the terminal outcome -- the exact event being
measured -- so an open position is closed at the final bar instead.

Usage:  python3 backtest/tdps_survivorship.py
"""
import sys, os, glob, csv, collections, statistics as st

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from engine import sma, rma, dmi_atr
from price_basis import bases

COMM = 0.0005

# How each delisted name's listing ended. The bankruptcy group is the one that
# tests survivorship bias in the sense that matters for a dip-buying strategy.
BANKRUPT = {'WFTIQ', 'ADVNQ', 'BRSWQ', 'CORSQ', 'ACETQ'}


def rsi(c, n=2):
    g, l = [0.0], [0.0]
    for i in range(1, len(c)):
        ch = c[i] - c[i - 1]
        g.append(max(ch, 0.0))
        l.append(max(-ch, 0.0))
    ag, al = rma(g, n), rma(l, n)
    return [None if a is None or b is None else (100.0 if b == 0 else 100 - 100/(1 + a/b))
            for a, b in zip(ag, al)]


def prep(path):
    TR, _, _ = bases(path)
    d, o, h, l, c = TR
    rawc = [float(r['close']) for r in csv.DictReader(open(path))]
    _, atr = dmi_atr(h, l, c, 14)
    return dict(d=d, o=o, h=h, l=l, c=c, atr=atr,
                m50=sma(c, 50), m200=sma(c, 200), m10=sma(c, 10), r2=rsi(c, 2),
                slip=[0.05 / max(x, 1e-9) for x in rawc])


def run(z, close_at_end):
    """TDPS conservative rules. Returns (entry_date, pnl, bars_from_end, forced)."""
    d, o, h, l, c = z['d'], z['o'], z['h'], z['l'], z['c']
    m50, m200, m10, atr, r2, slip = z['m50'], z['m200'], z['m10'], z['atr'], z['r2'], z['slip']
    n = len(c)
    out = []
    i = 260
    while i < n - 2:
        if None in (m50[i], m200[i], m10[i], atr[i], r2[i]):
            i += 1
            continue
        if not (m50[i] > m200[i] and c[i] > m200[i] and r2[i] < 15):
            i += 1
            continue
        eb = i + 1
        entry = o[eb]
        ein = entry * (1 + slip[eb] + COMM)
        base = entry - 3.0 * atr[i]
        peak = h[eb]
        scaled = False
        left = 1.0
        pnl = 0.0
        j = eb + 1
        done = False
        while j < n and not done:
            peak = max(peak, h[j])
            s = max(base, entry) if scaled else base
            if l[j] <= s:
                px = min(o[j], s)
                pnl += left * (px * (1 - slip[j] - COMM) / ein - 1.0)
                done = True
                break
            held = j - eb
            if not scaled and m10[j] is not None and c[j] > m10[j]:
                pnl += 0.70 * (c[j] * (1 - slip[j] - COMM) / ein - 1.0)
                left -= 0.70
                scaled = True
                j += 1
                continue
            if ((scaled and atr[j] and c[j] < peak - 3.0 * atr[j])
                    or (m200[j] and c[j] < m200[j])
                    or held >= (40 if scaled else 15)):
                pnl += left * (c[j] * (1 - slip[j] - COMM) / ein - 1.0)
                done = True
                break
            j += 1
        if not done:
            if not close_at_end:
                break
            # position still open at the final bar: cash out there
            k = n - 1
            pnl += left * (c[k] * (1 - slip[k] - COMM) / ein - 1.0)
            out.append((d[eb], pnl, n - 1 - eb, True))
            break
        out.append((d[eb], pnl, n - 1 - eb, False))
        i = j + 1
    return out


def pool(files, close_at_end):
    T = []
    per = {}
    for p in files:
        s = os.path.basename(p).split('_')[0]
        try:
            z = prep(p)
            t = run(z, close_at_end)
        except Exception:
            continue
        T += t
        per[s] = (z, t)
    return T, per


def rep(lab, T):
    x = [v for _, v, _, _ in T]
    if not x:
        print(f"  {lab:<28} no trades")
        return
    w = [v for v in x if v > 0]
    gl = -sum(v for v in x if v <= 0)
    byd = collections.defaultdict(list)
    for dt, v, _, _ in T:
        byd[dt].append(v)
    dm = [st.fmean(v) for v in byd.values()]
    se = st.stdev(dm) / len(dm) ** 0.5
    m = st.fmean(dm)
    print(f"  {lab:<28} n={len(x):>6}  win={100*len(w)/len(x):>5.1f}%  "
          f"exp={100*st.fmean(x):>+6.3f}%  PF={sum(w)/gl if gl else float('inf'):>4.2f}  "
          f"date-mean {100*m:+.3f}% +/- {100*1.96*se:.3f}pp")
    return m, se, len(dm)


def main():
    surv = sorted(p for p in glob.glob('data/*_daily_adj.csv')
                  if 'SPY' not in os.path.basename(p))
    dele = sorted(glob.glob('data/delisted/*_daily_adj.csv'))
    print(f"TDPS conservative rules. {len(surv)} survivors vs {len(dele)} delisted names.\n")

    S, _ = pool(surv, close_at_end=False)
    D, dper = pool(dele, close_at_end=True)
    acq = sorted(p for p in dele if os.path.basename(p).split('_')[0] not in BANKRUPT)
    bnk = sorted(p for p in dele if os.path.basename(p).split('_')[0] in BANKRUPT)
    A, _ = pool(acq, close_at_end=True)
    B, _ = pool(bnk, close_at_end=True)
    print(f"POOLED, all trades (95% CI on the date-clustered mean)")
    a = rep("survivors (today's universe)", S)
    rep(f"delisted, all {len(dele)}", D)
    rep(f"  of which acquired ({len(acq)})", A)
    b = rep(f"  of which bankrupt ({len(bnk)})", B)
    if a and b:
        diff = a[0] - b[0]
        sed = (a[1] ** 2 + b[1] ** 2) ** 0.5
        print(f"\n  survivors minus BANKRUPT names: {100*diff:+.3f}pp per trade, "
              f"t={diff/sed:.2f}  (95% CI {100*(diff-1.96*sed):+.3f} .. "
              f"{100*(diff+1.96*sed):+.3f}pp)")

    # ---- the structural question: is the trend gate open while a name dies?
    print("\nTERMINAL YEAR  (last 252 bars before delisting)")
    print("  pct of days the 50/200 trend gate was OPEN, and TDPS trades taken there\n")
    tot_days = tot_open = 0
    term = []
    for s in sorted(dper, key=lambda k: (k not in BANKRUPT, k)):
        z, t = dper[s]
        n = len(z['c'])
        lo = max(260, n - 252)
        days = open_ = 0
        for i in range(lo, n):
            if None in (z['m50'][i], z['m200'][i]):
                continue
            days += 1
            if z['m50'][i] > z['m200'][i] and z['c'][i] > z['m200'][i]:
                open_ += 1
        tr = [(dt, v, bfe, f) for dt, v, bfe, f in t if bfe <= 252]
        ret = 100 * (z['c'][-1] / z['c'][lo] - 1) if z['c'][lo] else 0
        tot_days += days
        tot_open += open_
        term += [v for _, v, _, _ in tr]
        pn = f"{100*st.fmean([v for _,v,_,_ in tr]):+6.2f}%" if tr else "     --"
        tag = 'BANKRUPT' if s in BANKRUPT else 'acquired'
        print(f"  {s:<6} {tag:<9} gate open {100*open_/max(days,1):>5.1f}% of days   "
              f"trades {len(tr):>2}  avg {pn}   final-year price {ret:>+8.1f}%")
    print(f"\n  aggregate: gate open {100*tot_open/max(tot_days,1):.1f}% of terminal-year days")
    if term:
        wt = [v for v in term if v > 0]
        print(f"  {len(term)} trades in terminal years: win {100*len(wt)/len(term):.1f}%, "
              f"expectancy {100*st.fmean(term):+.3f}%")
    # same cut, bankruptcies only
    bd = bo = 0
    bt = []
    for s in BANKRUPT:
        if s not in dper:
            continue
        z, t = dper[s]
        n = len(z['c'])
        lo = max(260, n - 252)
        for i in range(lo, n):
            if None in (z['m50'][i], z['m200'][i]):
                continue
            bd += 1
            if z['m50'][i] > z['m200'][i] and z['c'][i] > z['m200'][i]:
                bo += 1
        bt += [v for _, v, bfe, _ in t if bfe <= 252]
    if bd:
        print(f"  bankruptcies only: gate open {100*bo/bd:.1f}% of terminal-year days, "
              f"{len(bt)} trades"
              + (f", expectancy {100*st.fmean(bt):+.3f}%" if bt else ""))
    forced = [(dt, v) for dt, v, _, f in D if f]
    print(f"\n  positions still open at delisting (cashed out at the final bar): {len(forced)}")
    for dt, v in forced:
        print(f"    entered {dt}  {100*v:+.1f}%")


if __name__ == '__main__':
    main()
