"""harness/scale.html 을 다섯 직업 동시에 → ../scale_<cls>.json
칸 f 배(능력치 10 → 18 = 10% 복리 2.14 · 5% 복리 1.48 · 3% 직선 1.24)가 결투 마진을 얼마나 움직이나
"""
import asyncio, http.server, os, sys, threading, time
from pathlib import Path
from playwright.async_api import async_playwright
sys.stdout.reconfigure(encoding='utf-8')
HERE = Path(__file__).resolve().parent; BASE = HERE.parent; SNAP = BASE / 'snap_wt' / 'src'
PAGE = (HERE / 'scale.html').read_bytes()
JOBS = {
    'warrior': 'war_bash:mult,war_shout:value/dur,war_battleorders:value,war_ironskin:value,war_warcry:value',
    'knight': 'kni_charge:mult,kni_might:value,kni_fanaticism:value,kni_defiance:value,kni_resistshield:value,kni_holyshield:value',
    'priest': 'pri_judgment:mult,pri_grace:value/dur,pri_haste:value,pri_regen:value,pri_penitence:value,pri_bind:value,pri_doom:value',
    'archer': 'arc_snipe:mult,arc_quickhands:value/dur,arc_eagleeye:value',
    'mage': 'mag_fireball:mult',
}
# 덮어쓰기: run_scale.py warrior=war_shout:value/dur archer=... → 그 직업만 · 파일 이름 scale_<cls>_<tag>.json(tag = 2번째 인자 이후 첫 '#' 뒤)
TAG = ''
if len(sys.argv) > 1:
    JOBS = dict(a.split('=', 1) for a in sys.argv[1:] if '=' in a); TAG = next((a[1:] for a in sys.argv[1:] if a.startswith('#')), 'extra')
class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.csv': 'text/csv', '.json': 'application/json'}
    def __init__(self, *a, **kw): super().__init__(*a, directory=str(SNAP), **kw)
    def do_GET(self):
        key = self.path.split('?', 1)[0]
        if key == '/dev/scale.html':
            self.send_response(200); self.send_header('Content-Type', 'text/html; charset=utf-8'); self.send_header('Content-Length', str(len(PAGE))); self.end_headers(); self.wfile.write(PAGE)
        elif key == '/favicon.ico' or (key.startswith('/assets/') and not (SNAP / key.lstrip('/')).exists()):
            self.send_response(204); self.end_headers()
        else: super().do_GET()
    def log_message(self, *a): pass
class S(http.server.ThreadingHTTPServer): request_queue_size = 256
srv = S(('127.0.0.1', 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
async def main():
    t0 = time.monotonic()
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='msedge', headless=True, args=['--disable-background-timer-throttling'])
        async def one(cls):
            ctx = await b.new_context(); pg = await ctx.new_page()
            await pg.goto(f'http://127.0.0.1:{srv.server_port}/dev/scale.html?cls={cls}&s={JOBS[cls]}&lv=25,45&n={os.environ.get("SCALE_N", "120")}')
            await pg.wait_for_function("document.title==='DONE'||document.title==='FAIL'", timeout=3600000)
            txt = await pg.locator('#out').inner_text()
            if txt.startswith('ERR'): print('ERR', cls, txt[:800], flush=True)
            else: (BASE / (f'scale_{cls}_{TAG}.json' if TAG else f'scale_{cls}.json')).write_text(txt, encoding='utf-8'); print('done', cls, round(time.monotonic() - t0, 1), flush=True)
            await ctx.close()
        await asyncio.gather(*(one(c) for c in JOBS))
        await b.close()
asyncio.run(main()); srv.shutdown()
