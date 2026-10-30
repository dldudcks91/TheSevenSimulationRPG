"""Exercise the real notification UI in isolated Edge contexts; instrumentation is response-only."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
BASE = 'http://127.0.0.1:8797'
checks = []
errors = []

def check(name, condition):
    if not condition:
        raise AssertionError(name)
    checks.append(name)

def instrument(route):
    response = route.fetch()
    route.fulfill(response=response, body=response.text() + '\n;globalThis.__notificationTest = { get game(){return G}, get SYS(){return SYS}, state, render, notifications };')

with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='msedge', headless=True)
    context = browser.new_context(viewport={'width': 1600, 'height': 800})
    context.route('**/ui/app.js', instrument)
    context.route('https://**', lambda route: route.abort())
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE + '/index.html?dev=newgame&lang=ko&skin=d2min', wait_until='networkidle')
    page.wait_for_selector('.notification-btn')
    check('mail and bell are adjacent independent buttons', page.evaluate("""() => {
        const mail = document.querySelector('.mail-btn:not(.notification-btn)');
        return mail.nextElementSibling.classList.contains('notification-slot');
    }"""))
    check('beginner guide dot is not a pending reward count', page.locator('.notification-dot').count() == 1 and page.locator('.notification-btn .mail-n').count() == 0)
    page.locator('.notification-btn').click()
    check('first expedition guide is visible', page.locator('.notification-guide').inner_text().find('첫 원정 출발') >= 0)
    page.locator('.notification-guide-toggle').click()
    page.evaluate('() => __notificationTest.render()')
    check('full rerender preserves open menu keyboard focus', page.locator('.notification-guide-toggle').evaluate('(n) => document.activeElement === n'))
    check('guide collapses', page.locator('.notification-guide').count() == 0)
    page.locator('.notification-guide-toggle').click()
    page.screenshot(path=str(OUT / 'beginner_ko.png'))
    page.keyboard.press('Escape')
    check('Escape closes menu and restores bell focus', not page.locator('.notification-panel').is_visible() and page.locator('.notification-btn').evaluate('(n) => document.activeElement === n'))
    page.locator('.mail-btn:not(.notification-btn)').click()
    check('mail still opens the separate gift mailbox', page.locator('.mail-modal').is_visible())
    page.keyboard.press('Escape')
    page.evaluate("""() => {
        const a = __notificationTest, g = a.game;
        g.counters.battle = 1; g.buildings.shop = 1; g.buildings.tavern = 1;
        a.SYS.game.commissionFill(g);
        a.SYS.game.commissionTake(g, g.commissions.cards[0].no);
        a.render();
    }""")
    page.locator('.notification-btn').click()
    check('active commission guide advances to expedition', '원정을 진행해 의뢰 목표 달성' in page.locator('.notification-guide').inner_text())
    page.keyboard.press('Escape')
    page.evaluate("""() => {
        const a = __notificationTest, card = a.game.commissions.cards.find(c => c.have !== undefined);
        card.have = card.need; a.notifications.refresh();
    }""")
    check('commission goal completion updates badge', page.locator('.notification-btn .mail-n').inner_text() == '1')
    check('completion bubble is anchored at bell', '의뢰 목표 달성' in page.locator('.notification-bubble').inner_text())
    page.locator('.notification-btn').click()
    check('opening the menu preserves pending count', page.locator('.notification-btn .mail-n').inner_text() == '1')
    check('completed commission has target details', len(page.locator('.notification-card .notification-detail').inner_text()) > 0)
    page.screenshot(path=str(OUT / 'commission_ko.png'))
    page.locator('.notification-card .notification-go').click()
    check('commission navigation selects tavern and highlights exact card', page.locator('.cm-card.notification-target').count() == 1 and page.locator('.nav button.on').inner_text().strip() == '선술집')
    page.locator('.cm-card.notification-target .cm-go').click()
    check('claim removes the pending badge and finishes beginner guide', page.locator('.notification-btn .mail-n').count() == 0 and page.locator('.notification-dot').count() == 0)
    page.locator('.notification-btn').click()
    check('empty notification list after reward claim', '대기 중인 알림 없음' in page.locator('.notification-empty').inner_text())
    page.locator('.main').click(position={'x': 10, 'y': 10})
    check('outside click closes menu', not page.locator('.notification-panel').is_visible())

    page.locator('.lang-btn').click()
    page.locator('.notification-btn').click()
    check('English menu labels', page.locator('#notification-heading').inner_text() == 'Notifications')
    check('no translation keys leaked into menu', 'nt.' not in page.locator('.notification-panel').inner_text())
    page.keyboard.press('Escape')
    page.screenshot(path=str(OUT / 'topbar_en.png'))

    for width, height, skin in [(1280, 720, 'now'), (1920, 1080, 'd2min')]:
        page.set_viewport_size({'width': width, 'height': height})
        page.evaluate('(skin) => document.documentElement.dataset.skin = skin', skin)
        page.locator('.notification-btn').click()
        rect = page.locator('.notification-panel').bounding_box()
        check(f'menu fits viewport {width}x{height}', rect['x'] >= 0 and rect['y'] >= 0 and rect['x'] + rect['width'] <= width + 1 and rect['y'] + rect['height'] <= height + 1)
        page.keyboard.press('Escape')

    # A new game owner and initially pending tasks produce no burst of historical bubbles.
    page.goto(BASE + '/index.html?dev=explore&lang=ko&skin=d2min', wait_until='networkidle')
    check('ready exploration appears on first load without a popup burst', page.locator('.notification-btn .mail-n').count() == 1 and page.locator('.notification-bubble').count() == 0)
    page.locator('.notification-btn').click()
    explore = page.locator('.notification-card').filter(has_text='탐험 완료')
    check('exploration notification includes destination', explore.locator('.notification-detail').inner_text() != '')
    explore.locator('.notification-go').click()
    check('exploration navigation selects completed destination', page.evaluate("() => __notificationTest.state.tab === 'explore' && __notificationTest.state.exSel.chapter === 1 && __notificationTest.state.exSel.spot === 'cave'"))
    page.screenshot(path=str(OUT / 'exploration_ko.png'))

    page.goto(BASE + '/index.html?dev=join&lang=ko&skin=d2min', wait_until='networkidle')
    page.locator('.notification-btn').click()
    check('arriving heroes appear with names', page.locator('.notification-card').filter(has_text='가입 희망 영웅 도착').count() > 0)
    join = page.locator('.notification-card').filter(has_text='가입 희망 영웅 도착').first
    check('arriving hero detail resolves without exception', len(join.locator('.notification-detail').inner_text()) > 0)
    join.locator('.notification-go').click()
    check('hero navigation opens actual candidate card', page.locator('.tv-join-card').count() == 1)
    check('hero navigation focuses that candidate rather than another hire', page.locator('.tv-join-card').evaluate('(n) => n.contains(document.activeElement)'))

    # Check native installed assets after the asset task completes.
    broken = page.locator('.resources img').evaluate_all('(nodes) => nodes.filter(n => !n.complete || n.naturalWidth === 0).map(n => n.src)')
    check('topbar artwork loads', not broken)
    check('no browser runtime exceptions', not errors)
    (OUT / 'ui_results.json').write_text(json.dumps({'passed': len(checks), 'checks': checks, 'errors': errors}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'passed': len(checks), 'errors': errors}, ensure_ascii=False))
    context.close()
    browser.close()
