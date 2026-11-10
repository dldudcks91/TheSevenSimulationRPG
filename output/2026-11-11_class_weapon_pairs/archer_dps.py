# -*- coding: utf-8 -*-
"""궁수 활 vs 석궁 DPS — knight_dps.py 방법 + 정신 집중 규칙(battle_design §3-2):
channel / channel_charge 차례는 평타가 없고, 끝난 뒤(끊어 치기 = (타수−1)×channel_strike_sec · 모으기 = charge_sec) 행동 주기가 처음부터 돈다.
turn 스킬은 스킬 + 평타. 쿨은 끝난 뒤부터. 쿨 ±30% 평균 · 힘 = pivot · 장비 없음 · 스킬 레벨 1 · 방어 뺌 · 단일 대상.
T1 「공격 속도 −n초」= 무기 주기에서 먼저 뺀다(skill_design §3-4 · 11-09)."""
import csv, sys, io, math, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'data')
B = {r['key']: r['value'] for r in csv.DictReader(open(os.path.join(ROOT, 'balance.csv'), encoding='utf-8'))}
f = lambda k: float(B[k])
def band_table(l1, prefix, levels, cap=120):
    t = [0, l1]
    for n in range(2, cap + 1):
        b = min(8, (n - 1) // levels + 1); t.append(t[-1] + f(f'{prefix}{b}_unit'))
    return t
MID = band_table(f('weapon_atk_base'), 'weapon_atk_band', int(f('weapon_atk_band_levels')))
HIT = f('hit_base_pct'); CRIT = 1 + f('base_crit_pct') * (f('base_crit_damage_pct') - 1); CH = f('channel_strike_sec')
# (종류, 타수, 타당 배율, 쿨, 모으기 초)
SK = {'snipe': ('charge', 1, 5.5, 15, 2.0), 'rapid': ('channel', 3, 0.55, 5, 0), 'multi': ('turn', 1, 1.0, 5, 0),
      'guided': ('turn', 1, 1.85, 5, 0), 'single': ('turn', 1, 4.5, 18, 0), 'trap': ('turn', 1, 2.0, 12, 0)}
BUILDS = {'스나이퍼': ['snipe', 'guided', 'single'], '보우마스터': ['rapid', 'multi'], '레인저': ['rapid', 'guided', 'trap']}
def loadout(b, lv): return BUILDS[b][:1 if lv < 10 else 2 if lv < 30 else 3]
def sim(period, mean, skills, cds, T=600.0):
    ready = {s: cds[s] for s in skills}; order = {s: i for i, s in enumerate(skills)}
    t, db, ds = period, 0.0, 0.0; per = mean * HIT * CRIT
    while t <= T:
        cand = [s for s in skills if ready[s] <= t + 1e-9]
        if cand:
            s = min(cand, key=lambda s: (ready[s], order[s])); kind, n, m, _, chg = SK[s]
            ds += per * m * n
            if kind == 'turn':
                db += per; ready[s] = t + cds[s]; t += period
            else:
                dur = chg if kind == 'charge' else (n - 1) * CH
                ready[s] = t + dur + cds[s]; t += dur + period
        else:
            db += per; t += period
    return db, ds
def jr(x): return math.floor(x + 0.5)
def mean_of(lv, mult, var):
    mid = MID[lv] * mult; lo = max(1, jr(mid * (1 - var))); hi = max(lo, jr(mid * (1 + var))); return (lo + hi) / 2, lo, hi
def total(W, b, lv, cdr=0.0, cut=0.0):
    m = mean_of(lv, W[1], W[2])[0]; sk = loadout(b, lv); v = []
    for i in range(61):
        s = (0.7 + i * 0.01) * (1 - cdr)
        v.append(sim(W[0] - cut, m, sk, {k: c[3] * s for k, c in SK.items()}))
    return tuple(sum(x[j] for x in v) / len(v) for j in range(2))
pct = lambda a, b: f'{a / b - 1:+.0%}'.replace('-', '−')
def compare(title, bow, xb, cuts=(0.0,), lvs=(10, 50), cdrs=(0.0, 0.3)):
    print(f'\n### {title}\n')
    for w, W in (('활', bow), ('석궁', xb)):
        m, lo, hi = mean_of(50, W[1], W[2]); print(f'- {w} {W[0]}초 · ±{W[2]:.0%} · ×{W[1]} → Lv50 {lo}~{hi} (평균 {m})')
    print('\n| T1 −n초 | 쿨감 | 레벨 | 평타 | ' + ' | '.join(BUILDS) + ' |'); print('|---|---|---|---|' + '---|' * len(BUILDS))
    for cut in cuts:
        for cdr in cdrs:
            for lv in lvs:
                row = []; basic = None
                for b in BUILDS:
                    a, x = total(bow, b, lv, cdr, cut), total(xb, b, lv, cdr, cut)
                    basic = pct(x[0], a[0]); row.append(pct(x[0] + x[1], a[0] + a[1]))
                print(f'| {cut} | {cdr:.0%} | Lv{lv} | {basic} | ' + ' | '.join(row) + ' |')
compare('지금 데이터 — 석궁 기준 차이', (2.9, 1.0, 0.14), (3.7, 1.0, 0.20), cuts=(0.0, 0.5))
compare('기사 모양 — 석궁 3.7초 ×1.3', (2.9, 1.0, 0.14), (3.7, 1.3, 0.5), cuts=(0.0, 0.5))
compare('석궁 3.7초 ×1.2', (2.9, 1.0, 0.14), (3.7, 1.2, 0.5), cuts=(0.0, 0.5), cdrs=(0.0,))
compare('석궁 3.7초 ×1.4', (2.9, 1.0, 0.14), (3.7, 1.4, 0.5), cuts=(0.0, 0.5), cdrs=(0.0,))
# 평타 · 스킬 몫
for b in BUILDS:
    a = total((2.9, 1.0, 0.14), b, 50); print(f'- 활 {b} Lv50 평타 몫 {a[0] / (a[0] + a[1]):.0%}')
