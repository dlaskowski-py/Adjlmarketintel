#!/usr/bin/env python3
"""Run every strategy that survived testing, and emit the day's actions.

This is the job behind the 4:20pm portal update. It lives in the private
research repo and is the ONLY place the strategy rules exist. What leaves this
file is a list of actions tagged with REASON CODES -- `tdps.entry.washout`,
never "RSI(2) 7.6 < 15". The investor portal maps codes to plain-language
sentences. That keeps the published side legible to a non-quant reader while
revealing nothing that lets someone reconstruct a system, which is the standing
rule in the website's shared/signal.mjs.

── WHICH STRATEGIES, AND WHY ONLY THESE ───────────────────────────────

Only strategies that beat their blind control in flow/FINDINGS.md run here:

  tdps_conservative   2-day washout inside a 50/200 uptrend; 70% scale-out
  tdps_aggressive     same entry; no scale-out, wide stop, long hold
  btc_trend           30/150 trend regime on BTC/USD -- all 32 grid cells
                      beat buy-and-hold, improves return AND drawdown
  market_regime       SPY 50/200 as a state, not an event -- modest
                      drawdown control, shown as context

McClellan, volume shelves, the short systems and the overnight anomaly all
failed. Showing an investor a buy from a system that loses to random entry
would undercut everything that does work, so they are not here.

── TDPS PUBLISHES ONLY WHERE ITS EDGE WAS MEASURED ────────────────────

Measured in ATR units, TDPS returns +0.213 per trade on established tech
(t=3.98) and +0.234 on modern growth (t=4.27), but +0.062 on old-economy large
caps at t=1.41 -- indistinguishable from zero. So the default publishing
universe is tech + growth. `--all-cohorts` includes the rest, flagged.

── TIMING ─────────────────────────────────────────────────────────────

Every action is decided on a day's close and executed at the next open. The
backtest fills exits at the close, which a reader of a 4:20pm email cannot do,
so every action is framed as "at tomorrow's open". Entries already filled at
the open that way.

── PUBLISHED HISTORY IS IMMUTABLE ─────────────────────────────────────

The model book is reconstructed by replay, which is deterministic for a given
data set but can shift if a vendor revises an old bar. So each run writes only
its own date's actions, and a published row is never rewritten. A reader who
saw "BUY AMAT" on Tuesday keeps seeing it, whatever Wednesday's replay says.

── COVERAGE GUARD ─────────────────────────────────────────────────────

A run where most of the universe is stale would publish a partial picture as
if it were complete. Below --min-coverage (default 90% of the publishing
universe current to the target date) the run is marked partial and refuses
to publish.

Usage:
  python3 backtest/run_strategies.py 2026-10-14
  python3 backtest/run_strategies.py 2026-10-14 --publish      # needs Supabase env
  python3 backtest/run_strategies.py 2026-10-14 --all-cohorts --min-coverage 0
"""
import sys, os, csv, glob, json, math, datetime as dt, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'backtest'))
from engine import sma, rma, dmi_atr
from price_basis import bases

# ── TDPS rules. These numbers never leave this repo. ──────────────────
FAST, SLOW, SNAP, ATR_LEN, RSI_LEN, RSI_MAX = 50, 200, 10, 14, 2, 15
WARMUP = 260
MODES = {
    'tdps_conservative': dict(stop=3.0, scale=0.70, trail=3.0, be=True,
                              cap_pre=15, cap_run=40),
    'tdps_aggressive':   dict(stop=12.0, scale=0.0, trail=12.0, be=False,
                              cap_pre=250, cap_run=250),
}
BTC_FAST, BTC_SLOW = 30, 150

# ── Cohorts, from the measured split in FINDINGS.md ───────────────────
TECH = {'NVDA', 'TSLA', 'AMD', 'GOOGL', 'AMZN', 'MSFT', 'AAPL', 'ADBE', 'MU',
        'QCOM', 'AMAT', 'INTC', 'ORCL', 'CSCO', 'TXN', 'V'}
