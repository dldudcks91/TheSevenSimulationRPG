"""Candidate 1 — the depart window is open while another squad's run climbs the wheel (normal gate won -> nightmare 1-1).
Save edit: normal cleared up to (not incl.) the gate 5051 · heroes Lv 50. Party I goes to 5051 with repeat off; Party II opens the depart window; clock runs.
argv: port state_json out_prefix [watch: list|none]
"""
import csv, json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

port, state_file, pre = sys.argv[1], sys.argv[2], sys.argv[3]
F = Path(__file__).resolve().parent
SRC = next(d for d in (F.parent / 'snap' / 'src', F.parents[2] / 'src') if (d / 'data' / 'stage.csv').exists())   # scratch snapshot, else the repo
rows = sorted(csv.DictReader(open(SRC / 'data' / 'stage.csv', encoding='utf-8-sig')), key=lambda r: int(r['stage_id']))
gate = next(int(r['stage_id']) for r in rows if r['chapter'] == '5' and r['boss_grade'] == 'chapter_boss')
before = [int(r['stage_id']) for r in rows if int(r['stage_id']) < gate]

st = json.loads(Path(state_file).read_text(encoding='utf-8'))
saved = 0
for o in st['origins']:
    o['origin'] = f'http://127.0.0.1:{port}'
    for x in o['localStorage']:
        if x['name'] == 'thesevensim.save':
            s = json.loads(x['value'])
            saved = s.get('savedAt') or 0
            s['progress']['cleared'] = before
            for h in s['heroes']:
                h['level'] = 50
            s['runs'] = [None for _ in s.get('runs') or []]   # nothing running at load
            x['value'] = json.dumps(s, ensure_ascii=False)

errs = []
def look(p, tag):
    s = p.evaluate("JSON.parse(localStorage.getItem('thesevensim.save'))")
    runs = [(r['preset'], r['stageId'], r.get('difficulty'), r.get('active'), r.get('auto'), r.get('repeat')) for r in (s.get('runs') or []) if r]
    m = p.evaluate("() => { const l = document.querySelector('#modal'); return {hidden: l.hidden, box: l.querySelectorAll('.modal-box').length, html: l.innerHTML.length}; }")
    main_n = p.evaluate("() => document.querySelector('.main').childElementCount")
    print(tag, 'diff', s.get('difficulty'), 'runs', runs, 'modal', m, 'main', main_n, 'errors', [e[:120] for e in errs], flush=True)

with sync_playwright() as pw:
    b = pw.chromium.launch(channel='msedge', headless=True)
    ctx = b.new_context(viewport={'width': 1600, 'height': 1000}, locale='ko-KR', storage_state=st)
    p = ctx.new_page()
    p.on('pageerror', lambda e: errs.append(str(e)[:200] + ' @ ' + (e.stack or '').split('\n')[1].strip() if e.stack else str(e)))
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
    p.locator('.nav [data-tab=expedition]').first.evaluate('n=>n.click()')
    p.wait_for_timeout(600)
    # Party I -> chapter 5 -> the boss place (last zone) -> send (repeat stays off)
    p.locator('.topbar button', has_text='Party I').first.evaluate('n=>n.click()')
    p.wait_for_timeout(300)
    p.locator('.main .sub-bar button').nth(4).evaluate('n=>n.click()')
    p.wait_for_timeout(500)
    p.locator('.zone.has-bg').last.evaluate('n=>n.click()')
    p.wait_for_timeout(600)
    rep = p.locator('#modal button.toggle.on')
    print('repeat toggles on in window:', rep.count())
    p.locator('#modal button.primary').first.evaluate('n=>n.click()')
    p.wait_for_timeout(1500)
    look(p, 'sent')
    # back to the place list (the expedition tab again — DEV_PLAN #82 path) -> open the depart window and leave it open
    p.locator('.nav [data-tab=expedition]').first.evaluate('n=>n.click()')
    p.wait_for_timeout(600)
    p.locator('.zone.has-bg').first.evaluate('n=>n.click()')
    p.wait_for_timeout(600)
    look(p, 'window open')
    for k in range(40):
        try:
            p.clock.run_for(10000)
        except Exception as ex:   # a timer callback threw — the app clock's render
            errs.append('run_for: ' + str(ex).split('\n')[0][:160] + ' | ' + str(ex).split('\n')[1].strip()[:80])
        p.wait_for_timeout(50)
        s = p.evaluate("JSON.parse(localStorage.getItem('thesevensim.save'))")
        if s.get('difficulty') != 'normal' or errs:
            look(p, f'+{(k + 1) * 10}s')
            break
    p.wait_for_timeout(300)
    p.screenshot(path=str(F / f'{pre}_wheel.png'))
    # what the player can still do — a tab click renders again (through renderModal), then Esc
    n0 = len(errs)
    p.locator('.nav [data-tab=character]').first.evaluate('n=>n.click()')
    p.wait_for_timeout(400)
    look(p, 'after clicking the character tab')
    print('  new errors on that click:', len(errs) - n0)
    p.keyboard.press('Escape')
    p.wait_for_timeout(400)
    look(p, 'after Esc')
    p.screenshot(path=str(F / f'{pre}_wheel_after.png'))
    b.close()
