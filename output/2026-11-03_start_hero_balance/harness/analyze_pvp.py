"""리그 · 고유 교체 집계 — python -X utf8 analyze_pvp.py league1 [league5]"""
import json, sys
from collections import defaultdict
from pathlib import Path
import numpy as np

OUT = Path(__file__).resolve().parent.parent / 'out'
desc = json.loads((OUT / 'desc.txt').read_text(encoding='utf-8'))['rows']
party = defaultdict(list)
for r in desc: party[r['seed']].append(r)
ABBR = {'warrior': 'W', 'knight': 'K', 'mage': 'M', 'archer': 'A', 'priest': 'P'}
combo = {s: '+'.join(sorted(ABBR[h['cls']] for h in hs)) for s, hs in party.items()}

def league(name):
    d = json.loads((OUT / f'{name}.txt').read_text(encoding='utf-8'))
    S = d['S']
    pts = defaultdict(list)    # seed → [(win 1/0.5/0, margin)]
    mism = to = 0
    secs = []
    for a, b, aw, am, s1, bw, bm, s2 in d['fights']:
        secs += [s1, s2]
        for won, m, me, other in ((aw, am, a, b), (bw, bm, b, a)):
            # 팀 쪽이 졌는데 HP 비율이 앞섰다 = 시간 초과(무승부로 반)
            if won == 0 and m > 0: to += 1; w = 0.5
            else: w = won
            if won == 1 and m <= 0: mism += 1
            pts[me].append((w, m)); pts[other].append((1 - w, -m))
    score = {s: (np.mean([w for w, _ in v]), np.mean([m for _, m in v])) for s, v in pts.items()}
    n = len(d['fights']) * 2
    print(f'\n=== {name} · lv {d["lv"] or 1} · parties {S} · fights {n} · timeouts {to} ({to/n:.1%}) · won-but-behind {mism} · median sec {np.median(secs):.1f}')
    ws = np.array([score[s][0] for s in sorted(score)])
    print(f'party win rate spread: p10 {np.percentile(ws,10):.2f} p25 {np.percentile(ws,25):.2f} p50 {np.median(ws):.2f} p75 {np.percentile(ws,75):.2f} p90 {np.percentile(ws,90):.2f} min {ws.min():.2f} max {ws.max():.2f}')
    half = lambda s: 0 if s <= S // 2 else 1
    # 조합
    print('combo           n   win   (half1 / half2)   margin')
    by = defaultdict(list)
    for s, (w, m) in score.items(): by[combo[s]].append((s, w, m))
    for k, v in sorted(by.items(), key=lambda kv: -np.mean([x[1] for x in kv[1]])):
        h = [np.mean([x[1] for x in v if half(x[0]) == i]) for i in (0, 1)]
        print(f'{k:12s} {len(v):4d}  {np.mean([x[1] for x in v]):.3f}  ({h[0]:.3f} / {h[1]:.3f})  {np.mean([x[2] for x in v]):+.3f}')
    # 직업 있음 / 없음
    print('class   with  win    without  win    (halves with-without)')
    for c in ABBR:
        w = [score[s][0] for s in score if any(h['cls'] == c for h in party[s])]
        wo = [score[s][0] for s in score if not any(h['cls'] == c for h in party[s])]
        dh = []
        for i in (0, 1):
            a = [score[s][0] for s in score if half(s) == i and any(h['cls'] == c for h in party[s])]
            b = [score[s][0] for s in score if half(s) == i and not any(h['cls'] == c for h in party[s])]
            dh.append(np.mean(a) - np.mean(b))
        print(f'{c:8s} {len(w):4d} {np.mean(w):.3f}   {len(wo):4d}  {np.mean(wo):.3f}   ({dh[0]:+.3f} / {dh[1]:+.3f})')
    # 영웅 기여 회귀 — 파티 승률 = Σ β[직업 · 등급] (절편 없음 — 셋이 늘 하나씩)
    keys = sorted({(h['cls'], h['tier']) for hs in party.values() for h in hs})
    def fit(seeds):
        X = np.array([[sum(1 for h in party[s] if (h['cls'], h['tier']) == k) for k in keys] for s in seeds], float)
        y = np.array([score[s][0] for s in seeds])
        beta, *_ = np.linalg.lstsq(X, y, rcond=None)
        return dict(zip(keys, beta))
    allb = fit(sorted(score)); h1 = fit([s for s in score if half(s) == 0]); h2 = fit([s for s in score if half(s) == 1])
    print('hero weight (party win share each hero carries · sums to party win) — class: rare / magic / normal  [half1 | half2]')
    for c in ABBR:
        row = ' / '.join(f'{allb.get((c, t), float("nan")):.3f}' for t in ('rare', 'magic', 'normal'))
        r1 = ' / '.join(f'{h1.get((c, t), float("nan")):.2f}' for t in ('rare', 'magic', 'normal'))
        r2 = ' / '.join(f'{h2.get((c, t), float("nan")):.2f}' for t in ('rare', 'magic', 'normal'))
        print(f'{c:8s} {row}   [{r1} | {r2}]')
    # 고유 (관찰)
    print('innate (observed, party win when hero with that innate is present)')
    inn = defaultdict(list)
    for s in score:
        for h in party[s]: inn[(h['cls'], h['innate'])].append(score[s][0])
    for k in sorted(inn): print(f'  {k[0]:8s} {k[1]:18s} n {len(inn[k]):3d}  {np.mean(inn[k]):.3f}')
    # 무엇이 갈랐나 — 파티 단위 상관
    feats = {
        'hpSum': lambda hs: sum(h['hp'] for h in hs),
        'statSum': lambda hs: sum(h['statSum'] for h in hs),
        'frontN': lambda hs: sum(1 for h in hs if h['cls'] in ('warrior', 'knight')),
        'physDps': lambda hs: sum(h['atk'] / h['period'] for h in hs if h['basic'] and h['period']),
        'defSum': lambda hs: sum(h['def'] for h in hs),
        'weaponOpts': lambda hs: sum((h['weapon'] or {}).get('opts', 0) for h in hs),
    }
    y = np.array([score[s][0] for s in sorted(score)])
    print('corr with party win: ' + ' · '.join(f'{k} {np.corrcoef([f(party[s]) for s in sorted(score)], y)[0,1]:+.2f}' for k, f in feats.items()))
    return score

