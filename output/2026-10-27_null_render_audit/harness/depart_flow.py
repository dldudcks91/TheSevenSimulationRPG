"""Regression for #90's fix — the depart window and its confirm window still work as before. argv: port state_json"""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

port, state_file = sys.argv[1], sys.argv[2]
st = json.loads(Path(state_file).read_text(encoding='utf-8'))
saved = 0
for o in st['origins']:
    o['origin'] = f'http://127.0.0.1:{port}'
    for x in o['localStorage']:
        if x['name'] == 'thesevensim.save':
            s = json.loads(x['value'])
            saved = s.get('savedAt') or 0
            s['runs'] = [None for _ in s.get('runs') or []]
            x['value'] = json.dumps(s, ensure_ascii=False)
errs = []

def look(p, tag):
    s = p.evaluate("JSON.parse(localStorage.getItem('thesevensim.save'))")
    runs = [(r['preset'], r['stageId'], r.get('active')) for r in (s.get('runs') or []) if r]
    m = p.evaluate("""() => { const l = document.querySelector('#modal');
        return {open: !l.hidden, depart: !!l.querySelector('.depart-box'), confirm: !!l.querySelector('.dismiss-box'), auto: !!l.querySelector('.auto-modal'),
                head: (l.querySelector('.dw-title') || {}).innerText || null}; }""")
    print(f'{tag:<34}', 'runs', runs, 'modal', m, 'errors', errs, flush=True)

with sync_playwright() as pw:
    b = pw.chromium.launch(channel='msedge', headless=True)
    ctx = b.new_context(viewport={'width': 1600, 'height': 1000}, locale='ko-KR', storage_state=st)
    p = ctx.new_page()
    p.on('pageerror', lambda e: errs.append(str(e)[:160]))
    p.clock.install(time=(saved + 30000) / 1000)
    p.goto(f'http://127.0.0.1:{port}/', wait_until='domcontentloaded')
    p.wait_for_timeout(1500)
    p.locator('.mn-btn').nth(1).evaluate('n=>n.click()')
    p.wait_for_timeout(1500)
    for _ in range(3):
        bb = p.locator('#modal button.primary')
        if bb.count():
            bb.first.evaluate('n=>n.click()')
            p.wait_for_timeout(400)
    click = lambda sel, i=0: (p.locator(sel).nth(i).evaluate('n=>n.click()'), p.wait_for_timeout(500))
    click('.nav [data-tab=expedition]')
    click('.zone.has-bg', 0)
    look(p, '1 window open')
    click('#modal button.primary')
    look(p, '2 sent (battle view)')
    click('.nav [data-tab=expedition]')          # back to the list while the squad runs
    click('.zone.has-bg', 1)
    look(p, '3 window on another place')
    click('#modal button.primary')
    look(p, '4 send again -> confirm window')
    click('#modal .dismiss-box button', 1)        # [cancel]
    look(p, '5 cancel -> back to depart window')
    swap = p.locator('#modal .depart-box button', has_text='바꾸기')   # [change] opens auto-salvage
    if swap.count():
        swap.first.evaluate('n=>n.click()'); p.wait_for_timeout(500)
        look(p, '6 auto-salvage from depart')
        click('#modal .modal-x')
        look(p, '7 close -> depart window again')
    click('#modal button.primary')
    look(p, '8 send again -> confirm')
    click('#modal .dismiss-box button', 0)        # [ok]
    look(p, '9 ok -> new run')
    b.close()
