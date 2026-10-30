import json
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[2]
out = Path(__file__).parent
harness = r'''
globalThis.__firstBook = {
  ready: () => !!(G && SYS),
  setup: () => {
    G.progress.cleared = D.stageOrder.slice(0, D.stageOrder.indexOf(1021));
    for (const h of G.heroes) { h.level = D.balance.skillbook_learn_level - 1; h.xp = SYS.hero.xpNeeded(h.level) - 1; }
    const r = SYS.game.resolveBattle(G, 1021, now());
    if (!r.ok || !r.report.books?.length) throw new Error('No level book: ' + r.err);
    const b = r.report.books[0], h = G.heroes.find(h => h.uid === b.uid);
    G.resources.gold = 0; G.materials = {}; G.buildings.library = 1;
    const panel = document.createElement('section'); panel.id = 'first-book-review';
    panel.style.cssText = 'position:fixed;left:40px;top:40px;width:760px;padding:20px;background:#1e242c;z-index:99999;color:white';
    const loot = document.createElement('section'); loot.id = 'first-book-loot'; dropSection(loot, r.report);
    const learn = document.createElement('section'); learn.id = 'first-book-learn';
    state.bookSel = b.id; bookLearnInto(learn, h, SYS.game.bookState(G, h.uid));
    panel.append(loot, learn); document.body.appendChild(panel);
    globalThis.__firstBook.target = b;
    return {book: b, count: dropCount(r.report), cells: r.report.drops.length + r.report.books.length + r.report.blueprints.length + Object.keys(r.report.materials ?? {}).length};
  },
  result: () => ({skill: G.heroes.find(h => h.uid === __firstBook.target.uid).bookSkill, gold: G.resources.gold, materials: G.materials})
};
'''
checks, errors = [], []
with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='msedge', headless=True)
    for lang, skin in [('ko', 'd2min'), ('en', 'now')]:
        context = browser.new_context(viewport={'width': 1600, 'height': 1000})
        context.route('https://**', lambda route: route.abort())
        context.route('**/ui/app.js', lambda route: route.fulfill(status=200, content_type='text/javascript', body=(root / 'src/ui/app.js').read_text(encoding='utf-8') + harness))
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(f'http://127.0.0.1:8828/index.html?dev=newgame&lang={lang}&skin={skin}')
        page.wait_for_function('globalThis.__firstBook?.ready()', timeout=60000)
        before = page.evaluate('__firstBook.setup()')
        label = '스킬북' if lang == 'ko' else 'Book'
        badges = page.locator('#first-book-loot .bp-tag').all_text_contents()
        button = page.locator('#first-book-learn .bk-buy button')
        assert label in badges and before['count'] == before['cells']
        assert button.is_enabled()
        page.locator('#first-book-review').screenshot(path=str(out / f'first-book-{lang}.png'))
        button.click()
        after = page.evaluate('__firstBook.result()')
        assert after['skill'] == before['book']['id'] and after['gold'] == 0 and not after['materials']
        checks.append({'language': lang, 'skin': skin, 'book_badge': True, 'count': True, 'learn_without_materials': True})
        context.close()
    browser.close()
result = {'checks': checks, 'errors': errors}
(out / 'ui-verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(result, ensure_ascii=False))
assert not errors
