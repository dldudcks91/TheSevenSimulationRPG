"""Capture the regression baseline and verify party-tactic UI in an isolated browser."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class LocalServer(ThreadingHTTPServer):
    request_queue_size = 128


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--phase', choices=['before', 'after'], required=True)
    args = parser.parse_args()
    server = LocalServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT / 'src')))
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    result = {'phase': args.phase, 'errors': []}
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(channel='msedge', headless=True)
            page = browser.new_page()
            page.on('pageerror', lambda error: result['errors'].append(str(error)))
            page.goto(f'http://127.0.0.1:{server.server_port}/dev/test.html')
            page.wait_for_function('/PASS|FAIL/.test(document.title)', timeout=180000)
            result['regression'] = {'title': page.title(), 'failures': page.locator('#out li.fail').all_text_contents()}
            result['tacticChecks'] = [s for s in page.locator('#out li').all_text_contents() if s.startswith('tactic:') or s.startswith('csv: tactic')]
            result['initialAssignments'] = page.evaluate('''async () => {
                const {SYS}=await import('/ui/data.js');
                const {makeRng}=await import('/game_logic/rng.js');
                return Array.from({length:500},(_,i)=>({seed:i+1,slots:SYS.tactic.initialAssign(makeRng(i+1))}));
            }''')
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
    (OUT / f'{args.phase}.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'phase':args.phase, 'regression':result['regression'], 'errors':result['errors']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
