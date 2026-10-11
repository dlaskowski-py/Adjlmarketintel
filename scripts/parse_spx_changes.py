#!/usr/bin/env python3
"""Parse the S&P 500 index change log into a CSV of additions and removals.

Source: the raw wikitext of Wikipedia's "Historical components of the S&P 500",
fetched with action=raw. Treated purely as data.

Why this exists: `data/` holds names that are in the index TODAY, which is a
universe selected by having survived. The change log names the companies that
were in the index and later left -- including the ones removed for "market
capitalization changes", which are neither bankrupt nor acquired, just faded.
Those are the population a dip-buying backtest most needs and most lacks.

Two wikitext styles appear in the table, `|field` and `|| field`, and empty
cells carry meaning (a row may add without removing, or remove without adding),
so fields are read positionally rather than after dropping blanks:

    date | added ticker | added name | removed ticker | removed name | reason

Usage:  python3 scripts/parse_spx_changes.py <raw.wiki> <out.csv>
"""
import sys, re, csv, datetime as dt

MONTHS = ('January|February|March|April|May|June|July|August|September|'
          'October|November|December')
DATE_RE = re.compile(rf'^({MONTHS})\s+(\d{{1,2}}),?\s+(\d{{4}})$')
TICK_RE = re.compile(r'^[A-Z][A-Z.\-]{0,5}$')


def clean(s):
    s = re.sub(r'<ref[^>]*/>', '', s)
    s = re.sub(r'<ref.*?</ref>', '', s, flags=re.S)
    s = re.sub(r'\[\[([^\]|]*\|)?([^\]]*)\]\]', r'\2', s)
    s = re.sub(r"'''?", '', s)
    return re.sub(r'\s+', ' ', s).strip()


def ticker(s):
    s = clean(s).replace('.', '.').strip()
    return s if TICK_RE.match(s) else ''


def records(text):
    """Yield positional field lists, one per table row."""
    cur = None
    for line in text.splitlines():
        t = line.strip()
        if t.startswith('|-'):
            if cur:
                yield cur
            cur = []
            continue
        if cur is None:
            continue
        if t.startswith('||'):
            cur.append(t[2:])
        elif t.startswith('|') and not t.startswith('|}'):
            cur.append(t[1:])
        elif t.startswith('|}'):
            yield cur
            cur = None
        elif cur:
            # continuation of the previous cell (a ref spilling over a line)
            cur[-1] += ' ' + t
    if cur:
        yield cur


def main(src, dst):
    out = []
    for f in records(open(src).read()):
        if not f:
            continue
        m = DATE_RE.match(clean(f[0]))
        if not m:
            continue
        date = dt.datetime.strptime(f"{m.group(1)} {m.group(2)} {m.group(3)}",
                                    "%B %d %Y").date().isoformat()
        g = lambda i: f[i] if len(f) > i else ''
        out.append(dict(date=date,
                        added=ticker(g(1)), added_name=clean(g(2)),
                        removed=ticker(g(3)), removed_name=clean(g(4)),
                        reason=clean(g(5))))
    out.sort(key=lambda r: r['date'])
    with open(dst, 'w', newline='') as fh:
        w = csv.DictWriter(fh, ['date', 'added', 'added_name',
                                'removed', 'removed_name', 'reason'])
        w.writeheader()
        w.writerows(out)
    print(f"{len(out)} change rows  {out[0]['date']} .. {out[-1]['date']}  -> {dst}")


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(*sys.argv[1:])
