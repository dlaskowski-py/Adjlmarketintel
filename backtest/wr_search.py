"""
Search for configurations that reach a 70% win rate - and report what each
one costs in expectancy.

Win rate alone is trivially purchasable: sell further OTM, take profit sooner.
Both raise the hit rate and both shrink the winner. The only question that
matters is whether expectancy survives the purchase, so every row here prints
win rate and profit factor and expectancy together.

Includes an UNCONDITIONAL-ENTRY CONTROL: the same structure entered on a fixed
calendar cadence, ignoring MACD entirely. If the signal rows do not beat the
control, the signal is contributing nothing and the edge is just short premium.
"""
import sys, math
sys.path.insert(0, '/home/user/Adjlmarketintel/backtest')
from engine import load, run, Config
from options_overlay import bs, strike_for_delta, realised_vol_series


def spread_trades(entries, dates, closes, short_delta=0.30, dte=45,
                  hold=None, take_profit=0.50, stop_mult=2.0,
                  vrp=1.15, spread_cost=0.02, width_pct=0.015, bullish=None):
    """
    entries : list of (index, direction)
    hold    : max bars to hold; None = hold to expiry (dte)
    Returns list of % returns on MAX RISK.
    """
    rv = realised_vol_series(closes)
    horizon = hold if hold is not None else dte
    out = []

    for i, direction in entries:
        if rv[i] is None or i + 2 >= len(closes):
            continue
        S0 = closes[i]
        sigma = max(rv[i] * vrp, 0.05)
        T0 = dte / 365.0
        sc = direction != "long"                     # long signal -> sell puts

        Ks = strike_for_delta(S0, T0, sigma, short_delta, call=sc)
        Kl = Ks + S0 * width_pct if sc else Ks - S0 * width_pct
        credit = bs(S0, Ks, T0, sigma, call=sc) - bs(S0, Kl, T0, sigma, call=sc)
        width = abs(Ks - Kl)
        max_risk = width - credit
        if max_risk <= 0 or credit <= 0:
            continue

        net_credit = credit * (1 - spread_cost)
        ret = None
        last = min(i + horizon, len(closes) - 1)

        for k in range(i + 1, last + 1):
            Tk = max((dte - (k - i)) / 365.0, 1e-9)
            sk = max(rv[k] * vrp, 0.05) if rv[k] is not None else sigma
            val = bs(closes[k], Ks, Tk, sk, call=sc) - bs(closes[k], Kl, Tk, sk, call=sc)
            pnl = net_credit - val * (1 + spread_cost)
            if take_profit and pnl >= credit * take_profit:
                ret = pnl / max_risk * 100
                break
            if stop_mult and pnl <= -credit * stop_mult:
                ret = pnl / max_risk * 100
                break
        if ret is None:
            Tk = max((dte - (last - i)) / 365.0, 1e-9)
            sk = max(rv[last] * vrp, 0.05) if rv[last] is not None else sigma
            val = bs(closes[last], Ks, Tk, sk, call=sc) - bs(closes[last], Kl, Tk, sk, call=sc)
            ret = (net_credit - val * (1 + spread_cost)) / max_risk * 100
        out.append(ret)
    return out


def rep(label, rets, flag_target=True):
    if len(rets) < 10:
        print(f"{label:<44} n={len(rets):>4}  (too few)")
        return None
    w = [r for r in rets if r > 0]
    lo = [r for r in rets if r <= 0]
    gp, gl = sum(w), abs(sum(lo))
    pf = gp / gl if gl else float('inf')
    wr = 100 * len(w) / len(rets)
    e = sum(rets) / len(rets)
    aw = sum(w) / len(w) if w else 0
    al = sum(lo) / len(lo) if lo else 0
    mark = ""
    if flag_target:
        if 65 <= wr <= 75 and e > 0:
            mark = "  <== 70% TARGET + positive"
        elif 65 <= wr <= 75:
            mark = "  <== 70% but LOSES money"
    print(f"{label:<44} n={len(rets):>4}  WR={wr:>5.1f}%  PF={pf:>5.2f}  "
          f"E={e:>6.2f}%  W/L={aw:>6.1f}/{al:>7.1f}{mark}")
    return wr, pf, e
