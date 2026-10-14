#!/usr/bin/env python3
"""Append one day's GLOBAL_QUOTE bars to data/, verifying each against the
quote's own previousClose.

The quote payload carries no symbol-level history, so the one independent check
available is that its previousClose equals the close already stored for the
prior session. That is what catches a quote written under the wrong symbol --
the failure that corrupted GD with GE's series, and later swapped CVG and SHLM.
A bar is refused unless the stored series ends on the expected prior date AND
the closes agree to 0.2%, which tolerates the small consolidated-close revisions
that appear after the bell without tolerating a wrong symbol.

A second guard matters as much: the quote's own `latestDay` must equal the bar
date being written. Alpha Vantage updates symbols at different times, so a
quote pulled after the close can still carry the PREVIOUS session. On 2026-10-14
AAPL and NOW both came back stamped 10-13, and AAPL's previousClose sat 0.09%
from the stored 10-13 close -- inside the 0.2% tolerance. Without this check it
would have written yesterday's bar under today's date and silently frozen the
series.

Input CSV: symbol,open,high,low,price,volume,previousClose,latestDay

Usage:  python3 scripts/append_quotes.py <quotes.csv> <bar-date> <prior-date>
"""
import sys, os, csv

COLS = ["date", "open", "high", "low", "close",
        "adj_close", "volume", "dividend", "split"]
TOL = 0.002


def main(src, bar, prior):
    ok, refused = [], []
    for q in csv.DictReader(open(src)):
        s = q['symbol']
        p = f'data/{s}_daily_adj.csv'
        if not os.path.exists(p):
            refused.append(f'{s}: no series on disk'); continue
        rows = list(csv.DictReader(open(p)))
        if rows[-1]['date'] == bar:
            refused.append(f'{s}: {bar} already present'); continue
        if rows[-1]['date'] != prior:
            refused.append(f"{s}: series ends {rows[-1]['date']}, expected {prior}")
            continue
        ld = (q.get('latestDay') or '').strip()
        if ld and ld != bar:
            refused.append(f'{s}: quote is stamped {ld}, not {bar} '
                           f'-- provider has not posted this session yet')
            continue
        stored, pc = float(rows[-1]['close']), float(q['previousClose'])
        if abs(stored / pc - 1) > TOL:
            refused.append(f'{s}: previousClose {pc} vs stored {stored} '
                           f'({100*abs(stored/pc-1):.2f}% apart)')
            continue
        rows.append(dict(date=bar, open=q['open'], high=q['high'], low=q['low'],
                         close=q['price'], adj_close=q['price'],
                         volume=q['volume'], dividend='0.0000', split='1.0'))
        with open(p, 'w', newline='') as f:
            w = csv.DictWriter(f, COLS); w.writeheader(); w.writerows(rows)
        ok.append(s)
    print(f"appended {bar} to {len(ok)} series")
    if refused:
        print(f"refused {len(refused)}:")
        for r in refused:
            print(f"  {r}")


if __name__ == '__main__':
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
