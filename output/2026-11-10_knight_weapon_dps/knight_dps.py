# -*- coding: utf-8 -*-
"""기사 양손검 vs 창 DPS — 2026-11-10 재측정 (R434 · weapon_group_draft §1 · §4).
11-10 원칙 「같은 직업의 두 무기는 DPS 가 같지 않다 — 느리거나 범위가 넓은 무기가 높다」 → 창 한 방 배율 1.2 → 1.3 · 「센대신에」 변동 0.5 → 0.8.
10-26 knight_dps.py 를 11-02 쿨 규칙으로 고쳤다:
- 스킬 쿨은 라운드가 열릴 때 처음부터 돈다(시작에 준비 안 됨 · R427) · 우선순위 삭제(가장 오래 기다린 것 · 동률은 칸 순서)
- 범위 = round(가운데 × 한 방 배율 × (1 ∓ 변동)) — formula.weaponDamage 와 같은 식
- 직격 기대값 = 범위 평균 × 스킬 배율 × 적중 × 치명 (힘 10 · 장비 옵션 없음 · 스킬 레벨 1 · 방어는 두 무기에 같아 뺌 · 경직 미포함)
- 공격 기사 전체 = 쿨을 ±30% 범위에서 바꿔 가며 낸 평균 — 쿨 한 점은 주기 계단에 크게 흔들린다
실행: python knight_dps.py (CSV 를 그 자리에서 읽는다 — 값은 아래 SETS 의 사본이라 CSV 를 바꾸면 SETS 도 맞춘다)
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

BASE = {'charge': (2.5, 9), 'rush': (4 * 0.6, 9), 'condemn': (4.0, 16)}   # 배율 합 · 쿨 — skill_effect.csv · skill.csv

def loadout(lv):
    s = ['charge']
    if lv >= 10: s.append('rush')       # 스킬북 칸
    if lv >= 30: s.append('condemn')    # 전직 칸
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
            ds += per * BASE[s][0]
            ready[s] = t + cds[s]
            cnt += 1
        db += per
        t += period
    return db, ds, cnt

def total(W, lv, cdr=0.0):
    """평타 · 스킬 · 스킬 횟수 — 쿨 ±30% 평균"""
    r = rng_mean(lv, W[1], W[2]); sk = loadout(lv); vals = []
    for i in range(61):
        s = (0.7 + i * 0.01) * (1 - cdr)
        vals.append(sim(W[0], r[2], sk, {k: cd * s for k, (_, cd) in BASE.items()}))
    return tuple(sum(v[j] for v in vals) / len(vals) for j in range(3))

pct = lambda a, b: f'{a / b - 1:+.0%}'.replace('-', '−')

SETS = {  # (주기, 한 방 배율, 변동)
    '10-26 전 (지금 데이터였던 값)': {'양손검': (3.3, 1.0, 0.15), '창': (2.7, 1.0, 0.10)},
    '11-10 확정 (창 ×1.3 · ±80%)': {'양손검': (2.7, 1.0, 0.10), '창': (3.7, 1.3, 0.80)},
}
for name, S in SETS.items():
    print(f'\n### {name}\n')
    print('| 무기 | 공격 속도 | Lv10 범위 | Lv30 범위 | Lv50 범위 (평균) | Lv50 초당 평타 |')
    print('|---|---|---|---|---|---|')
    for w, W in S.items():
        rs = [rng_mean(lv, W[1], W[2]) for lv in (10, 30, 50)]
        print(f'| {w} | {W[0]}초 | {rs[0][0]}~{rs[0][1]} | {rs[1][0]}~{rs[1][1]} | {rs[2][0]}~{rs[2][1]} ({rs[2][2]}) | {rs[2][2] / W[0]:.1f} |')
    print('\n| 쿨감 | 레벨 | 평타 | 스킬만 | 공격 기사 전체 | 스킬 횟수 600초 (창 / 양손검) |')
    print('|---|---|---|---|---|---|')
    for cdr in (0.0, 0.3, 0.5):
        for lv in (10, 30, 50):
            a, b = total(S['양손검'], lv, cdr), total(S['창'], lv, cdr)
            print(f'| {cdr:.0%} | Lv{lv} | {pct(b[0], a[0])} | {pct(b[1], a[1])} | {pct(b[0] + b[1], a[0] + a[1])} | {b[2]:.0f} / {a[2]:.0f} |')
