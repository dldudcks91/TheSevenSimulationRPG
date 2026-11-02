import itertools
import json
from farm_controls import transform
from run_sweep import BASE,DEFAULT

source=transform((BASE/'harness/generated_extended_entry.mjs').read_text(encoding='utf-8'))
(BASE/'harness/generated_farm_entry.mjs').write_text(source,encoding='utf-8')
axes={'farmMode':['place','highest','xp'],'farmPotions':[False,True],'dropLosses':[1,2,3],
      'mastery':['balanced','survival'],'farmWins':[1,3,5]}
jobs=[{'id':f'r{i:03}','variant':{**DEFAULT,**dict(zip(axes,values))},'seeds':list(range(1,21)),'horizon':3600}
      for i,values in enumerate(itertools.product(*axes.values()))]
out=BASE/'farm_grid';out.mkdir(exist_ok=True)
(out/'jobs.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf-8')
(out/'design.json').write_text(json.dumps({'axes':axes,'variants':len(jobs),'scope':'Only actual management actions. XP efficiency uses latest3 observed successful reports per stage and minimum hero XP/time; no future battle lookups. Product balance unchanged.'},ensure_ascii=False,indent=2),encoding='utf-8')
assert len(jobs)==108
print(json.dumps({'farm_combinations':len(jobs),'accounts':len(jobs)*20}))
