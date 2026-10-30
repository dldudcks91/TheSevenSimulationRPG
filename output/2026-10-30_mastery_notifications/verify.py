"""Check mastery notifications in isolated browser contexts; no player saves are loaded."""
import functools
import json
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
checks, errors = [], []


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def check(name, value):
    if not value:
        raise AssertionError(name)
    checks.append(name)


def instrument(route):
    response = route.fetch()
    route.fulfill(response=response, body=response.text() + '''
        ;globalThis.__masteryTest = {
            get game(){return G}, get SYS(){return SYS}, D, state, render, notifications,
            save, now, continueGame,
            level(uid) {
                const h=heroById(uid);
                SYS.hero.grantXp(h, SYS.hero.xpNeeded(h.level)-h.xp);
                notifications.refresh();
            },
        };
    ''')


server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT / 'src')))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}'
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='msedge', headless=True)
        regression_page = browser.new_page()
        regression_page.on('pageerror', lambda error: errors.append(str(error)))
        regression_page.goto(base + '/dev/test.html', wait_until='domcontentloaded')
        regression_page.wait_for_function('/^(PASS|FAIL)/.test(document.title)', timeout=120000)
        regression = {'title': regression_page.title(), 'failures': regression_page.locator('li.fail').all_inner_texts()}
        print(json.dumps(regression, ensure_ascii=False), flush=True)
        regression_page.close()
        baseline = None
        if regression['failures']:
            # Remove only this feature in browser responses to identify existing failures.
            baseline_context = browser.new_context()
            def baseline_source(route):
                response = route.fetch()
                source = response.text()
                if route.request.url.endswith('/game_logic/state.js'):
                    start = source.index('        for (const h of state.heroes) {\n            if (!(h.masteryPoints > 0)) continue;')
                    end = source.index('\n\n        let guide = null;', start)
                else:
                    start = source.index("check('notification: 레벨업 마스터리")
                    end = source.index('/** 재도전 안내 fixture', start)
                route.fulfill(response=response, body=source[:start] + source[end:])
            baseline_context.route('**/game_logic/state.js', baseline_source)
            baseline_context.route('**/dev/test.js', baseline_source)
            baseline_page = baseline_context.new_page()
            baseline_page.goto(base + '/dev/test.html', wait_until='domcontentloaded')
            baseline_page.wait_for_function('/^(PASS|FAIL)/.test(document.title)', timeout=120000)
            baseline = {'title': baseline_page.title(), 'failures': baseline_page.locator('li.fail').all_inner_texts()}
            check('existing regression failures are unchanged without mastery notifications', baseline['failures'] == regression['failures'])
            print(json.dumps({'baseline': baseline}, ensure_ascii=False), flush=True)
            baseline_context.close()

        for skin in ['now', 'd2min']:
            for lang in ['ko', 'en']:
                label = f'{skin}/{lang}'
                context = browser.new_context(viewport={'width': 1600, 'height': 900})
                context.route('https://**', lambda route: route.abort())
                context.route('**/ui/app.js', instrument)
                page = context.new_page()
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(base + f'/index.html?dev=newgame&lang={lang}&skin={skin}', wait_until='networkidle')
                page.wait_for_selector('.notification-btn')
                check(label + ': no mastery alert for new party', page.locator('[data-notification-action^="mastery:"]').count() == 0)
                hero = page.evaluate('''() => {
                    const a=__masteryTest, h=a.game.heroes[1];
                    a.game.commissions.fame=1; a.render();
                    a.level(h.uid);
                    return {uid:h.uid, name:h.name, level:h.level, points:h.masteryPoints};
                }''')
                check(label + ': level-up bubble', page.locator('.notification-bubble').inner_text() == ('마스터리 포인트 사용 가능' if lang == 'ko' else 'Mastery points available'))
                check(label + ': badge counts hero', page.locator('.notification-btn .mail-n').inner_text() == '1')
                page.locator('.notification-btn').click()
                card = page.locator('.notification-card').filter(has=page.locator('[data-notification-action^="mastery:"]'))
                check(label + ': localized hero, level and point count', hero['name'][lang] in card.inner_text() and 'Lv.2' in card.inner_text() and ('1포인트' if lang == 'ko' else '1 point available') in card.inner_text())
                page.screenshot(path=str(OUT / f'{skin}_{lang}.png'))
                card.locator('.notification-go').click()
                check(label + ': shortcut selects exact hero and skill window', page.evaluate('(uid) => __masteryTest.state.tab==="character" && __masteryTest.state.heroUid===uid && __masteryTest.state.modal==="skill"', hero['uid']) and page.locator('.c-skill').is_visible())
                check(label + ': shortcut keeps alert', page.locator('.notification-btn .mail-n').inner_text() == '1')
                node = page.evaluate('''() => {
                    const a=__masteryTest;
                    return a.SYS.game.masteryState(a.game,a.state.heroUid).nodes.find(n=>n.canLearn).id;
                }''')
                page.locator(f'.c-skill [data-node="{node}"]').click()
                check(label + ': spending last point removes alert and badge', page.locator('.notification-btn .mail-n').count() == 0 and page.evaluate('(uid)=>__masteryTest.game.heroes.find(h=>h.uid===uid).masteryPoints===0', hero['uid']))
                page.keyboard.press('Escape')

                page.evaluate('(uid)=>__masteryTest.level(uid)', hero['uid'])
                page.locator('.notification-btn').click()
                card = page.locator('.notification-card').filter(has=page.locator('[data-notification-action^="mastery:"]'))
                first_id = card.locator('.notification-go').get_attribute('data-notification-action')
                card.locator('.notification-confirm').click()
                check(label + ': confirmation only dismisses alert', page.locator('.notification-btn .mail-n').count() == 0 and page.evaluate('(uid)=>__masteryTest.game.heroes.find(h=>h.uid===uid).masteryPoints===1 && __masteryTest.state.modal===null', hero['uid']))
                # Save this isolated context, then load the same game without the dev reset.
                page.evaluate('()=>__masteryTest.save()')
                page.goto(base + f'/index.html?lang={lang}&skin={skin}', wait_until='networkidle')
                page.evaluate('''() => {const a=__masteryTest; if(!a.continueGame()) throw new Error('Saved test game missing'); a.render();}''')
                check(label + ': reload remembers confirmation', page.locator('.notification-btn .mail-n').count() == 0)
                page.evaluate('(uid)=>__masteryTest.level(uid)', hero['uid'])
                check(label + ': next level notifies again', page.locator('.notification-btn .mail-n').inner_text() == '1' and page.locator('.notification-bubble').count() == 1)
                page.locator('.notification-btn').click()
                card = page.locator('.notification-card').filter(has=page.locator('[data-notification-action^="mastery:"]'))
                check(label + ': new level has a new ID and plural points', card.locator('.notification-go').get_attribute('data-notification-action') != first_id and ('2포인트' if lang == 'ko' else '2 points available') in card.inner_text())
                # Simulate a point allocation between painting and clicking the old shortcut.
                page.evaluate('''(uid) => {
                    const a=__masteryTest,h=a.game.heroes.find(h=>h.uid===uid);
                    h.masteryPoints=0;
                }''', hero['uid'])
                card.locator('.notification-go').click()
                check(label + ': stale shortcut refreshes without opening a window', page.evaluate('()=>__masteryTest.state.modal===null') and page.locator('.notification-btn .mail-n').count() == 0)
                context.close()
                print(label + ': browser checks passed', flush=True)
        check('no browser exceptions', not errors)
        browser.close()
        result = {'regression': regression, 'baseline': baseline, 'passed': len(checks), 'checks': checks, 'errors': errors}
        (OUT / 'results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps({'regression': regression['title'], 'browser_checks': len(checks), 'errors': errors}), flush=True)
        if regression['failures'] and (not baseline or baseline['failures'] != regression['failures']):
            raise AssertionError('Game regression failures: ' + regression['title'])
finally:
    server.shutdown()
    server.server_close()
