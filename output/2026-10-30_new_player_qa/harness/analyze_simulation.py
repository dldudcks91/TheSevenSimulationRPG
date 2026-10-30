"""Summarize the 10 frozen-source online progression runs."""
import json
import statistics
from pathlib import Path

HERE=Path(__file__).resolve().parent
OUT=HERE.parent/'simulation'
rows=[json.loads(f.read_text(encoding='utf-8')) for f in sorted(OUT.glob('*_seed*.json'))]
summary={'runs':len(rows),'completed_runs':sum(r['stats']['runs'] for r in rows),'violations':sum(len(r['stats']['violations']) for r in rows),'depart_errors':sum(len(r['stats']['departErrors']) for r in rows),'policies':{}}
for policy in ('managed','passive'):
    rs=[r for r in rows if r['policy']==policy]
    marks={}
    for sec in (600,3600,86400):
        cs=[next(c for c in r['checkpoints'] if c['seconds']==sec) for r in rs]
        levels=[x for c in cs for x in c['levels']]
        marks[sec]={'level_min':min(levels),'level_max':max(levels),'level_median':statistics.median(levels),'stages':[{k:c[k] for k in ('stage','difficulty','levels','gold','bags','wins','losses','overflow','firstBagFull','firstOverflow','mail')} for c in cs],'gold_min':min(c['gold'] for c in cs),'gold_max':max(c['gold'] for c in cs),'full_bags':sum(c['bags'][0]==c['bagCap'] for c in cs),'overflow_sum':sum(c['overflow'] for c in cs)}
    summary['policies'][policy]={'seeds':[r['seed'] for r in rs],'marks':marks}
(OUT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=True,indent=2))
