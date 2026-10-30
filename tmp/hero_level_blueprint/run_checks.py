import json
from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path(__file__).parent
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:8828/dev/test.html')
    page.wait_for_function('/PASS|FAIL/.test(document.title)', timeout=180000)
    result = {'title': page.title(), 'failures': page.locator('#out li.fail').all_text_contents(), 'errors': errors}
    result['reward_checks'] = page.locator('#out li').all_text_contents()
    result['reward_checks'] = [row for row in result['reward_checks'] if 'level book:' in row]
    (out / 'verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False))
    browser.close()
