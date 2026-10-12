#!/usr/bin/env python3
"""TDPS buy markers on a given date, with full position-state replay.

A Pine plotshape fires on `buySignal AND strategy.position_size <= 0 AND
plannedQty >= 1`. Reporting buySignal alone was wrong once already: seven names
were called fresh buys while mid-trade. So this replays every position from the
start of the series and only reports a name flat on the target bar.

Only names whose last bar IS the target date are evaluated. Anything else would
be judged on a stale bar and reported as if current.

Usage:  python3 backtest/tdps_scan_date.py [YYYY-MM-DD] [EQUITY] [RISK_PCT]
"""
import sys, os, glob, csv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from engine import sma, rma, dmi_atr
from price_basis import bases

COMM = 0.0005


def rsi(c, n=2):
    g, l = [0.0], [0.0]
    for i in range(1, len(c)):
        ch = c[i] - c[i - 1]
        g.append(max(ch, 0.0)); l.append(max(-ch, 0.0))
    ag, al = rma(g, n), rma(l, n)
    return [None if a is None or b is None else (100.0 if b == 0 else 100 - 100/(1 + a/b))
            for a, b in zip(ag, al)]


def state(path, equity, riskpct):
    """Replay to the final bar. Returns the position/marker state there."""
    TR, _, _ = bases(path)
    d, o, h, l, c = TR
    if len(c) < 265:
        return None
    m50, m200, m10 = sma(c, 50), sma(c, 200), sma(c, 10)
    _, atr = dmi_atr(h, l, c, 14)
    r2 = rsi(c, 2)
    n = len(c)

    pos = 0            # 0 flat, 1 long
    entry = ebar = 0
    scaled = False
    peak = 0.0
    base = 0.0
    for i in range(260, n):
        if None in (m50[i], m200[i], m10[i], atr[i], r2[i]):
            continue
        if pos:
            peak = max(peak, h[i])
            s = max(base, entry) if scaled else base
            held = i - ebar
            if l[i] <= s:
                pos = 0
            elif not scaled and c[i] > m10[i]:
                scaled = True
            elif ((scaled and c[i] < peak - 3.0 * atr[i])
                  or c[i] < m200[i] or held >= (40 if scaled else 15)):
                pos = 0
        if pos == 0 and i < n - 1:
            if m50[i] > m200[i] and c[i] > m200[i] and r2[i] < 15:
                pos = 1; entry = o[i+1] if i+1 < n else c[i]
                ebar = i + 1; scaled = False; peak = h[i]; base = entry - 3.0*atr[i]

    i = n - 1
    if None in (m50[i], m200[i], atr[i], r2[i]):
        return None
    cond = m50[i] > m200[i] and c[i] > m200[i] and r2[i] < 15
    stop = c[i] - 3.0 * atr[i]
    qty = int((equity * riskpct / 100.0) / max(c[i] - stop, 1e-9))
    return dict(date=d[i], close=c[i], rsi=r2[i], cond=cond, pos=pos,
                atrpct=100*atr[i]/c[i], stop=stop, qty=qty,
                held=(i - ebar) if pos else 0, scaled=scaled,
                entry_date=d[ebar] if pos and ebar < n else '',
                vs200=100*(c[i]/m200[i]-1))


def main(target, equity=100000.0, riskpct=1.0):
    marks, held, blocked, stale = [], [], [], 0
    for p in sorted(glob.glob('data/*_daily_adj.csv')):
        s = os.path.basename(p).split('_')[0]
        if s == 'SPY':
            continue
        try:
            rows = list(csv.DictReader(open(p)))
            if rows[-1]['date'] != target:
                stale += 1
                continue
            st = state(p, equity, riskpct)
        except Exception:
            continue
        if not st:
            continue
        if st['cond'] and st['pos'] == 0 and st['qty'] >= 1:
            marks.append((s, st))
        elif st['cond'] and st['pos'] == 1:
            held.append((s, st))
        elif st['cond'] and st['qty'] < 1:
            blocked.append((s, st))
    print(f"TDPS BUY MARKERS — {target}   "
          f"({len(marks)+len(held)+len(blocked)} of the refreshed names meet the entry condition; "
          f"{stale} names not refreshed to this date)\n")
    if marks:
        print(f"   {'sym':<6}{'close':>10}{'RSI2':>7}{'shares':>8}{'3ATR stop':>11}"
              f"{'ATR%':>7}{'vs 200MA':>10}")
        for s, st in sorted(marks, key=lambda x: x[1]['rsi']):
            print(f"   {s:<6}{st['close']:>10.2f}{st['rsi']:>7.1f}{st['qty']:>8}"
                  f"{st['stop']:>11.2f}{st['atrpct']:>6.2f}%{st['vs200']:>+9.1f}%")
    else:
        print("   none — no name is both flat and oversold inside its uptrend")
    if held:
        print(f"\n   entry condition true but ALREADY LONG, so no marker ({len(held)}):")
        for s, st in sorted(held, key=lambda x: x[1]['rsi']):
            print(f"     {s:<6} RSI(2) {st['rsi']:>5.1f}  held since {st['entry_date']} "
                  f"({st['held']} bars, {'scaled' if st['scaled'] else 'not scaled'})")
    if blocked:
        print(f"\n   entry condition true but size floors to 0 shares ({len(blocked)}):")
        for s, st in blocked:
            print(f"     {s:<6} RSI(2) {st['rsi']:>5.1f}  close {st['close']:.2f}")


if __name__ == '__main__':
    t = sys.argv[1] if len(sys.argv) > 1 else '2026-10-12'
    e = float(sys.argv[2]) if len(sys.argv) > 2 else 100000.0
    r = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
    main(t, e, r)
