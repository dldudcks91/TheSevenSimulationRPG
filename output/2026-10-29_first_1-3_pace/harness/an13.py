"""Summarize wheel runs stopped at 1-3 III. python an13.py A [B ...]"""
import json
import statistics as st
import sys
from collections import defaultdict
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'sim_out'
K = 1.04  # sim min -> user min (2026-10-24 human-mimic wall clock)
CELLS = [1011, 1012, 1013, 1021, 1022, 1023, 1031, 1032, 1033]
NAME = {c: f"{c // 1000}-{(c // 10) % 100} {'I' * (c % 10)}" for c in CELLS}


def q(xs, p):
    xs = sorted(xs)
    if not xs:
        return float('nan')
    i = (len(xs) - 1) * p
    lo = int(i)
    hi = min(lo + 1, len(xs) - 1)
    return xs[lo] + (xs[hi] - xs[lo]) * (i - lo)


def fmt(xs):
    return f'{q(xs, .5):6.1f} [{q(xs, .25):5.1f} ~ {q(xs, .75):5.1f}] p10 {q(xs, .1):5.1f} p90 {q(xs, .9):6.1f}'


for tag in sys.argv[1:]:
    d = json.loads((OUT / f'{tag}.txt').read_text(encoding='utf-8'))
    out = d['out']
    print(f'=== {tag} · seeds {len(out)} · opt {json.dumps(d["meta"]["opt"], ensure_ascii=False)}')
    stuck = [o for o in out if o['stuck']]
    print('stuck', len(stuck), [(o['seed'], o['stuck']['stageId'], o['stuck']['why']) for o in stuck])
    rows = defaultdict(dict)
    for o in out:
        for r in o['stages']:
            if r['tClear'] is not None:
                rows[r['stageId']][o['seed']] = r
    print('cell      | user min (sim x1.04) median [IQR] p10 p90           | play min median | Lv@clear | tries med/max | 1st-try win')
    for c in CELLS:
        rs = rows[c]
        if not rs:
            continue
        um = [r['tClear'] / 60 * K for r in rs.values()]
        em = [r['eClear'] / 60 for r in rs.values()]
        lv = [r['clear']['lv'] for r in rs.values()]
        tr = [r['tries'] for r in rs.values()]
        first = sum(1 for r in rs.values() if r['tries'] == 1)
        print(f'{NAME[c]:9} | {fmt(um)} | {q(em, .5):6.1f} | {q(lv, .5):5.1f} | {q(tr, .5):3.0f}/{max(tr):3d} | {first}/{len(rs)}')
    fin = {o['seed']: rows[1033][o['seed']] for o in out if o['seed'] in rows[1033]}
    um = {s: r['tClear'] / 60 * K for s, r in fin.items()}
    seeds = sorted(o['seed'] for o in out)
    half = len(seeds) // 2
    h1 = [um[s] for s in seeds[:half] if s in um]
    h2 = [um[s] for s in seeds[half:] if s in um]
    print(f'1-3 III halves: first {q(h1, .5):.1f} ({len(h1)}) · second {q(h2, .5):.1f} ({len(h2)})')
    for lim in (15, 20, 30, 45, 60, 90, 120, 180):
        print(f'  cleared 1-3 III within {lim:3d} user min: {sum(1 for v in um.values() if v <= lim)}/{len(out)}')
    # where the time went: share of total sim time by cell (incl. farm)
    tot = defaultdict(float)
    for o in out:
        for r in o['stages']:
            end = r['tClear'] if r['tClear'] is not None else o['t']
            tot[r['stageId']] += end - r['t0']
    allt = sum(tot.values())
    print('time share by cell:', ' · '.join(f'{NAME[c]} {tot[c] / allt * 100:.0f}%' for c in CELLS if tot[c]))
    # by class present
    byc = defaultdict(list)
    for o in out:
        if o['seed'] in um:
            for c in set(o['classes']):
                byc[c].append(um[o['seed']])
    print('by class present (median user min, n):', ' · '.join(f'{c} {q(v, .5):.0f} ({len(v)})' for c, v in sorted(byc.items(), key=lambda kv: q(kv[1], .5))))
    combos = defaultdict(list)
    for o in out:
        if o['seed'] in um:
            combos['/'.join(sorted(o['classes']))].append(um[o['seed']])
    print('slowest combos:', ' · '.join(f'{k} {q(v, .5):.0f}({len(v)})' for k, v in sorted(combos.items(), key=lambda kv: -q(kv[1], .5))[:5]))
    print('fastest combos:', ' · '.join(f'{k} {q(v, .5):.0f}({len(v)})' for k, v in sorted(combos.items(), key=lambda kv: q(kv[1], .5))[:5]))
    cnt = defaultdict(int)
    for o in out:
        for k, v in o['cnt'].items():
            cnt[k] += v
    print('feature counts:', dict(cnt))
    print('meta.bot:', d['meta']['bot'])
    print('meta.assume:', ' / '.join(d['meta']['assume']))
    print()
