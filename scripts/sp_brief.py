#!/usr/bin/env python3
"""
Daily S&P state brief.

Reports what is measurable, flags what has demonstrated edge, and explicitly
marks what does not. The point is a state readout, not a trade idea generator:
of the signals tested in this repository only the regime filter improved
anything risk-adjusted, so only it is presented as actionable.

Usage:  python3 scripts/sp_brief.py [SPY_csv]
"""
import sys, os, csv, math, glob, statistics, datetime as dt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'backtest'))
from engine import load, sma, ema, stdev, percentrank, dmi_atr, macd, rma


def rsi(c, n=2):
    g, l = [0.0], [0.0]
    for i in range(1, len(c)):
        ch = c[i] - c[i - 1]
        g.append(max(ch, 0.0))
        l.append(max(-ch, 0.0))
    ag, al = rma(g, n), rma(l, n)
    return [None if a is None or b is None else (100.0 if b == 0 else 100 - 100 / (1 + a / b))
            for a, b in zip(ag, al)]


def pct(x, lo, hi):
    return max(0.0, min(100.0, 100.0 * (x - lo) / (hi - lo))) if hi > lo else 50.0


def main(path):
    d, o, h, l, c = load(path)
    i = len(c) - 1
    m50, m200 = sma(c, 50), sma(c, 200)
    adx, atr = dmi_atr(h, l, c, 14)
    lr = [None] + [math.log(c[k] / c[k - 1]) for k in range(1, len(c))]
    rv = [None if v is None else v * math.sqrt(252) * 100 for v in stdev(lr, 20)]
    vrank = percentrank(rv, 252)
    r2 = rsi(c, 2)
    ml, msg = macd(c, 12, 26, 9)

    out = []
    A = out.append
    A(f"S&P STATE BRIEF — data through {d[i]}")
    A("=" * 62)
    A(f"  close           {c[i]:>12,.2f}   {100*(c[i]/c[i-1]-1):+.2f}% on the day")
    A(f"  5 / 20 / 60 day {100*(c[i]/c[i-5]-1):>+11.2f}% {100*(c[i]/c[i-20]-1):+.2f}% {100*(c[i]/c[i-60]-1):+.2f}%")
    A("")

    # ---- the one signal with evidence behind it
    on = m50[i] > m200[i]
    was = m50[i-1] > m200[i-1]
    A("  REGIME  (the only tested filter that improved risk-adjusted return)")
    A(f"    50MA {m50[i]:>10,.2f}   200MA {m200[i]:>10,.2f}   spread {100*(m50[i]/m200[i]-1):+.2f}%")
    A(f"    state: {'RISK ON  - 50 above 200' if on else 'RISK OFF - 50 below 200'}"
      + ("   *** FLIPPED TODAY ***" if on != was else ""))
    A(f"    price vs 200MA: {100*(c[i]/m200[i]-1):+.2f}%")
    A("")

    # ---- volatility regime, which is what the cross actually keys on
    A("  VOLATILITY")
    A(f"    realised 20d    {rv[i]:>6.1f}% annualised   percentile {vrank[i]:>5.1f} of the last year")
    A(f"    ATR(14)         {atr[i]:>6.2f}  ({100*atr[i]/c[i]:.2f}% of price)")
    band = "low" if vrank[i] < 30 else "elevated" if vrank[i] > 70 else "normal"
    A(f"    regime: {band}"
      + ("   — options priced rich here (IV ~1.5x realised in calm markets)" if vrank[i] < 30 else ""))
    A("")

    # ---- context indicators, explicitly marked as non-predictive
    A("  CONTEXT  (measured NOT to beat blind entry — state only, not signals)")
    A(f"    RSI(2)          {r2[i]:>6.1f}   {'oversold' if r2[i]<10 else 'overbought' if r2[i]>90 else 'neutral'}")
    A(f"    MACD            {ml[i]:>+7.2f} vs signal {msg[i]:+.2f}   {'above' if ml[i]>msg[i] else 'below'}")
    A(f"    ADX(14)         {adx[i]:>6.1f}   {'trending' if adx[i]>25 else 'rangebound'}")
    dh, dl = max(h[i-55:i]), min(l[i-55:i])
    A(f"    55d range       {dl:,.2f} - {dh:,.2f}   position {pct(c[i], dl, dh):.0f}%")
    A("")

    # ---- breadth across whatever names are on disk
    files = [p for p in glob.glob(os.path.join(ROOT, 'data', '*_daily_adj.csv'))
             if 'SPY' not in os.path.basename(p)]
    if len(files) >= 10:
        adv = dec = 0
        for p in files:
            try:
                dd, _, _, _, cc = load(p)
                if dd[-1] != d[i] or len(cc) < 2:
                    continue
                if cc[-1] > cc[-2]:
                    adv += 1
                elif cc[-1] < cc[-2]:
                    dec += 1
            except Exception:
                continue
        if adv + dec >= 10:
            A("  BREADTH  (large-cap proxy, not NYSE)")
            A(f"    advancing {adv} / declining {dec}   ratio {adv/max(dec,1):.2f}")
            A(f"    net {100*(adv-dec)/(adv+dec):+.0f}% of names quoted on this date")
            A("")

    A("  READ")
    if on:
        A("    Regime is risk-on. The filter says hold exposure; it does not")
        A("    forecast direction — it only avoids high-volatility declines.")
    else:
        A("    Regime is risk-off. On the 25-name basket this state carried 1.45x")
        A("    the volatility of risk-on for no extra return.")
    A("    Nothing in the CONTEXT block beat blind entry in testing. Treat it as")
    A("    description of where price sits, not as a reason to trade.")
    return "\n".join(out)


if __name__ == "__main__":
    p = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'data', 'SPY_daily_adj.csv')
    print(main(p))
