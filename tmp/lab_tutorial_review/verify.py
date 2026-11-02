"""Browser checks for laboratory guides; fixtures exist only in intercepted app responses."""
import argparse
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
BASE = 'http://127.0.0.1:8844'
HARNESS = r'''
window.__labReview = {
    G: () => G, state, render, save, now, SYS, tutorial,
    seen: () => loadTutorialSeen(tutorialOwner()),
    setSeen(ids) { writeTutorialSeen(tutorialOwner(), ids); tutorial.reset(); render(); },
    snapshot() { return JSON.stringify({resources:G.resources, materials:G.materials, counters:G.counters,
        labReg:G.labReg, labNodes:G.labNodes, labResearch:G.labResearch, seed:G.seed,
        notifications:localStorage.getItem('thesevensim.notificationDismissed')}); },
    unlock() {
        G.buildings.storage=1; G.buildings.tavern=2;
        G.resources.gold=20000; G.materials.herb=100; render();
    },
    returnToLab() { state.tab='resource'; state.modal=null; render(); },
    maxNode() { G.labNodes['res:mine']=10; render(); },
    oldSave() { save(); localStorage.removeItem('thesevensim.tutorialSeen'); },
    anotherGame() { startGame(); state.tab='resource'; render(); },
};
'''


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--skip-regression', action='store_true')
    args = parser.parse_args()
    checks, errors = [], []
    result = {'checks': checks, 'errors': errors}
    if args.skip_regression:
        result['regression'] = json.loads((OUT/'verification.json').read_text(encoding='utf-8'))['regression']

    def check(name, condition):
        checks.append({'name': name, 'ok': bool(condition)})
        if not condition:
            raise AssertionError(name)

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(channel='msedge', headless=True)
            if not args.skip_regression:
                regression = browser.new_page()
                regression.on('pageerror', lambda e: errors.append(str(e)))
                regression.goto(BASE + '/dev/test.html')
                regression.wait_for_function('/PASS|FAIL/.test(document.title)', timeout=180000)
                result['regression'] = {'title': regression.title(),
                                        'failures': regression.locator('#out li.fail').all_text_contents()}
                regression.close()
            for skin, lang, width, height, touch in [
                ('d2min', 'ko', 1600, 900, False), ('now', 'en', 1600, 900, False),
                ('d2min', 'ko', 1366, 768, False), ('now', 'en', 1366, 768, False),
                ('d2min', 'ko', 1024, 768, True),
            ]:
                prefix = f'{skin}-{lang}-{width}' + ('-touch' if touch else '')
                ctx = browser.new_context(viewport={'width': width, 'height': height}, has_touch=touch)
                ctx.route('https://**', lambda route: route.abort())
                ctx.route('**/ui/app.js', lambda route: route.fulfill(
                    status=200, content_type='text/javascript',
                    body=(ROOT/'src/ui/app.js').read_text(encoding='utf-8') + HARNESS))
                page = ctx.new_page()
                page.on('pageerror', lambda e: errors.append(str(e)))

                def ev(js):
                    return page.evaluate('() => ' + js)

                def guide():
                    cards = page.locator('.tutorial-card')
                    return cards.get_attribute('data-tutorial') if cards.count() else None

                def click(selector):
                    target = page.locator(selector).first
                    target.tap() if touch else target.click()

                def fits():
                    return ev('''(() => {
                        const c=document.querySelector('.tutorial-card'); if(!c)return false;
                        const b=c.getBoundingClientRect();
                        return b.left>=0&&b.top>=0&&b.right<=innerWidth&&b.bottom<=innerHeight
                            && c.scrollWidth<=c.clientWidth;
                    })()''')

                page.goto(f'{BASE}/index.html?dev=newgame&tab=resource&lang={lang}&skin={skin}',
                          wait_until='networkidle')
                page.wait_for_function('globalThis.__labReview?.G()?.heroes?.length > 0')
                check(prefix + ': fresh locked laboratory has an introduction',
                      guide() == 'laboratory' and page.locator('.dp-card.open').count() == 0)
                check(prefix + ': introduction highlights the actual tree and fits',
                      page.locator('.dp-tree-grid.tutorial-target').count() == 1 and fits())
                check(prefix + ': localized title', page.locator('.tutorial-title').inner_text()
                      == ('연구소 둘러보기' if lang == 'ko' else 'Your laboratory'))
                page.screenshot(path=str(OUT/f'{prefix}-intro.png'))
                before = ev('__labReview.snapshot()')
                click('.tutorial-confirm')
                check(prefix + ': confirmation changes only tutorial progress',
                      guide() is None and ev('__labReview.snapshot()') == before
                      and ev('__labReview.seen()') == ['laboratory'])
                click('.nav [data-tab="character"]')
                click('.nav [data-tab="resource"]')
                check(prefix + ': confirmed introduction stays closed', guide() is None)
                click('.dp-btn')
                click('.tutorial-replay')
                check(prefix + ': settings replay restores introduction', guide() == 'laboratory')
                click('.nav [data-tab="character"]')
                click('.nav [data-tab="resource"]')
                check(prefix + ': leaving unconfirmed does not mark introduction seen',
                      guide() == 'laboratory' and ev('__labReview.seen()') == [])
                click('.tutorial-confirm')
                ev('__labReview.unlock()')
                click('.dp-tree-line:first-child .dp-card-n')
                check(prefix + ': selecting open line explains registration', guide() == 'labRegistration')
                page.screenshot(path=str(OUT/f'{prefix}-registration.png'))
                check(prefix + ': registration targets an unlocked hero slot and fits',
                      page.locator('.dp-side-fx .hs-card:not(.lock).tutorial-target').count() == 1 and fits())
                # Open the real modal without confirming the card first.
                click('.dp-side-fx .hs-card:not(.lock)')
                check(prefix + ': modal teaches hero selection instead of hidden background',
                      guide() == 'labRegistration'
                      and page.locator('#modal .lr-grid .hs-card.tutorial-target').count() == 1
                      and page.locator('.tutorial-detail').inner_text().startswith(
                          '영웅을 누르면' if lang == 'ko' else 'Click a hero'))
                before = ev('__labReview.snapshot()')
                click('.tutorial-confirm')
                check(prefix + ': registration explanation spends no resources or assignments',
                      ev('__labReview.snapshot()') == before and guide() is None)
                click('#modal .lr-grid .hs-card')
                check(prefix + ': real hero assignment still works', ev('Object.values(__labReview.G().labReg).includes("res")'))
                page.keyboard.press('Escape')
                ev('__labReview.returnToLab()')
                click('.dp-tree-cell.open')
                check(prefix + ': selecting an open node explains research', guide() == 'labResearch')
                check(prefix + ': research targets costs and duration, fits',
                      page.locator('.dp-side-next.tutorial-target .cn-mats').count() == 1 and fits())
                page.screenshot(path=str(OUT/f'{prefix}-research.png'))
                before = ev('__labReview.snapshot()')
                click('.tutorial-confirm')
                check(prefix + ': research explanation starts no project or follow-up',
                      ev('__labReview.snapshot()') == before and guide() is None)
                balances = ev('JSON.stringify([__labReview.G().resources.gold, __labReview.G().materials.herb])')
                click('.dp-side-next .dp-side-go')
                check(prefix + ': real research starts after guide', ev('!!__labReview.G().labResearch'))
                # Isolate the in-progress guide in the same UI fixture.
                ev('__labReview.setSeen(["laboratory","labRegistration"])')
                check(prefix + ': in-progress research can be explained', guide() == 'labResearch')
                click('.tutorial-confirm')
                click('.dp-side-next .dp-side-go')
                check(prefix + ': real cancellation refunds costs',
                      not ev('!!__labReview.G().labResearch')
                      and ev('JSON.stringify([__labReview.G().resources.gold, __labReview.G().materials.herb])') == balances)
                ev('__labReview.maxNode()')
                ev('__labReview.setSeen(["laboratory","labRegistration"])')
                check(prefix + ': max-level node offers no research tutorial', guide() is None)
                click('.dp-tree-cell:not(.open)')
                check(prefix + ': locked node offers no research tutorial', guide() is None)
                click('.dp-tree-cell.open:nth-child(3)')
                check(prefix + ': another unlocked node remains eligible', guide() == 'labResearch')
                click('.tutorial-confirm')
                ev('__labReview.save()')
                page.goto(f'{BASE}/index.html?tab=resource&lang={lang}&skin={skin}', wait_until='networkidle')
                check(prefix + ': completed guides persist across saved-game reload',
                      guide() is None and all(s in ev('__labReview.seen()')
                                             for s in ['laboratory', 'labRegistration', 'labResearch']))
                ev('__labReview.oldSave()')
                page.reload(wait_until='networkidle')
                check(prefix + ': existing save is opt-in', guide() is None and ev('__labReview.seen()') is None)
                click('.dp-btn')
                click('.tutorial-replay')
                check(prefix + ': existing save can replay laboratory guide', guide() == 'laboratory')
                click('.tutorial-confirm')
                ev('__labReview.anotherGame()')
                check(prefix + ': a different game has independent progress',
                      guide() == 'laboratory' and ev('__labReview.seen()') == [])
                ctx.close()
            browser.close()
            check('no browser runtime errors', not errors)
    finally:
        (OUT/'verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps({'passed': sum(c['ok'] for c in checks), 'checks': len(checks),
                          'regression': result.get('regression'), 'errors': errors}, ensure_ascii=True), flush=True)


if __name__ == '__main__':
    main()
