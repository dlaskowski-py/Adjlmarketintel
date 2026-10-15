#!/usr/bin/env python3
"""The 4:20pm job: refresh every series, run the strategies, publish.

Run by bitbucket-pipelines.yml on TWO daily schedules, 20:00 and 21:00 UTC.
Two, because Bitbucket schedules are in UTC and New York is not: 4:20pm is
20:20 UTC under daylight time and 21:20 UTC under standard time, and a single
fixed schedule would publish an hour early or late for half the year. Each
run decides for itself whether it is the one that should act:

  weekend                         -> exit, nothing to do
  already published today         -> exit (the other schedule got there first)
  before 4:15pm New York
      and within MAX_WAIT of it   -> sleep until 4:15, then run
      and further off             -> exit; this is the wrong season's schedule
  SPY has no bar for today        -> exit: a market holiday, or the vendor has
                                     not posted yet -- in which case the later
                                     schedule, an hour on, picks it up

Publishing itself is idempotent (published rows are never rewritten), so the
guards exist to save build minutes and to make the logs say why a run did
nothing, not to prevent a double publish.

A run that refreshes but finds most of the universe stale is NOT silent:
run_strategies.py refuses to publish below 90% coverage and exits non-zero, so
the pipeline fails and Bitbucket says so. A failed run is the correct outcome
when the data is not there; a quiet partial publish is not.

Usage:
  python3 scripts/daily_job.py              # what the pipeline runs
  python3 scripts/daily_job.py --dry-run    # print the decision only
"""
import os, sys, csv, json, time, subprocess, urllib.request, datetime as dt
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NY = ZoneInfo('America/New_York')
READY_AT = dt.time(16, 15)        # close + 15 minutes for the vendor to post
MAX_WAIT = 35 * 60                # seconds a run will sleep for the close


def log(msg):
    print(f"[daily_job {dt.datetime.now(NY):%Y-%m-%d %H:%M %Z}] {msg}", flush=True)


def published(day):
    url = os.environ.get('SUPABASE_URL')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    if not (url and key):
        return False
    req = urllib.request.Request(
        f"{url}/rest/v1/strategy_runs?asof=eq.{day}&select=asof",
        headers={'apikey': key, 'Authorization': f'Bearer {key}'})
    with urllib.request.urlopen(req, timeout=20) as r:
        return len(json.loads(r.read() or b'[]')) > 0


def spy_last():
    rows = list(csv.DictReader(open(os.path.join(ROOT, 'data', 'SPY_daily_adj.csv'))))
    return rows[-1]['date']


def run(cmd):
    log('$ ' + ' '.join(cmd))
    return subprocess.call(cmd, cwd=ROOT)


def decide(now):
    """Return (action, reason). Pure, so the schedule logic is testable."""
    if now.weekday() >= 5:
        return 'exit', 'weekend'
    ready = now.replace(hour=READY_AT.hour, minute=READY_AT.minute, second=0, microsecond=0)
    if now < ready:
        wait = (ready - now).total_seconds()
        if wait > MAX_WAIT:
            return 'exit', f'{int(wait // 60)} min before the close; the later schedule runs'
        return 'wait', f'sleeping {int(wait // 60)} min until {READY_AT:%H:%M}'
    return 'run', 'after the close'


def main(argv):
    now = dt.datetime.now(NY)
    today = now.date().isoformat()
    action, why = decide(now)
    if action == 'run' or action == 'wait':
        if published(today):
            action, why = 'exit', f'{today} already published'
    log(f'{action}: {why}')
    if '--dry-run' in argv or action == 'exit':
        return 0
    if action == 'wait':
        time.sleep((now.replace(hour=READY_AT.hour, minute=READY_AT.minute,
                                second=0, microsecond=0) - now).total_seconds())

    if run([sys.executable, 'scripts/refresh_universe.py']) != 0:
        log('refresh failed'); return 1
    last = spy_last()
    if last != today:
        log(f'SPY ends {last}, not {today}: a market holiday, or the vendor has not '
            f'posted yet. Not publishing; the later schedule will retry.')
        return 0
    return run([sys.executable, 'backtest/run_strategies.py', today, '--publish'])


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
