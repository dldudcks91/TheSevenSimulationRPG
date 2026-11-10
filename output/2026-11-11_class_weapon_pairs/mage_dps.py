# -*- coding: utf-8 -*-
"""마법사 오브 vs 스태프 DPS — 칸 충전(battle_design §3): 주기마다 칸 하나(상한 cast_charge_max) · 시전 = 칸 하나 · 준비된 스킬이 있고 칸이 있으면 0.1초 틱에 곧바로.
평타 없음 · 쿨은 시전 뒤부터 · 쿨 ±30% 평균 · 단일 대상 기대값(전체 대상 스킬도 한 대상 몫) · 저항 뺌 · 스킬 레벨 1."""
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
CAP = int(f('cast_charge_max')); CRIT = 1 + f('base_crit_pct') * (f('base_crit_damage_pct') - 1)
SK = {'fireball': (3.2, 10), 'inferno': (1.6, 12), 'meteor': (4.2, 18),
      'iceblast': (1.1, 5), 'frostnova': (1.15, 12), 'frozenorb': (3.2, 12),
      'lightning': (2.5, 9), 'chain': (1.3, 9), 'thunder': (2.6, 10)}
BUILDS = {'파이어 (파이어볼 · 인페르노 · 메테오)': ['fireball', 'inferno', 'meteor'],
          '프로스트 (아이스 블라스트 · 노바 · 프로즌 오브)': ['iceblast', 'frostnova', 'frozenorb'],
          '썬더 (라이트닝 · 체인 · 썬더 스트라이크)': ['lightning', 'chain', 'thunder']}
def loadout(b, lv): return BUILDS[b][:1 if lv < 10 else 2 if lv < 30 else 3]
def sim(period, mean, skills, cds, T=600.0, dt=0.1):
    ready = {s: cds[s] for s in skills}; order = {s: i for i, s in enumerate(skills)}
    slots, gauge, t, dmg, casts = 0, 0.0, 0.0, 0.0, 0
    steps = int(T / dt)
    for i in range(steps):
        t = (i + 1) * dt
        if slots < CAP:
            gauge += dt
            if gauge >= period - 1e-9: gauge -= period; slots += 1
        cand = [s for s in skills if ready[s] <= t + 1e-9]
        if cand and slots > 0:
            s = min(cand, key=lambda s: (ready[s], order[s]))
            dmg += mean * SK[s][0] * CRIT; ready[s] = t + cds[s]; slots -= 1; casts += 1
            if slots == CAP - 1 and gauge == 0: pass
    return dmg, casts
def jr(x): return math.floor(x + 0.5)
def mean_of(lv, mult, var):
    mid = MID[lv] * mult; lo = max(1, jr(mid * (1 - var))); hi = max(lo, jr(mid * (1 + var))); return (lo + hi) / 2
def total(W, b, lv, cdr=0.0, cut=0.0):
    m = mean_of(lv, W[1], W[2]); sk = loadout(b, lv); v = []
    for i in range(0, 61, 3):
        s = 0.7 + i * 0.01
        v.append(sim(W[0], m, sk, {k: max(0.5, c[1] * s * (1 - cdr) - cut) for k, c in SK.items()}))
    return tuple(sum(x[j] for x in v) / len(v) for j in range(2))
pct = lambda a, b: f'{a / b - 1:+.0%}'.replace('-', '−')
def compare(title, orb, staff, cdrs=(0.0, 0.3), lvs=(10, 50), cut=0.0):
    print(f'\n### {title}\n')
    print('| 쿨감 | 레벨 | ' + ' | '.join(BUILDS) + ' |'); print('|---|---|' + '---|' * len(BUILDS))
    for cdr in cdrs:
        for lv in lvs:
            row = []
            for b in BUILDS:
                a, x = total(orb, b, lv, cdr, cut), total(staff, b, lv, cdr, cut)
                row.append(f'{pct(x[0], a[0])} ({x[1]:.0f}/{a[1]:.0f}회)')
            print(f'| {cdr:.0%} | Lv{lv} | ' + ' | '.join(row) + ' |')
if __name__ == '__main__':
    compare('지금 — 오브 2.7 ×1 · 스태프 3.5 ×1 (스태프 기준 · 시전 횟수 스태프/오브)', (2.7, 1.0, 0.10), (3.5, 1.0, 0.15))
    compare('기사 숫자 — 오브 2.7 · 스태프 3.7 ×1.3', (2.7, 1.0, 0.10), (3.7, 1.3, 0.8))
    compare('스태프 3.5 ×1.3', (2.7, 1.0, 0.10), (3.5, 1.3, 0.15), cdrs=(0.0, 0.3), lvs=(50,))
