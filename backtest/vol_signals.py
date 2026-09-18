"""
Volatility-regime signals and direction-neutral structures.

Every directional signal tested so far lost to blind entry. The premise being
tested here is different: not "which way will it go" but "will realised
volatility exceed what the option is priced at". A straddle pays on a large
move in either direction, so it needs no direction call at all.
"""
import sys, math
sys.path.insert(0, '/home/user/Adjlmarketintel/backtest')
from engine import sma, ema, stdev, rma, dmi_atr, percentrank


def bollinger_keltner_squeeze(o, h, l, c, bbLen=20, bbMult=2.0, kcLen=20, kcMult=1.5):
    """
    TTM-style squeeze: Bollinger Bands inside Keltner Channels means volatility
    is compressed. The signal is the RELEASE, not the compression.
    """
    basis = sma(c, bbLen)
    sd = stdev(c, bbLen)
    ma = ema(c, kcLen)
    _adx, atr = dmi_atr(h, l, c, kcLen)
    on = []
    for i in range(len(c)):
        if None in (basis[i], sd[i], atr[i]):
            on.append(False)
            continue
        ub, lb = basis[i] + bbMult * sd[i], basis[i] - bbMult * sd[i]
        uk, lk = ma[i] + kcMult * atr[i], ma[i] - kcMult * atr[i]
        on.append(lb > lk and ub < uk)
    fired = [False] + [on[i - 1] and not on[i] for i in range(1, len(c))]
    return on, fired


def sig_squeeze_fire(d, o, h, l, c, warm=300):
    _on, fired = bollinger_keltner_squeeze(o, h, l, c)
    return [(i, "long") for i in range(warm, len(c) - 60) if fired[i]]


def sig_squeeze_lowiv(d, o, h, l, c, warm=300, ivmax=30):
    """Squeeze release AND cheap premium - compression plus low IV rank."""
    _on, fired = bollinger_keltner_squeeze(o, h, l, c)
    lr = [None] + [math.log(c[i] / c[i - 1]) for i in range(1, len(c))]
    rv = stdev(lr, 20)
    pr = percentrank(rv, 252)
    return [(i, "long") for i in range(warm, len(c) - 60)
            if fired[i] and pr[i] is not None and pr[i] < ivmax]


def sig_atr_contraction(d, o, h, l, c, warm=300, pct=15):
    """ATR at a yearly low - premium cheap in absolute terms."""
    _adx, atr = dmi_atr(h, l, c, 14)
    rel = [None if atr[i] is None or c[i] == 0 else atr[i] / c[i] for i in range(len(c))]
    pr = percentrank(rel, 252)
    return [(i, "long") for i in range(warm, len(c) - 60)
            if pr[i] is not None and pr[i] < pct]


def sig_blind(d, o, h, l, c, step=20, warm=300):
    return [(i, "long") for i in range(warm, len(c) - 60, step)]
