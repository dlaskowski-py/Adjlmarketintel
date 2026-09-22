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

### Why it stopped working

It did not break in 2022. The edge has been decaying for twenty years and
2022 is simply where it crossed below the cost of trading it.

**Bounce edge** — the underlying's 20-day return after oversold breadth, minus
the return on all days:

| era | bounce edge |
|-----|-------------|
| 2000-2008 | +0.89pp |
| 2009-2015 | +0.82pp |
| 2016-2021 | +0.29pp |
| 2022-2026 | +0.10pp |

Option costs — spread, theta, variance risk premium — are roughly constant.
The bounce itself still exists at +0.10pp; it is simply no longer large enough
to pay for them. The McClellan Oscillator has been published since 1969, and
this is what the life cycle of a widely known signal looks like.

**Regime change made it worse.** Oversold entries split by whether price was
above or below its 200-day average:

| era | above 200MA | below 200MA |
|-----|-------------|-------------|
| 2009-2015 | PF 6.44 | PF 3.77 |
| 2016-2021 | PF 4.17 | PF 5.32 |
| 2022-2026 | PF 1.32 | **PF 0.55, -27.4%** |

Through 2021, oversold breadth in a downtrend still paid - dips recovered
regardless. From 2022 it stopped. A mean-reversion bet needs an uptrend to
revert into.

**Breadth decoupled from returns.** The mega-cap minus everything-else gap on
oversold days widened from +0.65pp to +1.04pp. Breadth measures the median
stock, and index returns increasingly came from a handful of names.

### The obvious fix does not work

Adding the 200MA trend filter raises full-sample profit factor from 2.47 to
2.83 — but in 2022-2026 it still returns PF 1.32 against blind entry's 1.70,
with t = -1.01 against blind. The full-sample improvement comes entirely from
the eras that already worked.

Improving a historical number while failing to restore the recent edge is the
signature of fitting to the good years, not of finding a fix.

### Correction: the McClellan result does not survive correct statistics

The significance reported above (t = 3.67 against blind, and t = -3.23 for the
2022-2026 decline) counted each stock-day as an independent observation. It is
not. When breadth is oversold, all 25 names enter on the SAME day and move
together — that is one observation, not 25.

Collapsing consecutive oversold days into episodes and measuring the
equal-weight basket gives 223 independent episodes over 26 years, not ~1030
stock-days. At that level:

| era | episodes | edge | t | verdict |
|-----|----------|------|---|---------|
| 2000-2008 | 78 | +0.28pp | 0.49 | not significant |
| 2009-2015 | 63 | +0.37pp | 0.55 | not significant |
| 2016-2021 | 48 | -0.25pp | -0.27 | not significant |
| 2022-2026 | 34 | -0.14pp | -0.18 | not significant |
| **FULL** | **223** | **+0.11pp** | **0.31** | **not significant** |

Nothing is significant, in any era, including the full sample.

Two conclusions change:

1. The McClellan oscillator did NOT beat blind entry. The apparent PF 2.47
   versus 1.70 was cross-sectional correlation being counted as sample size.
2. The "it worked and then decayed" narrative is also unsupported. Those era
   differences are noise around zero.

Note the direction of the remaining uncertainty: 223 high-variance episodes
give low power. This says the data cannot distinguish the effect from zero,
not that the effect is provably zero. But the burden of proof is on the
signal, and it is not met.

This same clustering inflated every cross-sectional t-statistic in this
document. Treat the flow-study figures with the same scepticism.

## Volume shelves (volume profile)

Volume-at-price is a different transform from the price-over-time indicators -
it uses where volume traded, not just what price did. Built from daily bars by
distributing each bar's volume uniformly across its high-low range (a coarser
view than a tick-based profile tool).

Long 30-delta call, 20-bar hold, 20-bar minimum spacing, calibrated pricing:

| signal | n | WR | PF | E | vs blind | t | names beaten |
|--------|---|----|----|---|----------|---|--------------|
| VA breakout | 545 | 40.0% | 1.36 | +14.6% | -9.85pp | -1.37 | 4/12 |
| POC retest | 761 | 40.2% | 1.46 | +18.9% | -5.49pp | -0.86 | 3/12 |
| LVN (thin node) | 1647 | 40.9% | 1.69 | +27.1% | +2.69pp | 0.51 | 7/12 |
| ON shelf (HVN) | 1078 | 41.7% | 1.69 | +27.5% | +3.07pp | 0.47 | 9/12 |
| BLIND control | 3746 | 39.5% | 1.60 | +24.4% | — | — | — |

Nothing significant. The two textbook volume-profile trades - breaking out of
the value area, and retesting the point of control - both did WORSE than blind
entry.

**The diagnostic that settles it:** "price in a thin node" and "price on a
heavy shelf" are mutually exclusive conditions, and both returned PF 1.69.
When opposite conditions produce identical results, the feature separating
them carries no information. Both rows are just blind entry with extra steps.

## Short side: death cross and 50MA systems

The short side is a cleaner test of whether a signal carries information. On
the long side, drift does the work, which is why nothing beat blind entry
there. Shorting has no tailwind, so any edge must come from the signal.

**Does a death cross start a multi-day downtrend?** No.

