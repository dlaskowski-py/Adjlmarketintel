#!/usr/bin/env python3
"""Merge an Alpha Vantage daily-series payload into a stored series.

Fills however many bars are missing, which GLOBAL_QUOTE cannot do: it carries
only the latest bar and the one before it, so a series four sessions behind
cannot be caught up from quotes.

The payload carries no ticker. The guard is the OVERLAP BAR: the series already
on disk ends on some date, that date must appear in the payload, and the two
closes must agree to 0.2%. Both sides came from the same vendor for the same
symbol, so they match to rounding -- unless the payload is a different company,
which is how GD was once overwritten with GE's history and how CVG and SHLM
were written under each other's names. A mismatch refuses the merge.

Existing rows always win for a date already stored, so a re-pull cannot rewrite
history; only genuinely new dates are appended.

Usage:  python3 scripts/merge_series.py <SYM> <payload.json> [expected-last-date]
"""
import sys, os, csv, json, subprocess, tempfile

COLS = ["date", "open", "high", "low", "close",
        "adj_close", "volume", "dividend", "split"]
TOL = 0.002


def rows_from(payload):
    j = json.load(open(payload))
    body = j.get("result")
    if body:
        return list(csv.DictReader(body.splitlines()))
    url = j.get("data_url")
    if not url:
        sys.exit("payload has neither result nor data_url")
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as t:
        raw = t.name
    r = subprocess.run(["curl", "-sS", "-o", raw, url], capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"download failed: {r.stderr.strip()}")
    out = list(csv.DictReader(open(raw)))
    os.unlink(raw)
    return out


def main(sym, payload, expect=None):
    p = f'data/{sym}_daily_adj.csv'
    if not os.path.exists(p):
        sys.exit(f"REFUSED {sym}: no series on disk")
    cur = list(csv.DictReader(open(p)))
    last = cur[-1]['date']
    if expect and last != expect:
        sys.exit(f"REFUSED {sym}: series ends {last}, expected {expect}")

    new = {}
    for x in rows_from(payload):
        new[x['timestamp']] = dict(
            date=x['timestamp'], open=x['open'], high=x['high'], low=x['low'],
            close=x['close'], adj_close=x['adjusted_close'],
            volume=x['volume'], dividend=x['dividend_amount'],
            split=x['split_coefficient'])

    if last not in new:
        sys.exit(f"REFUSED {sym}: payload does not cover the stored last bar "
                 f"{last}, so continuity cannot be checked")
    a, b = float(cur[-1]['close']), float(new[last]['close'])
    if abs(a / b - 1) > TOL:
        sys.exit(f"REFUSED {sym}: on the {last} overlap bar the payload closes "
                 f"{b} against {a} stored ({100*abs(a/b-1):.2f}% apart) "
                 f"-- this is a different symbol")

    have = {r['date'] for r in cur}
    add = [new[d] for d in sorted(new) if d > last and d not in have]
    if not add:
        print(f"  -- {sym:<6} already current to {last}")
        return
    cur += add
    cur.sort(key=lambda r: r['date'])
    with open(p, 'w', newline='') as f:
        w = csv.DictWriter(f, COLS); w.writeheader(); w.writerows(cur)
    print(f"  ok {sym:<6} +{len(add)} bars  {last} -> {add[-1]['date']}")


if __name__ == '__main__':
    a = sys.argv[1:]
    if len(a) not in (2, 3):
        sys.exit(__doc__)
    main(*a)
