# -*- coding: utf-8 -*-
"""ADR-1415 - a locked tactic slot card does not open the bag window, open ones still do. ko + en.
Run from PowerShell:  python output/2026-11-26_tactic_used_ui/verify_locked_click.py --port 8897
"""
import argparse, json, os, sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
ap = argparse.ArgumentParser()
ap.add_argument('--port', type=int, default=8897)
args = ap.parse_args()
OUT = os.path.dirname(os.path.abspath(__file__))
BASE = f'http://127.0.0.1:{args.port}/index.html'
results, errors = [], []


def check(name, ok, detail=''):
    results.append({'name': name, 'ok': bool(ok), 'detail': detail})
    print(('PASS ' if ok else 'FAIL ') + name + (f' - {detail}' if detail else ''))


border = lambda loc: loc.evaluate('n => getComputedStyle(n).borderTopColor')
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    for lang in ['ko', 'en']:
        # all three slots locked (no Command Tent yet)
        ctx = browser.new_context(viewport={'width': 1600, 'height': 800})
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(f'{lang}: {e}'))
        page.goto(f'{BASE}?dev=form&lang={lang}')
        page.wait_for_timeout(1200)
        page.keyboard.press('Escape'); page.wait_for_timeout(200)
        page.locator('.nav button[data-tab="party"]').click(); page.wait_for_timeout(500)
        locked = page.locator('.tc-row .tc-card.locked')
        check(f'{lang}: three locked cards, all disabled', locked.count() == 3 and all(locked.nth(i).is_disabled() for i in range(3)))
        b0 = border(locked.nth(0))
        locked.nth(0).hover(force=True); page.wait_for_timeout(150)
        check(f'{lang}: hover does not light the border', border(locked.nth(0)) == b0, b0)
        check(f'{lang}: cursor is default', locked.nth(0).evaluate('n => getComputedStyle(n).cursor') == 'default')
        locked.nth(0).click(force=True); page.wait_for_timeout(300)
        check(f'{lang}: click opens no bag window', page.locator('.tcb-modal').count() == 0 and page.locator('.modal-box').count() == 0)
        page.locator('.tc-list').screenshot(path=os.path.join(OUT, f'{lang}_1600_locked_click.png'))
        ctx.close()
        # open slots still open the bag window
        ctx = browser.new_context(viewport={'width': 1600, 'height': 800})
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(f'{lang}: {e}'))
        page.goto(f'{BASE}?dev=tactics&lang={lang}')
        page.wait_for_selector('.tc-list'); page.wait_for_timeout(300)
        page.locator('.tc-row[data-slot="defense"] .tc-card').click(); page.wait_for_timeout(300)
        check(f'{lang}: open slot still opens the bag', page.locator('.tcb-modal').count() == 1)
        ctx.close()
    browser.close()

check('no page errors', not errors, '; '.join(errors[:3]))
summary = {'pass': sum(r['ok'] for r in results), 'total': len(results)}
json.dump({'summary': summary, 'results': results, 'errors': errors}, open(os.path.join(OUT, 'results_locked_click.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(summary)
