"""Check fixed-size notification lists and independent shortcut/acknowledgement actions."""
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
    route.fulfill(response=response, body=response.text() + '\n;globalThis.__actionTest={get game(){return G},get SYS(){return SYS},state,render,notifications,save};')

with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='msedge', headless=True, ignore_default_args=['--hide-scrollbars'])
    for skin in ['now', 'd2min']:
        context = browser.new_context(viewport={'width':1600,'height':800})
        context.route('https://**',lambda route:route.abort())
        context.route('**/ui/app.js',instrument)
        page=context.new_page()
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(f'http://127.0.0.1:8802/index.html?dev=newgame&lang=ko&skin={skin}',wait_until='networkidle')
        page.wait_for_selector('.notification-btn')
        page.locator('.notification-btn').click()
        mission_height=page.locator('.notification-list').evaluate('(n)=>n.clientHeight')
        page.locator('[role=tab][data-folder=notifications]').click()
        body_height=page.locator('.notification-list').evaluate('(n)=>n.clientHeight')
        check(f'{skin}: empty body has fixed three-row height',body_height==240 and mission_height==body_height)
        check(f'{skin}: pending heading removed','확인할 일' not in page.locator('.notification-panel').inner_text() and page.locator('.notification-section').count()==0)
        check(f'{skin}: visible scrollbar is scoped to list',page.locator('.notification-list').evaluate('(n)=>getComputedStyle(n).scrollbarWidth!=="none" && n.offsetWidth>n.clientWidth') and page.locator('.main').evaluate('(n)=>getComputedStyle(n).scrollbarWidth==="none"'))
        page.keyboard.press('Escape')
        page.evaluate("""() => {
            const a=__actionTest,g=a.game;
            g.counters.battle=1;g.buildings.shop=1;g.buildings.tavern=1;
            a.SYS.game.commissionFill(g);a.SYS.game.commissionTake(g,g.commissions.cards[0].no);
            const card=g.commissions.cards.find(c=>c.have!==undefined);card.have=card.need;
            a.save();a.render();
        }""")
        page.locator('.notification-btn').click()
        check(f'{skin}: single row keeps body height',page.locator('.notification-list').evaluate('(n)=>n.clientHeight')==body_height)
        check(f'{skin}: separate actions in requested order',page.locator('.notification-actions button').all_inner_texts()==['바로가기','확인'])
        check(f'{skin}: shortcut is left of confirmation',page.locator('.notification-go').bounding_box()['x']<page.locator('.notification-confirm').bounding_box()['x'])
        page.screenshot(path=str(OUT/f'{skin}_one.png'))
        page.locator('.notification-go').click()
        check(f'{skin}: shortcut navigates to exact source',page.locator('.cm-card.notification-target').count()==1)
        check(f'{skin}: shortcut keeps notification unread',page.locator('.notification-btn .mail-n').inner_text()=='1')
        page.locator('.notification-btn').click()
        before=page.evaluate('() => ({game:JSON.stringify(__actionTest.game),tab:__actionTest.state.tab})')
        page.locator('.notification-confirm').click()
        check(f'{skin}: confirm removes item and both badges',page.locator('.notification-card').count()==0 and page.locator('.notification-btn .mail-n').count()==0 and page.locator('.notification-folder-count').count()==0)
        check(f'{skin}: confirmation does not navigate or mutate game',page.evaluate('() => ({game:JSON.stringify(__actionTest.game),tab:__actionTest.state.tab})')==before)
        check(f'{skin}: actual commission remains claimable',page.locator('.cm-card.done .cm-go').count()==1)
        page.evaluate('() => {__actionTest.notifications.refresh();__actionTest.render()}')
        check(f'{skin}: refreshed source does not recreate dismissed notification',page.locator('.notification-card').count()==0 and page.locator('.notification-btn .mail-n').count()==0)
        page.keyboard.press('Escape')
        page.goto(f'http://127.0.0.1:8802/index.html?tab=tavern&skin={skin}&lang=ko',wait_until='networkidle')
        page.locator('.notification-btn').click()
        check(f'{skin}: acknowledgement persists across reload',page.locator('.notification-card').count()==0 and page.locator('.notification-btn .mail-n').count()==0)
        check(f'{skin}: reload preserves actual reward',page.locator('.cm-card.done .cm-go').count()==1)
        page.evaluate("""() => {
            const a=__actionTest,base=a.SYS.game.notificationState;
            a.SYS.game.notificationState=(g,at)=>({...base(g,at),items:Array.from({length:20},(_,i)=>({id:`join:scroll:${i}`,kind:'join',tab:'tavern',target:{join:1000+i}})),count:20});
            a.notifications.refresh();
        }""")
        check(f'{skin}: many items keep fixed body height',page.locator('.notification-list').evaluate('(n)=>n.clientHeight')==body_height)
        check(f'{skin}: three complete rows fit viewport',page.locator('.notification-card').first.evaluate('(n)=>n.getBoundingClientRect().height')*3==body_height)
        page.screenshot(path=str(OUT/f'{skin}_many.png'))
        track=page.locator('.notification-list').bounding_box()
        page.mouse.move(track['x']+track['width']-3,track['y']+15)
        page.mouse.down();page.mouse.move(track['x']+track['width']-3,track['y']+140,steps=8);page.mouse.up()
        page.screenshot(path=str(OUT/f'{skin}_drag.png'))
        check(f'{skin}: scrollbar thumb can be dragged',page.locator('.notification-list').evaluate('(n)=>n.scrollTop')>0)
        offset=page.locator('.notification-list').evaluate('(n)=>n.scrollTop')
        page.locator('[role=tab][data-folder=missions]').click()
        check(f'{skin}: folder switch keeps constant height',page.locator('.notification-list').evaluate('(n)=>n.clientHeight')==body_height)
        page.locator('[role=tab][data-folder=notifications]').click()
        check(f'{skin}: scrolled position survives folder switch',abs(page.locator('.notification-list').evaluate('(n)=>n.scrollTop')-offset)<1)
        page.locator('.notification-confirm').last.scroll_into_view_if_needed()
        page.locator('.notification-confirm').last.click()
        check(f'{skin}: acknowledgement leaves rest and keeps menu open',page.locator('.notification-card').count()==19 and page.locator('.notification-panel').is_visible())
        page.keyboard.press('Escape')
        page.locator('.lang-btn').click();page.locator('.notification-btn').click()
        check(f'{skin}: English action labels',page.locator('.notification-actions').first.locator('button').all_inner_texts()==['Go to','OK'])
        page.screenshot(path=str(OUT/f'{skin}_english.png'))
        page.locator('[role=tab][data-folder=achievements]').dispatch_event('click')
        check(f'{skin}: achievements stays locked',page.locator('[role=tab][data-folder=achievements]').is_disabled())
        context.close()
    check('no browser exceptions',not errors)
    browser.close()
    (OUT/'results.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors},ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'passed':len(checks),'errors':errors},ensure_ascii=False))
