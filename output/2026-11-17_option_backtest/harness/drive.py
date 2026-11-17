"""Run a list of obt.html jobs with W pages in parallel, retrying a failed job once. Skips jobs whose .done says OBT ok.
python drive.py <tag> <port> <workers> <jobs.json>
jobs.json = [{"name": "...", "query": "mode=...&seed=..."}, ...]"""
import json, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
tag, port, W, jobs_path = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
H = Path(__file__).resolve().parent
OUT = H.parent / 'out'
OUT.mkdir(exist_ok=True)
log = OUT / f'{tag}.log'
jobs = json.loads(Path(jobs_path).read_text(encoding='utf-8'))
def say(msg):
    with log.open('a', encoding='utf-8') as f:
        f.write(time.strftime('%H:%M:%S ') + msg + '\n')
def run(job):
    name = job['name']
    done = OUT / (name + '.done')
    if done.exists() and json.loads(done.read_text(encoding='utf-8'))['title'].startswith('OBT ok'):
        say(f'skip {name}'); return
    for attempt in (1, 2):
        t0 = time.time()
        try:
            subprocess.run([sys.executable, str(H / 'run_page.py'), name, f'dev/obt.html?{job["query"]}', 'OBT ok,OBT FAIL', '#sim', port, str(job.get('max', 4 * 3600))],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=job.get('max', 4 * 3600) + 180)
        except subprocess.TimeoutExpired:
            pass
        title = json.loads(done.read_text(encoding='utf-8'))['title'] if done.exists() else 'NO DONE'
        say(f'{name} attempt {attempt}: {title} in {round(time.time() - t0)}s')
        if title.startswith('OBT ok') or title.startswith('OBT FAIL'):
            break
say(f'start {tag} jobs {len(jobs)} workers {W} port {port}')
with ThreadPoolExecutor(W) as ex:
    list(ex.map(run, jobs))
say(f'end {tag}')
