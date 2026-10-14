#!/usr/bin/env python3
"""Append staged bars to many series at once, each verified by its overlap bar.

The daily-series payloads carry no ticker, so a batch of them can be assigned
to the wrong symbols -- the failure that overwrote GD with GE's history and
wrote CVG and SHLM under each other's names. The guard here is per symbol: the
staged rows must INCLUDE the date the stored series currently ends on, and that
row's close must match what is already stored to 0.2%. Both came from the same
vendor for the same symbol, so they agree to rounding unless the payload
belongs to a different company.

Staging CSV: symbol,date,open,high,low,close,adj_close,volume,dividend

Rows at or before the stored last date are used only for that check and are
never written, so a re-run cannot rewrite history.

Usage:  python3 scripts/merge_staged.py <staged.csv>
"""
import sys, os, csv, collections

COLS = ["date", "open", "high", "low", "close",
        "adj_close", "volume", "dividend", "split"]
TOL = 0.002


def main(src):
    by = collections.defaultdict(list)
    for r in csv.DictReader(open(src)):
        by[r['symbol']].append(r)

    ok, refused = [], []
    for sym, rows in sorted(by.items()):
        p = f'data/{sym}_daily_adj.csv'
        if not os.path.exists(p):
            refused.append(f'{sym}: no series on disk'); continue
        cur = list(csv.DictReader(open(p)))
        last = cur[-1]['date']
        overlap = [r for r in rows if r['date'] == last]
        if not overlap:
            refused.append(f'{sym}: staged rows do not include the stored last '
                           f'bar {last}, so continuity cannot be checked')
            continue
        a, b = float(cur[-1]['close']), float(overlap[0]['close'])
        if abs(a / b - 1) > TOL:
            refused.append(f'{sym}: on the {last} overlap bar staged closes {b} '
                           f'against {a} stored ({100*abs(a/b-1):.2f}% apart) '
                           f'-- different symbol')
            continue
        have = {r['date'] for r in cur}
        add = [dict(date=r['date'], open=r['open'], high=r['high'], low=r['low'],
                    close=r['close'], adj_close=r['adj_close'],
                    volume=r['volume'], dividend=r.get('dividend', '0.0000'),
                    split='1.0')
               for r in sorted(rows, key=lambda x: x['date'])
               if r['date'] > last and r['date'] not in have]
        if not add:
            continue
        cur += add
        cur.sort(key=lambda r: r['date'])
        with open(p, 'w', newline='') as f:
            w = csv.DictWriter(f, COLS); w.writeheader(); w.writerows(cur)
        ok.append(f'{sym}+{len(add)}')
    print(f"merged {len(ok)} symbols: {' '.join(ok)}")
    if refused:
        print(f"REFUSED {len(refused)}:")
        for r in refused:
            print(f"  {r}")


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
