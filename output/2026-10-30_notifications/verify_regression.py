"""Run the existing game assertions without changing their baseline or saved games."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page()
    page.goto('http://127.0.0.1:8797/dev/test.html', wait_until='domcontentloaded')
    page.wait_for_function("/^(PASS|FAIL)/.test(document.title)", timeout=120000)
    result = {'title': page.title(), 'failures': page.locator('li.fail').all_inner_texts()}
    Path(__file__).with_name('regression_results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False))
    browser.close()
