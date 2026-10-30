"""Capture browser regressions and gold-only fingerprint changes."""
import argparse
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('phase', choices=['baseline', 'candidate', 'final'])
    parser.add_argument('--update-golden', action='store_true')
    args = parser.parse_args()
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        page = browser.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        query = '' if args.phase == 'final' else '?golden=write'
        page.goto('http://127.0.0.1:8777/dev/test.html' + query)
        page.wait_for_function('/PASS|FAIL/.test(document.title)', timeout=240000)
        result = {'title': page.title(), 'failures': page.locator('#out li.fail').all_text_contents(), 'errors': errors}
        if args.phase != 'final':
            body = page.locator('#golden').text_content()
            golden = json.loads(body)
            assert len(golden['runs']) == 60 and len(golden['meta']['parties']) == 10
            (OUT / f'{args.phase}_golden.json').write_text(body, encoding='utf-8')
            if args.phase == 'candidate':
                before = json.loads((OUT / 'baseline_golden.json').read_text(encoding='utf-8'))
                changed = []
                for a, b in zip(before['runs'], golden['runs']):
                    delta = [k for k in set(a) | set(b) if a.get(k) != b.get(k)]
                    assert set(delta) <= {'gold'}, (a['seed'], a['stage'], delta)
                    if delta:
                        changed.append({'seed': a['seed'], 'stage': a['stage'], 'before': a['gold'], 'after': b['gold']})
                assert before['meta']['parties'] == golden['meta']['parties']
                result['goldOnlyChanges'] = changed
            if args.update_golden:
                assert args.phase == 'candidate' and not errors
                assert all(f.startswith('golden:') for f in result['failures']), result['failures']
                target = ROOT / 'src/dev/golden.json'
                current = json.loads(target.read_text(encoding='utf-8-sig'))
                for existing, measured in zip(current['runs'], golden['runs']):
                    assert {k: v for k, v in existing.items() if k != 'gold'} == {k: v for k, v in measured.items() if k != 'gold'}
                    existing['gold'] = measured['gold']
                for key, value in golden['meta']['balance'].items():
                    if key.startswith('monster_gold_support_'):
                        current['meta']['balance'][key] = value
                current['meta']['csvHash']['balance'] = golden['meta']['csvHash']['balance']
                with target.open('w', encoding='utf-8', newline='\n') as stream:
                    stream.write(json.dumps(current, ensure_ascii=False, indent=2) + '\n')
        (OUT / f'{args.phase}.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps(result, ensure_ascii=True))
        browser.close()
        if errors or any(not f.startswith('golden:') for f in result['failures']):
            raise SystemExit(1)


if __name__ == '__main__':
    main()
