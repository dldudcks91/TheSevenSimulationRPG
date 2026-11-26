# -*- coding: utf-8 -*-
"""ADR-1397 - narrow card column around the round badge. Filled / empty / locked states, ko + en.
Run from PowerShell:  python output/2026-11-26_tactic_used_ui/verify_narrow_card.py --port 8896
"""
import argparse, json, os, sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
ap = argparse.ArgumentParser()
ap.add_argument('--port', type=int, default=8896)
args = ap.parse_args()
OUT = os.path.dirname(os.path.abspath(__file__))
BASE = f'http://127.0.0.1:{args.port}/index.html'
results, errors = [], []


def check(name, ok, detail=''):
    results.append({'name': name, 'ok': bool(ok), 'detail': detail})
    print(('PASS ' if ok else 'FAIL ') + name + (f' - {detail}' if detail else ''))


STATES = [('filled', '&cards=1'), ('empty', ''), ('locked', '&cn=command:1&tab=party')]
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    for lang in ['ko', 'en']:
        for name, q in STATES:
            ctx = browser.new_context(viewport={'width': 1600, 'height': 800})
            page = ctx.new_page()
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(f'{BASE}?dev=tactics{q}&lang={lang}')
            page.wait_for_timeout(1200)
            if page.locator('.tc-list').count() == 0:
                check(f'{lang} {name}: party tab reached', False)
                ctx.close(); continue
            cards = page.locator('.tc-row .tc-card').evaluate_all('''ns => ns.map(n => {
                const r = n.getBoundingClientRect(), img = n.querySelector('.tc-art img');
                const clipped = [...n.querySelectorAll('*')].some(c => c.scrollWidth > c.clientWidth + 1 && getComputedStyle(c).overflow !== 'visible');
                return {cls: n.className, w: Math.round(r.width), h: Math.round(r.height), img: img ? Math.round(img.getBoundingClientRect().width) : 0,
                        over: n.scrollWidth > n.clientWidth + 1, clipped, txt: n.innerText.replace(/\\n/g, ' / ')};
            })''')
            check(f'{lang} {name}: card width narrow (80-100px)', all(80 <= c['w'] <= 100 for c in cards), json.dumps([c['w'] for c in cards]))
            check(f'{lang} {name}: nothing overflows the card', not any(c['over'] or c['clipped'] for c in cards), json.dumps([(c['txt'], c['h']) for c in cards], ensure_ascii=False))
            if name == 'filled':
                check(f'{lang} {name}: badge still 61px', all(c['img'] >= 58 for c in cards), json.dumps([c['img'] for c in cards]))
            page.locator('.tc-list').screenshot(path=os.path.join(OUT, f'{lang}_1600_narrow_{name}.png'))
            ctx.close()
    browser.close()
check('no page errors', not errors, '; '.join(errors[:3]))
print({'pass': sum(r['ok'] for r in results), 'total': len(results)})
