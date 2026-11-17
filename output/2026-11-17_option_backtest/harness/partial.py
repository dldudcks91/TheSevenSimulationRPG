"""중단(사용자 지시) 뒤 이미 나온 out/ 만으로 — 값 표(게임 함수 · V_*.txt 의 c3.values) · 도구 검증 셋 · 미러 판 모습(dev_sv1) · 캠페인.
python partial.py → out/partial.md"""
import json, re
from pathlib import Path
from collections import defaultdict
OUT = Path(__file__).resolve().parent.parent / 'out'
TIERS = ['normal', 'nightmare', 'hell']
TKO = {'normal': '노말', 'nightmare': '나이트메어', 'hell': '헬'}
L = []
W = L.append

# ── 캠페인
W('## 캠페인 (봇 · 시드 1 ~ 8)\n')
W('| 시드 | 파티 | 노말 판 · 끝 Lv · ilvl | 나이트메어 판 · 끝 Lv · ilvl · 건너뜀 | 헬 판 · 건너뜀 |')
W('|---|---|---|---|---|')
for s in range(1, 9):
    d = json.loads((OUT / f'C_{s}.txt').read_text(encoding='utf-8'))
    t = d['tiers']
    f = lambda x: f"{x['runs']} · {x['end']['lv']} · {x['end']['ilvl']}"
    W(f"| {s} | {'/'.join(d['classes'])} | {f(t['normal'])} | {f(t['nightmare'])} · {len(t['nightmare']['skips'])} | {t['hell']['runs']} · {len(t['hell']['skips'])} |")

# ── 도구 검증 셋
W('\n## 도구 검증 셋 (PLAN 절차 3)\n')
W('| 시드 · 단 | ① 결정론 | ② 결투장 +20% (남은 HP 차 z · 승률) | ② 원정 첫 대표 칸 12판 | ③ 줄 반영 |')
W('|---|---|---|---|---|')
V = {}
for p in sorted(OUT.glob('V_*.txt')):
    t = p.read_text(encoding='utf-8').strip()
    if not t: continue
    d = json.loads(t)
    V[(d['seed'], d['tier'])] = d
for tier in TIERS:
    for s in range(1, 9):
        d = V.get((s, tier))
        if not d:
            W(f'| {s} · {TKO[tier]} | 못 잼(중단) | 못 잼(중단) | 못 잼(중단) | 못 잼(중단) |'); continue
        c1, c2, c3 = d['c1'], d['c2'], d['c3']
        a = ' · '.join(f"{c2[w]['cls']} z{c2[w]['z']} {c2[w]['dWin'] * 100:+.1f}점 {'통과' if c2[w]['ok'] else '미달'}" for w in ('phys', 'mag') if w in c2)
        pr = ' · '.join(f"{x['cls']} 승 {x['win0']}→{x['win1']} 시간 {x['sec0']}→{x['sec1']} {'통과' if x['ok'] else '미달'}" for w, x in (c2.get('probe') or {}).items())
        W(f"| {s} · {TKO[tier]} | {'통과' if c1['ok'] else '실패'} ({sum(c1['arena'])}/{len(c1['arena'])} · {sum(c1['probe'])}/{len(c1['probe'])}) | {a} | {pr} | "
          f"{'통과' if c3['ok'] else '실패'} ({c3['arena']['n'] - len(c3['arena']['fail'])}/{c3['arena']['n']}) |")

# ── 값 (D3) — 게임 함수(optionRange 의 합성 무기)로 낸 메인 · 랜덤 줄 가운데
W('\n## 값 표 (D3 · 게임 함수 `item.optionRange` — 메인 = 가운데 확률 단어 범위 가운데 · 랜덤 = 랜덤 줄 범위 가운데)\n')
vals = defaultdict(lambda: defaultdict(list))   # (who, tier) → key → [(seed, v)]
lv = defaultdict(dict)
for (s, tier), d in V.items():
    for who in ('phys', 'mag'):
        tg = d['targets'].get(who)
        if tg: lv[(who, tier)][s] = (tg.split(':')[0], int(tg.split('Lv')[1]))
    for vid, x in d['c3']['values'].items():
        who, rest = vid.split(':', 1)
        tot = sum(float(l.split('=')[1].split('@')[0]) for l in x['lines'])
        vals[(who, tier)][rest].append((s, tot, (x.get('band') or {}).get('ilvl')))
def rng_(xs, fmt='{:.3g}'):
    vs = sorted({round(v, 4) for _, v, _ in xs})
    return fmt.format(vs[0]) if len(vs) == 1 else f"{fmt.format(vs[0])} ~ {fmt.format(vs[-1])}"
