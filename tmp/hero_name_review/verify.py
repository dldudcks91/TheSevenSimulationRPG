"""Isolated browser regression and before/after checks for class name pools."""
import argparse
import json
import socket
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
PORT = 8861


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('phase', choices=['before', 'after', 'final'])
    parser.add_argument('--write-golden', action='store_true')
    args = parser.parse_args()
    with socket.socket() as probe:
        if probe.connect_ex(('127.0.0.1', PORT)) == 0:
            raise RuntimeError(f'Port {PORT} is already in use')
    if args.phase == 'before':
        for rel in ['src/game_logic/hero.js', 'src/ui/data.js', 'src/data/hero_name.csv', 'src/dev/golden.json']:
            backup = OUT / ('before_' + Path(rel).name)
            if not backup.exists():
                backup.write_bytes((ROOT / rel).read_bytes())
    with (OUT / 'server.log').open('w', encoding='utf-8') as log:
        server = subprocess.Popen(
            [sys.executable, str(ROOT / 'serve.py'), str(PORT)], cwd=ROOT,
            stdout=log, stderr=log, creationflags=subprocess.CREATE_NO_WINDOW,
        )
        try:
            for _ in range(100):
                with socket.socket() as probe:
                    if probe.connect_ex(('127.0.0.1', PORT)) == 0:
                        break
                time.sleep(0.1)
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(channel='msedge', headless=True)
                page = browser.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(f'http://127.0.0.1:{PORT}/dev/test.html?golden=write', wait_until='domcontentloaded')
                page.wait_for_function('/PASS|FAIL/.test(document.title)', timeout=240000)
                checks = page.locator('#out li').evaluate_all(
                    'nodes => nodes.map(n => ({ok: !n.classList.contains("fail"), text: n.textContent}))'
                )
                result = {
                    'title': page.title(), 'checks': checks,
                    'failures': [check['text'] for check in checks if not check['ok']], 'errors': errors,
                }
                (OUT / f'{args.phase}.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
                print(json.dumps({key: value for key, value in result.items() if key != 'checks'}, ensure_ascii=True), flush=True)
                body = page.locator('#golden').text_content()
                actual = json.loads(body)
                (OUT / f'{args.phase}_golden.json').write_text(body, encoding='utf-8')
                if args.phase != 'before':
                    before = json.loads((OUT / 'before_golden.json').read_text(encoding='utf-8'))
                    strip_names = lambda parties: {
                        key: ['|'.join(value.split('|')[:2] + value.split('|')[3:]) for value in values]
                        for key, values in parties.items()
                    }
                    result['unchanged_party_fields_except_names'] = strip_names(before['meta']['parties']) == strip_names(actual['meta']['parties'])
                    result['unchanged_60_combat_runs'] = before['runs'] == actual['runs']
                    if not result['unchanged_party_fields_except_names'] or not result['unchanged_60_combat_runs']:
                        raise ValueError('Unexpected changes beyond names')
                    if args.write_golden:
                        baseline_failures = json.loads((OUT / 'before.json').read_text(encoding='utf-8'))['failures']
                        new_failures = [failure for failure in result['failures'] if not failure.startswith('golden:') and failure not in baseline_failures]
                        if errors or new_failures or len(actual['runs']) != 60 or len(actual['meta']['parties']) != 10:
                            raise ValueError('Resolve new regressions before updating the snapshot: ' + json.dumps(new_failures, ensure_ascii=True))
                        expected = json.loads((ROOT / 'src/dev/golden.json').read_text(encoding='utf-8'))
                        (OUT / 'expected_golden_before.json').write_bytes((ROOT / 'src/dev/golden.json').read_bytes())
                        # Refresh only the name CSV hash and party name fields; preserve unrelated baseline data.
                        expected['meta']['csvHash']['hero_name'] = actual['meta']['csvHash']['hero_name']
                        for seed, values in expected['meta']['parties'].items():
                            for i, value in enumerate(values):
                                fields = value.split('|')
                                fields[2] = actual['meta']['parties'][seed][i].split('|')[2]
                                values[i] = '|'.join(fields)
                        (ROOT / 'src/dev/golden.json').write_text(json.dumps(expected, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
                (OUT / f'{args.phase}.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
                print(json.dumps({key: value for key, value in result.items() if key != 'checks'}, ensure_ascii=True), flush=True)
                browser.close()
        finally:
            server.terminate()
            server.wait(timeout=10)


if __name__ == '__main__':
    main()
