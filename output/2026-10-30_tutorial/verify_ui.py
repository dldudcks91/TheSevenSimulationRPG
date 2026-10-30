"""Real tutorial UI verification; app access is injected into served responses only."""
import json
import traceback
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
BASE = 'http://127.0.0.1:8822'
CHECKS, ERRORS = [], []
HARNESS = '''
;globalThis.__tutorialQA = {
    get game(){ return G; }, state, render, tutorial, save, notifications,
    owner: tutorialOwner,
    seen: () => loadTutorialSeen(tutorialOwner()),
    restart: () => { writeTutorialSeen(tutorialOwner(), []); tutorial.reset(); tutorial.refresh(); },
    clearRecord: () => localStorage.removeItem('thesevensim.tutorialSeen'),
    tab: tab => { state.tab=tab; state.modal=null; clearBagSel(); render(); },
    modal: id => { state.modal=id; render(); },
    freeze: value => { frozen=value; tutorial.refresh(); },
    hidden: value => { Object.defineProperty(document,'hidden',{configurable:true,get:()=>value}); tutorial.refresh(); },
    turn: value => { renderTurnGate(value); tutorial.refresh(); },
    screen: value => { state.screen=value; render(); },
    start: () => startGame(),
    loot: () => {
        const item=structuredClone(Object.values(G.items).find(it=>!it.box));
        item.uid='tutorial-qa-loot'; G.items[item.uid]=item;
        if(!G.bags[0].includes(item.uid)) G.bags[0].push(item.uid);
        state.heroUid=G.heroes[0].uid; state.invNo=1; state.btNoPick=false;
        state.tab='character'; state.modal=null; clearBagSel(); render();
    },
    points: () => { G.heroes[0].masteryPoints=2; state.heroUid=G.heroes[0].uid; state.btNoPick=false; render(); },
    itemMenu: value => { state.itemMenu=value ? {uid:'tutorial-qa-loot',hero:G.heroes[0].uid,x:300,y:300}:null; render(); },
    model: () => { const m=tutorialState(); return m ? m.steps.map(s=>({id:s.id,tag:s.target.tagName,classes:s.target.className})):null; },
};
'''


def check(name, condition, detail=None):
    CHECKS.append({'name': name, 'ok': bool(condition), **({'detail': detail} if detail is not None else {})})
    if not condition:
        raise AssertionError(name + (': ' + str(detail) if detail is not None else ''))


def active(page):
    card = page.locator('.tutorial-card')
    return card.get_attribute('data-tutorial') if card.count() else None


def geometry(page, label):
    result = page.evaluate('''() => {
        const c=document.querySelector('.tutorial-card'), a=document.querySelector('.tutorial-target');
        const r=c.getBoundingClientRect(), b=a.getBoundingClientRect();
        const overlap=Math.max(0,Math.min(r.right,b.right)-Math.max(r.left,b.left))*Math.max(0,Math.min(r.bottom,b.bottom)-Math.max(r.top,b.top));
        return {x:r.x,y:r.y,w:r.width,h:r.height,vw:innerWidth,vh:innerHeight,overlap};
    }''')
    check(label + ': card fits viewport', result['x'] >= -1 and result['y'] >= -1
          and result['x'] + result['w'] <= result['vw'] + 1
          and result['y'] + result['h'] <= result['vh'] + 1, result)
    check(label + ': highlighted action remains uncovered', result['overlap'] < 2, result)


