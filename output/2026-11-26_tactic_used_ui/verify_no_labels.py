# -*- coding: utf-8 -*-
"""ADR-1412 - no bag count / store count / name-tag text on the tactic screens, ko + en.
Run from PowerShell:  python output/2026-11-26_tactic_used_ui/verify_no_labels.py --port 8897
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
# words that must not appear any more (ADR-1412) - built from code points so no Korean literal sits in the file
KO = {'bag': '가방', 'cur': '장착 중', 'store': '보관', 'used': '사용한 카드'}
EN = {'bag': 'Bag', 'cur': 'Equipped', 'store': 'Stored', 'full': 'Storage full', 'used': 'Used'}


def check(name, ok, detail=''):
    results.append({'name': name, 'ok': bool(ok), 'detail': detail})
    print(('PASS ' if ok else 'FAIL ') + name + (f' - {detail}' if detail else ''))


def card_texts(page):
    return page.locator('.tc-row .tc-card').evaluate_all('''ns => ns.map(n => ({cls: n.className, txt: n.innerText.replace(/\\n/g, ' / '),
        over: n.scrollWidth > n.clientWidth + 1 || [...n.querySelectorAll('*')].some(c => c.scrollWidth > c.clientWidth + 1)}))''')


with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    for lang in ['ko', 'en']:
        W = KO if lang == 'ko' else EN
        # 1) formation tab - empty cards with cards in the bag (lots, via &used to also fill storage)
        ctx = browser.new_context(viewport={'width': 1600, 'height': 800})
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(f'{lang}: {e}'))
        page.goto(f'{BASE}?dev=tactics&lang={lang}')
        page.wait_for_selector('.tc-list'); page.wait_for_timeout(300)
        cards = card_texts(page)
        check(f'{lang} empty: card text = slot name only', cards and all(W['bag'] not in c['txt'] and ' / ' not in c['txt'] for c in cards), json.dumps([c['txt'] for c in cards], ensure_ascii=False))
        check(f'{lang} empty: .bag class kept (mission guide)', all('bag' in c['cls'].split() for c in cards))
        check(f'{lang} empty: no overflow', not any(c['over'] for c in cards))
        page.locator('.tc-list').screenshot(path=os.path.join(OUT, f'{lang}_1600_nolabel_empty.png'))
        ctx.close()
        # 2) formation tab - locked slots
        ctx = browser.new_context(viewport={'width': 1600, 'height': 800})
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(f'{lang}: {e}'))
        page.goto(f'{BASE}?dev=form&lang={lang}')
        page.wait_for_timeout(1200)
        page.keyboard.press('Escape'); page.wait_for_timeout(200)
        page.locator('.nav button[data-tab="party"]').click(); page.wait_for_timeout(500)
        cards = card_texts(page)
        locked = [c for c in cards if 'locked' in c['cls'].split()]
        check(f'{lang} locked: no bag count', locked and all(W['bag'] not in c['txt'] for c in locked), json.dumps([c['txt'] for c in cards], ensure_ascii=False))
        check(f'{lang} locked: no overflow', not any(c['over'] for c in cards))
        page.locator('.tc-list').screenshot(path=os.path.join(OUT, f'{lang}_1600_nolabel_locked.png'))
        ctx.close()
        # 3) bag window - card in the slot, used cards, pick a used card
        ctx = browser.new_context(viewport={'width': 1600, 'height': 800})
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(f'{lang}: {e}'))
        page.goto(f'{BASE}?dev=tactics&cards=1&used=4&bag=attack&lang={lang}')
        page.wait_for_selector('.tcb-modal .tcb-cells'); page.wait_for_timeout(300)
        cur = page.locator('.tcb-modal .tcb-in').inner_text()
        allowed = [page.locator('.tcb-in .tcb-sec-name').inner_text().strip()] + [s.strip() for s in page.locator('.tcb-in .tcb-party-name').all_inner_texts()]
        check(f'{lang} bag: in-use section = head + party names + cells only (ADR-1429)', [s.strip() for s in cur.splitlines() if s.strip()] == allowed and page.locator('.tcb-in .tcb-cell.cur').count() == 1, cur.replace('\n', ' | '))
        heads = ' | '.join(page.locator('.tcb-modal .tcb-sec-h').all_inner_texts())
        check(f'{lang} bag: section heads only names (no store count)', W['store'] not in heads and '/' not in heads, heads)
        page.locator('.tcb-modal .tcb-sec').nth(1).locator('.tcb-cell').nth(0).click(); page.wait_for_timeout(200)
        bar = page.locator('.tcb-pick').inner_text()
        check(f'{lang} bag: used pick bar has no used tag', W['used'] not in bar, bar.replace('\n', ' | '))
        page.mouse.move(5, 5); page.wait_for_timeout(150)
        page.locator('.modal-box.tcb-modal').screenshot(path=os.path.join(OUT, f'{lang}_1600_nolabel_bag.png'))
        ctx.close()
        # 4) bag window - storage full: no full text, new-card equip still off
        ctx = browser.new_context(viewport={'width': 1600, 'height': 800})
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(f'{lang}: {e}'))
        page.goto(f'{BASE}?dev=tactics&cards=1&used=10&bag=attack&lang={lang}')
        page.wait_for_selector('.tcb-modal .tcb-cells'); page.wait_for_timeout(300)
        txt = page.locator('.tcb-modal').inner_text()
        check(f'{lang} full: no store / full text', W['store'] not in txt and W.get('full', '가득') not in txt, ' | '.join(txt.splitlines())[:200])
        page.locator('.tcb-modal .tcb-sec').nth(2).locator('.tcb-cell').nth(0).click(); page.wait_for_timeout(150)
        check(f'{lang} full: new-card equip off', page.locator('.tcb-pick .tcb-equip').is_disabled())
        page.mouse.move(5, 5); page.wait_for_timeout(150)
        page.locator('.modal-box.tcb-modal').screenshot(path=os.path.join(OUT, f'{lang}_1600_nolabel_full.png'))
        ctx.close()
    browser.close()

check('no page errors', not errors, '; '.join(errors[:3]))
summary = {'pass': sum(r['ok'] for r in results), 'total': len(results)}
json.dump({'summary': summary, 'results': results, 'errors': errors}, open(os.path.join(OUT, 'results_nolabel.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(summary)
