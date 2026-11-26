# -*- coding: utf-8 -*-
"""ADR-1391 - tactic card art: icons/tactics/<card_id> for duel/shieldwall/trojan, sin icon for the rest.
Run from PowerShell:  python output/2026-11-26_tactic_used_ui/verify_card_art.py --port 8892
"""
import argparse, json, os, sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
ap = argparse.ArgumentParser()
ap.add_argument('--port', type=int, default=8892)
args = ap.parse_args()
OUT = os.path.dirname(os.path.abspath(__file__))
BASE = f'http://127.0.0.1:{args.port}/index.html'
results, errors, bad = [], [], []


def check(name, ok, detail=''):
    results.append({'name': name, 'ok': bool(ok), 'detail': detail})
    print(('PASS ' if ok else 'FAIL ') + name + (f' - {detail}' if detail else ''))


with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    for lang in ['ko', 'en']:
        ctx = browser.new_context(viewport={'width': 1600, 'height': 800})
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('response', lambda r: bad.append(r.url) if r.status >= 400 else None)
        page.goto(f'{BASE}?dev=tactics&cards=1&used=6&lang={lang}')
        page.wait_for_timeout(1200)
        # party tab rows: attack = duel (has art) / defense = guard? (first bag card per slot)
        srcs = page.locator('.tc-row .tc-card.art .tc-art img').evaluate_all('ns => ns.map(n => [n.getAttribute("src"), n.naturalWidth])')
        # ADR-1392 - a filled card shows the picture only: no text inside, picture fills the card
        info = page.locator('.tc-row .tc-card.art').evaluate_all('ns => ns.map(n => ({txt: n.innerText.trim(), h: n.querySelector("img")?.getBoundingClientRect().height ?? 0, ch: n.getBoundingClientRect().height}))')
        check(f'{lang}: filled cards have no text', info and all(i['txt'] == '' for i in info), json.dumps(info))
        check(f'{lang}: picture fills the card (>= 60px)', info and all(i['h'] >= 60 for i in info), json.dumps(info))
        page.locator('.tc-list').screenshot(path=os.path.join(OUT, f'{lang}_1600_party_cards_image_only.png'))
        page.locator('.tc-row .tc-card.art').first.hover()
        page.wait_for_timeout(300)
        tip = page.locator('.tc-tip')
        check(f'{lang}: hover tooltip has the name', tip.count() >= 1 and len(tip.first.inner_text().strip()) > 0, tip.first.inner_text().replace('\n', ' | ') if tip.count() else '')
        page.locator('.tc-list').screenshot(path=os.path.join(OUT, f'{lang}_1600_party_cards_image_only_tip.png'))
        page.mouse.move(5, 5)
        page.wait_for_timeout(200)
        check(f'{lang}: party tab card images load', srcs and all(w > 0 for _, w in srcs), json.dumps(srcs))
        check(f'{lang}: a row with an art card uses tactic art (others sin icon)', any('/tactics/' in s for s, _ in srcs) and any('/sins/' in s for s, _ in srcs), json.dumps([s for s, _ in srcs]))
        page.locator('.party-tab, .tab-party, body').first.screenshot(path=os.path.join(OUT, f'{lang}_1600_party_card_art.png'))
        for slot in ['attack', 'defense']:
            page.locator(f'.tc-row[data-slot="{slot}"] .tc-card').click()
            page.wait_for_selector('.tcb-modal .tcb-sec')
            page.wait_for_timeout(400)
            imgs = page.locator('.tcb-modal .tc-ico img').evaluate_all('ns => ns.map(n => [n.getAttribute("src"), n.naturalWidth])')
            check(f'{lang} {slot}: bag images load', imgs and all(w > 0 for _, w in imgs))
            arts = sorted({s.split('/')[-1] for s, _ in imgs if '/tactics/' in s})
            check(f'{lang} {slot}: tactic art present', bool(arts), ', '.join(arts))
            page.locator('.modal-box.tcb-modal').screenshot(path=os.path.join(OUT, f'{lang}_1600_bag_{slot}_art.png'))
            page.keyboard.press('Escape')
            page.wait_for_timeout(200)
        ctx.close()
    browser.close()

check('no page errors', not errors, '; '.join(errors[:3]))
check('no failed requests', not bad, '; '.join(bad[:3]))
print({'pass': sum(r['ok'] for r in results), 'total': len(results)})
