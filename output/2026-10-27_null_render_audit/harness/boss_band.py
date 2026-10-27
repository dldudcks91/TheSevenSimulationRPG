"""risk_map 10-16 observation — after beating a chapter boss, is there always a result band (respawn wait / next run)?
argv: port state_json out_prefix repeat(0|1)
"""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

port, state_file, pre, rep = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4] == '1'
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
      const run = (s.runs || []).find(r => r && r.preset === 1);
      const band = document.querySelector('.battle-result');
      return {run: run ? [run.stageId, run.active, run.auto, run.repeat] : null, arenas: document.querySelectorAll('.arena').length,
              band: band ? band.innerText.trim().replace(/\\s+/g, ' ').slice(0, 70) : null,
              pause: (document.querySelector('.b-pause') || {}).innerText || null};
    }""")

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
    p.locator('.zone.has-bg').last.evaluate('n=>n.click()')   # 1-5 chapter boss place
    p.wait_for_timeout(600)
    if rep:
        t = p.locator('#modal button.toggle', has_text='반복')   # the repeat switch
        if t.count():
            t.first.evaluate('n=>n.click()')
            p.wait_for_timeout(200)
    p.locator('#modal button.primary').first.evaluate('n=>n.click()')
    p.wait_for_timeout(1500)
    print('sent', snap(p), flush=True)
    last = None
    for k in range(240):
        try:
            p.clock.run_for(1000)
        except Exception as ex:
            errs.append('run_for: ' + str(ex).split('\n')[0][:160])
        sn = snap(p)
        key = (sn['run'] and tuple(sn['run'][:2]), bool(sn['band']), (sn['band'] or '')[:12])
        if key != last:
            print(f'+{k + 1}s', sn, flush=True)
            last = key
    p.screenshot(path=str(F / f'{pre}_boss.png'))
    print('errors', errs)
    b.close()
