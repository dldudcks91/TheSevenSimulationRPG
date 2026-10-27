"""Click fuzzer v2 — fuzz.py + clock jumps between actions (state x clock) · English · touch · prepared states.
python fuzz2.py <port> <scenario: tabs|spectate|spectate_nopick> <tag> <state json> [key=value ...]
  steps=60 seed=1 clock=0.0 (chance per action to push the app clock 3~90 s) lang=ko|en touch=0|1 prep=none|run|gate
  prep=run  — Party I goes to the first place of the open chapter (repeat as the window has it)
  prep=gate — save edit: normal cleared up to the gate 5051 · heroes Lv 50 · Party I goes to 5051 (repeat off) -> it climbs to nightmare
Writes fuzz/out/<tag>.json — {errors: [{msg, stack, tab, trace}], anomalies, actions}
"""
import csv, json, random, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

port, scen, tag, state_file = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
kw = dict(a.split('=', 1) for a in sys.argv[5:])
STEPS = int(kw.get('steps', 60))
SEED = int(kw.get('seed', 1))
CLOCK = float(kw.get('clock', 0))
LANG = kw.get('lang', 'ko')
TOUCH = kw.get('touch', '0') == '1'
PREP = kw.get('prep', 'none')
rnd = random.Random(SEED)
F = Path(__file__).resolve().parent
(F / 'out').mkdir(exist_ok=True)
SRC = next(d for d in (F.parent / 'snap' / 'src', F.parents[2] / 'src') if (d / 'data' / 'stage.csv').exists())

st = json.loads(Path(state_file).read_text(encoding='utf-8'))
SAVED_AT = 0
for o in st['origins']:
    o['origin'] = f'http://127.0.0.1:{port}'
    for x in o['localStorage']:
        if x['name'] != 'thesevensim.save':
            continue
        s = json.loads(x['value'])
        SAVED_AT = s.get('savedAt') or 0
        s['runs'] = [None for _ in s.get('runs') or []]
        if PREP == 'gate':
            rows = sorted(csv.DictReader(open(SRC / 'data' / 'stage.csv', encoding='utf-8-sig')), key=lambda r: int(r['stage_id']))
            gate = next(int(r['stage_id']) for r in rows if r['chapter'] == '5' and r['boss_grade'] == 'chapter_boss')
            s['progress']['cleared'] = [int(r['stage_id']) for r in rows if int(r['stage_id']) < gate]
            for h in s['heroes']:
                h['level'] = 50
        x['value'] = json.dumps(s, ensure_ascii=False)

ENUM = r"""() => {
  const scopes = [...document.querySelectorAll('.main, #modal, .item-menu, #tooltip')];
  const out = [], seen = new Set();
  for (const sc of scopes) for (const n of sc.querySelectorAll('*')) {
    if (seen.has(n)) continue;
    const isBtn = n.tagName === 'BUTTON' && !n.disabled;
    const clk = isBtn || typeof n.onclick === 'function';
    const ctx = typeof n.oncontextmenu === 'function';
    const inp = n.tagName === 'INPUT' && n.type !== 'file' && n.type !== 'text' && !n.disabled;
    if (!clk && !ctx && !inp) continue;
    if (n.closest('.nav, .topbar')) continue;
    const r = n.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) continue;
    const cs = getComputedStyle(n);
    if (cs.visibility === 'hidden' || cs.pointerEvents === 'none') continue;
    const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!t || !(t === n || n.contains(t))) continue;
    seen.add(n);
    out.push(n);
  }
  window.__c = out;
  const cls = n => (typeof n.className === 'string' ? n.className : '').trim().split(/\s+/).filter(c => !/^(on|hover|sel|picked)$/.test(c)).slice(0, 3).join('.');
  return out.map((n, i) => {
    const r = n.getBoundingClientRect();
    const scope = n.closest('#modal') ? 'modal' : n.closest('.item-menu') ? 'menu' : n.closest('#tooltip') ? 'tip' : 'main';
    return {i, base: scope + ':' + n.tagName.toLowerCase() + '.' + cls(n), text: (n.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24),
            clk: n.tagName === 'BUTTON' || typeof n.onclick === 'function' || n.tagName === 'INPUT', ctx: typeof n.oncontextmenu === 'function',
            x: r.left + r.width / 2, y: r.top + r.height / 2};
  });
}"""
SPOT = r"""() => { const a = document.querySelector('.main .arena'); if (!a) return null; const r = a.getBoundingClientRect();
  for (let gy = 0.05; gy < 1; gy += 0.1) for (let gx = 0.05; gx < 1; gx += 0.1) {
    const x = r.left + r.width * gx, y = r.top + r.height * gy, t = document.elementFromPoint(x, y);
    if (t && a.contains(t) && !t.closest('.unit, button, .p-belt, .b-buffwrap, .battle-result')) return {x, y}; }
  return null; }"""

