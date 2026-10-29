"""Paired BASE vs VAR (same seed = same start party). python pair.py BASE VAR"""
import json
import sys
from collections import defaultdict
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'sim_out'
K = 1.04
CELLS = {'1-1 I': 1011, '1-1 III': 1013, '1-2 III': 1023, '1-3 III': 1033, '1-4 III': 1043, 'ch1 (satan)': 1051}


def q(xs, p):
    xs = sorted(xs)
    if not xs:
        return float('nan')
    i = (len(xs) - 1) * p
    lo = int(i)
    hi = min(lo + 1, len(xs) - 1)
    return xs[lo] + (xs[hi] - xs[lo]) * (i - lo)


def load(tag):
    d = json.loads((OUT / f'{tag}.txt').read_text(encoding='utf-8'))
    res = {}
    for o in d['out']:
        st = {r['stageId']: r for r in o['stages'] if r['tClear'] is not None}
        res[o['seed']] = {'cls': o['classes'], 'st': st, 'cnt': o['cnt'], 'loss': o.get('losses', [])}
    return d['meta'], res


a_tag, b_tag = sys.argv[1], sys.argv[2]
ma, A = load(a_tag)
mb, B = load(b_tag)
seeds = sorted(set(A) & set(B))
half = set(seeds[:len(seeds) // 2])
assert all(A[s]['cls'] == B[s]['cls'] for s in seeds), 'start party differs'
print('bot:', mb['bot'])
print('cnt sum', a_tag, {k: sum(A[s]['cnt'][k] for s in seeds) for k in A[seeds[0]]['cnt'] if k != 'shopAt'})
print('cnt sum', b_tag, {k: sum(B[s]['cnt'][k] for s in seeds) for k in B[seeds[0]]['cnt'] if k != 'shopAt'})
t = lambda R, s, c: R[s]['st'][c]['tClear'] / 60 * K if c in R[s]['st'] else None
print('\ncell | A med | B med | B/A paired med [IQR] | halves (paired med) | B faster seeds')
for name, c in CELLS.items():
    pr = [(s, t(A, s, c), t(B, s, c)) for s in seeds if t(A, s, c) and t(B, s, c)]
    ratio = [b / a for _, a, b in pr]
    h1 = [b / a for s, a, b in pr if s in half]
    h2 = [b / a for s, a, b in pr if s not in half]
    print(f'{name:11} | {q([a for _, a, _ in pr], .5):6.1f} | {q([b for _, _, b in pr], .5):6.1f} | {q(ratio, .5):.2f} [{q(ratio, .25):.2f} ~ {q(ratio, .75):.2f}] | {q(h1, .5):.2f} / {q(h2, .5):.2f} | {sum(1 for x in ratio if x < 1)}/{len(pr)}')

# 1-1 I first-try win · runs to clear 1-1 I
for tag, R in ((a_tag, A), (b_tag, B)):
    ft = sum(1 for s in seeds if R[s]['st'].get(1011, {}).get('tries') == 1)
    tr = [R[s]['st'][1011]['tries'] for s in seeds if 1011 in R[s]['st']]
    print(f'{tag}: 1-1 I first-try {ft}/{len(seeds)} · tries med {q(tr, .5):.0f} max {max(tr)} · 1-1 I > 10 tries {sum(1 for x in tr if x > 10)}')

# by start composition
def key(cls):
    s = set(cls)
    front = sum(1 for c in cls if c in ('warrior', 'knight'))
    return f'front {front}' + (' · mage+priest' if {'mage', 'priest'} <= s else '')

grp = defaultdict(list)
for s in seeds:
    grp[key(A[s]['cls'])].append(s)
print('\ncomposition | seeds | A ch1 med | B ch1 med | paired B/A med | A worst | B worst')
for k in sorted(grp):
    ss = grp[k]
    pa = [t(A, s, 1051) for s in ss if t(A, s, 1051)]
    pb = [t(B, s, 1051) for s in ss if t(B, s, 1051)]
    ratio = [t(B, s, 1051) / t(A, s, 1051) for s in ss if t(A, s, 1051) and t(B, s, 1051)]
    print(f'{k:22} | {len(ss):3} | {q(pa, .5):6.1f} | {q(pb, .5):6.1f} | {q(ratio, .5):.2f} | {max(pa):6.0f} | {max(pb):6.0f}')

# losses at 1-1 by round kind
for tag, R in ((a_tag, A), (b_tag, B)):
    L = [x for s in seeds for x in R[s]['loss'] if x['stageId'] in (1011, 1012, 1013)]
    kinds = defaultdict(int)
    for x in L:
        kinds[x['kind']] += 1
    print(f'{tag}: 1-1 losses {len(L)} · by round kind {dict(kinds)}')
