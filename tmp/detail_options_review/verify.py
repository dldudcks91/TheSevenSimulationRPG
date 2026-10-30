import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
BASE = 'http://127.0.0.1:8841'
SUITE_ONLY = '--suite-only' in sys.argv
REPORT = OUT / ('verification_suite.json' if SUITE_ONLY else 'verification.json')


def read_panels(page, selectors):
    return [page.locator(selector).locator('[data-stat]').evaluate_all(
        'nodes => nodes.map(n => n.dataset.stat)') for selector in selectors]


def check_panels(name, panels):
    assert list(map(len, panels)) == [17, 16], (name, panels)
    assert 'debuff_dur_reduction' not in panels[0], (name, panels)
    assert panels[1].count('debuff_dur_reduction') == 1, (name, panels)
    assert panels[1].index('debuff_dur_reduction') == panels[1].index('fx_buff_dur') + 1
    assert all('item_find' not in panel for panel in panels), (name, panels)


with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    context = browser.new_context(viewport={'width': 1600, 'height': 1000})
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE + '/dev/test.html')
    page.wait_for_function('/PASS|FAIL/.test(document.title)', timeout=240000)
    assertions = page.locator('#out li').evaluate_all(
        'nodes => nodes.map(n => ({ok: !n.classList.contains("fail"), text: n.textContent}))')
    result = {'title': page.title(), 'assertions': assertions, 'failures': [a['text'] for a in assertions if not a['ok']], 'ui': [], 'errors': errors}
    REPORT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'title': result['title'], 'failures': result['failures'], 'errors': errors}, ensure_ascii=False), flush=True)
    for language in ([] if SUITE_ONLY else ['ko', 'en']):
        for name, url, selectors in [
            ('character', '?dev=newgame&tab=character', ['.cs-scroll[data-sheet="0"]', '.cs-scroll[data-sheet="1"]']),
            ('hero_alt', '?dev=tip&t=hero&alt=1', ['#tooltip .tip-unit-col.d1', '#tooltip .tip-unit-col.d2']),
            ('monster_alt', '?dev=play&tip=e&alt=1', ['#tooltip .tip-unit-col.d1', '#tooltip .tip-unit-col.d2']),
        ]:
            page.goto(BASE + '/index.html' + url + '&lang=' + language)
            page.wait_for_selector(selectors[1], timeout=60000)
            panels = read_panels(page, selectors)
            check_panels(name + '_' + language, panels)
            page.screenshot(path=str(OUT / f'{name}_{language}.png'))
            result['ui'].append({'name': name + '_' + language, 'ok': True, 'panels': panels})
            print(name + '_' + language + ': PASS', flush=True)
    REPORT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    browser.close()
    assert not result['failures'], result['failures']
    assert not errors, errors
