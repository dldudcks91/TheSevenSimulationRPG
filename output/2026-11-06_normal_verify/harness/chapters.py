"""챕터별 난이도 — python chapters.py > out/chapters.md
장마다: 머문 시간(장 첫 칸 도착 → 챕터보스 깸 · 원정 플레이 시간) · 보스 아닌 칸 첫 도전 승(전 칸 · 전 시드 평균) · 챕터보스 첫 도전 승 ·
가장 어려운 스테이지(첫 도전 승 최저) · 도착 Lv − 첫 칸 dlvl · 깬 Lv − 보스 dlvl · 한 칸 도전 수 중앙 · 칸당 머문 분 중앙.
시드 앞 절반 / 뒤 절반을 같이 낸다."""
import csv, glob, json, math, statistics as st
from collections import defaultdict
from pathlib import Path
HERE = Path(__file__).resolve().parent
OUT = HERE.parent / 'out'
OLD = HERE.parents[1] / '2026-11-04_normal_pace' / 'out'
REPO = HERE.parents[2]
INF = math.inf
DLVL = {int(r['stage_id']): int(r['dlvl']) for r in csv.DictReader(open(REPO / 'src/data/stage.csv', encoding='utf-8'))}
MT = {int(r['stage_id']): r['monster_type'] for r in csv.DictReader(open(REPO / 'src/data/stage.csv', encoding='utf-8'))}

def load(tag, d):
    rows, meta = [], None
    for f in glob.glob(str(d / f'{tag}_*-*.txt')):
        t = Path(f).read_text(encoding='utf-8').strip()
        if not t: continue
        j = json.loads(t); meta = meta or j['meta']; rows += j['rows']
    rows.sort(key=lambda r: r['seed'])
    for r in rows: r['cm'] = {c['id']: c for c in r['cells']}
    return rows, meta

TAGS = [('A', OLD, '게임 이어 가기 (11-04)'), ('P', OUT, '드롭만 (물약 3단계)'), ('SU', OUT, '상단 + 늘 +6강')]
D = {t: load(t, d) for t, d, _ in TAGS}
order = D['P'][1]['order']
CH = sorted({s // 1000 for s in order})
def q(xs, p):
    xs = sorted(xs)
    if not xs: return None
    k = (len(xs) - 1) * p; lo, hi = math.floor(k), math.ceil(k)
    if xs[hi] == INF: return INF if (k - lo > 0 or xs[lo] == INF) else xs[lo]
    return xs[lo] + (xs[hi] - xs[lo]) * (k - lo)
med = lambda xs: q(xs, .5)
mn = lambda v, nd=0: '-' if v is None else ('못 닿음' if v == INF else f'{v / 60:.{nd}f}')
pct = lambda xs: f'{round(100 * st.mean(xs))}%' if xs else '-'
def chap_cells(c): return [s for s in order if s // 1000 == c]
def stay(r, sids):
    c0 = r['cm'].get(sids[0])
    if c0 is None: return None
    cl = r['cm'].get(sids[-1])
    return INF if cl is None or cl.get('ec') is None else cl['ec'] - c0['e0']
def lab(sid): return f'{sid // 1000}-{(sid // 10) % 100}'

for t, d, nm in TAGS:
    rows = D[t][0]; hf = len(rows) // 2; halves = (rows[:hf], rows[hf:])
    print(f'\n## {t} — {nm} · {len(rows)}시드\n')
    print('| 장 | 머문 분 중앙 (앞 / 뒤) | p90 | 일반 칸 첫 도전 승 (앞 / 뒤) | 보스 첫 도전 승 | 가장 어려운 스테이지 (첫 도전 승) | 도착 Lv − dlvl | 깬 Lv − 보스 dlvl | 칸 도전 수 중앙 · p90 |')
    print('|---|---|---:|---|---:|---|---:|---:|---|')
    for c in CH:
        cs = chap_cells(c)
        normal = [s for s in cs if s % 100 != 51]
        boss = [s for s in cs if s % 100 == 51][0]
        xs = [v for v in (stay(r, cs) for r in rows) if v is not None]
        hx = [[v for v in (stay(r, cs) for r in h) if v is not None] for h in halves]
        ft = lambda rs, ss: [r['cm'][s]['first'] for r in rs for s in ss if s in r['cm'] and r['cm'][s].get('first') is not None]
        # 스테이지 단위 첫 도전 승 — 가장 낮은 스테이지
        by_stage = defaultdict(list)
        for s in normal: by_stage[s // 10].append(s)
        worst = min(by_stage.items(), key=lambda kv: st.mean(ft(rows, kv[1]) or [1]))
        wk = worst[0]
        lva = [r['cm'][cs[0]]['lvA'] - DLVL[cs[0]] for r in rows if cs[0] in r['cm']]
        lvc = [r['cm'][boss]['lvC'] - DLVL[boss] for r in rows if boss in r['cm'] and r['cm'][boss].get('lvC') is not None]
        tr = [r['cm'][s]['tries'] for r in rows for s in normal if s in r['cm'] and r['cm'][s].get('ec') is not None]
        print(f'| {c}장 | {mn(med(xs))} ({mn(med(hx[0]))} / {mn(med(hx[1]))}) | {mn(q(xs, .9))} | {pct(ft(rows, normal))} ({pct(ft(halves[0], normal))} / {pct(ft(halves[1], normal))}) | {pct(ft(rows, [boss]))} | '
              f'{wk // 100}-{wk % 100} {MT[worst[1][0]]} ({pct(ft(rows, worst[1]))}) | {med(lva):+.1f} | {med(lvc):+.1f} | {med(tr)} · {q(tr, .9):.0f} |')
    # 스테이지별 첫 도전 승 — 장 안의 고르기
    print('\n스테이지별 첫 도전 승 (세 칸 평균) · 머문 분 중앙:')
    for c in CH:
        cs = chap_cells(c)
        parts = []
        for k in sorted({s // 10 for s in cs}):
            ss = [s for s in cs if s // 10 == k]
            f = [r['cm'][s]['first'] for r in rows for s in ss if s in r['cm'] and r['cm'][s].get('first') is not None]
            sx = [v for v in (stay(r, ss) for r in rows) if v is not None]
            parts.append(f'{k // 100}-{k % 100}{"" if k % 100 != 5 else "B"}{"*" if MT[ss[0]] == "Normal" else ""} {pct(f)} · {mn(med(sx), 1)}')
        print(f'- {c}장: ' + ' / '.join(parts))
print('\n`*` = monster_type Normal · `B` = 챕터보스 · dlvl = stage.csv 몬스터 레벨')
