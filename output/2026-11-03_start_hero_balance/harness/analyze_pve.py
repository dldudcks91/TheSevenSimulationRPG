"""캠페인(1장) 집계 — 시작 파티별. python -X utf8 analyze_pve.py"""
import json
from collections import defaultdict
from pathlib import Path
import numpy as np

OUT = Path(__file__).resolve().parent.parent / 'out'
rows = []
meta = {}
for c in ('1-100', '101-200', '201-300', '301-400'):
    d = json.loads((OUT / f'camp_{c}.txt').read_text(encoding='utf-8'))
    rows += d['rows']; meta.setdefault('fallbackRuns', 0); meta['fallbackRuns'] += d['fallbackRuns']; meta.setdefault('equips', 0); meta['equips'] += d['equipsTotal']
    meta['runs'] = d['runs']; meta['stageOrder'] = d['stageOrder']
ABBR = {'warrior': 'W', 'knight': 'K', 'mage': 'M', 'archer': 'A', 'priest': 'P'}
S = len(rows)
half = lambda r: 0 if r['seed'] <= S // 2 else 1
combo = lambda r: '+'.join(sorted(ABBR[c] for c in r['cls']))
clear = lambda r, st: r['firstClear'].get(str(st), [None])[0]
INF = 10 ** 6
def med(xs):
    xs = sorted(xs); return xs[len(xs) // 2] if xs else None

def metrics(rs):
    n = len(rs)
    t1043 = [clear(r, 1043) or INF for r in rs]; t1051 = [clear(r, 1051) or INF for r in rs]
    return {
        'n': n,
        '1-1 I first try': np.mean([r['firstTry'].get('1011', [0])[0] for r in rs]),
        '1-3 I first try': np.mean([r['firstTry']['1031'][0] for r in rs if '1031' in r['firstTry']]) if any('1031' in r['firstTry'] for r in rs) else float('nan'),
        'boss first try': np.mean([r['firstTry']['1051'][0] for r in rs if '1051' in r['firstTry']]) if any('1051' in r['firstTry'] for r in rs) else float('nan'),
        'ch1 <=60m': np.mean([x <= 60 for x in t1051]), 'ch1 <=120m': np.mean([x <= 120 for x in t1051]),
        'med 1-4III m': med(t1043), 'med ch1 m': med(t1051),
        'lv@60': np.mean([r['marks']['60']['lv'] for r in rs]), 'cells@60': np.mean([r['marks']['60']['reached'] for r in rs]),
        'maxLoss': np.mean([r['maxLossStreak'] for r in rs]), 'not done': sum(1 for r in rs if not r['done']),
    }
fmt = lambda v: '-' if v is None else ('∞' if v == INF else (f'{v:.0f}' if isinstance(v, (int,)) or (isinstance(v, float) and v > 3) else f'{v:.2f}'))
COLS = ['n', '1-1 I first try', '1-3 I first try', 'boss first try', 'ch1 <=60m', 'ch1 <=120m', 'med 1-4III m', 'med ch1 m', 'lv@60', 'cells@60', 'maxLoss', 'not done']
print(f'seeds {S} · runs cap {meta["runs"]} · R417 fallback runs {meta["fallbackRuns"]} · bot equips {meta["equips"]} · time = sim minutes (durationSec + restart)')
print('ALL', {k: fmt(v) for k, v in metrics(rows).items()})
for i in (0, 1): print(f'half{i+1}', {k: fmt(v) for k, v in metrics([r for r in rows if half(r) == i]).items()})
print('\ncombo:', ' | '.join(COLS))
by = defaultdict(list)
for r in rows: by[combo(r)].append(r)
for k, rs in sorted(by.items(), key=lambda kv: (metrics(kv[1])['med ch1 m'])):
    m = metrics(rs); h = [metrics([r for r in rs if half(r) == i]) for i in (0, 1)]
    print(f'{k:6s} ' + ' | '.join(fmt(m[c]) for c in COLS) + f'   halves ch1<=120: {h[0]["ch1 <=120m"]:.2f}/{h[1]["ch1 <=120m"]:.2f} · med ch1: {fmt(h[0]["med ch1 m"])}/{fmt(h[1]["med ch1 m"])}')
print('\nclass with / without:')
for c in ABBR:
    w = [r for r in rows if c in r['cls']]; wo = [r for r in rows if c not in r['cls']]
    mw, mo = metrics(w), metrics(wo)
    hh = [(metrics([r for r in w if half(r) == i])['ch1 <=120m'], metrics([r for r in wo if half(r) == i])['ch1 <=120m']) for i in (0, 1)]
    print(f'{c:8s} with n {mw["n"]} ch1<=60 {mw["ch1 <=60m"]:.2f} <=120 {mw["ch1 <=120m"]:.2f} med {fmt(mw["med ch1 m"])} 1-4III {fmt(mw["med 1-4III m"])} | without n {mo["n"]} ch1<=60 {mo["ch1 <=60m"]:.2f} <=120 {mo["ch1 <=120m"]:.2f} med {fmt(mo["med ch1 m"])} 1-4III {fmt(mo["med 1-4III m"])} | halves <=120 with/without {hh[0][0]:.2f}/{hh[0][1]:.2f} · {hh[1][0]:.2f}/{hh[1][1]:.2f}')
print('\ninnate (observed) — ch1 <=120m · med 1-4III min:')
inn = defaultdict(list)
for r in rows:
    for c, s in zip(r['cls'], r['innate']): inn[(c, s)].append(r)
for k in sorted(inn):
    m = metrics(inn[k]); print(f'  {k[0]:8s} {k[1]:18s} n {m["n"]:3d}  ch1<=120 {m["ch1 <=120m"]:.2f}  med 1-4III {fmt(m["med 1-4III m"])}  med ch1 {fmt(m["med ch1 m"])}')
print('\ntier per class (observed) — ch1 <=120m:')
for c in ABBR:
    print(f'  {c:8s} ' + ' · '.join(f'{t} {np.mean([clear(r,1051) is not None and clear(r,1051) <= 120 for r in rows if (c, t) in zip(r["cls"], r["tier"])]):.2f}' for t in ('rare', 'magic', 'normal')))
# PvP 리그 승률과 PvE 속도의 상관 — 같은 시드 파티
lg = json.loads((OUT / 'league1.txt').read_text(encoding='utf-8'))
pts = defaultdict(list)
for a, b, aw, am, s1, bw, bm, s2 in lg['fights']:
    pts[a].append(am); pts[b].append(-am); pts[b].append(bm); pts[a].append(-bm)
pv = {s: np.mean(v) for s, v in pts.items()}
x = np.array([pv[r['seed']] for r in rows]); y = np.array([np.log(min(clear(r, 1051) or 5000, 5000)) for r in rows]); y2 = np.array([np.log(clear(r, 1043) or 5000) for r in rows])
print(f'\ncorr(PvP Lv1 margin, log min to ch1 clear) {np.corrcoef(x, y)[0,1]:+.2f} · (… 1-4 III) {np.corrcoef(x, y2)[0,1]:+.2f}  (negative = stronger in PvP → faster in PvE)')
