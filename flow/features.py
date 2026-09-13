"""
Options-flow features extracted from real Alpha Vantage chains.

One chain snapshot per symbol-date yields several independent views of
positioning:

  pc_vol      put volume / call volume          - today's directional flow
  pc_oi       put OI / call OI                  - accumulated positioning
  vol_oi      total volume / total OI           - NEW positioning vs held
  skew25      25-delta put IV - 25-delta call IV- the best-documented
                                                  predictive flow signal
  net_prem    (call $ - put $) / total $        - dollar-weighted direction
  atm_iv      30-delta average IV               - vol level for sizing

Liquidity filter: contracts with zero bid or nonsensical IV are dropped.
Dollar flow uses mark, not last, because last can be stale by hours.
"""
import json, io, csv, math, datetime as dt, statistics


def load_chain(path):
    return list(csv.DictReader(io.StringIO(json.load(open(path))["result"])))


def features(path, asof, dte_lo=20, dte_hi=70):
    rows = load_chain(path)
    d0 = dt.date.fromisoformat(asof)
    calls, puts = [], []
    for r in rows:
        try:
            dte = (dt.date.fromisoformat(r["expiration"]) - d0).days
            if not (dte_lo <= dte <= dte_hi):
                continue
            bid, ask = float(r["bid"]), float(r["ask"])
            iv, dl = float(r["implied_volatility"]), float(r["delta"])
            vol, oi = float(r["volume"]), float(r["open_interest"])
        except (ValueError, KeyError):
            continue
        if bid <= 0 or ask <= 0 or iv <= 0.01 or iv > 5:
            continue
        rec = {"iv": iv, "d": abs(dl), "vol": vol, "oi": oi,
               "mark": (bid + ask) / 2, "dte": dte}
        (calls if r["type"] == "call" else puts).append(rec)

    if len(calls) < 5 or len(puts) < 5:
        return None

    cv, pv = sum(x["vol"] for x in calls), sum(x["vol"] for x in puts)
    co, po = sum(x["oi"] for x in calls), sum(x["oi"] for x in puts)
    cd = sum(x["vol"] * x["mark"] for x in calls)
    pd_ = sum(x["vol"] * x["mark"] for x in puts)

    def iv_at(side, target):
        """IV of the contract closest to a target delta."""
        best = min(side, key=lambda x: abs(x["d"] - target))
        return best["iv"] if abs(best["d"] - target) < 0.12 else None

    p25, c25 = iv_at(puts, 0.25), iv_at(calls, 0.25)
    atm = [x["iv"] for x in calls + puts if 0.4 <= x["d"] <= 0.6]

    return {
        "pc_vol":   pv / cv if cv > 0 else None,
        "pc_oi":    po / co if co > 0 else None,
        "vol_oi":   (cv + pv) / (co + po) if (co + po) > 0 else None,
        "skew25":   (p25 - c25) if (p25 and c25) else None,
        "net_prem": (cd - pd_) / (cd + pd_) if (cd + pd_) > 0 else None,
        "atm_iv":   statistics.median(atm) if atm else None,
        "n_contracts": len(calls) + len(puts),
        "tot_vol":  cv + pv,
    }
