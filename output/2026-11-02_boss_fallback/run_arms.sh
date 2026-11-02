#!/bin/sh
# Two arms on one frozen source: fallback (shipped rule) vs samecell (old rule). 80 seeds × 2 bots × 2 hours.
cd "$(dirname "$0")"
JOBS=$(python -c "import json;print(json.dumps([[s,p,False] for s in range(1,81) for p in ('basic','adaptive')]))")
export FUN_QA_SHORT=1 FUN_QA_MARKS='[600,3600,7200]' FUN_QA_JOBS="$JOBS"
FUN_QA_TAG=fallback python harness/run_fun.py 80 0 4 > fallback.log 2>&1
FUN_QA_TAG=samecell FUN_QA_SAMECELL=1 python harness/run_fun.py 80 0 4 > samecell.log 2>&1
python -c "
import json
for a in ('fallback','samecell'):
    r=json.load(open(f'simulation/pilot/{a}/run_info.json',encoding='utf-8'))
    print(a,'completed',len(r['completed']),'errors',len(r['errors']),'wall',round(r['wall_seconds']),'failures',sum(x['failures'] for x in r['completed']),'changed',r['frozen_source_changed'])
"
