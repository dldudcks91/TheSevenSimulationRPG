"""스냅샷 서버를 이 프로세스 안 스레드로 띄우고(포트마다 하나) 레인마다 시드 묶음을 차례로 돌린다.
python run_all.py <tag> <query> <seed_from> <seed_to> <chunk> <ports>
결과: out/<tag>_<a>-<b>.txt (JSON) · out/run_<tag>.log"""
import http.server, json, os, socketserver, subprocess, sys, threading, time
from pathlib import Path
HERE = Path(__file__).resolve().parent
ROOT = str(HERE.parent / 'snap' / 'src')
OUT = HERE.parent / 'out'
OUT.mkdir(exist_ok=True)
tag, query, a, b, chunk = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
ports = sys.argv[6].split(',')
page = sys.argv[7] if len(sys.argv) > 7 else 'tier.html'

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *x, **kw): super().__init__(*x, directory=ROOT, **kw)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *x): pass
H.extensions_map.update({'.js': 'text/javascript', '.mjs': 'text/javascript', '.csv': 'text/csv'})
class S(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = False
    request_queue_size = 256
for p in ports:
    srv = S(('127.0.0.1', int(p)), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()

jobs = [(s, min(s + chunk - 1, b)) for s in range(a, b + 1, chunk)]
lock = threading.Lock()
log = open(OUT / f'run_{tag}.log', 'a', encoding='utf-8')
def say(m):
    with lock:
        log.write(time.strftime('%H:%M:%S ') + m + '\n'); log.flush()
def lane(port):
    while True:
        with lock:
            if not jobs: return
            s, e = jobs.pop(0)
        name = f'{tag}_{s}-{e}'
        for attempt in range(2):
            t0 = time.time()
            try:
                subprocess.run([sys.executable, str(HERE / 'run_page.py'), name, f'dev/{page}?seeds={s}-{e}&{query}', 'DONE,FAIL', '#sim', port, '5400'],
                               timeout=5600, capture_output=True, env={**os.environ, 'PYTHONIOENCODING': 'utf-8'})
                done = json.loads((OUT / (name + '.done')).read_text(encoding='utf-8'))
                ok = done['title'].startswith('DONE')
            except Exception as ex:
                done, ok = {'title': 'EXC ' + str(ex)[:200]}, False
            say(f'{port} {name} try{attempt} {done.get("title")} {round(time.time() - t0)}s {str(done.get("err", ""))[:300]} {done.get("page", "")}')
            if ok: break
say(f'start {tag} {query} {a}-{b} chunk {chunk} ports {ports}')
ths = [threading.Thread(target=lane, args=(p,)) for p in ports]
for t in ths: t.start()
for t in ths: t.join()
say(f'end {tag}')
