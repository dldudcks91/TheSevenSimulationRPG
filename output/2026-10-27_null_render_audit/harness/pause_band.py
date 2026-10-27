"""Candidate 4 — pause while the result band counts, leave the tab past the restart gap, come back by the top squad button.
Watch: page errors · does the bag under the arena follow the save (refreshBattleBag) · does the run move on.
argv: port state_json out_prefix [variant: pause|nopause]
"""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

port, state_file, pre = sys.argv[1], sys.argv[2], sys.argv[3]
variant = sys.argv[4] if len(sys.argv) > 4 else 'pause'
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

def snap(p):
    return p.evaluate("""() => {
      const s = JSON.parse(localStorage.getItem('thesevensim.save'));
      const bag = (s.bags && s.bags[0] || []).filter(Boolean).length;
      const dom = document.querySelectorAll('.store-bag .inv-cell.filled').length;
      const band = document.querySelector('.battle-result');
      const run = (s.runs || []).find(r => r && r.preset === 1);
      return {bagSave: bag, bagDom: dom, arenas: document.querySelectorAll('.arena').length,
              band: band ? band.innerText.trim().slice(0, 40) : null, reports: (s.reports || []).length,
              run: run ? [run.stageId, run.active, run.auto, run.lastAt] : null,
              title: (document.querySelector('.bt-page h2, .bt-title, .battle-title') || {}).innerText || null};
    }""")

with sync_playwright() as pw:
    b = pw.chromium.launch(channel='msedge', headless=True)
    ctx = b.new_context(viewport={'width': 1600, 'height': 1000}, locale='ko-KR', storage_state=st)
    p = ctx.new_page()
    p.on('pageerror', lambda e: errs.append(str(e)[:160] + ' @ ' + ((e.stack or '').split('\n')[1].strip() if e.stack and '\n' in e.stack else '')))
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
    rep = p.locator('#modal button.toggle', has_text='반복'.encode('utf-8').decode('utf-8'))
    p.locator('#modal button.primary').first.evaluate('n=>n.click()')
    p.wait_for_timeout(1500)
    print('sent', snap(p), flush=True)
    # run until the result band counts down
    got = False
    for k in range(120):
        try:
            p.clock.run_for(1000)
        except Exception as ex:
            errs.append('run_for: ' + str(ex).split('\n')[0][:160])
        sn = snap(p)
        if sn['band']:
            print(f'band at +{k + 1}s', sn, flush=True)
            got = True
            break
    if not got:
        print('no band', snap(p)); b.close(); sys.exit()
    if variant == 'pause':
        p.locator('.b-pause').first.evaluate('n=>n.click()')
        p.wait_for_timeout(200)
        print('paused', snap(p), flush=True)
    p.locator('.nav [data-tab=character]').first.evaluate('n=>n.click()')
    p.wait_for_timeout(300)
    try:
        p.clock.run_for(8000)
    except Exception as ex:
        errs.append('run_for: ' + str(ex).split('\n')[0][:160])
    print('away 8s', snap(p), flush=True)
    p.locator('.topbar .seg-party').first.evaluate('n=>n.click()')
    p.wait_for_timeout(500)
    print('back via top squad button', snap(p), 'errors', errs, flush=True)
    pb = p.locator('.b-pause')
    label = pb.first.inner_text().strip() if pb.count() else None
    print('pause button after return:', label, flush=True)
    if variant == 'pause' and label and label != p.evaluate("() => document.querySelector('.b-pause') && document.querySelector('.b-pause').dataset.x") and pb.count():
        # resume only when the button says resume (bt.resume) — it is the second label the button can carry
        if label not in ('일시정지', 'Pause'):
            pb.first.evaluate('n=>n.click()')
            p.wait_for_timeout(200)
            print('resumed ->', pb.first.inner_text().strip(), flush=True)
    mism, starts, last = 0, [], None
    for k in range(48):
        try:
            p.clock.run_for(5000)
        except Exception as ex:
            errs.append('run_for: ' + str(ex).split('\n')[0][:160])
        sn = snap(p)
        if sn['bagSave'] != sn['bagDom']:
            mism += 1
        if sn['run'] and sn['run'][3] != last:
            last = sn['run'][3]
            starts.append((sn['run'][0], (k + 1) * 5))
        if k % 6 == 5:
            print(f'+{(k + 1) * 5}s', sn, flush=True)
    # does the pause button still stop the arena? press it, push 10 s, compare the run clock text
    pb = p.locator('.b-pause')
    if pb.count():
        before = p.evaluate("() => (document.querySelector('.bt-time, .b-time, .battle-time') || {}).innerText || document.querySelector('.arena') && document.querySelector('.arena').innerText.slice(0, 80)")
        pb.first.evaluate('n=>n.click()')
        p.wait_for_timeout(200)
        try:
            p.clock.run_for(10000)
        except Exception as ex:
            errs.append('run_for: ' + str(ex).split('\n')[0][:160])
        after = p.evaluate("() => (document.querySelector('.bt-time, .b-time, .battle-time') || {}).innerText || document.querySelector('.arena') && document.querySelector('.arena').innerText.slice(0, 80)")
        print('pause test — label', pb.first.inner_text().strip(), '| arena text same after 10 s paused:', before == after, flush=True)
    print('run starts (stage, at s):', starts)
    print('bag DOM != save in', mism, 'of 48 samples · errors', errs)
    p.screenshot(path=str(F / f'{pre}_pause_band.png'))
    b.close()