GROWTH = {'UBER', 'ABNB', 'PLTR', 'META', 'COIN', 'SHOP', 'CRWD', 'NFLX',
          'SNOW', 'AVGO', 'DASH', 'HOOD', 'DDOG', 'NET', 'PANW', 'NOW', 'SPOT',
          'TTD', 'ANET', 'MRVL', 'SMCI', 'CRM', 'SNAP', 'RBLX', 'ZS', 'ARM',
          'SOFI', 'DKNG'}
EDGE_COHORTS = {'tech', 'growth'}


def cohort(sym):
    return 'tech' if sym in TECH else 'growth' if sym in GROWTH else 'core'


def rsi(c, n):
    g, l = [0.0], [0.0]
    for i in range(1, len(c)):
        ch = c[i] - c[i - 1]
        g.append(max(ch, 0.0)); l.append(max(-ch, 0.0))
    ag, al = rma(g, n), rma(l, n)
    return [None if a is None or b is None else (100.0 if b == 0 else 100 - 100 / (1 + a / b))
            for a, b in zip(ag, al)]


# ── TDPS replay ───────────────────────────────────────────────────────
def tdps_events(TR, P, equity, risk):
    """Replay one name under one mode. Returns (events, open_position).

    Matches strategies/tdps_v5.pine and the backtest in tdps_survivorship.py:

      - a signal on bar i fills at bar i+1's open
      - nothing is managed on the fill bar (v5: canManage = heldBars > 0)
      - exits run stop -> scale -> trail -> trend -> time, first hit wins
      - NO re-entry on the bar a position closes. In Pine, position_size during
        a bar's execution is the position at the START of that bar, and v5
        evaluates its entry block before its exits, so `position_size <= 0` is
        false on an exit bar. The backtest gets this right (`i = j + 1`). The
        first version of this replay did not, and reported AMD as a fresh BUY
        on 2026-10-14 on the same bar its runner closed -- a marker the chart
        would never have drawn.

    check_parity() asserts this replay and the backtest produce the identical
    trade list, so the published signals are the backtested strategy.
    """
    d, o, h, l, c = TR
    n = len(c)
    m50, m200, m10 = sma(c, FAST), sma(c, SLOW), sma(c, SNAP)
    _, atr = dmi_atr(h, l, c, ATR_LEN)
    r2 = rsi(c, RSI_LEN)

    ev = []
    pos = scaled = False
    entry = base = peak = 0.0
    ebar = 0
    pending = None              # ATR at the signal bar, while awaiting the fill
    for i in range(WARMUP, n):
        if None in (m50[i], m200[i], m10[i], atr[i], r2[i]):
            continue
        exited = False
        if pending is not None and not pos:
            pos, scaled, entry, ebar = True, False, o[i], i
            base, peak, pending = entry - P['stop'] * pending, h[i], None
        if pos:
            peak = max(peak, h[i])
            held = i - ebar
            if held > 0:
                stop = max(base, entry) if (scaled and P['be']) else base
                if l[i] <= stop:
                    why = ('tdps.exit.breakeven' if scaled and P['be'] and stop >= entry
                           else 'tdps.exit.stop')
                    ev.append(dict(date=d[i], kind='exit', reason=why,
                                   price=round(min(o[i], stop), 4), entry=entry))
                    pos, exited = False, True
                elif not scaled and P['scale'] > 0 and c[i] > m10[i]:
                    ev.append(dict(date=d[i], kind='scale', reason='tdps.scale.snapback',
                                   price=round(c[i], 4), entry=entry,
                                   fraction=P['scale']))
                    scaled = True
                elif scaled and c[i] < peak - P['trail'] * atr[i]:
                    ev.append(dict(date=d[i], kind='exit', reason='tdps.exit.trail',
                                   price=round(c[i], 4), entry=entry))
                    pos, exited = False, True
                elif c[i] < m200[i]:
                    ev.append(dict(date=d[i], kind='exit', reason='tdps.exit.trend',
                                   price=round(c[i], 4), entry=entry))
                    pos, exited = False, True
                elif held >= (P['cap_run'] if scaled else P['cap_pre']):
                    ev.append(dict(date=d[i], kind='exit', reason='tdps.exit.time',
                                   price=round(c[i], 4), entry=entry))
                    pos, exited = False, True
        if not pos and pending is None and not exited:
            if m50[i] > m200[i] and c[i] > m200[i] and r2[i] < RSI_MAX:
                dist = P['stop'] * atr[i]
                qty = math.floor(equity * risk / dist) if dist > 0 else 0
                if qty >= 1:
                    ev.append(dict(date=d[i], kind='entry', reason='tdps.entry.washout',
                                   price=round(c[i], 4), stop=round(c[i] - dist, 4),
                                   qty=qty))
                    pending = atr[i]
    book = None
    if pos:
        book = dict(entry_date=d[ebar], entry=round(entry, 4), scaled=scaled,
                    bars=n - 1 - ebar, last=round(c[-1], 4),
                    stop=round(max(base, entry) if (scaled and P['be']) else base, 4))
    elif pending is not None:
        book = dict(entry_date=None, pending=True, last=round(c[-1], 4))
    return ev, book


