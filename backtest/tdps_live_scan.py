#!/usr/bin/env python3
"""Superseded by tdps_scan_date.py, which takes its position state from the
single replay in run_strategies.py.

This file carried its own replay, and it tested `pos <= 0` for the BUY marker
AFTER managing exits on the same bar -- so a position that closed on bar i
could re-signal on bar i. Pine cannot do that: position_size during a bar's
execution is the start-of-bar value, and v5 runs its entry block before its
exits. The same defect, copied into tdps_scan_date.py, reported AMAT and MU as
buys on 2026-10-13 (both runners actually closed that bar; the markers came a
day later) and AMD on 2026-10-14 (an exit bar). Its one recorded result, MSI
and HPQ on 2026-10-09, was re-checked with the fixed replay and stands.

Kept as a pointer so nothing that imports or runs it silently uses the old
logic.
"""
import os, sys, subprocess

if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    sys.exit(subprocess.call([sys.executable, os.path.join(here, 'tdps_scan_date.py')]
                             + sys.argv[1:]))
