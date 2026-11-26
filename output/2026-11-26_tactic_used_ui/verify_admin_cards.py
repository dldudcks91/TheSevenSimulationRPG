# -*- coding: utf-8 -*-
"""SCREEN_DESIGN §10-3 - Admin panel 'Tactic Cards' [Add] tops up every card x grade to admin_tactic_cards.
Run from PowerShell:  python output/2026-11-26_tactic_used_ui/verify_admin_cards.py --port 8894
"""
import argparse, json, os, re, sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
ap = argparse.ArgumentParser()
ap.add_argument('--port', type=int, default=8894)
args = ap.parse_args()
OUT = os.path.dirname(os.path.abspath(__file__))
BASE = f'http://127.0.0.1:{args.port}/index.html'
results, errors = [], []


def check(name, ok, detail=''):
    results.append({'name': name, 'ok': bool(ok), 'detail': detail})
    print(('PASS ' if ok else 'FAIL ') + name + (f' - {detail}' if detail else ''))


def bag_counts(page):
    return page.evaluate('''() => {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            try { const s = JSON.parse(localStorage.getItem(k)); if (s && s.tacticBag) return s.tacticBag; } catch (e) {}
        }
        return null; }''')


with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    ctx = browser.new_context(viewport={'width': 1600, 'height': 800})
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(f'{BASE}?dev=tactics&lang=ko')
    page.wait_for_timeout(1200)
    page.locator('.da-b').click()
    page.wait_for_timeout(200)
    row_k = page.locator('.da-panel .da-k', has_text='Tactic Cards')
    check('admin row present', row_k.count() == 1)
    val = page.locator('.da-panel .da-v', has_text='all grades')
    check('admin row value', val.count() == 1, val.first.inner_text() if val.count() else '')
    page.screenshot(path=os.path.join(OUT, 'admin_panel_tactic_cards.png'), clip={'x': 1000, 'y': 0, 'width': 600, 'height': 330})
    # the Add button sits right after the value cell in the same grid row
    add = page.locator('.da-panel .da-v', has_text='all grades').locator('xpath=following-sibling::button[1]')
    check('add enabled', add.count() == 1 and add.is_enabled())
    add.click()
    page.wait_for_timeout(500)
    bag = bag_counts(page) or {}
    n_cards = page.evaluate('() => 0') if False else None
    full = [k for k, v in bag.items() if v >= 10]
    check('every card x grade topped up to 10', len(full) == 55 and all(v >= 10 for v in bag.values()), f'{len(full)} keys >= 10 of {len(bag)}')
    add.click()
    page.wait_for_timeout(300)
    bag2 = bag_counts(page) or {}
    check('second Add does not exceed (top-up)', bag2 == bag, f'{sum(bag.values())} -> {sum(bag2.values())}')
    # bag window shows them
    page.locator('.da-x').click()
    page.locator('.tc-row[data-slot="attack"] .tc-card').click()
    page.wait_for_selector('.tcb-modal .tcb-sec')
    rows = page.locator('.tcb-modal .tcb-sec').nth(1).locator('.tcb-n').all_inner_texts()
    check('attack bag lists 4 cards x 5 grades', len(rows) == 20 and all(r.strip() in ('×10', '×11') for r in rows), ', '.join(rows))
    page.locator('.modal-box.tcb-modal').screenshot(path=os.path.join(OUT, 'admin_cards_bag_attack.png'))
    ctx.close()
    browser.close()

check('no page errors', not errors, '; '.join(errors[:3]))
print({'pass': sum(r['ok'] for r in results), 'total': len(results)})
