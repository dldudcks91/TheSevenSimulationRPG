import json
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:8777/dev/test.html')
    page.wait_for_function("/PASS|FAIL/.test(document.title)", timeout=120000)
    result = {
        'suite': page.title(),
        'failures': page.locator('#out li.fail').all_text_contents(),
        'errors': errors,
        'proc_checks': page.locator('#out li').evaluate_all("ns => ns.filter(n => /타격 발동/.test(n.textContent)).map(n => ({text:n.textContent, ok:n.classList.contains('ok')}))"),
    }
    (OUT / 'verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=True), flush=True)
    browser.close()
