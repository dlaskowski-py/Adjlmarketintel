"""
Signal backtest engine for the MACD options strategy.

Mirrors strategies/macd_options_signal.pine exactly so the two are comparable.
Tests the SIGNAL on the underlying. Per-contract option returns are a separate
stage - this establishes whether directional edge exists at all.

Conventions chosen to avoid flattering the strategy:
  - Signals use the previous bar's close; fills happen at the signal bar close.
  - When stop and target are both touched inside one bar, the STOP is assumed
    to fill first. Intraday order is unknowable from daily bars, so take the
    pessimistic branch.
  - OHLC is back-adjusted by the adjusted-close factor, so splits and dividends
    do not create phantom gaps.
"""
import csv, math
from dataclasses import dataclass, field


# ----------------------------------------------------------------- indicators
def ema(xs, n):
    k, out, prev = 2.0 / (n + 1), [], None
    for x in xs:
        prev = x if prev is None else x * k + prev * (1 - k)
        out.append(prev)
    return out


def rma(xs, n):
    """Wilder smoothing, as used by Pine's ta.atr / ta.dmi."""
    out, prev = [], None
    for i, x in enumerate(xs):
        if prev is None:
            if i + 1 < n:
                out.append(None)
                continue
            prev = sum(xs[i + 1 - n:i + 1]) / n
        else:
            prev = (prev * (n - 1) + x) / n
        out.append(prev)
    return out


def sma(xs, n):
    out, run = [], 0.0
    for i, x in enumerate(xs):
        run += x
        if i >= n:
            run -= xs[i - n]
        out.append(run / n if i >= n - 1 else None)
    return out


def stdev(xs, n):
    out = []
    for i in range(len(xs)):
        if i < n - 1 or any(v is None for v in xs[i + 1 - n:i + 1]):
            out.append(None)
            continue
        w = xs[i + 1 - n:i + 1]
        m = sum(w) / n
        out.append(math.sqrt(sum((v - m) ** 2 for v in w) / n))
    return out


def percentrank(xs, n):
    """Pine ta.percentrank: pct of prior n values <= current."""
    out = []
    for i, x in enumerate(xs):
        if i < n or x is None:
            out.append(None)
            continue
        w = [v for v in xs[i - n:i] if v is not None]
        out.append(100.0 * sum(1 for v in w if v <= x) / len(w) if w else None)
    return out


def macd(close, f, s, sig):
    ef, es = ema(close, f), ema(close, s)
    line = [a - b for a, b in zip(ef, es)]
    return line, ema(line, sig)


def dmi_atr(high, low, close, n):
    tr, pdm, ndm = [], [], []
    for i in range(len(close)):
        if i == 0:
            tr.append(high[i] - low[i])
            pdm.append(0.0)
            ndm.append(0.0)
            continue
        pc = close[i - 1]
        tr.append(max(high[i] - low[i], abs(high[i] - pc), abs(low[i] - pc)))
        up, dn = high[i] - high[i - 1], low[i - 1] - low[i]
        pdm.append(up if up > dn and up > 0 else 0.0)
        ndm.append(dn if dn > up and dn > 0 else 0.0)

    atr_ = rma(tr, n)
    sp, sn = rma(pdm, n), rma(ndm, n)
    dx = []
    for a, p, m in zip(atr_, sp, sn):
        if a is None or p is None or m is None or a == 0:
            dx.append(None)
            continue
        pdi, ndi = 100 * p / a, 100 * m / a
        tot = pdi + ndi
        dx.append(100 * abs(pdi - ndi) / tot if tot else 0.0)

    valid = [v for v in dx if v is not None]
    adx_v = rma(valid, n)
    adx, k = [], 0
    for v in dx:
        if v is None:
            adx.append(None)
        else:
            adx.append(adx_v[k])
            k += 1
    return adx, atr_


# --------------------------------------------------------------------- config
@dataclass
class Config:
    fast: int = 12
    slow: int = 26
    sig: int = 9
    require_zero: bool = True
    use_trend: bool = True
    trend_len: int = 200
    use_adx: bool = True
    adx_len: int = 14
    adx_min: float = 20.0
    use_iv: bool = False
    iv_len: int = 252
    iv_buy_max: float = 50.0
    atr_len: int = 14
    stop_mult: float = 2.0
    target_r: float = 2.0
    max_bars: int = 20
    exit_on_cross: bool = True
    allow_long: bool = True
    allow_short: bool = True
    commission_pct: float = 0.03   # per side, percent
    slippage_pct: float = 0.02     # per side, percent


@dataclass
class Trade:
    direction: str
    entry_date: str
    entry: float
    exit_date: str = ""
    exit: float = 0.0
    reason: str = ""
    bars: int = 0
    ret_pct: float = 0.0
    mfe_pct: float = 0.0   # best excursion, for option-overlay sizing later


def load(path):
    rows = list(csv.DictReader(open(path)))
    o, h, l, c, d = [], [], [], [], []
    for r in rows:
        cl, ac = float(r["close"]), float(r["adj_close"])
        f = ac / cl if cl else 1.0          # back-adjust OHLC consistently
        o.append(float(r["open"]) * f)
        h.append(float(r["high"]) * f)
        l.append(float(r["low"]) * f)
        c.append(ac)
        d.append(r["date"])
    return d, o, h, l, c


