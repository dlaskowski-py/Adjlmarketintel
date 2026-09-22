import sys, os, glob, csv, statistics as st, collections, random, datetime as dt
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
def prep(p):
    if p in CACHE: return CACHE[p]
    d,o,h,l,c=load(p)
    raw=[float(r['close']) for r in csv.DictReader(open(p))]
    ro=[float(r['open']) for r in csv.DictReader(open(p))]
    z=dict(d=d,o=o,h=h,l=l,c=c,slip=[0.05/max(x,1e-9) for x in raw],rawopen=ro,
           m50=sma(c,50),m200=sma(c,200),m10=sma(c,10),atr=dmi_atr(h,l,c,14)[1],r2=rsi(c,2))
    CACHE[p]=z; return z

V2=dict(scale=0.70,stop=3.0,trail=3.0,be=True)
V3=dict(scale=0.30,stop=4.5,trail=4.0,be=True)

def trades(path,start=None,end=None,rsi_th=15,scale=0.70,stop=3.0,trail=3.0,be=True,
           hold_pre=15,hold_post=40):
    z=prep(path); d,o,h,l,c,slip=z['d'],z['o'],z['h'],z['l'],z['c'],z['slip']
    m50,m200,m10,atr,r2=z['m50'],z['m200'],z['m10'],z['atr'],z['r2']
    n=len(c); out=[]; i=205
    while i<n-2:
        if None in (m50[i],m200[i],atr[i],r2[i],m10[i]): i+=1; continue
        if start and d[i]<start: i+=1; continue
        if end and d[i]>end: break
        if not (m50[i]>m200[i] and c[i]>m200[i] and r2[i]<rsi_th): i+=1; continue
        eb=i+1; entry=o[eb]; ein=entry*(1+slip[eb]+COMM)
        base=entry-stop*atr[i]; peak=h[eb]; scaled=False; left=1.0; pnl=0.0
        j=eb+1; done=False
        while j<n and not done:
            peak=max(peak,h[j]); s=max(base,entry) if (scaled and be) else base
            if l[j]<=s:
                px=min(o[j],s); pnl+=left*(px*(1-slip[j]-COMM)/ein-1.0); done=True; break
            held=j-eb
            if not scaled and scale>0 and c[j]>m10[j]:
                pnl+=scale*(c[j]*(1-slip[j]-COMM)/ein-1.0); left-=scale; scaled=True; j+=1; continue
            if (scaled and c[j]<peak-trail*atr[j]) or c[j]<m200[j] or held>=(hold_post if scaled else hold_pre):
                pnl+=left*(c[j]*(1-slip[j]-COMM)/ein-1.0); done=True; break
            j+=1
        if not done: break
        out.append((d[eb],d[j],pnl,z['rawopen'][eb])); i=j+1
    return out

def account(T,slots,cap=50000.0,seed=0):
    r=random.Random(seed); T=T[:]; r.shuffle(T); T.sort(key=lambda x:x[0])
    eq=cap; live=[]; peak=cap; mdd=0.0; taken=0
    for ent,ext,pnl,px in T:
        live=[e for e in live if e>ent]
        if len(live)>=slots: continue
        sh=int((eq/slots)/px)
        if sh<1: continue
        eq += sh*px*pnl; peak=max(peak,eq); mdd=max(mdd,1-eq/peak)
        live.append(ext); taken+=1
    return eq,100*mdd,taken

# Defensive = consumer staples, utilities, health care, telecom. Everything else
# (tech, discretionary, industrials, financials, energy, materials) is cyclical.
DEF_SET={'ABT','AMGN','BMY','CL','COST','DUK','GILD','JNJ','KO','LLY','MDT','MO',
         'MRK','PEP','PFE','PG','SO','T','UNH','VZ','WMT'}
ALL=sorted(p for p in glob.glob('data/*_daily_adj.csv') if 'SPY' not in os.path.basename(p))
sym=lambda p: os.path.basename(p).split('_')[0]
DEFN=[p for p in ALL if sym(p) in DEF_SET]
CYCL=[p for p in ALL if sym(p) not in DEF_SET]

def pool(files,**kw):
    T=[]
    for f in files:
        try: T+=trades(f,**kw)
        except Exception: pass
    return T
def exp_(T):
    if len(T)<25: return None
    xs=[p for _,_,p,_ in T]
    byd=collections.defaultdict(list)
    for d,_,p,_ in T: byd[d].append(p)
    dm=[st.fmean(v) for v in byd.values()]
    t=st.fmean(dm)/(st.stdev(dm)/len(dm)**0.5) if len(dm)>2 else 0
    return dict(n=len(xs),e=100*st.fmean(xs),t=t)
