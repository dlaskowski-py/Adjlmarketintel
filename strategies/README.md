# Indicators — final versions

Four current scripts, two superseded. All are Pine v6. Every measured number
below came from the backtests in `../backtest/` and `../flow/FINDINGS.md`, on
59 US equities (1999-2026) and BTC/USD (2014-2026).

---

## CURRENT

### 1. `btc_trend.pine` — Crypto Trend Regime
**The only script here with a demonstrated edge.**

A 30/150 moving-average regime filter with explicit BUY/SELL labels, per-trade
results, entry-price line, and a position banner.

| strategy | CAGR | max DD | CAGR/DD | exposure |
|----------|------|--------|---------|----------|
| Buy & hold BTC | 44.3% | 83.3% | 0.53 | 100% |
| **30/150 filter** | **53.9%** | **67.8%** | **0.80** | 57% |

Improves return *and* drawdown — the only case in this project where a filter
does both. All 32 cells of a 6x6 parameter grid beat buy-and-hold (median
0.71), it survives 200bp per switch, and it survives deleting the worst crash
outright. 12 trades since 2014, 58% win rate, +627% average win vs -19%
average loss.

Won all three bear cycles, lost two bulls. It is insurance, not prediction.

**Caveat:** one asset, ~5 independent cycles, and BTC survived — the
benchmark it beats is itself flattered by that survival.

---

### 2. `regime_filter.pine` — 50/200 Regime Filter
Three equity curves side by side (buy & hold / long-while-above / long-short)
with a verdict row, volatility-by-regime, and switch count.

| strategy | CAGR | max DD | CAGR/DD |
|----------|------|--------|---------|
| Buy & hold (25-name basket) | 16.5% | 49.3% | 0.34 |
| Long while 50 > 200 | 10.4% | 25.7% | **0.40** |
| Long above / short below | 2.8% | 40.1% | 0.07 |

Costs 6 points of CAGR to halve drawdown. The cross carries **volatility**
information, not directional information — returns below the 200 were slightly
*higher*, but volatility was 1.45x greater.

**Use on an index or portfolio, not a single ticker.** It improved return per
drawdown on only 9 of 25 individual names, and correlation with benefit is
+0.68 against a stock's own drawdown severity. Adding the short leg destroys
it.

---

### 3. `options_engine.pine` v8 — Synthetic Options Engine
The research workbench. Prices modelled option contracts with Black-Scholes
and keeps its own books, since `strategy()` can only trade the chart's
instrument.

- 9 signals + blind control, long options / credit spreads / straddles / strangles
- IV and bid-ask calibrated to **real** Alpha Vantage chains (1.51x/3.4% calm,
  0.84x/12.2% stress), interpolated on the vol percentile
- Timeframe-aware, calendar-day theta, BUY CALL / BUY PUT labels, live status

**No signal in it beat blind entry.** That is the finding, and the header
carries the full table:

| signal | structure | PF | vs blind (1.60) |
|--------|-----------|----|-----------------|
| MACD cross | long 30d | 1.33 | loses |
| RSI(2) | long 30d | 1.36 | loses |
| Donchian-55 | long 30d | 1.48 | loses |
| EMA 20/50 | long 30d | 1.32 | loses |
| Vol contraction | long 30d | 1.40 | loses |
| Squeeze release | strangle | 1.62 | ties (t=0.57) |
| McClellan oversold | long 30d | — | not significant once clustering is handled |

Use it to **test** ideas, not to trade them. Validated against real chains on
21 trades: correlates 0.93 with reality but overstates win rate by ~10 points
and badly understates the typical loss.

---

### 4. `short_system.pine` — Short-Side Signal Meter
Self-measuring. For every historical signal it records the forward N-bar
outcome and compares it to an ordinary bar **on the symbol you load**, so you
can check any ticker without trusting anyone's basket.

Measured on 25 names, shorting the underlying, 20-day hold:

| signal | n | WR | PF | expectancy |
|--------|---|----|----|------------|
| Death cross | 442 | 43.0% | 0.76 | -1.00% |
| Price < 50MA | 2924 | 43.3% | 0.70 | -1.21% |
| Stacked bearish | 1869 | 41.8% | 0.65 | -1.88% |
| ADX>25 + below 50 | 1728 | 40.0% | 0.60 | -1.95% |
| BLIND short | 7762 | 41.7% | 0.65 | -1.42% |

Every variant loses and none beats blind shorting. Expectancy falls
**monotonically** as bearish confirmation is stacked on.

A death cross does not start a downtrend: price rose +0.97% over the next 20
days against a +1.37% baseline, with the same share of down days and a
*shorter* longest down run (3.30 bars vs 3.44).

---

## SUPERSEDED — kept for history, do not use

- **`macd_options_signal.pine`** — first attempt, MACD only. Replaced by
  `options_engine.pine`, which contains it and eight other signals plus real
  option pricing.
- **`signal_lab.pine`** — six signals against a blind control on the
  underlying. Also folded into `options_engine.pine`.

---

## How to read any of these

Every script carries a **blind control** or a **benchmark curve**, and most
carry a **verdict line**. That is deliberate. The recurring lesson of this
project is that a strategy looking profitable in isolation usually is not
once compared against doing nothing:

- win rates of 70%+ were reachable repeatedly, always with losing expectancy
- five separate results that "worked" dissolved under correct measurement
  (a delta-solver bug at +2412% expectancy, vol contraction at PF 2.54,
  the McClellan at t=3.67, exit-IV mispricing up to 79%, an inflated
  cross-sectional t-stat)

Run the control before trusting the signal.
