"""Probe whether initial rarity placement, rather than enemy nerfs, reduces tails."""
import itertools
import json
from run_sweep import BASE, DEFAULT

axes={'enemyHp':[1,.9,.8],'xp':[1,1.25,1.5],'rareDps':['off','mage','archer'],'startFloor':[False,True]}
jobs=[{'id':f's{i:03}','variant':{**DEFAULT,**dict(zip(axes,values))},'seeds':list(range(1,21)),'horizon':3600}
      for i,values in enumerate(itertools.product(*axes.values()))]
out=BASE/'startup_grid';out.mkdir(exist_ok=True)
(out/'jobs.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf-8')
(out/'design.json').write_text(json.dumps({'axes':axes,'variants':len(jobs),
    'scope':'Initial rarity assignment is generated normally inside rollParty with candidate tier selection; no post-roll stat edits. All main classes/sins/gear follow actual candidate RNG.'},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'startup_combinations':len(jobs),'accounts':len(jobs)*20}))
