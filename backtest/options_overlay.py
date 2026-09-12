"""
Option-structure overlay on the MACD signal.

Takes the underlying trades produced by engine.run() and prices what an actual
contract would have done, using Black-Scholes with an implied vol set from
trailing realised vol plus a variance risk premium (IV prices richer than RV -
ignoring that would overstate long-option results).

Models three structures:
  long_atm   - 50-delta call/put
  long_otm   - ~30-delta call/put
  credit     - short vertical spread, ~30-delta short leg, 10-point wide
"""
import math
from engine import stdev


def _n(x):
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))


def bs(S, K, T, sigma, r=0.04, call=True):
    if T <= 0:
        return max(0.0, S - K) if call else max(0.0, K - S)
    if sigma <= 0:
        sigma = 1e-6
    d1 = (math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    if call:
        return S * _n(d1) - K * math.exp(-r * T) * _n(d2)
    return K * math.exp(-r * T) * _n(-d2) - S * _n(-d1)


def delta(S, K, T, sigma, r=0.04, call=True):
    if T <= 0 or sigma <= 0:
        return 1.0 if (call and S > K) else 0.0
    d1 = (math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * math.sqrt(T))
    return _n(d1) if call else _n(d1) - 1


def strike_for_delta(S, T, sigma, target, call=True):
    """
    Bisection on strike to hit a target |delta|.

    Direction matters: call delta FALLS as strike rises, put |delta| RISES as
    strike rises. Using one branch for both converges on nonsense strikes and
    near-zero premiums, which silently manufactures enormous returns.
    """
    lo, hi = S * 0.5, S * 1.5
    for _ in range(80):
        mid = (lo + hi) / 2
        dd = abs(delta(S, mid, T, sigma, call=call))
        if call:
            if dd > target:
                lo = mid          # too deep ITM -> raise strike
            else:
                hi = mid
        else:
            if dd > target:
                hi = mid          # too deep ITM -> lower strike
            else:
                lo = mid
    return (lo + hi) / 2


def realised_vol_series(closes, win=20):
    lr = [None] + [math.log(closes[i] / closes[i - 1]) for i in range(1, len(closes))]
    sd = stdev(lr, win)
    return [None if v is None else v * math.sqrt(252) for v in sd]


def overlay(trades, dates, closes, structure="long_otm",
            dte=45, vrp=1.15, spread_cost=0.02, width_pct=0.015):
    """
    vrp          - implied / realised vol ratio (variance risk premium)
    spread_cost  - round-trip bid/ask cost as fraction of option premium
    """
    idx = {d: i for i, d in enumerate(dates)}
    rv = realised_vol_series(closes)
    out = []

    for t in trades:
        i = idx.get(t.entry_date)
        j = idx.get(t.exit_date)
        if i is None or j is None or rv[i] is None:
            continue

        S0, S1 = t.entry, t.exit
        sigma = max(rv[i] * vrp, 0.05)
        T0 = dte / 365.0
        T1 = max((dte - t.bars) / 365.0, 1 / 365.0)   # calendar decay
        call = t.direction == "long"

        if structure in ("long_atm", "long_otm"):
            tgt = 0.50 if structure == "long_atm" else 0.30
            K = strike_for_delta(S0, T0, sigma, tgt, call=call)
            entry_px = bs(S0, K, T0, sigma, call=call)
            # Vol regime shifts with direction: selloffs lift IV, rallies bleed it.
            s1 = sigma * (1.10 if (not call and S1 < S0) else 0.95)
            exit_px = bs(S1, K, T1, s1, call=call)
            if entry_px <= 0:
                continue
            ret = (exit_px * (1 - spread_cost) - entry_px * (1 + spread_cost)) / entry_px
            out.append((t, ret * 100))

        elif structure == "credit":
            # Bull put on longs, bear call on shorts. Short ~30-delta, long leg
            # width_pct further OTM. Return is quoted on MAX RISK, which is the
            # only honest denominator for a defined-risk spread.
            sc = not call                       # short puts under a long signal
            Ks = strike_for_delta(S0, T0, sigma, 0.30, call=sc)
            Kl = Ks - S0 * width_pct if not sc else Ks + S0 * width_pct
            credit = bs(S0, Ks, T0, sigma, call=sc) - bs(S0, Kl, T0, sigma, call=sc)
            width = abs(Ks - Kl)
            max_risk = width - credit
            if max_risk <= 0 or credit <= 0:
                continue
            s1 = sigma * 0.95
            val = bs(S1, Ks, T1, s1, call=sc) - bs(S1, Kl, T1, s1, call=sc)
            pnl = (credit * (1 - spread_cost)) - (val * (1 + spread_cost))
            out.append((t, pnl / max_risk * 100))

    return out


def summarise(label, rows, target_win=10.0):
    if not rows:
        print(f"{label:<30} no trades")
        return
    rets = [r for _, r in rows]
    w = [r for r in rets if r > 0]
    lo = [r for r in rets if r <= 0]
    gp, gl = sum(w), abs(sum(lo))
    pf = gp / gl if gl else float("inf")
    wr = 100 * len(w) / len(rets)
    exp = sum(rets) / len(rets)
    aw = sum(w) / len(w) if w else 0
    al = sum(lo) / len(lo) if lo else 0
    hit10 = 100 * sum(1 for r in rets if r >= target_win) / len(rets)
    print(f"{label:<30} n={len(rets):>3}  WR={wr:>5.1f}%  PF={pf:>5.2f}  "
          f"E={exp:>7.2f}%  avgW={aw:>7.1f}%  avgL={al:>7.1f}%  >=+10%:{hit10:>5.1f}%")


def credit_managed(trades, dates, closes, dte=45, vrp=1.15,
                   spread_cost=0.02, width_pct=0.015, take_profit=0.50,
                   stop_mult=2.0):
    """
    Credit spread with daily repricing and active management.

    take_profit - close at this fraction of max credit captured (industry
                  convention is 50%); this is the standard lever for raising
                  win rate on premium selling.
    stop_mult   - close if loss reaches this multiple of credit received.

    Reprices every bar inside the trade rather than only at entry and exit, so
    the profit target can actually trigger when it was really available.
    """
    idx = {d: i for i, d in enumerate(dates)}
    rv = realised_vol_series(closes)
    out = []

    for t in trades:
        i, j = idx.get(t.entry_date), idx.get(t.exit_date)
        if i is None or j is None or rv[i] is None:
            continue
        S0 = t.entry
        sigma = max(rv[i] * vrp, 0.05)
        T0 = dte / 365.0
        sc = t.direction != "long"                  # long signal -> sell puts

        Ks = strike_for_delta(S0, T0, sigma, 0.30, call=sc)
        Kl = Ks + S0 * width_pct if sc else Ks - S0 * width_pct
        credit = bs(S0, Ks, T0, sigma, call=sc) - bs(S0, Kl, T0, sigma, call=sc)
        width = abs(Ks - Kl)
        max_risk = width - credit
        if max_risk <= 0 or credit <= 0:
            continue

        net_credit = credit * (1 - spread_cost)
        ret, done = None, False

        for k in range(i + 1, min(j, i + dte) + 1):
            Tk = max((dte - (k - i)) / 365.0, 1 / 365.0)
            sk = max(rv[k] * vrp, 0.05) if rv[k] is not None else sigma
            val = bs(closes[k], Ks, Tk, sk, call=sc) - bs(closes[k], Kl, Tk, sk, call=sc)
            pnl = net_credit - val * (1 + spread_cost)
            if pnl >= credit * take_profit:
                ret, done = pnl / max_risk * 100, True
                break
            if pnl <= -credit * stop_mult:
                ret, done = pnl / max_risk * 100, True
                break

        if not done:
            Tk = max((dte - (j - i)) / 365.0, 1 / 365.0)
            sk = max(rv[j] * vrp, 0.05) if rv[j] is not None else sigma
            val = bs(closes[j], Ks, Tk, sk, call=sc) - bs(closes[j], Kl, Tk, sk, call=sc)
            ret = (net_credit - val * (1 + spread_cost)) / max_risk * 100
        out.append((t, ret))
    return out
