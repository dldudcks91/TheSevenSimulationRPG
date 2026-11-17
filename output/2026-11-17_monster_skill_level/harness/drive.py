"""Run mslv.html in seed chunks, one page at a time, retrying a failed chunk once.
python drive.py <tag> <port> <first_seed> <last_seed> <chunk> <extra query>"""
import json, subprocess, sys, time
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
    done = OUT / (name + '.done')
    if done.exists() and json.loads(done.read_text(encoding='utf-8'))['title'].startswith('MSLV ok'):
        say(f'skip {name}'); continue
    for attempt in (1, 2):
        t0 = time.time()
        try:
            subprocess.run([sys.executable, str(H / 'run_page.py'), name, f'dev/mslv.html?seeds={s}-{e}&{extra}', 'MSLV ok,MSLV FAIL', '#sim', port, str(3 * 3600)],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=3 * 3600 + 120)
        except subprocess.TimeoutExpired:
            pass
        title = json.loads(done.read_text(encoding='utf-8'))['title'] if done.exists() else 'NO DONE'
        say(f'{name} attempt {attempt}: {title} in {round(time.time() - t0)}s')
        if title.startswith('MSLV ok'):
            break
say(f'end {tag}')
