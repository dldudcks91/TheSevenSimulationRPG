"""Exercise mobile layouts with real touch input in an isolated browser profile.

Run `python serve.py 8854`, then `python scripts/verify_mobile_ui.py --port 8854`.
Requires Python Playwright and Microsoft Edge. No existing browser saves are used.
The injected accessor only observes state; all interactions use the rendered UI.
"""
import argparse
import hashlib
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
os.environ['PW_TEST_SCREENSHOT_NO_FONTS_READY'] = '1'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--port', type=int, default=8854)
parser.add_argument('--output-dir', default='tmp/mobile_review')
parser.add_argument('--section', choices=['all', 'preview', 'variants', 'minigames', 'journeys', 'reports', 'edges', 'workflows', 'fixed', 'matrix', 'dialogs', 'touch', 'panels', 'duel', 'startup', 'layout', 'desktop', 'preference', 'core'], default='all')
parser.add_argument('--rules-from-head', action='store_true', help='Diagnostic only: serve committed game rules/CSV without modifying the working tree; reports identify this mode.')
args = parser.parse_args()
OUT = ROOT / args.output_dir
OUT.mkdir(parents=True, exist_ok=True)
BASE = f'http://127.0.0.1:{args.port}'
checks, exceptions = [], []
started_at = datetime.now(timezone.utc).isoformat()


def source_fingerprints():
    names = ['src/ui/mobile.js', 'src/ui/mobile.css', 'src/ui/mobile-pages.js', 'src/ui/mobile-pages.css', 'src/ui/mobile-native.js', 'src/ui/mobile-native.css', 'src/ui/app.js', 'src/ui/mock.js']
    paths = [ROOT / name for name in names] + list((ROOT/'src/game_logic').glob('*.js')) + list((ROOT/'src/data').glob('*.csv'))
    return {str(p.relative_to(ROOT)).replace('\\', '/'): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}


source_start = source_fingerprints()
baseline = {}
if args.rules_from_head:
    names = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', 'HEAD', 'src/game_logic', 'src/data'], cwd=ROOT, text=True).splitlines()
    for name in names:
        if name.startswith('src/game_logic/') and name.endswith('.js') or name.startswith('src/data/') and name.count('/') == 2 and name.endswith('.csv'):
            baseline['/' + name.removeprefix('src/')] = subprocess.check_output(['git', 'show', 'HEAD:' + name], cwd=ROOT)
    # The hero generator and portrait-pool adapter share a data contract.
    baseline['/ui/mock.js'] = subprocess.check_output(['git', 'show', 'HEAD:src/ui/mock.js'], cwd=ROOT)
HARNESS = '''
window.__mobileReview = {
  read: () => ({ tab: state.tab, exp: state.exp, modal: state.modal,
    heroes: G?.heroes.map(h => h.uid), bags: G?.bags, gold: G?.resources.gold,
    runs: G?.runs, time: G?.expMs, preset: G?.preset,
    equipped: G?.heroes.map(h => h.equipped),
    forgeItem: state.forgeItem, sale: [...state.shopSell],
    minigame: mgRun ? {phase: mgRun.phase, inputs: mgRun.input.length} : null,
    locked: G ? Object.values(G.items).filter(i=>i.locked).length : 0,
    formation: G ? SYS.game.formationState(G).ranks : null, }),
};
'''


def check(name, ok, detail=None):
    result = {'name': name, 'ok': bool(ok)}
    if detail is not None:
        result['detail'] = detail
    checks.append(result)
    print(json.dumps(result, ensure_ascii=True), flush=True)


def context_for(browser, width=390, height=844, touch=True, admin=True):
    ctx = browser.new_context(viewport={'width': width, 'height': height},
                              has_touch=touch, is_mobile=touch, device_scale_factor=1)
    if admin:
        ctx.add_init_script("localStorage.setItem('devAdmin', '1')")
    # Network-restricted runs use the game's local fallback font, consistently.
    for external in ['https://fonts.googleapis.com/**', 'https://fonts.gstatic.com/**', 'https://cdn.jsdelivr.net/**']:
        ctx.route(external, lambda route: route.abort())
    if baseline:
        from urllib.parse import urlparse
        def baseline_route(route):
            path = urlparse(route.request.url).path
            if path in baseline:
                route.fulfill(status=200, content_type='text/javascript' if path.endswith('.js') else 'text/csv', body=baseline[path])
            else:
                route.continue_()
        ctx.route('**/game_logic/**', baseline_route)
        ctx.route('**/data/*.csv', baseline_route)
        ctx.route('**/ui/mock.js', baseline_route)
    ctx.route('**/ui/app.js', lambda route: route.fulfill(status=200,
              content_type='text/javascript', body=(ROOT / 'src/ui/app.js').read_text(encoding='utf-8') + HARNESS))
    page = ctx.new_page()
    page.set_default_timeout(15000)
    page.on('pageerror', lambda error: exceptions.append(str(error)))
    return ctx, page


def load(page, query, selector):
    page.goto(f'{BASE}/index.html?{query}', wait_until='domcontentloaded')
    page.wait_for_function("[...document.querySelectorAll('link[rel=stylesheet]')].filter(n=>new URL(n.href).origin===location.origin).every(n=>n.sheet)", timeout=15000)
    page.wait_for_function('''selector => {
      const n=document.querySelector(selector), r=n?.getBoundingClientRect();
      return r?.width && r?.height && getComputedStyle(n).visibility !== 'hidden'
        || /^(Error|TypeError|ReferenceError|SyntaxError):/.test(document.querySelector('.main')?.textContent.trim() ?? '');
    }''', arg=selector, timeout=60000)
    error = page.locator('.main').text_content().strip()
    if error.startswith(('Error:', 'TypeError:', 'ReferenceError:', 'SyntaxError:')):
        raise RuntimeError(error)
    page.wait_for_timeout(250)


def screenshot(page, name):
    page.screenshot(path=str(OUT / f'{name}.png'))


def geometry(page, selector='.main'):
    return page.locator(selector).first.evaluate('''node => {
        const r = node.getBoundingClientRect();
        return { width: node.clientWidth, scroll: node.scrollWidth,
          height: node.clientHeight, scrollHeight: node.scrollHeight,
          left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    }''')


def fits(page, name, selector='.main'):
    g = geometry(page, selector)
    check(name, g['width'] > 0 and g['scroll'] <= g['width'] + 2
          and (selector != '.main' or g['scrollHeight'] <= g['height'] + 2), g)


def battle_geometry(page):
    # Floating damage and hit effects intentionally travel beyond the clipped
    # arena. Measure cards/controls, not the transient animation scroll extent.
    return page.locator('.battle-body > .arena').evaluate('''root => {
      const r=root.getBoundingClientRect(), css=getComputedStyle(root);
      const boxes=[...root.querySelectorAll('.unit-slot > .unit, :scope > .b-belt, :scope > .bt-max-btn')]
        .map(n=>({node:n,rect:n.getBoundingClientRect()})).filter(x=>x.rect.width&&x.rect.height)
        .map(({node,rect:b})=>({class:node.className,left:b.left,right:b.right,top:b.top,bottom:b.bottom,
          fits:b.left>=r.left-2&&b.right<=r.right+2&&b.top>=r.top-2&&b.bottom<=r.bottom+2}));
      return {ok:css.overflowX==='hidden'&&css.overflowY==='hidden'&&boxes.every(b=>b.fits),
        height:root.clientHeight,animationScrollHeight:root.scrollHeight,boxes};
    }''')


def dismiss_tutorials(page):
    for _ in range(8):
        control = page.locator('.tutorial-card button').first
        if not control.count() or not control.is_visible():
            break
        control.tap()


