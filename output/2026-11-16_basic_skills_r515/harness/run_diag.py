"""harness/diag.html 을 여러 설정으로 → ../diag.txt"""
import asyncio, http.server, sys, threading
from pathlib import Path
from playwright.async_api import async_playwright
sys.stdout.reconfigure(encoding='utf-8')
HERE = Path(__file__).resolve().parent; BASE = HERE.parent; SNAP = BASE / 'snap_wt' / 'src'
PAGE = (HERE / 'diag.html').read_bytes()
class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.csv': 'text/csv', '.json': 'application/json'}
    def __init__(self, *a, **kw): super().__init__(*a, directory=str(SNAP), **kw)
    def do_GET(self):
        key = self.path.split('?', 1)[0]
        if key == '/dev/diag.html':
            self.send_response(200); self.send_header('Content-Type', 'text/html; charset=utf-8'); self.send_header('Content-Length', str(len(PAGE))); self.end_headers(); self.wfile.write(PAGE)
        elif key == '/favicon.ico' or (key.startswith('/assets/') and not (SNAP / key.lstrip('/')).exists()):
            self.send_response(204); self.end_headers()
        else: super().do_GET()
    def log_message(self, *a): pass
class S(http.server.ThreadingHTTPServer): request_queue_size = 256
srv = S(('127.0.0.1', 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
CONF = sys.argv[1:] or ['lv=45&partner=mag_lightning&test=mag_ignite', 'lv=45&partner=mag_lightning&test=mag_ignite&order=fixed',
                        'lv=25&partner=mag_fireball&test=mag_ignite', 'lv=25&partner=mag_fireball&test=mag_ignite&order=fixed',
                        'lv=25&test=mag_ignite', 'lv=25&test=mag_echo']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='msedge', headless=True, args=['--disable-background-timer-throttling'])
        async def one(c):
            pg = await b.new_page(); await pg.goto(f'http://127.0.0.1:{srv.server_port}/dev/diag.html?{c}')
            await pg.wait_for_function("document.title==='DONE'||document.title==='FAIL'", timeout=900000)
            return await pg.locator('#out').inner_text()
        res = await asyncio.gather(*(one(c) for c in CONF))
        await b.close()
    txt = '\n\n'.join(res); (BASE / 'diag.txt').write_text(txt, encoding='utf-8'); print(txt)
asyncio.run(main()); srv.shutdown()