| | fwd20 | max drawdown | % down days | longest down run |
|---|-------|--------------|-------------|------------------|
| after death cross | +0.97% | -7.87% | 48.1% | 3.30 bars |
| after any day | +1.37% | -7.34% | 47.9% | 3.44 bars |

Price ROSE after a death cross. Down-day share matched baseline, and the
longest consecutive down run was SHORTER than after an ordinary day. t = -0.83
against baseline, and unlike the breadth study this one is not clustered —
445 crosses across 199 distinct months, the five densest months holding 8%.

**Shorting on these signals, underlying, 20-day hold, 5bp cost:**

| signal | n | WR | PF | expectancy |
|--------|---|----|----|------------|
| Death cross | 442 | 43.0% | 0.76 | -1.00% |
| Price < 50MA | 2924 | 43.3% | 0.70 | -1.21% |
| Stacked bearish | 1869 | 41.8% | 0.65 | -1.88% |
| ADX>25 + below 50 | 1728 | 40.0% | 0.60 | -1.95% |
| BLIND short | 7762 | 41.7% | 0.65 | -1.42% |

Every one loses, and none beats blind shorting. The ordering is the
interesting part: expectancy falls monotonically as bearish confirmation is
stacked on. Requiring price below the 50, the 50 below the 200, the 50 sloping
down and ADX above 25 produced the WORST result of the five.

As long puts the same signals run PF 0.86 to 0.95, all negative, none beating
a blind put.

## The 50/200 cross tested as a regime filter, not an event

Testing the golden/death cross as a 20-day event signal tests it wrongly. It
is a long-horizon regime tool, and its documented value is drawdown control
rather than return.

**As an event it is worthless in both directions** — both crosses underperform
baseline at every horizon:

| horizon | after golden | after death | baseline |
|---------|--------------|-------------|----------|
| 20 bars | +0.52% | +0.96% | +1.37% |
| 60 bars | +3.21% | +4.38% | +4.17% |
| 120 bars | +6.63% | +6.66% | +8.55% |
| 250 bars | +15.47% | +14.39% | +19.17% |

At 20 and 60 bars the DEATH cross outperformed the GOLDEN cross. The bullish
event did worse than the bearish one.

**As a regime it predicts volatility, not direction:**

| state | annualised return | daily vol |
|-------|-------------------|-----------|
| 50 above 200 | +18.4%/yr | 1.94% |
| 50 below 200 | +21.9%/yr | 2.80% |

Returns below the 200 were HIGHER, not lower (t = -0.88, not significant).
Volatility below it was 1.45x higher. That is the actual content of the
signal.

**Which makes it a risk tool, and as a risk tool it works:**

| strategy | CAGR | max DD | exposure | growth | CAGR/DD |
|----------|------|--------|----------|--------|---------|
| Buy & hold | 16.53% | 49.3% | 100% | 52.0x | 0.34 |
| Long only while 50 > 200 | 10.39% | 25.7% | 65% | 12.9x | **0.40** |
| Long above / short below | 2.84% | 40.1% | 48% | 2.1x | 0.07 |

The filter costs 6 points of CAGR and halves the drawdown, improving return
per unit of drawdown from 0.34 to 0.40. That is a real if modest improvement,
and it is the first classic technical tool in this document to improve
anything on a risk-adjusted basis.

Shorting below the 200 destroys it: 2.84% CAGR. The short leg is where the
money goes, consistent with every other short test here.

### The regime filter does not survive on single tickers

The basket result (CAGR/DD 0.34 -> 0.40) does not carry to individual names.
Running the identical filter on 12 large caps separately, it improved CAGR/DD
on only **4 of 12**:

| helped | hurt |
|--------|------|
| NVDA 0.33 → 0.41 | MSFT 0.22 → 0.10 |
| CSCO 0.05 → 0.15 | WMT 0.25 → 0.06 |
| INTC 0.05 → 0.08 | KO 0.17 → 0.07 |
| AAPL 0.34 → 0.35 | IBM 0.10 → -0.02 |

The filter works by side-stepping market-wide drawdowns that hit every name
simultaneously. A single stock's worst drawdowns are usually idiosyncratic and
are not preceded by a regime change. On one ticker the cross also whipsaws —
25 to 50 switches per name over the sample, each paying the spread.

This matches the trend-following literature: the approach works on
diversified portfolios of many markets, not on concentrated single positions.
Applied to one ticker it is more likely to hurt than help.

### Which individual stocks the filter helps, and why it still is not worth it

Across all 25 names the filter improved return-per-drawdown on **9 of 25**
(36%). What separates the two groups is drawdown severity:

| | helped | hurt | gap |
|---|--------|------|-----|
| mean buy-&-hold drawdown | 83.0% | 62.1% | +20.9 |
| mean daily volatility | 2.66% | 1.95% | +0.71 |
| mean regime switches | 31.3 | 39.1 | -7.8 |

Correlation between a name's buy-and-hold drawdown and how much the filter
helps it: **+0.68**. Volatility +0.43. Switch count **-0.31** — more whipsaw,
worse outcome.

Splitting at the median 70% drawdown:

