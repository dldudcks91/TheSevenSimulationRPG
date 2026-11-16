"""scale_<cls>.json → scale_board.txt — 스킬 Δ(없음 대비) · 칸 f 배의 마진 증가(×1 대비)"""
import json, sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
BASE = Path(__file__).resolve().parent
out = []; p = out.append
for cls in ['warrior', 'knight', 'archer', 'mage', 'priest']:
    f = BASE / f'scale_{cls}.json'
    if not f.exists(): continue
    d = json.loads(f.read_text(encoding='utf-8'))
    for lv in d['levels']:
        r = d['res'][str(lv)]; none = r['none']['margin']
        p(f'== {cls} Lv{lv} pairs {r["pairs"]}')
        for sid, v in r.items():
            if sid in ('pairs', 'none'): continue
            b = v['base']['margin']
            cells = ' | '.join(f'{k} {v[k]["margin"] - b:+.3f}' for k in v if k != 'base')
            p(f'  {sid:<17} Δskill {b - none:+.3f} | {cells}')
(BASE / 'scale_board.txt').write_text('\n'.join(out), encoding='utf-8'); print('\n'.join(out))
