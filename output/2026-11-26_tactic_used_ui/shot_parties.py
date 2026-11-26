# -*- coding: utf-8 -*-
"""ADR-1429 - bag window: section boxes + in-use split by party. Screenshots + small checks, ko + en.
Run from PowerShell:  python output/2026-11-26_tactic_used_ui/shot_parties.py --port 8897
"""
import argparse, json, os, sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
ap = argparse.ArgumentParser()
ap.add_argument('--port', type=int, default=8897)
args = ap.parse_args()
OUT = os.path.dirname(os.path.abspath(__file__))
results, errors = [], []


def check(name, ok, detail=''):
    results.append({'name': name, 'ok': bool(ok), 'detail': detail})
    print(('PASS ' if ok else 'FAIL ') + name + (f' - {detail}' if detail else ''))


with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    for lang in ['ko', 'en']:
        for tag, q in [('p1', ''), ('p2', '&ps=2')]:
            ctx = browser.new_context(viewport={'width': 1600, 'height': 800})
            page = ctx.new_page()
            page.on('pageerror', lambda e: errors.append(f'{lang}{q}: {e}'))
            page.goto(f'http://127.0.0.1:{args.port}/index.html?dev=tactics&cards=1&used=3{q}&bag=attack&lang={lang}')
            page.wait_for_selector('.tcb-modal .tcb-parties'); page.wait_for_timeout(400)
            info = page.evaluate('''() => ({
                skin: document.documentElement.dataset.skin || '',
                secs: [...document.querySelectorAll('.tcb-modal .tcb-sec')].map(s => { const c = getComputedStyle(s); return [c.borderTopWidth, c.borderTopStyle, c.borderRadius]; }),
                cols: [...document.querySelectorAll('.tcb-party')].map(c => ({cls: c.className, name: c.querySelector('.tcb-party-name').innerText,
                        cell: c.querySelector('.tcb-cell').className, w: Math.round(c.querySelector('.tcb-cell').getBoundingClientRect().width)})),
                usedW: Math.round(document.querySelector('.tcb-sec:nth-of-type(2) .tcb-cell, .tcb-modal .tcb-cells .tcb-cell')?.getBoundingClientRect().width || 0),
                fit: (() => { const b = document.querySelector('.modal-box.tcb-modal').getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight + 1; })()
            })''')
            print(lang, tag, json.dumps(info, ensure_ascii=False))
            check(f'{lang} {tag}: three boxed sections', len(info['secs']) == 3 and all(s[1] == 'solid' for s in info['secs']))
            check(f'{lang} {tag}: one column per party (3)', len(info['cols']) == 3)
            check(f'{lang} {tag}: active party name bright', sum('on' in c['cls'].split() for c in info['cols']) == 1)
            check(f'{lang} {tag}: party cells same width as grid cells', all(abs(c['w'] - info['usedW']) <= 1 for c in info['cols']), f"{[c['w'] for c in info['cols']]} vs {info['usedW']}")
            check(f'{lang} {tag}: window fits', info['fit'])
            page.locator('.modal-box.tcb-modal').screenshot(path=os.path.join(OUT, f'{lang}_1600_parties_{tag}.png'))
            # hover a locked party cell -> unlock line tooltip
            lk = page.locator('.tcb-party.locked .tcb-cell')
            if lk.count():
                lk.nth(0).hover(); page.wait_for_timeout(250)
                check(f'{lang} {tag}: locked party tooltip', page.locator('.tip-mini').count() >= 1, page.locator('.tip-mini').first.inner_text() if page.locator('.tip-mini').count() else '')
                page.mouse.move(5, 5)
            ctx.close()
    browser.close()
check('no page errors', not errors, '; '.join(errors[:3]))
print({'pass': sum(r['ok'] for r in results), 'total': len(results)})