| group | helped | mean change in CAGR/DD |
|-------|--------|------------------------|
| drawdown above 70% | 7/12 | **-0.008** |
| drawdown below 70% | 2/13 | **-0.078** |

So the honest reading is not "use it on volatile names". On the high-drawdown
half it is a coin flip that averages to **zero**. On the stable half it is
reliably harmful. The correlation predicts where the filter is *less bad*,
and less bad is not good.

The mechanism explains it. The filter pays whipsaw costs continuously and is
reimbursed only by avoiding one catastrophic decline. A stock without such a
decline (KO, PG, WMT, V) pays the costs and receives nothing — V lost the most
in ratio terms (0.59 to 0.46) on only 17 switches, purely because it never had
a drawdown worth dodging. And many single-stock collapses arrive as an
overnight gap on earnings, which a 50/200 cross cannot step in front of.

## Overnight return anomaly — 59 names, 392,782 stock-days

Buy at the close, sell at the next open. Prices back-adjusted so dividends and
splits are handled correctly across the gap.

**The effect is real and large:**

| session | mean/day | annualised | % positive | daily vol |
|---------|----------|------------|------------|-----------|
| overnight (close→open) | +0.0488% | **+13.1%** | 52.2% | 1.28% |
| intraday (open→close) | +0.0147% | +3.8% | 50.1% | 1.83% |
| full day (close→close) | +0.0629% | +17.2% | 51.1% | 2.21% |

Overnight minus intraday: +0.0342%/day, **t = 9.60**, holding on 38 of 59
names. This is by far the strongest statistical result in this document, and
it matches the published literature (Cooper/Cliff/Gulen 2008 and after).

**It is also not tradeable, for a reason that has nothing to do with costs.**

Overnight-only earns +13.1%/yr. Buy and hold earns +17.2%/yr. Buy and hold
wins by **4.1 points before a single commission**, because sitting out the day
session also forfeits its +3.8%/yr. The strategy is a way to earn LESS while
trading 504 times a year.

Costs then finish it. Breakeven is 4.88 bps per round trip, 2.44 bps per side:

| cost per side | net annual | vs buy & hold |
|---------------|------------|---------------|
| 0.0 bps | +13.1% | -4.1pp |
| 1.0 bps | +7.5% | -9.6pp |
| 2.0 bps | +2.2% | -14.9pp |
| 3.0 bps | -2.8% | -19.9pp |

And it has vanished in the current era:

| era | overnight | intraday | spread | t |
|-----|-----------|----------|--------|---|
| 1999-2007 | +0.0560% | -0.0013% | +0.0573 | 7.74 |
| 2008-2015 | +0.0408% | +0.0174% | +0.0234 | 3.54 |
| 2016-2021 | +0.0655% | +0.0198% | +0.0457 | 7.18 |
| 2022-2026 | +0.0291% | +0.0298% | **-0.0007** | **-0.09** |

### What it is actually good for

Return per unit of volatility: overnight 0.0381, intraday 0.0080. The day
session carries 1.4x the volatility for a quarter of the return.

That is an EXECUTION insight, not a strategy. If you are buying anyway, buy at
the close rather than the open. It changes WHEN you transact rather than HOW
OFTEN, costs nothing extra, and is therefore the one form in which this
finding survives contact with reality.

## BTC trend regime — the one filter that improves return AND drawdown

Same 50/200-style filter that merely reduced risk on equities, applied to
BTC/USD from 2014 (12.7 years, 10bp per switch):

| strategy | CAGR | max DD | CAGR/DD | exposure | switches |
|----------|------|--------|---------|----------|----------|
| Buy & hold | 44.3% | 83.3% | 0.53 | 100% | 0 |
| 20/100 MA | 49.1% | 68.9% | 0.71 | 55% | 49 |
| **30/150 MA** | **53.9%** | **67.8%** | **0.80** | 57% | 25 |
| 50/200 MA | 45.5% | 74.3% | 0.61 | 58% | 22 |

On equities the filter cost six points of CAGR to halve drawdown. Here it
raises CAGR and cuts drawdown together, because BTC's declines are severe
enough that avoiding them more than pays for the upside forgone.

**Robustness, not the best cell.** Across a 6x6 grid of fast and slow lengths,
**all 32 valid cells beat buy-and-hold** — median 0.71, worst 0.57, best 0.95.
A whole surface that works is a property of the asset; one strong cell would
be noise. The shipped default (30/150) is central in the surface rather than
its maximum.

**It survived every attack:**

- **Costs** — still +0.16 over buy-and-hold at 200bp per switch, because it
  only switches about twice a year.
- **Single-event dependence** — dropping the worst crash entirely (2017-12 to
  2018-12, -83%) still leaves it ahead, 0.98 against 0.89.
- **Cycle by cycle** — won all three bear markets, lost two bulls:

| cycle | buy & hold | filtered |
|-------|-----------|----------|
| 2014-15 bear | -25.3% | **+6.1%** |
| 2016-17 bull | +469.6% | +469.6% |
| 2018-19 bear | -28.4% | **+15.5%** |
| 2020-21 bull | +153.2% | +50.9% |
| 2022 bear | -64.3% | **0.0%** (flat all year) |
| 2023-26 | +53.6% | +18.2% |

