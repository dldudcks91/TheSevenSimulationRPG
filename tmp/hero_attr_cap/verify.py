import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--baseline', action='store_true')
parser.add_argument('--write-golden', action='store_true')
parser.add_argument('--ui', action='store_true')
args = parser.parse_args()
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:8807/dev/test.html' + ('?golden=write' if args.write_golden else ''))
    page.wait_for_function('/PASS|FAIL/.test(document.title)', timeout=180000)
    result = {'title': page.title(), 'failures': page.locator('#out li.fail').all_text_contents(), 'errors': errors}
    result['calibration'] = page.locator('#calib table tr').evaluate_all('rows => rows.map(row => [...row.cells].map(cell => cell.textContent.trim()))')
    result['attribute_checks'] = [s for s in page.locator('#out li').all_text_contents() if '능력치 굴림:' in s or 'xp: 성장 고블린' in s]
    if args.write_golden:
        if errors or any(not s.startswith('golden:') for s in result['failures']):
            raise ValueError('Non-golden regression: ' + json.dumps(result, ensure_ascii=False))
        body = page.locator('#golden').text_content()
        golden = json.loads(body)
        if len(golden.get('runs', [])) != 60:
            raise ValueError('Incomplete golden snapshot')
        target = ROOT / 'src/dev/golden.json'
        (OUT / 'golden_before.json').write_bytes(target.read_bytes())
        with target.open('w', encoding='utf-8', newline='\n') as stream:
            stream.write(body)
    if args.ui:
        context = browser.new_context(viewport={'width': 1600, 'height': 1000})
        harness = '''
window.__attrReview = {
 ready: () => !!G?.heroes?.length,
 character: () => { state.tab = 'character'; render(); return {rollMax:D.balance.hero_attr_roll_max,finalMax:D.balance.hero_attr_max}; }
};
'''
        context.route('**/ui/app.js', lambda route: route.fulfill(status=200, content_type='text/javascript', body=(ROOT / 'src/ui/app.js').read_text(encoding='utf-8') + '\n' + harness))
        ui = context.new_page()
        ui.on('pageerror', lambda error: errors.append(str(error)))
        checks = []
        for lang, heading in [('ko', '기본 옵션'), ('en', 'Basic Stats')]:
            ui.goto(f'http://127.0.0.1:8807/index.html?dev=play&lang={lang}')
            ui.wait_for_function('__attrReview.ready()', timeout=60000)
            caps = ui.evaluate('__attrReview.character()')
            ui.locator('h2').filter(has_text=heading).locator('.q-btn').hover()
            ui.locator('.q-tip').wait_for(state='visible')
            tip = ui.locator('.q-tip').inner_text()
            checks.append({'lang': lang, 'caps': caps, 'text': tip, 'ok': '18' in tip and '{max}' not in tip and 'undefined' not in tip and '20' not in tip})
            ui.screenshot(path=str(OUT / f'attributes_{lang}.png'))
        result['ui'] = checks
        context.close()
    result_path = OUT / ('baseline.json' if args.baseline else 'verification.json')
    result_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False))
    browser.close()
    if errors or (result['failures'] and not args.write_golden) or any(not c['ok'] for c in result.get('ui', [])):
        raise SystemExit(1)
