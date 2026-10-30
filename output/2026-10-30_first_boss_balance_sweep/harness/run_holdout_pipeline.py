"""Run the recommendation frozen before an untouched natural and class test."""
import json
import subprocess
import sys
import time
from pathlib import Path

BASE=Path(__file__).resolve().parent.parent;HERE=BASE/'harness'
while not(BASE/'validation_pipeline_status.json').exists():time.sleep(5)


def run(*args):
    subprocess.run([sys.executable,*map(str,args)],check=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))


run(HERE/'build_holdout.py')
for phase in['holdout','class_test']:
    run(HERE/'check_browser.py','--phase',phase,'--jobs',BASE/phase/'jobs.json','--workers','6',
        '--entry',HERE/'generated_extended_entry.mjs','--hero-overlay')
    run(HERE/'analyze_sweep.py','--phase',phase,'--require-complete')
(BASE/'holdout_pipeline_status.json').write_text(json.dumps({'complete':True}),encoding='utf-8')
print('Untouched natural and class test complete.',flush=True)
