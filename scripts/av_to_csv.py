#!/usr/bin/env python3
"""
Merge an Alpha Vantage TIME_SERIES_DAILY_ADJUSTED payload into the repo's CSV
schema (date,open,high,low,close,adj_close,volume,dividend,split).

The MCP server saves large results to disk as {"result": "<json string>"}, so
both that wrapper and a raw payload are accepted. Existing rows win over new
ones for the same date, which keeps a partial re-pull from rewriting history;
only genuinely new dates are appended.

Usage:  python3 scripts/av_to_csv.py <payload.json> <out.csv>
"""
import sys, os, csv, json

COLS = ["date", "open", "high", "low", "close",
        "adj_close", "volume", "dividend", "split"]
KEYS = ["1. open", "2. high", "3. low", "4. close",
        "5. adjusted close", "6. volume", "7. dividend amount",
        "8. split coefficient"]


def payload(path):
    with open(path) as f:
        raw = json.load(f)
    # unwrap however many layers of {"result": "<json string>"} are present
    while isinstance(raw, dict) and "result" in raw and len(raw) == 1:
        raw = raw["result"]
        if isinstance(raw, str):
            raw = json.loads(raw)
    if not isinstance(raw, dict):
        sys.exit("payload is not an object")
    for k in raw:
        if k.lower().startswith("time series"):
            return raw[k]
    sys.exit(f"no time series in payload; keys were {list(raw)}")


def main(src, dst):
    series = payload(src)
    rows = {}
    if os.path.exists(dst):
        with open(dst, newline="") as f:
            for r in csv.DictReader(f):
                rows[r["date"]] = [r.get(c, "") for c in COLS]

    added = 0
    for date, v in series.items():
        if date in rows:
            continue
        try:
            rows[date] = [date] + [v[k] for k in KEYS]
        except KeyError:
            continue  # unadjusted endpoint or a truncated record
        added += 1

    with open(dst, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(COLS)
        for date in sorted(rows):
            w.writerow(rows[date])

    print(f"{os.path.basename(dst)}: +{added} rows, {len(rows)} total, "
          f"through {max(rows) if rows else 'nothing'}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
