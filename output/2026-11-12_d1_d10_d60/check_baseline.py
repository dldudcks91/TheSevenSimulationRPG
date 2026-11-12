"""dev/test.html against a frozen copy. Own server on a free port; 8777 untouched.
Usage: python check_baseline.py head|wt
"""
import http.server, json, sys, threading, time
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
KIND = sys.argv[1]
SNAP = BASE / f'snap_{KIND}' / 'src'
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=str(SNAP), **k)
    def log_message(self, *a): pass
    def do_GET(self):
        key = self.path.split('?', 1)[0]
        if key.startswith('/assets/') and not (SNAP / key.lstrip('/')).exists():
            p = ROOT / 'src' / key.lstrip('/')
            if not p.is_file(): self.send_error(404); return
            b = p.read_bytes(); self.send_response(200); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
        else: super().do_GET()
class S(http.server.ThreadingHTTPServer): request_queue_size = 256
srv = S(('127.0.0.1', 0), H)
threading.Thread(target=srv.serve_forever, daemon=True).start()
errors = []; t0 = time.monotonic()
with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True)
    c = b.new_context()
    c.route('**/*', lambda route: route.continue_() if route.request.url.startswith(f'http://127.0.0.1:{srv.server_port}/') else route.abort())
    page = c.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{srv.server_port}/dev/test.html', wait_until='domcontentloaded')
    try:
        page.wait_for_function("document.title.startsWith('PASS')||document.title.startsWith('FAIL')", timeout=300000)
    except Exception:
        print('TIMEOUT', page.title().encode('ascii', 'backslashreplace').decode(), 'errors', errors[:3]); raise SystemExit(2)
    r = {'kind': KIND, 'title': page.title(), 'passed': page.locator('#out li.ok').count(), 'failed': page.locator('#out li.fail').count(),
         'failures': page.locator('#out li.fail').all_text_contents(), 'elapsed_sec': round(time.monotonic() - t0, 1), 'page_errors': errors}
    b.close()
srv.shutdown()
(BASE / f'baseline_{KIND}.json').write_text(json.dumps(r, ensure_ascii=False, indent=1), encoding='utf-8')
print(json.dumps({k: r[k] for k in ('kind', 'title', 'passed', 'failed', 'elapsed_sec')}), flush=True)
for f in r['failures'][:20]: print(f.encode('ascii', 'backslashreplace').decode()[:300])
