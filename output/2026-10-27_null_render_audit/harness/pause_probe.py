"""Candidate D, probed — pause while the result band counts, leave past the restart gap, come back by the top squad button.
argv: port state_json out_prefix variant
  variant A: resume right after coming back · B: stay paused 30 s then resume · C: control (no pause)
Every 10 s: run slot (stage · active · lastAt) · report count · bag · pause label · arena round / HP text. After 120 s a tab round-trip (re-render) and 60 s more.
"""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

port, state_file, pre, variant = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
F = Path(__file__).resolve().parent
st = json.loads(Path(state_file).read_text(encoding='utf-8'))
saved = 0
for o in st['origins']:
    o['origin'] = f'http://127.0.0.1:{port}'
    for x in o['localStorage']:
        if x['name'] == 'thesevensim.save':
            s = json.loads(x['value'])
            saved = s.get('savedAt') or 0
            for h in s['heroes']:
                h['level'] = 50
            s['runs'] = [None for _ in s.get('runs') or []]
            x['value'] = json.dumps(s, ensure_ascii=False)
errs = []
PAUSE_KO = '일시정지'

def snap(p):
    return p.evaluate("""() => {
      const s = JSON.parse(localStorage.getItem('thesevensim.save'));
      const run = (s.runs || []).find(r => r && r.preset === 1);
      const pb = document.querySelector('.b-pause');
      const units = [...document.querySelectorAll('.arena .unit')].map(u => (u.querySelector('.hp-text, .unit-hp, .hp') || {}).innerText || '').join('|').slice(0, 60);
      const rnd = (document.querySelector('.round-badge, .b-round, .rd-label, .bt-round') || {}).innerText || null;
      return {run: run ? [run.stageId, run.active, run.auto, run.lastAt % 1000000] : null,
              reports: (s.reports || []).length, bag: (s.bags && s.bags[0] || []).filter(Boolean).length,
              pause: pb ? pb.innerText.trim() : null, arenas: document.querySelectorAll('.arena').length, round: rnd, hp: units};
    }""")

def push(p, ms):
    try:
        p.clock.run_for(ms)
    except Exception as ex:
        errs.append('run_for: ' + str(ex).split('\n')[0][:160])

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
    p.locator('.nav [data-tab=expedition]').first.evaluate('n=>n.click()')
    p.wait_for_timeout(600)
    p.locator('.main .sub-bar button').nth(0).evaluate('n=>n.click()')
    p.wait_for_timeout(400)
    p.locator('.zone.has-bg').first.evaluate('n=>n.click()')
    p.wait_for_timeout(600)
    p.locator('#modal button.primary').first.evaluate('n=>n.click()')
    p.wait_for_timeout(1500)
    for k in range(120):
        push(p, 1000)
        if (p.locator('.battle-result').inner_text() if p.locator('.battle-result').count() else '').strip():
            break
    print('band', snap(p), flush=True)
    if variant in ('A', 'B', 'S'):
        p.locator('.b-pause').first.evaluate('n=>n.click()')
        p.wait_for_timeout(200)
    if variant == 'S':   # stay on the view: pause on the band, resume 2 s later
        push(p, 2000)
        print('paused on the band', snap(p), flush=True)
    else:
        p.locator('.nav [data-tab=character]').first.evaluate('n=>n.click()')
        p.wait_for_timeout(300)
        push(p, 8000)
        p.locator('.topbar .seg-party').first.evaluate('n=>n.click()')
        p.wait_for_timeout(500)
    print('back', snap(p), flush=True)
    p.screenshot(path=str(F / f'{pre}_back.png'))
    if variant == 'B':
        for k in range(3):
            push(p, 10000)
            print(f'  paused +{(k + 1) * 10}s', snap(p), flush=True)
    if variant in ('A', 'B', 'S'):
        pb = p.locator('.b-pause')
        if pb.count() and pb.first.inner_text().strip() != PAUSE_KO:
            pb.first.evaluate('n=>n.click()')
            p.wait_for_timeout(200)
        print('resumed', snap(p), flush=True)
    for k in range(12):
        push(p, 10000)
        print(f'+{(k + 1) * 10}s', snap(p), flush=True)
    p.screenshot(path=str(F / f'{pre}_stuck.png'))
    # stay on another tab 60 s — does the expedition move while the player is away? (idle contract)
    p.locator('.nav [data-tab=character]').first.evaluate('n=>n.click()')
    p.wait_for_timeout(300)
    for k in range(6):
        push(p, 10000)
    print('after 60 s on the character tab', snap(p), flush=True)
    p.locator('.topbar .seg-party').first.evaluate('n=>n.click()')
    p.wait_for_timeout(500)
    print('back to the squad', snap(p), flush=True)
    p.screenshot(path=str(F / f'{pre}_back2.png'))
    print('errors', errs)
    b.close()