def tooltip_layers(page, label):
    check(label + ': real comparison tooltip opens', page.locator('#tooltip.show .tip-compare').count() == 1)
    result = page.evaluate('''() => {
        const c=document.querySelector('.tutorial-card'), t=document.querySelector('#tooltip');
        return {sameLayer:c.parentElement===t.parentElement,card:+getComputedStyle(c).zIndex,tooltip:+getComputedStyle(t).zIndex};
    }''')
    check(label + ': comparison is layered above tutorial', result['sameLayer'] and result['tooltip'] > result['card'], result)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
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
            page.goto(BASE + '/index.html?dev=newgame&lang=ko&skin=now', wait_until='networkidle')
            page.wait_for_selector('.tutorial-card')
            check('new game starts only first expedition explanation', active(page) == 'expedition' and page.locator('.tutorial-card').count() == 1)
            check('first explanation points at real unlocked place-name text', page.locator('.zone:not(.locked) .title > span:last-child.tutorial-target').count() == 1)
            check('showing explanation does not consume it', page.evaluate('__tutorialQA.seen().length') == 0)
            check('guide does not steal keyboard focus', not page.locator('.tutorial-card').evaluate('(n)=>n.contains(document.activeElement)'))
            check('guide has labelled accessible region and text', page.locator('.tutorial-card').get_attribute('role') == 'region'
                  and bool(page.locator('.tutorial-card').get_attribute('aria-describedby'))
                  and page.locator('.tutorial-detail').inner_text() != '')
            check('guide starts no run and changes no selected tab', page.evaluate("__tutorialQA.state.tab==='expedition' && !__tutorialQA.game.runs.some(r=>r?.active)"))
            geometry(page, 'first expedition now')
            page.screenshot(path=str(OUT / 'expedition_now_ko.png'))
            page.locator('.tutorial-confirm').focus()
            page.keyboard.press('Shift+Tab')
            check('Tab can leave guide without a focus trap', not page.locator('.tutorial-card').evaluate('(n)=>n.contains(document.activeElement)'))
            page.keyboard.press('Tab')
            check('normal tab order reaches guide confirmation', page.locator('.tutorial-confirm').evaluate('(n)=>document.activeElement===n'))
            page.evaluate("__tutorialQA.tab('party')")
            check('unconfirmed explanation can be left without saving it', page.evaluate('__tutorialQA.seen().length') == 0 and active(page) == 'potions')
            page.evaluate("__tutorialQA.tab('expedition')")
            check('unconfirmed explanation returns in its actual context', active(page) == 'expedition')
            before = page.evaluate('JSON.stringify(__tutorialQA.game)')
            page.locator('.tutorial-confirm').focus()
            page.keyboard.press('Escape')
            check('Escape within guide confirms without escaping game screen', active(page) is None
                  and page.evaluate("__tutorialQA.seen().includes('expedition') && __tutorialQA.state.screen==='game'"))
            check('acknowledgement changes no game state or resources', page.evaluate('JSON.stringify(__tutorialQA.game)') == before)
            page.evaluate('__tutorialQA.render(); __tutorialQA.tutorial.refresh()')
            check('confirmed explanation stays closed through rerender', active(page) is None)
            page.evaluate('__tutorialQA.save()')
            owner = page.evaluate('__tutorialQA.owner()')
            page.goto(BASE + '/index.html?tab=expedition&lang=ko&skin=d2min', wait_until='networkidle')
            page.wait_for_selector('.notification-btn')
            check('same game reload retains seen record', page.evaluate('__tutorialQA.owner()') == owner and active(page) is None
                  and page.evaluate("__tutorialQA.seen().includes('expedition')"))

            page.evaluate('__tutorialQA.restart()')
            page.locator('.notification-btn').click()
            check('notification panel hides tutorial immediately', active(page) is None)
            page.keyboard.press('Escape')
            page.evaluate('__tutorialQA.tutorial.refresh()')
            check('closing notification panel restores pending tutorial', active(page) == 'expedition')
            page.locator('.dp-btn').click()
            check('settings panel hides tutorial immediately', active(page) is None)
            page.locator('.tutorial-replay').click()
            check('settings replay closes panel and shows current context', not page.locator('.dp-panel').is_visible() and active(page) == 'expedition')
            page.evaluate("__tutorialQA.modal('mail')")
            check('unrelated modal hides tutorial', active(page) is None)
            page.evaluate('__tutorialQA.modal(null)')
            page.evaluate('__tutorialQA.freeze(true)')
            check('frozen game hides tutorial', active(page) is None)
            page.evaluate('__tutorialQA.freeze(false)')
            page.evaluate('__tutorialQA.hidden(true)')
            check('hidden document hides tutorial', active(page) is None)
            page.evaluate('__tutorialQA.hidden(false)')
            page.evaluate('__tutorialQA.turn(true)')
            check('portrait turn gate hides tutorial', active(page) is None)
            page.evaluate('__tutorialQA.turn(false)')
            page.evaluate("__tutorialQA.screen('menu')")
            check('menu hides tutorial', active(page) is None)
            page.evaluate("__tutorialQA.screen('game')")
            check('returning from menu retains unconfirmed explanation', active(page) == 'expedition')

            for width, height, skin in [(1280, 720, 'now'), (1920, 1080, 'd2min')]:
                page.set_viewport_size({'width': width, 'height': height})
                page.evaluate('(skin)=>{document.documentElement.dataset.skin=skin; __tutorialQA.tutorial.refresh()}', skin)
                page.wait_for_timeout(100)
                geometry(page, f'{skin} {width}x{height}')
            page.locator('.lang-btn').click()
            check('English title and confirmation translate', page.locator('.tutorial-title').inner_text() == 'Your first expedition'
                  and page.locator('.tutorial-confirm').inner_text() == 'Got it'
                  and 'tutorial.' not in page.locator('.tutorial-card').inner_text())
            page.screenshot(path=str(OUT / 'expedition_d2min_en.png'))
            page.locator('.tutorial-confirm').click()

            page.evaluate('__tutorialQA.loot(); __tutorialQA.points()')
            check('first loose gear displays comparison at actual inventory cell', active(page) == 'loot'
                  and page.locator('.store-bag .inv-cell.filled:not(.box).tutorial-target').count() == 1)
            check('gear guidance preserves equipment and mastery points', page.evaluate('__tutorialQA.game.heroes[0].masteryPoints') == 2)
            geometry(page, 'gear comparison')
            page.screenshot(path=str(OUT / 'loot_d2min_en.png'))
            page.set_viewport_size({'width': 1280, 'height': 720})
            page.wait_for_timeout(100)
            page.locator('.store-bag .inv-cell.filled:not(.box)').first.hover()
            tooltip_layers(page, '1280 mouse gear')
            page.screenshot(path=str(OUT / 'loot_hover_1280_en.png'))
            page.mouse.move(10, 10)
            page.locator('.tutorial-confirm').click()
            page.evaluate('__tutorialQA.render(); __tutorialQA.tutorial.refresh()')
            check('confirming gear does not chain another card on same screen', active(page) is None)
            page.locator('.go-tree.has-points').click()
            check('explicit mastery opening allows next guide after gear confirmation', active(page) == 'mastery'
                  and page.locator('#modal .sk-cell.can.tutorial-target[data-node]').count() == 1)
            page.evaluate('__tutorialQA.modal(null)')
            check('unconfirmed mastery also explains its entry button', active(page) == 'mastery'
                  and page.locator('.go-tree.has-points.tutorial-target').count() == 1)
            page.screenshot(path=str(OUT / 'mastery_button_d2min_en.png'))
            page.locator('.go-tree.has-points').click()
            check('unconfirmed mastery follows into actual learnable node', active(page) == 'mastery'
                  and page.locator('#modal .sk-cell.can.tutorial-target[data-node]').count() == 1)
            geometry(page, 'mastery node')
            page.screenshot(path=str(OUT / 'mastery_tree_d2min_en.png'))
            points = page.evaluate('__tutorialQA.game.heroes[0].masteryPoints')
            page.locator('.tutorial-confirm').focus()
            page.keyboard.press('Escape')
            check('guide Escape keeps mastery modal open and spends no point', page.evaluate("__tutorialQA.state.modal==='skill'")
                  and page.evaluate('__tutorialQA.game.heroes[0].masteryPoints') == points and active(page) is None)
            page.keyboard.press('Escape')
            page.evaluate("__tutorialQA.tab('party')")
            check('potion guidance targets real party potion settings', active(page) == 'potions'
                  and page.locator('.pt-potion.tutorial-target').count() == 1)
            geometry(page, 'party potions')
            page.locator('.lang-btn').click()
            page.screenshot(path=str(OUT / 'potions_d2min_ko.png'))
            page.locator('.tutorial-confirm').click()
            page.evaluate("__tutorialQA.tab('research')")
            check('construction guidance targets actual next-rank panel', active(page) == 'construction'
                  and page.locator('.cn-next.tutorial-target').count() == 1)
            geometry(page, 'construction')
            page.screenshot(path=str(OUT / 'construction_d2min_ko.png'))
            page.locator('.tutorial-confirm').click()
            check('all five explanations have independent persisted IDs', set(page.evaluate('__tutorialQA.seen()')) == {'expedition','loot','mastery','potions','construction'})
            page.evaluate("__tutorialQA.tab('character'); __tutorialQA.tab('party'); __tutorialQA.tab('research')")
            check('all seen contexts remain quiet', active(page) is None)

            page.evaluate('__tutorialQA.save(); __tutorialQA.clearRecord()')
            page.goto(BASE + '/index.html?tab=research&lang=ko', wait_until='networkidle')
            page.wait_for_selector('.notification-btn')
            check('existing save without enrollment starts no tutorial', active(page) is None and page.evaluate('__tutorialQA.seen()') is None)
            page.locator('.dp-btn').click()
            page.locator('.tutorial-replay').click()
            check('existing save can explicitly start from current context', active(page) == 'construction')
            page.locator('.tutorial-confirm').click()
            old_owner = page.evaluate('__tutorialQA.owner()')
            page.wait_for_timeout(30)
            page.evaluate('__tutorialQA.start()')
            check('new game has separate tutorial progress', active(page) == 'expedition' and page.evaluate('__tutorialQA.owner()') != old_owner
                  and page.evaluate('__tutorialQA.seen().length') == 0)

            page.evaluate('__tutorialQA.loot()')
            page.evaluate('__tutorialQA.itemMenu(true)')
            check('item action menu hides tutorial', active(page) is None)
            page.evaluate('__tutorialQA.itemMenu(false)')
            check('closing item menu restores pending gear explanation', active(page) == 'loot')
            check('no browser runtime exceptions', not ERRORS, ERRORS)

            touch = browser.new_context(viewport={'width': 1280, 'height': 720}, has_touch=True, is_mobile=True)
            touch.route('https://**', lambda route: route.abort())
            touch.route('**/ui/app.js', lambda route: route.fulfill(status=200, content_type='text/javascript',
                body=(ROOT / 'src/ui/app.js').read_text(encoding='utf-8') + HARNESS))
            tp = touch.new_page()
            tp.on('pageerror', lambda error: ERRORS.append(str(error)))
            tp.goto(BASE + '/index.html?dev=newgame&lang=en&skin=now', wait_until='networkidle')
            tp.wait_for_selector('.tutorial-card')
            tp.locator('.tutorial-title').tap()
            tp.evaluate('__tutorialQA.loot()')
            check('touch gear guidance uses hold and explicit Equip wording', 'Touch and hold gear' in tp.locator('.tutorial-detail').inner_text()
                  and '[Equip]' in tp.locator('.tutorial-detail').inner_text())
            box = tp.locator('.store-bag .inv-cell.filled:not(.box)').first.bounding_box()
            session = touch.new_cdp_session(tp)
            session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': box['x'] + box['width']/2, 'y': box['y'] + box['height']/2}]})
            tp.wait_for_timeout(550)
            session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
            tooltip_layers(tp, '1280 touch gear')
            check('long press exposes actual Equip action', tp.locator('#tooltip .tip-touch button').filter(has_text='Equip').count() == 1)
            tp.screenshot(path=str(OUT / 'touch_gear_now_en.png'))
            tp.wait_for_timeout(450)
            tp.locator('.tutorial-confirm').tap()
            check('touch confirmation persists only the displayed guide', tp.evaluate("__tutorialQA.seen().includes('loot') && !__tutorialQA.seen().includes('expedition')"))
            touch.close()

            combat = browser.new_context(viewport={'width': 1600, 'height': 900})
            combat.route('https://**', lambda route: route.abort())
            combat.route('**/ui/app.js', lambda route: route.fulfill(status=200, content_type='text/javascript',
                body=(ROOT / 'src/ui/app.js').read_text(encoding='utf-8') + HARNESS))
            cp = combat.new_page()
            cp.on('pageerror', lambda error: ERRORS.append(str(error)))
            cp.goto(BASE + '/index.html?dev=play&tab=party&lang=ko&skin=d2min', wait_until='networkidle')
            cp.wait_for_selector('.pt-potion')
            cp.evaluate('__tutorialQA.restart()')
            check('potion tutorial can coexist with a real running expedition', active(cp) == 'potions'
                  and cp.evaluate('__tutorialQA.game.runs.some(r=>r?.active)'))
            elapsed = cp.evaluate('__tutorialQA.game.expMs')
            cp.wait_for_timeout(1200)
            check('expedition clock advances while guide remains open', active(cp) == 'potions'
                  and cp.evaluate('__tutorialQA.game.expMs') > elapsed)
            combat.close()
            check('all contexts have no browser runtime exceptions', not ERRORS, ERRORS)
        except Exception:
            failure = traceback.format_exc()
            try:
                page.screenshot(path=str(OUT / 'failure.png'))
            except Exception:
                pass
        finally:
            result = {'passed': sum(c['ok'] for c in CHECKS), 'checks': CHECKS, 'errors': ERRORS, 'failure': failure}
            (OUT / 'ui_results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
            print(json.dumps({'passed': result['passed'], 'checks': len(CHECKS), 'errors': ERRORS, 'failure': failure}, ensure_ascii=True))
            context.close()
            browser.close()
    if failure or ERRORS:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