def reveal_mobile_panel(page, locator):
    """Choose the actual tab containing a target instead of scrolling the whole page."""
    panel = locator.locator('xpath=ancestor::*[contains(concat(" ",normalize-space(@class)," ")," mobile-pane ")][1]')
    if panel.count() and not panel.is_visible():
        page.locator('#' + panel.get_attribute('aria-labelledby')).tap()
        dismiss_tutorials(page)


def tab(page, name):
    page.locator('[data-mobile-menu]').tap()
    page.locator(f'.nav [data-tab="{name}"]').tap()
    page.wait_for_timeout(100)


def long_press(page, locator):
    locator.scroll_into_view_if_needed()
    rect = locator.bounding_box()
    session = page.context.new_cdp_session(page)
    session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [
        {'x': rect['x'] + rect['width'] / 2, 'y': rect['y'] + rect['height'] / 2}]})
    page.wait_for_timeout(550)
    session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    page.wait_for_timeout(450)
    session.detach()


def matrix(browser):
    variants = [(320, 568, 'en', 'd2min'), (390, 844, 'ko', 'd2min'),
                (390, 844, 'en', 'now'), (844, 390, 'ko', 'd2min'),
                (844, 390, 'en', 'now'), (768, 1024, 'ko', 'd2min'),
                (1024, 768, 'en', 'd2min'), (1366, 600, 'ko', 'now')]
    for width, height, lang, skin in variants:
        key = f'{width}x{height}-{lang}-{skin}'
        ctx, page = context_for(browser, width, height)
        try:
            load(page, f'dev=play&lang={lang}&skin={skin}', '.b-pause')
            page.locator('.b-pause').tap()
            page.wait_for_timeout(1000)
            check(key + ':native-stage', page.evaluate('document.documentElement.hasAttribute("data-mobile") && document.querySelector("#stage").offsetWidth === innerWidth'))
            check(key + ':rotation-gate-absent', page.locator('.turn-gate:visible').count() == 0)
            fits(page, key + ':battle')
            screenshot(page, key + '-battle')
            for pane in ['log', 'dmg']:
                control = page.locator(f'.b-pane[data-tab="{pane}"]')
                control.tap()
                check(key + ':' + pane, page.locator('.battle-side').is_visible())
                fits(page, key + ':' + pane + '-width')
                control.tap()
            page.locator('.bt-max-btn').tap()
            check(key + ':battle-bag-open', page.locator('#app').evaluate('n => n.classList.contains("mobile-battle-details")'))
            page.locator('.bt-max-btn').tap()
            check(key + ':battle-bag-close', not page.locator('#app').evaluate('n => n.classList.contains("mobile-battle-details")'))
            before = page.evaluate('__mobileReview.read().heroes')
            for name in ['expedition', 'party', 'character', 'research', 'tavern', 'shop',
                         'forge', 'library', 'resource', 'explore', 'colosseum', 'arena', 'codex', 'help', 'lab']:
                tab(page, name)
                check(key + ':' + name + '-navigation', page.evaluate('__mobileReview.read().tab') == name)
                fits(page, key + ':' + name)
                if name in ['character', 'research', 'tavern'] and width == 390:
                    screenshot(page, key + '-' + name)
            check(key + ':navigation-preserves-heroes', page.evaluate('__mobileReview.read().heroes') == before)
            page.locator('[data-mobile-menu]').tap()
            screenshot(page, key + '-menu')
            check(key + ':menu-modal', page.locator('#game-menu').get_attribute('aria-modal') == 'true')
            check(key + ':background-inert', page.locator('.main').evaluate('n=>n.inert'))
            page.keyboard.press('Shift+Tab')
            check(key + ':focus-trap', page.evaluate('document.querySelector("#game-menu").contains(document.activeElement)'))
            page.keyboard.press('Escape')
            check(key + ':focus-return', page.evaluate('document.activeElement.matches("[data-mobile-menu]")'))
            page.locator('.tab-seg button').first.tap()
            page.set_viewport_size({'width': height, 'height': width})
            page.wait_for_timeout(200)
            fits(page, key + ':rotation')
            check(key + ':rotation-preserves-heroes', page.evaluate('__mobileReview.read().heroes') == before)
            # A wide mouse viewport returns to the original desktop stage.
            if width == 390:
                page.set_viewport_size({'width': 1600, 'height': 900})
                page.wait_for_timeout(250)
                check(key + ':desktop-return', page.evaluate('!document.documentElement.hasAttribute("data-mobile") && document.querySelector("#stage").offsetWidth === 1600'))
                check(key + ':desktop-nav', page.locator('.nav').is_visible())
                screenshot(page, key + '-desktop')
        except Exception as error:
            check(key + ':scenario', False, str(error))
            screenshot(page, key + '-failure')
        finally:
            ctx.close()


def dialogs(browser):
    scenarios = [('form', 'dev=form&party=full', '.depart-box'),
                 ('tree', 'dev=tree', '.modal-box'), ('gamble', 'dev=gamble', '.gb-box'),
                 ('book', 'dev=book', '.mobile-dock'), ('raid', 'dev=raid', '.raid-page'),
                 ('prologue', 'dev=prologue', '.pro-wrap'),
                 ('mine', 'dev=mg&mg=mine&go=1', '.mg-modal'),
                 ('gather', 'dev=mg&mg=gather&go=1', '.mg-modal'),
                 ('log', 'dev=mg&mg=log&go=1', '.mg-modal')]
    for lang in ['ko', 'en']:
        for name, query, selector in scenarios:
            key = f'dialog-{name}-{lang}'
            ctx, page = context_for(browser)
            try:
                load(page, query + f'&lang={lang}&skin=d2min', selector)
                target = '.modal-layer:not([hidden]) .modal-box' if page.locator('.modal-layer:not([hidden]) .modal-box').count() else '.main'
                fits(page, key, target)
                screenshot(page, key)
                if name == 'form':
                    page.locator('.modal-box').evaluate('n=>n.scrollTop=n.scrollHeight')
                    screenshot(page, key + '-bottom')
                    check(key + ':close-reachable', page.locator('.modal-box .modal-x').is_visible())
                    check(key + ':departure-fixed', page.locator('.depart-box .form-actions').evaluate('n=>{const r=n.getBoundingClientRect();return r.top>0&&r.bottom<=innerHeight}'))
                if name == 'tree':
                    available = page.locator('.sk-cell.can[data-node]').first
                    reveal_mobile_panel(page, available)
                    rank = available.locator('.sk-icon-rank').text_content()
                    node_id = available.get_attribute('data-node')
                    tutorial = page.locator('.tutorial-card button')
                    if tutorial.count():
                        tutorial.first.tap()
                    available.tap()
                    check(key + ':learn', page.locator(f'.sk-cell[data-node="{node_id}"] .sk-icon-rank').text_content() != rank)
            except Exception as error:
                check(key + ':scenario', False, str(error))
                screenshot(page, key + '-failure')
            finally:
                ctx.close()


