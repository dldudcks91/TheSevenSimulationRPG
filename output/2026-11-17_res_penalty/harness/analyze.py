"""out/R_*.txt → 페널티별 표. python analyze.py [tag]
탐침 = 대표 칸(장마다 c-4 III · c-5 장 보스)을 처음 깬 직후의 상태 · 페널티마다 같은 씨앗 K 판."""
import json, sys
from pathlib import Path
tag = sys.argv[1] if len(sys.argv) > 1 else 'R'
OUT = Path(__file__).resolve().parent.parent / 'out'
recs = []
for p in sorted(OUT.glob(f'{tag}_*.txt')):
    t = p.read_text(encoding='utf-8').strip()
    if t: recs += json.loads(t)['out']
recs.sort(key=lambda r: r['seed'])
seeds = [r['seed'] for r in recs]
half = len(seeds) // 2
H1, H2 = set(seeds[:half]), set(seeds[half:])
ELS = ['fire', 'cold', 'lightning', 'poison']
pct = lambda v: f'{v * 100:.0f}%'
print(f'시드 {len(recs)} ({seeds[0] if seeds else "-"}~{seeds[-1] if seeds else "-"}) · 앞 절반 {sorted(H1)} · 뒤 절반 {sorted(H2)}')
for r in recs:
    tiers = r.get('tiers', {})
    print(f"  시드 {r['seed']} {'/'.join(r['classes'])} · 노말 {r['normal']['runs']}판{' 막힘' if r['normal']['stuck'] else ''}"
          + ''.join(f" · {d} {tiers[d]['runs']}판 건너뜀 {len(tiers[d].get('skips') or [])}{' 막힘' if tiers[d]['stuck'] else ''} 끝 Lv{tiers[d]['end']['lv']} ilvl{tiers[d]['end']['ilvl']}" for d in tiers))

def rows_of(diff, sel=None, chapter=None):
    out = []
    for r in recs:
        if sel is not None and r['seed'] not in sel: continue
        for pr in r['probes']:
            if pr['diff'] != diff: continue
            if chapter is not None and pr['stageId'] // 100 != chapter: continue
            out.append(pr)
    return out

def table(diff):
    prs = rows_of(diff)
    if not prs:
        print(f'\n## {diff} — 표본 없음'); return
    pens = list(prs[0]['P'].keys())
    print(f'\n## {diff} — 탐침 {len(prs)}칸 × 페널티 {len(pens)} × {len(prs[0]["P"][pens[0]])}판')
    res = {el: sum(p['res'][el]['avg'] for p in prs) / len(prs) for el in ELS}
    rmin = {el: sum(p['res'][el]['min'] for p in prs) / len(prs) for el in ELS}
    print('파티 원소 저항(상한 전 · 탐침 칸 평균) — 평균 ' + ' · '.join(f'{el} {pct(res[el])}' for el in ELS)
          + ' / 가장 낮은 영웅 ' + ' · '.join(f'{el} {pct(rmin[el])}' for el in ELS))
    print()
    print('| 페널티 | 승률 | 앞 절반 | 뒤 절반 | 전투불능(판당) | 깬 라운드 | 받은 피해 중 원소 몫 | 받은 원소 피해(P0 대비) |')
    print('|---|---|---|---|---|---|---|---|')
    base_el = None
    for pv in pens:
        def agg(sel=None):
            rs = [x for p in (rows_of(diff, sel) if sel else prs) for x in p['P'][pv] if 'won' in x]
            return rs
        rs, a, b = agg(), agg(H1), agg(H2)
        win = sum(x['won'] for x in rs) / len(rs)
        wa = sum(x['won'] for x in a) / max(1, len(a)); wb = sum(x['won'] for x in b) / max(1, len(b))
        dn = sum(x['downed'] for x in rs) / len(rs)
        rc = sum(x['rc'] for x in rs) / len(rs)
        tot = sum(sum(x['taken'].values()) for x in rs)
        el = sum(sum(x['taken'][e] for e in ELS) for x in rs)
        if base_el is None: base_el = el
        print(f'| {pct(float(pv))} | {pct(win)} | {pct(wa)} | {pct(wb)} | {dn:.2f} | {rc:.2f} | {pct(el / tot if tot else 0)} | ×{el / base_el:.2f} |')
    print()
    print('장별 승률 (c-4 III + c-5 보스 · 페널티 0 → 각 값)')
    print('| 장 | ' + ' | '.join(pct(float(p)) for p in pens) + ' | P0 원소 몫 |')
    print('|---|' + '---|' * (len(pens) + 1))
    for c in range(1, 6):
        cp = rows_of(diff, chapter=c * 10)
        if not cp: continue
        cells = []
        for pv in pens:
            rs = [x for p in cp for x in p['P'][pv] if 'won' in x]
            cells.append(pct(sum(x['won'] for x in rs) / len(rs)) if rs else '-')
        r0 = [x for p in cp for x in p['P'][pens[0]] if 'won' in x]
        tot = sum(sum(x['taken'].values()) for x in r0)
        el = sum(sum(x['taken'][e] for e in ELS) for x in r0)
        print(f'| {c}장 | ' + ' | '.join(cells) + f' | {pct(el / tot if tot else 0)} |')

for d in ('nightmare', 'hell'):
    table(d)
