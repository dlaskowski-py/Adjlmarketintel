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
    """Position state on the final bar, from the ONE replay the portal uses.

    This used to carry its own replay loop, and it drifted from both Pine and
    the backtest in two ways: it checked exits on the fill bar (v5 gates every
    exit behind heldBars > 0), and it allowed re-entry on the bar a position
    closed (impossible in Pine, where position_size is the start-of-bar value
    and the entry block runs before the exits). The second produced a false
    AMD BUY on 2026-10-14. Position state now comes from run_strategies, which
    is checked trade-for-trade against the backtest by `--parity`.

    RSI and the 200-day distance are still computed here because this is the
    internal diagnostic view; the portal never sees them.
    """
    from run_strategies import tdps_events, MODES
    TR, _, _ = bases(path)
    d, o, h, l, c = TR
    if len(c) < 265:
        return None
    m50, m200 = sma(c, 50), sma(c, 200)
    _, atr = dmi_atr(h, l, c, 14)
    r2 = rsi(c, 2)
    i = len(c) - 1
    if None in (m50[i], m200[i], atr[i], r2[i]):
        return None
    ev, book = tdps_events(TR, MODES['tdps_conservative'], equity, riskpct / 100.0)
    today = [e for e in ev if e['date'] == d[i]]
    marker = any(e['kind'] == 'entry' for e in today)
    exit_today = next((e['reason'] for e in today if e['kind'] == 'exit'), None)
    open_ = book is not None and not book.get('pending')
    cond = m50[i] > m200[i] and c[i] > m200[i] and r2[i] < 15
    stop = c[i] - 3.0 * atr[i]
    qty = int((equity * riskpct / 100.0) / max(c[i] - stop, 1e-9))
    return dict(date=d[i], close=c[i], rsi=r2[i], cond=cond, pos=1 if open_ else 0,
                marker=marker, exit_today=exit_today,
                atrpct=100 * atr[i] / c[i], stop=stop, qty=qty,
                held=book['bars'] if open_ else 0,
                scaled=book['scaled'] if open_ else False,
                entry_date=book['entry_date'] if open_ else '',
                vs200=100 * (c[i] / m200[i] - 1))


def main(target, equity=100000.0, riskpct=1.0):
    marks, held, blocked, closed, stale = [], [], [], [], 0
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
        if st['marker']:
            marks.append((s, st))
        elif st['cond'] and st['exit_today']:
            closed.append((s, st))
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
    if closed:
        print(f"\n   entry condition true but the position CLOSED this bar, so no marker "
              f"({len(closed)}) -- Pine cannot re-enter on an exit bar; next bar at the earliest:")
        for s, st in closed:
            print(f"     {s:<6} RSI(2) {st['rsi']:>5.1f}  closed by {st['exit_today']}")
    if blocked:
        print(f"\n   entry condition true but size floors to 0 shares ({len(blocked)}):")
        for s, st in blocked:
            print(f"     {s:<6} RSI(2) {st['rsi']:>5.1f}  close {st['close']:.2f}")


if __name__ == '__main__':
    t = sys.argv[1] if len(sys.argv) > 1 else '2026-10-12'
    e = float(sys.argv[2]) if len(sys.argv) > 2 else 100000.0
    r = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
    main(t, e, r)
