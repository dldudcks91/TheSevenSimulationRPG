"""Verify Trading House ranks, material purchases and the full browser regression suite."""
import argparse
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tmp/trade_post_review'
HARNESS = r'''
window.__tradeReview = {
    G: () => G, SYS, state, render,
    setup(rank = 2) {
        G.buildings.shop = rank;
        G.resources.gold = 0;
        G.materials = {iron_ore:0, herb:2, timber:6, dust:3};
        state.heroUid = G.heroes[0].uid;
        state.tab = 'shop'; state.shopTrade = null;
        writeTutorialSeen(tutorialOwner(), ['expedition', 'loot', 'mastery', 'potions', 'construction']);
        tutorial.reset(); render();
        return this.snapshot();
    },
    snapshot() { return {materials:{...G.materials}, gold:G.resources.gold, counters:{...G.counters}, shop:G.shop}; },
    rank(n) { G.buildings.shop=n; render(); },
    roundtrip() {
        const g=SYS.game.deserialize(SYS.game.serialize(G,now()));
        return JSON.stringify(g.materials)===JSON.stringify(G.materials);
    },
};
'''


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8843)
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    checks, errors = [], []
    result = {'checks': checks, 'errors': errors}

    def check(name, condition):
        checks.append({'name': name, 'ok': bool(condition)})
        if not condition:
            raise AssertionError(name)

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(channel='msedge', headless=True)
            regression = browser.new_page()
            regression.on('pageerror', lambda e: errors.append(str(e)))
            regression.goto(f'http://127.0.0.1:{args.port}/dev/test.html')
            regression.wait_for_function('/PASS|FAIL/.test(document.title)', timeout=180000)
            result['regression'] = {
                'title': regression.title(),
                'failures': regression.locator('#out li.fail').all_text_contents(),
            }
            regression.close()
            for skin, lang, width, height in [
                ('d2min', 'ko', 1600, 900), ('now', 'en', 1600, 900),
                ('d2min', 'ko', 1366, 768), ('now', 'en', 1366, 768),
            ]:
                prefix = f'{skin}-{lang}-{width}'
                context = browser.new_context(viewport={'width': width, 'height': height})
                context.route('https://**', lambda route: route.abort())
                context.route('**/ui/app.js', lambda route: route.fulfill(
                    status=200, content_type='text/javascript',
                    body=(ROOT/'src/ui/app.js').read_text(encoding='utf-8') + HARNESS))
                page = context.new_page()
                page.on('pageerror', lambda e: errors.append(str(e)))
                page.goto(f'http://127.0.0.1:{args.port}/index.html?dev=newgame&lang={lang}&skin={skin}', wait_until='networkidle')
                page.wait_for_function('globalThis.__tradeReview?.G()?.heroes?.length > 0')
                page.evaluate('() => __tradeReview.setup(1)')
                check(prefix + ': rank 1 locks trading until rank 2',
                      page.locator('.td-trade .lock-veil').count() == 1
                      and page.locator('.td-trade-item').count() == 0
                      and '2' in page.locator('.td-trade .lock-veil').inner_text())
                page.evaluate('() => __tradeReview.rank(2)')
                check(prefix + ': rank 2 opens four materials with no placeholder or payment rows',
                      page.locator('.td-trade-item').count() == 4
                      and page.locator('.td-trade-offer').count() == 0
                      and page.locator('.td-trade .todo-badge').count() == 0)
                check(prefix + ': rank 2 retains locked armor and blueprints',
                      page.locator('.td-stock .td-lock').count() > 0)
                before = page.evaluate('() => __tradeReview.snapshot()')
                target = '[data-trade-id="iron_ore"]'
                page.locator(target).click()
                check(prefix + ': selecting an item spends nothing and reveals other currencies',
                      page.evaluate('() => __tradeReview.snapshot()') == before
                      and page.locator('.td-trade-offer').count() == 4
                      and page.locator('[data-trade-pay="iron_ore"]').count() == 0
                      and page.locator(target).get_attribute('aria-pressed') == 'true')
                check(prefix + ': insufficient stock disables only that currency',
                      page.locator('[data-trade-pay="herb"] button').is_disabled()
                      and page.locator('[data-trade-pay="gold"] button').is_disabled()
                      and page.locator('[data-trade-pay="timber"] button').is_enabled()
                      and page.locator('[data-trade-pay="dust"] button').is_enabled())
                check(prefix + ': price shows owned amount before required amount',
                      page.locator('[data-trade-pay="timber"] .td-price').inner_text() == '6 / 3')
                page.locator('[data-trade-pay="timber"] button').click()
                after = page.evaluate('() => __tradeReview.snapshot()')
                check(prefix + ': buying spends three payment materials and receives one selected material',
                      after['materials'] == {'iron_ore': 1, 'herb': 2, 'timber': 3, 'dust': 3}
                      and after['gold'] == before['gold'] and after['counters'] == before['counters']
                      and after['shop'] == before['shop'])
                check(prefix + ': buying preserves selection and updates displayed stock',
                      page.locator(target).get_attribute('aria-pressed') == 'true'
                      and page.locator(target + ' .inv-lv').inner_text() == '1'
                      and page.locator('[data-trade-pay="timber"] .td-price').inner_text() == '3 / 3')
                page.locator('[data-trade-pay="timber"] button').click()
                check(prefix + ': exact stock can be spent once and then disables the button',
                      page.locator('[data-trade-pay="timber"] button').is_disabled()
                      and page.evaluate('() => __tradeReview.G().materials.timber') == 0)
                page.locator('[data-trade-pay="dust"] button').click()
                check(prefix + ': dust uses the same material wallet and purchases survive save roundtrip',
                      page.evaluate('() => __tradeReview.G().materials.iron_ore === 3 && __tradeReview.G().materials.dust === 0 && __tradeReview.roundtrip()'))
                page.mouse.move(width - 5, 5)
                page.screenshot(path=str(OUT / f'{prefix}-selected.png'))
                check(prefix + ': panel content has no horizontal overflow and purchase actions fit',
                      page.locator('.td-trade .box-body').evaluate('n => n.scrollWidth <= n.clientWidth + 1')
                      and page.locator('.td-trade-offer').evaluate_all('rows => rows.every(n => {const b=n.getBoundingClientRect(),a=n.querySelector("button").getBoundingClientRect();return a.left>=b.left && a.right<=b.right;})')
                      and page.evaluate('document.body.scrollWidth <= innerWidth'))
                bought = page.evaluate('() => __tradeReview.snapshot()')
                page.locator(target).focus()
                page.keyboard.press('Enter')
                check(prefix + ': keyboard deselection hides payment rows without spending',
                      page.locator('.td-trade-offer').count() == 0
                      and page.evaluate('() => __tradeReview.snapshot()') == bought)
                page.locator('[data-trade-id="timber"]').focus()
                page.keyboard.press('Space')
                check(prefix + ': keyboard target change recalculates payment choices',
                      page.locator('[data-trade-id="timber"]').get_attribute('aria-pressed') == 'true'
                      and page.locator('[data-trade-pay="iron_ore"] button').is_enabled())
                page.evaluate('() => { const a=__tradeReview; a.G().resources.gold=100; a.render(); }')
                check(prefix + ': gold offer displays price and enables with exact gold',
                      page.locator('[data-trade-pay="gold"] .td-price').inner_text() == '100 G'
                      and page.locator('[data-trade-pay="gold"] button').is_enabled())
                before_gold = page.evaluate('() => __tradeReview.snapshot()')
                page.locator('[data-trade-pay="gold"] button').click()
                gold_purchase = page.evaluate('() => __tradeReview.snapshot()')
                check(prefix + ': gold purchase spends only gold and adds the selected material',
                      gold_purchase['gold'] == 0
                      and gold_purchase['materials'] == {**before_gold['materials'], 'timber': 1}
                      and gold_purchase['counters'] == before_gold['counters']
                      and gold_purchase['shop'] == before_gold['shop']
                      and page.locator('[data-trade-pay="gold"] button').is_disabled()
                      and page.evaluate('() => __tradeReview.roundtrip()'))
                page.evaluate('() => { const a=__tradeReview; a.G().resources.gold=200; a.render(); }')
                page.locator('[data-trade-id="herb"]').click()
                check(prefix + ': herbs use their own gold price',
                      page.locator('[data-trade-pay="gold"] .td-price').inner_text() == '200 G'
                      and page.locator('[data-trade-pay="gold"] button').is_enabled())
                page.mouse.move(width - 5, 5)
                page.screenshot(path=str(OUT / f'{prefix}-gold.png'))
                page.evaluate('() => __tradeReview.rank(3)')
                check(prefix + ': rank 3 unlocks all normal sales', page.locator('.td-stock .td-lock').count() == 0)
                context.close()
            browser.close()
        check('No browser runtime errors', not errors)
        print(json.dumps({'regression': result['regression'], 'ui_checks': len(checks), 'errors': errors}, ensure_ascii=False))
        if result['regression']['failures']:
            raise SystemExit(1)
    finally:
        (OUT/'verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