def run(dates, o, h, l, c, cfg: Config, start=None, end=None):
    n = len(c)
    macd_l, sig_l = macd(c, cfg.fast, cfg.slow, cfg.sig)
    trend = sma(c, cfg.trend_len)
    adx, atr = dmi_atr(h, l, c, cfg.adx_len)

    logret = [None] + [math.log(c[i] / c[i - 1]) for i in range(1, n)]
    rv = [None if v is None else v * math.sqrt(252) * 100
          for v in stdev([x for x in logret], 20)]
    ivr = percentrank(rv, cfg.iv_len)

    trades, pos, entry_px, entry_i, risk = [], None, 0.0, 0, 0.0
    cost = (cfg.commission_pct + cfg.slippage_pct) / 100.0

    for i in range(1, n):
        if start and dates[i] < start:
            continue
        if end and dates[i] > end:
            break
        if None in (trend[i], adx[i], atr[i]) or atr[i] is None:
            continue

        x_up = macd_l[i] > sig_l[i] and macd_l[i - 1] <= sig_l[i - 1]
        x_dn = macd_l[i] < sig_l[i] and macd_l[i - 1] >= sig_l[i - 1]

        # ---- manage open position first (exits precede same-bar entries)
        if pos:
            hit, px, why = False, 0.0, ""
            if pos == "long":
                stop, tgt = entry_px - risk, entry_px + risk * cfg.target_r
                if l[i] <= stop:                      # stop assumed first
                    hit, px, why = True, stop, "stop"
                elif h[i] >= tgt:
                    hit, px, why = True, tgt, "target"
            else:
                stop, tgt = entry_px + risk, entry_px - risk * cfg.target_r
                if h[i] >= stop:
                    hit, px, why = True, stop, "stop"
                elif l[i] <= tgt:
                    hit, px, why = True, tgt, "target"

            if not hit and (i - entry_i) >= cfg.max_bars:
                hit, px, why = True, c[i], "time"
            if not hit and cfg.exit_on_cross and (
                    (pos == "long" and x_dn) or (pos == "short" and x_up)):
                hit, px, why = True, c[i], "opp_cross"

            if hit:
                t = trades[-1]
                t.exit_date, t.exit, t.reason, t.bars = dates[i], px, why, i - entry_i
                gross = (px / entry_px - 1) if pos == "long" else (entry_px / px - 1)
                t.ret_pct = (gross - 2 * cost) * 100
                seg_h = max(h[entry_i + 1:i + 1]) if i > entry_i else h[i]
                seg_l = min(l[entry_i + 1:i + 1]) if i > entry_i else l[i]
                t.mfe_pct = ((seg_h / entry_px - 1) if pos == "long"
                             else (entry_px / seg_l - 1)) * 100
                pos = None

        # ---- entries
        if pos is None:
            zl = (not cfg.require_zero) or macd_l[i] > 0
            zs = (not cfg.require_zero) or macd_l[i] < 0
            tl = (not cfg.use_trend) or c[i] > trend[i]
            ts = (not cfg.use_trend) or c[i] < trend[i]
            ax = (not cfg.use_adx) or adx[i] > cfg.adx_min
            iv = (not cfg.use_iv) or ivr[i] is None or ivr[i] <= cfg.iv_buy_max

            if cfg.allow_long and x_up and zl and tl and ax and iv:
                pos, entry_px, entry_i = "long", c[i], i
                risk = atr[i] * cfg.stop_mult
                trades.append(Trade("long", dates[i], entry_px))
            elif cfg.allow_short and x_dn and zs and ts and ax and iv:
                pos, entry_px, entry_i = "short", c[i], i
                risk = atr[i] * cfg.stop_mult
                trades.append(Trade("short", dates[i], entry_px))

    if trades and not trades[-1].exit_date:
        trades.pop()
    return trades


def stats(trades):
    if not trades:
        return {"trades": 0}
    rets = [t.ret_pct for t in trades]
    wins = [r for r in rets if r > 0]
    loss = [r for r in rets if r <= 0]
    gp, gl = sum(wins), abs(sum(loss))

    eq, peak, dd = 100.0, 100.0, 0.0
    for r in rets:
        eq *= (1 + r / 100)
        peak = max(peak, eq)
        dd = max(dd, (peak - eq) / peak * 100)

    mean = sum(rets) / len(rets)
    sd = math.sqrt(sum((r - mean) ** 2 for r in rets) / len(rets)) if len(rets) > 1 else 0.0
    return {
        "trades": len(trades),
        "win_rate": 100.0 * len(wins) / len(rets),
        "profit_factor": (gp / gl) if gl else float("inf"),
        "expectancy": mean,
        "avg_win": (sum(wins) / len(wins)) if wins else 0.0,
        "avg_loss": (sum(loss) / len(loss)) if loss else 0.0,
        "max_dd": dd,
        "total_return": eq - 100.0,
        "sharpe_per_trade": (mean / sd) if sd else 0.0,
        "avg_bars": sum(t.bars for t in trades) / len(trades),
        "avg_mfe": sum(t.mfe_pct for t in trades) / len(trades),
    }


def show(label, s):
    if s["trades"] == 0:
        print(f"{label:<26} no trades")
        return
    print(f"{label:<26} n={s['trades']:>4}  WR={s['win_rate']:>5.1f}%  "
          f"PF={s['profit_factor']:>5.2f}  E={s['expectancy']:>6.2f}%  "
          f"W/L={s['avg_win']:>5.2f}/{s['avg_loss']:>6.2f}  "
          f"DD={s['max_dd']:>5.1f}%  bars={s['avg_bars']:>4.1f}")