for who in ('phys', 'mag'):
    keys = []
    for tier in TIERS:
        for k in vals[(who, tier)]:
            kk = re.sub(r':(main|random)$', '', k)
            kk = re.sub(r':(war|kni|arc|mag|pri)_[a-z]+', ':*', kk)
            if kk not in keys and not kk.startswith(('prideB', 'pen')): keys.append(kk)
    W(f"\n### {'물리' if who == 'phys' else '마법'} 무기 — 메인 (랜덤)\n")
    W('| 옵션 | ' + ' | '.join(TKO[t] for t in TIERS) + ' |')
    W('|---|' + '---|' * len(TIERS))
    for kk in keys:
        cells = []
        for tier in TIERS:
            m = [x for k, xs in vals[(who, tier)].items() for x in xs if re.sub(r':(war|kni|arc|mag|pri)_[a-z]+', ':*', k) == kk + ':main']
            r = [x for k, xs in vals[(who, tier)].items() for x in xs if re.sub(r':(war|kni|arc|mag|pri)_[a-z]+', ':*', k) == kk + ':random']
            cells.append((rng_(m) if m else '—') + (f' ({rng_(r)})' if r else ''))
        W(f'| {kk} | ' + ' | '.join(cells) + ' |')
    W('\n아이템 레벨(대상 무기): ' + ' · '.join(f"{TKO[t]} {sorted({il for xs in vals[(who, t)].values() for _, _, il in xs if il})}" for t in TIERS))
    W('대상 영웅: ' + ' · '.join(f"{TKO[t]} " + ', '.join(f"{s}:{c}Lv{l}" for s, (c, l) in sorted(lv[(who, t)].items())) for t in TIERS))

# ── 오만 값 비교 (레벨당 × 영웅 레벨 vs 색욕 ③ · ⓑ)
W('\n## 오만 값 비교 — 실제로 더해지는 최대 데미지 수치(대상 영웅 · 메인 가운데)\n')
W('| 무기 · 단 | 시드 · 영웅 Lv | 오만 ⓐ 레벨당 × Lv | 색욕 ③ 최대(물리) | ⓑ n=10% · 25% · 50% |')
W('|---|---|---|---|---|')
for who in ('phys', 'mag'):
    for tier in TIERS:
        for s in sorted(lv[(who, tier)]):
            c, l = lv[(who, tier)][s]
            g = lambda k: next((v for ss, v, _ in vals[(who, tier)].get(k, []) if ss == s), None)
            pa = g('pride1:dmg_max_per_level:main')
            l3 = g('lust3:dmg_max_flat:main')
            b = [g(f'prideB:max:{n}') for n in ('0.1', '0.25', '0.5')]
            W(f"| {'물리' if who == 'phys' else '마법'} · {TKO[tier]} | {s} · {c} Lv{l} | {pa} × {l} = {round(pa * l) if pa else '—'} | {l3 if l3 is not None else '—'} | {' · '.join(str(int(x)) if x else '—' for x in b)} |")

# ── 미러 판 모습 (dev_sv1 · 노말 · 나이트메어 끝 · 바탕 60판 + 데미지 +20% 400판 짝)
sv = OUT / 'dev_sv1.txt'
if sv.exists():
    W('\n## 결투장 미러 판 모습 (바탕 60판 · 데미지 +20% 는 400판 짝)\n')
    W('| 시드 · 단 | 판 길이(초) · 시간 초과 | 피해 몫 (직업) | 앞줄 첫 쓰러짐(초) | +20% 남은 HP 차 (물리 · 마법) | +20% 승률(점) |')
    W('|---|---|---|---|---|---|')
    for r in json.loads(sv.read_text(encoding='utf-8')):
        if r.get('missing'): continue
        hs = r['heroes']
        front = [h for h in hs if h['rank'] == 0]
        e = r['eff']
        W(f"| {r['seed']} · {TKO[r['tier']]} | {r['sec']} · {r['to']}/60 | " + ' '.join(f"{h['cls']} {round(h['dealt'] * 100)}%" for h in hs)
          + f" | {', '.join(str(h['downT']) for h in front)} | " + ' · '.join(f"{w} {e[w]['dM']:+.3f}(z{e[w]['z']})" for w in ('phys', 'mag') if w in e)
          + ' | ' + ' · '.join(f"{e[w]['dW'] * 100:+.1f}" for w in ('phys', 'mag') if w in e) + ' |')
(OUT / 'partial.md').write_text('\n'.join(L) + '\n', encoding='utf-8')
print('ok', len(L))
