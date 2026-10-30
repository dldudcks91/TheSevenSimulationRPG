"""Compare starter gear before/after, then refresh the intentional golden change."""
import functools
import hashlib
import http.server
import json
import threading
from pathlib import Path
from urllib.parse import unquote, urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).parent
SOURCES = {
    path.relative_to(ROOT / 'src').as_posix(): path.read_bytes()
    for folder in ('game_logic', 'ui', 'data', 'dev')
    for path in (ROOT / 'src' / folder).rglob('*')
    if path.is_file() and path.suffix in ('.js', '.json', '.csv')
}
RULE = "weapon.affixes.find(a => a.src === 'fixed' && a.stat === 'atk_pct').v = B.start_weapon_atk_pct;"
item_source = SOURCES['game_logic/item.js'].decode('utf-8')
assert item_source.count(RULE) == 1
old_item = item_source.replace(RULE, '').encode('utf-8')
PROBE = """async () => {
    const { D, buildSystems } = await import('/ui/data.js');
    const { makeRng } = await import('/game_logic/rng.js');
    const S = buildSystems(D);
    const rows = [];
    for (const {id: cls} of D.classes) for (let seed = 1; seed <= 30; seed++) {
        const r = makeRng(seed);
        const weapon = S.item.startingWeapon(r, cls);
        const armor = S.item.startingArmor(r);
        const next = r();
        const normal = S.item.rollGear(makeRng(seed + 1000), {slots: ['weapon'], ilvl: 1})[0];
        const fixed = weapon.affixes.find(a => a.src === 'fixed' && a.stat === 'atk_pct');
        const value = fixed.v;
        fixed.v = null;
        rows.push({cls, seed, value, weapon, armor, next, normal});
    }
    return rows;
}"""


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


server = http.server.ThreadingHTTPServer(
    ('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT / 'src'))
)
threading.Thread(target=server.serve_forever, daemon=True).start()
result = {}
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)

        def run(mode, write=False, probe=False):
            page = browser.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))

            def frozen(route):
                path = unquote(urlsplit(route.request.url).path).lstrip('/')
                body = old_item if mode == 'baseline' and path == 'game_logic/item.js' else SOURCES.get(path)
                if body is None:
                    route.continue_()
                else:
                    content_type = 'text/javascript' if path.endswith('.js') else 'application/json' if path.endswith('.json') else 'text/csv'
                    route.fulfill(body=body, content_type=content_type + '; charset=utf-8')

            page.route('**/*', frozen)
            page.goto(f'http://127.0.0.1:{server.server_port}/dev/test.html' + ('?golden=write' if write else ''))
            page.wait_for_function('/PASS|FAIL/.test(document.title)', timeout=180000)
            record = {
                'title': page.title(),
                'failures': page.locator('#out li.fail').all_text_contents(),
                'errors': errors[:],
            }
            rows = page.evaluate(PROBE) if probe else None
            golden = page.locator('#golden').text_content() if write else None
            page.close()
            print(mode + ': ' + record['title'], flush=True)
            return record, rows, golden

        result['baseline'], before, _ = run('baseline', probe=True)
        result['before_refresh'], after, golden = run('current', write=True, probe=True)
        assert len(before) == len(after) and before
        assert all(row['value'] == 1 for row in after), 'Starter fixed option is not +100%'
        before_values = sorted({row.pop('value') for row in before})
        for row in after:
            row.pop('value')
        assert before == after, 'Other gear, RNG consumption or regular rolls changed'
        assert len(before_values) > 1, 'The baseline probe did not cover random starter values'
        result['starter_comparison'] = {'items': len(after), 'fixed_pct': 100, 'other_gear_rng_regular_rolls_identical': True, 'baseline_distinct_values': len(before_values)}
        result['unchanged_failures'] = [line for line in result['before_refresh']['failures'] if line in result['baseline']['failures'] and not line.startswith('golden:')]
        unexpected = [line for line in result['before_refresh']['failures'] if not line.startswith('golden:') and line not in result['unchanged_failures']]
        assert not unexpected and not result['before_refresh']['errors'], unexpected
        parsed = json.loads(golden)
        assert len(parsed['runs']) == 60 and len(golden) > 1000
        changed = [key for key, body in SOURCES.items() if (ROOT / 'src' / key).read_bytes() != body]
        assert not changed, f'Sources changed during verification: {changed}'
        (OUT / 'golden_before.json').write_bytes(SOURCES['dev/golden.json'])
        (ROOT / 'src/dev/golden.json').write_bytes(golden.encode('utf-8'))
        SOURCES['dev/golden.json'] = golden.encode('utf-8')
        result['final'], _, _ = run('final')
        result['source_hashes'] = {key: hashlib.sha256(body).hexdigest() for key, body in SOURCES.items()}
        browser.close()
        if any(line not in result['unchanged_failures'] for line in result['final']['failures']) or result['final']['errors']:
            raise RuntimeError('Final regression failed')
finally:
    server.shutdown()
    server.server_close()
    (OUT / 'verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
