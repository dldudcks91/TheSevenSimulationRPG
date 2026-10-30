"""Check the real shared button and tooltip interactions in isolated browser contexts."""
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
    route.fulfill(response=response, body=response.text() + '\n;globalThis.__notificationTest = { get game(){return G}, get SYS(){return SYS}, state, render, notifications };')

STYLE = '(n) => { const s=getComputedStyle(n); return {background:s.backgroundImage+" "+s.backgroundColor, border:s.borderColor, borderImage:s.borderImageSource, filter:s.filter}; }'
with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='msedge', headless=True)
    for skin in ['now', 'd2min']:
        context = browser.new_context(viewport={'width': 1600, 'height': 800})
        context.route('https://**', lambda route: route.abort())
        context.route('**/ui/app.js', instrument)
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(f'http://127.0.0.1:8798/index.html?dev=newgame&lang=ko&skin={skin}', wait_until='networkidle')
        page.wait_for_selector('.notification-btn')
        page.locator('.lang-btn').hover()
        common = page.locator('.lang-btn').evaluate(STYLE)
        for selector, title, name in [('.mail-btn:not(.notification-btn)', '우편함', 'mail'), ('.notification-btn', '알림', 'bell')]:
            button = page.locator(selector)
            button.hover()
            check(f'{skin}: {name} uses common button hover', button.evaluate(STYLE) == common)
            check(f'{skin}: {name} has game tooltip and no native title', button.get_attribute('data-tip') == '1' and button.get_attribute('title') is None)
            page.wait_for_selector('#tooltip.show .tip-mini')
            check(f'{skin}: {name} tooltip title', page.locator('#tooltip .tip-name').inner_text() == title)
            check(f'{skin}: {name} image brightens on hover', button.locator('img').evaluate('(n) => getComputedStyle(n).opacity') == '1')
            rect = button.bounding_box()
            tip_before = page.locator('#tooltip').bounding_box()
            page.mouse.move(rect['x'] + rect['width'] / 2 + 5, rect['y'] + rect['height'] / 2)
            tip_after = page.locator('#tooltip').bounding_box()
            check(f'{skin}: {name} tooltip follows cursor', abs(tip_after['x'] - tip_before['x']) >= 3)
            page.screenshot(path=str(OUT / f'{skin}_{name}_hover.png'))
            button.click()
            check(f'{skin}: {name} click clears hover tooltip', page.locator('#tooltip.show').count() == 0)
            if name == 'mail':
                check(f'{skin}: mail still opens gift mailbox', page.locator('.mail-modal').is_visible())
                page.keyboard.press('Escape')
            else:
                check(f'{skin}: bell still opens notifications', page.locator('.notification-panel').is_visible())
                page.keyboard.press('Escape')
            button = page.locator(selector)
            button.hover()
            page.mouse.move(1585, 785)
            check(f'{skin}: {name} tooltip closes on leave', page.locator('#tooltip.show').count() == 0)

        page.evaluate("""() => {
            const a=__notificationTest, g=a.game;
            g.counters.battle=1; g.buildings.shop=1; g.buildings.tavern=1;
            a.SYS.game.commissionFill(g);
            a.SYS.game.commissionTake(g,g.commissions.cards[0].no);
            a.render();
        }""")
        page.locator('.notification-btn').hover()
        page.evaluate("() => { globalThis.hoveredBell = document.querySelector('.notification-btn'); }")
        page.evaluate("""() => { const a=__notificationTest, c=a.game.commissions.cards.find(c=>c.have!==undefined); c.have=c.need; a.notifications.refresh(); }""")
        check(f'{skin}: badge update preserves hovered button and its live tooltip', page.evaluate("() => hoveredBell.isConnected && hoveredBell === document.querySelector('.notification-btn')") and page.locator('#tooltip.show .tip-name').inner_text() == '알림')
        check(f'{skin}: pending badge survives hover integration', page.locator('.notification-btn .mail-n').inner_text() == '1')
        page.evaluate("""async () => {
            const {bindTipNode}=await import('./ui/tip.js');
            bindTipNode(document.querySelector('.lang-btn'),()=>{
                const card=document.createElement('div'); card.className='tip-card tip-mini';
                card.textContent='Other game control'; return card;
            });
        }""")
        page.locator('.lang-btn').hover()
        page.wait_for_timeout(3150)
        check(f'{skin}: bubble expiration preserves unrelated game tooltip', page.locator('#tooltip.show').count() == 1 and 'Other game control' in page.locator('#tooltip').inner_text())
        check(f'{skin}: installed envelope image loads', page.locator('.mail-btn:not(.notification-btn) img').evaluate('(n)=>n.complete&&n.naturalWidth===256'))
        context.close()
    check('no runtime errors', not errors)
    browser.close()
    result = {'passed': len(checks), 'checks': checks, 'errors': errors}
    (OUT / 'hover_results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'passed': len(checks), 'errors': errors}, ensure_ascii=False))