def check_parity(files=None):
    """The published replay must equal the backtested one, trade for trade.

    Compares fill dates from tdps_events (conservative) with the entry dates
    tdps_survivorship.run() reports, across every series. Any mismatch means
    the investor screen would be showing a different strategy from the one
    whose results are in FINDINGS.md.
    """
    from tdps_survivorship import prep, run as bt_run
    files = files or sorted(p for p in glob.glob(os.path.join(ROOT, 'data', '*_daily_adj.csv'))
                            if 'SPY' not in os.path.basename(p))
    bad, n_bt, n_ev = [], 0, 0
    for p in files:
        s = os.path.basename(p).split('_')[0]
        TR, _, _ = bases(p)
        d = TR[0]
        ev, _ = tdps_events(TR, MODES['tdps_conservative'], 1e12, 0.01)
        fills = []
        for e in ev:
            if e['kind'] == 'entry':
                k = d.index(e['date'])
                if k + 1 < len(d):
                    fills.append(d[k + 1])
        # the backtest drops a trade still open at the series end; so must we
        closed = {d[d.index(e['date'])] for e in ev if e['kind'] == 'exit'}
        bt = [t[0] for t in bt_run(prep(p), close_at_end=False)]
        mine = fills[:len(bt)]
        n_bt += len(bt); n_ev += len(mine)
        if mine != bt:
            k = next((i for i, (a, b) in enumerate(zip(mine, bt)) if a != b), min(len(mine), len(bt)))
            bad.append((s, k, mine[k] if k < len(mine) else None, bt[k] if k < len(bt) else None))
    return bad, n_bt, n_ev


# ── BTC trend ─────────────────────────────────────────────────────────
def btc_state(target):
    p = os.path.join(ROOT, 'data', 'BTC_daily.csv')
    rows = [r for r in csv.DictReader(open(p)) if r['date'] <= target]
    if len(rows) < BTC_SLOW + 2:
        return None
    c = [float(r['close']) for r in rows]
    f, s = sma(c, BTC_FAST), sma(c, BTC_SLOW)
    # yesterday's regime sets today's exposure, as in strategies/btc_trend.pine
    on_today = f[-1] > s[-1]
    on_prev = f[-2] > s[-2]
    if on_today and not on_prev:
        kind, why = 'entry', 'btc.entry.trend_up'
    elif on_prev and not on_today:
        kind, why = 'exit', 'btc.exit.trend_down'
    else:
        kind, why = 'hold', 'btc.hold.long' if on_today else 'btc.hold.flat'
    return dict(asof=rows[-1]['date'], kind=kind, reason=why,
                price=round(c[-1], 2), long=on_today)


