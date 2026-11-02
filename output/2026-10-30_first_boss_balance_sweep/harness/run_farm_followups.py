import json
import subprocess
import sys
import time
from pathlib import Path

BASE=Path(__file__).resolve().parent.parent;HERE=BASE/'harness'
while not(BASE/'farm_grid/run_info.json').exists():time.sleep(5)
info=json.loads((BASE/'farm_grid/run_info.json').read_text(encoding='utf-8'))
assert info['completed']==108 and not info['errors']
def run(*args):subprocess.run([sys.executable,*map(str,args)],check=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
run(HERE/'analyze_sweep.py','--phase','farm_grid','--require-complete')
run(HERE/'build_farm_followups.py')
run(HERE/'check_browser.py','--phase','farm_coupled','--jobs',BASE/'farm_coupled/jobs.json','--workers','6',
    '--entry',HERE/'generated_farm_entry.mjs','--hero-overlay')
run(HERE/'analyze_sweep.py','--phase','farm_coupled','--require-complete')
run(HERE/'build_farm_validation.py')
run(HERE/'check_browser.py','--phase','farm_validation80','--jobs',BASE/'farm_validation80/jobs.json','--workers','6',
    '--entry',HERE/'generated_farm_entry.mjs','--hero-overlay')
run(HERE/'analyze_sweep.py','--phase','farm_validation80','--require-complete')
run(HERE/'analyze_sweep.py','--phase','validation80','--require-complete')
(BASE/'validation_pipeline_status.json').write_text(json.dumps({'complete':True,'includes_adaptive_farm_study':True}),encoding='utf-8')
print('Farming study and validation complete.',flush=True)