def swap(name):
    d = json.loads((OUT / f'{name}.txt').read_text(encoding='utf-8'))
    rows = d['rows']
    print(f'\n=== {name} · parties {d["S"]} · opponents {d["M"]} × 2 sides — same hero, only innate replaced')
    by = defaultdict(lambda: defaultdict(list))
    for r in rows: by[r['cls']][r['alt']].append(r)
    for c, alts in by.items():
        # 같은 영웅끼리 짝지은 차이 — 그 직업 고유 평균 대비
        heroes = defaultdict(dict)
        for alt, rs in alts.items():
            for r in rs: heroes[(r['seed'], r['slot'])][alt] = r['win']
        print(f'{c}  (heroes {len(heroes)})')
        for alt in alts:
            diffs, d1, d2 = [], [], []
            for (s, sl), m in heroes.items():
                base = np.mean(list(m.values()))
                diffs.append(m[alt] - base); (d1 if s <= d['S'] // 2 else d2).append(m[alt] - base)
            print(f'   {alt:18s} win {np.mean([r["win"] for r in alts[alt]]):.3f}  vs class avg {np.mean(diffs):+.3f}  (halves {np.mean(d1):+.3f} / {np.mean(d2):+.3f})  margin {np.mean([r["margin"] for r in alts[alt]]):+.3f}')

for a in sys.argv[1:]:
    (swap if a.startswith('swap') else league)(a)
