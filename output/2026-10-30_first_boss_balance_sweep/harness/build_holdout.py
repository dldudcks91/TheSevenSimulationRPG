"""Freeze the recommendation before testing natural seeds201–400."""
import json
from analyze_sweep import records,summarize
from run_sweep import BASE

source=records(BASE/'validation80')
selection=json.loads((BASE/'validation80/selection.json').read_text(encoding='utf-8'))
meta={c['name']:c for c in selection}
data=[{'r':r,'s':summarize(r),'meta':meta[r['id']]}for r in source]
assert len(data)==len(selection)


def score(item):
    s=item['s'];m=s['median']if s['median']is not None else 100
    penalty=0 if 30<=m<=40 else min(abs(m-30),abs(m-40))
    return(not s['paceGoal'],penalty>2,-s['rate40'],-s['clear45']/s['n'],s['changes'],abs(m-35))


base=next(x for x in data if x['meta']['reason']=='baseline')
local=[x for x in data if x['meta']['origin'].split('/')[0]in['grid','refinement']and x['s']['protectedRules']and x['r']['variant']['bossHp']==1 and x['r']['variant']['bossAttack']==1]
goals=[x for x in data if x['s']['paceGoal']]
local_goals=[x for x in local if x['s']['paceGoal']]
primary=sorted(local_goals or goals or[x for x in data if x is not base],key=score)[0]
profiles=[];seen=set()


def add(item,label):
    key=json.dumps(item['r']['variant'],sort_keys=True)
    if key in seen:return
    seen.add(key);profiles.append({'name':label,'candidate':item['r']['id'],'origin':item['meta']['origin'],
        'variant':item['r']['variant'],'validation80':item['s'],'reason':item['meta']['reason']})


add(base,'baseline');add(primary,'recommended')
if local:add(sorted(local,key=score)[0],'local_only')
add(sorted([x for x in data if x is not base],key=score)[0],'most_reliable')
for phase,label in[('startup_grid','startup_alternative'),('hero_hp_grid','hero_hp_alternative'),('policy_grid','management_only')]:
    candidates=[x for x in data if x['meta']['origin'].startswith(phase+'/')]
    if candidates:add(sorted(candidates,key=score)[0],label)
jobs=[]
for p in profiles:
    for policy,suffix in[('active','2m'),('active_slow','5m')]:
        variant={**p['variant']}
        if policy=='active_slow'and'management'in variant:variant['management']=max(300,variant['management'])
        jobs.append({'id':p['name']+'_'+suffix,'variant':variant,'seeds':list(range(201,401)),'policy':policy,'horizon':5400})
out=BASE/'holdout';out.mkdir(exist_ok=True)
(out/'selection.json').write_text(json.dumps({'primary_preselected_from_validation80':primary['r']['id'],'profiles':profiles,'natural_test_seeds':[201,400]},ensure_ascii=False,indent=2),encoding='utf-8')
(out/'jobs.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf-8')
coverage=json.loads((BASE/'class_coverage.json').read_text(encoding='utf-8'))
covered=[profiles[0],profiles[1]]
if len(profiles)>2:covered.append(profiles[2])
cjobs=[{'id':p['name'],'variant':p['variant'],'seeds':coverage['seeds'],'horizon':5400}for p in covered]
cdir=BASE/'class_test';cdir.mkdir(exist_ok=True)
(cdir/'jobs.json').write_text(json.dumps(cjobs,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'preselected':primary['r']['id'],'profiles':[(p['name'],p['origin'])for p in profiles],'natural_accounts':len(jobs)*200,'class_accounts':len(cjobs)*216},ensure_ascii=True),flush=True)
