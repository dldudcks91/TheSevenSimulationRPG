import itertools
import json
from pathlib import Path
from run_sweep import AXES, BASE

jobs=[{'id':f'g{i:04}','variant':dict(zip(AXES,values)),'seeds':list(range(1,21)),'horizon':3600}
      for i,values in enumerate(itertools.product(*AXES.values()))]
out=BASE/'grid'
out.mkdir(exist_ok=True)
(out/'jobs.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf-8')
assert len(jobs)==576 and len({tuple(j['variant'].items())for j in jobs})==576
print(json.dumps({'combinations':len(jobs),'accounts':sum(len(j['seeds'])for j in jobs)}))
