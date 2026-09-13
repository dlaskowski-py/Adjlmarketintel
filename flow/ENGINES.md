# Two options engines

## 1. `strategies/options_engine.pine` — synthetic, for TradingView

Pine has no options data, so this models contracts with Black-Scholes and does
its own accounting, bypassing `strategy()` (which can only trade the chart's
instrument). Plots its own equity curve and stats.

Validated numerically against `math.erf`:

- normal CDF (Abramowitz-Stegun 26.2.17): worst error 7.0e-08
- ATM call 10.4506 / put 5.5735 — exact against reference values
- put-call parity holds to machine precision
- strike solver correct on BOTH branches (call delta falls with strike, put
  |delta| rises — one branch for both was a real bug earlier)

IV and bid-ask are interpolated on the realised-vol percentile using values
measured from real chains (1.51x/3.4% calm, 0.84x/12.2% stress) rather than
guessed.

## 2. `flow/real_chain_validator.py` — real quotes, for validation

Selects a real contract from the entry chain by delta, tracks it forward by
`contractID`, closes at the real bid. Buy at ask, sell at bid, no midpoint
credit. Liquidity screen drops contracts with OI < 50 or spreads above 25% of
mark — a 30-delta contract quoted 0.05/0.40 is not tradeable and including it
makes a backtest fiction.

One API call per symbol-date, so this is a VALIDATION tool, not a search tool.

## How the model compares to reality (21 trades, 3 periods)

|                       | n  | win rate | profit factor | mean   | median |
|-----------------------|----|----------|---------------|--------|--------|
| REAL chains           | 21 | 33.3%    | 1.94          | +41.5% | -36.4% |
| MODEL (Black-Scholes) | 21 | 42.9%    | 2.36          | +33.0% |  -3.9% |

Correlation between model and real returns: **0.932**.

So the model RANKS trades well but MISPRICES them, and the errors are not
symmetric:

- **It overstates win rate by ~10 points** (42.9% vs 33.3%).
- **It badly understates the typical loss** (median -3.9% vs -36.4% real).
- Mean looks close only because a few enormous real winners offset it.

Every modelled result in this repo is therefore somewhat optimistic on win
rate and on the median trade. That pushes the earlier negative findings
further negative, not back toward positive.

Three of 24 trades returned "contract not quoted at exit" — the contract left
the quoted chain. Those are reported, never filled at an invented price.
