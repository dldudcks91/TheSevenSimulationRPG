import json, statistics as st, sys
from collections import defaultdict
S = 1.55
for name in ['camp80', 'off80']:
    d = json.load(open(f'sim_out/{name}.json', encoding='utf-8'))
    by = defaultdict(list)
    for r in d['rows']: by[r['seed']].append(r)
    fw, fr, firstwin_run, lv10, gold10 = [], 0, [], [], []
    for s, rs in by.items():
        prev = 0
        for r in rs:
            r['t1'] = S * r['t'] / 60
        w = next((r for r in rs if r['won']), None)
        fw.append(w['t1'] if w else None)
        firstwin_run.append(rs.index(w) + 1 if w else None)
        if rs[0]['won']: fr += 1
    xs = sorted(x for x in fw if x is not None)
    q = lambda p: round(xs[int(p * (len(xs) - 1))], 1)
    print(name, 'first run won', fr, '/', len(by), '| first win user-min median', q(.5), 'q1', q(.25), 'q3', q(.75), 'p90', q(.9), '| never', sum(1 for x in fw if x is None),
          '| first win within 5/10/20/30 min:', [sum(1 for x in fw if x is not None and x <= m) for m in (5, 10, 20, 30)])
    print('   runs until first win median', st.median([x for x in firstwin_run if x]), 'max', max(x for x in firstwin_run if x))
print(list(d['rows'][0].keys()))
