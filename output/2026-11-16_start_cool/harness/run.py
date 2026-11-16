"""harness/start_cool.html 을 snap/src 에 붙여 headless Edge 로 돌린다 -> ../result.json
Usage: python run.py [N=400]
"""
import asyncio, http.server, sys, threading, time
from pathlib import Path
from playwright.async_api import async_playwright

HERE = Path(__file__).resolve().parent
BASE = HERE.parent
SNAP = BASE / 'snap' / 'src'
PAGE = (HERE / 'start_cool.html').read_bytes()

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.csv': 'text/csv', '.json': 'application/json'}
    def __init__(self, *a, **kw): super().__init__(*a, directory=str(SNAP), **kw)
    def do_GET(self):
        key = self.path.split('?', 1)[0]
        if key == '/dev/start_cool.html':
            self.send_response(200); self.send_header('Content-Type', 'text/html; charset=utf-8'); self.send_header('Content-Length', str(len(PAGE))); self.end_headers(); self.wfile.write(PAGE)
        elif key == '/favicon.ico' or (key.startswith('/assets/') and not (SNAP / key.lstrip('/')).exists()):
            self.send_response(204); self.end_headers()
        else: super().do_GET()
    def log_message(self, *a): pass
class Server(http.server.ThreadingHTTPServer): request_queue_size = 256
server = Server(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()

async def main():
    N = int(sys.argv[1]) if len(sys.argv) > 1 else 400
    t0 = time.monotonic()
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel='msedge', headless=True, args=['--disable-background-timer-throttling'])
        ctx = await browser.new_context(); page = await ctx.new_page(); errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        await page.goto(f'http://127.0.0.1:{server.server_port}/dev/start_cool.html?n={N}')
        await page.wait_for_function("document.title==='DONE'||document.title==='FAIL'", timeout=1800000)
        txt = await page.locator('#out').inner_text()
        if txt.startswith('ERR'): print(txt[:1500])
        else:
            (BASE / 'result.json').write_text(txt, encoding='utf-8')
            print('done', round(time.monotonic() - t0, 1), 's', 'errors', errs[:3])
        await browser.close()
asyncio.run(main())
server.shutdown()
