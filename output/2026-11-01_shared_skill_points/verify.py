"""Run the full browser suite in an isolated local origin."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import sys
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent

class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*_args): pass

class Server(ThreadingHTTPServer):
    request_queue_size=128

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    server=Server(('127.0.0.1',0),partial(Handler,directory=str(ROOT/'src')))
    thread=Thread(target=server.serve_forever,daemon=True); thread.start()
    result={'errors':[]}
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(channel='msedge',headless=True)
            page=browser.new_page()
            page.on('pageerror',lambda e:result['errors'].append(str(e)))
            page.goto(f'http://127.0.0.1:{server.server_port}/dev/test.html')
            page.wait_for_function('/PASS|FAIL/.test(document.title)',timeout=180000)
            result['title']=page.title()
            result['failures']=page.locator('#out li.fail').all_text_contents()
            result['pointChecks']=[x for x in page.locator('#out li').all_text_contents() if x.startswith(('advance:','save: v44','save: v45','arena:','battle: 같은 스킬'))]
            browser.close()
    finally:
        server.shutdown(); server.server_close(); thread.join(timeout=5)
        (OUT/'regression.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
