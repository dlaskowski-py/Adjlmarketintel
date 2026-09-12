"""
Option model calibrated to REAL Alpha Vantage chains.

Measured from 13 sampled 30-delta contracts, 25-60 DTE, across calm and
stressed regimes:

    regime   IV / trailing-20d-RV   bid-ask as % of mark
    calm              1.51x                 3.4%
    stress            0.84x                12.2%

Both are regime-dependent, so both are interpolated on the realised-vol
percentile rather than held flat. This matters more than it sounds: signals
that deliberately enter in quiet markets are buying where the variance risk
premium is RICHEST, which a flat assumption hides completely.
"""
import sys, math
sys.path.insert(0, '/home/user/Adjlmarketintel/backtest')
from engine import stdev, percentrank
from options_overlay import bs, strike_for_delta

IV_CALM,  IV_STRESS  = 1.51, 0.84
SPR_CALM, SPR_STRESS = 0.034, 0.122


def regime_params(vol_pct):
    """vol_pct: realised-vol percentile 0-100. Returns (iv_ratio, spread)."""
    if vol_pct is None:
        vol_pct = 50.0
    w = min(max(vol_pct / 100.0, 0.0), 1.0)
    return (IV_CALM + (IV_STRESS - IV_CALM) * w,
            SPR_CALM + (SPR_STRESS - SPR_CALM) * w)


def vol_context(closes, win=20, look=252):
    lr = [None] + [math.log(closes[i] / closes[i - 1]) for i in range(1, len(closes))]
    sd = stdev(lr, win)
    rv = [None if v is None else v * math.sqrt(252) for v in sd]
    return rv, percentrank(rv, look)


def long_option(entries, closes, hold=20, dte=45, target_delta=0.30):
    """Buy at ask, sell at bid - the full spread is paid over the round trip."""
    rv, pct = vol_context(closes)
    out = []
    for i, dirn in entries:
        if rv[i] is None or i + hold >= len(closes):
            continue
        iv_ratio, spread = regime_params(pct[i])
        sigma = max(rv[i] * iv_ratio, 0.05)
        S0, T0 = closes[i], dte / 365
        call = dirn == "long"
        K = strike_for_delta(S0, T0, sigma, target_delta, call=call)
        mark_in = bs(S0, K, T0, sigma, call=call)
        if mark_in <= 0.01:
            continue
        pay = mark_in * (1 + spread / 2)              # lift the offer
        k = i + hold
        iv_out, spread_out = regime_params(pct[k])
        # Exit IV moves with the regime, never with the realised move itself.
        sig_out = max(rv[i] * iv_out, 0.05)
        T1 = max((dte - hold) / 365, 1 / 365)
        mark_out = bs(closes[k], K, T1, sig_out, call=call)
        got = mark_out * (1 - spread_out / 2)         # hit the bid
        out.append((got - pay) / pay * 100)
    return out


def credit_spread(entries, closes, hold=45, dte=45, short_delta=0.30, width_pct=0.015):
    rv, pct = vol_context(closes)
    out = []
    for i, dirn in entries:
        if rv[i] is None or i + hold >= len(closes):
            continue
        iv_ratio, spread = regime_params(pct[i])
        sigma = max(rv[i] * iv_ratio, 0.05)
        S0, T0 = closes[i], dte / 365
        sc = dirn != "long"
        Ks = strike_for_delta(S0, T0, sigma, short_delta, call=sc)
        Kl = Ks + S0 * width_pct if sc else Ks - S0 * width_pct
        credit = bs(S0, Ks, T0, sigma, call=sc) - bs(S0, Kl, T0, sigma, call=sc)
        width = abs(Ks - Kl)
        risk = width - credit
        if risk <= 0 or credit <= 0:
            continue
        got = credit * (1 - spread / 2)
        k = i + hold
        iv_out, spread_out = regime_params(pct[k])
        sig_out = max(rv[i] * iv_out, 0.05)
        T1 = max((dte - hold) / 365, 1 / 365)
        val = bs(closes[k], Ks, T1, sig_out, call=sc) - bs(closes[k], Kl, T1, sig_out, call=sc)
        pay = val * (1 + spread_out / 2)
        out.append((got - pay) / risk * 100)
    return out
