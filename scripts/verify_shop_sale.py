"""Exercise shop sale selection, gold settlement, storage controls and layout."""
import argparse
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/2026-10-30_shop_sale'
HARNESS = r'''
globalThis.__saleReview = {
    get G() { return G; }, get state() { return state; }, get SYS() { return SYS; },
    render, loadSave,
    setup() {
        G.buildings.shop = 4;
        G.resources.gold = 1000000;
        G.bags = G.bags.map(() => []);
        G.stash = [];
        const base = SYS.game.shopState(G, now()).equip[0].item;
        const add = (uid, rarity, ilvl, where, extra = {}) => {
            G.items[uid] = { ...JSON.parse(JSON.stringify(base)), uid, rarity, ilvl, ...extra };
            where.push(uid);
        };
        add('sale-normal', 'normal', 1, G.bags[0]);
        add('sale-rare', 'rare', 11, G.bags[0]);
        add('sale-locked', 'magic', 1, G.bags[0], { locked: true });
        add('sale-stash', 'magic', 1, G.stash);
        state.heroUid = G.heroes[0].uid;
        G.heroes[0].level = 50;
        state.tab = 'shop'; state.invNo = 1; state.shopSell.clear();
        clearBagSel();
        writeTutorialSeen(tutorialOwner(), ['expedition', 'loot', 'mastery', 'potions', 'construction']);
        tutorial.reset();
        render();
        return this.snapshot();
    },
    snapshot() {
        return { gold:G.resources.gold, bags:G.bags, stash:G.stash,
            worn:JSON.stringify(G.heroes.map(h => h.equipped)),
            selected:[...state.shopSell], quote:SYS.game.shopSellPreview(G,[...state.shopSell]),
            prices:Object.fromEntries(['sale-normal','sale-rare','sale-stash'].map(uid => [uid,SYS.game.shopSellGold(G.items[uid])])) };
    }
};
'''


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8832)
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    checks, errors = [], []

    def check(name, condition):
        checks.append({'name': name, 'ok': bool(condition)})
        if not condition:
            raise AssertionError(name)

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(channel='msedge', headless=True)
            for skin, lang, width, height in [('d2min', 'ko', 1600, 900), ('now', 'en', 1600, 900), ('d2min', 'ko', 1366, 768)]:
                prefix = f'{skin}-{lang}-{width}'
                context = browser.new_context(viewport={'width': width, 'height': height})
                context.route('https://**', lambda route: route.abort())
                context.route('**/ui/app.js', lambda route: route.fulfill(status=200, content_type='text/javascript', body=(ROOT/'src/ui/app.js').read_text(encoding='utf-8') + HARNESS))
                page = context.new_page()
                page.set_default_timeout(10000)
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(f'http://127.0.0.1:{args.port}/index.html?dev=newgame&lang={lang}&skin={skin}', wait_until='networkidle')
                page.wait_for_function('globalThis.__saleReview?.G?.heroes?.length > 0')
                before = page.evaluate('() => __saleReview.setup()')
                bag = '.store-bag .inv-cell.filled'
                stash = '.store-stash .inv-cell.filled'
                sale = '.td-sale-grid [data-sell-uid]'
                sell_button = '.td-sale-total button'

                page.locator(bag).first.click()
                selected = page.evaluate('() => __saleReview.snapshot()')
                check(prefix + ': clicking inventory selects for sale without equipping or spending', selected['selected'] == ['sale-normal'] and selected['worn'] == before['worn'] and selected['gold'] == before['gold'] and selected['bags'] == before['bags'])
                check(prefix + ': selected inventory item and sale price are visible', page.locator('.store-bag .td-picked').count() == 1 and page.locator(sale).count() == 1 and page.locator('.td-sale-total .td-price').text_content() == '200 G')
                page.locator(bag).first.click()
                check(prefix + ': clicking selected inventory item removes selection', page.locator(sale).count() == 0 and page.locator(sell_button).is_disabled())
                page.locator(bag).first.click()
                page.locator(stash).first.click()
                check(prefix + ': inventory and stash share sale list and total', page.locator(sale).count() == 2 and page.locator('.td-sale-total .td-price').text_content() == '700 G')
                page.locator('[data-sell-uid="sale-normal"]').click()
                check(prefix + ': clicking sale item removes it without deleting gear', page.locator(sale).count() == 1 and page.evaluate('() => !!__saleReview.G.items["sale-normal"]'))
                page.locator('.td-sale h2 button').click()
                check(prefix + ': clear selection preserves all equipment', page.locator(sale).count() == 0 and page.evaluate('() => __saleReview.G.bags[0].length') == 3)
                page.locator(bag).first.click()
                page.locator(bag).nth(1).click()
                quote = page.evaluate('() => __saleReview.snapshot().quote')
                page.mouse.move(width - 10, 10)
                check(prefix + ': first sale row shows complete icons and individual prices', page.locator('.td-sale-body').evaluate('n => { const b=n.getBoundingClientRect(),s=n.querySelector(".td-slot").getBoundingClientRect();return s.y>=b.y && s.bottom<=b.bottom; }'))
                page.screenshot(path=str(OUT/f'{prefix}_selected.png'))
                page.locator(sell_button).click()
                after = page.evaluate('() => __saleReview.snapshot()')
                check(prefix + ': sale removes selected items and credits exact quote', after['gold'] == before['gold'] + quote['gold'] and after['bags'][0] == ['sale-locked'] and not page.evaluate('() => !!__saleReview.G.items["sale-normal"] || !!__saleReview.G.items["sale-rare"]') and after['worn'] == before['worn'])
                check(prefix + ': successful sale clears list and saves gold', not after['selected'] and page.locator(sell_button).is_disabled() and page.evaluate('() => __saleReview.loadSave().resources.gold') == after['gold'])
                page.locator(bag).first.click()
                check(prefix + ': locked equipment is not selected or deleted', page.locator(sale).count() == 0 and page.evaluate('() => !!__saleReview.G.items["sale-locked"]'))
                page.locator(stash).first.click()
                page.locator(stash).first.click(modifiers=['Control'])
                check(prefix + ': Ctrl click still moves gear while retaining sale selection', page.evaluate('() => __saleReview.G.bags[0].includes("sale-stash") && !__saleReview.G.stash.includes("sale-stash")') and page.locator(sale).count() == 1)

                # Existing purchasing still enters the viewed bag and uses the same price basis.
                page.locator('.td-stock .td-group[data-part="weapon"] .inv-cell').first.click()
                purchase = page.evaluate('() => { const a=__saleReview,s=a.SYS.game.shopState(a.G,Date.now()); return {gold:s.equip[0].gold,worn:a.snapshot().worn,before:a.G.bags[0].length}; }')
                page.locator('.td-stock .td-buy > button').last.click()
                check(prefix + ': purchasing still adds an unequipped item with one-third resale', page.evaluate('p => { const a=__saleReview,uid=a.G.bags[0].at(-1); return a.G.bags[0].length===p.before+1 && a.snapshot().worn===p.worn && a.SYS.game.shopSellGold(a.G.items[uid])===Math.floor(p.gold/3); }', purchase))
                page.locator('[data-tab="character"]').click()
                check(prefix + ': leaving shop clears pending selection', page.evaluate('() => __saleReview.state.shopSell.size') == 0)
                page.locator('.store-bag .inv-cell.filled').last.click()
                check(prefix + ': character inventory still equips gear', page.evaluate('p => __saleReview.snapshot().worn !== p.worn', purchase))
                page.locator('[data-tab="shop"]').click()
                check(prefix + ': shop reopens with empty sale and available button', page.locator(sale).count() == 0 and page.locator(sell_button).is_disabled())

                layout = page.evaluate('''() => {
                    const r=s=>{const n=document.querySelector(s),b=n.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,right:b.right,bottom:b.bottom};};
                    return {stock:r('.td-stock'),sale:r('.td-sale'),inventory:r('.bag-row'),action:r('.td-sale-total button'),bodyWidth:document.body.scrollWidth,viewport:innerWidth};
                }''')
                check(prefix + ': purchase and sale stand side by side above inventory', layout['sale']['x'] >= layout['stock']['right'] and abs(layout['sale']['y'] - layout['stock']['y']) < 1 and abs(layout['sale']['h'] - layout['stock']['h']) < 1 and abs(layout['sale']['w'] - layout['stock']['w']) < 1 and layout['sale']['bottom'] <= layout['inventory']['y'] + 1)
                check(prefix + ': shop removes equipment panel while keeping hero comparison and side traders', page.locator('.c-shop-band > .panel').count() == 2 and page.locator('.c-shop-band > .c-shop-stack > .panel').count() == 2 and page.locator('.c-shop-band .pd-cell').count() == 0 and page.locator('.c-shop .hs-card').count() > 0)
                check(prefix + ': full purchase grid fits its panel', page.locator('.td-stock .td-body').evaluate('n => {const b=n.getBoundingClientRect(),g=n.querySelector(".td-split").getBoundingClientRect();return g.x>=b.x-1 && g.right<=b.right+1;}'))
                check(prefix + ': sale action is visible and page has no horizontal overflow', layout['action']['h'] > 0 and layout['action']['y'] >= layout['sale']['y'] and layout['action']['bottom'] <= layout['sale']['bottom'] and layout['bodyWidth'] <= layout['viewport'])
                page.screenshot(path=str(OUT/f'{prefix}_empty.png'))
                context.close()
            browser.close()
        check('No browser runtime errors', not errors)
    finally:
        (OUT/'verification.json').write_text(json.dumps({'checks': checks, 'errors': errors}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'passed': len(checks), 'errors': errors, 'output': str(OUT)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