# ── Market regime ─────────────────────────────────────────────────────
def market_state(target):
    TR, _, _ = bases(os.path.join(ROOT, 'data', 'SPY_daily_adj.csv'))
    d, o, h, l, c = TR
    k = max(i for i, x in enumerate(d) if x <= target)
    m50, m200 = sma(c, FAST), sma(c, SLOW)
    on, was = m50[k] > m200[k], m50[k - 1] > m200[k - 1]
    return dict(asof=d[k], reason='market.risk_on' if on else 'market.risk_off',
                flipped=on != was, price=round(c[k], 2))


# ── Run ───────────────────────────────────────────────────────────────
def run(target, equity=100000.0, risk=0.01, all_cohorts=False, min_cov=0.90):
    files = sorted(p for p in glob.glob(os.path.join(ROOT, 'data', '*_daily_adj.csv'))
                   if 'SPY' not in os.path.basename(p))
    universe, current, stale = [], [], []
    for p in files:
        s = os.path.basename(p).split('_')[0]
        if not all_cohorts and cohort(s) not in EDGE_COHORTS:
            continue
        universe.append(s)
        dates = [r['date'] for r in csv.DictReader(open(p))]
        # current = has a bar ON the target date. For a past target the series
        # is truncated to it below, so any day can be replayed as of its close.
        last = max((x for x in dates if x <= target), default='')
        (current if target in dates else stale).append((s, p, last))

    actions, book = [], []
    for s, p, _ in current:
        TR, _, _ = bases(p)
        k = TR[0].index(target) + 1
        TR = tuple(x[:k] for x in TR)
        for mode, P in MODES.items():
            ev, open_pos = tdps_events(TR, P, equity, risk)
            for e in ev:
                if e['date'] == target:
                    actions.append(dict(strategy=mode, symbol=s, cohort=cohort(s), **e))
            if open_pos and not open_pos.get('pending'):
                book.append(dict(strategy=mode, symbol=s, cohort=cohort(s), **open_pos))

    cov = len(current) / len(universe) if universe else 0.0
    out = dict(
        asof=target,
        generated_at=dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'),
        status='complete' if cov >= min_cov else 'partial',
        coverage=dict(universe=len(universe), current=len(current),
                      fraction=round(cov, 3),
                      stale=sorted(f'{s}:{last}' for s, _, last in stale)),
        actions=sorted(actions, key=lambda a: (a['strategy'], a['kind'], a['symbol'])),
        book=sorted(book, key=lambda b: (b['strategy'], b['symbol'])),
        btc=btc_state(target),
        market=market_state(target),
    )
    return out


