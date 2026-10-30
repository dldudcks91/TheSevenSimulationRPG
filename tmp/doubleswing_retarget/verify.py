import json
import sys
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
DEST = Path(__file__).with_name(sys.argv[1] if len(sys.argv) > 1 else 'result.json')
sys.argv = sys.argv[:1]
sys.path.insert(0, str(ROOT))
from serve import NoCacheHandler


class QuietHandler(NoCacheHandler):
    def log_message(self, *_args):
        pass


with ThreadingHTTPServer(('127.0.0.1', 0), QuietHandler) as server:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        page = browser.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(f'http://127.0.0.1:{server.server_port}/dev/test.html')
        page.wait_for_function('/PASS|FAIL/.test(document.title)', timeout=240000)
        checks = page.locator('#out li').evaluate_all('nodes => nodes.map(n => ({ok: !n.classList.contains("fail"), text: n.textContent}))')
        result = {'title': page.title(), 'errors': errors, 'failures': [c['text'] for c in checks if not c['ok']],
                  'targeted': [c for c in checks if '더블스윙 —' in c['text'] or 'enemy_single 다단' in c['text']]}
        DEST.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps(result, ensure_ascii=False, indent=2))
        browser.close()
    server.shutdown()
