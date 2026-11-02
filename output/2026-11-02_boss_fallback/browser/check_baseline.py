"""dev/test.html against the frozen copy. Own server on a free port; 8777 untouched."""
import http.server, json, threading, time
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE = Path(__file__).resolve().parent.parent
ROOT = BASE.parents[1]
SNAP = BASE / 'snapshot/src'
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
    c = b.new_context(); page = c.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{srv.server_port}/dev/test.html', wait_until='domcontentloaded')
    bad=[]
    page.on('response', lambda r: bad.append((r.status,r.url)) if r.status>=400 else None)
    page.on('console', lambda m: bad.append(('console',m.type,m.text[:300])) if m.type in ('error',) else None)
    try:
        page.wait_for_function("document.title.startsWith('PASS')||document.title.startsWith('FAIL')", timeout=180000)
    except Exception as e:
        print('TIMEOUT title=',page.title().encode('ascii','backslashreplace').decode(),'ok=',page.locator('#out li.ok').count(),'fail=',page.locator('#out li.fail').count())
        print('last=',[x.encode('ascii','backslashreplace').decode()[:200] for x in page.locator('#out li').all_text_contents()[-3:]])
        print('errors=',errors[:5]); print('bad=',str(bad[:10]).encode('ascii','backslashreplace').decode())
        raise SystemExit(2)
    r = {'title': page.title(), 'passed': page.locator('#out li.ok').count(), 'failed': page.locator('#out li.fail').count(),
         'failures': page.locator('#out li.fail').all_text_contents(), 'elapsed_sec': round(time.monotonic() - t0, 1), 'page_errors': errors}
    b.close()
srv.shutdown()
(BASE / 'browser/baseline_assertions.json').write_text(json.dumps(r, ensure_ascii=False, indent=1), encoding='utf-8')
print(json.dumps({k: r[k] for k in ('title','passed','failed','elapsed_sec')}), flush=True)
for f in r['failures'][:20]: print(f.encode('ascii','backslashreplace').decode()[:300])

