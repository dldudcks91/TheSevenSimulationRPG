# -*- coding: utf-8 -*-
"""Tactic card badge size in the party tab (filled cards), ko + en, three screen sizes.
Run from PowerShell:  python output/2026-11-26_tactic_used_ui/shot_badge.py --port 8897 --tag after
"""
import argparse, json, os, sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
ap = argparse.ArgumentParser()
ap.add_argument('--port', type=int, default=8897)
ap.add_argument('--tag', default='after')
args = ap.parse_args()
OUT = os.path.dirname(os.path.abspath(__file__))
errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    for lang, size in [('ko', (1600, 800)), ('en', (1600, 800)), ('ko', (1366, 768)), ('ko', (1920, 1080))]:
        ctx = browser.new_context(viewport={'width': size[0], 'height': size[1]})
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(f'{lang}: {e}'))
        page.goto(f'http://127.0.0.1:{args.port}/index.html?dev=tactics&cards=1&lang={lang}')
        page.wait_for_selector('.tc-art img'); page.wait_for_timeout(500)
        m = page.evaluate('''() => [...document.querySelectorAll('.tc-row .tc-card.art')].map(c => {
            const r = c.getBoundingClientRect(), i = c.querySelector('.tc-art img').getBoundingClientRect();
            return {card: [+r.width.toFixed(1), +r.height.toFixed(1)], img: [+i.width.toFixed(1), +i.height.toFixed(1)],
                    inside: i.top >= r.top - 0.5 && i.bottom <= r.bottom + 0.5 && i.left >= r.left - 0.5 && i.right <= r.right + 0.5};
        })''')
        rows = page.evaluate('''() => [...document.querySelectorAll('.tc-row')].map(n => Math.round(n.getBoundingClientRect().height))''')
        print(lang, size, json.dumps(m), 'rows', rows)
        page.locator('.pt-tactics').screenshot(path=os.path.join(OUT, f'{lang}_{size[0]}_badge_{args.tag}.png'))
        ctx.close()
    browser.close()
print('errors:', errors)
