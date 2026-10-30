"""Isolated browser QA. No existing server, browser profile, or game save is used."""
import functools
import http.server
import json
import threading
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

def write(name, value):
    (OUT/name).write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')

def main():
    handler = functools.partial(Handler, directory=str(ROOT/'src'))
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    result = {'base':base, 'checks':[], 'errors':[], 'http_errors':[], 'failed_requests':[]}
    start = time.time()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='msedge', headless=True)
        context = browser.new_context(viewport={'width':1600,'height':900}, device_scale_factor=1)
        page = context.new_page()
        page.on('pageerror', lambda e: result['errors'].append(str(e)))
        page.on('response', lambda r: result['http_errors'].append({'status':r.status,'url':r.url}) if r.status>=400 else None)
        page.on('requestfailed', lambda r: result['failed_requests'].append({'url':r.url,'failure':r.failure}))
        page.goto(base+'/dev/test.html')
        try:
            page.wait_for_function("document.title.includes('PASS') || document.title.includes('FAIL')", timeout=180000)
            result['suite'] = {'title':page.title(), 'failures':page.locator('#out li.fail').all_text_contents(), 'passed':page.locator('#out li.ok').count(), 'failed':page.locator('#out li.fail').count(), 'elapsed_sec':round(time.time()-start,2)}
        except Exception as e:
            result['suite'] = {'exception':str(e), 'title':page.title(), 'body':page.locator('body').inner_text()[-5000:]}
        write('regression.json',result['suite'])
        print(json.dumps(result['suite'],ensure_ascii=True),flush=True)
        page.goto(base+'/index.html')
        page.wait_for_function("!document.querySelector('#app').classList.contains('booting')", timeout=60000)
        page.wait_for_timeout(300)
        page.screenshot(path=str(OUT/'01_menu.png'))
        result['menu']={'body':page.locator('body').inner_text(), 'buttons':page.locator('button').all_text_contents()}
        write('initial.json',result)
        print(json.dumps({'menu':result['menu']},ensure_ascii=True),flush=True)
        browser.close()
    server.shutdown()

if __name__=='__main__':
    main()