def touch(browser):
    for lang in ['ko', 'en']:
        ctx, page = context_for(browser)
        try:
            load(page, f'dev=box&lang={lang}&skin=d2min', '.mobile-dock')
            reveal_mobile_panel(page, page.locator('.inv-cell.box').first)
            long_press(page, page.locator('.inv-cell.box').first)
            check(lang + ':chest-action', page.locator('#tooltip .tip-touch button').count() == 1)
            page.locator('#tooltip .tip-touch button').first.tap()
            reveal_mobile_panel(page, page.locator('.inv-cell.filled:not(.box)[data-tip]').first)
            long_press(page, page.locator('.inv-cell.filled:not(.box)[data-tip]').first)
            check(lang + ':long-press', page.locator('#tooltip.show .tip-touch').is_visible())
            fits(page, lang + ':tooltip', '#tooltip')
            check(lang + ':tooltip-within-viewport', page.locator('#tooltip').evaluate('n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}'))
            for cls in ['alt', 'range']:
                control = page.locator(f'.tip-touch-{cls}')
                if control.count():
                    control.tap()
                    check(lang + ':touch-' + cls, 'on' in control.get_attribute('class'))
            screenshot(page, lang + '-touch-equipment')
            actions = page.locator('.tip-touch .btn:not(.tip-touch-alt):not(.tip-touch-range)')
            check(lang + ':item-actions-present', actions.count() > 0)
            worn = page.evaluate('__mobileReview.read().equipped')
            locked = page.evaluate('__mobileReview.read().locked')
            page.locator('.tip-touch button').filter(has_text='잠금' if lang == 'ko' else 'Lock').tap()
            check(lang + ':item-lock', page.evaluate('__mobileReview.read().locked') == locked + 1)
            long_press(page, page.locator('.inv-cell.filled:not(.box)[data-tip]').first)
            page.locator('.tip-touch button').filter(has_text='착용' if lang == 'ko' else 'Equip').tap()
            check(lang + ':item-equip', page.evaluate('__mobileReview.read().equipped') != worn)
            page.locator('[data-mobile-menu]').tap()
            check(lang + ':menu-clears-tooltip', page.locator('#tooltip.show').count() == 0)
            page.locator('.lang-btn').tap()
            check(lang + ':language-switch', page.locator('html').get_attribute('lang') != lang)
            page.locator('.mobile-menu-close').tap()
            page.locator('.dp-btn').tap()
            fits(page, lang + ':settings', '#stage > .dp-panel')
            screenshot(page, lang + '-settings')
            page.locator('#stage > .dp-panel .dp-x').tap()
            page.locator('.mail-btn:not(.notification-btn)').tap()
            fits(page, lang + ':mail', '.modal-box')
            screenshot(page, lang + '-mail')
            page.locator('.modal-box .modal-x').tap()
            page.locator('.notification-btn').tap()
            fits(page, lang + ':notifications', '.notification-panel')
            screenshot(page, lang + '-notifications')
        except Exception as error:
            check(lang + ':touch-scenario', False, str(error))
            screenshot(page, lang + '-touch-failure')
        finally:
            ctx.close()


def preference(browser):
    for width, height, lang in [(390, 844, 'ko'), (1600, 900, 'en')]:
        key = f'preference-{width}-{lang}'
        ctx, page = context_for(browser, width, height)
        try:
            load(page, f'dev=play&lang={lang}&skin=d2min', '.b-pause')
            page.locator('.b-pause').tap()
            before = page.evaluate('__mobileReview.read().heroes')
            page.locator('.dp-btn').tap()
            page.locator('.set-panes button').nth(1).tap()
            check(key + ':default-auto', page.locator('[data-layout="auto"]').get_attribute('aria-pressed') == 'true')
            for mode in ['desktop', 'mobile', 'auto']:
                page.locator(f'[data-layout="{mode}"]').tap()
                mobile = mode == 'mobile' or mode == 'auto' and width <= 1024
                check(key + ':' + mode, page.locator('html').evaluate('n=>n.hasAttribute("data-mobile")') == mobile)
                check(key + ':' + mode + '-selected', page.locator(f'[data-layout="{mode}"]').get_attribute('aria-pressed') == 'true')
                check(key + ':' + mode + '-settings-retained', page.locator('.set-layout').is_visible())
                check(key + ':' + mode + '-no-turn-gate', not page.locator('#turn').is_visible())
                check(key + ':' + mode + '-heroes-preserved', page.evaluate('__mobileReview.read().heroes') == before)
            forced = 'desktop' if width < 1024 else 'mobile'
            page.locator(f'[data-layout="{forced}"]').tap()
            screenshot(page, key + '-forced')
            page.evaluate(f"history.replaceState(null,'','?tab=character&lang={lang}&skin=d2min')")
            page.reload(wait_until='domcontentloaded')
            page.locator('.dp-btn').wait_for()
            check(key + ':reload-keeps-preference', page.locator('html').evaluate('n=>n.hasAttribute("data-mobile")') == (forced == 'mobile'))
            page.locator('.dp-btn').tap()
            page.locator('.set-panes button').nth(1).tap()
            check(key + ':reload-selected', page.locator(f'[data-layout="{forced}"]').get_attribute('aria-pressed') == 'true')
            page.locator('[data-layout="auto"]').tap()
            page.set_viewport_size({'width': 1600 if width < 1024 else 390, 'height': 900 if width < 1024 else 844})
            page.wait_for_timeout(300)
            check(key + ':auto-follows-resize', page.locator('html').evaluate('n=>n.hasAttribute("data-mobile")') == (width > 1024))
        except Exception as error:
            check(key + ':scenario', False, str(error))
            screenshot(page, key + '-failure')
        finally:
            ctx.close()
    for stored in ['invalid', 'blocked']:
        ctx, page = context_for(browser)
        if stored == 'blocked':
            ctx.add_init_script("Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };")
        else:
            ctx.add_init_script("localStorage.setItem('thesevensim.screenLayout', 'invalid')")
        try:
            load(page, 'lang=en&skin=d2min', '.mn-btn')
            page.locator('.dp-btn').tap()
            page.locator('.set-panes button').nth(1).tap()
            check(stored + ':fallback-auto', page.locator('[data-layout="auto"]').get_attribute('aria-pressed') == 'true')
            page.locator('[data-layout="desktop"]').tap()
            check(stored + ':session-switch', not page.locator('html').evaluate('n=>n.hasAttribute("data-mobile")'))
        except Exception as error:
            check(stored + ':scenario', False, str(error))
        finally:
            ctx.close()


def desktop(browser):
    ctx, page = context_for(browser, 1600, 900, touch=False)
    try:
        load(page, 'dev=play&lang=ko&skin=d2min', '.b-pause')
        page.wait_for_timeout(4000)
        page.locator('.b-pause').click()
        before = page.evaluate('__mobileReview.read().heroes')
        check('desktop:normal-nav', page.locator('.nav').is_visible())
        page.locator('.bt-max-btn').click()
        check('desktop:maximized', page.locator('#app.bt-max').count() == 1)
        check('desktop:max-nav-hidden', not page.locator('.nav').is_visible())
        screenshot(page, 'desktop-maximized')
        page.set_viewport_size({'width': 390, 'height': 844})
        page.wait_for_timeout(350)
        check('desktop-to-mobile:menu-visible', page.locator('.mobile-dock').is_visible())
        check('desktop-to-mobile:native-width', page.locator('#stage').evaluate('n=>n.offsetWidth') == 390)
        page.set_viewport_size({'width': 1600, 'height': 900})
        page.wait_for_timeout(350)
        check('mobile-to-desktop:max-preserved', page.locator('#app.bt-max').count() == 1)
        page.locator('.bt-max-btn').click()
        check('desktop:normal-restored', page.locator('.nav').is_visible())
        check('desktop:heroes-preserved', page.evaluate('__mobileReview.read().heroes') == before)
        screenshot(page, 'desktop-normal')
    except Exception as error:
        check('desktop:scenario', False, str(error))
    finally:
        ctx.close()


