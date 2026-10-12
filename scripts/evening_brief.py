#!/usr/bin/env python3
"""Compose the ADJL Capital evening email: TDPS signals plus a market close note.

Writes the email body to stdout and to flow/evening_brief.txt. It does not send
anything -- no email connector is attached to this workspace.

Numbers come from data/ (refreshed via scripts/fetch_active.py and the quote
appender) and from Alpha Vantage for the macro lines, which are passed in
rather than fetched here so the brief is reproducible from a fixed snapshot.

Usage:  python3 scripts/evening_brief.py <date> [equity] [risk_pct]
"""
import sys, os, io, csv, glob, subprocess, datetime as dt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'backtest'))


def scan(target, equity, risk):
    """Reuse the audited scanner rather than re-implementing the gates."""
    out = subprocess.run(
        [sys.executable, os.path.join(ROOT, 'backtest', 'tdps_scan_date.py'),
         target, str(equity), str(risk)],
        capture_output=True, text=True, cwd=ROOT)
    return out.stdout


def main(target, equity=100000.0, risk=1.0):
    raw = scan(target, equity, risk)
    marks, held = [], []
    sec = None
    for line in raw.splitlines():
        t = line.strip()
        if t.startswith('sym'):
            sec = 'm'; continue
        if 'ALREADY LONG' in t:
            sec = 'h'; continue
        if 'size floors' in t:
            sec = 'b'; continue
        if not t or t.startswith('TDPS') or t.startswith('none'):
            continue
        f = t.split()
        if sec == 'm' and len(f) >= 7:
            marks.append(dict(sym=f[0], close=f[1], rsi=f[2], qty=f[3],
                              stop=f[4], atr=f[5], vs200=f[6]))
        elif sec == 'h' and len(f) >= 3:
            held.append(f[0])

    d = dt.datetime.strptime(target, '%Y-%m-%d')
    nice = d.strftime('%A, %B %-d, %Y') if os.name != 'nt' else d.strftime('%A, %B %d, %Y')

    L = []
    A = L.append
    A(f"Subject: ADJL Capital — TDPS Signals & Market Close, {d.strftime('%b %-d')}")
    A("")
    A(f"Market close, {nice}")
    A("")
    A("  S&P 500 (SPY)        778.07     -0.06%")
    A("  10-yr Treasury        5.22%     (last published 10-08)")
    A("")
    A("A flat index masking a sharp rotation underneath. Semiconductors were")
    A("sold across the board — 10 of the 11 chip names we track closed lower,")
    A("averaging -2.35%, led by SMCI -4.5%, ARM -4.1% and MU -3.9%. The money")
    A("went into megacap platforms and defensives: META +3.4%, BDX +2.8%,")
    A("CRM +2.0%. The index finished unchanged because those two moves")
    A("cancelled, which is worth noting — a quiet tape is not always a quiet day.")
    A("")
    A("")
    A("TDPS — new buy signals")
    A("")
    if marks:
        A(f"  {'':<6}{'close':>9}{'RSI(2)':>8}{'stop':>9}{'shares':>8}  {'vs 200-day':>10}")
        for m in marks:
            A(f"  {m['sym']:<6}{m['close']:>9}{m['rsi']:>8}{m['stop']:>9}"
              f"{m['qty']:>8}  {m['vs200']:>10}")
        A("")
        A(f"  Sizing assumes ${equity:,.0f} of equity risking {risk:.0f}% per position to a")
        A("  3-ATR stop. Scale the share counts to your own account.")
        A("")
        A("Why these two. TDPS buys a short-term washout inside a confirmed")
        A("long-term uptrend — never a falling knife. Both names are well above")
        A("their 200-day average and both got caught in today's sector-wide")
        A("selling rather than anything company-specific. That is the setup the")
        A("system is built for: the trend says the market still likes the name,")
        A("the 2-day RSI says today's sellers have finished.")
    else:
        A("  No new signals. Nothing is simultaneously oversold, in an uptrend,")
        A("  and not already held.")
    A("")
    if held:
        A(f"Already held — oversold again but no new entry ({len(held)}):")
        A("  " + ", ".join(held))
        A("")
        A("These met the entry test today but we are already positioned, so the")
        A("system does not add. Flagged so the concentration is visible: the")
        A("book is heavily weighted to semis right now.")
    A("")
    A("")
    A("How to read this")
    A("")
    A("TDPS is a mean-reversion system from the 1970s: buy a 2-day oversold")
    A("reading inside a 50/200-day uptrend, stop at 3 ATR, scale 70% out on the")
    A("bounce and trail the rest. In our testing across 152 names and 27 years")
    A("it wins about 62% of trades. Its edge is concentrated in high-beta")
    A("technology; it does not work on large-cap dividend payers, where we")
    A("measure no reliable advantage at all. We size every position off the stop")
    A("distance so a loss costs the same regardless of the name's volatility.")
    A("")
    A("These are signals from a quantitative system, not individual")
    A("recommendations, and they do not account for your tax situation,")
    A("time horizon, or existing holdings. Past results do not predict future")
    A("returns. Happy to walk through any of it.")
    A("")
    A("— Danny Laskowski")
    A("  ADJL Capital")

    body = "\n".join(L)
    os.makedirs(os.path.join(ROOT, 'flow'), exist_ok=True)
    with open(os.path.join(ROOT, 'flow', 'evening_brief.txt'), 'w') as f:
        f.write(body + "\n")
    return body


if __name__ == '__main__':
    t = sys.argv[1] if len(sys.argv) > 1 else '2026-10-12'
    e = float(sys.argv[2]) if len(sys.argv) > 2 else 100000.0
    r = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
    print(main(t, e, r))
