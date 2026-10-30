import datetime
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'tmp/weapon_proc_review'
OLD_HERO = (OUT / 'before/src/game_logic/hero.js').read_text(encoding='utf-8')
RUN = '''async () => {
    const data = await import('/ui/data.js');
    const golden = await import('/dev/golden.js');
    await data.loadData('/data/');
    const sys = data.buildSystems(data.D);
    const actual = golden.buildFingerprint(sys, data.D.balance, data.D, 1700000000000, '2026-10-30');
    const expected = await (await fetch('/dev/golden.json')).json();
    const diffs = golden.compareGolden(actual, expected);
    const parties = golden.compareParties(actual.meta, expected);
    const balance = golden.compareBalance(actual.meta, expected);
    const csv = golden.compareCsvHash(actual.meta, expected);
    const changed = actual.runs.map((run, i) => JSON.stringify(run) === JSON.stringify(expected.runs[i]) ? null : {seed:run.seed,stage:run.stage}).filter(Boolean);
    return { actual, summary: { diffs, parties, balance, csv, total:actual.runs.length, matching:actual.runs.length-changed.length, changed } };
}'''

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    summaries = {}
    for mode in ['current', 'proc_disabled']:
        context = browser.new_context()
        context.route('**/__golden_blank', lambda route: route.fulfill(status=200, content_type='text/html', body='<html><title>golden</title></html>'))
        if mode == 'proc_disabled':
            context.route('**/game_logic/hero.js', lambda route: route.fulfill(status=200, content_type='text/javascript', body=OLD_HERO))
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto('http://127.0.0.1:8777/__golden_blank')
        result = page.evaluate(RUN)
        filename = 'golden_current_candidate.json' if mode == 'current' else 'golden_proc_disabled.json'
        (OUT / filename).write_text(json.dumps(result['actual'], ensure_ascii=False, indent=1), encoding='utf-8')
        summaries[mode] = {**result['summary'], 'errors':errors}
        print(json.dumps({'mode':mode, **summaries[mode]}, ensure_ascii=True), flush=True)
        context.close()
    summaries['time'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    (OUT / 'golden_isolation.json').write_text(json.dumps(summaries, ensure_ascii=False, indent=2), encoding='utf-8')
    browser.close()
