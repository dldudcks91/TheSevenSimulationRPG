"""Continue the predeclared HP alternative and independent candidate validation."""
import json
import subprocess
import sys
import time
from pathlib import Path

BASE=Path(__file__).resolve().parent.parent;HERE=BASE/'harness'
while True:
    file=BASE/'followup_status.json'
    if file.exists()and len(json.loads(file.read_text(encoding='utf-8'))['completed'])==3:break
    time.sleep(5)


def run(*args):
    subprocess.run([sys.executable,*map(str,args)],check=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))


run(HERE/'check_browser.py','--phase','hero_hp_grid','--jobs',BASE/'hero_hp_grid/jobs.json','--workers','6',
    '--entry',HERE/'generated_extended_entry.mjs','--hero-overlay')
run(HERE/'analyze_sweep.py','--phase','hero_hp_grid','--require-complete')
run(HERE/'build_validation.py')
run(HERE/'check_browser.py','--phase','validation80','--jobs',BASE/'validation80/jobs.json','--workers','6',
    '--entry',HERE/'generated_extended_entry.mjs','--hero-overlay')
run(HERE/'analyze_sweep.py','--phase','validation80','--require-complete')
(BASE/'validation_pipeline_status.json').write_text(json.dumps({'complete':True}),encoding='utf-8')
print('Independent validation complete.',flush=True)
