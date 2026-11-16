"""test.html 을 Playwright(Edge)로 돌려 PASS/FAIL 과 실패 단정 · 콘솔 오류를 뽑는다 — python run_tests.py <port> [timeout_min]"""
import sys, time, json
from playwright.sync_api import sync_playwright
port = sys.argv[1]
limit = float(sys.argv[2]) if len(sys.argv) > 2 else 20
gold = sys.argv[3] if len(sys.argv) > 3 else None
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True)
    pg = b.new_page()
    pg.on('console', lambda m: errs.append(f'{m.type}: {m.text[:300]}') if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append(f'pageerror: {str(e)[:400]}'))
    t0 = time.time()
    pg.goto(f'http://127.0.0.1:{port}/dev/test.html' + ('?golden=write' if gold else ''), timeout=120000)
    title = ''
    while time.time() - t0 < limit * 60:
        try:
            title = pg.title()
        except Exception:
            title = ''
        if title.startswith('PASS') or title.startswith('FAIL'):
            break
        time.sleep(5)
    print('title:', title, f'({time.time() - t0:.0f}s)')
    if title.startswith('FAIL'):
        fails = pg.eval_on_selector_all('li.fail', 'els => els.map(e => e.textContent.slice(0, 400))')
        for f in fails:
            print('FAIL>', f)
    if gold:
        txt = pg.evaluate("() => { const ps = [...document.querySelectorAll('pre')]; return ps.length ? ps[ps.length - 1].textContent : '' }")
        open(gold, 'w', encoding='utf-8').write(txt)
        print('golden bytes', len(txt))
    for e in errs[:15]:
        print('ERR>', e)
    b.close()
