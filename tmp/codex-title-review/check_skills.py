import json
from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path(__file__).parent
results = []
errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    context = browser.new_context(viewport={'width': 1600, 'height': 900})
    context.add_init_script("localStorage.setItem('devAdmin','1')")
    for url in ['https://fonts.googleapis.com/**', 'https://fonts.gstatic.com/**', 'https://cdn.jsdelivr.net/**']:
        context.route(url, lambda r: r.abort())
    page = context.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    for skin, lang, tab in [('d2min', 'ko', 'basic'), ('d2min', 'ko', 'adv'), ('now', 'en', 'basic'), ('now', 'en', 'adv')]:
        page.goto(f'http://127.0.0.1:8865/index.html?dev=box&tab=codex&cx=skill&cxs={tab}&skin={skin}&lang={lang}', wait_until='domcontentloaded')
        page.locator('.ix-skills .ix-head').first.wait_for()
        data = page.locator('.ix-skills').evaluate('''box => ({
            groups: box.querySelectorAll('.ix-group').length,
            skills: box.querySelectorAll('[data-skill]').length,
            metadata: box.querySelectorAll('.ix-dir,.ix-file,.ix-art[title],.ix-head > .muted').length,
            headers: [...box.querySelectorAll('.ix-head')].map(n => ({height: getComputedStyle(n).minHeight, background: getComputedStyle(n).backgroundColor, children: n.children.length})),
            overflow: box.scrollWidth > box.clientWidth + 1
            ,lastGroupVisible: box.querySelector('.ix-group:last-child').getBoundingClientRect().bottom <= box.getBoundingClientRect().bottom + 1
        })''')
        assert data['metadata'] == 0 and data['skills'] > 0 and not data['overflow'], data
        if tab == 'basic': assert data['lastGroupVisible'], data
        assert all(h['children'] == 1 and h['height'] in ['30px', '34px'] for h in data['headers']), data
        page.locator('[data-skill]').first.hover()
        page.locator('.tip-card').first.wait_for(state='visible')
        page.mouse.move(0, 0)
        page.screenshot(path=str(out / f'skills-{skin}-{lang}-{tab}.png'))
        results.append({'skin': skin, 'lang': lang, 'tab': tab, **data})
    browser.close()
assert not errors, errors
print(json.dumps({'results': results, 'errors': errors}, ensure_ascii=False))
