"""Click fuzzer — every clickable thing in .main / #modal / .item-menu, hover first, catch pageerror + empty .main.
python fuzz.py <port> <scenario: tabs|spectate> <tag> <state json> [steps_per_tab] [seed]
Writes fuzz/out/<tag>.json — {errors: [{msg, stack, tab, trace}], anomalies, actions}
"""
import json, random, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

port, scen, tag, state_file = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
STEPS = int(sys.argv[5]) if len(sys.argv) > 5 else 60
SEED = int(sys.argv[6]) if len(sys.argv) > 6 else 1
rnd = random.Random(SEED)
F = Path(__file__).resolve().parent
(F / 'out').mkdir(exist_ok=True)
st = json.loads(Path(state_file).read_text(encoding='utf-8'))
SAVED_AT = 0
for o in st['origins']:
    o['origin'] = f'http://127.0.0.1:{port}'
    for x in o['localStorage']:
        if x['name'] == 'thesevensim.save':
            SAVED_AT = json.loads(x['value']).get('savedAt') or 0

ENUM = r"""() => {
  const scopes = [...document.querySelectorAll('.main, #modal, .item-menu')];
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
    // a hand can reach it — the topmost element at its centre is it or inside it (a window or menu on top hides what is under)
    const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!t || !(t === n || n.contains(t))) continue;
    seen.add(n);
    out.push(n);
  }
  window.__c = out;
  const cls = n => (typeof n.className === 'string' ? n.className : '').trim().split(/\s+/).filter(c => !/^(on|hover|sel|picked)$/.test(c)).slice(0, 3).join('.');
  return out.map((n, i) => {
    const r = n.getBoundingClientRect();
    const scope = n.closest('#modal') ? 'modal' : n.closest('.item-menu') ? 'menu' : 'main';
    return {i, base: scope + ':' + n.tagName.toLowerCase() + '.' + cls(n), text: (n.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24),
            clk: n.tagName === 'BUTTON' || typeof n.onclick === 'function' || n.tagName === 'INPUT', ctx: typeof n.oncontextmenu === 'function',
            x: r.left + r.width / 2, y: r.top + r.height / 2};
  });
}"""

# an empty spot of the arena — battle.js listens with addEventListener (not .onclick), the click clears the equip target (ADR-0849)
SPOT = r"""() => { const a = document.querySelector('.main .arena'); if (!a) return null; const r = a.getBoundingClientRect();
  for (let gy = 0.05; gy < 1; gy += 0.1) for (let gx = 0.05; gx < 1; gx += 0.1) {
    const x = r.left + r.width * gx, y = r.top + r.height * gy, t = document.elementFromPoint(x, y);
    if (t && a.contains(t) && !t.closest('.unit, button, .p-belt, .b-buffwrap, .battle-result')) return {x, y}; }
  return null; }"""

errors, anomalies, actions = [], [], []
cur = {'tab': None}
with sync_playwright() as pw:
    b = pw.chromium.launch(channel='msedge', headless=True)
    ctx = b.new_context(viewport={'width': 1600, 'height': 1000}, locale='ko-KR', storage_state=st)
    p = ctx.new_page()
    p.set_default_timeout(4000)
    p.on('pageerror', lambda e: errors.append({'msg': str(e)[:300], 'stack': (e.stack or '')[:1200], 'tab': cur['tab'], 'trace': actions[-12:]}))
    p.on('dialog', lambda d: d.dismiss())
    # the save was written under a fake clock — reopen 30 s after it (seconds, not ms — pitfall 10-17) · time keeps flowing
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

    def go(tab):
        cur['tab'] = tab
        p.locator(f'.nav [data-tab={tab}]').first.evaluate('n=>n.click()')
        p.wait_for_timeout(500)
        actions.append({'t': round(time.time(), 1), 'tab': tab, 'act': 'go'})

    def spot_click():
        pt = p.evaluate(SPOT)
        if pt:
            p.mouse.click(pt['x'], pt['y'])
            p.wait_for_timeout(120)
            actions.append({'tab': cur['tab'], 'act': 'spot', 'base': 'main:arena-empty', 'text': ''})
        return bool(pt)

    def monkey(steps, tab, nopick=False, deny=()):
        done = {}
        modal_steps = 0
        prev_keys = set()
        for s in range(steps):
            if nopick and not p.locator('#modal *').count():
                spot_click()   # keep the equip target cleared before every action
            elif rnd.random() < 0.08:
                spot_click()
            try:
                cands = p.evaluate(ENUM)
            except Exception as ex:
                anomalies.append({'tab': tab, 'what': 'enum failed', 'ex': str(ex)[:200]})
                break
            # untouched first; a base signature at most 3 times per tab (42 bag cells share one)
            pool = []
            now_keys = {(c['base'], c['text']) for c in cands}
            fresh = now_keys - prev_keys if prev_keys else set()
            prev_keys = now_keys
            for c in cands:
                if any(d in c['base'] for d in deny):
                    continue
                kinds = (('click',) if c['clk'] else ()) + (('ctx',) if c['ctx'] else ())
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
            # dig into what the last action opened (a cube, a window, a menu) before wandering off
            new_items = [x for x in pool if (x[0]['base'], x[0]['text']) in fresh]
            modal_items = [x for x in pool if x[0]['base'].startswith(('modal', 'menu'))]
            if new_items and rnd.random() < 0.8:
                c, kind, key = rnd.choice(new_items)
            else:
                c, kind, key = rnd.choice(modal_items if modal_items and rnd.random() < 0.7 else pool)
            done[key] = 1
            n_err = len(errors)
            rec = {'tab': tab, 'act': kind, 'base': c['base'], 'text': c['text']}
            actions.append(rec)
            try:
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
            except Exception:
                main_n = -2
            if main_n == 0:
                anomalies.append({'tab': tab, 'what': 'main empty', 'trace': actions[-8:]})
                go(tab)
            if len(errors) > n_err:
                print('ERROR', tab, errors[-1]['msg'][:160], '<-', rec, flush=True)
                go(tab)   # recover — a fresh render of the same tab
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
    out = {'tag': tag, 'scenario': scen, 'seed': SEED, 'errors': errors, 'anomalies': anomalies, 'n_actions': len(actions), 'actions': actions}
    (F / 'out' / f'{tag}.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    b.close()
print('DONE', tag, 'errors', len(errors), 'anomalies', len(anomalies), 'actions', len(actions))
