"""Separate exhaustive player-management matrix on unchanged balance."""
import itertools
import json
from run_sweep import BASE, DEFAULT

source=(BASE/'harness/generated_entry.mjs').read_text(encoding='utf-8')
changes={
    "const mode=c.buildModes[h.uid]??'balanced'":"const mode=c.buildModes[h.uid]??(window.__qaVariant.mastery??'balanced')",
    "const cadence=policy==='active_slow'?300:120":"const cadence=window.__qaVariant.management??(policy==='active_slow'?300:120)",
    "if(c.losses[stage]<3)return false;":"if(c.losses[stage]<(window.__qaVariant.lossTrigger??3))return false;",
    "c.farm.wins>=3||c.farm.attempts>=5":"c.farm.wins>=(window.__qaVariant.farmWins??3)||c.farm.attempts>=((window.__qaVariant.farmWins??3)+2)",
}
for old,new in changes.items():
    assert source.count(old)==1,old
    source=source.replace(old,new)
(BASE/'harness/generated_policy_entry.mjs').write_text(source,encoding='utf-8')
axes={'management':[60,120,300],'lossTrigger':[2,3,6],'farmWins':[1,3,5],'mastery':['balanced','offense','survival']}
jobs=[{'id':f'p{i:03}','variant':{**DEFAULT,**dict(zip(axes,values))},'seeds':list(range(1,21)),'horizon':3600}
      for i,values in enumerate(itertools.product(*axes.values()))]
out=BASE/'policy_grid';out.mkdir(exist_ok=True)
(out/'jobs.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf-8')
(out/'design.json').write_text(json.dumps({'axes':axes,'combinations':len(jobs),'scope':'Balance unchanged, actual management actions only; future battle results never consulted.'},ensure_ascii=False,indent=2),encoding='utf-8')
assert len(jobs)==81
print(json.dumps({'policy_combinations':len(jobs),'accounts':len(jobs)*20}))
