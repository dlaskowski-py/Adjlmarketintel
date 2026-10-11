#!/usr/bin/env python3
"""Convert an Alpha Vantage payload into a delisted-name CSV, verifying identity.

The payload is CSV with no symbol column, so nothing in the data says which
company it is. A filename collision silently overwrote GD with GE's series
once already. For delisted names there is a strong independent check: the
series must END near the stated delisting date. A mismatch means the payload
is the wrong symbol, or the ticker was recycled by a later company.

Usage:  python3 scripts/fetch_delisted.py <SYM> <ipo> <delist> <payload.json>
"""
import sys, os, csv, json, subprocess, tempfile

COLS = ["date", "open", "high", "low", "close",
        "adj_close", "volume", "dividend", "split"]
TOL_DAYS = 5            # AV's delisting date matched the last bar exactly on 14 of 16


def days(a, b):
    import datetime as dt
    f = "%Y-%m-%d"
    return abs((dt.datetime.strptime(a, f) - dt.datetime.strptime(b, f)).days)


def main(sym, ipo, delist, payload):
    j = json.load(open(payload))
    url = j.get("data_url")
    if not url:
        sys.exit(f"{sym}: no data_url in payload")

    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as t:
        raw = t.name
    r = subprocess.run(["curl", "-sS", "-o", raw, url], capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"{sym}: download failed: {r.stderr.strip()}")

    rows = list(csv.DictReader(open(raw)))
    os.unlink(raw)
    if not rows:
        sys.exit(f"{sym}: empty payload")

    out = []
    for x in rows:
        out.append({
            "date": x["timestamp"], "open": x["open"], "high": x["high"],
            "low": x["low"], "close": x["close"], "adj_close": x["adjusted_close"],
            "volume": x["volume"], "dividend": x["dividend_amount"],
            "split": x["split_coefficient"]})
    out.sort(key=lambda r: r["date"])

    first, last = out[0]["date"], out[-1]["date"]

    # identity: a delisted series must stop near its delisting date
    gap = days(last, delist)
    if gap > TOL_DAYS:
        sys.exit(f"REFUSED {sym}: series ends {last} but delisting was {delist} "
                 f"({gap}d apart) -- wrong symbol or a recycled ticker")
    if len(out) < 400:
        sys.exit(f"REFUSED {sym}: only {len(out)} bars, too short to trade")
    if first >= "2001-01-01":
        sys.exit(f"REFUSED {sym}: series starts {first}, no overlap with the "
                 f"survivor universe's window")

    dst = f"data/delisted/{sym}_daily_adj.csv"
    with open(dst, "w", newline="") as f:
        w = csv.DictWriter(f, COLS)
        w.writeheader()
        w.writerows(out)
    print(f"  ok {sym:<6} {len(out):>5} bars  {first} .. {last}  "
          f"(delisted {delist}, {gap}d)")


if __name__ == "__main__":
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    main(*sys.argv[1:])