That is insurance, not prediction. It pays premium in rallies and collects in
crashes, converting -25%, -28% and -64% into +6%, +15% and 0%.

### What this cannot establish

One asset, roughly five independent cycles. BTC also survived — testing a
filter on the crypto that went from five cents to eighty thousand dollars says
nothing about the ones that went to zero, and the buy-and-hold benchmark is
itself flattered by that survival. One strong case, not a law.

## TDPS v2 — independent replication (first signal to beat its blind control)

Re-implemented "Trend Pullback Swing v2 [QuantPad]" from its Pine source and ran
it on the 59-name daily set. Script: `backtest/tdps_replication.py`.

Entry: 50MA>200MA and close>200MA and RSI(2)<15. Exits as in the Pine: 3-ATR
stop, 70% scale when close crosses back above the 10MA, stop to breakeven on the
remainder, 3-ATR chandelier trail, trend break below the 200MA, 15/40-bar caps.
Costs 0.05%/side plus 5 ticks, fills at the NEXT OPEN.

| | per position | win | PF |
|---|---|---|---|
| TDPS, 2023-2026 | **+0.473%** | 63.1% | 1.35 |
| TDPS, full history | +0.200% | 61.9% | 1.15 |
| control A: trend only, no RSI | +0.067% / -0.074% | 54.9% | 1.06 / 0.94 |
| control B: RSI<15, no trend | +0.186% / -0.059% | 53.9% | 1.17 / 0.96 |
| control C: trend + RSI<50 | +0.083% / -0.004% | 56.9% | 1.07 / 1.00 |

Author's own holdout (110 names, never used for selection) reported 59.6% win,
+0.605% expectancy, PF 1.35. The PF matches exactly and win rate is within 3.5pp,
on a universe and an implementation that had nothing to do with his.

**Neither leg works alone.** Trend-only and RSI-only are both negative over the
full history; together they are positive. Depth matters monotonically — RSI<50
is flat, RSI<15 is not. This is an interaction, not a single fitted parameter,
which is why it does not collapse the way the 12 signals in the sections above did.

**Cluster-adjusted.** Entries cluster on market-wide down days (up to 23 names
on one date), the same trap that voided the McClellan result. Adjusting:

    full history   stock-day t=4.63 -> by-date t=2.22
    2023-2026      stock-day t=3.63 -> by-date t=2.62
    paired same-date difference vs control A: +0.138pp t=2.25 (full),
                                              +0.422pp t=2.55 (2023-2026)

The paired test is the strongest form available here: it compares TDPS against
the blind control *on the same dates*, so market-wide moves cancel. It survives.
Significant, but at t~2.2-2.6 rather than the t=4.6 the naive count suggests.

**Fills are not the vulnerability.** `process_orders_on_close` decides and fills
on the same close, which normally flatters a buy-the-dip entry. Moving the fill
to the next open *helped* in 2023-2026 (+0.334% -> +0.473%) and cost 0.013pp over
the full history. The overnight drift documented above works in this entry's favour.

**Leg vs position accounting.** The 70% scale-out is a separate closed trade in
TradingView, so the Strategy Tester's figures are leg-level: +0.97% expectancy
and 48.4% win against +0.21% and 62.9% per position. Do not reconcile a pooled
position-level backtest against the Strategy Tester panel — they count different
things, and the leg-level expectancy is ~4.6x the position-level one.

## TDPS v2 — what improves it

Swept each input independently on the 59-name set, next-open fills, realistic
costs. Script: `backtest/tdps_sweeps.py`. t is always clustered by entry date.

**The scale-out percentage is the dominant lever, and it is set backwards.**
Sweeping it alone over the full history, holding everything else fixed:

| scale | win | expectancy | PF |
|---|---|---|---|
| 0% | 49.0% | +0.409% | 1.19 |
| 30% | 52.2% | +0.368% | 1.27 |
| 50% | 58.9% | +0.284% | 1.21 |
| **70% (shipped)** | **61.9%** | **+0.200%** | **1.15** |
| 100% | 64.0% | +0.073% | 1.06 |

Win rate rises monotonically and expectancy falls monotonically across the whole
range, in both eras. Same entries, same exits — the only thing changing is how
much is booked at the snapback. The script's own tooltip says 70% was chosen to
"maximise win rate subject to PF >= 1.3", which is an explicit purchase of the
one statistic that does not pay, at roughly 0.022pp of expectancy per point of
win rate.

**The initial stop is too tight.** 3.0 ATR sits on the rising part of the curve;
expectancy improves monotonically to ~4.5-5.0 ATR and only turns over at 8.0, so
a stop is doing real work — it is just set inside the noise.

    full history   3.0 -> +0.200% t=2.22 | 4.5 -> ~+0.25% | 5.0 -> +0.256% t=3.50 | 8.0 -> +0.253%
    2023-2026      3.0 -> +0.473%        | 5.0 -> +0.518%                          | 8.0 -> +0.474%

**Chandelier trail** improves mildly from 3.0 to 4.0-6.0 ATR in both eras.
**RSI(2)<15 and the 15/40 bar caps are already on plateaus** — leave them.

