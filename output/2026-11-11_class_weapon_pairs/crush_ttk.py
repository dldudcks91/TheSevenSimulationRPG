# -*- coding: utf-8 -*-
"""둔기 강타 vs 도끼 치명 — 같은 기본 성능(3.0초 · ±25% · ×1)에서 처치 시간. 기대값 결정론 · 단일 대상 · 회복 없음.
강타 = 직격마다 맞기 직전 대상 현재 체력 × % (치명 · 방어 무관 · 적중해야 붙는다 — battle.js strike). 쿨 ±30% 평균."""
import sys, io, os

src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'warrior_dps.py'), encoding='utf-8').read().split('# (주기, 한 방 배율, 변동)')[0]
exec(src)
SKH = {'bash': (1, 3.0, 15), 'dswing': (2, 1.1, 8), 'whirl': (5, 0.5, 11), 'thor': (1, 4.2, 22), 'mutual': (1, 4.2, 16)}  # 타수 · 타당 배율 · 쿨
K = 200.0
def ttk(period, mean, skills, cds, hp0, dfn, crit_add, cdmg, crush, T=600.0):
    cf = 1 + min(1, 0.3 + crit_add) * (cdmg - 1)
    mit = 1 - dfn / (dfn + K)
    ready = {s: cds[s] for s in skills}; order = {s: i for i, s in enumerate(skills)}
    hp, t = hp0, period
    def hit(m):
        nonlocal hp
        hp -= HIT * (mean * m * cf * mit + hp * crush)
    while t <= T:
        cand = [s for s in skills if ready[s] <= t + 1e-9]
        if cand:
            s = min(cand, key=lambda s: (ready[s], order[s]))
            n, m, _ = SKH[s]
            for _ in range(n):
                hit(m)
                if hp <= 0: return t
            ready[s] = t + cds[s]
        hit(1.0)
        if hp <= 0: return t
        t += period
    return T
def avg(build, hp0, dfn, crit_add=0, cdmg=1.5, crush=0, lv=50, period=3.0):
    mean = rng_mean(lv, 1.0, 0.25)[2]; sk = BUILDS[build]; v = []
    for i in range(61):
        s = 0.7 + i * 0.01
        v.append(ttk(period, mean, sk, {k: c * s for k, (_, _, c) in SKH.items()}, hp0, dfn, crit_add, cdmg, crush))
    return sum(v) / len(v)
TGT = [('로브 영웅', 2000, 50), ('중갑 영웅', 3000, 170), ('중갑 탱커', 4000, 300)]
print('| 무기 | ' + ' | '.join(f'{n} (HP {h} · 방어 {d})' for n, h, d in TGT) + ' |')
print('|---|' + '---|' * len(TGT))
for b in BUILDS:
    base = [avg(b, h, d) for _, h, d in TGT]
    print(f'| **{b}** 특성 없음 | ' + ' | '.join(f'{x:.1f}초' for x in base) + ' |')
    for label, kw in [('도끼 치명 +10% · 치명 피해 1.5', dict(crit_add=0.1)), ('도끼 치명 +10% · 치명 피해 2.0', dict(crit_add=0.1, cdmg=2.0)),
                      ('둔기 강타 1%', dict(crush=0.01)), ('둔기 강타 2%', dict(crush=0.02)), ('둔기 강타 3%', dict(crush=0.03))]:
        row = []
        for (n, h, d), b0 in zip(TGT, base):
            ref = b0 if 'cdmg' not in kw else avg(b, h, d, cdmg=2.0)
            x = avg(b, h, d, **kw)
            row.append(f'{x:.1f}초 ({ref / x - 1:+.0%})'.replace('-', '−'))
        print(f'| {label} | ' + ' | '.join(row) + ' |')
