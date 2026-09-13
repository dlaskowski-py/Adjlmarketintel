"""
Real-chain options backtest validator.

The model prices contracts with Black-Scholes. This prices them with what the
market actually quoted: pick a real contract from the entry chain by delta,
track it forward by contractID, and close it at the real bid.

Why contractID matters - it is the only way to be sure the contract closed is
the contract opened. Re-selecting by strike and expiry at exit invites subtle
mismatches (adjusted contracts, weekly vs monthly with the same strike).

API cost is one call per symbol-date, so this is a VALIDATION tool, not a
search tool: run it on a modest set of trades to check whether a modelled
result survives contact with real quotes.

Fills are deliberately unkind: buy at ask, sell at bid, no midpoint credit.
"""
import sys, json, io, csv, datetime as dt
sys.path.insert(0, '/home/user/Adjlmarketintel/flow')
sys.path.insert(0, '/home/user/Adjlmarketintel/backtest')
from index_chains import build_index
from features import load_chain


def parse_chain(path):
    """contractID -> row, with numeric fields coerced and junk dropped."""
    out = {}
    for r in load_chain(path):
        try:
            bid, ask = float(r["bid"]), float(r["ask"])
            iv, dl = float(r["implied_volatility"]), float(r["delta"])
            oi, vol = float(r["open_interest"]), float(r["volume"])
        except (ValueError, KeyError):
            continue
        if bid <= 0 or ask <= 0 or ask < bid:
            continue
        out[r["contractID"]] = {
            "exp": r["expiration"], "strike": float(r["strike"]),
            "type": r["type"], "bid": bid, "ask": ask,
            "mark": (bid + ask) / 2, "iv": iv, "delta": dl,
            "oi": oi, "vol": vol, "date": r["date"],
        }
    return out


def pick_contract(chain, asof, want_call, target_delta,
                  dte_lo=30, dte_hi=60, min_oi=50, max_spread_pct=25.0):
    """
    Nearest to target delta among liquid contracts in the DTE window.

    The liquidity screen is not cosmetic: a 30-delta contract quoted 0.05/0.40
    is a 155%-of-mark spread that no one trades at. Including those makes any
    backtest a fiction.
    """
    d0 = dt.date.fromisoformat(asof)
    best, best_score = None, None
    for cid, c in chain.items():
        if (c["type"] == "call") != want_call:
            continue
        dte = (dt.date.fromisoformat(c["exp"]) - d0).days
        if not (dte_lo <= dte <= dte_hi):
            continue
        if c["oi"] < min_oi:
            continue
        sp = (c["ask"] - c["bid"]) / c["mark"] * 100
        if sp > max_spread_pct:
            continue
        score = abs(abs(c["delta"]) - target_delta)
        if best_score is None or score < best_score:
            best, best_score = (cid, c, dte, sp), score
    return best


def run_trade(sym, entry_date, exit_date, want_call, idx, target_delta=0.30):
    key_in, key_out = (sym, entry_date), (sym, exit_date)
    if key_in not in idx:
        return {"status": "no entry chain"}
    if key_out not in idx:
        return {"status": "no exit chain"}

    cin = parse_chain(idx[key_in])
    cout = parse_chain(idx[key_out])
    pick = pick_contract(cin, entry_date, want_call, target_delta)
    if not pick:
        return {"status": "no liquid contract"}
    cid, c, dte, sp_in = pick

    paid = c["ask"]                       # lift the offer
    if cid not in cout:
        # Contract vanished from the quoted chain - treat as unquotable rather
        # than inventing a price.
        return {"status": "contract not quoted at exit", "cid": cid}
    x = cout[cid]
    got = x["bid"]                        # hit the bid
    ret = (got - paid) / paid * 100
    return {
        "status": "ok", "cid": cid, "strike": c["strike"], "exp": c["exp"],
        "dte_in": dte, "delta_in": c["delta"], "iv_in": c["iv"],
        "paid": paid, "got": got, "ret": ret,
        "spread_in": sp_in, "spread_out": (x["ask"] - x["bid"]) / x["mark"] * 100,
        "oi": c["oi"],
    }


def needed_dates(pairs):
    """Report which (symbol, date) chains are missing before running."""
    idx = build_index()
    miss = set()
    for sym, d_in, d_out, _ in pairs:
        for d in (d_in, d_out):
            if (sym, d) not in idx:
                miss.add((sym, d))
    return sorted(miss)
