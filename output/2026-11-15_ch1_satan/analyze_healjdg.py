"""사제 힐 · 심판 쿨 단축(몬스터도 같이) — head vs healjdg · 기본 · 대응 160계정. 숫자만.
healjdg = pri_heal 10→5 · pri_cure 8→4 · pri_judgment 9→5 (스킬을 같이 쓰는 몬스터도 같이 바뀐다).
"""
import json, statistics as st
from pathlib import Path
H = 14400
BASE = Path(__file__).resolve().parent
KINDS = ('head', 'healjdg')
POL = ('basic', 'adaptive')
CH1 = [1011, 1012, 1013, 1021, 1022, 1023, 1031, 1032, 1033, 1041, 1042, 1043, 1051]
def name(sid):
    ch, place, cell = sid // 1000, (sid // 10) % 10, sid % 10
    return f'{ch}-5 boss' if place == 5 else f'{ch}-{place} ' + ['I', 'II', 'III'][cell - 1]
R = {k: {(pol, s): json.loads((BASE / f'simulation_{k}/main/{pol}_seed{s}.json').read_text(encoding='utf-8'))
         for pol in POL for s in range(1, 81)} for k in KINDS}
CP = BASE / 'simulation_head/main/checkpoints'
def group(pol, s):
    d = json.loads((CP / f'{pol}_seed{s}_3600.json').read_text(encoding='utf-8'))
    inn = [x['ids'][0] for c, x in zip(d['classes'], d['skills']) if c == 'priest']
    return inn[0] if inn else 'no_priest'
G = {}
for pol in POL:
    for s in range(1, 81): G.setdefault(group(pol, s), []).append((pol, s))
def runs(r): return [x for x in r['runs'] if x['start'] < H and not x.get('farming')]
def t_of(r, stage): return next((x['t'] / 60 for x in runs(r) if x['stage'] == stage and x['won'] and x['t'] <= H), None)
def top(r):
    w = [x['stage'] for x in runs(r) if x['won'] and x['t'] <= H]
    return max(w) if w else 0
out = []
def p(*a): out.append(' '.join(str(x) for x in a))
for k in KINDS[1:]:
    i = json.loads((BASE / f'simulation_{k}/main/run_info.json').read_text(encoding='utf-8'))
    p(k, 'done', len(i['completed']), 'errors', len(i['errors']), 'changed', i['frozen_source_changed'])

p('\n## 묶음별 — 사탄(1-5 보스)')
for g in ['pri_heal', 'pri_cure', 'pri_judgment', 'no_priest', 'ALL']:
    acc = [a for v in G.values() for a in v] if g == 'ALL' else G[g]
    for k in KINDS:
        sat = [t_of(R[k][a], 1051) for a in acc]; arr = [t_of(R[k][a], 1043) for a in acc]
        cens = sorted(x if x is not None else 1e9 for x in sat); med = cens[len(cens) // 2]
        br = [x for a in acc for x in runs(R[k][a]) if x['stage'] == 1051]
        hv = [sum(1 for (pol, s), x in zip(acc, sat) if x is not None and x <= 60 and (s <= 40) == h) for h in (True, False)]
        arrv = [x for x in arr if x]
        p(f'{g:12s} {k:8s} n={len(acc):3d} 60분={sum(1 for x in sat if x is not None and x <= 60):3d} (앞|뒤 {hv[0]}|{hv[1]}) '
          f'120분={sum(1 for x in sat if x is not None and x <= 120):3d} 4시간={sum(1 for x in sat if x is not None):3d} '
          f'중앙={"%.0f" % med if med < 1e8 else ">240"}m 1-4III도착={st.median(arrv) if arrv else 0:.0f}m(n{len(arrv)}) '
          f'보스판당={100 * sum(x["won"] for x in br) / max(1, len(br)):.0f}%')
    d = []
    for a in acc:
        x0 = t_of(R['head'][a], 1051); x1 = t_of(R['healjdg'][a], 1051)
        d.append((x0 if x0 is not None else 300) - (x1 if x1 is not None else 300))
    p(f'{g:12s} paired 사탄 단축(head-변형 · 못깸=300) 중앙 {st.median(d):+.0f}m · 빨라짐 {sum(1 for x in d if x > 0)} · 느려짐 {sum(1 for x in d if x < 0)} · 같음 {sum(1 for x in d if x == 0)}')

p('\n## 칸별 (160계정) — 첫 클리어 중앙(분) · 깰 때까지 판당 승률 · head → healjdg')
for sid in CH1:
    row = [f'{name(sid):9s}']
    for k in KINDS:
        clr, att, wins = [], 0, 0
        for a in R[k]:
            for x in [x for x in runs(R[k][a]) if x['stage'] == sid]:
                att += 1; wins += x['won']
                if x['won']: clr.append(x['t'] / 60); break
        row.append(f'{k}: 중앙 {st.median(clr) if clr else 0:5.1f}m 판당 {100 * wins / max(1, att):3.0f}% 깸 {len(clr):3d}')
    p(' | '.join(row))

p('\n## 4시간 시점 가장 멀리 깬 칸 (160계정)')
for g in ['pri_heal', 'pri_cure', 'pri_judgment', 'no_priest', 'ALL']:
    acc = [a for v in G.values() for a in v] if g == 'ALL' else G[g]
    row = [f'{g:12s}']
    for k in KINDS:
        tops = [top(R[k][a]) for a in acc]
        row.append(f'{k}: 2장 진입 {sum(1 for t in tops if t >= 2011):3d} · 2-3 이상 {sum(1 for t in tops if t >= 2031):3d} · 2장 보스 {sum(1 for t in tops if t >= 2051):3d}')
    p(' | '.join(row))
(BASE / 'analysis_healjdg.txt').write_text('\n'.join(out), encoding='utf-8'); print('\n'.join(out))
