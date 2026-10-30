import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/2026-10-30_snipe_channel'
parser = argparse.ArgumentParser()
parser.add_argument('--baseline', action='store_true')
parser.add_argument('--write-golden', action='store_true')
args = parser.parse_args()
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:8791/dev/test.html' + ('?golden=write' if args.write_golden else ''))
    page.wait_for_function('/PASS|FAIL/.test(document.title)', timeout=180000)
    result = {'title': page.title(), 'failures': page.locator('#out li.fail').all_text_contents(), 'errors': errors}
    result['channelChecks'] = page.locator('#out li').all_text_contents()
    result['channelChecks'] = [s for s in result['channelChecks'] if any(w in s for w in ['라운드 종료 환급', '스나이프는 여는 순간', '정신 집중 — 여는 차례'])]
    if args.baseline:
        (OUT / 'golden_before.json').write_bytes((ROOT / 'src/dev/golden.json').read_bytes())
    if args.write_golden:
        if errors or any(not s.startswith('golden:') for s in result['failures']):
            raise RuntimeError(json.dumps(result, ensure_ascii=False))
        body = page.locator('#golden').text_content()
        golden = json.loads(body)
        if len(body) < 1000 or len(golden.get('runs', [])) != 60:
            raise RuntimeError('Incomplete golden snapshot')
        with (ROOT / 'src/dev/golden.json').open('w', encoding='utf-8', newline='\n') as f:
            f.write(body)
    name = 'baseline' if args.baseline else 'golden_update' if args.write_golden else 'verification'
    (OUT / (name + '.json')).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=True))
    browser.close()
    if errors or (result['failures'] and not args.write_golden):
        raise SystemExit(1)
