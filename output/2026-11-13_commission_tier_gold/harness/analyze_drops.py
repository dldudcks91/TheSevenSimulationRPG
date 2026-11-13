"""out/<tag>_*.txt (tier2.html · 창의 드롭 구성) → 확률로 좁히는 카드의 시간 배수.
같은 목표 수면 좁힌 카드의 시간 = 넓은 카드 시간 ÷ (맞는 드롭의 몫).
탐욕(분해): 일반 = 장비 n개 · 매직 = 그 희귀도 n개 · 레어 = 그 희귀도 · 그 부위 n개
나태(재료): 일반 = 재료 n개 · 매직 = 한 재료 n개 — 원정 몫만(분해 부위 재료: 무기 = 철광석 · 방어구 넷 = 목재 · 반지 · 목걸이 = 약초 · 일반 · 매직 2 · 레어 이상 5)
python analyze_drops.py <tag>"""
import glob, json, statistics as st, sys
from pathlib import Path
OUT = Path(__file__).resolve().parent.parent / 'out'
tag = sys.argv[1]
rows = []
for f in sorted(glob.glob(str(OUT / f'{tag}_*.txt'))):
    t = Path(f).read_text(encoding='utf-8').strip()
    if t:
        rows += json.loads(t)['rows']
print('seeds', len(rows))
MAT = {'weapon': 'ore', 'helmet': 'timber', 'armor': 'timber', 'gloves': 'timber', 'boots': 'timber', 'ring': 'herb', 'amulet': 'herb'}
def med(xs):
    xs = [x for x in xs if x is not None]
    return round(st.median(xs), 2) if xs else None
for X in range(1, 6):
    shares = {'magic': [], 'rare': [], 'magic_slot': [], 'rare_slot': [], 'mat': [], 'n_per_min': [], 'slots': {}}
    for r in rows:
        cp = next((c for c in r['cps'] if c['X'] == X), None)
        if not cp:
            continue
        dr = cp['window']['acc'].get('dr', {})
        n = dr.get('n', 0)
        if n <= 0:
            continue
        shares['n_per_min'].append(n / cp['window']['acc']['sec'] * 60)
        rar = {k[2:]: v for k, v in dr.items() if k.startswith('r:')}
        slots = {k[2:]: v for k, v in dr.items() if k.startswith('s:')}
        for s, v in slots.items():
            shares['slots'].setdefault(s, []).append(v / n)
        shares['magic'].append(rar.get('magic', 0) / n)
        shares['rare'].append(rar.get('rare', 0) / n)
        # 희귀도 × 부위 — 부위를 고르게 굴린다고 보고 부위 몫의 평균
        for rr, key in (('magic', 'magic_slot'), ('rare', 'rare_slot')):
            per = [dr.get(f'rs:{rr}:{s}', 0) / n for s in MAT]
            shares[key].append(st.mean(per))
        # 재료 — 한 재료의 평균 몫
        mat = {'ore': 0, 'timber': 0, 'herb': 0}
        for k, v in dr.items():
            if k.startswith('rs:'):
                _, rr, s = k.split(':')
                mat[MAT.get(s, 'timber')] += v * (5 if rr not in ('normal', 'magic') else 2)
        tot = sum(mat.values())
        if tot:
            # 한 재료 카드의 시간 배수 = 재료를 고르게 굴릴 때 1 / 몫 의 평균 (몫이 0 이면 못 채운다 — 뺀다)
            inv_m = [tot / v for v in mat.values() if v > 0]
            shares['mat'].append(1 / st.mean(inv_m))
            for k, v in mat.items():
                shares['slots'].setdefault('mat:' + k, []).append(v / tot)
    if not shares['magic']:
        continue
    inv = lambda x: round(1 / x, 1) if x else None
    m, rr, ms, rs, mt = (med(shares[k]) for k in ('magic', 'rare', 'magic_slot', 'rare_slot', 'mat'))
    print(f"{X}장 | 드롭 분당 {med(shares['n_per_min'])} | 몫 매직 {m} 레어 {rr} 매직·부위 {ms} 레어·부위 {rs} 한 재료 {mt} | 시간 배수 매직 {inv(m)} 레어 {inv(rr)} 매직·부위 {inv(ms)} 레어·부위 {inv(rs)} 한 재료 {inv(mt)} | 부위 몫 { {s: med(v) for s, v in shares['slots'].items()} }")
