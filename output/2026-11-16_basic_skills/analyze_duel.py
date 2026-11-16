"""duel_<cls>.json -> analysis_duel.txt (numbers only)."""
import json
from pathlib import Path
BASE = Path(__file__).resolve().parent
out = []; p = out.append
for cls in ['warrior', 'knight', 'archer', 'mage', 'priest']:
    d = json.loads((BASE / f'duel_{cls}.json').read_text(encoding='utf-8')); R = d['res']; M = d['meta']
    p(f'\n== {cls}  pairs ' + ' '.join(f'Lv{lv}:{R[str(lv)]["pairs"]}' for lv in M['levels']) + '  base win ' + ' / '.join(str(R[str(lv)]['none']['win']) for lv in M['levels']) + '  dur ' + ' / '.join(str(R[str(lv)]['none']['dur']) for lv in M['levels']))
    p(f'{"skill":<18} {"attrs":<9} | ' + ' | '.join(f'Lv{lv} Δ(h1,h2) win casts first nc% attrΔ' for lv in M['levels']))
    for s in M['skills']:
        cells = []
        for lv in M['levels']:
            r = R[str(lv)]; b = r['none']; v = r[s]; a = r[s + '+attr']
            dl = v['margin'] - b['margin']; d1 = v['m1'] - b['m1']; d2 = v['m2'] - b['m2']; da = a['margin'] - v['margin']
            cells.append(f'{dl:+.3f}({d1:+.2f},{d2:+.2f}) {v["win"]-b["win"]:+5.1f} {v["casts"]:4.2f} {str(v["first"]):>5} {v["noCastPct"]:5.1f} {da:+.3f}')
        p(f'{s:<18} {",".join(M["attrs"][s]):<9} | ' + ' | '.join(cells))
    p('effect counters Lv25 (buffs dots dotDmg heal evades heroDmg):')
    for s in M['skills']:
        v = R['25'][s]; p(f'   {s:<18} buffs {v["buffs"]} dots {v["dots"]} dotDmg {v["dotDmg"]} heal {v["heal"]} evades {v["evades"]} heroDmg {v["heroDmg"]} (none heroDmg {R["25"]["none"]["heroDmg"]}) err {v["err"]}')
(BASE / 'analysis_duel.txt').write_text('\n'.join(out), encoding='utf-8'); print('\n'.join(out))
