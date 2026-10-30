"""Run the browser regression suite for stage seed changes.

Start serve.py on the chosen port before running this script. Results preserve
the complete failing assertion messages and browser exceptions for review.
"""
import argparse
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / '2026-10-30_stage_seed'

UI_HARNESS = r'''
window.__stageSeedReview = {
    ready: () => !!SYS?.game,
    setup: () => {
        dropBattles();
        G = SYS.game.newGame(3401, SYS.hero.rollCandidates(makeRng(3411), 3), now());
        state.screen = 'game'; state.tab = 'expedition'; state.exp = 'idle'; state.modal = null;
        save(); render();
    },
    depart: () => { runBattle(1011); return JSON.parse(JSON.stringify(G.runs[0]?.stageSeeds)); },
    saved: () => loadSave(),
    retreat: () => {
        const run = state.battles[1]?.run;
        const result = SYS.game.retreatRun(G, run, now());
        dropBattles(); state.exp = 'idle'; save(); render();
        return result.ok;
    },
    load: () => { const ok = continueGame(); render(); return ok; },
    snapshot: () => JSON.parse(JSON.stringify({decks:G.stageDecks,slot:G.runs[0],resources:G.resources})),
    help: language => { setLang(language); state.tab='help'; render(); return t('help.expedition.repeat.body'); },
};
'''


def verify_ui(browser, port):
    context = browser.new_context(viewport={'width': 1600, 'height': 1000})
    context.route('**/ui/app.js', lambda route: route.fulfill(
        status=200, content_type='text/javascript',
        body=(ROOT / 'src/ui/app.js').read_text(encoding='utf-8') + '\n' + UI_HARNESS,
    ))
    page = context.new_page()
    errors, checks = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(f'http://127.0.0.1:{port}/index.html')
    page.wait_for_function('window.__stageSeedReview?.ready()', timeout=60000)
    page.evaluate('__stageSeedReview.setup()')
    first = page.evaluate('__stageSeedReview.depart()')
    page.screenshot(path=str(OUT / 'seed_departure.png'))
    saved = page.evaluate('__stageSeedReview.saved()')
    checks.append({'name': 'app_saves_active_grant', 'ok': bool(first) and saved['runs'][0]['stageSeeds'] == first and bool(saved['stageDecks'])})
    before_resources = saved['resources']
    page.reload()
    page.wait_for_function('window.__stageSeedReview?.ready()', timeout=60000)
    checks.append({'name': 'app_loads_saved_stage', 'ok': page.evaluate('__stageSeedReview.load()')})
    closed = page.evaluate('__stageSeedReview.snapshot()')
    checks.append({'name': 'app_reload_returns_unwon_tickets', 'ok': not closed['slot']['active'] and closed['resources'] == before_resources and all(len(deck['free']) == 1 for deck in closed['decks'].values())})
    retry = page.evaluate('__stageSeedReview.depart()')
    checks.append({'name': 'app_retry_preserves_round_seeds', 'ok': retry['rounds'] == first['rounds'] and retry['combatSeed'] != first['combatSeed']})
    checks.append({'name': 'app_retreat_uses_current_handle', 'ok': page.evaluate('__stageSeedReview.retreat()')})
    for language in ['ko', 'en']:
        body = page.evaluate('__stageSeedReview.help', language)
        checks.append({'name': 'seed_help_' + language, 'ok': bool(body) and 'undefined' not in body and 'NaN' not in body and body != 'help.expedition.repeat.body'})
        page.screenshot(path=str(OUT / f'help_{language}.png'))
    context.close()
    return {'checks': checks, 'errors': errors}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8815)
    parser.add_argument('--baseline', action='store_true')
    parser.add_argument('--write-golden', action='store_true')
    parser.add_argument('--ui', action='store_true')
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel='msedge', headless=True)
        page = browser.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(f'http://127.0.0.1:{args.port}/dev/test.html' + ('?golden=write' if args.write_golden else ''))
        page.wait_for_function('/PASS|FAIL/.test(document.title)', timeout=240000)
        checks = page.locator('#out li').evaluate_all(
            'nodes => nodes.map(n => ({ok: !n.classList.contains("fail"), text: n.textContent}))'
        )
        result = {
            'title': page.title(),
            'checks': checks,
            'failures': [check['text'] for check in checks if not check['ok']],
            'errors': errors,
        }
        if args.write_golden:
            if errors or any(not failure.startswith('golden:') for failure in result['failures']):
                raise ValueError('Resolve non-golden regressions before updating the snapshot')
            body = page.locator('#golden').text_content()
            golden = json.loads(body)
            if len(body) < 1000 or len(golden.get('runs', [])) != 60 or len(golden.get('meta', {}).get('parties', {})) != 10:
                raise ValueError('Incomplete golden snapshot')
            target = ROOT / 'src/dev/golden.json'
            backup = OUT / 'golden_before.json'
            if not backup.exists():
                backup.write_bytes(target.read_bytes())
            with target.open('w', encoding='utf-8', newline='\n') as stream:
                stream.write(body)
        if args.ui:
            result['ui'] = verify_ui(browser, args.port)
        target = OUT / ('baseline.json' if args.baseline else 'verification.json')
        target.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps({key: value for key, value in result.items() if key != 'checks'}, ensure_ascii=True))
        browser.close()
        if result['failures'] or errors or (args.ui and (result['ui']['errors'] or any(not check['ok'] for check in result['ui']['checks']))):
            raise SystemExit(1)


if __name__ == '__main__':
    main()
