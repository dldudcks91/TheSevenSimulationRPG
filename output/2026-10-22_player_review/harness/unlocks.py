import json
from collections import defaultdict, Counter
S = 1.55
for name in ['camp80', 'off80']:
    d = json.load(open(f'sim_out/{name}.json', encoding='utf-8'))
    by = defaultdict(list)
    for r in d['rows']: by[r['seed']].append(r)
    res = {W: Counter() for W in (10, 30, 60)}
    for s, rs in by.items():
        for W in (10, 30, 60):
            done = [r for r in rs if S * r['t'] / 60 <= W]
            cl = {r['stageId'] for r in done if r['won']}
            lv = max([r['lvBefore'] for r in rs if S * r['t'] / 60 > W][:1] or [done[-1]['lvBefore'] if done else 1])
            n = 0
            if 1013 in cl: res[W]['shop(1-1 III)'] += 1; n += 1
            if 1023 in cl: res[W]['forge(1-2 III)'] += 1; n += 1
            if lv >= 10: res[W]['library(Lv10)'] += 1; n += 1
            if 1051 in cl: res[W]['ch1 boss'] += 1; n += 1
            res[W][f'unlocks={n}'] += 1
    for W in (10, 30, 60):
        print(name, W, dict(sorted(res[W].items())))
