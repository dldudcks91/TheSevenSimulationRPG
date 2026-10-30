import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
OUT = Path(__file__).resolve().parent
label = sys.argv[1]
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width': 1600, 'height': 1000})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:8806/dev/test.html', wait_until='domcontentloaded')
    page.wait_for_function('/PASS|FAIL/.test(document.title)', timeout=180000)
    result = {
        'title': page.title(),
        'failures': page.locator('#out li.fail').all_text_contents(),
        'party_checks': page.locator('#out li').all_text_contents(),
        'errors': errors,
    }
    result['party_checks'] = [s for s in result['party_checks'] if s.startswith(('presets:', 'construction: 탐험', 'chapter:'))]
    (OUT / f'{label}.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False))
    browser.close()