**Breakeven stop** costs expectancy over the full history (+0.332% off vs
+0.200% on) but buys ~7pp of win rate; the tooltip's claim of "no statistically
detectable cost" does not hold on this sample. Worth keeping anyway once the
scale is cut to 30%, where it produces the best profit factor of anything tested.

### Recommended configuration (scale 30%, stop 4.5 ATR, trail 4.0 ATR, breakeven on)

| | shipped | recommended |
|---|---|---|
| full history | +0.200%, 61.9% win, PF 1.15, t=2.22 | **+0.452%, 52.1% win, PF 1.35, t=4.79** |
| 2023-2026 | +0.473%, 63.1% win, PF 1.35, t=2.62 | **+0.868%, 57.0% win, PF 1.62, t=2.76** |

Aggregate profit over the full history rises 2.1x (9470 x 0.200 -> 8895 x 0.452).
A 36-cell grid (scale 20/30/40, stop 3.5-5.0, trail 3.0-5.0) beat the shipped
config in **36/36 cells in both eras**, so this is a plateau, not a fitted point.
Per symbol it is better on **44 of 59 names**, median +0.184pp — but the mean
gain exceeds the median, so it is weighted toward high-ATR names (MU +2.10pp,
TSLA +1.68pp, NVDA +1.13pp) where the wider stop matters most.

The cost is 10pp of win rate over the full history, 6pp recent.

### Tested and NOT adopted

- **Market regime filter** (require SPY 50>200 on the entry date): helps the full
  history (+0.452% -> +0.506%) but hurts 2023-2026 (+0.868% -> +0.828%), and only
  removes 12% of entries. The per-stock trend filter already does this job.
- **Signal clustering** (how many of the 59 names fire the same day): the 4-7
  bucket is best in both eras (full +0.640% t=4.59; recent +1.282% PF 2.06), but
  the 1-name and 8+ buckets are both worse, and the 2-3 bucket reverses ordering
  between eras. A non-monotone hump across arbitrary buckets is the shape a
  spurious result takes. Not established — would need a continuous test.

## TDPS — per-trade expectancy is not return

Placing every trade on a calendar and making positions compete for capital
(`backtest/tdps_portfolio.py`, 1/slots of equity each, skip when full, random
tie-breaking across 20 seeds, full history):

| config | 5 slots | 10 | 20 | 40 | maxDD @20 | deployed |
|---|---|---|---|---|---|---|
| shipped 70/3.0/3.0/BE | -1.12% | +0.91% | **+2.36%** | +1.80% | 18.0% | 79% |
| v3 30/4.5/4.0/BE | +3.04% | +4.57% | **+5.62%** | +3.85% | 23.1% | 79% |
| 0% scale, 12 ATR, hold 250 | **+18.33%** | +13.95% | +12.86% | +10.06% | 32.4% | 86% |
| SPY buy and hold | — | — | **+8.34%** | — | 55.2% | 100% |

