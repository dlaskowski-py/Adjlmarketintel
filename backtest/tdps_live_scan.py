#!/usr/bin/env python3
"""
Scan for TDPS BUY MARKERS as the Pine script actually draws them.

The trap this exists to avoid: `buySignal` is only the first of three AND-ed
terms in the script's plotshape.

    plotshape(buySignal and strategy.position_size <= 0 and plannedQty >= 1, ...)

Reporting buySignal alone overstates the list badly, because TDPS holds a
position for 12-40 bars and most oversold readings land while it is ALREADY
LONG - and pyramiding=0 means no marker and no second entry. A naive
"did it fire in the last N bars" check does not substitute for replaying the
position state: the runner can be held 40 bars, far past any short lookback.

So this replays the whole strategy bar by bar per symbol - entries, the 70%
scale at the snapback, the breakeven ratchet, the chandelier trail, the trend
break and the bar caps - and reports a name only when all three gates pass on
the final bar.

Defaults mirror the shipped v2 script: initial_capital 10000, risk-based
sizing, riskPercent 1.0. Those matter: at $10k/1% the share count floors to 0
on the highest-priced names, which silently suppresses the marker.
"""
import sys, glob, os, csv, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__))))
from engine import load, sma, rma, dmi_atr

def rsi(c, n=2):
    g, l = [0.0], [0.0]
    for i in range(1, len(c)):
        ch = c[i] - c[i-1]
        g.append(max(ch, 0.0)); l.append(max(-ch, 0.0))
    ag, al = rma(g, n), rma(l, n)
    return [None if a is None or b is None else (100.0 if b == 0 else 100-100/(1+a/b))
            for a, b in zip(ag, al)]

def replay(path, equity0=10000.0, riskPct=1.0, useFixedDollar=False, dollars=1250.0,
           rsiTh=15, stopMult=3.0, trailMult=3.0, scalePct=0.70,
           holdPre=15, holdRun=40):
    d, o, h, l, c = load(path)
    raw = [float(r['close']) for r in csv.DictReader(open(path))]
    m50, m200, m10 = sma(c, 50), sma(c, 200), sma(c, 10)
    _, atr = dmi_atr(h, l, c, 14)
    r2 = rsi(c, 2)
    eq = equity0
    pos = 0.0; entryPx = 0.0; entryStop = None; peak = None; scaled = False; eb = None
    out = None
    for i in range(205, len(c)):
        if None in (m50[i], m200[i], m10[i], atr[i], r2[i]):
            continue
        up = m50[i] > m200[i] and c[i] > m200[i]
        buy = up and r2[i] < rsiTh
        sd = stopMult * atr[i]
        rawQty = (eq * riskPct / 100.0) / sd if sd > 0 else 0.0
        afford = eq / c[i] if c[i] > 0 else 0.0
        target = (dollars / c[i] if c[i] > 0 else 0.0) if useFixedDollar else rawQty
        planned = math.floor(min(target, afford))
        if pos > 0:                              # manage the open trade first
            held = i - eb
            peak = max(peak, h[i])
            sl = max(entryStop, entryPx) if scaled else entryStop
            if held > 0 and l[i] <= sl:
                px = min(o[i], sl); eq += pos * (px - entryPx); pos = 0.0
            elif held > 0 and not scaled and scalePct > 0 and c[i] > m10[i]:
                eq += pos * scalePct * (c[i] - entryPx); pos *= (1 - scalePct); scaled = True
            elif held > 0 and ((scaled and c[i] < peak - trailMult * atr[i])
                               or c[i] < m200[i]
                               or held >= (holdRun if scaled else holdPre)):
                eq += pos * (c[i] - entryPx); pos = 0.0
        marker = buy and pos <= 0 and planned >= 1
        if i == len(c) - 1:
            out = dict(date=d[i], px=raw[i], r2=r2[i], up=up, buy=buy, pos=pos,
                       planned=planned, rawQty=rawQty, stop=raw[i]*(1-sd/c[i]),
                       atrp=100*atr[i]/c[i], marker=marker, heldSince=(d[eb] if pos > 0 else None),
                       heldBars=(i - eb if pos > 0 else 0), scaled=scaled if pos > 0 else False)
        if marker:
            pos = float(planned); entryPx = c[i]; entryStop = c[i] - sd
            peak = h[i]; scaled = False; eb = i
    return out

if __name__ == "__main__":
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    files = sorted(p for p in glob.glob(os.path.join(root, 'data', '*_daily_adj.csv'))
                   if 'SPY' not in os.path.basename(p))
    markers = []; blocked_pos = []; blocked_size = []
    for p in files:
        sym = os.path.basename(p).split('_')[0]
        try: r = replay(p)
        except Exception: continue
        if r is None: continue
        if r['marker']: markers.append((sym, r))
        elif r['buy'] and r['pos'] > 0: blocked_pos.append((sym, r))
        elif r['buy'] and r['planned'] < 1: blocked_size.append((sym, r))
    asof = markers[0][1]['date'] if markers else (blocked_pos[0][1]['date'] if blocked_pos else '?')
    print(f"TDPS BUY MARKERS — bar of {asof}   ({len(files)} names)\n")
    if not markers:
        print("   *** the script draws NO BUY marker on any name ***\n")
    else:
        print(f"   {'sym':<6} {'close':>9} {'RSI2':>6} {'shares':>7} {'3ATR stop':>10} {'ATR%':>6}")
        for s, r in sorted(markers, key=lambda x: x[1]['r2']):
            print(f"   {s:<6} {r['px']:>9.2f} {r['r2']:>6.1f} {r['planned']:>7d} "
                  f"{r['stop']:>10.2f} {r['atrp']:>5.2f}%")
    print(f"\n   entry condition true but ALREADY LONG, so no marker ({len(blocked_pos)}):")
    for s, r in sorted(blocked_pos, key=lambda x: x[0]):
        print(f"     {s:<6} RSI(2) {r['r2']:>5.1f}  holding since {r['heldSince']} "
              f"({r['heldBars']} bars, {'scaled' if r['scaled'] else 'not scaled'})")
    if blocked_size:
        print(f"\n   entry condition true but SIZE FLOORS TO 0, so no marker ({len(blocked_size)}):")
        for s, r in sorted(blocked_size, key=lambda x: x[0]):
            print(f"     {s:<6} wants {r['rawQty']:.2f} shares at $10k/1% risk")
