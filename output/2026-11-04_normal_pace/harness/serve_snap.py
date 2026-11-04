"""스냅샷 전용 서버 — no-cache · 대기열 256 · 포트 강탈 금지. 사용: python serve_snap.py <port>"""
import http.server, socketserver, sys
from pathlib import Path
ROOT = str(Path(__file__).resolve().parent.parent / 'snap' / 'src')
PORT = int(sys.argv[1])

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw): super().__init__(*a, directory=ROOT, **kw)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *a): pass
H.extensions_map.update({'.js': 'text/javascript', '.mjs': 'text/javascript', '.csv': 'text/csv'})

class S(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = False
    request_queue_size = 256

S(('127.0.0.1', PORT), H).serve_forever()
