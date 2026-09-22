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

CFG={"shipped 70/3.0/3.0/BE":dict(),
     "v3 30/4.5/4.0/BE":dict(scale=0.30,stop=4.5,trail=4.0,be=True),
     "30/4.5/4.0 no BE":dict(scale=0.30,stop=4.5,trail=4.0,be=False),
     "0/12/12 hold 250":dict(scale=0.0,stop=12.0,trail=12.0,be=False,hold_pre=250,hold_post=250)}
print("Portfolio simulation, full history, equal 1/slots of equity per position,")
print("signals skipped when every slot is full.\n")
print(f"  {'config':<24} {'slots':>5} {'CAGR':>8} {'taken':>7} {'skipped':>8} {'maxDD':>7}")
for nm,kw in CFG.items():
    for s in (5,10,20):
        r=portfolio(s,start=None,**kw)
        print(f"  {nm:<24} {s:>5} {r['cagr']:>7.2f}% {r['taken']:>7} {r['skipped']:>8} {r['mdd']:>6.1f}%")
    print()
z=prep('data/SPY_daily_adj.csv'); c=z['c']; d=z['d']
yrs=(dt.date.fromisoformat(d[-1])-dt.date.fromisoformat(d[205])).days/365.25
print(f"  SPY buy and hold over the same window: {100*((c[-1]/c[205])**(1/yrs)-1):.2f}% CAGR")
