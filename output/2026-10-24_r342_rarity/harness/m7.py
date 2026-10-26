import json, html, statistics as st, sys
from pathlib import Path
OUT = Path(sys.argv[1]); K = 1.55
def load(tag):
    return json.loads(html.unescape((OUT / f'm7_{tag}.txt').read_text(encoding='utf-8')))['rows']
def per_seed(rows):
    S = {}
    for r in rows:
        s = S.setdefault(r['seed'], {'first': {}, 'tries': {}, 'firstTry': {}, 'lv60': None, 'cells60': 0, 'runs': 0})
        s['runs'] += 1
        st_ = r['stageId']
        s['tries'][st_] = s['tries'].get(st_, 0) + 1
        if s['tries'][st_] == 1: s['firstTry'][st_] = r['won']
        um = r['t'] / 60 * K
        if r['won'] and st_ not in s['first']: s['first'][st_] = um
        if um <= 60: s['lv60'] = r['lvBefore']; s['cells60'] = len(s['first'])
    return S
def med(xs): return round(st.median(xs), 1) if xs else None
def report(tag, S, seeds):
    out = {}
    for stg in (1011, 1013, 1051):
        got = [S[s]['first'][stg] for s in seeds if stg in S[s]['first']]
        out[stg] = (med(got), f'{len(got)}/{len(seeds)}')
    ft = [S[s]['firstTry'].get(1011) for s in seeds if 1011 in S[s]['firstTry']]
    ft13 = [S[s]['firstTry'].get(1013) for s in seeds if 1013 in S[s]['firstTry']]
    in60 = sum(1 for s in seeds if S[s]['first'].get(1051, 1e9) <= 60)
    return (f"{tag:6} 1-1I {out[1011][0]}분({out[1011][1]}) · 첫시도 {sum(ft)}/{len(ft)} · 1-1III {out[1013][0]}분({out[1013][1]}) 첫시도 {sum(ft13)}/{len(ft13)} · "
            f"보스 {out[1051][0]}분({out[1051][1]}) · 60분안 보스 {in60} · 60분 칸 {med([S[s]['cells60'] for s in seeds])} · Lv {med([S[s]['lv60'] or 1 for s in seeds])}")
for tag in ('before', 'after'):
    S = per_seed(load(tag))
    for name, seeds in (('all', range(1, 41)), ('1-20', range(1, 21)), ('21-40', range(21, 41))):
        print(name.ljust(6), report(tag, S, [s for s in seeds if s in S]))
