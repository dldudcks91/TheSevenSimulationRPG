# -*- coding: utf-8 -*-
"""ADR-1399 - tactic bag window: grade tabs + inventory-like icon grids + pick bar.
Run from PowerShell:  python output/2026-11-26_tactic_used_ui/verify_bag_grid.py --port 8898
"""
import argparse, json, os, re, sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
ap = argparse.ArgumentParser()
ap.add_argument('--port', type=int, default=8898)
args = ap.parse_args()
OUT = os.path.dirname(os.path.abspath(__file__))
BASE = f'http://127.0.0.1:{args.port}/index.html'
results, errors = [], []
GRADES = ['common', 'magic', 'rare', 'epic', 'legendary']


def check(name, ok, detail=''):
    results.append({'name': name, 'ok': bool(ok), 'detail': detail})
    print(('PASS ' if ok else 'FAIL ') + name + (f' - {detail}' if detail else ''))


def open_bag(browser, lang, q, size=(1600, 800)):
    ctx = browser.new_context(viewport={'width': size[0], 'height': size[1]})
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(f'{lang}{q}: {e}'))
    page.goto(f'{BASE}?dev=tactics&cards=1{q}&bag=attack&lang={lang}')
    page.wait_for_selector('.tcb-modal .tcb-cells')
    page.wait_for_timeout(300)
    return ctx, page


sec = lambda page, i: page.locator('.tcb-modal .tcb-sec').nth(i)
used_cells = lambda page: sec(page, 1).locator('.tcb-cell')
new_cells = lambda page: sec(page, 2).locator('.tcb-cell')


def reopen(page):
    page.locator('.tc-row[data-slot="attack"] .tc-card').click()
    page.wait_for_selector('.tcb-modal .tcb-cells')
    page.wait_for_timeout(200)


