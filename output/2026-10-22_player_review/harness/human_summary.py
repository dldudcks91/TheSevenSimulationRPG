"""Summarise human-mimic sessions: python human_summary.py <events.json> <runs.json...>"""
import json
import sys

ev = json.load(open(sys.argv[1], encoding='utf-8'))
runs = []
for p in sys.argv[2:]:
    runs += json.load(open(p, encoding='utf-8'))
runs = sorted({(r['min'], r['stage']): r for r in runs}.values(), key=lambda r: r['min'])
runs = [r for r in runs if r['min'] <= 60.05]
clears = [(e['min'], e['extra']) for e in ev if e['event'] == 'clear' and e['min'] <= 60.05]
builds = [(e['min'], e['extra']) for e in ev if e['event'] == 'built']
buys = [(e['min'], e['extra']) for e in ev if e['event'] in ('shop_buy', 'enhance')]
equips = [e for e in ev if e['event'] == 'equip' and e['min'] <= 60.05]
lv = [(e['min'], e['extra']) for e in ev if e['event'] == 'level' and e['extra'].startswith('h1 ')]
print('clears', clears)
print('builds', builds)
print('buys/enh', buys)
print('equips', len(equips), 'weapons', [e['extra'] for e in equips if 'dps' in e['extra']])
print('h1 levels', lv)
for W in (10, 30, 60):
    rs = [r for r in runs if r['min'] <= W]
    print(f'@{W}: runs {len(rs)} won {sum(r["won"] for r in rs)} lost {sum(not r["won"] for r in rs)} clears {sum(1 for c in clears if c[0] <= W)}')
marks = [0.0] + [c[0] for c in clears] + [60.0]
gaps = sorted(((round(b - a, 1), round(a, 1)) for a, b in zip(marks, marks[1:])), reverse=True)
print('longest no-clear gaps (min, from):', gaps[:3])
best = cur = 0
for r in runs:
    cur = 0 if r['won'] else cur + 1
    best = max(best, cur)
print('longest losing streak', best)
