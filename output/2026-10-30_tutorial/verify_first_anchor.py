"""Focused first-area label check after narrowing the anchor to its text span."""
import json

from playwright.sync_api import sync_playwright

from verify_ui import BASE, ROOT, OUT, HARNESS, CHECKS, ERRORS, active, check, geometry


with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='msedge', headless=True)
    context = browser.new_context(viewport={'width': 1600, 'height': 900})
    context.route('https://**', lambda route: route.abort())
    context.route('**/ui/app.js', lambda route: route.fulfill(status=200, content_type='text/javascript',
        body=(ROOT / 'src/ui/app.js').read_text(encoding='utf-8') + HARNESS))
    page = context.new_page()
    page.on('pageerror', lambda error: ERRORS.append(str(error)))
    page.goto(BASE + '/index.html?dev=newgame&lang=ko&skin=now', wait_until='networkidle')
    page.wait_for_selector('.tutorial-card')
    for width, height, skin, screenshot in [
        (1600, 900, 'now', 'expedition_now_ko.png'),
        (1280, 720, 'd2min', 'expedition_d2min_1280_ko.png'),
        (1920, 1080, 'd2min', 'expedition_d2min_en.png'),
    ]:
        page.set_viewport_size({'width': width, 'height': height})
        page.evaluate('(skin)=>{document.documentElement.dataset.skin=skin; __tutorialQA.tutorial.refresh()}', skin)
        page.wait_for_timeout(100)
        if width == 1920:
            page.locator('.lang-btn').click()
        check(f'{width}: place-name text is the actual anchor', page.locator('.zone:not(.locked) .title > span:last-child.tutorial-target').count() == 1)
        geometry(page, f'first area text {skin} {width}x{height}')
        check(f'{width}: card keeps navigation uncovered', page.evaluate('''() => {
            const c=document.querySelector('.tutorial-card').getBoundingClientRect();
            return c.left >= document.querySelector('.nav').getBoundingClientRect().right-1;
        }'''))
        page.screenshot(path=str(OUT / screenshot))
    before = page.evaluate('JSON.stringify(__tutorialQA.game.resources)')
    page.locator('.zone:not(.locked) .title > span:last-child.tutorial-target').click()
    check('clicking highlighted place name opens actual departure modal', page.evaluate("__tutorialQA.state.modal==='depart'") and active(page) is None)
    check('highlight click spends nothing and starts no expedition', page.evaluate('JSON.stringify(__tutorialQA.game.resources)') == before
          and page.evaluate('!__tutorialQA.game.runs.some(r=>r?.active)'))
    page.keyboard.press('Escape')
    page.evaluate('__tutorialQA.tutorial.refresh()')
    check('closing departure modal restores still-unconfirmed guide', active(page) == 'expedition' and page.evaluate('__tutorialQA.seen().length') == 0)
    check('focused flow has no browser errors', not ERRORS, ERRORS)
    result = {'passed': sum(c['ok'] for c in CHECKS), 'checks': CHECKS, 'errors': ERRORS}
    (OUT / 'first_anchor_results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'passed': result['passed'], 'checks': len(CHECKS), 'errors': ERRORS}))
    context.close()
    browser.close()
