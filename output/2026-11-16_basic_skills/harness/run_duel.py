"""Run harness/class_duel.html against snap_wt/src for the five classes in parallel -> ../duel_<cls>.json
Usage: python run_duel.py [N=120] [classes=warrior,knight,archer,mage,priest] [levels=15,25,45]
"""
import asyncio, http.server, json, sys, threading, time
from pathlib import Path
from playwright.async_api import async_playwright

HERE = Path(__file__).resolve().parent
BASE = HERE.parent
SNAP = BASE / 'snap_wt' / 'src'
PAGE = (HERE / 'class_duel.html').read_bytes()

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.csv': 'text/csv', '.json': 'application/json'}
    def __init__(self, *a, **kw): super().__init__(*a, directory=str(SNAP), **kw)
    def do_GET(self):
        key = self.path.split('?', 1)[0]
        if key == '/dev/class_duel.html':
            self.send_response(200); self.send_header('Content-Type', 'text/html; charset=utf-8'); self.send_header('Content-Length', str(len(PAGE))); self.end_headers(); self.wfile.write(PAGE)
        elif key == '/favicon.ico' or (key.startswith('/assets/') and not (SNAP / key.lstrip('/')).exists()):
            self.send_response(204); self.end_headers()
        else: super().do_GET()
    def log_message(self, *a): pass
class Server(http.server.ThreadingHTTPServer): request_queue_size = 256
server = Server(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()

async def main():
    N = int(sys.argv[1]) if len(sys.argv) > 1 else 120
    classes = (sys.argv[2] if len(sys.argv) > 2 else 'warrior,knight,archer,mage,priest').split(',')
    lv = sys.argv[3] if len(sys.argv) > 3 else '15,25,45'
    t0 = time.monotonic()
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel='msedge', headless=True, args=['--disable-background-timer-throttling'])
        async def one(cls):
            ctx = await browser.new_context(); page = await ctx.new_page(); errs = []
            page.on('pageerror', lambda e: errs.append(str(e)))
            # cls 자리에 `mage:partner=mag_fireball:v=mag_ignite,mag_echo` 처럼 덧붙일 수 있다 → 파일 이름 duel_<cls>_<partner>.json
            name, *extra = cls.split(':'); cls = name; qs = ''.join('&' + e for e in extra)
            tag = next((e.split('=', 1)[1] for e in extra if e.startswith('partner=')), None)
            await page.goto(f'http://127.0.0.1:{server.server_port}/dev/class_duel.html?n={N}&cls={cls}&lv={lv}{qs}')
            await page.wait_for_function("document.title==='DONE'||document.title==='FAIL'", timeout=1800000)
            txt = await page.locator('#out').inner_text()
            if txt.startswith('ERR'): print('ERR', cls, txt[:800], flush=True)
            else:
                (BASE / (f'duel_{cls}_{tag}.json' if tag else f'duel_{cls}.json')).write_text(txt, encoding='utf-8')
                print('done', cls, round(time.monotonic() - t0, 1), 'pageErrors', errs[:2], flush=True)
            await ctx.close()
        await asyncio.gather(*(one(c) for c in classes))
        await browser.close()
asyncio.run(main())
server.shutdown()
