"""Validate notification folders in the real browser without changing the user's saved games."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
checks, errors = [], []

def check(name, value):
    if not value:
        raise AssertionError(name)
    checks.append(name)

def instrument(route):
    response = route.fetch()
    route.fulfill(response=response, body=response.text() + '\n;globalThis.__folderTest = { get game(){return G}, get SYS(){return SYS}, state, render, notifications };')

with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='msedge', headless=True)
    for skin in ['now', 'd2min']:
        context = browser.new_context(viewport={'width': 1600, 'height': 800})
        context.route('https://**', lambda route: route.abort())
        context.route('**/ui/app.js', instrument)
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(f'http://127.0.0.1:8801/index.html?dev=newgame&lang=ko&skin={skin}', wait_until='networkidle')
        page.wait_for_selector('.notification-btn')
        page.locator('.notification-btn').click()
        tabs = page.locator('.notification-folder')
        check(f'{skin}: three visible folders', tabs.count() == 3 and tabs.all_inner_texts() == ['알림', '미션', '업적'])
        check(f'{skin}: beginner starts in Missions', page.locator('[role=tab][aria-selected=true]').get_attribute('data-folder') == 'missions')
        check(f'{skin}: Missions contains next action', '첫 원정 출발' in page.locator('.notification-guide').inner_text())
        locked = page.locator('[data-folder=achievements][role=tab]')
        check(f'{skin}: achievements locked with game padlock', locked.is_disabled() and locked.get_attribute('aria-disabled') == 'true' and locked.locator('svg.rs-pin-ico').count() == 1)
        locked.dispatch_event('click')
        check(f'{skin}: locked folder cannot open', page.locator('[role=tab][aria-selected=true]').get_attribute('data-folder') == 'missions')
        check(f'{skin}: all folder targets exist', tabs.evaluate_all('(tabs)=>tabs.every(t=>!!document.getElementById(t.getAttribute("aria-controls")))'))
        page.screenshot(path=str(OUT / f'{skin}_missions_ko.png'))
        locked.hover()
        page.wait_for_selector('#tooltip.show')
        page.keyboard.press('Escape')
        check(f'{skin}: closing menu clears locked-folder tooltip', page.locator('#tooltip.show').count() == 0)
        page.locator('.notification-btn').click()
        page.locator('[data-folder=notifications][role=tab]').click()
        check(f'{skin}: Notifications contains no beginner guide', page.locator('.notification-guide').count() == 0 and page.locator('.notification-empty').inner_text() == '대기 중인 알림 없음')
        page.keyboard.press('ArrowRight')
        check(f'{skin}: keyboard switches to Missions', page.locator('[role=tab][aria-selected=true]').get_attribute('data-folder') == 'missions')
        page.keyboard.press('ArrowRight')
        check(f'{skin}: keyboard skips locked Achievements', page.locator('[role=tab][aria-selected=true]').get_attribute('data-folder') == 'notifications')
        page.evaluate('() => __folderTest.render()')
        check(f'{skin}: rerender preserves tab focus and selection', page.locator('[data-folder=notifications][role=tab]').evaluate('(n)=>document.activeElement===n && n.getAttribute("aria-selected")==="true"'))
        page.keyboard.press('Escape')
        page.locator('.notification-btn').click()
        check(f'{skin}: reopening remembers selected folder', page.locator('[role=tab][aria-selected=true]').get_attribute('data-folder') == 'notifications')
        page.keyboard.press('Escape')

        page.evaluate("""() => {
            const a=__folderTest,g=a.game;
            g.counters.battle=1;g.buildings.shop=1;g.buildings.tavern=1;
            a.SYS.game.commissionFill(g);
            a.SYS.game.commissionTake(g,g.commissions.cards[0].no);
            a.render();
            const card=g.commissions.cards.find(c=>c.have!==undefined);
            card.have=card.need;a.notifications.refresh();
        }""")
        page.locator('.notification-btn').click()
        check(f'{skin}: ready commission appears in Notifications', '의뢰 목표 달성' in page.locator('.notification-list').inner_text())
        check(f'{skin}: ready count appears on folder', page.locator('.notification-folder-count').inner_text() == '1')
        page.screenshot(path=str(OUT / f'{skin}_notifications_ko.png'))
        page.locator('.notification-card .notification-go').click()
        check(f'{skin}: notification still navigates to exact commission', page.locator('.cm-card.notification-target').count() == 1)
        page.locator('.cm-card.notification-target .cm-go').click()
        page.locator('.notification-btn').click()
        check(f'{skin}: claim clears both badge counts', page.locator('.notification-btn .mail-n').count() == 0 and page.locator('.notification-folder-count').count() == 0)
        page.locator('[data-folder=missions][role=tab]').click()
        check(f'{skin}: finished beginner mission has empty state', page.locator('.notification-empty').inner_text() == '진행 중인 미션 없음')

        # Long pending lists must remember their own scroll when switching folders and repainting.
        page.evaluate("""() => {
            const a=__folderTest, base=a.SYS.game.notificationState;
            a.SYS.game.notificationState=(g,at)=>{
                const model=base(g,at);
                return {...model,count:24,items:Array.from({length:24},(_,i)=>({id:`join:test:${i}`,kind:'join',tab:'tavern',target:{join:999+i}}))};
            };
            a.notifications.refresh();
        }""")
        page.locator('[data-folder=notifications][role=tab]').click()
        page.locator('.notification-list').evaluate('(n)=>n.scrollTop=180')
        page.locator('[data-folder=missions][role=tab]').click()
        check(f'{skin}: Missions does not inherit notification scroll', page.locator('.notification-list').evaluate('(n)=>n.scrollTop') == 0)
        page.locator('[data-folder=notifications][role=tab]').click()
        check(f'{skin}: Notifications restores its own scroll', page.locator('.notification-list').evaluate('(n)=>n.scrollTop') == 180)
        page.evaluate('() => __folderTest.render()')
        check(f'{skin}: full rerender preserves folder scroll', page.locator('.notification-list').evaluate('(n)=>n.scrollTop') == 180)
        page.keyboard.press('Escape')
        page.locator('.notification-btn').click()
        check(f'{skin}: close and reopen preserve folder scroll', page.locator('.notification-list').evaluate('(n)=>n.scrollTop') == 180)
        page.keyboard.press('Escape')
        page.locator('.lang-btn').click()
        page.locator('.notification-btn').click()
        check(f'{skin}: English folders localized', [page.locator(f'[data-folder={folder}][role=tab] .notification-folder-label').inner_text() for folder in ['notifications','missions','achievements']] == ['Notifications','Missions','Achievements'])
        check(f'{skin}: English folder strip stays inside popup', page.locator('.notification-folders').evaluate('(n)=>n.scrollWidth<=n.clientWidth'))
        page.screenshot(path=str(OUT / f'{skin}_folders_en.png'))
        page.set_viewport_size({'width': 1280, 'height': 720})
        rect=page.locator('.notification-panel').bounding_box()
        check(f'{skin}: folder popup fits small viewport',rect['x']>=0 and rect['y']>=0 and rect['x']+rect['width']<=1281 and rect['y']+rect['height']<=721)
        check(f'{skin}: icon size and transparent hover preserved', page.locator('.notification-btn').evaluate('(n)=>{const s=getComputedStyle(n);return s.backgroundColor==="rgba(0, 0, 0, 0)"&&s.borderWidth==="0px"&&s.padding==="4px"}'))
        page.goto(f'http://127.0.0.1:8801/index.html?dev=newgame&lang=ko&skin={skin}', wait_until='networkidle')
        page.evaluate('() => {__folderTest.game.commissions.fame=1;__folderTest.render()}')
        page.locator('.notification-btn').click()
        check(f'{skin}: first actual opening uses current tutorial status', page.locator('[role=tab][aria-selected=true]').get_attribute('data-folder') == 'notifications')
        context.close()
    check('no runtime exceptions', not errors)
    browser.close()
    (OUT / 'results.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors},ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'passed':len(checks),'errors':errors},ensure_ascii=False))
