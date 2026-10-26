"""Hell probe summary: python probe_analyze.py <tag>
Per probe point (entry = right after nightmare · afterCh1 = right after the hell chapter-1 boss), per cell I of every place:
win % over seeds x tries (halves split) and mean rounds cleared. Same party state for every cell of one seed."""
import glob
import json
import statistics as st
import sys
from pathlib import Path

tag = sys.argv[1]
OUT = Path(__file__).resolve().parent.parent / 'out'
seeds = []
for f in sorted(glob.glob(str(OUT / f'{tag}_[0-9]*-[0-9]*.txt'))):
    seeds += json.loads(Path(f).read_text(encoding='utf-8'))['out']
seeds.sort(key=lambda o: o['seed'])
N = len(seeds)
half = {o['seed']: (0 if i < (N + 1) // 2 else 1) for i, o in enumerate(seeds)}
CELL = lambda sid: f'{sid // 1000}-{sid // 10 % 100}' + (' boss' if sid % 100 // 10 == 5 else ' I')
for label in ('entry', 'afterCh1'):
    have = [o for o in seeds if label in (o.get('probes') or {})]
    if not have:
        continue
    lv = [o['probes'][label]['lv'] for o in have]
    il = [o['probes'][label]['ilvl'] for o in have]
    print(f'## {label} — seeds {len(have)} · party Lv med {st.median(lv):.1f} · worn ilvl med {st.median(il):.1f}')
    print('  cell      win%  (halves)      rounds | seeds with >=50% win')
    cells = sorted({int(k) for o in have for k in o['probes'][label]['cells']})
    by_ch = {}
    for sid in cells:
        rs = [(o, o['probes'][label]['cells'][str(sid)]) for o in have if str(sid) in o['probes'][label]['cells']]
        tot = lambda xs: (sum(c['wins'] for _, c in xs), sum(c['n'] for _, c in xs))
        w, n = tot(rs)
        hw = [tot([x for x in rs if half[x[0]['seed']] == h]) for h in (0, 1)]
        pct = lambda a: f'{100 * a[0] / a[1]:.0f}' if a[1] else '-'
        good = sum(1 for _, c in rs if c['n'] and c['wins'] / c['n'] >= 0.5)
        print(f'  {CELL(sid):9} {pct((w, n)):>4}  ({pct(hw[0]):>3} / {pct(hw[1]):>3})  {st.mean(c["rounds"] for _, c in rs):6.2f} | {good}/{len(rs)}')
        if sid % 100 // 10 != 5:
            by_ch.setdefault(sid // 1000, []).append(100 * w / n if n else 0)
    print('  chapter mean of the four place cells I: ' + ' · '.join(f'{c}장 {st.mean(v):.0f}%' for c, v in sorted(by_ch.items())))
    print()
