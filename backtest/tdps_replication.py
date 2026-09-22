#!/usr/bin/env python3
"""
Independent replication of "Trend Pullback Swing v2 [QuantPad]" (TDPS).

Re-implements the Pine strategy from its source so three things can be measured
that the Strategy Tester cannot report about itself:

  1. per-POSITION statistics. A 70% scale-out is a separate closed trade in
     TradingView, so its win rate and expectancy are computed over exit LEGS.
     The two conventions differ by a lot: on this universe the leg-level
     expectancy is +0.97% against +0.21% per position, because the scale leg
     books 70% of a position but is counted at its full percentage return.

  2. whether the entry survives realistic fills. The Pine script runs with
     process_orders_on_close, which decides on the close and fills at that same
     close. This fills at the NEXT OPEN instead.

  3. whether the RSI(2) pullback adds anything over simply being long in the
     same 50/200 uptrend with the same exits - the blind control that every
     other signal tested in this repository failed.

Costs: 0.05% commission per side, plus 5 ticks of slippage per side measured
against the RAW quoted price and then applied on the back-adjusted scale. Charging
a flat $0.05 on back-adjusted prices instead bills up to 14.8% per side on
1999-era bars and turns the result negative - the earlier draft of this script
did exactly that.

Significance is reported twice. Entries cluster across names on market-wide
down days (up to 23 names on one date), so the stock-day t-statistic overstates
the evidence; the by-date and paired same-date figures are the honest ones.
"""
import sys, os, glob, csv, statistics, collections, math
sys.path.insert(0,'backtest')
from engine import load, sma, rma, dmi_atr
COMM=0.0005
def rsi(c,n=2):
    g,l=[0.0],[0.0]
    for i in range(1,len(c)):
        ch=c[i]-c[i-1]; g.append(max(ch,0.0)); l.append(max(-ch,0.0))
    ag,al=rma(g,n),rma(l,n)
    return [None if a is None or b is None else (100.0 if b==0 else 100-100/(1+a/b)) for a,b in zip(ag,al)]

def run(path, sig, start=None):
    d,o,h,l,c=load(path)
    raw=[float(r['close']) for r in csv.DictReader(open(path))]
    slip=[0.05/max(r,1e-9) for r in raw]
    n=len(c); m50,m200,m10=sma(c,50),sma(c,200),sma(c,10)
    _,atr=dmi_atr(h,l,c,14); r2=rsi(c,2)
    out=[]; i=205
    while i<n-2:
        if None in (m50[i],m200[i],atr[i],r2[i],m10[i]): i+=1; continue
        if start and d[i]<start: i+=1; continue
        if not sig(m50[i],m200[i],c[i],r2[i]): i+=1; continue
        eb=i+1; entry=o[eb]; ein=entry*(1+slip[eb]+COMM)
        base=entry-3.0*atr[i]; peak=h[eb]; scaled=False; left=1.0; pnl=0.0
        j=eb+1; done=False
        while j<n and not done:
            peak=max(peak,h[j]); stop=max(base,entry) if scaled else base
            if l[j]<=stop:
                px=min(o[j],stop); pnl+=left*(px*(1-slip[j]-COMM)/ein-1.0); done=True; break
            held=j-eb
            if not scaled and c[j]>m10[j]:
                pnl+=0.70*(c[j]*(1-slip[j]-COMM)/ein-1.0); left-=0.70; scaled=True; j+=1; continue
            if (scaled and c[j]<peak-3.0*atr[j]) or c[j]<m200[j] or held>=(40 if scaled else 15):
                pnl+=left*(c[j]*(1-slip[j]-COMM)/ein-1.0); done=True; break
            j+=1
        if not done: break
        out.append((d[i],pnl)); i=j+1
    return out

def report(name, rows):
    xs=[p for _,p in rows]
    m=statistics.fmean(xs); t_naive=m/(statistics.stdev(xs)/len(xs)**0.5)
    byd=collections.defaultdict(list)
    for dt,p in rows: byd[dt].append(p)
    dm=[statistics.fmean(v) for v in byd.values()]
    md=statistics.fmean(dm); td=md/(statistics.stdev(dm)/len(dm)**0.5)
    mx=max(len(v) for v in byd.values())
    print(f"  {name}")
    print(f"      stock-days n={len(xs):>6}  exp={100*m:+.3f}%  t={t_naive:>5.2f}   <- assumes independence")
    print(f"      by DATE    n={len(dm):>6}  exp={100*md:+.3f}%  t={td:>5.2f}   <- clustered, {len(xs)/len(dm):.1f} names/date, max {mx}")

SIG={"TDPS      trend + RSI(2)<15":lambda f,s,c,r: f>s and c>s and r<15,
     "control A trend only       ":lambda f,s,c,r: f>s and c>s}
files=sorted(p for p in glob.glob('data/*_daily_adj.csv') if 'SPY' not in os.path.basename(p))
for start,era in ((None,"full history"),("2023-01-01","2023-2026")):
    print(f"=== {era} ===")
    store={}
    for nm,fn in SIG.items():
        R=[]
        for f in files:
            try: R+=run(f,fn,start)
            except Exception: pass
        store[nm]=R; report(nm,R)
    # paired by date: does TDPS beat the control on the SAME days?
    a=collections.defaultdict(list); b=collections.defaultdict(list)
    for dt,p in store["TDPS      trend + RSI(2)<15"]: a[dt].append(p)
    for dt,p in store["control A trend only       "]: b[dt].append(p)
    common=sorted(set(a)&set(b))
    diff=[statistics.fmean(a[d])-statistics.fmean(b[d]) for d in common]
    md=statistics.fmean(diff); t=md/(statistics.stdev(diff)/len(diff)**0.5)
    print(f"  PAIRED same-date difference (TDPS - control A)")
    print(f"      n={len(diff)} dates  mean=+{100*md:.3f}pp  t={t:.2f}")
    print()
