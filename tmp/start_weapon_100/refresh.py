"""Refresh fingerprints quickly, then run one final regression on the same sources."""
import functools
import http.server
import json
import threading
from pathlib import Path
from urllib.parse import unquote, urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).parent
sources = {
    path.relative_to(ROOT / 'src').as_posix(): path.read_bytes()
    for folder in ('game_logic', 'ui', 'data', 'dev')
    for path in (ROOT / 'src' / folder).rglob('*')
    if path.is_file() and path.suffix in ('.js', '.json', '.csv')
}
html = b'''<!doctype html><script type="module">
import {D, loadData, buildSystems} from '/ui/data.js';
import {buildFingerprint} from '/dev/golden.js';
await loadData('/data/');
const SYS = buildSystems(D);
window.fingerprint = buildFingerprint(SYS, D.balance, D, 1700000000000, '2026-10-30');
</script>'''


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT / 'src')))
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        page = browser.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))

        def frozen(route):
            path = unquote(urlsplit(route.request.url).path).lstrip('/')
            if path == 'dev/starter_fingerprint.html':
                route.fulfill(body=html, content_type='text/html; charset=utf-8')
                return
            body = sources.get(path)
            if body is None:
                route.continue_()
            else:
                content_type = 'text/javascript' if path.endswith('.js') else 'application/json' if path.endswith('.json') else 'text/csv'
                route.fulfill(body=body, content_type=content_type + '; charset=utf-8')

        page.route('**/*', frozen)
        base = f'http://127.0.0.1:{server.server_port}'
        page.goto(base + '/dev/starter_fingerprint.html')
        page.wait_for_function('!!window.fingerprint', timeout=60000)
        body = page.evaluate('JSON.stringify(window.fingerprint, null, 2)')
        assert len(json.loads(body)['runs']) == 60 and not errors
        relevant = {key: value for key, value in sources.items() if not key.startswith('dev/') or key == 'dev/golden.json' or key == 'dev/golden.js'}
        changed = [key for key, value in relevant.items() if (ROOT / 'src' / key).read_bytes() != value]
        assert not changed, changed
        (OUT / 'golden_before.json').write_bytes(sources['dev/golden.json'])
        (ROOT / 'src/dev/golden.json').write_bytes(body.encode('utf-8'))
        sources['dev/golden.json'] = body.encode('utf-8')
        print('Refreshed 60 golden runs', flush=True)
        page.goto(base + '/dev/test.html')
        page.wait_for_function('/PASS|FAIL/.test(document.title)', timeout=180000)
        checks = page.locator('#out li').evaluate_all('els => els.map(e => ({ok: e.classList.contains("ok"), text: e.textContent}))')
        own = [row for row in checks if row['text'].startswith(('newGame: \uc2dc\uc791 \ud30c\ud2f0', 'simulate: \ub2e4\ub2e8\ud0c0', 'stepRun: \uc6d0\uc815 \uc911 \uad50\uccb4', '\uccab \ud074\ub9ac\uc5b4 \uc0c1\uc790'))]
        assert len(own) == 4 and all(row['ok'] for row in own), own
        result = {'title': page.title(), 'failures': page.locator('#out li.fail').all_text_contents(), 'errors': errors, 'targeted_checks': own}
        (OUT / 'final.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
        print(result['title'], flush=True)
        browser.close()
finally:
    server.shutdown()
    server.server_close()
