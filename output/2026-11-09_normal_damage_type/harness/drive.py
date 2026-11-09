"""레인(서버 포트)마다 작업을 하나씩 차례로 돌린다 — 마감 + 재시도. 사용: python drive.py <tag> <query> <seed_from> <seed_to> <chunk> [ports]
끝나면 out/drive_<tag>.log 에 'end' 줄."""
import json, subprocess, sys, threading, time
from pathlib import Path
HERE = Path(__file__).resolve().parent
OUT = HERE.parent / 'out'
OUT.mkdir(exist_ok=True)
tag, query, a, b, chunk = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
ports = (sys.argv[6] if len(sys.argv) > 6 else '8841,8842,8843').split(',')
jobs = [(s, min(s + chunk - 1, b)) for s in range(a, b + 1, chunk)]
lock = threading.Lock()
log = open(OUT / f'drive_{tag}.log', 'a', encoding='utf-8')
def say(m):
    with lock:
        log.write(time.strftime('%H:%M:%S ') + m + '\n'); log.flush()
def lane(port):
    while True:
        with lock:
            if not jobs: return
            s, e = jobs.pop(0)
        name = f'{tag}_{s}-{e}'
        for attempt in range(3):
            t0 = time.time()
            try:
                subprocess.run([sys.executable, str(HERE / 'run_page.py'), name, f'dev/normal.html?seeds={s}-{e}&{query}', 'DONE,FAIL', '#sim', port, '3000'],
                               timeout=3200, capture_output=True, env={'PYTHONIOENCODING': 'utf-8', **__import__('os').environ})
                done = json.loads((OUT / (name + '.done')).read_text(encoding='utf-8'))
                ok = done['title'].startswith('DONE')
            except Exception as ex:
                done, ok = {'title': 'EXC ' + str(ex)[:200]}, False
            say(f'{port} {name} try{attempt} {done.get("title")} {round(time.time() - t0)}s')
            if ok: break
say(f'start {tag} {query} {a}-{b} chunk {chunk} ports {ports}')
ths = [threading.Thread(target=lane, args=(p,)) for p in ports]
for t in ths: t.start()
for t in ths: t.join()
say(f'end {tag}')
