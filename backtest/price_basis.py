#!/usr/bin/env python3
"""Three price bases from one Alpha Vantage TIME_SERIES_DAILY_ADJUSTED file.

Exists because the raw `close` column is a trap. Alpha Vantage does not
split-adjust it, so AAPL prints -85.5% on 2014-06-09 and -74.2% on
2020-08-31. Those are the 7:1 and 4:1 splits. Any oscillator reads a split
as a crash: RSI(2) goes to ~0 and a mean-reversion entry fires into it. A
run that signalled off this column produced 31,774 trades at -0.126%
expectancy, against 20,302 at +0.211% on the adjusted series -- a sign flip
that was entirely manufactured by splits. Do not use RAW for signals.

  TR   total return.   adj_close/close applied to OHLC. Splits and dividends
                       both removed. Correct for measuring what a position
                       earned, since you did receive the dividend.
  SPL  split-adjusted. Raw OHLC with only the split coefficient removed.
                       What a chart shows with dividend adjustment OFF, and
                       the point-in-time series: a back-adjusted series is
                       restated by every later dividend, so indicators
                       computed on TR today were not computable at the time.
  RAW  as quoted.      Untouched. Returned only so callers can see the
                       discontinuities for themselves; never signal on it.

Measured conclusion (124 names, full history, P&L on TR in both arms):
signalling on SPL instead of TR moves expectancy from +0.211% to +0.212%,
paired same-date difference -0.000pp at t=-0.02. The TDPS edge does not
depend on the dividend basis. The trend gate does -- see FINDINGS.md.
"""
import csv


def bases(path):
    """Return (TR, SPL, RAW), each a (dates, open, high, low, close) tuple."""
    r = list(csv.DictReader(open(path)))
    n = len(r)
    d  = [x['date'] for x in r]
    o  = [float(x['open'])  for x in r]
    h  = [float(x['high'])  for x in r]
    l  = [float(x['low'])   for x in r]
    c  = [float(x['close']) for x in r]
    ac = [float(x['adj_close']) for x in r]
    sp = [float(x['split'] or 1.0) for x in r]

    # Cumulative split factor, walked backwards: a bar before a split must be
    # divided by it to live on the same scale as bars after it.
    cf = [1.0] * n
    f = 1.0
    for i in range(n - 1, -1, -1):
        cf[i] = f
        if sp[i] and sp[i] != 1.0:
            f *= sp[i]

    tr = [ac[i] / c[i] for i in range(n)]
    TR  = (d, [o[i]*tr[i] for i in range(n)], [h[i]*tr[i] for i in range(n)],
              [l[i]*tr[i] for i in range(n)], ac[:])
    SPL = (d, [o[i]/cf[i] for i in range(n)], [h[i]/cf[i] for i in range(n)],
              [l[i]/cf[i] for i in range(n)], [c[i]/cf[i] for i in range(n)])
    return TR, SPL, (d, o, h, l, c)


def split_dates(path, lookback=None):
    """Dates carrying a split coefficient, optionally only the last N bars."""
    r = list(csv.DictReader(open(path)))
    if lookback:
        r = r[-lookback:]
    return [x['date'] for x in r
            if (x['split'] or '1') not in ('', '1', '1.0') and float(x['split']) != 1.0]


if __name__ == '__main__':
    import sys, os
    p = sys.argv[1] if len(sys.argv) > 1 else 'data/AAPL_daily_adj.csv'
    TR, SPL, RAW = bases(p)
    d = TR[0]
    print(f"{os.path.basename(p)}  {len(d)} bars  {d[0]} .. {d[-1]}")
    print(f"  splits on record: {', '.join(split_dates(p)) or 'none'}")
    for nm, s in (('RAW', RAW), ('SPL', SPL)):
        j = [(s[4][i]/s[4][i-1]-1, d[i]) for i in range(1, len(d))]
        worst = sorted(j)[:3]
        print(f"  {nm} worst single-bar moves: "
              + "  ".join(f"{dt} {100*v:+.1f}%" for v, dt in worst))
    print(f"  dividend drag SPL/TR: {SPL[4][0]/TR[4][0]:.3f}x at the start, "
          f"{SPL[4][-1]/TR[4][-1]:.3f}x at the end")
