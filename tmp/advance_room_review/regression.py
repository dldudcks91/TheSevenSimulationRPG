from pathlib import Path
from playwright.sync_api import sync_playwright

out=Path(__file__).resolve().parent
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:8873/dev/test.html',wait_until='domcontentloaded',timeout=60000)
    page.wait_for_function("/^(PASS|FAIL) /.test(document.title)",timeout=180000)
    result=page.title()
    failures=page.locator('#out .fail').all_text_contents()
    (out/'regression.txt').write_text(result+'\n'+'\n'.join(failures+errors),encoding='utf-8')
    print(result,flush=True)
    for failure in failures: print(failure.encode('ascii','backslashreplace').decode(),flush=True)
    browser.close()
    raise SystemExit(0 if result.startswith('PASS') and not errors else 1)
