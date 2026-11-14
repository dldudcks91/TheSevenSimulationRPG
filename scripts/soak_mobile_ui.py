"""Real-time mobile navigation, rotation and save/reload soak in an isolated profile."""
import argparse
import hashlib
import json
import os
import subprocess
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--port', type=int, default=8854)
parser.add_argument('--minutes', type=float, default=25)
parser.add_argument('--output-dir', default='tmp/mobile_review/soak')
parser.add_argument('--rules-from-head', action='store_true', help='Diagnostic only: isolate mobile UI from concurrent game rule edits using committed rules/CSV.')
args = parser.parse_args()
OUT = ROOT / args.output_dir
OUT.mkdir(parents=True, exist_ok=True)
os.environ['PW_TEST_SCREENSHOT_NO_FONTS_READY'] = '1'
records, errors, sources = [], [], []
baseline = {}
if args.rules_from_head:
    names = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', 'HEAD', 'src/game_logic', 'src/data'], cwd=ROOT, text=True).splitlines()
    for name in names:
        if name.startswith('src/game_logic/') and name.endswith('.js') or name.startswith('src/data/') and name.count('/') == 2 and name.endswith('.csv'):
            baseline['/' + name.removeprefix('src/')] = subprocess.check_output(['git', 'show', 'HEAD:' + name], cwd=ROOT)
    baseline['/ui/mock.js'] = subprocess.check_output(['git', 'show', 'HEAD:src/ui/mock.js'], cwd=ROOT)
started = time.monotonic()
HARNESS = '''
window.__mobileSoak = () => ({tab:state.tab, exp:state.exp,
 heroes:G?.heroes.map(h=>h.uid), items:Object.keys(G?.items ?? {}).length,
 gold:G?.resources.gold, time:G?.expMs, modal:state.modal,
 run:state.battle?.run?.stageId, nodes:document.querySelectorAll('*').length,
 heap:performance.memory?.usedJSHeapSize,
 layout:(()=>{const m=document.querySelector('.main');return {width:m.clientWidth,scroll:m.scrollWidth,height:m.clientHeight,scrollHeight:m.scrollHeight,pane:document.querySelector('.main .mobile-page-tab.on')?.id}})()});
'''


def stamp():
    return round(time.monotonic() - started, 2)


def save():
    report = {'rules_source': 'git HEAD (diagnostic isolation)' if baseline else 'working tree',
              'elapsed_seconds': stamp(), 'requested_seconds': args.minutes * 60,
              'sources': sources, 'errors': errors, 'records': records}
    (OUT / 'results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')


def source_stamp():
    sources.append({'at': stamp(), 'sha256': {name: hashlib.sha256(baseline.get('/' + name, (ROOT/'src'/name).read_bytes())).hexdigest()
                    for name in ['ui/mobile.js', 'ui/mobile.css', 'ui/mobile-pages.js', 'ui/mobile-pages.css', 'ui/app.js', 'game_logic/battle.js', 'data/skill_effect.csv']}})


def resume_departure(page):
    # Closing/reloading the game ends an expedition by design. The idle party
    # button opens its last departure dialog; resume through those real controls.
    if page.evaluate('__mobileSoak().modal') == 'depart':
        page.locator('.depart-box .form-actions .primary').tap()
    if page.evaluate('__mobileSoak().modal') == 'departConfirm':
        page.locator('.dismiss-actions .primary').tap()


with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    context = browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
    context.add_init_script("localStorage.setItem('devAdmin', '1')")
    if baseline:
        from urllib.parse import urlparse
        def baseline_route(route):
            path = urlparse(route.request.url).path
            if path in baseline:
                route.fulfill(status=200, content_type='text/javascript' if path.endswith('.js') else 'text/csv', body=baseline[path])
            else:
                route.continue_()
        context.route('**/game_logic/**', baseline_route)
        context.route('**/data/*.csv', baseline_route)
        context.route('**/ui/mock.js', baseline_route)
    context.route('**/ui/app.js', lambda r: r.fulfill(status=200, content_type='text/javascript',
                  body=(ROOT/'src/ui/app.js').read_text(encoding='utf-8') + HARNESS))
    page = context.new_page()
    page.set_default_timeout(10000)
    page.on('pageerror', lambda e: errors.append({'at': stamp(), 'error': str(e)}))
    source_stamp()
    page.goto(f'http://127.0.0.1:{args.port}/index.html?dev=play&skin=d2min&lang=ko', wait_until='domcontentloaded')
    page.wait_for_selector('.b-pause', timeout=60000)
    # Reload the saved game later, without reapplying the development battle setup.
    page.evaluate("history.replaceState(null, '', '?tab=character&skin=d2min&lang=ko')")
    initial_heroes = page.evaluate('__mobileSoak().heroes')
    cycle = 0
    while stamp() < args.minutes * 60:
        try:
            if cycle and cycle % 20 == 0:
                source_stamp()
                page.reload(wait_until='domcontentloaded')
                page.wait_for_selector('.mobile-dock', timeout=60000)
            mode = cycle % 12
            if mode in [0, 6]:
                page.set_viewport_size({'width': 390, 'height': 844} if mode == 0 else {'width': 844, 'height': 390})
            if mode in [2, 4, 8, 10]:
                destination = {2: 'character', 4: 'shop', 8: 'forge', 10: 'help'}[mode]
                page.locator('[data-mobile-menu]').tap()
                page.locator(f'.nav [data-tab="{destination}"]').tap()
                for _ in range(8):
                    tutorial = page.locator('.tutorial-card button').first
                    if not tutorial.count() or not tutorial.is_visible(): break
                    tutorial.tap()
                sections = page.locator('.main .mobile-pages button')
                if sections.count(): sections.nth(cycle % sections.count()).tap()
            else:
                page.locator('.tab-seg button').first.tap()
                resume_departure(page)
            current = page.evaluate('__mobileSoak()')
            current.update({'cycle': cycle, 'at': stamp()})
            current['ok'] = current['heroes'] == initial_heroes and current['layout']['scroll'] <= current['layout']['width'] + 2 and current['layout']['scrollHeight'] <= current['layout']['height'] + 2
            records.append(current)
            if cycle % 20 == 0:
                page.screenshot(path=str(OUT / f'cycle-{cycle:03d}.png'))
            print(json.dumps({'cycle': cycle, 'seconds': stamp(), 'tab': current['tab'],
                              'time': current['time'], 'gold': current['gold'], 'ok': current['ok'], 'errors': len(errors)}), flush=True)
        except Exception as e:
            records.append({'cycle': cycle, 'at': stamp(), 'ok': False, 'error': str(e)})
        cycle += 1
        save()
        page.wait_for_timeout(min(15000, max(0, args.minutes * 60000 - stamp() * 1000)))
    save()
    browser.close()
ok = bool(records) and all(r['ok'] for r in records) and not errors
print(f"{'PASS' if ok else 'FAIL'}: {len(records)} cycles, {stamp()} seconds, {len(errors)} browser exceptions", flush=True)
raise SystemExit(0 if ok else 1)
