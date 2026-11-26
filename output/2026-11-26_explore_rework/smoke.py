"""한 URL 을 열어 페이지 오류 · 덤프를 찍는다 — `python smoke.py <port> "<query>" <out.png> [wait_ms]`"""
import sys
from playwright.sync_api import sync_playwright

port, q, out = sys.argv[1], sys.argv[2], sys.argv[3]
wait = int(sys.argv[4]) if len(sys.argv) > 4 else 1500
with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True)
    ctx = b.new_context(viewport={'width': 1600, 'height': 800}, is_mobile=False)
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' else None)
    pg.on('response', lambda r: errs.append(f'{r.status} {r.url}') if r.status >= 400 else None)
    pg.goto(f'http://127.0.0.1:{port}/index.html?{q}', wait_until='domcontentloaded')
    pg.wait_for_timeout(wait)
    pg.screenshot(path=out)
    main = pg.locator('.main').inner_text()[:600] if pg.locator('.main').count() else ''
    print('ERRS', errs)
    print('MAIN', main.replace('\n', ' | ')[:600])
    b.close()
