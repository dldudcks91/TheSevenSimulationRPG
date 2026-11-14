import json
from pathlib import Path
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('https://**', lambda route: route.abort())
    page.goto('http://127.0.0.1:8867/index.html?dev=newgame&lang=ko&skin=d2min', wait_until='networkidle')
    result = {'title': page.title(), 'errors': errors, 'body': page.locator('body').inner_text()[:500]}
    Path(__file__).with_name('probe.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False))
    browser.close()
