"""Finish all declared follow-up matrices after the first grid completes."""
import json
import subprocess
import sys
import time
from pathlib import Path

BASE=Path(__file__).resolve().parent.parent
HERE=BASE/'harness'
while not(BASE/'grid/run_info.json').exists():
    time.sleep(5)
info=json.loads((BASE/'grid/run_info.json').read_text(encoding='utf-8'))
if info.get('errors')or info.get('completed')!=576:
    raise SystemExit('Initial grid incomplete; preserve errors before continuing.')
phases=[('refinement',[]),('policy_grid',['--entry',str(HERE/'generated_policy_entry.mjs')]),
        ('startup_grid',['--hero-overlay'])]
status={'completed':[]}
for phase,extra in phases:
    command=[sys.executable,str(HERE/'check_browser.py'),'--phase',phase,'--jobs',str(BASE/phase/'jobs.json'),'--workers','6',*extra]
    print(json.dumps({'starting':phase}),flush=True)
    subprocess.run(command,check=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
    subprocess.run([sys.executable,str(HERE/'analyze_sweep.py'),'--phase',phase,'--require-complete'],check=True,
                   creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
    status['completed'].append(phase)
    (BASE/'followup_status.json').write_text(json.dumps(status,indent=2),encoding='utf-8')
print(json.dumps(status),flush=True)
