"""Chapter 1 per-cell / per-stage first-clear times. python an_ch1.py A5 [C5 ...]"""
import json
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'sim_out'
K = 1.04  # sim min -> user min (2026-10-24 human-mimic wall clock)
CELLS = [1011, 1012, 1013, 1021, 1022, 1023, 1031, 1032, 1033, 1041, 1042, 1043, 1051]
STAGES = [(1, [1011, 1012, 1013]), (2, [1021, 1022, 1023]), (3, [1031, 1032, 1033]), (4, [1041, 1042, 1043]), (5, [1051])]
NAME = {c: f"{c // 1000}-{(c // 10) % 100} {'I' * (c % 10)}" for c in CELLS}


def q(xs, p):
    xs = sorted(xs)
    if not xs:
        return float('nan')
    i = (len(xs) - 1) * p
    lo = int(i)
    hi = min(lo + 1, len(xs) - 1)
    return xs[lo] + (xs[hi] - xs[lo]) * (i - lo)


for tag in sys.argv[1:]:
    d = json.loads((OUT / f'{tag}.txt').read_text(encoding='utf-8'))
    out = d['out']
    seeds = sorted(o['seed'] for o in out)
    half = set(seeds[:len(seeds) // 2])
    print(f'=== {tag} · seeds {len(out)} · stuck {[(o["seed"], o["stuck"]["stageId"]) for o in out if o["stuck"]]}')
    clear = {}   # seed -> cell -> (user min cumulative, lv, tries)
    for o in out:
        clear[o['seed']] = {r['stageId']: (r['tClear'] / 60 * K, r['clear']['lv'], r['tries'], r['farm']) for r in o['stages'] if r['tClear'] is not None}
    ok = [s for s in seeds if 1051 in clear[s]]
    print(f'finished ch1: {len(ok)}/{len(seeds)}')
    print('cell     | cum med [IQR]          | this cell med [IQR]    | lv  | 1st-try')
    for i, c in enumerate(CELLS):
        cum = [clear[s][c][0] for s in ok]
        prev = CELLS[i - 1] if i else None
        inc = [clear[s][c][0] - (clear[s][prev][0] if prev else 0) for s in ok]
        lv = [clear[s][c][1] for s in ok]
        first = sum(1 for s in ok if clear[s][c][2] == 1)
        print(f'{NAME[c]:8} | {q(cum, .5):6.1f} [{q(cum, .25):5.1f} ~ {q(cum, .75):6.1f}] | {q(inc, .5):5.1f} [{q(inc, .25):5.1f} ~ {q(inc, .75):6.1f}] | {q(lv, .5):4.1f} | {first}/{len(ok)}')
    print('stage    | this stage med [IQR] p90        | mean  | share of total | halves (med)')
    tot = sum(clear[s][1051][0] for s in ok)
    for n, cells in STAGES:
        prev = {1: None, 2: 1013, 3: 1023, 4: 1033, 5: 1043}[n]
        inc = {s: clear[s][cells[-1]][0] - (clear[s][prev][0] if prev else 0) for s in ok}
        v = list(inc.values())
        h1 = [inc[s] for s in ok if s in half]
        h2 = [inc[s] for s in ok if s not in half]
        print(f'1-{n}      | {q(v, .5):5.1f} [{q(v, .25):5.1f} ~ {q(v, .75):6.1f}] p90 {q(v, .9):6.1f} | {sum(v) / len(v):6.1f} | {sum(v) / tot * 100:4.0f}% | {q(h1, .5):.1f} / {q(h2, .5):.1f}')
    v = [clear[s][1051][0] for s in ok]
    h1 = [clear[s][1051][0] for s in ok if s in half]
    h2 = [clear[s][1051][0] for s in ok if s not in half]
    print(f'ch1 total | {q(v, .5):.1f} [{q(v, .25):.1f} ~ {q(v, .75):.1f}] p10 {q(v, .1):.1f} p90 {q(v, .9):.1f} | mean {sum(v) / len(v):.1f} | halves {q(h1, .5):.1f} / {q(h2, .5):.1f}')
    sat = [clear[s][1051] for s in ok]
    print(f'satan tries med {q([x[2] for x in sat], .5):.0f} max {max(x[2] for x in sat)} · first-try {sum(1 for x in sat if x[2] == 1)}/{len(sat)} · farm runs med {q([x[3] for x in sat], .5):.0f}')
    for lim in (30, 60, 90, 120, 180, 240):
        print(f'  ch1 done within {lim:3d} min: {sum(1 for x in v if x <= lim)}/{len(seeds)}')
    print()
