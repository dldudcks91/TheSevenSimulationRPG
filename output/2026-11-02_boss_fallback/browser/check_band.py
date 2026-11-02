"""Real screen: lose to the first chapter boss, read the result band, press the button, confirm the next run. Own server on a free port; 8777 untouched."""
import http.server, json, threading
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
out = {}
with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True)
    for lang in ('ko', 'en'):
        c = b.new_context(viewport={'width': 1600, 'height': 800})
        c.route('**/*', lambda r: r.continue_() if r.request.url.startswith(f'http://127.0.0.1:{srv.server_port}/') else r.abort())
        page = c.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(f'http://127.0.0.1:{srv.server_port}/index.html?dev=play&stage=1051&lang={lang}', wait_until='domcontentloaded')
        page.wait_for_selector('.battle-result.show', timeout=240000)
        page.wait_for_selector('.battle-result.show .b-next', timeout=10000)
        page.wait_for_timeout(300)
        row = {'verdict': page.inner_text('.battle-result .verdict'), 'next': page.inner_text('.battle-result .b-next'),
               'button': page.inner_text('.battle-result .b-go') if page.locator('.battle-result .b-go').count() else None}
        page.screenshot(path=str(BASE / f'browser/band_{lang}.png'))
        page.click('.battle-result .b-go')
        page.wait_for_timeout(1500)
        row['saved_runs'] = page.evaluate("Object.keys(localStorage).length")
        row['after_click_band'] = page.locator('.battle-result.show').count()
        row['page_errors'] = errors
        page.screenshot(path=str(BASE / f'browser/after_click_{lang}.png'))
        out[lang] = row
        c.close()
    b.close()
srv.shutdown()
(BASE / 'browser/band.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
print(json.dumps(out, ensure_ascii=True))
