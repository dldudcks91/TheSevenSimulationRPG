"""마법사 짝(고유 칸 = 공격 스킬 · 배운 칸 = 시험 스킬) — R427 판 ↔ R515 판 → analysis_mage_pairs.txt"""
import json, sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
BASE = Path(__file__).resolve().parent
OLD = BASE.parent / '2026-11-16_basic_skills'
out = []; p = out.append
for partner in ['mag_fireball', 'mag_iceblast', 'mag_lightning']:
    o = json.loads((OLD / f'duel_mage_{partner}.json').read_text(encoding='utf-8'))['res']
    n = json.loads((BASE / f'duel_mage_{partner}.json').read_text(encoding='utf-8')); M = n['meta']; n = n['res']
    p(f'== partner {partner}  base win ' + ' / '.join(f'{o[str(lv)]["none"]["win"]}→{n[str(lv)]["none"]["win"]}' for lv in M['levels'])
      + '  dur ' + ' / '.join(f'{o[str(lv)]["none"]["dur"]}→{n[str(lv)]["none"]["dur"]}' for lv in M['levels']))
    for v in [k for k in n['25'] if k not in ('pairs', 'none')]:
        cells = []
        for lv in M['levels']:
            ro, rn = o[str(lv)], n[str(lv)]
            do = ro[v]['margin'] - ro['none']['margin']; dn = rn[v]['margin'] - rn['none']['margin']
            h1 = rn[v]['m1'] - rn['none']['m1']; h2 = rn[v]['m2'] - rn['none']['m2']
            cells.append(f'{do:+.3f}→{dn:+.3f}({h1:+.2f},{h2:+.2f}) casts {rn[v]["casts"]:4.2f} first {str(rn[v]["first"]):>4} nc {rn[v]["noCastPct"]:4.1f}%')
        p(f'  {v:<15} ' + ' | '.join(cells))
(BASE / 'analysis_mage_pairs.txt').write_text('\n'.join(out), encoding='utf-8'); print('\n'.join(out))
