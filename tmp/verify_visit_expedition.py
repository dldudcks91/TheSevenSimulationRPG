import json
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tmp/visit_expedition_review'
OUT.mkdir(exist_ok=True)
SOURCE = (ROOT / 'src/ui/app.js').read_text(encoding='utf-8')
HARNESS = r'''
window.__visitReview = {
    inspect() {
        const at = now(), h = G.heroes[0];
        const expected = t => SYS.game.visitStory(G, h.uid, t).lines.map(ln =>
            L(ln.done ? {ko:ln.row.done_kr,en:ln.row.done_en} : {ko:ln.row.doing_kr,en:ln.row.doing_en}));
        const rendered = t => Array.from(visitLog(t).querySelectorAll('.tv-visit-hero:first-child .tv-visit-do'), n => n.textContent);
        const next = SYS.game.visitStory(G, h.uid, at).nextAt + 1;
        const g = JSON.parse(JSON.stringify(G));
        g.joins = [];
        g.labNodes['visit:waiting'] = 4;
        SYS.game.visitSettle(g, at);
        const clock = SYS.game.visitState(g, at).clocks.find(c => c.uid === h.uid);
        const later = SYS.game.visitState(g, at + 60000).clocks.find(c => c.uid === h.uid);
        const arrived = SYS.game.visitSettle(g, clock.nextAt).arrived.length;
        return {
            busy: SYS.game.heroBusy(G, h.uid),
            actual: Array.from(document.querySelectorAll('.tv-visit-hero:first-child .tv-visit-do'), n => n.textContent),
            expected: expected(at),
            awayRows: document.querySelectorAll('.tv-visit-do.away').length,
            nextActual: rendered(next), nextExpected: expected(next),
            clockContinues: clock.nextAt !== null && Math.abs(clock.remainMs - later.remainMs - 60000) < 1,
            arrived,
            heroClockAdvanced: g.visitHeroes[h.uid].nextAt > clock.nextAt,
            stillOnExpedition: SYS.game.heroBusy(g, h.uid) === 'run'
        };
    }
};
'''

results, errors = [], []
with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='msedge', headless=True)
    for lang, skin, away, ago in [('ko', 'd2min', 1, 20), ('en', 'now', 1, 0), ('ko', 'now', 0, 0)]:
        context = browser.new_context(viewport={'width': 1600, 'height': 900})
        context.route('https://**', lambda route: route.abort())
        context.route('**/ui/app.js', lambda route: route.fulfill(
            status=200, content_type='text/javascript', body=SOURCE + HARNESS))
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(f'http://127.0.0.1:8777/index.html?dev=visit&reg=1&n=0&away={away}&ago={ago}&lang={lang}&skin={skin}', wait_until='networkidle')
        page.wait_for_function('window.__visitReview && document.querySelector(".tv-visit-do")')
        result = page.evaluate('() => __visitReview.inspect()')
        result.update(lang=lang, skin=skin, away=away)
        results.append(result)
        assert result['busy'] == ('run' if away else None), result
        assert result['actual'] == result['expected'], result
        assert result['nextActual'] == result['nextExpected'], result
        assert result['awayRows'] == 0, result
        assert result['clockContinues'] and result['arrived'] > 0 and result['heroClockAdvanced'], result
        assert result['stillOnExpedition'] == bool(away), result
        page.screenshot(path=str(OUT / f'{lang}-{skin}-away{away}.png'))
        context.close()
    browser.close()
assert not errors, errors
(OUT / 'result.json').write_text(json.dumps({'checks': results, 'errors': errors}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'PASS: {len(results)} browser cases; story preserved, next story advances, arrival clocks continue; {len(errors)} browser errors')
