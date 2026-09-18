# Options-flow study — findings

## Method

Cross-sectional, market-neutral. On each date the universe is ranked by a flow
feature and the return of a long-short spread (top tercile minus bottom) is
measured over the next 21 trading days. Because each date is long and short in
equal measure, market drift cancels — the confound that made every earlier
directional test look profitable cannot operate here.

Features are computed from real Alpha Vantage option chains (20-70 DTE,
liquidity-filtered): put/call volume, put/call open interest, volume-to-open-
interest, 25-delta IV skew, net premium flow, and ATM IV.

Universe: AAPL MSFT NVDA INTC CSCO JPM XOM PFE.

## Result: nothing replicated

In-sample (6 dates, 2023-01 to 2024-03), `vol_oi` looked strong — mean IC
+0.512, t=3.72, 100% hit rate, +12.6% long-short spread. It survived
leave-one-symbol-out (dropping NVDA raised IC to +0.518) and survived
symbol-demeaning (IC +0.313, t=4.45), which suggested time-varying information
rather than a static sector tilt.

Out-of-sample (3 dates, 2024-06 to 2024-12), it **inverted**:

| feature  | IS IC  | IS t | OOS IC | OOS t | verdict          |
|----------|--------|------|--------|-------|------------------|
| vol_oi   | +0.512 | 3.72 | -0.274 | -1.11 | SIGN FLIP        |
| net_prem | +0.202 | 1.12 | -0.246 | -0.91 | SIGN FLIP        |
| pc_vol   | -0.016 |-0.09 | +0.063 | +0.20 | SIGN FLIP        |
| skew25   | -0.011 |-0.10 | -0.131 | -1.12 | not significant  |
| pc_oi    | -0.028 |-0.19 | -0.071 | -0.33 | not significant  |
| atm_iv   | +0.088 | 0.48 | +0.283 | +1.76 | not significant  |

No feature held. The strongest in-sample result reversed sign with a 0%
out-of-sample hit rate.

Three out-of-sample dates cannot prove a signal is absent. But the burden of
proof runs the other way, and nothing here meets it.

## The deeper limitation

End-of-day chain snapshots are not options flow. They cannot distinguish:

- opening trades from closing trades,
- buyer-initiated from seller-initiated volume,
- sweeps and blocks from ordinary two-sided activity,
- dealer hedging from directional speculation.

Those distinctions are what "options flow" means in practice, and they require
intraday time-and-sales with trade-side classification. No amount of analysis
recovers them from a daily snapshot.

## McClellan Oscillator — the one signal that beat blind

Breadth is external information rather than another transform of the same
instrument's price, which is why it behaves unlike the seven signals before it.

Built from a 25-name large-cap breadth proxy (Alpha Vantage has no breadth
feed), ratio-adjusted, EMA19 minus EMA39.

**Oversold breadth (below -50), long 30-delta calls, 20-bar hold:**

| | n | win rate | PF | expectancy |
|---|---|---|---|---|
| blind control | 7576 | 42.2% | 1.70 | +27.1% |
| McClellan < -50 | 995 | 47.4% | **2.47** | **+51.3%** |

t = 3.67 against blind. It survived every attempt to break it:

- **Not a calibration artifact** — the gap held at +0.61 to +1.00 PF across
  four different IV assumptions, including flat ones.
- **Not clustered** — 1020 entries across 77 distinct months; the eight most
  concentrated months account for only 21%.

### The catch

It is directional dip-buying, not a volatility edge. The identical condition
buying PUTS runs PF 0.58 — a two-sided volatility signal would profit on both
legs, and this does not.

And it has stopped working:

| era | blind PF | oversold PF |
|-----|----------|-------------|
| 2000-2008 | 1.23 | 1.39 |
| 2009-2015 | 1.74 | 4.85 |
| 2016-2021 | 2.33 | 4.46 |
| 2022-2026 | 1.70 | **0.85** |

The 2022-2026 underperformance is real, not small-sample noise: t = -3.23.

Its strongest years were the most relentless dip-buying regime in market
history. The historical numbers describe a regime that appears to have ended.
