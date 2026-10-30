import importlib.util
import json
import re
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tmp' / 'polite_copy_review'
OUT.mkdir(exist_ok=True)
spec = importlib.util.spec_from_file_location('review_server', ROOT / 'serve.py')
module = importlib.util.module_from_spec(spec)
review_args = sys.argv[:]
try:
    sys.argv = [str(ROOT / 'serve.py')]
    spec.loader.exec_module(module)
finally:
    sys.argv = review_args


class QuietHandler(module.NoCacheHandler):
    def log_message(self, *args):
        pass


HARNESS = '''
window.__copyReview = {
  show: (tab, extras = {}, modal = null) => {
    state.screen = 'game'; state.tab = tab; state.modal = modal;
    Object.assign(state, extras); render();
  },
  lang: value => { setLang(value); render(); },
  scene: index => { state.screen = 'prologue'; state.proScene = index; render(); },
};
'''


with module.Server(('::' if module.socket.has_ipv6 else '', 0), QuietHandler) as server:
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel='msedge', headless=True)
        context = browser.new_context(viewport={'width': 1600, 'height': 900})
        context.route('**/ui/app.js', lambda route: route.fulfill(
            status=200, content_type='text/javascript',
            body=(ROOT / 'src/ui/app.js').read_text(encoding='utf-8') + '\n' + HARNESS))
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        report = {'suite': None, 'failures': []}
        if '--prologue-only' not in sys.argv:
            page.goto(base + '/dev/test.html')
            page.wait_for_function("/^(PASS|FAIL) /.test(document.title)", timeout=180000)
            report = {'suite': page.title(), 'failures': page.locator('#out li.fail').all_text_contents()}
            print(json.dumps(report, ensure_ascii=True), flush=True)
        else:
            page.goto(base + '/index.html?dev=prologue&lang=ko')
            page.wait_for_selector('.pro-wrap', timeout=60000)
            report['prologue_layout'] = []
            for width, height in [(1600, 900), (1366, 768)]:
                page.set_viewport_size({'width': width, 'height': height})
                for index in range(5):
                    page.evaluate('(i) => __copyReview.scene(i)', index)
                    layout = page.locator('.pro-wrap').evaluate('''wrap => {
                        const body = wrap.querySelector('.pro-body');
                        const actions = wrap.querySelector('.pro-actions').getBoundingClientRect();
                        return {bodyWidth:body.clientWidth, textWidth:body.scrollWidth,
                                bodyHeight:body.clientHeight, textHeight:body.scrollHeight,
                                overflow:getComputedStyle(body).overflowY,
                                actionsVisible:actions.top>=0 && actions.bottom<=innerHeight,
                                text:body.innerText};
                    }''')
                    assert layout['textWidth'] <= layout['bodyWidth'] + 1, (index, layout)
                    assert layout['actionsVisible'], (index, layout)
                    assert layout['textHeight'] <= layout['bodyHeight'] + 1 or layout['overflow'] == 'auto', (index, layout)
                    report['prologue_layout'].append({'width': width, 'scene': index + 1, **layout})
                    if width == 1600 and index in [0, 4]:
                        page.screenshot(path=str(OUT / f'prologue_{index + 1}_ko.png'))
        if '--suite-only' not in sys.argv and '--prologue-only' not in sys.argv:
            page.goto(base + '/index.html?dev=newgame&cn=max&lang=ko')
            page.wait_for_selector('.nav button', timeout=60000)
            report['screens'] = []
            for language in ['ko', 'en']:
                page.evaluate('(lang) => __copyReview.lang(lang)', language)
                for tab in ['party', 'character', 'research', 'tavern', 'resource', 'help', 'codex']:
                    page.evaluate('(tab) => __copyReview.show(tab)', tab)
                    text = page.locator('#stage').inner_text()
                    report['screens'].append({'lang': language, 'tab': tab, 'text': text})
                    if language == 'ko' and tab in ['resource', 'help', 'codex']:
                        page.screenshot(path=str(OUT / f'{tab}_ko.png'))
            keys = re.findall(r"^\s*'([^']+)'\s*:", (ROOT / 'src/ui/i18n.js').read_text(encoding='utf-8'), re.M)
            report['strings'] = page.evaluate('''async keys => {
                const {t, setLang} = await import('/ui/i18n.js');
                setLang('ko');
                return Object.fromEntries(keys.map(key => [key, t(key)]));
            }''', keys)
            report['prologue'] = {key: value for key, value in report['strings'].items() if key.startswith('pro.s')}
        report['page_errors'] = errors
        name = 'prologue.json' if '--prologue-only' in sys.argv else 'suite.json' if '--suite-only' in sys.argv else 'results.json'
        (OUT / name).write_text(
            json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps({'suite': report['suite'], 'failure_count': len(report['failures']),
                          'page_errors': errors, 'screens': len(report.get('screens', [])),
                          'prologue_screens': len(report.get('prologue_layout', []))}, ensure_ascii=True), flush=True)
        browser.close()
    server.shutdown()
