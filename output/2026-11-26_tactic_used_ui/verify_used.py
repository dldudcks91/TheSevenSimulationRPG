# -*- coding: utf-8 -*-
"""R589 / ADR-1390 - tactic card bag modal: used cards (top) / new cards (bottom).

Run from PowerShell (Git Bash can't launch Edge):
    python serve.py 8891          (separate, detached)
    python output/2026-11-26_tactic_used_ui/verify_used.py --port 8891
Writes results.json + screenshots next to this file.
"""
import argparse, json, os, re, sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
ap = argparse.ArgumentParser()
ap.add_argument('--port', type=int, default=8891)
args = ap.parse_args()
OUT = os.path.dirname(os.path.abspath(__file__))
BASE = f'http://127.0.0.1:{args.port}/index.html'
results, errors = [], []


def check(name, ok, detail=''):
    results.append({'name': name, 'ok': bool(ok), 'detail': detail})
    print(('PASS ' if ok else 'FAIL ') + name + (f' - {detail}' if detail else ''))


def open_page(browser, query, lang, size=(1600, 800)):
    ctx = browser.new_context(viewport={'width': size[0], 'height': size[1]})
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(f'{lang} {query}: {e}'))
    page.goto(f'{BASE}?dev=tactics&cards=1&lang={lang}{query}')
    page.wait_for_timeout(900)
    return ctx, page


def secs(page):
    return page.locator('.tcb-modal .tcb-sec')


def store_text(page):
    return secs(page).nth(0).locator('.tcb-store').inner_text()


def shot(page, name):
    page.locator('.modal-box.tcb-modal').screenshot(path=os.path.join(OUT, name))


def reopen(page, slot='attack'):
    page.locator(f'.tc-row[data-slot="{slot}"] .tc-card').click()
    page.wait_for_selector('.tcb-modal .tcb-sec')


