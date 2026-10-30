"""Mission badge browser QA; the app harness is injected into responses only."""
import json
import traceback
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
BASE = 'http://127.0.0.1:8821'
CHECKS = []
ERRORS = []
HARNESS = '''
;globalThis.__missionQA = {
    get game(){ return G; }, get SYS(){ return SYS; }, state, render, notifications, save,
    model: () => SYS.game.notificationState(G, now()),
};
'''


def check(name, condition, detail=None):
    CHECKS.append({'name': name, 'ok': bool(condition), **({'detail': detail} if detail is not None else {})})
    if not condition:
        raise AssertionError(name + (': ' + str(detail) if detail is not None else ''))


def badge(page):
    loc = page.locator('.notification-btn .mail-n')
    return loc.inner_text() if loc.count() else None


def folder_badges(page):
    return page.locator('.notification-folder').evaluate_all("""nodes => Object.fromEntries(nodes.map(n =>
        [n.dataset.folder, n.querySelector('.notification-folder-count')?.textContent ?? null]))""")


def model(page):
    return page.evaluate('__missionQA.model()')


def open_bell(page):
    if not page.locator('.notification-panel').is_visible():
        page.locator('.notification-btn').click()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    regression = None
    failure = None
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='msedge', headless=True)
        context = browser.new_context(viewport={'width': 1600, 'height': 900})
        context.route('https://**', lambda route: route.abort())
        context.route('**/ui/app.js', lambda route: route.fulfill(status=200, content_type='text/javascript',
            body=(ROOT / 'src/ui/app.js').read_text(encoding='utf-8') + HARNESS))
        page = context.new_page()
        page.set_default_timeout(10000)
        page.on('pageerror', lambda error: ERRORS.append(str(error)))
        try:
            page.goto(BASE + '/index.html?dev=newgame&lang=ko&skin=d2min', wait_until='networkidle')
            page.wait_for_selector('.notification-btn')
            check('new game mission contributes one to model and bell', model(page)['count'] == 1 and badge(page) == '1', model(page))
            check('mission badge replaces the former dot', page.locator('.notification-dot').count() == 0)
            check('Korean accessible bell name includes missions', page.locator('.notification-btn').get_attribute('aria-label') == '알림과 미션 · 1건')
            page.locator('.notification-btn').click()
            check('initial folder opens the current mission', page.locator('#notification-folder-missions').get_attribute('aria-selected') == 'true')
            check('each folder counts only its own content', folder_badges(page) == {'notifications': None, 'missions': '1', 'achievements': None}, folder_badges(page))
            check('initial mission points to first expedition', '첫 원정 출발' in page.locator('.notification-guide').inner_text())
            page.screenshot(path=str(OUT / 'mission_only_ko.png'))
            page.locator('.notification-guide-toggle').click()
            page.evaluate('__missionQA.render()')
            check('collapsing and rerendering preserve mission count and focus', badge(page) == '1'
                and page.locator('.notification-guide').count() == 0
                and page.locator('.notification-guide-toggle').evaluate('(n) => document.activeElement === n'))
            page.locator('.notification-guide-toggle').click()
            page.locator('#notification-folder-missions').focus()
            page.keyboard.press('Home')
            check('keyboard Home selects notifications and preserves folder count', page.locator('#notification-folder-notifications').get_attribute('aria-selected') == 'true' and badge(page) == '1')
            page.keyboard.press('ArrowRight')
            check('keyboard ArrowRight selects missions', page.locator('#notification-folder-missions').get_attribute('aria-selected') == 'true')
            page.keyboard.press('Escape')
            check('Escape closes and restores bell focus without consuming mission', not page.locator('.notification-panel').is_visible()
                and page.locator('.notification-btn').evaluate('(n) => document.activeElement === n') and badge(page) == '1')
            open_bell(page)
            page.locator('.notification-guide .notification-go').click()
            check('mission shortcut navigates while retaining mission count', page.evaluate("__missionQA.state.tab === 'expedition'") and badge(page) == '1')

            page.evaluate("""() => { const a=__missionQA; a.game.heroes[0].masteryPoints=1; a.game.heroes[1].masteryPoints=1; a.render(); }""")
            check('two actual mastery notices and one mission total three', len(model(page)['items']) == 2 and model(page)['count'] == 3 and badge(page) == '3', model(page))
            open_bell(page)
            check('mixed folders show notifications two and missions one', folder_badges(page) == {'notifications': '2', 'missions': '1', 'achievements': None}, folder_badges(page))
            page.screenshot(path=str(OUT / 'mixed_missions_ko.png'))
            page.locator('#notification-folder-notifications').click()
            page.screenshot(path=str(OUT / 'mixed_notifications_ko.png'))
            page.locator('.notification-card:not(.empty) .notification-go').first.click()
            check('mastery shortcut selects hero and opens skill window', page.evaluate("__missionQA.state.tab === 'character' && __missionQA.state.modal === 'skill' && __missionQA.state.heroUid === __missionQA.game.heroes[0].uid") and badge(page) == '3')
            page.keyboard.press('Escape')
            open_bell(page)
            check('reopening retains the selected notifications folder', page.locator('#notification-folder-notifications').get_attribute('aria-selected') == 'true')
            before = page.evaluate('JSON.stringify(__missionQA.game)')
            first_id = model(page)['items'][0]['id']
            page.locator('.notification-confirm').first.click()
            check('acknowledgement filters only its notification and retains the mission', badge(page) == '2'
                and folder_badges(page) == {'notifications': '1', 'missions': '1', 'achievements': None}
                and model(page)['count'] == 3, folder_badges(page))
            check('acknowledgement changes no game state', page.evaluate('JSON.stringify(__missionQA.game)') == before)
            check('acknowledgement focuses the next remaining confirm control', page.locator('.notification-confirm').first.evaluate('(n) => document.activeElement === n'))
            dismissed = page.evaluate("JSON.parse(localStorage.getItem('thesevensim.notificationDismissed'))")
            check('acknowledgement is stored by owner identity', first_id in next(iter(dismissed.values())), dismissed)
            page.locator('.notification-confirm').first.click()
            check('acknowledging all notification items leaves mission badge one', badge(page) == '1'
                and folder_badges(page) == {'notifications': None, 'missions': '1', 'achievements': None}
                and len(model(page)['items']) == 2)
            page.evaluate('__missionQA.save()')
            identity = page.evaluate('[__missionQA.game.seed, __missionQA.game.createdAt]')
            page.goto(BASE + '/index.html?tab=expedition&lang=ko&skin=d2min', wait_until='networkidle')
            page.wait_for_selector('.notification-btn')
            check('reload preserves game owner and dismissed items while keeping the mission', identity == page.evaluate('[__missionQA.game.seed, __missionQA.game.createdAt]')
                and badge(page) == '1' and model(page)['count'] == 3)
            open_bell(page)
            check('reloaded folder badges use filtered notifications plus mission', folder_badges(page) == {'notifications': None, 'missions': '1', 'achievements': None})
            page.keyboard.press('Escape')

            page.evaluate("""() => { const a=__missionQA; a.game.counters.battle=1; a.game.resources.gold=1000000; a.render(); }""")
            check('mission transition replaces the step without increasing total', model(page)['guide']['id'] == 'buildShop' and badge(page) == '1')
            open_bell(page)
            page.locator('.notification-guide .notification-go').click()
            check('building mission shortcut selects and highlights its real destination', page.evaluate("__missionQA.state.tab === 'research' && __missionQA.state.cnPick === 'shop'")
                and page.locator('.cn-side.notification-target').count() == 1 and badge(page) == '1')
            page.evaluate("""() => { const a=__missionQA; const r=a.SYS.game.construct(a.game,'shop'); if(!r.ok) throw Error(JSON.stringify(r)); a.render(); }""")
            check('completing first building advances to tavern and retains one mission', model(page)['guide']['id'] == 'buildTavern' and badge(page) == '1')
            page.evaluate("""() => { const a=__missionQA; a.game.commissions.fame=1; a.render(); }""")
            check('ending mission removes only that counted item', model(page)['guide'] is None and model(page)['count'] == 2 and badge(page) is None)
            open_bell(page)
            check('empty missions folder has no count and three empty slots', folder_badges(page) == {'notifications': None, 'missions': None, 'achievements': None}
                and page.locator('.notification-list .empty').count() == 3)
            page.locator('#notification-folder-notifications').click()
            check('fully acknowledged notification folder is also empty', page.locator('.notification-list .empty').count() == 3)
            page.keyboard.press('Escape')
            page.evaluate("""() => { const a=__missionQA; a.game.heroes[2].masteryPoints=1; a.render(); }""")
            check('new notification without mission counts normally', badge(page) == '1' and model(page)['guide'] is None)
            open_bell(page)
            check('notification-only folders show one notification and no mission', folder_badges(page) == {'notifications': '1', 'missions': None, 'achievements': None})
            page.keyboard.press('Escape')
            page.evaluate("""() => { const a=__missionQA; a.game.commissions.fame=0; a.game.counters.battle=0; a.game.buildings.shop=0; a.render(); }""")
            page.locator('.lang-btn').click()
            check('English plural accessible name includes both item types', page.locator('.notification-btn').get_attribute('aria-label') == 'Notifications and missions · 2 items')
            open_bell(page)
            page.locator('#notification-folder-missions').click()
            check('English mission and folder labels are translated', page.locator('#notification-heading').inner_text() == 'Notifications'
                and 'Start your first expedition' in page.locator('.notification-guide').inner_text()
                and 'nt.' not in page.locator('.notification-panel').inner_text())
            page.screenshot(path=str(OUT / 'mixed_missions_en.png'))
            page.locator('#notification-folder-notifications').click()
            page.screenshot(path=str(OUT / 'mixed_notifications_en.png'))
            page.locator('.notification-confirm').click()
            check('English singular accessible name retains current mission', badge(page) == '1'
                and page.locator('.notification-btn').get_attribute('aria-label') == 'Notifications and missions · 1 item')
            page.keyboard.press('Escape')
            for width, height, skin in [(1280, 720, 'now'), (1920, 1080, 'd2min')]:
                page.set_viewport_size({'width': width, 'height': height})
                page.evaluate('(skin) => document.documentElement.dataset.skin=skin', skin)
                open_bell(page)
                rect = page.locator('.notification-panel').bounding_box()
                check(f'notification panel fits viewport {width}x{height} {skin}', rect['x'] >= 0 and rect['y'] >= 0
                    and rect['x'] + rect['width'] <= width + 1 and rect['y'] + rect['height'] <= height + 1, rect)
                page.keyboard.press('Escape')
            check('no app runtime exceptions', not ERRORS, ERRORS)

            isolated = context.new_page()
            isolated.route('**/__notification_harness.html', lambda route: route.fulfill(status=200, content_type='text/html', body='<!doctype html><html><body></body></html>'))
            isolated.goto(BASE + '/__notification_harness.html')
            cap = isolated.evaluate("""async () => {
                const {createNotifications}=await import('/ui/notifications.js');
                const owner={};
                const model={guide:{id:'firstExpedition',tab:'expedition'}, items:Array.from({length:99},(_,i)=>({id:`item:${i}`,kind:'join',tab:'tavern'})),count:100};
                let dismissed=[];
                const n=createNotifications({read:()=>({owner,model}),describe:item=>({title:item.id}),navigate:()=>{},hideTip:()=>{},lockIcon:()=>'',readDismissed:()=>dismissed,writeDismissed:(_,ids)=>{dismissed=ids}});
                document.body.appendChild(n.mount()); n.paint();
                document.querySelector('.notification-btn').click();
                const result={bell:document.querySelector('.notification-btn .mail-n').textContent,
                    label:document.querySelector('.notification-btn').getAttribute('aria-label'),
                    folders:Object.fromEntries([...document.querySelectorAll('.notification-folder')].map(e=>[e.dataset.folder,e.querySelector('.notification-folder-count')?.textContent??null]))};
                document.querySelector('#notification-folder-notifications').click();
                document.querySelector('.notification-confirm').click();
                result.after=document.querySelector('.notification-btn .mail-n').textContent;
                result.raw=model.count;
                return result;
            }""")
            check('99+ cap includes mission while folder counts remain exact', cap['bell'] == '99+' and cap['folders'] == {'notifications': '99', 'missions': '1', 'achievements': None}, cap)
            check('acknowledging one of 100 total transitions cap to exact 99', cap['after'] == '99' and cap['raw'] == 100, cap)
            isolated.close()
        except Exception:
            failure = traceback.format_exc()
            page.screenshot(path=str(OUT / 'failure.png'))
        finally:
            # Run the full regression suite exactly once, even if UI QA fails.
            test_context = browser.new_context()
            test_page = test_context.new_page()
            test_errors = []
            test_page.on('pageerror', lambda error: test_errors.append(str(error)))
            try:
                test_page.goto(BASE + '/dev/test.html', wait_until='domcontentloaded')
                test_page.wait_for_function('/PASS|FAIL/.test(document.title)', timeout=180000)
                regression = {'title': test_page.title(), 'failures': test_page.locator('#out li.fail').all_text_contents(),
                    'errors': test_errors, 'notification_checks': test_page.locator('#out li').filter(has_text='notification:').all_text_contents()}
            except Exception:
                regression = {'error': traceback.format_exc(), 'errors': test_errors, 'title': test_page.title()}
            (OUT / 'regression.json').write_text(json.dumps(regression, ensure_ascii=False, indent=2), encoding='utf-8')
            result = {'passed': sum(c['ok'] for c in CHECKS), 'checks': CHECKS, 'errors': ERRORS, 'failure': failure, 'regression': regression}
            (OUT / 'ui_results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
            print(json.dumps(result, ensure_ascii=True), flush=True)
            browser.close()
    if failure or any(not c['ok'] for c in CHECKS):
        raise SystemExit(1)


if __name__ == '__main__':
    main()
