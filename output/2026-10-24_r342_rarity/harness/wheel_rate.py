import json, html, sys
from pathlib import Path
OUT = Path(sys.argv[1]); K = 1.55
def load(tag):
    out = []
    for f in sorted(OUT.glob(f'{tag}_*.txt')):
        out += json.loads(html.unescape(f.read_text(encoding='utf-8')))['out']
    return out
R = load('WA')
for half, sel in (('all', lambda s: True), ('1-12', lambda s: s <= 12), ('13-24', lambda s: s > 12)):
    for diff in ('nightmare', 'hell'):
        hours = runs = ep = lg = 0
        for r in R:
            if not sel(r['seed']): continue
            t = next((x for x in r['tiers'] if x['diff'] == diff), None)
            if not t: continue
            t1 = t['t1'] if t['t1'] is not None else r['t']
            hours += (t1 - t['t0']) / 3600 * K; runs += t['runs']
            ep += t['drops'].get('epic', 0); lg += t['drops'].get('legendary', 0)
        cp = 13   # one chapter pass = 13 stage runs
        print(f"{half:5} {diff:9} user h {hours:7.0f} runs {runs:6} | epic {ep:5} = {hours/max(ep,1)*60:5.0f} min each · {13*ep/max(runs,1):.2f}/13runs | leg {lg:5} = {hours/max(lg,1)*60 if lg else 0:5.0f} min each · {13*lg/max(runs,1):.2f}/13runs")
