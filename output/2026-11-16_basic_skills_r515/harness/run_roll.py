"""harness/roll.html 을 작업 폴더 src 로 → ../roll.json (영웅 생성 분포)"""
import asyncio, http.server, sys, threading
from pathlib import Path
from playwright.async_api import async_playwright
sys.stdout.reconfigure(encoding='utf-8')
HERE = Path(__file__).resolve().parent; BASE = HERE.parent; SRC = BASE.parents[1] / 'src'
PAGE = (HERE / 'roll.html').read_bytes()
class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.csv': 'text/csv', '.json': 'application/json'}
    def __init__(self, *a, **kw): super().__init__(*a, directory=str(SRC), **kw)
    def do_GET(self):
        key = self.path.split('?', 1)[0]
        if key == '/dev/roll.html':
            self.send_response(200); self.send_header('Content-Type', 'text/html; charset=utf-8'); self.send_header('Content-Length', str(len(PAGE))); self.end_headers(); self.wfile.write(PAGE)
        elif key == '/favicon.ico' or (key.startswith('/assets/') and not (SRC / key.lstrip('/')).exists()):
            self.send_response(204); self.end_headers()
        else: super().do_GET()
    def log_message(self, *a): pass
class S(http.server.ThreadingHTTPServer): request_queue_size = 256
srv = S(('127.0.0.1', 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='msedge', headless=True)
        pg = await b.new_page(); await pg.goto(f'http://127.0.0.1:{srv.server_port}/dev/roll.html?n={sys.argv[1] if len(sys.argv) > 1 else 50000}')
        await pg.wait_for_function("document.title==='DONE'||document.title==='FAIL'", timeout=900000)
        txt = await pg.locator('#out').inner_text(); await b.close()
    if txt.startswith('ERR'): print(txt[:1500])
    else: (BASE / 'roll.json').write_text(txt, encoding='utf-8'); print('done')
asyncio.run(main()); srv.shutdown()
