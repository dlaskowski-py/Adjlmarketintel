#!/usr/bin/env python3
"""
Parameter lab for TDPS v2. Exposes the Pine strategy's inputs as a config so
each one can be swept independently, with indicators cached per symbol.

Import it and call sweep(**overrides) / stat() / line(); see
flow/FINDINGS.md "TDPS v2 - what improves it" for the results and the
robustness grid. Significance is reported as t_date (clustered by entry date),
never the stock-day t, because entries bunch on market-wide down days.
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

CACHE={}
def prep(path):
    if path in CACHE: return CACHE[path]
    d,o,h,l,c=load(path)
    raw=[float(r['close']) for r in csv.DictReader(open(path))]
    slip=[0.05/max(r,1e-9) for r in raw]
    z=dict(d=d,o=o,h=h,l=l,c=c,slip=slip,m50=sma(c,50),m200=sma(c,200),m10=sma(c,10),
           atr=dmi_atr(h,l,c,14)[1],r2=rsi(c,2))
    CACHE[path]=z; return z

DEF=dict(rsi_th=15,stop=3.0,trail=3.0,scale=0.70,be=True,hold_pre=15,hold_post=40,mkt=None)
def run(path,**kw):
    cfg=dict(DEF); cfg.update(kw)
    z=prep(path); d,o,h,l,c,slip=z['d'],z['o'],z['h'],z['l'],z['c'],z['slip']
    m50,m200,m10,atr,r2=z['m50'],z['m200'],z['m10'],z['atr'],z['r2']
    n=len(c); out=[]; i=205
    while i<n-2:
        if None in (m50[i],m200[i],atr[i],r2[i],m10[i]): i+=1; continue
        if cfg['start'] and d[i]<cfg['start']: i+=1; continue
        if not (m50[i]>m200[i] and c[i]>m200[i] and r2[i]<cfg['rsi_th']): i+=1; continue
        if cfg['mkt'] is not None and not cfg['mkt'].get(d[i],False): i+=1; continue
        eb=i+1; entry=o[eb]; ein=entry*(1+slip[eb]+COMM)
        base=entry-cfg['stop']*atr[i]; peak=h[eb]; scaled=False; left=1.0; pnl=0.0
        j=eb+1; done=None
        while j<n and done is None:
            peak=max(peak,h[j])
            stop=max(base,entry) if (scaled and cfg['be']) else base
            if l[j]<=stop:
                px=min(o[j],stop); pnl+=left*(px*(1-slip[j]-COMM)/ein-1.0); done='stop'; break
            held=j-eb
            if not scaled and cfg['scale']>0 and c[j]>m10[j]:
                pnl+=cfg['scale']*(c[j]*(1-slip[j]-COMM)/ein-1.0); left-=cfg['scale']; scaled=True; j+=1; continue
            if (scaled and c[j]<peak-cfg['trail']*atr[j]) or c[j]<m200[j] or held>=(cfg['hold_post'] if scaled else cfg['hold_pre']):
                pnl+=left*(c[j]*(1-slip[j]-COMM)/ein-1.0); done='exit'; break
            j+=1
        if done is None: break
        out.append((d[i],pnl,done,scaled)); i=j+1
    return out
DEF['start']=None

FILES=sorted(p for p in glob.glob('data/*_daily_adj.csv') if 'SPY' not in os.path.basename(p))
def sweep(**kw):
    R=[]
    for f in FILES:
        try: R+=run(f,**kw)
        except Exception: pass
    return R

def stat(R):
    xs=[p for _,p,_,_ in R]
    if len(xs)<30: return None
    w=[x for x in xs if x>0]; gl=-sum(x for x in xs if x<=0)
    byd=collections.defaultdict(list)
    for dt,p,_,_ in R: byd[dt].append(p)
    dm=[statistics.fmean(v) for v in byd.values()]
    t=statistics.fmean(dm)/(statistics.stdev(dm)/len(dm)**0.5)
    return dict(n=len(xs),win=100*len(w)/len(xs),exp=100*statistics.fmean(xs),
                pf=sum(w)/gl if gl>0 else 99.9,t=t)
def line(lab,s):
    if s is None: print(f"  {lab:<26} too few"); return
    print(f"  {lab:<26} n={s['n']:>5}  win={s['win']:>5.1f}%  exp={s['exp']:>+6.3f}%  PF={s['pf']:>5.2f}  t_date={s['t']:>5.2f}")
