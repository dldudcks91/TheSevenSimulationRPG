"""Select diverse candidates using tuning starts only; validation uses seeds21–100."""
import json
from analyze_sweep import records,summarize
from run_sweep import BASE,DEFAULT

phases=['grid','refinement','policy_grid','startup_grid','hero_hp_grid']
data=[]
for phase in phases:
    expected=json.loads((BASE/phase/'jobs.json').read_text(encoding='utf-8'))
    rows=records(BASE/phase)
    assert len(rows)==len(expected),(phase,len(rows),len(expected))
    for r in rows:
        s=summarize(r)
        assert s['valid']
        data.append({'phase':phase,'raw':r,'s':s})


def key(record):
    s=record['s'];median=s['median']if s['median']is not None else 100
    band=0 if 30<=median<=40 else min(abs(median-30),abs(median-40))
    return(band>2,not s['paceGoal'],-s['rate40'],-s['clear45']/s['n'],band,abs(median-35),s['changes'])


selected=[];seen=set()
def add(record,reason):
    token=json.dumps(record['raw']['variant'],sort_keys=True)
    if token in seen:return
    seen.add(token)
    selected.append({'name':f'c{len(selected):02}','reason':reason,'origin':record['phase']+'/'+record['raw']['id'],
                     'variant':record['raw']['variant'],'tuning':record['s']})

lookup={r['raw']['id']:r for r in data if r['phase']=='grid'}
add(lookup['g0000'],'baseline')
add(lookup['g0064'],'single local XP increase')
hp80=next(r for r in data if r['raw']['variant']=={**DEFAULT,'enemyHp':.8})
add(hp80,'single local HP reduction')
numeric=[r for r in data if r['phase']in['grid','refinement']]
for r in sorted(numeric,key=key)[:3]:add(r,'most reliable numeric frontier')
broad=[r for r in numeric if r['s']['median']is not None and 28<=r['s']['median']<=42 and r['s']['clear20']/r['s']['n']<=.1]
for r in sorted(broad,key=lambda r:(-r['s']['rate40'],-r['s']['clear45']/r['s']['n'],abs(r['s']['median']-35),r['s']['changes']))[:2]:add(r,'high reliability near pacing boundary, independent validation required')
local=[r for r in numeric if r['s']['protectedRules']and r['raw']['variant']['bossHp']==1 and r['raw']['variant']['bossAttack']==1]
for r in sorted(local,key=key)[:3]:add(r,'local enemy/XP changes retaining book/starter/round/boss rules')
goals=[r for r in numeric if r['s']['paceGoal']]
for r in sorted(goals,key=lambda r:(r['s']['changes'],-r['s']['rate40'],abs(r['s']['median']-35)))[:2]:add(r,'fewest changed axes satisfying tuning target')
policy=[r for r in data if r['phase']=='policy_grid']
for r in sorted(policy,key=key)[:2]:add(r,'unchanged balance, management variant')
startup=[r for r in data if r['phase']=='startup_grid']
for floor in[False,True]:
    subset=[r for r in startup if r['raw']['variant'].get('startFloor')==floor and r['raw']['variant'].get('rareDps')!='off']
    for r in sorted(subset,key=key)[:1]:add(r,'starting rarity placement alternative '+str(floor))
hp=[r for r in data if r['phase']=='hero_hp_grid']
for r in sorted(hp,key=key)[:2]:add(r,'defensive class HP-base alternative')

out=BASE/'validation80';out.mkdir(exist_ok=True)
jobs=[{'id':c['name'],'variant':c['variant'],'seeds':list(range(21,101)),'horizon':5400}for c in selected]
(out/'selection.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2),encoding='utf-8')
(out/'jobs.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'validation_candidates':len(jobs),'new_starts':80,'accounts':len(jobs)*80,'candidates':[(c['name'],c['origin'],c['reason'])for c in selected]},ensure_ascii=True))
