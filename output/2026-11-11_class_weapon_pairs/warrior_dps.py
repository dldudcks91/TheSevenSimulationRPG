# -*- coding: utf-8 -*-
"""전사 둔기 vs 도끼 DPS — knight_dps.py(2026-11-10) 방법 그대로 · 전사 스킬로 바꿨다.
직격 기대값 = 범위 평균 × 스킬 배율 × 적중 × 치명 · 힘 10 · 장비 옵션 없음 · 스킬 레벨 1 · 방어 뺌 · 경직 · 프렌지 미포함
쿨은 라운드 시작부터 돈다(R427) · 차례마다 가장 오래 기다린 스킬 하나 + 평타 · 쿨 ±30% 평균
"""
import csv, sys, io, math, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'data')
B = {r['key']: r['value'] for r in csv.DictReader(open(os.path.join(ROOT, 'balance.csv'), encoding='utf-8'))}
f = lambda k: float(B[k])

def band_table(l1, prefix, levels, cap=120):
    t = [0, l1]
    for n in range(2, cap + 1):
        b = min(8, (n - 1) // levels + 1)
        t.append(t[-1] + f(f'{prefix}{b}_unit'))
    return t

MID = band_table(f('weapon_atk_base'), 'weapon_atk_band', int(f('weapon_atk_band_levels')))
HIT = f('hit_base_pct')
CRIT = 1 + f('base_crit_pct') * (f('base_crit_damage_pct') - 1)
jsround = lambda x: math.floor(x + 0.5)

def rng_mean(lv, mult, var):
    mid = MID[lv] * mult
    lo = max(1, jsround(mid * (1 - var)))
    hi = max(lo, jsround(mid * (1 + var)))
    return lo, hi, (lo + hi) / 2

# 배율 합 · 쿨 — skill_effect.csv · skill.csv (2026-11-11 읽음)
SK = {'bash': (3.0, 15), 'dswing': (2 * 1.1, 8), 'whirl': (5 * 0.5, 11), 'thor': (4.2, 22), 'mutual': (4.2, 16)}
BUILDS = {
    '휠윈드(바바리안)': ['dswing', 'bash', 'whirl'],
    '토르의 분노(바바리안)': ['bash', 'dswing', 'thor'],
    '동귀어진(광전사)': ['bash', 'dswing', 'mutual'],
}

def loadout(build, lv):
    s = BUILDS[build][:1]
    if lv >= 10: s = BUILDS[build][:2]
    if lv >= 30: s = BUILDS[build][:3]
    return s

def sim(period, hit_mean, skills, cds, T=600.0):
    ready = {s: cds[s] for s in skills}
    order = {s: i for i, s in enumerate(skills)}
    t, db, ds, cnt = period, 0.0, 0.0, 0
    per = hit_mean * HIT * CRIT
    while t <= T + 1e-9:
        cand = [s for s in skills if ready[s] <= t + 1e-9]
        if cand:
            s = min(cand, key=lambda s: (ready[s], order[s]))
            ds += per * SK[s][0]
            ready[s] = t + cds[s]
            cnt += 1
        db += per
        t += period
    return db, ds, cnt

def total(W, build, lv, cdr=0.0):
    r = rng_mean(lv, W[1], W[2]); sk = loadout(build, lv); vals = []
    for i in range(61):
        s = (0.7 + i * 0.01) * (1 - cdr)
        vals.append(sim(W[0], r[2], sk, {k: cd * s for k, (_, cd) in SK.items()}))
    return tuple(sum(v[j] for v in vals) / len(vals) for j in range(3))

pct = lambda a, b: f'{a / b - 1:+.0%}'.replace('-', '−')

def compare(name, fast, slow, fast_name, slow_name, detail=True):
    print(f'\n### {name}\n')
    print(f'| 무기 | 공격 속도 | Lv10 범위 | Lv30 범위 | Lv50 범위 (평균) | Lv50 초당 평타 |')
    print('|---|---|---|---|---|---|')
    for w, W in ((fast_name, fast), (slow_name, slow)):
        rs = [rng_mean(lv, W[1], W[2]) for lv in (10, 30, 50)]
        print(f'| {w} | {W[0]}초 | {rs[0][0]}~{rs[0][1]} | {rs[1][0]}~{rs[1][1]} | {rs[2][0]}~{rs[2][1]} ({rs[2][2]}) | {rs[2][2] / W[0]:.1f} |')
    print(f'\n느린 쪽({slow_name}) 기준 차이 — 평타 / 전사 전체(평타 + 스킬)\n')
    print('| 쿨감 | 레벨 | 평타 | ' + ' | '.join(BUILDS) + ' |')
    print('|---|---|---|' + '---|' * len(BUILDS))
    for cdr in ((0.0, 0.3, 0.5) if detail else (0.0, 0.3)):
        for lv in ((10, 30, 50) if detail else (50,)):
            row = []
            basic = None
            for b in BUILDS:
                a, s = total(fast, b, lv, cdr), total(slow, b, lv, cdr)
                basic = pct(s[0], a[0])
                row.append(pct(s[0] + s[1], a[0] + a[1]))
            print(f'| {cdr:.0%} | Lv{lv} | {basic} | ' + ' | '.join(row) + ' |')

# (주기, 한 방 배율, 변동)
compare('지금 데이터 — 둔기 빠름 · 도끼 느림', (2.7, 1.0, 0.22), (3.3, 1.0, 0.28), '둔기', '도끼')
compare('기사 값 그대로 — 빠른 쪽 2.7 · 느린 쪽 3.7 ×1.3', (2.7, 1.0, 0.22), (3.7, 1.3, 0.8), '빠른 쪽', '느린 쪽')
print('\n### 후보 격자 — 빠른 쪽 2.7초 ×1 고정 · Lv50\n')
print('| 느린 쪽 | 쿨감 | 평타 | ' + ' | '.join(BUILDS) + ' |')
print('|---|---|---|' + '---|' * len(BUILDS))
for per in (3.3, 3.7):
    for m in (1.2, 1.3, 1.4):
        for cdr in (0.0, 0.3):
            row = []
            for b in BUILDS:
                a, s = total((2.7, 1.0, 0.22), b, 50, cdr), total((per, m, 0.5), b, 50, cdr)
                basic = pct(s[0], a[0])
                row.append(pct(s[0] + s[1], a[0] + a[1]))
            print(f'| {per}초 ×{m} | {cdr:.0%} | {basic} | ' + ' | '.join(row) + ' |')
