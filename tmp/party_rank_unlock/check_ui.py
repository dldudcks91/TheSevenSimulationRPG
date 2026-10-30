import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]
HARNESS = r'''
window.__partyRank = {
    ready: () => !!G?.heroes?.length,
    prepare: chapter => {
        G.progress.cleared = D.stageOrder.filter(id => D.stages[id].chapter <= chapter);
        G.resources.gold = 600;
        state.tab = 'research'; state.cnPick = 'explore'; render();
    },
    inspect: () => ({
        rank: G.buildings.explore ?? 0,
        presets: G.presets.length,
        runs: G.runs.length,
        gold: G.resources.gold,
        limits: SYS.game.limitsOf(G),
        next: SYS.game.constructionState(G).buildings.find(b => b.id === 'explore').next,
    }),
};
'''

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    checks = []
    errors = []
    for lang in ['ko', 'en']:
        context = browser.new_context(viewport={'width': 1600, 'height': 1000})
        context.route('**/ui/app.js', lambda route: route.fulfill(
            content_type='text/javascript',
            body=(ROOT / 'src/ui/app.js').read_text(encoding='utf-8') + '\n' + HARNESS))
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(f'http://127.0.0.1:8806/index.html?dev=newgame&tab=research&bld=explore&lang={lang}')
        page.wait_for_function('window.__partyRank?.ready()', timeout=60000)
        page.evaluate('__partyRank.prepare(1)')
        locked = page.evaluate('__partyRank.inspect()')
        assert locked['rank'] == 0 and locked['presets'] == 1 and locked['next']['err'] == 'locked', json.dumps(locked, ensure_ascii=False)
        assert page.locator('.cn-go').is_disabled()
        rows = page.locator('.cn-ranks .cn-rank').all_text_contents()
        require = page.locator('.cn-next .cn-reqs').inner_text()
        assert len(rows) == 5 and '+1' in rows[0]
        assert page.locator('.cn-next .cn-eff-t').inner_text().strip() == page.locator('.cn-ranks .cn-rank').first.locator('.cn-eff-t').inner_text().strip()
        page.screenshot(path=str(OUT / f'construction_locked_{lang}.png'))
        page.evaluate('__partyRank.prepare(2)')
        assert page.locator('.cn-go').is_enabled()
        page.screenshot(path=str(OUT / f'construction_ready_{lang}.png'))
        page.locator('.cn-go').click()
        built = page.evaluate('__partyRank.inspect()')
        assert built['rank'] == 1 and built['presets'] == 2 and built['runs'] == 2
        assert built['limits']['expeditions'] == 2 and built['gold'] == 0
        page.screenshot(path=str(OUT / f'construction_built_{lang}.png'))
        checks.append({'lang': lang, 'rows': rows, 'require': require, 'before': locked['presets'], 'after': built['presets'], 'cost': 600, 'ok': True})
        context.close()
    browser.close()
    result = {'checks': checks, 'errors': errors}
    (OUT / 'ui.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False))
    assert not errors