with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    for lang in ['ko', 'en']:
        # 1. basic flow - empty used list -> one-click swap -> used card with two lines -> equip used -> dismantle (two clicks)
        ctx, page = open_page(browser, '&bag=attack', lang)
        page.wait_for_selector('.tcb-modal .tcb-sec')
        check(f'{lang}: two sections', secs(page).count() == 2)
        check(f'{lang}: used empty row', secs(page).nth(0).locator('.tcb-empty').count() == 1)
        check(f'{lang}: store 0 / cap', re.search(r'\b0 / 10\b', store_text(page)) is not None, store_text(page))
        shot(page, f'{lang}_1600_bag_used_empty.png')
        cur0 = page.locator('.tcb-cur .tc-name').inner_text()
        new_eq = secs(page).nth(1).locator('.tcb-equip')
        check(f'{lang}: new equip enabled', new_eq.count() > 0 and new_eq.first.is_enabled())
        new_name = secs(page).nth(1).locator('.tc-name').first.inner_text()
        new_eq.first.click()   # one click (ADR-1390)
        page.wait_for_timeout(300)
        check(f'{lang}: one click swaps and closes', page.locator('.tcb-modal').count() == 0)
        reopen(page)
        used_rows = secs(page).nth(0).locator('.tcb-id')
        check(f'{lang}: old card stored', used_rows.count() == 1 and used_rows.first.inner_text().strip() == cur0.strip(), f'{cur0} -> {used_rows.first.inner_text() if used_rows.count() else None}')
        check(f'{lang}: stored card shows 2 lines', secs(page).nth(0).locator('.tcb-line').count() == 2)
        check(f'{lang}: store 1 / cap', re.search(r'\b1 / 10\b', store_text(page)) is not None, store_text(page))
        check(f'{lang}: slot now new card', page.locator('.tcb-cur .tc-name').inner_text().strip() == new_name.strip())
        shot(page, f'{lang}_1600_bag_used_one.png')
        # tooltip on stored card
        used_rows.first.hover()
        page.wait_for_timeout(250)
        check(f'{lang}: stored card tooltip', page.locator('.tc-tip').count() >= 1)
        # equip the stored card back - swap keeps count
        secs(page).nth(0).locator('.tcb-equip').first.click()
        page.wait_for_timeout(300)
        reopen(page)
        check(f'{lang}: used swap back', page.locator('.tcb-cur .tc-name').inner_text().strip() == cur0.strip()
              and secs(page).nth(0).locator('.tcb-id').first.inner_text().strip() == new_name.strip())
        check(f'{lang}: store still 1', re.search(r'\b1 / 10\b', store_text(page)) is not None, store_text(page))
        # dismantle stored card - two clicks
        shards0 = page.locator('.modal-head .tc-shards b').inner_text()
        dis = secs(page).nth(0).locator('.tcb-dis').first
        dis.click()
        page.wait_for_timeout(200)
        armed = secs(page).nth(0).locator('.tcb-dis.danger').count() == 1
        check(f'{lang}: dismantle first click arms', armed and secs(page).nth(0).locator('.tcb-id').count() == 1)
        shot(page, f'{lang}_1600_bag_used_dis_armed.png')
        secs(page).nth(0).locator('.tcb-dis.danger').click()
        page.wait_for_timeout(300)
        check(f'{lang}: dismantle second click removes', secs(page).nth(0).locator('.tcb-id').count() == 0
              and page.locator('.modal-head .tc-shards b').inner_text() != shards0, f'shards {shards0} -> {page.locator(".modal-head .tc-shards b").inner_text()}')
        # bag count on the slot card = new + used
        page.keyboard.press('Escape')
        page.wait_for_timeout(200)
        check(f'{lang}: modal closes on Esc', page.locator('.tcb-modal').count() == 0)
        ctx.close()

        # 2. storage full - new-card equip disabled, used-card equip enabled
        for size in [(1600, 800), (1366, 768)]:
            ctx, page = open_page(browser, '&used=10&bag=attack', lang, size)
            page.wait_for_selector('.tcb-modal .tcb-sec')
            st = secs(page).nth(0).locator('.tcb-store')
            check(f'{lang} {size[0]}: store full', 'full' in (st.get_attribute('class') or '') and re.search(r'\b10 / 10\b', st.inner_text()) is not None, st.inner_text())
            ne = secs(page).nth(1).locator('.tcb-equip')
            check(f'{lang} {size[0]}: new equip disabled when full', ne.count() > 0 and all(not ne.nth(i).is_enabled() for i in range(ne.count())))
            ue = secs(page).nth(0).locator('.tcb-equip')
            check(f'{lang} {size[0]}: used equip enabled when full', ue.count() > 0 and ue.first.is_enabled(), f'{ue.count()} used rows in attack')
            cut = page.locator('.tcb-modal .tc-name').evaluate_all('ns => ns.filter(n => n.scrollWidth > n.clientWidth + 1).map(n => n.textContent)')
            check(f'{lang} {size[0]}: no card name truncated', not cut, ', '.join(cut))
            box = page.locator('.modal-box.tcb-modal').bounding_box()
            check(f'{lang} {size[0]}: modal fits viewport', box and box['y'] >= 0 and box['y'] + box['height'] <= size[1] + 1, str(box))
            shot(page, f'{lang}_{size[0]}_bag_full.png')
            ctx.close()

        # 3. formation out on an expedition - lock line, all equips disabled for the filled slot; empty slot insert still allowed
        ctx, page = open_page(browser, '&used=2&out=1&bag=attack', lang)
        page.wait_for_selector('.tcb-modal .tcb-sec')
        check(f'{lang}: lock line', page.locator('.tcb-lock').count() == 1, page.locator('.tcb-lock').inner_text() if page.locator('.tcb-lock').count() else '')
        eqs = page.locator('.tcb-modal .tcb-equip')
        check(f'{lang}: all equips disabled while out', eqs.count() > 0 and all(not eqs.nth(i).is_enabled() for i in range(eqs.count())))
        check(f'{lang}: dismantle still enabled while out', page.locator('.tcb-modal .tcb-dis').first.is_enabled())
        shot(page, f'{lang}_1600_bag_out_locked.png')
        ctx.close()
    browser.close()

summary = {'pass': sum(r['ok'] for r in results), 'total': len(results), 'pageErrors': len(errors)}
json.dump({'summary': summary, 'results': results, 'errors': errors}, open(os.path.join(OUT, 'results.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(summary)
