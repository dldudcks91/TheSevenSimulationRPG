import datetime
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:8777/dev/test.html')
    page.wait_for_function("document.title.includes('PASS') || document.title.includes('FAIL')", timeout=120000)
    result = {
        'time': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'title': page.title(),
        'failures': page.locator('#out li.fail').all_text_contents(),
        'errors': errors,
    }
    Path('tmp/weapon_proc_review/baseline.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=True))
    browser.close()
