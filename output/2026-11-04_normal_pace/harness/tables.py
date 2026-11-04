"""A · B 를 나란히 — 스테이지 25행 · 조합 9행 (보고서 표). python tables.py > out/tables.md"""
import glob, json, math, statistics as st
from collections import defaultdict
INF = math.inf
NAMES = {'warrior': '전사', 'knight': '기사', 'archer': '궁수', 'mage': '마법사', 'priest': '사제'}
def load(tag):
    rows = []
    for f in glob.glob(f'out/{tag}_*-*.txt'): rows += json.loads(open(f, encoding='utf-8').read())['rows']
    rows.sort(key=lambda r: r['seed'])
    for r in rows: r['cm'] = {c['id']: c for c in r['cells']}
    return rows
D = {t: load(t) for t in 'AB'}
order = json.loads(open(glob.glob('out/A_1-20.txt')[0], encoding='utf-8').read())['meta']['order']
def med(xs):
    xs = sorted(xs)
    return xs[len(xs) // 2] if len(xs) % 2 else (xs[len(xs) // 2 - 1] + xs[len(xs) // 2]) / 2
def cum(r, sid):
    c = r['cm'].get(sid)
    return c['ec'] if c and c['ec'] is not None else INF
stages = []
for sid in order:
    if not stages or stages[-1][0] != sid // 10: stages.append((sid // 10, []))
    stages[-1][1].append(sid)
def stay(r, sids):
    c0 = r['cm'].get(sids[0])
    if c0 is None: return None
    cl = r['cm'].get(sids[-1])
    return INF if cl is None or cl['ec'] is None else cl['ec'] - c0['e0']
f = lambda v, nd=0: '못 닿음' if v == INF else f'{v / 60:.{nd}f}'
print('| 스테이지 | A 머문 분 | A 누적 분 | B 머문 분 | B 누적 분 | 첫 도전 승 (칸별 · A) | 깬 Lv (A) |')
print('|---|---:|---:|---:|---:|---|---:|')
for key, sids in stages:
    out = []
    for t in 'AB':
        xs = [v for v in (stay(r, sids) for r in D[t]) if v is not None]
        out += [f(med(xs), 1), f(med([cum(r, sids[-1]) for r in D[t]]))]
    ft = []
    for s in sids:
        fs = [r['cm'][s]['first'] for r in D['A'] if s in r['cm'] and r['cm'][s].get('first') is not None]
        ft.append(f'{round(100 * sum(fs) / len(fs))}%')
    lv = med([r['cm'][sids[-1]]['lvC'] for r in D['A'] if sids[-1] in r['cm'] and r['cm'][sids[-1]]['lvC'] is not None])
    nm = f'{key // 100}-{key % 100}' + (' 보스' if key % 100 == 5 else '')
    if key % 100 == 5: nm = f'**{nm}**'
    print(f'| {nm} | {out[0]} | {out[1]} | {out[2]} | {out[3]} | {" · ".join(ft)} | {lv:.0f} |')
print()
ends = [o for o in order if o % 100 == 51]
comp = lambda r: ' + '.join(NAMES[c] for c in sorted(r['cls'], key=lambda c: list(NAMES).index(c)))
print('| 시작 조합 | 시드 | 1장 끝 분 (A · B 같음) | 4장 끝 h A / B | 노말 끝 h A | 노말 끝 h B | B 사분위 | B 절반 앞 / 뒤 |')
print('|---|---:|---:|---|---:|---:|---|---|')
by = defaultdict(list)
for r in D['B']: by[comp(r)].append(r['seed'])
idx = {t: {r['seed']: r for r in D[t]} for t in 'AB'}
half = 300
def q(xs, p):
    xs = sorted(xs); k = (len(xs) - 1) * p; lo = math.floor(k); hi = math.ceil(k)
    return INF if xs[hi] == INF else xs[lo] + (xs[hi] - xs[lo]) * (k - lo)
groups = sorted(by.items(), key=lambda kv: med([cum(idx['B'][s], ends[-1]) for s in kv[1]]))
groups += [('**사제 없음**', [r['seed'] for r in D['B'] if 'priest' not in r['cls']]), ('**사제 있음**', [r['seed'] for r in D['B'] if 'priest' in r['cls']]), ('**전체**', [r['seed'] for r in D['B']])]
for name, seeds in groups:
    a = [idx['A'][s] for s in seeds]; b = [idx['B'][s] for s in seeds]
    xb = [cum(r, ends[-1]) for r in b]
    h = lambda v: '못 닿음' if v == INF else f'{v / 3600:.1f}'
    print(f'| {name} | {len(seeds)} | {f(med([cum(r, ends[0]) for r in b]))} | {h(med([cum(r, ends[3]) for r in a]))} / {h(med([cum(r, ends[3]) for r in b]))} | {h(med([cum(r, ends[-1]) for r in a]))} | {h(med(xb))} | {h(q(xb, .25))} ~ {h(q(xb, .75))} | '
          f'{h(med([cum(r, ends[-1]) for r in b if r["seed"] <= half]))} / {h(med([cum(r, ends[-1]) for r in b if r["seed"] > half]))} |')