def layout(browser):
    for width, height in [(320, 568), (390, 844), (568, 320), (844, 390)]:
        key = f'layout-{width}x{height}'
        ctx, page = context_for(browser, width, height)
        try:
            load(page, 'dev=play&lang=en&skin=d2min', '.b-pause')
            page.wait_for_timeout(6000)
            page.locator('.b-pause').tap()
            page.wait_for_timeout(800)
            g = page.locator('.arena').evaluate('''n => {
                const belt=n.querySelector('.b-belt:not(.e-belt)').getBoundingClientRect();
                const cards=[...n.querySelectorAll('.side-party .unit')].map(n=>n.getBoundingClientRect());
                return {belt: belt.toJSON(), cards: cards.map(r=>r.toJSON()),
                  overlap: cards.some(r=>belt.left<r.right&&belt.right>r.left&&belt.top<r.bottom-1&&belt.bottom>r.top+1)};
            }''')
            check(key + ':potions-do-not-cover-cards', not g['overlap'], g)
            page.locator('.arena .bt-max-btn').scroll_into_view_if_needed()
            check(key + ':battle-toggle-touchable', page.locator('.arena .bt-max-btn').evaluate('n=>{const r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}'))
            screenshot(page, key + '-battle')
            # Use a populated inventory without writing state through the harness.
            load(page, 'dev=box&lang=en&skin=d2min', '.mobile-dock')
            reveal_mobile_panel(page, page.locator('.inv-cell.box').first)
            long_press(page, page.locator('.inv-cell.box').first)
            page.locator('#tooltip .tip-touch button').first.tap()
            reveal_mobile_panel(page, page.locator('.inv-cell.filled:not(.box)[data-tip]').first)
            long_press(page, page.locator('.inv-cell.filled:not(.box)[data-tip]').first)
            fits(page, key + ':tooltip-width', '#tooltip')
            check(key + ':tooltip-keeps-menu-reachable', page.locator('[data-mobile-menu]').evaluate('n=>{const r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}'))
            page.locator('.tip-touch button').filter(has_text='Equip').tap()
            check(key + ':tooltip-action-reachable', not page.locator('#tooltip.show').count())
            page.locator('.dp-btn').tap()
            fits(page, key + ':settings-width', '#stage > .dp-panel')
            check(key + ':settings-keeps-menu-reachable', page.locator('[data-mobile-menu]').evaluate('n=>{const r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}'))
            for i in range(3):
                page.locator('.set-panes button').nth(i).tap()
                fits(page, f'{key}:settings-pane-{i}', '#stage > .dp-panel')
            for name in ['save', 'pal']:
                page.locator(f'.dp-tabs [data-tab="{name}"]').tap()
                fits(page, f'{key}:settings-{name}', '#stage > .dp-panel')
        except Exception as error:
            check(key + ':scenario', False, str(error))
            screenshot(page, key + '-failure')
        finally:
            ctx.close()


def startup(browser):
    for width, height, lang in [(320, 568, 'en'), (390, 844, 'ko'), (844, 390, 'en')]:
        key = f'startup-{width}-{lang}'
        ctx, page = context_for(browser, width, height, admin=False)
        try:
            load(page, f'lang={lang}&skin=d2min', '.mn-btn')
            check(key + ':pregame-no-dock', not page.locator('.mobile-dock').is_visible())
            page.locator('.mn-btn').first.tap()
            check(key + ':three-candidates', page.locator('.ng-card').count() == 3)
            fits(page, key + ':candidates-width')
            count = page.locator('.ng-count').inner_text()
            page.locator('.ng-actions .btn').first.tap()
            check(key + ':reroll', page.locator('.ng-count').inner_text() != count)
            page.locator('.ng-actions .primary').tap()
            fits(page, key + ':prologue-width')
            page.locator('.pro-actions .primary').tap()
            page.locator('.pro-actions button').first.tap()
            check(key + ':prologue-back', page.locator('.pro-actions button').first.is_disabled())
            page.locator('.pro-actions button').nth(1).tap()
            page.locator('.mobile-dock').wait_for(state='visible')
            before = page.evaluate('__mobileReview.read().heroes')
            # Three selected heroes plus the game's starting goblin.
            check(key + ':game-started', len(before) == 4)
            screenshot(page, key + '-game')
            page.reload(wait_until='domcontentloaded')
            page.locator('.mn-btn').nth(1).wait_for()
            check(key + ':continue-enabled', page.locator('.mn-btn').nth(1).is_enabled())
            page.locator('.mn-btn').nth(1).tap()
            check(key + ':save-preserved', page.evaluate('__mobileReview.read().heroes') == before)
            fits(page, key + ':continued-width')
        except Exception as error:
            check(key + ':scenario', False, str(error))
            screenshot(page, key + '-failure')
        finally:
            ctx.close()


def duel(browser):
    for width, height in [(320, 568), (390, 844), (844, 390)]:
        key = f'duel-{width}x{height}'
        ctx, page = context_for(browser, width, height)
        try:
            load(page, 'dev=colosseum&skin=d2min&lang=ko', '.mobile-dock')
            reveal_mobile_panel(page, page.locator('.arena-fight'))
            page.locator('.arena-fight').tap()
            page.locator('.b-pause').wait_for()
            page.locator('.b-pause').tap()
            check(key + ':screen-fills', page.locator('#app.mobile-combat').count() == 1)
            check(key + ':stats-initially-folded', not page.locator('.arena-floor').is_visible())
            page.locator('.bt-max-btn').tap()
            check(key + ':stats-open', page.locator('.arena-floor .tdm').is_visible())
            fits(page, key + ':stats-width')
            page.locator('.arena-floor').scroll_into_view_if_needed()
            screenshot(page, key + '-stats')
            page.locator('.bt-max-btn').tap()
            check(key + ':stats-close', not page.locator('.arena-floor').is_visible())
            page.locator('[data-mobile-menu]').tap()
            check(key + ':menu-reachable', page.locator('#game-menu').is_visible())
            page.locator('.mobile-menu-close').tap()
            screenshot(page, key + '-battle')
        except Exception as error:
            check(key + ':scenario', False, str(error))
            screenshot(page, key + '-failure')
        finally:
            ctx.close()


