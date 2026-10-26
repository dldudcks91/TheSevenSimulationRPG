"""Run wheel.html in seed chunks, one page at a time, retrying a failed chunk once.
python drive.py <tag> <port> <first_seed> <last_seed> <chunk> <extra query>
Writes out/<tag>_<a>-<b>.txt/.done and appends progress to out/<tag>.log
"""
import json
import subprocess
import sys
import time
from pathlib import Path

tag, port, a, b, chunk, extra = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), sys.argv[6]
H = Path(__file__).resolve().parent
OUT = H.parent / 'out'
OUT.mkdir(exist_ok=True)
log = OUT / f'{tag}.log'


def say(msg):
    with log.open('a', encoding='utf-8') as f:
        f.write(time.strftime('%H:%M:%S ') + msg + '\n')


say(f'start {tag} seeds {a}-{b} chunk {chunk} port {port} q={extra}')
for s in range(a, b + 1, chunk):
    e = min(b, s + chunk - 1)
    name = f'{tag}_{s}-{e}'
    if (OUT / (name + '.done')).exists() and json.loads((OUT / (name + '.done')).read_text(encoding='utf-8'))['title'].startswith('WHEEL ok'):
        say(f'skip {name} (done)')
        continue
    for attempt in (1, 2):
        t0 = time.time()
        q = f'dev/wheel.html?seeds={s}-{e}&{extra}'
        try:
            subprocess.run([sys.executable, str(H / 'run_page.py'), name, q, 'WHEEL', '#sim', port, str(3 * 3600)],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=1800)
        except subprocess.TimeoutExpired:
            say(f'{name} attempt {attempt}: driver timeout 1800s (page hung)')
        done = OUT / (name + '.done')
        title = json.loads(done.read_text(encoding='utf-8'))['title'] if done.exists() else 'NO DONE'
        say(f'{name} attempt {attempt}: {title} in {round(time.time() - t0)}s')
        if title.startswith('WHEEL ok'):
            break
say(f'end {tag}')
