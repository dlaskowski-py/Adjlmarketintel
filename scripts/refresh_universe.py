#!/usr/bin/env python3
"""Bring every series in data/ up to the latest session, in one run.

Why this exists: refreshing the universe through a chat tool costs one
round-trip per symbol and carries the whole 100-bar payload into context, so
152 names is ~30 exchanges and most of a million tokens. The same work here is
one HTTPS call per symbol and a few seconds, and it is the piece the scheduled
post-close job needs.

Needs an Alpha Vantage key in the environment as ALPHAVANTAGE_API_KEY. Add it
in the environment's settings, never on the command line or in this file.

Guards, all carried over from the mistakes that earned them:

  overlap     the payload must cover the date the stored series ends on, and
              that bar's close must match to 0.2%. The payload carries no
              ticker, and this is what catches one landing under the wrong
              symbol -- how GD was overwritten with GE's history.
  existing    rows win for a date already stored, so a re-run never rewrites
              history; only genuinely new dates are appended.
  split       a split coefficient other than 1 in the new rows means every
              earlier bar's scale just changed, so the symbol is flagged for a
              full re-pull instead of being appended to.

Usage:
  python3 scripts/refresh_universe.py              # every series in data/
  python3 scripts/refresh_universe.py AAPL MU      # just these
  python3 scripts/refresh_universe.py --dry-run
"""
import os, sys, csv, glob, json, time, urllib.request, urllib.error

COLS = ["date", "open", "high", "low", "close",
        "adj_close", "volume", "dividend", "split"]
TOL = 0.002
URL = ("https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED"
       "&symbol={sym}&outputsize=compact&datatype=csv&apikey={key}")
PAUSE = 0.9          # ~1/sec: well inside the 5/sec cap, and the burst
                     # detector trips on parallel bursts rather than on rate


def fetch(sym, key):
    req = urllib.request.Request(URL.format(sym=sym, key=key),
                                 headers={'User-Agent': 'adjl-refresh/1'})
    with urllib.request.urlopen(req, timeout=30) as r:
        body = r.read().decode()
    if not body.lstrip().startswith('timestamp'):
        # the API reports rate limits and bad symbols as a 200 with JSON
        raise RuntimeError(body.strip()[:200])
    return list(csv.DictReader(body.splitlines()))


def refresh(sym, key, dry=False):
    p = f'data/{sym}_daily_adj.csv'
    cur = list(csv.DictReader(open(p)))
    last = cur[-1]['date']
    rows = {x['timestamp']: x for x in fetch(sym, key)}

    if last not in rows:
        return 'refused', f'payload does not cover the stored last bar {last}'
    a, b = float(cur[-1]['close']), float(rows[last]['close'])
    if abs(a / b - 1) > TOL:
        return 'refused', (f'{last} overlap closes {b} vs {a} stored '
                           f'({100*abs(a/b-1):.2f}% apart) -- wrong symbol')

    new = [d for d in sorted(rows) if d > last]
    if not new:
        return 'current', last
    bad = [d for d in new if float(rows[d]['split_coefficient'] or 1) != 1.0]
    if bad:
        return 'refused', (f'split on {bad[0]} rescales all earlier bars '
                           f'-- re-pull the full history for {sym}')
    if dry:
        return 'would-add', f'{len(new)} bars through {new[-1]}'

    for d in new:
        x = rows[d]
        cur.append(dict(date=d, open=x['open'], high=x['high'], low=x['low'],
                        close=x['close'], adj_close=x['adjusted_close'],
                        volume=x['volume'], dividend=x['dividend_amount'],
                        split=x['split_coefficient']))
    cur.sort(key=lambda r: r['date'])
    with open(p, 'w', newline='') as f:
        w = csv.DictWriter(f, COLS); w.writeheader(); w.writerows(cur)
    return 'added', f'{len(new)} bars through {new[-1]}'


def main(argv):
    dry = '--dry-run' in argv
    want = [a for a in argv if not a.startswith('--')]
    key = os.environ.get('ALPHAVANTAGE_API_KEY')
    if not key:
        sys.exit("ALPHAVANTAGE_API_KEY is not set. Add it in the environment's\n"
                 "settings (the cloud environment menu, then Edit) and start a\n"
                 "new session; this script reads it from there.")

    syms = want or sorted(os.path.basename(p).split('_')[0]
                          for p in glob.glob('data/*_daily_adj.csv'))
    tally = {}
    for i, s in enumerate(syms):
        try:
            k, msg = refresh(s, key, dry)
        except Exception as e:
            k, msg = 'error', str(e)
        tally[k] = tally.get(k, 0) + 1
        if k in ('added', 'would-add', 'refused', 'error'):
            print(f"  {k:<9} {s:<6} {msg}")
        if i + 1 < len(syms):
            time.sleep(PAUSE)
    print('\n' + '  '.join(f'{k}={v}' for k, v in sorted(tally.items())))


if __name__ == '__main__':
    main(sys.argv[1:])