def workflows(browser):
    for width, height in [(320,568),(390,844),(568,320),(844,390)]:
        key = f'workflow-{width}x{height}'
        ctx, page = context_for(browser,width,height)
        try:
            load(page,'dev=box&skin=d2min&lang=en','.mobile-dock')
            reveal_mobile_panel(page,page.locator('.inv-cell.box').first)
            long_press(page,page.locator('.inv-cell.box').first)
            page.locator('#tooltip .tip-touch button').first.tap()
            tab(page,'forge')
            item=page.locator('.bag .inv-cell.filled:not(.box)[data-tip]').first
            reveal_mobile_panel(page,item)
            item.tap()
            check(key+':forge-selection-opens-work', page.locator('.c-forge-col').is_visible() and bool(page.evaluate('__mobileReview.read().forgeItem')))
            page.locator('.fg-up-act .btn').scroll_into_view_if_needed()
            fits(page,key+':forge-action-fixed-screen')
            screenshot(page,key+'-forge')
            tab(page,'shop')
            item=page.locator('.bag .inv-cell.filled:not(.box)[data-tip]').first
            reveal_mobile_panel(page,item)
            item.tap()
            check(key+':sale-selection',len(page.evaluate('__mobileReview.read().sale'))==1)
            page.locator('#mobile-tab-shop-1').tap()
            check(key+':sale-preview',page.locator('.td-sale-grid .inv-cell').count()==1)
            page.locator('.td-sale > h2 .btn').tap()
            check(key+':sale-clear',len(page.evaluate('__mobileReview.read().sale'))==0)
            tab(page,'research')
            page.locator('#mobile-tab-research-0').tap()
            page.locator('button.cn-lot').first.tap()
            check(key+':building-opens-detail',page.locator('.cn-side').is_visible())
            tab(page,'resource')
            page.locator('#mobile-tab-resource-0').tap()
            page.locator('.dp-tree-cell').first.tap()
            check(key+':research-opens-detail',page.locator('.dp-wrap > .dp-side').is_visible())
            page.locator('#mobile-tab-resource-0').tap()
            page.locator('.dp-card-n').first.tap()
            check(key+':production-opens-detail',page.locator('.dp-wrap > .dp-side').is_visible())
            fits(page,key+':research-fixed-screen')
            tab(page,'help')
            page.locator('.help-search-input').fill('potion')
            check(key+':help-search',page.locator('.help-tab:not(:disabled)').count()>0 and page.locator('.help-body:visible').count()==1)
            fits(page,key+':help-fixed-screen')
            load(page,'dev=raid&skin=d2min&lang=en','.raid-page')
            start=page.locator('[data-raid-start]')
            check(key+':raid-start-reachable',start.evaluate('n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}'))
            start.tap()
            page.wait_for_timeout(8000)
            for i in range(3):
                page.locator(f'#mobile-tab-raid-parties-{i}').tap()
                check(f'{key}:raid-party-{i}',page.locator(f'[data-raid-party="{i+1}"]').is_visible())
            page.locator('[data-raid-pause]').tap()
            page.locator('[data-raid-speed]').tap()
            check(key+':raid-speed', '2' in page.locator('[data-raid-speed]').inner_text())
            page.locator('#mobile-tab-raid-0').tap()
            fits(page,key+':raid-fixed-screen')
            raid_cards = page.locator('.raid-lane.mobile-pane-on').evaluate('''lane => {
                const contribution = lane.querySelector('.raid-contribution').getBoundingClientRect();
                const cards = [...lane.querySelectorAll('.raid-hero')].map(n => n.getBoundingClientRect());
                const hpFits = [...lane.querySelectorAll('.raid-hero-hp-text')].every(n => n.scrollWidth <= n.clientWidth + 1);
                return {ok: hpFits && cards.every(r => r.bottom <= contribution.top + 1), hpFits,
                    cardsBottom: Math.max(...cards.map(r => r.bottom)), contributionTop: contribution.top};
            }''')
            check(key+':raid-cards-above-contribution', raid_cards['ok'], raid_cards)
            screenshot(page,key+'-raid')
            page.locator('[data-raid-retreat]').tap()
            check(key+':raid-result',page.locator('.raid-result').is_visible())
            screenshot(page,key+'-raid-result')
        except Exception as error:
            check(key+':scenario',False,str(error))
            screenshot(page,key+'-failure')
        finally:
            ctx.close()


def fixed(browser):
    for width, height, lang, skin in [(320,568,'en','d2min'), (390,844,'ko','d2min'),
                                     (430,932,'en','now'), (568,320,'ko','d2min'),
                                     (844,390,'en','now'), (768,1024,'ko','d2min')]:
        key = f'fixed-{width}x{height}-{lang}-{skin}'
        ctx, page = context_for(browser, width, height)
        try:
            load(page, f'dev=play&skin={skin}&lang={lang}', '.b-pause')
            page.wait_for_timeout(6000)
            page.locator('.b-pause').tap()
            fits(page, key + ':battle-screen')
            arena = battle_geometry(page)
            check(key + ':battle-no-scroll', arena['ok'], arena)
            screenshot(page, key + '-battle')
            page.locator('.bt-max-btn').tap()
            fits(page, key + ':battle-inventory')
            check(key + ':inventory-replaces-battle', not page.locator('.battle-panel').is_visible())
            page.locator('.bt-max-btn').tap()
            for name in ['expedition','explore','party','character','research','tavern','shop','forge','library','resource','colosseum','arena','codex','help','lab']:
                tab(page,name)
                dismiss_tutorials(page)
                buttons = page.locator('.main .mobile-pages > button')
                for index in range(max(1, buttons.count())):
                    dismiss_tutorials(page)
                    if buttons.count():
                        if not buttons.nth(index).is_visible(): continue
                        buttons.nth(index).tap()
                    fits(page, f'{key}:{name}-{index}-screen')
                    if buttons.count():
                        panes = page.locator('.main .mobile-pane-on:visible').evaluate_all('''nodes=>{
                            const main=document.querySelector('.main').getBoundingClientRect();
                            return nodes.map(n=>{const r=n.getBoundingClientRect();return {height:r.height,ok:r.height>=40&&r.top>=main.top-1&&r.bottom<=main.bottom+1&&n.scrollWidth<=n.clientWidth+2}});
                        }''')
                        decks = page.locator('.main .mobile-pages:visible').evaluate_all('nodes=>nodes.every(n=>n.querySelectorAll(\'[aria-selected="true"]\').length===1)')
                        check(f'{key}:{name}-{index}-pane', bool(panes) and all(p['ok'] for p in panes) and decks, panes)
                    check(f'{key}:{name}-{index}-menu', page.locator('[data-mobile-menu]').evaluate('n=>{const r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}'))
                if width==390:
                    if buttons.count(): buttons.first.tap()
                    page.wait_for_timeout(1000)
                    screenshot(page, key + '-' + name)
            page.locator('[data-mobile-menu]').tap()
            screenshot(page, key + '-menu')
            fits(page, key + ':menu', '#game-menu')
        except Exception as error:
            check(key + ':scenario', False, str(error))
            screenshot(page, key + '-failure')
        finally:
            ctx.close()


