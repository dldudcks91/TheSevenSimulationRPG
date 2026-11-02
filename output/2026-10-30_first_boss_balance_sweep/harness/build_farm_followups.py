import itertools
import json
from analyze_sweep import records,summarize
from run_sweep import BASE,DEFAULT

rows=records(BASE/'farm_grid');assert len(rows)==108
def score(r):
    s=summarize(r);m=s['median']if s['median']is not None else 100
    return(not s['paceGoal'],-s['rate40'],abs(m-35),s['changes'])
parents=[sorted([r for r in rows if r['variant']['farmMode']==mode],key=score)[0]for mode in['place','highest','xp']]
jobs=[]
for parent in parents:
    for hp,xp,attack in itertools.product([1,.9,.75],[1,1.25,1.5],[1,.95]):
        jobs.append({'id':f'rc{len(jobs):03}','variant':{**parent['variant'],'enemyHp':hp,'xp':xp,'enemyAttack':attack},
                     'seeds':list(range(1,21)),'horizon':3600,'parent':parent['id']})
folder=BASE/'farm_coupled';folder.mkdir(exist_ok=True)
(folder/'jobs.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf-8')
(folder/'parents.json').write_text(json.dumps([{'id':r['id'],'variant':r['variant'],'tuning':summarize(r)}for r in parents],ensure_ascii=False,indent=2),encoding='utf-8')
assert len(jobs)==54
print(json.dumps({'bestFarmModes':[(r['id'],r['variant']['farmMode'])for r in parents],'coupledVariants':len(jobs)}),flush=True)
