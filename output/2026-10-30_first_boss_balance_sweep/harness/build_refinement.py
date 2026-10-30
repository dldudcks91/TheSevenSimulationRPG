"""Predeclare a dense local-only family before final grid ranking."""
import itertools
import json
from run_sweep import BASE, DEFAULT

axes={'enemyHp':[1,.95,.9,.85,.8,.75],'enemyAttack':[1,.95,.9],'xp':[1,1.125,1.25,1.375,1.5]}
jobs=[{'id':f'f{i:03}','variant':{**DEFAULT,**dict(zip(axes,values))},'seeds':list(range(1,21)),'horizon':3600}
      for i,values in enumerate(itertools.product(*axes.values()))]
out=BASE/'refinement'
out.mkdir(exist_ok=True)
(out/'jobs.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf-8')
(out/'design.json').write_text(json.dumps({'axes':axes,'fixed':{'rounds':9,'bookLevel':10,'starter':1,'bossHp':1,'bossAttack':1},'variants':len(jobs),'reason':'Find smaller local-only changes while retaining book level, starter option, round count and chapter boss.'},ensure_ascii=False,indent=2),encoding='utf-8')
assert len(jobs)==90
print(json.dumps({'refinement_variants':len(jobs),'accounts':len(jobs)*20}))
