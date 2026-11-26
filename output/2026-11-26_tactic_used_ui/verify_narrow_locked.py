# -*- coding: utf-8 -*-
"""ADR-1397 - locked slots (no Command Tent yet) in the narrow card column, ko + en.
Run from PowerShell:  python output/2026-11-26_tactic_used_ui/verify_narrow_locked.py --port 8896
"""
import argparse, json, os, sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
ap = argparse.ArgumentParser()
ap.add_argument('--port', type=int, default=8896)
args = ap.parse_args()
OUT = os.path.dirname(os.path.abspath(__file__))
ok_all = True
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    for lang in ['ko', 'en']:
        ctx = browser.new_context(viewport={'width': 1600, 'height': 800})
        page = ctx.new_page()
        page.goto(f'http://127.0.0.1:{args.port}/index.html?dev=form&lang={lang}')
        page.wait_for_timeout(1200)
        page.keyboard.press('Escape')
        page.wait_for_timeout(200)
        page.locator('.nav button[data-tab="party"]').click()
        page.wait_for_timeout(500)
        cards = page.locator('.tc-row .tc-card').evaluate_all('''ns => ns.map(n => ({w: Math.round(n.getBoundingClientRect().width), h: Math.round(n.getBoundingClientRect().height),
            over: n.scrollWidth > n.clientWidth + 1 || [...n.querySelectorAll('*')].some(c => c.scrollWidth > c.clientWidth + 1), txt: n.innerText.replace(/\\n/g, ' / ')}))''')
        good = bool(cards) and not any(c['over'] for c in cards)
        ok_all &= good
        print(('PASS ' if good else 'FAIL ') + f'{lang} locked: no overflow - ' + json.dumps(cards, ensure_ascii=False))
        page.locator('.tc-list').screenshot(path=os.path.join(OUT, f'{lang}_1600_narrow_locked.png'))
        ctx.close()
    browser.close()
print('ALL PASS' if ok_all else 'SOME FAIL')
