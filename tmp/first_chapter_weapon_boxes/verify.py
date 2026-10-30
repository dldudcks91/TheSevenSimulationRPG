"""Run the browser regression suite in an isolated, temporary local server."""
import functools
import http.server
import json
import threading
from pathlib import Path
from urllib.parse import unquote, urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
SOURCES = {
    path.relative_to(ROOT / 'src').as_posix(): path.read_bytes()
    for folder in ('game_logic', 'ui', 'data', 'dev')
    for path in (ROOT / 'src' / folder).rglob('*')
    if path.is_file() and path.suffix in ('.js', '.json', '.csv')
}
STATE_PATH = 'game_logic/state.js'
current_state = SOURCES[STATE_PATH].decode('utf-8').replace('\r\n', '\n')
new_rule = "const kind = deps.stages[run.stageId].chapter === 1 ? 'weapon' : rolledKind;"
assert current_state.count(new_rule) == 1
baseline_state = current_state.replace(new_rule, 'const kind = rolledKind;').encode('utf-8')


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


server = http.server.ThreadingHTTPServer(
    ('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT / 'src'))
)
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        result = {}
        for mode in ('current', 'baseline'):
            page = browser.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))

            def frozen(route):
                path = unquote(urlsplit(route.request.url).path).lstrip('/')
                body = baseline_state if mode == 'baseline' and path == STATE_PATH else SOURCES.get(path)
                if body is None:
                    route.continue_()
                else:
                    content_type = 'text/javascript' if path.endswith('.js') else 'application/json' if path.endswith('.json') else 'text/csv'
                    route.fulfill(body=body, content_type=content_type + '; charset=utf-8')

            page.route('**/*', frozen)
            page.goto(f'http://127.0.0.1:{server.server_port}/dev/test.html')
            page.wait_for_function('/PASS|FAIL/.test(document.title)', timeout=180000)
            result[mode] = {
                'title': page.title(),
                'failures': page.locator('#out li.fail').all_text_contents(),
                'errors': errors[:],
                'box_checks': [line for line in page.locator('#out li').all_text_contents() if '\uc0c1\uc790' in line],
            }
            page.close()
        result['unchanged_failures'] = [line for line in result['current']['failures'] if line in result['baseline']['failures']]
        result['new_failures'] = [line for line in result['current']['failures'] if line not in result['baseline']['failures']]
        (Path(__file__).parent / 'verification.json').write_text(
            json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8'
        )
        print(json.dumps({key: value for key, value in result.items() if key not in ('current', 'baseline')}, ensure_ascii=True))
        for mode in ('current', 'baseline'):
            print(mode + ': ' + result[mode]['title'])
        browser.close()
        if result['new_failures'] or any(result[mode]['errors'] for mode in ('current', 'baseline')):
            raise SystemExit(1)
finally:
    server.shutdown()
    server.server_close()
