"""Independent save determinism and inventory conservation checks, isolated Edge."""
import hashlib
import json
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]
SRC = ROOT / 'src'
files = {p.relative_to(SRC).as_posix(): p.read_bytes()
         for folder in ['ui', 'game_logic', 'data']
         for p in (SRC / folder).iterdir() if p.suffix in ['.js', '.csv']}
hashes = {k: hashlib.sha256(v).hexdigest() for k, v in files.items()}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SRC), **kwargs)

    def log_message(self, *args):
        pass

    def do_GET(self):
        key = self.path.split('?')[0].lstrip('/')
        if key == '__qa__.html':
            data, mime = b'<!doctype html><title>QA</title>', 'text/html'
        elif key in files:
            data = files[key]
            mime = 'text/javascript' if key.endswith('.js') else 'text/csv'
        else:
            return super().do_GET()
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)


server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
t0 = time.monotonic()
errors = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{server.server_port}/__qa__.html')
    script = sys.argv[1] if len(sys.argv) > 1 else 'checks.js'
    result = page.evaluate((OUT / script).read_text(encoding='utf-8'))
    browser.close()
server.shutdown()
result.update({'elapsed_wall_sec': round(time.monotonic() - t0, 3), 'browser_errors': errors,
               'source_sha256': hashes,
               'concurrent_source_changes': [k for k, h in hashes.items()
                   if hashlib.sha256((SRC / k).read_bytes()).hexdigest() != h]})
name = 'results.json' if script == 'checks.js' else Path(script).stem + '_results.json'
(OUT / name).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({k: v for k, v in result.items() if k != 'source_sha256'}, ensure_ascii=True), flush=True)
