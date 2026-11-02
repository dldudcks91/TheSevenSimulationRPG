import json
import socket
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tmp/refresh_review'
OUT.mkdir(parents=True, exist_ok=True)
PORT = 8841
HARNESS = r'''
globalThis.__refreshReview = {
    setup(tab) {
        for (const b of SYS.construction.list) G.buildings[b.id] = b.maxRank;
        G.resources.gold = 0;
        G.tavern = {rerolledAt:null,hired:[]}; G.shop = null;
        G.heroes[0].level = 17;
        state.heroUid = G.heroes[0].uid;
        state.screen = 'game'; state.tab = tab; state.modal = null;
        writeTutorialSeen(tutorialOwner(), ['expedition','loot','mastery','potions','construction']);
        tutorial.reset(); render();
        return this.snapshot(tab);
    },
    snapshot(tab) {
        return {gold:G.resources.gold, counter:G.counters[tab],
            pane:tab === 'tavern' ? G.tavern : G.shop};
    },
    nearEnd(tab) {
        G[tab].rerolledAt = now() - 3600000 + 1800;
        render();
    },
    help(lang) {
        setLang(lang); state.tab='help'; render();
        return document.querySelector('main')?.textContent ?? document.body.textContent;
    }
};
'''

result = {'ui': [], 'errors': []}
with socket.socket() as probe:
    probe.bind(('127.0.0.1', PORT))
with (OUT / 'server.log').open('w', encoding='utf-8') as log:
    server = subprocess.Popen([sys.executable, str(ROOT / 'serve.py'), str(PORT)], cwd=ROOT,
        stdout=log, stderr=log, creationflags=subprocess.CREATE_NO_WINDOW)
    try:
        for _ in range(40):
            try:
                with socket.create_connection(('127.0.0.1', PORT), timeout=.2):
                    break
            except OSError:
                time.sleep(.1)
        with sync_playwright() as pw:
            browser = pw.chromium.launch(channel='msedge', headless=True)
            page = browser.new_page()
            page.on('pageerror', lambda e: result['errors'].append(str(e)))
            page.goto(f'http://127.0.0.1:{PORT}/dev/test.html')
            page.wait_for_function('/PASS|FAIL/.test(document.title)', timeout=240000)
            result['title'] = page.title()
            result['failures'] = page.locator('#out li.fail').all_text_contents()
            print(json.dumps({'title':result['title'], 'failures':result['failures']}, ensure_ascii=True), flush=True)
            page.close()
            for skin, lang in [('d2min','ko'),('now','en')]:
                context = browser.new_context(viewport={'width':1600,'height':1000})
                context.route('https://**', lambda route: route.abort())
                context.route('**/ui/app.js', lambda route: route.fulfill(status=200,
                    content_type='text/javascript', body=(ROOT / 'src/ui/app.js').read_text(encoding='utf-8') + HARNESS))
                page = context.new_page()
                page.on('pageerror', lambda e: result['errors'].append(str(e)))
                page.goto(f'http://127.0.0.1:{PORT}/index.html?dev=newgame&lang={lang}&skin={skin}')
                page.wait_for_function('globalThis.__refreshReview && document.title', timeout=60000)
                for tab, selector in [('tavern','.tv-tools button'),('shop','.td-roll button')]:
                    before = page.evaluate('(tab) => __refreshReview.setup(tab)', tab)
                    button = page.locator(selector)
                    assert button.is_enabled(), f'{skin}/{tab}: free refresh disabled at zero gold'
                    label = button.inner_text()
                    assert '600' not in label and 'gold' not in label and '골드' not in label, label
                    button.click()
                    after = page.evaluate('(tab) => __refreshReview.snapshot(tab)', tab)
                    assert after['gold'] == before['gold'] == 0, f'{tab}: charged gold'
                    assert after['counter'] == before['counter'] + 1, f'{tab}: list counter'
                    assert page.locator(selector).is_disabled(), f'{tab}: cooldown not disabled'
                    wait = page.locator('.tv-tools .tv-wait' if tab == 'tavern' else '.td-roll .tv-wait').inner_text()
                    assert ('교체까지' if lang == 'ko' else 'Refresh in') in wait, wait
                    if tab == 'shop':
                        assert after['pane']['level'] == 17, 'Selected hero level'
                    page.screenshot(path=str(OUT / f'{skin}_{lang}_{tab}_cooldown.png'))
                    page.evaluate('(tab) => __refreshReview.nearEnd(tab)', tab)
                    assert page.locator(selector).is_disabled(), 'cooldown boundary before expiry'
                    page.wait_for_function('(selector) => !document.querySelector(selector).disabled', arg=selector, timeout=10000)
                    page.locator(selector).click()
                    assert page.locator(selector).is_disabled(), 'new cooldown after expiry'
                    result['ui'].append({'skin':skin,'lang':lang,'tab':tab,'label':label,'wait':wait,'ok':True})
                help_text = page.evaluate('(lang) => __refreshReview.help(lang)', lang)
                assert 'undefined' not in help_text and '{reroll}' not in help_text, 'help placeholder'
                assert ('교체는 항상 무료' if lang == 'ko' else 'Refreshing is always free') in help_text, 'help text'
                context.close()
            browser.close()
    finally:
        server.terminate()
        server.wait(timeout=10)
(OUT / 'verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(result, ensure_ascii=True), flush=True)
if result['failures'] or result['errors'] or not result['title'].startswith('PASS'):
    raise SystemExit(1)
