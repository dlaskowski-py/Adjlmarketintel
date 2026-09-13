"""
Index every saved HISTORICAL_OPTIONS chain by (symbol, date).

The tool-result filenames are opaque timestamps, so identity is read from the
file contents instead - each chain carries its own symbol and date. Scanning
beats tracking ids by hand and stays correct as batches accumulate.
"""
import json, io, csv, glob, os

TOOLDIR = "/root/.claude/projects/-home-user/e511f7fa-2251-5829-b743-c2cf14d27d38/tool-results"


def build_index():
    idx = {}
    for p in glob.glob(os.path.join(TOOLDIR, "*HISTORICAL_OPTIONS*.txt")):
        try:
            txt = json.load(open(p))["result"]
            head = txt[:4000]
            rows = list(csv.DictReader(io.StringIO(head)))
            if not rows:
                continue
            sym, date = rows[0]["symbol"], rows[0]["date"]
            idx[(sym, date)] = p
        except Exception:
            continue
    return idx


if __name__ == "__main__":
    idx = build_index()
    dates = sorted({d for _, d in idx})
    syms = sorted({s for s, _ in idx})
    print(f"indexed {len(idx)} chains | {len(syms)} symbols | {len(dates)} dates")
    print("symbols:", " ".join(syms))
    print("dates:  ", " ".join(dates))
    for d in dates:
        have = [s for s in syms if (s, d) in idx]
        print(f"  {d}: {len(have)}/{len(syms)}  {'' if len(have)==len(syms) else 'missing: '+','.join(set(syms)-set(have))}")
