import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    source = (ROOT / 'src/dev/test.js').read_text(encoding='utf-8')
    page.route('**/dev/test.js', lambda route: route.fulfill(
        status=200, content_type='text/javascript',
        body=source + '\nwindow.__libraryRankReview = { SYS, cands, NOW };'))
    page.goto('http://127.0.0.1:8841/dev/test.html')
    page.wait_for_function('/PASS|FAIL/.test(document.title)', timeout=180000)
    page.wait_for_function('!!window.__libraryRankReview')
    regression_title = page.title()
    focused = page.evaluate('''async () => {
        const {SYS, cands, NOW} = window.__libraryRankReview;
        const game = SYS.game;
        const g = game.newGame(777, cands, NOW);
        const next = () => game.constructionState(g).buildings.find(b => b.id === 'library').next;
        g.resources.gold = 3000;
        for (const h of g.heroes) h.level = 9;
        g.progress.cleared = [1051];
        const before = JSON.stringify(g);
        const low = {next: next(), result: game.construct(g, 'library', NOW)};
        const unchanged = JSON.stringify(g) === before;
        g.progress.cleared = [];
        g.heroes[1].level = 10;
        const ready = next();
        const {setLang, t} = await import('/ui/i18n.js');
        const labels = {};
        for (const lang of ['ko', 'en']) {
            setLang(lang);
            labels[lang] = t('cn.req.hero', {have: ready.require[0].have, need: ready.require[0].need});
        }
        const built = game.construct(g, 'library', NOW);
        const checks = {
            level9_blocked_even_after_boss: low.next.err === 'locked' && low.result.err === 'locked',
            rejected_build_preserves_state: unchanged,
            one_level10_hero_without_clear_can_build: ready.err === null && ready.require.length === 1 && ready.require[0].kind === 'hero' && ready.require[0].need === 10 && ready.require[0].have === 10,
            upgrade_spends3000_and_opens_craft: built.ok && g.buildings.library === 2 && g.resources.gold === 0 && game.hasFeature(g, 'book_craft'),
            localized_condition: labels.ko === '최고 영웅 Lv.10 / 10' && labels.en === 'Top hero Lv.10 / 10'
        };
        return {checks, labels, low: low.result, built};
    }''')
    result = {
        'title': regression_title,
        'failures': page.locator('#out li.fail').all_text_contents(),
        'errors': errors,
        'focused': focused,
    }
    (Path(__file__).parent / 'verification.json').write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False))
    browser.close()
    if result['failures'] or errors or not all(focused['checks'].values()):
        raise SystemExit(1)
