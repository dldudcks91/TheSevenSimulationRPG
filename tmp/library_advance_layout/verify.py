import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
HARNESS = r'''
window.__libraryLayout = {
    ready: () => !!G?.heroes?.length,
    prepare: (options = {}) => {
        const h = G.heroes[0];
        for (const building of SYS.construction.list) G.buildings[building.id] = building.maxRank;
        if (options.locked) G.buildings.library = 1;
        h.level = options.lowLevel ? 1 : D.balance.advance_unlock_level;
        h.advance = null; h.advanceSkill = null;
        G.advancing = [];
        G.resources.gold = options.poor ? 0 : D.balance.advance_gold * 2;
        state.heroUid = h.uid; state.advSel = null;
        state.tab = 'library'; state.modal = null;
        const branch = SYS.game.advanceState(G, h.uid, now()).branches[0].id;
        if (options.working) G.advancing = [{ uid: h.uid, branch, since: now(), until: now() + 3600000 }];
        render();
        return { branch, need: D.balance.advance_gold };
    },
    current: () => ({ gold: G.resources.gold, advance: G.heroes[0].advance }),
};
'''


def main():
    checks, errors = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        for lang in ['ko', 'en']:
            context = browser.new_context(viewport={'width': 1600, 'height': 1000})
            context.route('**/ui/app.js', lambda route: route.fulfill(
                status=200, content_type='text/javascript',
                body=(ROOT / 'src/ui/app.js').read_text(encoding='utf-8') + '\n' + HARNESS))
            page = context.new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(f'http://127.0.0.1:8807/index.html?dev=book&lang={lang}')
            page.wait_for_function('window.__libraryLayout?.ready()', timeout=60000)
            setup = page.evaluate('__libraryLayout.prepare()')
            button = page.locator('.tr-adv-go')
            assert button.count() == 1 and button.is_disabled()
            assert page.locator('.c-train-band > .panel > h2 .tr-adv-go').count() == 0
            for width, height in [(1600, 1000), (1920, 1080), (1366, 768)]:
                page.set_viewport_size({'width': width, 'height': height})
                rects = page.evaluate('''() => {
                    const rect = selector => {
                        const r = document.querySelector(selector).getBoundingClientRect();
                        return { x:r.x, y:r.y, right:r.right, bottom:r.bottom, width:r.width, height:r.height };
                    };
                    return { row:rect('.tr-adv-cur'), skill:rect('.tr-adv-cur .sk-card'),
                        gold:rect('.tr-adv-actions .cn-mat'), button:rect('.tr-adv-go'),
                        lastSkill:rect('.tr-adv-cur .sk-slot:last-child') };
                }''')
                assert abs(rects['skill']['y'] - rects['gold']['y']) < 1, rects
                assert rects['lastSkill']['right'] < rects['gold']['x'], rects
                assert rects['gold']['right'] < rects['button']['x'], rects
                assert abs(rects['button']['right'] - rects['row']['right']) < 1, rects
                assert abs(rects['skill']['width'] - rects['skill']['height']) < 1, rects
                checks.append({'name': f'layout_{lang}_{width}', 'ok': True, 'rects': rects})
            page.set_viewport_size({'width': 1600, 'height': 1000})
            page.locator('.tr-adv-branch.can-pick').first.click()
            assert button.is_enabled()
            page.screenshot(path=str(OUT / f'after_{lang}.png'))
            page.locator('.tr-adv-branch.can-pick').first.click()
            assert button.is_disabled()
            page.locator('.tr-adv-branch.can-pick').first.click()
            button.click()
            current = page.evaluate('__libraryLayout.current()')
            assert current == {'gold': setup['need'], 'advance': setup['branch']}, current
            assert page.locator('.tr-adv-go, .tr-adv-actions').count() == 0
            assert page.locator('.tr-adv-branch.done').count() == 1
            checks.append({'name': f'advance_{lang}', 'ok': True})
            for options in [{'poor': True}, {'lowLevel': True}]:
                page.evaluate('__libraryLayout.prepare', options)
                page.locator('.tr-adv-branch.can-pick').first.click()
                button.click()
                assert page.evaluate('__libraryLayout.current().advance') is None
                assert page.locator('.tr-adv-branch.pick').count() == 1
                assert page.locator('.tr-adv-actions .cn-matw.no').count() == (1 if options.get('poor') else 0)
                checks.append({'name': f'rejected_{lang}_{next(iter(options))}', 'ok': True})
            page.evaluate('__libraryLayout.prepare({locked:true})')
            assert button.count() == 0
            assert page.locator('.tr-adv-actions .cn-mat').count() == 1
            assert page.locator('.tr-adv-main.lock-host').count() == 1
            checks.append({'name': f'locked_{lang}', 'ok': True})
            page.evaluate('__libraryLayout.prepare({working:true})')
            assert page.locator('.tr-adv-go, .tr-adv-actions').count() == 0
            assert page.locator('.tr-adv-work').count() == 1
            checks.append({'name': f'working_{lang}', 'ok': True})
            context.close()
        browser.close()
    result = {'checks': checks, 'errors': errors}
    (OUT / 'verification.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps({'passed': len(checks), 'errors': errors}))
    assert not errors, errors


if __name__ == '__main__':
    main()
