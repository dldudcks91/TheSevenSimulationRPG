import json
from analyze_sweep import records,summarize
from run_sweep import BASE,DEFAULT

data=[{'phase':phase,'r':r,'s':summarize(r)}for phase in['farm_grid','farm_coupled']for r in records(BASE/phase)]
assert len(data)==162
def score(x):
    s=x['s'];m=s['median']if s['median']is not None else 100
    return(not s['paceGoal'],-s['rate40'],abs(m-35),s['changes'])
selected=[];seen=set()
def add(v,origin,reason,tuning):
    token=json.dumps(v,sort_keys=True)
    if token in seen:return
    seen.add(token);selected.append({'name':f'rf{len(selected):02}','variant':v,'origin':origin,'reason':reason,'tuning':tuning})
add(DEFAULT,'grid/g0000','unchanged baseline under new farming-capable entry',None)
for mode in['place','highest','xp']:
    group=[x for x in data if x['phase']=='farm_grid'and x['r']['variant']['farmMode']==mode]
    for x in sorted(group,key=score)[:1]:add(x['r']['variant'],x['phase']+'/'+x['r']['id'],'management-only '+mode,x['s'])
coupled=[x for x in data if x['phase']=='farm_coupled']
for x in sorted(coupled,key=score)[:3]:add(x['r']['variant'],x['phase']+'/'+x['r']['id'],'coupled farming and local numeric alternative',x['s'])
# Keep one near-target candidate that does not accelerate the median below30.
band=[x for x in coupled if x['s']['median']is not None and 30<=x['s']['median']<=40]
for x in sorted(band,key=lambda x:(-x['s']['rate40'],x['s']['changes'],abs(x['s']['median']-35)))[:2]:add(x['r']['variant'],x['phase']+'/'+x['r']['id'],'pacing-preserving farming/local candidate',x['s'])
out=BASE/'farm_validation80';out.mkdir(exist_ok=True)
jobs=[{'id':x['name'],'variant':x['variant'],'seeds':list(range(21,101)),'horizon':5400}for x in selected]
(out/'jobs.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf-8')
(out/'selection.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'candidates':len(jobs),'accounts':len(jobs)*80,'selected':[(x['name'],x['origin'])for x in selected]}),flush=True)
