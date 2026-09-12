"""
Alternative entry signals, measured identically so they are comparable.

Every generator returns [(bar_index, "long"|"short")]. The benchmark that
matters is not whether a signal makes money - in a 26-year sample where most
names rose, almost anything long-biased does - but whether it beats a blind
entry of the same structure on the same bars.
"""
import sys
sys.path.insert(0, '/home/user/Adjlmarketintel/backtest')
from engine import ema, sma, rma, dmi_atr, macd


def rsi(closes, n=2):
    gains, losses = [0.0], [0.0]
    for i in range(1, len(closes)):
        ch = closes[i] - closes[i - 1]
        gains.append(max(ch, 0.0))
        losses.append(max(-ch, 0.0))
    ag, al = rma(gains, n), rma(losses, n)
    out = []
    for g, l in zip(ag, al):
        if g is None or l is None:
            out.append(None)
        elif l == 0:
            out.append(100.0)
        else:
            rs = g / l
            out.append(100 - 100 / (1 + rs))
    return out


def sig_macd(d, o, h, l, c, warm=250):
    ml, sl = macd(c, 12, 26, 9)
    tr = sma(c, 200)
    out = []
    for i in range(warm, len(c) - 60):
        if tr[i] is None:
            continue
        up = ml[i] > sl[i] and ml[i - 1] <= sl[i - 1]
        dn = ml[i] < sl[i] and ml[i - 1] >= sl[i - 1]
        if up and ml[i] > 0 and c[i] > tr[i]:
            out.append((i, "long"))
        elif dn and ml[i] < 0 and c[i] < tr[i]:
            out.append((i, "short"))
    return out


def sig_rsi2(d, o, h, l, c, warm=250):
    """Short-horizon mean reversion: oversold above trend, overbought below."""
    r = rsi(c, 2)
    tr = sma(c, 200)
    out = []
    for i in range(warm, len(c) - 60):
        if r[i] is None or tr[i] is None:
            continue
        if r[i] < 10 and c[i] > tr[i]:
            out.append((i, "long"))
        elif r[i] > 90 and c[i] < tr[i]:
            out.append((i, "short"))
    return out


def sig_breakout(d, o, h, l, c, n=55, warm=250):
    """Donchian channel breakout - classic trend following."""
    out = []
    for i in range(max(warm, n), len(c) - 60):
        hh, ll = max(h[i - n:i]), min(l[i - n:i])
        if c[i] > hh:
            out.append((i, "long"))
        elif c[i] < ll:
            out.append((i, "short"))
    return out


def sig_macross(d, o, h, l, c, warm=250):
    f, s = ema(c, 20), ema(c, 50)
    out = []
    for i in range(warm, len(c) - 60):
        if f[i] > s[i] and f[i - 1] <= s[i - 1]:
            out.append((i, "long"))
        elif f[i] < s[i] and f[i - 1] >= s[i - 1]:
            out.append((i, "short"))
    return out


def sig_volcontract(d, o, h, l, c, warm=250):
    """
    Volatility contraction: realised vol in the bottom quintile of its own
    year. Not a direction call - premium is cheap here, which is when long
    options are least penalised.
    """
    import math
    lr = [None] + [math.log(c[i] / c[i - 1]) for i in range(1, len(c))]
    from engine import stdev, percentrank
    rv = stdev(lr, 20)
    pr = percentrank(rv, 252)
    tr = sma(c, 200)
    out = []
    for i in range(warm, len(c) - 60):
        if pr[i] is None or tr[i] is None:
            continue
        if pr[i] < 20:
            out.append((i, "long" if c[i] > tr[i] else "short"))
    return out


def sig_blind(d, o, h, l, c, step=20, warm=250):
    return [(i, "long") for i in range(warm, len(c) - 60, step)]


def sig_blind_short(d, o, h, l, c, step=20, warm=250):
    return [(i, "short") for i in range(warm, len(c) - 60, step)]
