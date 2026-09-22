#!/usr/bin/env python3
"""
Portfolio simulation for TDPS. Per-trade expectancy says nothing about return
until positions compete for capital, so this places every trade on a calendar,
allocates 1/slots of equity to each, and skips signals when every slot is full.

Two traps this exists to avoid:

  1. Ordering bias. Sorting trades by (entry, exit, pnl) makes same-date ties
     break by exit date and then by pnl, so on clustered entry days the sim
     systematically fills its slots with the shortest, worst trades. The first
     version of this did exactly that and reported -12.6% CAGR for a config
     with positive expectancy. Shuffle first, then stable-sort by entry date
     alone, and report a spread across seeds.

  2. Reading aggregate trade profit as return. Summing trade returns ignores
     that they overlap and compound on shared capital.

Result on the full history at 20 slots: shipped TDPS 2.36% CAGR, v3 5.62%,
SPY buy-and-hold 8.34%. See flow/FINDINGS.md.
"""
exec(open('/tmp/claude-0/-home-user/e511f7fa-2251-5829-b743-c2cf14d27d38/scratchpad/lab.py').read())
import datetime as dt

def trades(path,**kw):
    """same engine, but returns (entry_date, exit_date, pnl) so positions can be
    placed on a calendar and competed for capital"""
    cfg=dict(DEF); cfg.update(kw)
    z=prep(path); d,o,h,l,c,slip=z['d'],z['o'],z['h'],z['l'],z['c'],z['slip']
    m50,m200,m10,atr,r2=z['m50'],z['m200'],z['m10'],z['atr'],z['r2']
    n=len(c); out=[]; i=205
    while i<n-2:
        if None in (m50[i],m200[i],atr[i],r2[i],m10[i]): i+=1; continue
        if cfg['start'] and d[i]<cfg['start']: i+=1; continue
        if not (m50[i]>m200[i] and c[i]>m200[i] and r2[i]<cfg['rsi_th']): i+=1; continue
        eb=i+1; entry=o[eb]; ein=entry*(1+slip[eb]+COMM)
        base=entry-cfg['stop']*atr[i]; peak=h[eb]; scaled=False; left=1.0; pnl=0.0
        j=eb+1; done=False
        while j<n and not done:
            peak=max(peak,h[j]); stop=max(base,entry) if (scaled and cfg['be']) else base
            if l[j]<=stop:
                px=min(o[j],stop); pnl+=left*(px*(1-slip[j]-COMM)/ein-1.0); done=True; break
            held=j-eb
            if not scaled and cfg['scale']>0 and c[j]>m10[j]:
                pnl+=cfg['scale']*(c[j]*(1-slip[j]-COMM)/ein-1.0); left-=cfg['scale']; scaled=True; j+=1; continue
            if (scaled and c[j]<peak-cfg['trail']*atr[j]) or c[j]<m200[j] or held>=(cfg['hold_post'] if scaled else cfg['hold_pre']):
                pnl+=left*(c[j]*(1-slip[j]-COMM)/ein-1.0); done=True; break
            j+=1
        if not done: break
        out.append((d[eb],d[j],pnl)); i=j+1
    return out

def portfolio(slots, **kw):
    T=[]
    for f in FILES:
        try: T+=trades(f,**kw)
        except Exception: pass
    T.sort()
    eq=1.0; open_pos=[]; taken=skipped=0
    peak=1.0; mdd=0.0
    for ent,ext,pnl in T:
        open_pos=[p for p in open_pos if p[0]>ent]     # free slots whose exit has passed
        for e,g in [p for p in open_pos if p[0]<=ent]: pass
        if len(open_pos)>=slots: skipped+=1; continue
        eq*= (1.0 + pnl/slots)                          # 1/slots of equity per position
        peak=max(peak,eq); mdd=max(mdd,1-eq/peak)
        open_pos.append((ext,pnl)); taken+=1
    ds=[dt.date.fromisoformat(t[0]) for t in T]
    yrs=(max(ds)-min(ds)).days/365.25
    return dict(cagr=100*(eq**(1/yrs)-1), taken=taken, skipped=skipped, mdd=100*mdd, yrs=yrs)

