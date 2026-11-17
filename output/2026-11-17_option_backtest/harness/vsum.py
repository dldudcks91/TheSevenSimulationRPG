"""out/V_*.txt (도구 검증 셋) → 한 줄씩. python vsum.py"""
import json
from pathlib import Path
OUT = Path(__file__).resolve().parent.parent / 'out'
rows = []
for p in sorted(OUT.glob('V_*.txt')):
    t = p.read_text(encoding='utf-8').strip()
    if not t:
        done = OUT / (p.stem + '.done')
        print(p.stem, 'EMPTY', done.read_text(encoding='utf-8')[:300] if done.exists() else '')
        continue
    d = json.loads(t)
    if d.get('missing'):
        print(p.stem, 'missing', d['missing']); continue
    c1, c2, c3 = d['c1'], d['c2'], d['c3']
    a = ' '.join(f"{w}:{c2[w]['cls']} dM{c2[w]['dMargin']:+.4f} z{c2[w]['z']} dW{c2[w]['dWin']:+.3f} {'ok' if c2[w]['ok'] else 'NG'}" for w in ('phys', 'mag') if w in c2)
    pr = ' '.join(f"{w}:{x['cls']} win{x['win0']}→{x['win1']} sec{x['sec0']}→{x['sec1']} {'ok' if x['ok'] else 'NG'}" for w, x in (c2.get('probe') or {}).items())
    print(f"{p.stem} ALL={'ok' if d['ok'] else 'NG'} | ①{'ok' if c1['ok'] else 'NG'}(arena {sum(c1['arena'])}/{len(c1['arena'])} probe {sum(c1['probe'])}/{len(c1['probe'])} @{c1['probeStage']}) "
          f"| ② {a} | probe {pr} | ③{'ok' if c3['ok'] else 'NG'} arena {c3['arena']['n'] - len(c3['arena']['fail'])}/{c3['arena']['n']} probe {c3['probe']['n'] - len(c3['probe']['fail'])}/{c3['probe']['n']} {c3['arena']['fail'][:3]} {c3['probe']['fail'][:3]}")
