"""Serve ../snap/src with the repo's serve.py handler; art assets fall back to the repo.
POST /__save/<name>.json → ../snap/src/dev/obt_states/<name>.json (캠페인 상태 저장 — 이 하네스 전용 · 이름은 [A-Za-z0-9_-] 만).
python serve_snap.py <port>"""
import importlib.util, re, sys
from pathlib import Path
H = Path(__file__).resolve().parent
ROOT = H.parents[2]
SNAP = H.parent / 'snap' / 'src'
STATES = SNAP / 'dev' / 'obt_states'
spec = importlib.util.spec_from_file_location('review_http', ROOT / 'serve.py')
server = importlib.util.module_from_spec(spec)
saved = sys.argv; sys.argv = sys.argv[:1]
spec.loader.exec_module(server)
sys.argv = saved
server.ROOT = str(SNAP)
NAME = re.compile(r'^/__save/([A-Za-z0-9_\-]{1,120}\.json)$')
class Handler(server.NoCacheHandler):
    def translate_path(self, path):
        target = Path(super().translate_path(path))
        try:
            rel = target.relative_to(SNAP)
        except ValueError:
            return str(target)
        if rel.parts and rel.parts[0] == 'assets' and not target.exists():
            return str(ROOT / 'src' / rel)
        return str(target)
    def do_POST(self):
        m = NAME.match(self.path)
        n = int(self.headers.get('Content-Length', '0') or 0)
        body = self.rfile.read(n) if n > 0 else b''
        if not m or not body:
            self.send_response(400); self.send_header('Content-Length', '0'); self.end_headers(); return
        STATES.mkdir(parents=True, exist_ok=True)
        tmp = STATES / (m.group(1) + '.tmp')
        tmp.write_bytes(body)
        tmp.replace(STATES / m.group(1))
        self.send_response(200); self.send_header('Content-Length', '2'); self.end_headers(); self.wfile.write(b'ok')
    def log_message(self, *args):
        pass
server.Server.allow_reuse_address = False
port = int(sys.argv[1])
with server.Server((server.HOST, port), Handler) as httpd:
    print(f'snapshot on http://127.0.0.1:{port}', flush=True)
    httpd.serve_forever()
