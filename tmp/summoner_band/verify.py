import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright


out = Path(__file__).resolve().parent
label = sys.argv[1]
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:8846/dev/test.html')
    page.wait_for_function('/PASS|FAIL/.test(document.title)', timeout=240000)
    checks = page.locator('#out li').evaluate_all(
        'nodes => nodes.map(n => ({ok: !n.classList.contains("fail"), text: n.textContent}))'
    )
    result = {
        'title': page.title(),
        'checks': checks,
        'failures': [check['text'] for check in checks if not check['ok']],
        'errors': errors,
    }
    (out / f'{label}.json').write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8'
    )
    print(json.dumps({k: v for k, v in result.items() if k != 'checks'}, ensure_ascii=True))
    browser.close()
    sys.exit(1 if result['failures'] or errors else 0)