def panels(browser):
    for width, height, lang, skin in [(390, 844, 'ko', 'd2min'), (320, 568, 'en', 'd2min'), (844, 390, 'en', 'now')]:
        key = f'panels-{width}-{lang}-{skin}'
        ctx, page = context_for(browser, width, height)
        try:
            load(page, f'dev=box&lang={lang}&skin={skin}', '.mobile-dock')
            for name, selector in [('codex', '.main .cx-tabs > button'), ('forge', '.main .fg-tabs > button')]:
                tab(page, name)
                count = page.locator(selector).count()
                for i in range(count):
                    if name == 'codex': page.locator('select[data-mobile-select="codex-category"]').select_option(str(i))
                    else: page.locator(selector).nth(i).tap()
                    page.wait_for_timeout(150)
                    fits(page, f'{key}:{name}-{i}')
                    if width == 390:
                        screenshot(page, f'{key}-{name}-{i}')
            tab(page, 'character')
            links = page.locator('.mobile-pages button')
            check(key + ':section-tabs', links.count() == 6)
            for i in range(links.count()):
                links.nth(i).tap()
                target = links.nth(i).get_attribute('aria-controls')
                check(f'{key}:section-{i}', page.locator('#' + target).is_visible() and page.locator('.main .mobile-pane-on').count() == 1)
                fits(page, f'{key}:section-{i}-fixed')
            tab(page, 'party')
            tutorial = page.locator('.tutorial-card button')
            if tutorial.count():
                tutorial.first.tap()
            for i in range(page.locator('.fm-tpl').count()):
                page.locator('.fm-tpl').nth(i).tap()
                check(f'{key}:formation-template-{i}', 'on' in page.locator('.fm-tpl').nth(i).get_attribute('class'))
            for _ in range(8):
                tutorial = page.locator('.tutorial-card button')
                if not tutorial.count():
                    break
                tutorial.first.tap()
            cells = page.locator('.fm-cell.filled')
            check(key + ':formation-populated', cells.count() >= 2)
            if cells.count() >= 2:
                page.locator('.fm-board').scroll_into_view_if_needed()
                first, second = cells.nth(0).bounding_box(), cells.nth(1).bounding_box()
                x0, y0 = first['x'] + first['width'] / 2, first['y'] + first['height'] / 2
                x1, y1 = second['x'] + second['width'] / 2, second['y'] + second['height'] / 2
                before = page.evaluate('__mobileReview.read().formation')
                session = ctx.new_cdp_session(page)
                session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x0, 'y': y0}]})
                for step in range(1, 9):
                    session.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x0 + (x1-x0)*step/8, 'y': y0 + (y1-y0)*step/8}]})
                    page.wait_for_timeout(25)
                session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                session.detach()
                check(key + ':formation-touch-drag', page.evaluate('__mobileReview.read().formation') != before)
            screenshot(page, key + '-formation')
        except Exception as error:
            check(key + ':scenario', False, str(error))
            screenshot(page, key + '-failure')
        finally:
            ctx.close()
    ctx, page = context_for(browser, admin=False)
    try:
        load(page, 'dev=box&skin=d2min', '.mobile-dock')
        current = page.evaluate('__mobileReview.read().tab')
        page.locator('[data-mobile-menu]').tap()
        locked = page.locator('.nav [data-tab].dim').first
        check('locked-menu-exists', locked.count() == 1)
        # aria-disabled announces the lock; the game still accepts a tap to explain it.
        locked.scroll_into_view_if_needed()
        rect = locked.bounding_box()
        page.touchscreen.tap(rect['x'] + rect['width']/2, rect['y'] + rect['height']/2)
        check('locked-menu-does-not-navigate', page.evaluate('__mobileReview.read().tab') == current)
        check('locked-menu-remains-open', page.locator('#game-menu').get_attribute('aria-modal') == 'true')
        screenshot(page, 'locked-menu')
    except Exception as error:
        check('locked-menu-scenario', False, str(error))
    finally:
        ctx.close()


def variants(browser):
    queries = [('expedition', 'dev=play'), ('rear', 'dev=colosseum&tpl=0-3'),
               ('mixed', 'dev=colosseum&tpl=1-2'), ('front', 'dev=colosseum&tpl=2-1'),
               ('lab', 'dev=play&tab=lab&lab=duel')]
    for lang in ['ko','en']:
        for name, query in queries:
            key = f'variant-{name}-{lang}'
            ctx, page = context_for(browser,568,320)
            try:
                load(page,query+f'&lang={lang}&skin=d2min','.mobile-dock')
                if name in ['rear','mixed','front']:
                    reveal_mobile_panel(page,page.locator('.arena-fight'))
                    page.locator('.arena-fight').tap()
                page.locator('.b-pause').wait_for()
                page.wait_for_timeout(6000)
                page.locator('.b-pause').tap()
                arena=battle_geometry(page)
                check(key+':arena-contained',arena['ok'],arena)
                fits(page,key+':screen-fixed')
                screenshot(page,key)
            except Exception as error:
                check(key+':scenario',False,str(error))
                screenshot(page,key+'-failure')
            finally:
                ctx.close()


def minigames(browser):
    for width, height in [(320,568), (390,844), (568,320), (844,390)]:
        for kind, selector in [('mine','.mg-cell'), ('gather','.mg-pluck-action'), ('log','.mg-chop-control')]:
            key = f'minigame-{kind}-{width}x{height}'
            ctx, page = context_for(browser, width, height)
            try:
                load(page, f'dev=mg&mg={kind}&skin=d2min&lang=en', '.mg-go')
                dismiss_tutorials(page)
                page.locator('.mg-go').tap()
                page.wait_for_timeout(3000)
                field = geometry(page, '.mg-field')
                check(key + ':field-contained', field['left']>=0 and field['right']<=width+1 and field['top']>=0 and field['bottom']<=height+1 and field['scrollHeight']<=field['height']+2, field)
                check(key + ':controls-contained', page.locator(selector).evaluate_all('nodes=>nodes.length>0&&nodes.every(n=>{const r=n.getBoundingClientRect(),p=n.closest(".mg-field").getBoundingClientRect();return r.width>=40&&r.height>=30&&r.top>=p.top&&r.bottom<=p.bottom&&r.left>=p.left&&r.right<=p.right})'))
                before = page.evaluate('__mobileReview.read().minigame.inputs')
                if kind == 'gather':
                    page.wait_for_function('!document.querySelector(".mg-pluck-action")?.disabled')
                    target = page.locator(selector).bounding_box()
                    session = ctx.new_cdp_session(page)
                    session.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':target['x']+target['width']/2,'y':target['y']+target['height']/2}]})
                    page.wait_for_timeout(450)
                    session.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
                else:
                    page.locator(selector).first.tap()
                check(key + ':touch-input-recorded', page.evaluate('__mobileReview.read().minigame.inputs') > before)
                screenshot(page, key)
                check(key + ':close-visible', page.locator('.mg-modal .modal-x').is_visible())
                page.locator('.mg-modal .modal-x').tap()
                check(key + ':closed', not page.locator('.mg-modal').count())
            except Exception as error:
                check(key + ':scenario', False, str(error))
                screenshot(page, key + '-failure')
            finally:
                ctx.close()


def journeys(browser):
    for width, height in [(320,568), (390,844), (568,320), (844,390)]:
        key = f'journeys-{width}x{height}'
        ctx, page = context_for(browser, width, height)
        try:
            load(page, 'dev=explore&party=full&skin=d2min&lang=en', '.ex-pop')
            dismiss_tutorials(page)
            fits(page, key + ':explore-fixed')
            check(key + ':explore-popup-bounds', page.locator('.ex-pop').evaluate('n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth}'))
            check(key + ':explore-claim', page.locator('.ex-take').is_visible())
            page.locator('.ex-take').tap()
            check(key + ':explore-claimed', page.locator('.ex-take').count() == 0)
            page.locator('.ex-pop .modal-x').tap()
            spots = page.locator('.mobile-explore-spots .ex-spot')
            check(key + ':touchable-locations', spots.evaluate_all('nodes=>nodes.length>=15&&nodes.filter(n=>!n.classList.contains("mobile-group-hidden")).every(n=>{const r=n.getBoundingClientRect();return r.width>=44&&r.height>=44})'))
            screenshot(page, key + '-map')
            spots.first.tap()
            page.locator('.ex-squads button').first.tap()
            page.locator('.ex-go').tap()
            check(key + ':explore-send', page.locator('.ex-cancel').is_visible())
            page.locator('.ex-cancel').tap()
            check(key + ':recall-confirmation', 'danger' in page.locator('.ex-cancel').get_attribute('class'))
            page.locator('.ex-cancel').tap()
            check(key + ':recall-complete', page.locator('.ex-cancel').count() == 0)
            screenshot(page, key + '-explore-detail')
            page.locator('.ex-pop .modal-x').tap()
            # The exploration fixture intentionally splits the starting roster;
            # use a fresh local save for the three-member rated-duel fixture.
            ctx.close()
            ctx, page = context_for(browser, width, height)
            load(page, 'dev=arena&ghosts=1&party=full&ps=1&skin=d2min&lang=en', '.ar-cand')
            dismiss_tutorials(page)
            page.locator('.ar-cand.on').tap()
            check(key + ':same-opponent-opens-prepare', page.locator('.arena-main.mobile-pane-on').is_visible())
            page.locator('#mobile-tab-arena-0').tap()
            page.locator('.ar-cand:not(.on)').first.tap()
            check(key + ':new-opponent-opens-prepare', page.locator('.arena-main.mobile-pane-on').is_visible())
            page.locator('.arena-fight').tap()
            page.wait_for_selector('.bt-max-btn')
            check(key + ':rated-duel-start', page.locator('.battle-panel').is_visible())
            fits(page, key + ':rated-duel-fixed')
            page.locator('.bt-max-btn').tap()
            check(key + ':duel-statistics', page.locator('.mobile-detail-scroll').is_visible())
            check(key + ':no-placeholder-bag-tabs', page.locator('#mobile-tab-battle-bags-0').count() == 0)
            page.locator('[data-tdm="cols"]').tap()
            check(key + ':skill-statistics', page.locator('.tdm-cols').count() == 2 and page.locator('.tdm-hero').count() == 6)
            detail = geometry(page, '.mobile-detail-scroll')
            check(key + ':skill-statistics-width', detail['scroll'] <= detail['width'] + 2, detail)
            screenshot(page, key + '-duel-stats')
            page.locator('.bt-max-btn').tap()
            check(key + ':duel-return', page.locator('.battle-panel').is_visible())
        except Exception as error:
            check(key + ':scenario', False, str(error))
            screenshot(page, key + '-failure')
        finally:
            ctx.close()