# ── Publish (Supabase REST, service role from the environment) ────────
def publish(out):
    url = os.environ.get('SUPABASE_URL')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    if not (url and key):
        sys.exit("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set -- set them as "
                 "pipeline variables, never in a file.")
    if out['status'] != 'complete':
        sys.exit(f"refusing to publish a {out['status']} run: "
                 f"{out['coverage']['current']}/{out['coverage']['universe']} current")

    auth = {'apikey': key, 'Authorization': f'Bearer {key}'}

    def post(table, rows, conflict):
        req = urllib.request.Request(
            f"{url}/rest/v1/{table}?on_conflict={conflict}",
            data=json.dumps(rows).encode(), method='POST',
            headers={**auth, 'Content-Type': 'application/json',
                     # ignore-duplicates, not merge: a published row is never rewritten.
                     # return=representation answers with only the rows this call
                     # inserted, so an existing row comes back as [].
                     'Prefer': 'resolution=ignore-duplicates,return=representation'})
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read() or b'[]')

    # A 12 ATR stop on a volatile name can sit at or below zero (ARM, -12.07):
    # no price stop at all. The table refuses stop <= 0, and one such row would
    # fail the whole batch, so it goes as null -- "no price stop", which the
    # portal shows on a buy as "Trend exit only".
    def price_stop(s):
        return s if s is not None and s > 0 else None

    sig = [dict(asof=out['asof'], strategy=a['strategy'], symbol=a['symbol'],
                kind=a['kind'], reason=a['reason'], price=a['price'],
                stop=price_stop(a.get('stop')), cohort=a['cohort'])
           for a in out['actions']]
    for x in (out['btc'], ):
        if x and x['kind'] != 'hold':
            sig.append(dict(asof=out['asof'], strategy='btc_trend', symbol='BTC',
                            kind=x['kind'], reason=x['reason'], price=x['price'],
                            stop=None, cohort='crypto'))
    run_row = [dict(asof=out['asof'], status=out['status'],
                    generated_at=out['generated_at'],
                    coverage=out['coverage']['fraction'],
                    market_reason=out['market']['reason'],
                    market_flipped=out['market']['flipped'],
                    btc_reason=out['btc']['reason'] if out['btc'] else None,
                    book=[{k: b[k] for k in ('strategy', 'symbol', 'cohort',
                                             'entry_date', 'entry', 'scaled',
                                             'stop', 'last')}
                          for b in out['book']])]
    if not post('strategy_runs', run_row, 'asof'):
        print(f"{out['asof']} was already published; nothing written")
        return
    # The run row goes first (signals reference it), so a failed signals batch
    # would leave a day that reads as published with no actions, and daily_job
    # would skip the retry. Take back the row this call wrote -- it has no
    # signals, since a batch insert is all or nothing -- and fail loudly.
    try:
        if sig:
            post('strategy_signals', sig, 'asof,strategy,symbol,kind')
    except Exception:
        try:
            urllib.request.urlopen(urllib.request.Request(
                f"{url}/rest/v1/strategy_runs?asof=eq.{out['asof']}",
                method='DELETE', headers=auth), timeout=30).close()
            print(f"signals failed; withdrew the {out['asof']} run row so a retry can publish it",
                  file=sys.stderr)
        except Exception as e:
            print(f"signals failed AND the {out['asof']} run row could not be withdrawn ({e}); "
                  f"delete it by hand or the day stays empty", file=sys.stderr)
        raise
    print(f"published {out['asof']}: {len(sig)} actions, {len(out['book'])} open")


def main(argv):
    if '--parity' in argv:
        bad, a, b = check_parity()
        print(f"parity: backtest {a} trades, replay {b} trades, "
              f"{len(bad)} series disagree")
        for s, k, mine, bt in bad[:15]:
            print(f"  {s:<6} trade #{k}: replay fills {mine}, backtest {bt}")
        sys.exit(1 if bad else 0)
    pos = [a for a in argv if not a.startswith('--')]
    target = pos[0] if pos else dt.date.today().isoformat()
    allc = '--all-cohorts' in argv
    mc = 0.90
    if '--min-coverage' in argv:
        mc = float(argv[argv.index('--min-coverage') + 1])
    out = run(target, all_cohorts=allc, min_cov=mc)
    path = os.path.join(ROOT, 'flow', f'signals_{target}.json')
    with open(path, 'w') as f:
        json.dump(out, f, indent=1)
    if '--publish' in argv:
        publish(out)
    return out, path


if __name__ == '__main__':
    out, path = main(sys.argv[1:])
    c = out['coverage']
    print(f"{out['asof']}  {out['status'].upper()}  "
          f"coverage {c['current']}/{c['universe']} ({100*c['fraction']:.0f}%)  -> {path}\n")
    m, b = out['market'], out['btc']
    print(f"  market   {m['reason']}{'  ** FLIPPED **' if m['flipped'] else ''}  (SPY {m['price']})")
    if b:
        print(f"  btc      {b['reason']}  {b['kind'].upper()}  (as of {b['asof']}, {b['price']:,})")
    print()
    for a in out['actions']:
        extra = f"  stop {a['stop']}" if a.get('stop') else ''
        print(f"  {a['strategy']:<18} {a['kind'].upper():<6} {a['symbol']:<6} "
              f"{a['price']:>10}  {a['reason']}{extra}")
    if not out['actions']:
        print("  no TDPS actions")
    print(f"\n  model book: {len(out['book'])} open across both TDPS modes")