errors, anomalies, actions = [], [], []
cur = {'tab': None}
with sync_playwright() as pw:
    b = pw.chromium.launch(channel='msedge', headless=True)
    cargs = dict(viewport={'width': 1600, 'height': 1000}, locale='ko-KR', storage_state=st)
    if TOUCH:
        cargs['has_touch'] = True
    ctx = b.new_context(**cargs)
    p = ctx.new_page()
    p.set_default_timeout(4000)
    cdp = ctx.new_cdp_session(p) if TOUCH else None
    p.on('pageerror', lambda e: errors.append({'msg': str(e)[:300], 'stack': (e.stack or '')[:1200], 'tab': cur['tab'], 'trace': actions[-12:]}))
    p.on('dialog', lambda d: d.dismiss())
    if SAVED_AT:
        p.clock.install(time=(SAVED_AT + 30000) / 1000)
    p.goto(f'http://127.0.0.1:{port}/', wait_until='domcontentloaded')
    p.wait_for_timeout(1500)
    p.locator('.mn-btn').nth(1).evaluate('n=>n.click()')
    p.wait_for_timeout(1500)
    for _ in range(3):
        bb = p.locator('#modal button.primary')
        if bb.count():
            bb.first.evaluate('n=>n.click()')
            p.wait_for_timeout(400)
    if LANG == 'en':
        p.locator('.topbar .lang-btn').first.evaluate('n=>n.click()')
        p.wait_for_timeout(400)

    def go(tab):
        cur['tab'] = tab
        p.locator(f'.nav [data-tab={tab}]').first.evaluate('n=>n.click()')
        p.wait_for_timeout(400)
        actions.append({'tab': tab, 'act': 'go'})

    def push_clock(sec):
        actions.append({'tab': cur['tab'], 'act': 'clock', 'sec': sec})
        try:
            p.clock.run_for(int(sec * 1000))
        except Exception as ex:   # a timer callback threw — app clock · player · render
            lines = str(ex).split('\n')
            errors.append({'msg': 'run_for: ' + lines[0][:240], 'stack': '\n'.join(lines[1:8])[:1200], 'tab': cur['tab'], 'trace': actions[-12:]})
            print('ERROR', cur['tab'], 'clock', sec, lines[0][:160], flush=True)
        p.wait_for_timeout(60)

    # prepared runs — fixed clicks, before the fuzz starts
    if PREP in ('run', 'gate'):
        go('expedition')
        if PREP == 'gate':
            p.locator('.main .sub-bar button').nth(4).evaluate('n=>n.click()')
            p.wait_for_timeout(400)
            p.locator('.zone.has-bg').last.evaluate('n=>n.click()')
        else:
            p.locator('.zone.has-bg').first.evaluate('n=>n.click()')
        p.wait_for_timeout(500)
        bb = p.locator('#modal button.primary')
        if bb.count():
            bb.first.evaluate('n=>n.click()')
        p.wait_for_timeout(1200)
        actions.append({'tab': 'expedition', 'act': 'prep', 'prep': PREP})

    def spot_click():
        pt = p.evaluate(SPOT)
        if pt:
            if TOUCH:
                p.touchscreen.tap(pt['x'], pt['y'])
            else:
                p.mouse.click(pt['x'], pt['y'])
            p.wait_for_timeout(120)
            actions.append({'tab': cur['tab'], 'act': 'spot', 'base': 'main:arena-empty', 'text': ''})

    def touch_hold(x, y, ms=700):
        pt = [{'x': x, 'y': y}]
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': pt})
        p.wait_for_timeout(ms)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})

    def monkey(steps, tab, nopick=False, deny=()):
        done = {}
        modal_steps = 0
        prev_keys = set()
        for s in range(steps):
            # a window open = push the clock twice as often — the world moves while a window points at it (angles #14)
            if CLOCK and rnd.random() < min(0.6, CLOCK * (2 if p.locator('#modal .modal-box').count() else 1)):
                push_clock(rnd.choice([3, 8, 20, 45, 90]))
            if nopick and not p.locator('#modal *').count():
                spot_click()
            elif rnd.random() < 0.08:
                spot_click()
            try:
                cands = p.evaluate(ENUM)
            except Exception as ex:
                anomalies.append({'tab': tab, 'what': 'enum failed', 'ex': str(ex)[:200]})
                break
            pool = []
            now_keys = {(c['base'], c['text']) for c in cands}
            fresh = now_keys - prev_keys if prev_keys else set()
            prev_keys = now_keys
            for c in cands:
                if any(d in c['base'] for d in deny):
                    continue
                kinds = (('click',) if c['clk'] else ()) + (('ctx',) if c['ctx'] and not TOUCH else ()) + (('hold',) if TOUCH and c['base'].startswith('main') else ())
                for kind in kinds:
                    key = (c['base'], c['text'], kind)
                    if done.get(key):
                        continue
                    if sum(1 for k in done if k[0] == c['base'] and k[2] == kind) >= 3:
                        continue
                    pool.append((c, kind, key))
            if not pool:
                if p.locator('#modal *').count():
                    p.keyboard.press('Escape')
                    p.wait_for_timeout(200)
                    continue
                break
            new_items = [x for x in pool if (x[0]['base'], x[0]['text']) in fresh]
            modal_items = [x for x in pool if x[0]['base'].startswith(('modal', 'menu', 'tip'))]
            if new_items and rnd.random() < 0.8:
                c, kind, key = rnd.choice(new_items)
            else:
                c, kind, key = rnd.choice(modal_items if modal_items and rnd.random() < 0.7 else pool)
            done[key] = 1
            n_err = len(errors)
            rec = {'tab': tab, 'act': kind, 'base': c['base'], 'text': c['text']}
            actions.append(rec)
            try:
                if TOUCH:
                    if kind == 'hold':
                        touch_hold(c['x'], c['y'])
                    else:
                        p.touchscreen.tap(c['x'], c['y'])
                else:
                    p.mouse.move(c['x'], c['y'])
                    p.wait_for_timeout(60)
                    if kind == 'click':
                        p.evaluate('i => { const n = window.__c[i]; if (n && n.isConnected) n.click(); }', c['i'])
                    else:
                        p.evaluate("([i, x, y]) => { const n = window.__c[i]; if (n && n.isConnected) n.dispatchEvent(new MouseEvent('contextmenu', {bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2})); }", [c['i'], c['x'], c['y']])
                p.wait_for_timeout(140)
            except Exception as ex:
                anomalies.append({'tab': tab, 'what': 'action failed', 'rec': rec, 'ex': str(ex)[:200]})
            try:
                main_n = p.evaluate("() => { const m = document.querySelector('.main'); return m ? m.childElementCount : -1; }")
                blank = p.evaluate("() => { const l = document.querySelector('#modal'); return !!l && !l.hidden && !l.querySelector('.modal-box'); }")
            except Exception:
                main_n, blank = -2, False
            if main_n == 0:
                anomalies.append({'tab': tab, 'what': 'main empty', 'trace': actions[-8:]})
                go(tab)
            if blank:
                anomalies.append({'tab': tab, 'what': 'blank window layer', 'trace': actions[-8:]})
                p.keyboard.press('Escape')
            if len(errors) > n_err:
                print('ERROR', tab, errors[-1]['msg'][:160], '<-', rec, flush=True)
                go(tab)
            modal_steps = modal_steps + 1 if p.locator('#modal *').count() else 0
            if modal_steps > 12:
                p.keyboard.press('Escape')
                p.wait_for_timeout(200)
                modal_steps = 0

    tabs = p.locator('.nav [data-tab]').evaluate_all('ns => ns.map(n => n.dataset.tab)')
    if scen == 'tabs':
        for rnd_pass in (1, 2):
            for t in tabs:
                go(t)
                monkey(STEPS, t)
                print('pass', rnd_pass, t, 'errors', len(errors), 'actions', len(actions), flush=True)
    elif scen in ('spectate', 'spectate_nopick'):
        if PREP == 'none':
            go('expedition')
            p.locator('.zone.has-bg').first.evaluate('n=>n.click()')
            p.wait_for_timeout(700)
            bb = p.locator('#modal button.primary')
            if bb.count():
                bb.first.evaluate('n=>n.click()')
            p.wait_for_timeout(2500)
        for k in range(3):
            monkey(STEPS, 'expedition', nopick=scen == 'spectate_nopick', deny=('b-skip', 'b-report'))
            go('expedition')
            print('spectate round', k, 'errors', len(errors), 'actions', len(actions), flush=True)
    s = p.evaluate("JSON.parse(localStorage.getItem('thesevensim.save'))")
    end = {'difficulty': s.get('difficulty'), 'runs': [(r['preset'], r['stageId'], r.get('difficulty')) for r in (s.get('runs') or []) if r],
           'cleared': len(s['progress']['cleared']), 'clearedIn': {k: len(v) for k, v in (s['progress'].get('clearedIn') or {}).items()}}
    out = {'tag': tag, 'scenario': scen, 'kw': kw, 'errors': errors, 'anomalies': anomalies, 'n_actions': len(actions), 'end': end, 'actions': actions}
    (F / 'out' / f'{tag}.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    b.close()
print('DONE', tag, 'errors', len(errors), 'anomalies', len(anomalies), 'actions', len(actions), 'end', end)