def reports(browser):
    for width, height, lang, skin in [(320,568,'en','d2min'), (390,844,'ko','d2min'), (568,320,'en','now'), (844,390,'ko','d2min')]:
        key = f'reports-{width}x{height}-{lang}'
        ctx, page = context_for(browser, width, height)
        try:
            load(page, f'dev=battle&runs=5&lang={lang}&skin={skin}', '.rep-detail')
            dismiss_tutorials(page)
            check(key + ':results-default', page.locator('.rep-detail.mobile-pane-on').is_visible())
            fits(page, key + ':fixed-screen')
            detail = geometry(page, '.rep-detail')
            check(key + ':no-horizontal-scroll', detail['scroll'] <= detail['width'] + 2, detail)
            check(key + ':contribution-labels', page.locator('.rep-ct .ct-row:not(.head):not(.pad) [data-mobile-label]').count() >= 8)
            page.locator('#mobile-tab-reports-0').tap()
            count = page.locator('.rep-run').count()
            check(key + ':run-history', count >= 2, count)
            page.locator('.rep-run').last.tap()
            check(key + ':pick-opens-result', page.locator('.rep-detail.mobile-pane-on').is_visible())
            screenshot(page, key + '-top')
            page.locator('.rep-detail').evaluate('n=>n.scrollTop=n.scrollHeight')
            screenshot(page, key + '-contribution')
            check(key + ':result-end-reachable', page.locator('.rep-foes').evaluate('n=>{const r=n.getBoundingClientRect();return r.bottom<=innerHeight&&r.top>=0}'))
            page.locator('#mobile-tab-reports-0').tap()
            check(key + ':history-return', page.locator('.rep-runs.mobile-pane-on').is_visible())
            fits(page, key + ':history-fixed')
        except Exception as error:
            check(key + ':scenario', False, str(error))
            screenshot(page, key + '-failure')
        finally:
            ctx.close()


def edges(browser):
    """Smallest supported screens: fixed modal actions, lab tools, and rotation."""
    for width, height in [(320, 568), (568, 320)]:
        key = f'edges-{width}x{height}'
        ctx, page = context_for(browser, width, height)
        try:
            for name, query in [('depart', 'dev=form&party=full'), ('skills', 'dev=tree&adv=1')]:
                load(page, query + '&lang=en&skin=d2min', '.modal-box')
                dismiss_tutorials(page)
                tabs = page.locator('.modal-box .mobile-pages > button')
                for i in range(tabs.count()):
                    tabs.nth(i).tap()
                    dismiss_tutorials(page)
                    panel = page.locator('#' + tabs.nth(i).get_attribute('aria-controls'))
                    bounds = panel.bounding_box()
                    check(f'{key}:{name}-pane-{i}', bounds and bounds['height'] >= 50 and bounds['y'] + bounds['height'] <= height + 1, bounds)
                    check(f'{key}:{name}-close-{i}', page.locator('.modal-box .modal-x').evaluate('n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest(".modal-x")===n}'))
                if name == 'depart':
                    check(key + ':fixed-departure-action', page.locator('.form-actions').evaluate('n=>{const r=n.getBoundingClientRect();return r.bottom<=innerHeight&&r.top>0}'))
                screenshot(page, key + '-' + name)
                page.locator('.modal-box .modal-x').tap()
            load(page, 'dev=play&tab=party&lang=en&skin=d2min', '.mobile-dock')
            dismiss_tutorials(page)
            for i in range(page.locator('.fm-tpl').count()):
                page.locator('.fm-tpl').nth(i).tap()
                dismiss_tutorials(page)
                check(f'{key}:formation-{i}', page.locator('.fm-cell').evaluate_all('nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();const p=n.closest(".mobile-pane").getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom+1})'))
            screenshot(page, key + '-formation')
            load(page, 'dev=play&tab=lab&lab=duel&lang=en&skin=d2min', '.bt-max-btn')
            page.locator('.bt-max-btn').tap()
            check(key + ':lab-tools-visible', page.locator('.lab-duel-bar').is_visible() and page.locator('[data-lab-tools]').is_visible())
            resist = page.locator('.lab-duel-bar [aria-pressed]')
            before = resist.get_attribute('aria-pressed')
            resist.tap()
            check(key + ':lab-resistance-toggle', resist.get_attribute('aria-pressed') != before)
            page.locator('.lab-duel-bar button').first.tap()
            check(key + ':lab-reroll-keeps-tools', page.locator('.mobile-battle-back').is_visible())
            screenshot(page, key + '-lab-tools')
            page.locator('.bt-max-btn').tap()
            fits(page, key + ':lab-return-fixed')
            check(key + ':lab-arena-fixed', battle_geometry(page)['ok'])
            page.locator('.bt-max-btn').tap()
            tools = page.locator('[data-lab-tools] button')
            tools.first.tap()
            check(key + ':lab-switch-item', page.locator('.lab-item').is_visible())
            tab(page, 'character')
            tabs = page.locator('.main .mobile-pages > button')
            tabs.first.focus()
            page.keyboard.press('End')
            check(key + ':local-tab-keyboard', tabs.last.get_attribute('aria-selected') == 'true' and tabs.last.evaluate('n=>n===document.activeElement'))
            check(key + ':inactive-panes-inert', page.locator('.main .mobile-pane:not(.mobile-pane-on)').evaluate_all('nodes=>nodes.every(n=>n.inert)'))
            page.set_viewport_size({'width': height, 'height': width})
            page.wait_for_timeout(200)
            check(key + ':rotation-retains-local-tab', page.locator('.main .mobile-pages > button').last.get_attribute('aria-selected') == 'true')
            fits(page, key + ':rotation-fixed')
        except Exception as error:
            check(key + ':scenario', False, str(error))
            screenshot(page, key + '-failure')
        finally:
            ctx.close()