**The v3 improvement is real: 2.36% -> 5.62% CAGR, and the drawdown stays near
20%. But both are below SPY buy-and-hold over the same window.** The capital is
deployed 79% of the time, so this is not an idle-cash artifact. Per unit of
drawdown TDPS is the better vehicle (v3 0.24 return/DD against SPY's 0.15), and
it would need roughly 1.5x leverage to match SPY outright.

**Raising per-trade expectancy past ~1% requires abandoning the swing horizon.**
Sweeping toward higher expectancy on the full history:

    30/4.5/4.0 no BE     exp +0.814%   hold 15/40    win 44.2%
    0/8.0/8.0 hold 120   exp +3.207%   hold 120      win 35.2%
    0/12/12  hold 250    exp +5.116%   hold 250      win 32.4%

The 2-3%-per-trade configurations are the only ones that beat SPY (12.9-18.3%
CAGR), and they are no longer TDPS: no scale-out, a 12-ATR stop, and positions
held up to a year. That is "buy pullbacks in an uptrend and hold", which is the
same time-in-market conclusion every other positive result in this file reached.

Expectancy, aggregate trade profit and CAGR are three different numbers. The
earlier "2.1x aggregate profit" figure for v3 is a sum of trade returns, not a
return; the CAGR improvement is 2.36% -> 5.62%.

## Universe: funds removed, small caps added — and they do not work

**Funds.** The only fund ever in `data/` was SPY, and every backtest in this file
already excluded it (the universe filter drops it). The other 59 are all common
stock. Nothing to remove.

**Small caps added.** 16 names fetched to `data/smallcap/`, full history
1999-2026, each verified symbol-by-symbol against a live quote before use
(the saved MCP payloads carry no ticker, so a mis-mapped file would have
corrupted the run silently). Market capitalisation confirmed via COMPANY_OVERVIEW:

    JACK  $256M   UTMD  $237M   CAL   $405M   PZZA  $668M
    ASTE  $958M   CBRL  $1.00B  TNC   $1.12B  WABC  $1.37B
    AIN   $1.68B  TRMK  $2.70B  SHOO  $3.13B  KAI   $3.14B
    SXI   $3.22B  INDB  $3.85B  CATY  $4.10B  POWL  $6.83B

Median ~$1.5B against the large-cap set's mega-cap S&P 100 membership.

### v3 on each sleeve, $50,000 account, whole shares

| | full history | CAGR | maxDD | 2023-2026 | CAGR |
|---|---|---|---|---|---|
| large cap, 59 names, 20 slots | **$202,879** | 5.52% | 22.8% | **$78,556** | 13.04% |
| small cap, 16 names, 10 slots | **$62,321** | 0.85% | 22.9% | **$51,832** | 0.99% |
| combined, 75 names, 20 slots | $153,021 | 4.39% | 28.1% | $73,690 | 11.10% |
| SPY buy and hold | $402,648 | 8.34% | 55.2% | $104,954 | 22.27% |

**Small caps do not work here and adding them makes the portfolio worse.** The
combined sleeve underperforms large-cap-only in both eras and carries a higher
drawdown (28.1% vs 22.8%), because the small-cap signals consume slots that the
large-cap names would have used better.

**It is not purely a cost artifact**, though costs are part of it — the small-cap
median share price is $35.05 against $61.47, so 5 ticks costs 0.143% per side
instead of 0.081%. Stripping costs entirely still leaves small caps far behind:

    full costs   large $203,841   small $62,175
    half costs   large $340,839   small $97,269
    zero costs   large $573,882   small $152,288

That table carries a second finding: **roughly 65% of this strategy's gross
profit is consumed by trading costs** at the large-cap sleeve (573,882 -> 203,841).
At ~6,900 trades over the window it is extraordinarily cost-sensitive, so any
real-world spread worse than modelled comes straight off the top.

### Caveat that cuts against the whole table

Both sleeves are **today's survivors**, selected in 2026 and backtested to 1999.
Companies that were delisted, went bankrupt or were acquired are absent. Small
caps fail at a far higher rate than mega caps, so the small-cap sleeve is the more
inflated of the two — and it still loses. The true small-cap result is worse than
shown. For the same reason the equal-weight buy-and-hold columns ($1,954,042 for
the 59 large, $762,570 for the 16 small) are not achievable returns and should not
be read as benchmarks; SPY is the honest one.

## Universe at 75 large caps — broader is worse

Small-cap data removed (`data/smallcap/` deleted). The large-cap set was taken
from 59 to 75 by adding 16 more mega/large caps with full 1999-2026 history:
ADBE AIG APD CAT CL COF CSX DUK FDX GD LLY MDT MO PEP SO WFC. Each was verified
symbol-by-symbol against a live quote.

**A mapping hazard worth recording:** the saved MCP payloads carry no ticker, and
the API wrote CL's result file *after* COF's despite CL being requested first.
Sorting payload files by timestamp would therefore have silently swapped two
symbols. Map by the order results are returned, and verify every file against a
quote before use.

### v3, 75 large caps, $50,000 account

| slots | full history | CAGR | maxDD | 2023-2026 | CAGR |
|---|---|---|---|---|---|
| 10 | $140,144 | 4.04% | 30.2% | $67,623 | 8.54% |
| 20 | $156,994 | 4.49% | 22.5% | $67,042 | 8.28% |
| 30 | **$170,950** | 4.83% | 15.9% | **$70,189** | 9.64% |
| 40 | $147,169 | 4.23% | 12.1% | $65,249 | 7.49% |
| **59 names, 20 slots** | **$202,879** | **5.52%** | 22.8% | **$78,556** | 13.04% |
| SPY buy and hold | $402,648 | 8.34% | 55.2% | $104,954 | 22.27% |

**Widening the universe diluted the edge.** The best 75-name configuration
($170,950 at 30 slots) still trails the 59-name set at 20 slots ($202,879), and
the same holds in 2023-2026.

Diagnosis — per-name expectancy of the two groups:

    original 59   mean +0.476%   45/59 names positive   median ATR 2.08% of price
    added 16      mean +0.270%   10/16 names positive   median ATR 2.00% of price

The six negative additions are defensives: MDT -0.345%, AIG -0.156%, DUK -0.142%,
SO -0.045%, CL -0.032%, COF -0.015%. The strong ones are cyclicals and tech:
ADBE +1.117%, CSX +0.812%, FDX +0.705%, GD +0.631%, CAT +0.620%, APD +0.524%.
ATR does not separate the groups (2.00% vs 2.08%), so this is not simply a
volatility effect — utilities, staples and insurers do not produce the follow-
through the trail and runner need, regardless of how much they move.

**Caveat on preferring 59 over 75.** The 59 were not selected for performance,
but choosing them *now, because they backtest better*, is a post-hoc decision on
the same data. The original set is growth- and tech-heavy across 27 years that
favoured growth. Treat "59 beats 75" as a measurement, not a validated rule.

## Bear-market tests: two earlier conclusions corrected

Script: `backtest/tdps_eras.py`. Sector split is explicit — defensive = consumer
staples, utilities, health care, telecom (21 names); cyclical = tech,
discretionary, industrials, financials, energy, materials (54 names).

### 1. The "defensives lack follow-through" diagnosis was wrong

Per-position expectancy, v3 config:

| era | defensive | cyclical |
|---|---|---|
| 2000-2002 dot-com | -0.462% (t=-0.95) | **-0.658%** (t=-1.59) |
| 2022 rate shock | -0.892% (t=-2.56) | **-1.533%** (t=-2.12) |
| full history | +0.096% (t=0.79) | **+0.542%** (t=4.94) |

The ranking **reverses** in both bear eras: defensives lose less, exactly as the
caveat in the previous section warned it might. So the earlier causal claim —
that utilities, staples and insurers "do not produce the follow-through the trail
and runner need" — is withdrawn. The mechanism is simpler and duller: this
strategy is a long-biased, amplified bet on whatever the underlying did, so it
ranks sectors in the same order the sectors themselves ranked. Cyclicals beat
defensives over 27 years; defensives beat cyclicals in busts; the strategy mirrors
both. Note also that defensives are not significant on their own over the full
history (t=0.79) — the entire measured edge lives in the cyclical half.

**Dropping defensives from the universe is therefore a sector bet on growth, not
a strategy improvement.**

### 2. v3 is not strictly better than v2 — it is more directionally levered

All 75 large caps, per position:

| era | v2 shipped | v3 | delta |
|---|---|---|---|
| 2000-2002 dot-com | -0.393% | -0.593% | **-0.201pp** |
| 2008-2009 GFC | -1.381% | -2.104% | **-0.723pp** |
| 2022 rate shock | -1.020% | -1.247% | **-0.227pp** |
| 2023-2026 | +0.371% | +0.699% | +0.328pp |
| full history | +0.183% (t=2.23) | +0.411% (t=4.67) | +0.228pp |

**v3 wins in every rising market and loses in every falling one.** The wider stop
and smaller scale-out keep more of the position on for longer, which amplifies
direction in both directions. Within bear windows v3's drawdown is consistently
worse (20.1% vs 15.9% in 2000-2002, 18.0% vs 13.3% in 2008-09, 16.1% vs 12.6% in
2022). The 70% scale-out was doing real defensive work, not only buying win rate
— that part of the earlier write-up understated it.

What survives: over the **full** sample v3 still returns 2.3x v2 ($156,994 vs
$68,066 on $50,000 at 20 slots) at an **identical** max drawdown (22.5% vs 22.4%),
because v2's losses grind out across the whole period while v3's concentrate in
busts. v3 remains the better configuration for an investor who holds through
cycles; it is the worse one for an investor who cannot sit through a bust.

### 3. The strategy lost to buy-and-hold in two of three busts

Equal-weight buy and hold of the same 75 names, same windows, against the
strategy at 20 slots on $50,000:

    2000-2002    hold $47,134   v2 $42,622   v3 $40,298    hold wins
    2008-2009    hold $36,520   v2 $43,373   v3 $40,950    STRATEGY wins
    2022         hold $45,402   v2 $43,985   v3 $42,374    hold wins

Only 2008-2009 — the one long, sustained decline — did the 50/200 filter earn its
keep. In the 2000-2002 and 2022 drawdowns the system lost more than simply
holding. A trend filter pays in persistent downtrends and costs in choppy ones,
which is the textbook result and is what these three windows show.

## v4 on 2022-2026 — and a correction to the v4 claim

2022-01-01 to 2026-09-21: one full cycle, a bear year then three up years.
75 large caps, 20 slots, $50,000, next-open fills, full costs.

| config | n | expectancy | t | $50,000 -> | maxDD | deployed |
|---|---|---|---|---|---|---|
| v2 base, no filters | 2098 | +0.172% | 1.39 | $53,499 | 14.5% | 85% |
| v3 exits, no filters | 1962 | +0.429% | 2.00 | $57,459 | 18.0% | — |
| **v4 A+C+F, v2 exits** | 1200 | +0.312% | **0.56** | $57,649 | 10.8% | 67% |
| v4 A+C+F, v3 exits | 1133 | +0.516% | 1.19 | $61,483 | 15.8% | — |
| SPY buy and hold | — | — | — | **$85,029** | 24.5% | 100% |
| equal-weight hold, 75 names | — | — | — | **$93,856** | — | 100% |

Two things to take from this.

**1. Every variant loses badly to simply holding.** $57,649 against SPY's $85,029
over the same 4.7 years — roughly 3% CAGR against 12%. The earlier finding that
this system does not beat buy-and-hold is not an artifact of the 1999-2026 window.

**2. The v4 entry filters do not survive a like-for-like test, and the previous
section overstated them.** The pooled comparison (+0.259% vs +0.192% on the full
history) is confounded: v4 trades a *different set of dates*, so pooled means
compare different market conditions, not different entry quality. The paired
same-date test controls for that:

    paired v4 - v2, 2022-2026    537 shared dates   -0.074pp   t = -0.64
    paired v4 - v2, full history 2810 shared dates  +0.052pp   t = +1.24
    bootstrap 95% CI, 2022-2026: [-0.298pp, +0.148pp]; v4 ahead in 25% of resamples

Decomposing where the pooled gap came from:

    entries the filters KEPT vs REJECTED    full +0.035pp    2022-2026 +0.037pp
    dates only the unfiltered version trades  full +0.064% (vs +0.216% on shared dates)
                                              2022-2026 +0.209% (vs +0.163% on shared)

The filters' ability to tell a good entry from a bad one is worth about
**0.035pp** — nearly nothing. Most of the apparent full-history gain came from
skipping whole *dates* that were worse on average (+0.064% against +0.216%), i.e.
regime avoidance rather than entry quality. **And in 2022-2026 that reversed: the
dates v4 skipped were the better ones** (+0.209% against +0.163%).

**So the headline "better entries, not deeper losses" is withdrawn.** v4's lower
drawdown (10.8% against 14.5%) is mostly lower *exposure* — capital deployed falls
from 85% to 67%. Holding less naturally draws down less; that is position sizing
wearing the costume of signal quality. The three filters are defensible as
regime/exposure controls, and they did no harm, but they are not a demonstrated
improvement in picking entries and they should not be sold as one.

## Is it a safe short-term strategy?

Short-term: yes. Safe: no. And the pure short-term version loses money.

**Holding period** (v2, 75 large caps, full history): median **12 calendar days**,
75th percentile 22, 90th 54, maximum 63. It is genuinely a swing strategy.

**The pure short-term version — close 100% at the snapback, no runner:**

    median hold   12 days
    win rate      63.8%   <- the highest hit rate the system produces
    average win   +2.077%      average loss  -3.454%
    expectancy    +0.075%
    $50,000  ->   $44,182 over 26.8 years

The cleanest, highest-hit-rate, shortest-duration version of this strategy
**loses money after costs**. Everything the system earns comes from the 30% that
is held longer, through the part that is neither short nor comfortable.

**Tail risk per trade** — against a stop that is supposed to cap losses at 3 ATR:

    worst 25%     -1.34%       worst 1%      -10.44%
    worst 5%      -6.63%       worst 0.1%    -18.26%
    single worst trade  -27.15%
    1.2% of trades lose more than 10%

**Tail risk per run.** Longest losing streak in chronological order: **44 trades
back to back.** Resampling the trade distribution:

    chance a run of  10 trades is net negative   42.6%
    chance a run of  25 trades is net negative   40.0%
    chance a run of  50 trades is net negative   37.2%
    chance a run of 100 trades is net negative   32.7%

**After one hundred trades there is still a one-in-three chance of being down.**
The per-trade edge (+0.192%) is tiny against per-trade dispersion, so no
realistic sample size makes the outcome feel reliable.

**The stop does not do what it says.** Across 17,313 stop touches, **2,660 (15.4%)
filled by a gap below the intended stop price**, the worst 20.7% below it. So
roughly one stop in six does not cap the loss where the position sizing assumed
it would — which is the specific reason "risk management makes this safe" does
not hold, and why the -27.15% trade exists at all on a 3-ATR stop.

## Aggressive mode on 2022-2026 — the window cannot answer the question

    2022-01-01 -> 2026-09-11 (4.69 years), 75 large caps, $50,000, 20 slots

    mode            n     win   avg win   avg loss    exp      t    $50,000 ->   maxDD
    Conservative  2098   61.0%   +2.64%    -3.69%   +0.172%  1.39    $53,922    14.4%
    Aggressive     521   25.0%  +32.65%    -6.09%   +3.576%  1.68    $47,957    24.1%
    SPY                                                              $85,029    24.5%

Aggressive **loses money** over this window despite a +3.576% per-trade
expectancy. Two defects in the test explain most of the gap, and both bite the
long-hold configuration specifically.

**1. Slot starvation.** Year-long holds occupy slots, so capacity binds:

    20 slots   331 of 521 trades taken (63.5%)   -> $47,812
    40 slots   481 of 521 taken (92.3%)          -> $68,115
    80 slots   521 of 521 taken (100%)           -> $61,055

At 20 slots more than a third of the signals are never traded. The headline
number is partly a capacity artifact, not a statement about the strategy.

**2. Truncation.** The backtester counts only completed trades. A trade entered
in 2026 can appear only if it already closed, and at a 250-bar cap the only way
to close inside nine months is to be stopped out — so the sample keeps the
losers and silently excludes the winners still open:

    entry year    n    win rate   median hold
    2022        135     13.3%        37d
    2023        107     23.4%        34d
    2024        114     42.1%       130d
    2025        115     33.0%        63d
    2026         50      2.0%        30d      <- artifact, not a result

Restricting to entries with a full year of runway (before 2025-09-01):
n=432, win 28.2%, expectancy +4.42%, $52,252 at 20 slots and **$61,103 at 80**.

**3. Too few independent outcomes.** Median hold 46 days against a 1,712-day
window is about 37 non-overlapping holding periods. For a configuration whose
return depends on rare large winners (25% hit rate, +32.65% average win), 37
generations is nowhere near enough — t=1.68, not significant.

**Conclusion.** Best-corrected, Aggressive returns roughly $61,000 against
Conservative's ~$54,000 and SPY's $85,029 over this window: modestly ahead of
Conservative, well behind the index. The genuinely interpretable pieces are the
years with full runway — 2022 was bad (-4.63% per trade, 13.3% win), 2024 and
2025 were good (+6.83%, +11.24%). A strategy that holds for up to a year cannot
be evaluated on 4.7 years, and the full-history figure ($640,803) carries the
same 20-slot capacity constraint, so it is the comparison that is meaningful
there rather than the absolute level.
