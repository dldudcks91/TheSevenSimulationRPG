"""R427 판(../2026-11-16_basic_skills/board.txt) ↔ R515 판(duel_<cls>.json) 나란히 → board.txt"""
import json, re, sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
BASE = Path(__file__).resolve().parent
OLD = BASE.parent / '2026-11-16_basic_skills' / 'board.txt'
old = {}
for ln in OLD.read_text(encoding='utf-8').splitlines():
    m = re.match(r'(\w+)\s+(\w+)\s+(.+?)\s+t(\d) cool\s+(\d+) attrs=(\S+)\s+stat=(\w) fired=(\w) nc25=\s*([\d.]+)% Δ15=([+-][\d.]+) Δ25=([+-][\d.]+) Δ45=([+-][\d.]+)', ln)
    if m:
        cls, sid, name, tier, cool, attrs, st, fired, nc, d15, d25, d45 = m.groups()
        old[sid] = dict(cls=cls, name=name.strip(), tier=int(tier), cool=int(cool), attrs=attrs, stat=st, nc25=float(nc), d={15: float(d15), 25: float(d25), 45: float(d45)})
out = []; p = out.append
rows = []
for cls in ['warrior', 'knight', 'archer', 'mage', 'priest']:
    d = json.loads((BASE / f'duel_{cls}.json').read_text(encoding='utf-8')); R = d['res']; M = d['meta']
    p(f'== {cls}  dur(none) ' + ' / '.join(str(R[str(lv)]['none']['dur']) for lv in M['levels']))
    for s in M['skills']:
        o = old[s]; dl = {}; half = []; stat = 0; first = None; nc = None; casts = None
        for lv in M['levels']:
            r = R[str(lv)]; b = r['none']; v = r[s]; a = r[s + '+attr']
            dl[lv] = v['margin'] - b['margin']
            half.append((v['m1'] - b['m1'], v['m2'] - b['m2']))
            stat = max(stat, abs(a['margin'] - v['margin']))
            if lv == 25: first, nc, casts = v['first'], v['noCastPct'], v['casts']
        mixed = any((h1 > 0) != (h2 > 0) for h1, h2 in half)
        rows.append(dict(id=s, cls=cls, tier=o['tier'], d=dl, nc=nc, old=o))
        p(f'{s:<17} {o["name"]:<9} t{o["tier"]} cool{o["cool"]:>3} stat={"O" if stat > 0.01 else "X"}(old {o["stat"]}) '
          f'| Δ25 {o["d"][25]:+.3f} → {dl[25]:+.3f} | nc25 {o["nc25"]:5.1f}% → {nc:5.1f}% | first25 {str(first):>5} casts25 {casts:4.2f} '
          f'| Δ15 {dl[15]:+.3f} Δ45 {dl[45]:+.3f} | halves={"mixed" if mixed else "ok"}')
p('')
for t in (1, 2):
    sel = [r for r in rows if r['tier'] == t]
    for lv in (15, 25, 45):
        p(f'mean Δ{lv} tier{t} n{len(sel)}: old {sum(r["old"]["d"][lv] for r in sel) / len(sel):+.3f} → new {sum(r["d"][lv] for r in sel) / len(sel):+.3f}')
p('noCast>=50% at Lv25 old ' + str(sum(r['old']['nc25'] >= 50 for r in rows)) + ' → new ' + str(sum(r['nc'] >= 50 for r in rows)) + ' ' + str([r['id'] for r in rows if r['nc'] >= 50]))
p('|Δ25| < 0.02 old ' + str(sum(abs(r['old']['d'][25]) < 0.02 for r in rows)) + ' → new ' + str(sum(abs(r['d'][25]) < 0.02 for r in rows)) + ' ' + str([r['id'] for r in rows if abs(r['d'][25]) < 0.02]))
(BASE / 'board.txt').write_text('\n'.join(out), encoding='utf-8'); print('\n'.join(out))
