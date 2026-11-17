"""out/M_*.txt → 표. python analyze.py [tag]"""
import json, statistics as stt, sys
from pathlib import Path
tag = sys.argv[1] if len(sys.argv) > 1 else 'M'
OUT = Path(__file__).resolve().parent.parent / 'out'
recs = []
for p in sorted(OUT.glob(f'{tag}_*.txt')):
    t = p.read_text(encoding='utf-8').strip()
    if t: recs += json.loads(t)['out']
recs.sort(key=lambda r: r['seed'])
seeds = [r['seed'] for r in recs]
half = len(seeds) // 2
H1, H2 = set(seeds[:half]), set(seeds[half:])
STALL = 300
med = lambda xs: round(stt.median(xs), 2) if xs else None
h = lambda s: round(s / 3600, 2)
print(f'시드 {len(recs)} ({seeds[0]}~{seeds[-1]}) · 앞 절반 {sorted(H1)} · 뒤 절반 {sorted(H2)}')
print()
print('## 캠페인 — 원정 플레이 시간(재출발 대기 빼고 · 시간) · 판 수 · 막힘')
for diff in ('nightmare', 'hell'):
    rows = []
    for r in recs:
        a, b = r.get('A', {}).get(diff), r.get('B', {}).get(diff)
        if not a or not b: continue
        rows.append((r['seed'], a, b))
    if not rows: print(diff, '— 표본 없음'); continue
    def line(sel, label):
        rs = [x for x in rows if x[0] in sel]
        done = [x for x in rs if not x[1]['stuck'] and not x[2]['stuck']]
        sk = lambda v: [len(x[1 if v == 'A' else 2].get('skips') or []) for x in rs]
        ratio = [x[2]['exp'] / x[1]['exp'] for x in done if x[1]['exp'] > 0]
        print(f"{diff} {label}: 둘 다 완주 {len(done)}/{len(rs)} · A 막힘 {sum(1 for x in rs if x[1]['stuck'])} · B 막힘 {sum(1 for x in rs if x[2]['stuck'])} · "
              f"A 중앙 {h(med([x[1]['exp'] for x in done]) or 0)}h · B 중앙 {h(med([x[2]['exp'] for x in done]) or 0)}h · 시드별 B/A 중앙 ×{round(med(ratio), 2) if ratio else '-'} "
              f"[{round(min(ratio), 2) if ratio else '-'} ~ {round(max(ratio), 2) if ratio else '-'}] · 판 수 A {med([x[1]['runs'] for x in done])} B {med([x[2]['runs'] for x in done])} · "
              f"못 넘은 칸(막힘 {STALL}판) 시드당 A {round(sum(sk('A')) / max(1, len(rs)), 1)} · B {round(sum(sk('B')) / max(1, len(rs)), 1)} (0칸 시드 A {sk('A').count(0)} · B {sk('B').count(0)}) · "
              f"판당 승률 A {round(sum(x[1]['wins'] for x in rs) / max(1, sum(x[1]['runs'] for x in rs)) * 100, 1)}% B {round(sum(x[2]['wins'] for x in rs) / max(1, sum(x[2]['runs'] for x in rs)) * 100, 1)}%")
    line(set(seeds), '전체')
    line(H1, '앞 절반')
    line(H2, '뒤 절반')
    for x in rows:
        for v in 'AB':
            s = x[1 if v == 'A' else 2]['stuck']
            if s: print(f"  막힘 seed {x[0]} {v}: {s['why']} {s['stageId']} tries {s['tries']}")
    from collections import Counter
    for v in 'AB':
        c = Counter(k['stageId'] for x in rows for k in (x[1 if v == 'A' else 2].get('skips') or []))
        print(f"  {v} 못 넘은 칸 (시드 수): " + ' · '.join(f'{sid}×{n}' for sid, n in sorted(c.items())))
    print()
print('## 탐침 — A 캠페인이 그 칸에 처음 도착한 상태 · 같은 상태를 A · B 로 K 판씩')
print('| 단 | 칸 | 도착 Lv | A 승률 | B 승률 | Δ | A 판 시간 중앙 | B | A 전투불능 평균 | B | 앞/뒤 절반 Δ |')
print('|---|---|---|---|---|---|---|---|---|---|---|')
cells = {}
for r in recs:
    for p in r['probes']:
        cells.setdefault((p['diff'], p['stageId']), []).append((r['seed'], p))
deltas = []
for (diff, sid), lst in sorted(cells.items(), key=lambda kv: (kv[0][0] != 'nightmare', kv[0][1])):
    def agg(sel):
        A = [x for s, p in lst if s in sel for x in p['A'] if 'won' in x]
        B = [x for s, p in lst if s in sel for x in p['B'] if 'won' in x]
        return A, B
    A, B = agg(set(seeds))
    if not A or not B: continue
    wa, wb = sum(x['won'] for x in A) / len(A) * 100, sum(x['won'] for x in B) / len(B) * 100
    a1, b1 = agg(H1); a2, b2 = agg(H2)
    d1 = (sum(x['won'] for x in b1) / len(b1) - sum(x['won'] for x in a1) / len(a1)) * 100 if a1 and b1 else float('nan')
    d2 = (sum(x['won'] for x in b2) / len(b2) - sum(x['won'] for x in a2) / len(a2)) * 100 if a2 and b2 else float('nan')
    lv = med([p['arrive']['lv'] for s, p in lst])
    kind = '장 보스' if sid % 100 == 51 else '일반 칸'
    name = f"{sid // 1000}-{(sid // 10) % 100 % 10} {'III' if sid % 10 == 3 else ''} {kind}".replace('  ', ' ')
    print(f"| {diff} | {sid} {kind} | {lv} | {wa:.0f}% | {wb:.0f}% | {wb - wa:+.0f}p | {med([x['sec'] for x in A])} | {med([x['sec'] for x in B])} | "
          f"{sum(x['downed'] for x in A) / len(A):.2f} | {sum(x['downed'] for x in B) / len(B):.2f} | {d1:+.0f} / {d2:+.0f} |")
    deltas.append((wb - wa, diff, sid, wa, wb, len(A)))
print()
print('표본(판) 수 —', ', '.join(f'{d}:{s} {n}' for _, d, s, _, _, n in deltas[:3]), '…')
print('가장 크게 떨어진 칸 셋:', [(d, s, f'{wa:.0f}% → {wb:.0f}%') for dd, d, s, wa, wb, n in sorted(deltas)[:3]])
for diff in ('nightmare', 'hell'):
    xs = [(wa, wb, n) for dd, d, s, wa, wb, n in deltas if d == diff]
    if xs:
        tw = sum(n for *_, n in xs)
        print(f'{diff} 탐침 전체 승률 A {sum(wa * n for wa, wb, n in xs) / tw:.1f}% → B {sum(wb * n for wa, wb, n in xs) / tw:.1f}%')
