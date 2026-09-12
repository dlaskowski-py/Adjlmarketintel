# MACD Options Backtest

Tests the `strategies/macd_options_signal.pine` logic against 26 years of
split/dividend-adjusted SPY daily bars (Alpha Vantage premium, 1999-2026).

- `engine.py` — signal backtest on the underlying. Mirrors the Pine logic.
- `options_overlay.py` — prices what a real contract would have done via
  Black-Scholes, for long ATM/OTM and defined-risk credit spreads.

## Reproduce

    python3 -c "import sys;sys.path.insert(0,'backtest');\
    from engine import *;d,o,h,l,c=load('data/SPY_daily_adj.csv');\
    show('base',stats(run(d,o,h,l,c,Config())))"

## Conservative choices

Where daily bars leave a result ambiguous, the pessimistic branch is taken:

- Stop assumed to fill before target when a bar touches both.
- IV priced at 1.15x trailing realised vol (the variance risk premium — long
  options are systematically more expensive than realised vol implies).
- 2% round-trip bid/ask cost on option premium.
- OHLC back-adjusted so splits and dividends create no phantom gaps.

## Known limitations

- Option prices are MODELLED, not real chains. Alpha Vantage `HISTORICAL_OPTIONS`
  would give true bid/ask.
- Flat volatility surface — no skew. Real put skew means bull put spreads
  collect MORE credit than modelled, so credit-spread results here are likely
  conservative.
- No early assignment modelling.
