"""Defensive alternative: existing class HP bases, not free XP or forced wins."""
import itertools
import json
from run_sweep import BASE,DEFAULT

source=(BASE/'harness/generated_policy_entry.mjs').read_text(encoding='utf-8')
old='SYS=buildSystems(D);Q=SYS.game;'
assert source.count(old)==1
extra="for(const c of D.classes){const add=c.startRow==='front'?(v.frontHp??0):(v.backHp??0);if(add&&c.hpBase!=null)c.hpBase+=add;}"
source=source.replace(old,extra+old)
(BASE/'harness/generated_extended_entry.mjs').write_text(source,encoding='utf-8')
axes={'backHp':[0,15,30],'frontHp':[0,15,30],'xp':[1,1.25],'enemyHp':[1,.9]}
jobs=[{'id':f'h{i:03}','variant':{**DEFAULT,**dict(zip(axes,values))},'seeds':list(range(1,21)),'horizon':3600}
      for i,values in enumerate(itertools.product(*axes.values()))]
out=BASE/'hero_hp_grid';out.mkdir(exist_ok=True)
(out/'jobs.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf-8')
(out/'design.json').write_text(json.dumps({'axes':axes,'variants':len(jobs),
    'scope':'Add15/30 to existing class.csv hp_base for front/back classes. Flat base only; monster overrides unchanged; hero HP changes at all levels and needs explicit scope reporting.'},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'hero_hp_combinations':len(jobs),'accounts':len(jobs)*20}))