def preview(browser):
    ctx, page = context_for(browser, 1600, 1000, touch=False)
    try:
        load(page, 'dev=play&lang=ko&skin=d2min', '.b-pause')
        page.locator('.b-pause').click()
        before = page.evaluate('__mobileReview.read()')
        page.locator('.dp-btn').click()
        page.locator('.set-panes button').nth(1).click()
        page.locator('[data-layout="mobile"]').click()
        check('preview:settings-description', page.locator('.set-preview-note').is_visible())
        page.locator('.dp-x').click()
        baseline = None
        for width, height in [(1600,1000),(2560,1440),(1280,720),(800,600),(350,950),(568,320),(300,400)]:
            key = f'preview-{width}x{height}'
            page.set_viewport_size({'width':width,'height':height})
            page.wait_for_timeout(200)
            dimensions = page.locator('#stage').evaluate('''n => {
                const r=n.getBoundingClientRect();
                return {width:n.offsetWidth,height:n.offsetHeight,left:r.left,top:r.top,right:r.right,bottom:r.bottom,ratio:r.width/r.height};
            }''')
            check(key+':fixed-logical-size', dimensions['width']==390 and dimensions['height']==844, dimensions)
            check(key+':fits-host', dimensions['left']>=-1 and dimensions['top']>=-1 and dimensions['right']<=width+1 and dimensions['bottom']<=height+1)
            check(key+':portrait', not page.locator('html').evaluate('n=>n.hasAttribute("data-mobile-landscape")'))
            check(key+':ratio', abs(dimensions['ratio']-390/844)<0.001)
            # Compare layout, typography and control sizes in stage coordinates.
            signature = page.evaluate('''() => {
                const stage=document.querySelector('#stage').getBoundingClientRect(), scale=stage.width/390;
                return ['.main','.mobile-dock','.battle-head','.arena','.mobile-nav-item'].map(sel=>{
                    const n=document.querySelector(sel),r=n.getBoundingClientRect(),s=getComputedStyle(n);
                    return [sel,...[r.left-stage.left,r.top-stage.top,r.width,r.height].map(v=>Math.round(v/scale)),s.fontSize];
                });
            }''')
            if baseline is None: baseline=signature
            check(key+':same-layout', signature==baseline,signature)
            page.locator('[data-mobile-menu]').click()
            check(key+':menu-reachable',page.locator('.mobile-menu-close').is_visible())
            page.locator('.nav [data-tab="character"]').click()
            page.locator('#mobile-tab-character-4').click()
            check(key+':panel-switch',page.locator('#mobile-tab-character-4').get_attribute('aria-selected')=='true')
            page.locator('.tab-seg button').first.click()
            page.locator('.dp-btn').click()
            check(key+':settings-reachable',page.locator('.set-layout').is_visible())
            screenshot(page,key+'-settings')
            page.locator('.dp-x').click()
            screenshot(page,key+'-battle')
            guide = page.evaluate('''async () => {
                const {createTutorial}=await import('./ui/tutorial.js');
                const target=document.querySelector('.mobile-dock button:last-child');
                const guide=createTutorial({read:()=>({owner:'preview-check',context:'preview',steps:[{id:'preview-check',target}]}),
                    describe:()=>({title:'Menu',detail:'Open the game menu.',closeLabel:'OK'}),readSeen:()=>[],writeSeen:()=>{}});
                guide.refresh();
                const r=document.querySelector('[data-tutorial="preview-check"]').getBoundingClientRect();
                const s=document.querySelector('#stage').getBoundingClientRect();
                const fits=r.left>=s.left && r.top>=s.top && r.right<=s.right && r.bottom<=s.bottom;
                guide.destroy();return fits;
            }''')
            check(key+':guide-inside-preview',guide)
        after=page.evaluate('__mobileReview.read()')
        check('preview:no-game-reset', before['heroes']==after['heroes'] and after['time']>=before['time'],
              {'timeBefore':before['time'],'timeAfter':after['time'],'sameHeroes':before['heroes']==after['heroes']})
        page.locator('.dp-btn').click()
        page.locator('[data-layout="desktop"]').click()
        check('preview:desktop-restored',not page.locator('html').evaluate('n=>n.hasAttribute("data-mobile-preview")'))
        page.locator('[data-layout="mobile"]').click()
        page.evaluate("history.replaceState(null,'','?tab=character&lang=ko&skin=d2min')")
        page.reload(wait_until='domcontentloaded')
        page.locator('.mobile-dock').wait_for()
        check('preview:reload-persists',page.locator('html').evaluate('n=>n.hasAttribute("data-mobile-preview")'))
    except Exception as error:
        check('preview:scenario',False,str(error))
        screenshot(page,'preview-failure')
    finally:
        ctx.close()
    for width,height in [(390,844),(844,390)]:
        ctx,page=context_for(browser,width,height)
        ctx.add_init_script("localStorage.setItem('thesevensim.screenLayout','mobile')")
        try:
            load(page,'dev=play&lang=en&skin=d2min','.b-pause')
            check(f'preview:touch-{width}-native',page.locator('#stage').evaluate('n=>[n.offsetWidth,n.offsetHeight]')==[width,height])
            check(f'preview:touch-{width}-no-frame',not page.locator('html').evaluate('n=>n.hasAttribute("data-mobile-preview")'))
            session=ctx.new_cdp_session(page)
            session.send('Emulation.setPageScaleFactor',{'pageScaleFactor':1.5})
            page.wait_for_timeout(150)
            check(f'preview:touch-{width}-pinch-keeps-layout',page.locator('#stage').evaluate('n=>[n.offsetWidth,n.offsetHeight]')==[width,height])
            session.detach()
        finally:
            ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    if args.section in ['all', 'preview']:
        preview(browser)
    if args.section in ['all', 'core']:
        core_context, page = context_for(browser, 1600, 900, touch=False)
        page.on('pageerror', lambda error: exceptions.append(str(error)))
        try:
            page.goto(BASE + '/dev/test.html', wait_until='domcontentloaded')
            page.wait_for_function("/^(PASS|FAIL) /.test(document.title)", timeout=180000)
            check('game-logic-regression', page.title().startswith('PASS'),
                  {'title': page.title(), 'failures': page.locator('#out li.fail').all_text_contents()})
        except Exception as error:
            check('game-logic-regression', False, {'error': str(error), 'browser_errors': exceptions,
                  'failures': page.locator('#out li.fail').all_text_contents()})
        core_context.close()
    if args.section in ['all', 'matrix']:
        matrix(browser)
    if args.section in ['all', 'fixed']:
        fixed(browser)
    if args.section in ['all', 'workflows']:
        workflows(browser)
    if args.section in ['all', 'edges']:
        edges(browser)
    if args.section in ['all', 'reports']:
        reports(browser)
    if args.section in ['all', 'journeys']:
        journeys(browser)
    if args.section in ['all', 'minigames']:
        minigames(browser)
    if args.section in ['all', 'variants']:
        variants(browser)
    if args.section in ['all', 'dialogs']:
        dialogs(browser)
    if args.section in ['all', 'touch']:
        touch(browser)
    if args.section in ['all', 'panels']:
        panels(browser)
    if args.section in ['all', 'duel']:
        duel(browser)
    if args.section in ['all', 'startup']:
        startup(browser)
    if args.section in ['all', 'layout']:
        layout(browser)
    if args.section in ['all', 'desktop']:
        desktop(browser)
    if args.section in ['all', 'preference']:
        preference(browser)
    browser.close()
check('browser-exceptions', not exceptions, exceptions)
report = {'rules_source': 'git HEAD (diagnostic isolation)' if baseline else 'working tree',
          'started_at': started_at, 'finished_at': datetime.now(timezone.utc).isoformat(),
          'source_fingerprints_start': source_start, 'source_fingerprints_end': source_fingerprints(),
          'checks': checks, 'passed': sum(c['ok'] for c in checks), 'total': len(checks)}
(OUT / f'{args.section}-results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(f"{'PASS' if all(c['ok'] for c in checks) else 'FAIL'} {report['passed']}/{report['total']}", flush=True)
raise SystemExit(0 if all(c['ok'] for c in checks) else 1)
