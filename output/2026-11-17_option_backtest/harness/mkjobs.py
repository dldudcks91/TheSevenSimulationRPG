"""본 측정 일감 목록 — 결투장(시드 · 단 · 대상 · 몫) · 원정 탐침(시드 · 단). python mkjobs.py <N> <N_seed5> <K>
몫 수 = 미러 한 판 시간(dev 측정 out/dev_sv1.txt · 헬은 나이트메어 값으로 어림) × 판 수 × 변형 수 ÷ 600 초."""
import json, math, sys
from pathlib import Path
H = Path(__file__).resolve().parent
OUT = H.parent / 'out'
N, N5, K = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3])
ms = {}
sv = OUT / 'dev_sv1.txt'
if sv.exists():
    for r in json.loads(sv.read_text(encoding='utf-8')):
        if not r.get('missing'): ms[(r['seed'], r['tier'])] = r['msPer']
jobs = []
for tier in ('normal', 'nightmare', 'hell'):
    for seed in range(1, 9):
        m = ms.get((seed, tier)) or ms.get((seed, 'nightmare')) or 10
        n = N5 if seed == 5 else N
        for who in ('phys', 'mag'):
            if seed == 7 and who == 'mag':
                continue   # 마법 무기 영웅이 없다 (전사 · 궁수 · 기사)
            nvar = 46 if who == 'phys' else 57
            cost = m / 1000 * 2 * n * nvar
            parts = max(1, math.ceil(cost / 600))
            for p in range(parts):
                suf = f'_p{p}' if parts > 1 else ''
                jobs.append({'name': f'A_{seed}_{tier}_{who}{suf}', 'query': f'mode=arena&seed={seed}&tier={tier}&who={who}&n={n}&part={p}&parts={parts}',
                             'max': 4 * 3600, 'cost': round(cost / parts)})
jobs.sort(key=lambda j: -j['cost'])
(H.parent / 'jobs' / 'arena.json').write_text(json.dumps(jobs), encoding='utf-8')
pj = [{'name': f'P_{seed}_{tier}', 'query': f'mode=probe&seed={seed}&tier={tier}&K={K}', 'max': 4 * 3600} for tier in ('normal', 'nightmare', 'hell') for seed in range(1, 9)]
(H.parent / 'jobs' / 'probe.json').write_text(json.dumps(pj), encoding='utf-8')
print(len(jobs), 'arena jobs · est CPU', round(sum(j['cost'] for j in jobs) / 60), 'min ·', len(pj), 'probe jobs')
