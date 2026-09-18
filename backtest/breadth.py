"""
McClellan Oscillator from a large-cap breadth proxy.

The real McClellan runs on NYSE advancing/declining issues (~3000 names).
Alpha Vantage has no breadth feed, so this reconstructs it from a basket of
liquid large caps. That is a PROXY, not the NYSE oscillator - it captures
large-cap breadth, which correlates with but is not identical to the real
thing. Stated plainly because the distinction matters for interpreting any
result.

Classic construction:
    RANA        = (advances - declines) / (advances + declines) * 1000
    McClellan   = EMA19(RANA) - EMA39(RANA)
    Summation   = running cumulative sum of the oscillator

The ratio-adjusted form is used so a changing basket size (names listing over
time) does not distort the scale.
"""
import sys
sys.path.insert(0, '/home/user/Adjlmarketintel/backtest')
from engine import load, ema


def build_breadth(symbols, datadir='/home/user/Adjlmarketintel/data'):
    series = {}
    for s in symbols:
        try:
            d, o, h, l, c = load(f'{datadir}/{s}_daily_adj.csv')
            series[s] = dict(zip(d, c))
        except FileNotFoundError:
            continue

    all_dates = sorted({dt for s in series for dt in series[s]})
    rana, dates = [], []
    for i, dt in enumerate(all_dates):
        if i == 0:
            continue
        prev = all_dates[i - 1]
        adv = dec = 0
        for s, px in series.items():
            if dt in px and prev in px:
                if px[dt] > px[prev]:
                    adv += 1
                elif px[dt] < px[prev]:
                    dec += 1
        tot = adv + dec
        if tot < 5:            # too few names quoted to mean anything
            continue
        rana.append((adv - dec) / tot * 1000.0)
        dates.append(dt)

    e19, e39 = ema(rana, 19), ema(rana, 39)
    osc = [a - b for a, b in zip(e19, e39)]
    summ, run = [], 0.0
    for v in osc:
        run += v
        summ.append(run)
    return dates, rana, osc, summ, len(series)
