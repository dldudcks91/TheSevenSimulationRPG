"""기사 양손검 vs 창 DPS — 게임 공식(formula.js) 그대로, 기대값 계산.
- 무기 가운데 = weapon_atk_base + 구간 단위 누적합 (bandTable)
- 범위 = round(가운데 × 한방배율 × (1 ∓ 변동)) — 한방배율은 제안 칸(아직 없음)이라 가운데에 곱한다
- 직격 기대값 = 범위 평균 × 스킬 배율 × 능력치 계수(힘 10 = 1) × 적중(같은 레벨 75%) × 치명(5% · ×1.5)
- 차례마다: 준비된 스킬 중 가장 오래 기다린 것 하나(동시면 우선순위) + 평타 · 스킬은 전투 시작 때 준비
- 방어(%)는 두 무기에 똑같이 곱해져 비율에 영향 없음 → 빼고 계산
"""
import csv, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
ROOT = r'C:/Users/ANGames-001/Desktop/LYC/thesevensimulationrpg/src/data/'
B = {r['key']: r['value'] for r in csv.DictReader(open(ROOT + 'balance.csv', encoding='utf-8'))}
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

def jsround(x):  # Math.round
    import math
    return math.floor(x + 0.5)

def rng_mean(lv, mult, var):
    mid = MID[lv] * mult
    lo = max(1, jsround(mid * (1 - var)))
    hi = max(lo, jsround(mid * (1 + var)))
    return lo, hi, (lo + hi) / 2

SKILLS = {  # 이름: (배율 합, 쿨, 우선순위)  — skill.csv · skill_effect.csv
    'charge': (2.5, 9, 2),          # 차지 1타 × 2.5
    'rush': (4 * 0.6, 9, 3),        # 러시 4타 × 0.6
    'condemn': (4.0, 16, 2),        # 단죄 1타 × 4.0 (크루세이더 · 전직 Lv30)
}

def loadout(lv):
    s = ['charge']
    if lv >= 10: s.append('rush')       # 둘째 칸 = 스킬북 (Lv10)
    if lv >= 30: s.append('condemn')    # 셋째 칸 = 전직 (advance_unlock_level 30)
    return s

def sim(period, hit_mean, skills, T=60.0):
    ready = {s: 0.0 for s in skills}      # 준비된 시각 — 전투 시작 때 준비
    order = {s: i for i, s in enumerate(skills)}
    t, dmg_basic, dmg_skill = period, 0.0, 0.0
    per = hit_mean * HIT * CRIT
    while t <= T + 1e-9:
        cand = [s for s in skills if ready[s] <= t + 1e-9]
        if cand:
            s = min(cand, key=lambda s: (ready[s], SKILLS[s][2], order[s]))
            dmg_skill += per * SKILLS[s][0]
            ready[s] = t + SKILLS[s][1]
        dmg_basic += per
        t += period
    return dmg_basic / T, dmg_skill / T

def run(sword, spear, label):
    print(f'\n### {label}')
    print(f'양손검 주기 {sword[0]} · ×{sword[1]} · 변동 {sword[2]:.0%}  |  창 주기 {spear[0]} · ×{spear[1]} · 변동 {spear[2]:.0%}')
    print('| 레벨 | 양손검 범위 | 창 범위 | 평타 DPS 양손검 / 창 | 차이 | 스킬 포함 DPS 양손검 / 창 | 차이 | 스킬 |')
    print('|---|---|---|---|---|---|---|---|')
    for lv in (1, 10, 20, 30, 40, 50):
        a = rng_mean(lv, sword[1], sword[2]); b = rng_mean(lv, spear[1], spear[2])
        sk = loadout(lv)
        ab, as_ = sim(sword[0], a[2], sk); bb, bs = sim(spear[0], b[2], sk)
        ta, tb = ab + as_, bb + bs
        names = {'charge': '차지', 'rush': '러시', 'condemn': '단죄'}
        print(f'| {lv} | {a[0]}~{a[1]} | {b[0]}~{b[1]} | {ab:.2f} / {bb:.2f} | {(bb/ab-1):+.1%} | {ta:.2f} / {tb:.2f} | {(tb/ta-1):+.1%} | {" · ".join(names[s] for s in sk)} |')

# 제안 (앞 답변의 예시값)
run((2.7, 1.00, 0.10), (3.3, 1.15, 0.20), '제안 — 양손검 2.7초 ×1.00 10% / 창 3.3초 ×1.15 20%')
# 배율 감도
for m in (1.10, 1.22, 1.30):
    run((2.7, 1.00, 0.10), (3.3, m, 0.20), f'창 배율 ×{m}')
# 지금 데이터 (창 2.7 · 10% / 양손검 3.3 · 15% · 한 방 같음) — 창이 빠른 쪽
run((3.3, 1.00, 0.15), (2.7, 1.00, 0.10), '지금 데이터 (양손검 3.3 · 15% / 창 2.7 · 10%) — 참고')
