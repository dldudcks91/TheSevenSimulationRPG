"""Run the browser regression suite and record the current implementation checks."""
import argparse
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/2026-10-30_confirmed_implementation'

HARNESS = r'''
window.__confirmed = {
    ready: () => !!G?.heroes?.length,
    library: () => {
        for (const b of SYS.construction.list) G.buildings[b.id] = b.maxRank;
        SYS.game.labRegister(G, G.heroes[0].uid, 'lib', now());
        state.tab = 'resource'; state.post = 'lib'; state.labLineView = true; render();
    },
    tab: tab => { state.tab = tab; render(); },
    salvage: () => {
        const uids = [];
        for (const [i, slot] of ['weapon', 'armor', 'ring'].entries()) {
            const it = SYS.item.rollGear(makeRng(90+i), {slots:[slot], ilvl:10})[0];
            it.uid = 'review-salvage-' + i; G.items[it.uid] = it; SYS.game.bagOf(G, 1).push(it.uid); uids.push(it.uid);
        }
        state.invNo = 1; state.tab = 'character'; state.bagSelMode = true; state.bagSel = new Set(uids);
        state.cubeAuto.clear(); for (const s of Object.values(state.cubeF)) s.clear();
        render();
        return {preview: SYS.game.salvagePreview(G, uids), before: {...G.materials}};
    },
    materials: () => ({...G.materials}),
    cards: () => {
        const ring = SYS.item.rollGear(makeRng(77), {slots:['ring'],ilvl:10})[0];
        let amulet;
        for (let seed=1; seed<100; seed++) {
            amulet = SYS.item.rollGear(makeRng(seed), {slots:['amulet'],ilvl:10})[0];
            if (amulet.affixes.some(a=>a.stat==='skill_plus')) break;
        }
        const panel = document.createElement('div'); panel.className = 'confirmed-cards';
        panel.style.cssText = 'position:fixed;left:30px;top:30px;z-index:99999;display:flex;gap:20px;background:#191919;padding:20px';
        panel.append(tipCard(ring, '', [], null, {ranges:true}), tipCard(amulet, '', [], null, {ranges:true}));
        document.body.appendChild(panel);
        return {text:panel.textContent, ring, amulet};
    },
};
'''


def verify_ui(browser):
    context = browser.new_context(viewport={'width': 1600, 'height': 1000})
    context.route('**/ui/app.js', lambda route: route.fulfill(status=200, content_type='text/javascript', body=(ROOT / 'src/ui/app.js').read_text(encoding='utf-8') + '\n' + HARNESS))
    page = context.new_page()
    errors, checks = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    for lang in ['ko', 'en']:
        page.goto(f'http://127.0.0.1:8799/index.html?dev=book&lang={lang}')
        page.wait_for_function('window.__confirmed?.ready()', timeout=60000)
        page.evaluate('__confirmed.library()')
        page.wait_for_selector('[data-libbar]')
        text = page.locator('.main').inner_text()
        checks.append({'name': 'library_' + lang, 'ok': page.locator('.dp-card').count() == 5 and 'dp.out.h.lib' not in text and 'dp.fx.' not in text})
        page.screenshot(path=str(OUT / f'library_{lang}.png'))
        data = page.evaluate('__confirmed.cards()')
        checks.append({'name': 'accessory_cards_' + lang, 'ok': 'undefined' not in data['text'] and 'NaN' not in data['text'] and 'tip.ring.' not in data['text'] and not data['amulet'].get('proc')})
        page.locator('.confirmed-cards').screenshot(path=str(OUT / f'accessories_{lang}.png'))
        page.evaluate("document.querySelector('.confirmed-cards').remove()")
        plan = page.evaluate('__confirmed.salvage()')
        page.screenshot(path=str(OUT / f'salvage_{lang}.png'))
        checks.append({'name': 'salvage_preview_' + lang, 'ok': plan['preview']['n'] == 3 and len(plan['preview']['mats']) == 4 and 'undefined' not in page.locator('.salv-dust').inner_text()})
        page.locator('.salv-foot button.primary').click()
        after = page.evaluate('__confirmed.materials()')
        checks.append({'name': 'salvage_claim_' + lang, 'ok': all(after.get(key, 0) - plan['before'].get(key, 0) == n for key, n in plan['preview']['mats'].items())})
        page.evaluate("__confirmed.tab('library')")
        page.screenshot(path=str(OUT / f'library_costs_{lang}.png'))
        page.goto(f'http://127.0.0.1:8799/index.html?dev=form&lang={lang}')
        page.wait_for_selector('.dw-difficulty', timeout=60000)
        checks.append({'name': 'difficulty_' + lang, 'ok': 'undefined' not in page.locator('.dw-difficulty').inner_text()})
        page.screenshot(path=str(OUT / f'departure_{lang}.png'))
    context.close()
    return {'checks': checks, 'errors': errors}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--baseline', action='store_true')
    parser.add_argument('--write-golden', action='store_true')
    parser.add_argument('--ui', action='store_true')
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 1000})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto('http://127.0.0.1:8799/dev/test.html' + ('?golden=write' if args.write_golden else ''))
        page.wait_for_function('/PASS|FAIL/.test(document.title)', timeout=180000)
        result = {'title': page.title(), 'failures': page.locator('#out li.fail').all_text_contents(), 'errors': errors}
        result['calibration'] = page.locator('#calib table tr').evaluate_all('rows => rows.map(row => [...row.cells].map(cell => cell.textContent.trim()))')
        if args.write_golden:
            if errors or any(not failure.startswith('golden:') for failure in result['failures']):
                raise ValueError('Fix non-golden regressions before updating the snapshot')
            body = page.locator('#golden').text_content()
            golden = json.loads(body)
            if len(body) < 1000 or len(golden.get('runs', [])) != 60:
                raise ValueError('Incomplete golden snapshot')
            target = ROOT / 'src/dev/golden.json'
            (OUT / 'golden_before.json').write_bytes(target.read_bytes())
            with target.open('w', encoding='utf-8', newline='\n') as stream:
                stream.write(body)
        if args.ui:
            result['ui'] = verify_ui(browser)
        (OUT / ('baseline.json' if args.baseline else 'verification.json')).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps(result, ensure_ascii=False))
        browser.close()
        if result['failures'] or errors or (args.ui and (result['ui']['errors'] or any(not c['ok'] for c in result['ui']['checks']))):
            raise SystemExit(1)


if __name__ == '__main__':
    main()
