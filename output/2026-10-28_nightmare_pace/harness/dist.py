"""Per-seed expedition playtime to nightmare end: python dist.py <tag>"""
import glob, json, sys
from collections import defaultdict
from pathlib import Path
OUT = Path(__file__).resolve().parent.parent / 'out'
OUT = OUT if OUT.exists() else OUT.parent / 'sim_out'   # output/ copy keeps results in sim_out
tag = sys.argv[1]
seeds = []
for f in sorted(glob.glob(str(OUT / f'{tag}_[0-9]*-[0-9]*.txt'))):
    seeds += json.loads(Path(f).read_text(encoding='utf-8'))['out']
rows = []
for o in seeds:
    nm = next(t for t in o['tiers'] if t['diff'] == 'nightmare')
    nr = next(t for t in o['tiers'] if t['diff'] == 'normal')
    rows.append((nm['e1'] / 3600, nr['e1'] / 3600, o['seed'], '/'.join(sorted(o['classes']))))
rows.sort()
xs = [r[0] for r in rows]
n = len(xs)
pct = lambda p: xs[min(n - 1, int(p * (n - 1) + 0.5))]
print(f'{tag}: n {n} · p10 {pct(.1):.1f} · p25 {pct(.25):.1f} · p50 {pct(.5):.1f} · p75 {pct(.75):.1f} · p90 {pct(.9):.1f} · >=50h {sum(x >= 50 for x in xs)} · >=45h {sum(x >= 45 for x in xs)}')
print('slowest 6: ' + ' · '.join(f's{s} {c} {x:.1f}h (normal {nr:.1f})' for x, nr, s, c in rows[-6:]))
print('fastest 4: ' + ' · '.join(f's{s} {c} {x:.1f}h' for x, nr, s, c in rows[:4]))
by = defaultdict(list)
for x, nr, s, c in rows:
    for cls in c.split('/'):
        by[cls].append(x)
print('by class present (median h): ' + ' · '.join(f'{k} {sorted(v)[len(v) // 2]:.1f} (n{len(v)})' for k, v in sorted(by.items())))