with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    for lang in ['ko', 'en']:
        ctx, page = open_bag(browser, lang, '&used=4')
        tabs = page.locator('.tcb-modal .segmented button')
        check(f'{lang}: six grade tabs, first on', tabs.count() == 6 and 'on' in (tabs.nth(0).get_attribute('class') or ''), ' | '.join(tabs.all_inner_texts()))
        check(f'{lang}: icon-only cells (no text but xn)', all(re.fullmatch(r'(×\d+)?', c.strip()) for c in page.locator('.tcb-modal .tcb-cell').all_inner_texts() + new_cells(page).all_inner_texts()))
        check(f'{lang}: new cells carry xn', new_cells(page).count() > 0 and all(t.strip().startswith('×') for t in new_cells(page).all_inner_texts()))
        check(f'{lang}: no pick -> no pick bar', page.locator('.tcb-pick').count() == 0)
        # ADR-1428 - three sections (in use / used / new), in-use cell = one card, not pickable, bigger window and cells
        heads = page.locator('.tcb-modal .tcb-sec-name').all_inner_texts()
        check(f'{lang}: three section heads', len(heads) == 3 and page.locator('.tcb-sec.tcb-in').count() == 1, ' | '.join(heads))
        incell = page.locator('.tcb-in .tcb-cell.cur')
        check(f'{lang}: in-use section holds the slotted card', incell.count() == 1)
        incell.click(); page.wait_for_timeout(150)
        check(f'{lang}: in-use cell is not pickable', page.locator('.tcb-pick').count() == 0)
        incell.hover(); page.wait_for_timeout(250)
        check(f'{lang}: in-use tooltip has 2 option lines', page.locator('.tc-tip .tc-tip-line').count() == 2)
        page.mouse.move(5, 5); page.wait_for_timeout(150)
        mw = page.locator('.modal-box.tcb-modal').bounding_box()['width']; cw = new_cells(page).nth(0).bounding_box()['width']
        check(f'{lang}: window and cells bigger', mw > 760 and cw >= 57, f'window {mw:.0f} cell {cw:.1f}')
        # ADR-1410 - no empty-state text anywhere (legendary tab is empty for used cards here)
        tabs.nth(5).click(); page.wait_for_timeout(200)
        txt = page.locator('.tcb-modal').inner_text()
        check(f'{lang}: no empty-state text', ('없음' not in txt) and ('No ' not in txt), ' | '.join(txt.splitlines())[:200])
        page.locator('.modal-box.tcb-modal').screenshot(path=os.path.join(OUT, f'{lang}_1600_grid_legendary_empty.png'))
        tabs.nth(0).click(); page.wait_for_timeout(200)
        n_used0 = used_cells(page).count()
        shot = lambda name: page.locator('.modal-box.tcb-modal').screenshot(path=os.path.join(OUT, f'{lang}_1600_grid_{name}.png'))
        shot('all')
        # grade tab filters both grids
        tabs.nth(3).click(); page.wait_for_timeout(200)   # rare
        cls = used_cells(page).evaluate_all('ns => ns.map(n => n.className)') + new_cells(page).evaluate_all('ns => ns.map(n => n.className)')
        check(f'{lang}: rare tab shows only rare', cls and all('tc-g-rare' in c for c in cls), f'{len(cls)} cells')
        shot('rare')
        tabs.nth(0).click(); page.wait_for_timeout(200)
        # pick a new card -> bar + equip enabled -> equip closes, old card stored
        new_cells(page).nth(0).click(); page.wait_for_timeout(200)
        check(f'{lang}: picked cell has blue outline', new_cells(page).nth(0).evaluate('n => n.classList.contains("pick")'))
        eq = page.locator('.tcb-pick .tcb-equip')
        check(f'{lang}: pick bar has equip + dismantle', eq.count() == 1 and eq.is_enabled() and page.locator('.tcb-pick .tcb-dis').count() == 1, page.locator('.tcb-pick').inner_text().replace('\n', ' '))
        shot('picked_new')
        eq.click(); page.wait_for_timeout(300)
        check(f'{lang}: equip closes window', page.locator('.tcb-modal').count() == 0)
        reopen(page)
        check(f'{lang}: old card went to used', used_cells(page).count() == n_used0 + 1, f'{n_used0} -> {used_cells(page).count()}')
        # pick used card -> tooltip with 2 option lines, used tag
        used_cells(page).nth(0).hover(); page.wait_for_timeout(250)
        check(f'{lang}: used card tooltip has 2 option lines', page.locator('.tc-tip .tc-tip-line').count() == 2)
        used_cells(page).nth(0).click(); page.wait_for_timeout(200)
        check(f'{lang}: used pick has no tag (ADR-1412)', page.locator('.tcb-pick').count() == 1 and page.locator('.tcb-pick .tcb-used-tag').count() == 0)
        page.mouse.move(5, 5); page.wait_for_timeout(150)
        shot('picked_used')
        # dismantle used: two clicks, pick cleared
        page.locator('.tcb-pick .tcb-dis').click(); page.wait_for_timeout(150)
        armed = page.locator('.tcb-pick .tcb-dis.danger').count() == 1
        page.locator('.tcb-pick .tcb-dis').click(); page.wait_for_timeout(250)
        check(f'{lang}: dismantle two clicks, pick cleared', armed and used_cells(page).count() == n_used0 and page.locator('.tcb-pick').count() == 0)
        # click again on picked cell unpicks
        new_cells(page).nth(1).click(); page.wait_for_timeout(150)
        new_cells(page).nth(1).click(); page.wait_for_timeout(150)
        check(f'{lang}: second click unpicks', page.locator('.tcb-pick').count() == 0)
        ctx.close()

        # storage full: new pick -> equip disabled ; used pick -> enabled
        for size in [(1600, 800), (1366, 768)]:
            ctx, page = open_bag(browser, lang, '&used=10', size)
            new_cells(page).nth(0).click(); page.wait_for_timeout(150)
            d1 = page.locator('.tcb-pick .tcb-equip').is_disabled()
            used_cells(page).nth(0).click(); page.wait_for_timeout(150)
            d2 = page.locator('.tcb-pick .tcb-equip').is_enabled()
            check(f'{lang} {size[0]}: full -> new equip off, used equip on', d1 and d2)
            box = page.locator('.modal-box.tcb-modal').bounding_box()
            check(f'{lang} {size[0]}: window fits', box and box['y'] >= 0 and box['y'] + box['height'] <= size[1] + 1, str(box))
            page.locator('.modal-box.tcb-modal').screenshot(path=os.path.join(OUT, f'{lang}_{size[0]}_grid_full.png'))
            ctx.close()
        # out on expedition: equip off
        ctx, page = open_bag(browser, lang, '&used=2&out=1')
        new_cells(page).nth(0).click(); page.wait_for_timeout(150)
        check(f'{lang}: out -> equip off + lock line', page.locator('.tcb-pick .tcb-equip').is_disabled() and page.locator('.tcb-lock').count() == 1)
        ctx.close()
    browser.close()

check('no page errors', not errors, '; '.join(errors[:3]))
summary = {'pass': sum(r['ok'] for r in results), 'total': len(results)}
json.dump({'summary': summary, 'results': results, 'errors': errors}, open(os.path.join(OUT, 'results_grid.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(summary)
