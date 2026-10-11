#!/usr/bin/env python3
"""Add an actively-traded symbol to data/, with the integrity guards that
earlier mistakes in this repo earned.

The Alpha Vantage payload is CSV with no symbol column, so nothing in the data
says which company it is. A filename collision silently overwrote GD with GE's
series once, and two delisted names were later written under each other's names
after parallel tool results came back out of request order. For an active name
the available checks are:

  current   the series must end on roughly the same date as the rest of data/,
            which rules out a stale or wrong listing
  identity  given an expected listing date, the series must START there (or at
            Alpha Vantage's 1999-11-01 coverage floor for older companies).
            This is the only guard that catches two CURRENT names written under
            each other's names, which is how CVG and SHLM went wrong: every
            other check passes for both, since both are long, live and distinct.
  length    at least 400 bars, since the strategy needs 260 before it trades
  distinct  the close series must not be byte-identical to a symbol already on
            disk, which is what a payload collision looks like
  no clobber  refuses to overwrite an existing file unless --force

Usage:  python3 scripts/fetch_active.py <SYM> <payload.json> [ipo-date] [--force]
"""
import sys, os, csv, json, glob, hashlib, subprocess, tempfile, datetime as dt

COLS = ["date", "open", "high", "low", "close",
        "adj_close", "volume", "dividend", "split"]
MAX_STALE_DAYS = 6
MIN_BARS = 400
IPO_TOL_DAYS = 12
AV_FLOOR = '1999-11-01'


def fingerprints():
    fp = {}
    for p in glob.glob('data/*_daily_adj.csv') + glob.glob('data/delisted/*_daily_adj.csv'):
        try:
            rows = list(csv.DictReader(open(p)))
            key = hashlib.sha1(
                ''.join(r['close'] for r in rows[-500:]).encode()).hexdigest()
            fp[key] = os.path.basename(p).split('_')[0]
        except Exception:
            pass
    return fp


def newest_on_disk():
    best = ''
    for p in glob.glob('data/*_daily_adj.csv'):
        try:
            last = list(csv.DictReader(open(p)))[-1]['date']
            best = max(best, last)
        except Exception:
            pass
    return best


def main(sym, payload, ipo=None, force=False):
    dst = f"data/{sym}_daily_adj.csv"
    if os.path.exists(dst) and not force:
        sys.exit(f"REFUSED {sym}: {dst} already exists (pass --force to replace)")

    j = json.load(open(payload))
    url = j.get("data_url")
    if url:
        with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as t:
            raw = t.name
        r = subprocess.run(["curl", "-sS", "-o", raw, url],
                           capture_output=True, text=True)
        if r.returncode:
            sys.exit(f"{sym}: download failed: {r.stderr.strip()}")
        rows = list(csv.DictReader(open(raw)))
        os.unlink(raw)
    else:
        body = j.get("result")
        if not body:
            sys.exit(f"{sym}: payload has neither data_url nor result")
        rows = list(csv.DictReader(body.splitlines()))

    if not rows:
        sys.exit(f"{sym}: empty payload")

    out = sorted(({"date": x["timestamp"], "open": x["open"], "high": x["high"],
                   "low": x["low"], "close": x["close"],
                   "adj_close": x["adjusted_close"], "volume": x["volume"],
                   "dividend": x["dividend_amount"],
                   "split": x["split_coefficient"]} for x in rows),
                 key=lambda r: r["date"])

    first, last = out[0]["date"], out[-1]["date"]
    if len(out) < MIN_BARS:
        sys.exit(f"REFUSED {sym}: {len(out)} bars, needs {MIN_BARS} "
                 f"(the strategy uses 260 before its first trade)")

    if ipo:
        f = "%Y-%m-%d"
        if ipo < AV_FLOOR:
            if first > AV_FLOOR:
                sys.exit(f"REFUSED {sym}: listed {ipo} so the series should start "
                         f"at the {AV_FLOOR} coverage floor, but starts {first}")
        else:
            d = abs((dt.datetime.strptime(first, f)
                     - dt.datetime.strptime(ipo, f)).days)
            if d > IPO_TOL_DAYS:
                sys.exit(f"REFUSED {sym}: series starts {first} but {sym} listed "
                         f"{ipo} ({d}d apart) -- wrong symbol or a swapped payload")

    ref = newest_on_disk()
    if ref:
        f = "%Y-%m-%d"
        gap = (dt.datetime.strptime(ref, f) - dt.datetime.strptime(last, f)).days
        if gap > MAX_STALE_DAYS:
            sys.exit(f"REFUSED {sym}: series ends {last} but data/ is current to "
                     f"{ref} ({gap}d stale) -- wrong or dead listing")

    key = hashlib.sha1(''.join(r['close'] for r in out[-500:]).encode()).hexdigest()
    clash = fingerprints().get(key)
    if clash and clash != sym:
        sys.exit(f"REFUSED {sym}: close series is identical to {clash} "
                 f"-- payload collision")

    with open(dst, "w", newline="") as fh:
        w = csv.DictWriter(fh, COLS)
        w.writeheader()
        w.writerows(out)
    yrs = len(out) / 252
    print(f"  ok {sym:<6} {len(out):>5} bars ({yrs:>4.1f}y)  {first} .. {last}"
          + (f"  [listed {ipo}]" if ipo else ""))


if __name__ == "__main__":
    a = [x for x in sys.argv[1:] if x != '--force']
    if len(a) not in (2, 3):
        sys.exit(__doc__)
    main(a[0], a[1], a[2] if len(a) > 2 else None, '--force' in sys.argv)
