"""누수 재확인 — 1차 실측과 같되 **ElementHandle 을 만들지 않는다**(클릭 · 올리기는 페이지 안 evaluate 와 좌표 마우스로).
1차는 10초마다 query_selector 로 배속 버튼을 잡아, 그 핸들이 옛 관전 트리 전체를 붙잡았을 수 있다."""
import json, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(r'C:\Users\ANGames-001\Desktop\LYC\thesevensimulationrpg')
OUT = Path(sys.argv[1]); MINUTES = int(sys.argv[2]) if len(sys.argv) > 2 else 15
BASE = 'http://127.0.0.1:8789'
APP = (ROOT / 'src/ui/app.js').read_text(encoding='utf-8') + '\nwindow.__perf={get G(){return G},get SYS(){return SYS},get S(){return state},D,render};'
X16 = "() => { const b = document.querySelector('.b-speed[data-s=\"16\"]'); if (b && !b.classList.contains('on')) b.click(); }"
CLICK = "sel => { document.querySelector(sel)?.click(); }"
PARTY = "() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Party I')); b?.click(); }"
UNITS = "() => [...document.querySelectorAll('.arena .unit')].slice(0, 3).map(n => { const r = n.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })"
PROBE = "() => ({ live: document.getElementsByTagName('*').length, saveLen: (localStorage.getItem('thesevensim.save') ?? '').length })"

def local(r):
    r.continue_() if r.request.url.startswith(BASE) else r.abort()

def serve(body, ct):
    return lambda r: r.fulfill(status=200, content_type=ct, body=body)

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    ctx = browser.new_context(); ctx.route('**/*', local); ctx.route('**/ui/app.js', serve(APP, 'text/javascript'))
    page = ctx.new_page(); page.goto(BASE + '/index.html?dev=newgame&cn=max'); page.wait_for_function('window.__perf?.G')
    fixture = page.evaluate('() => JSON.stringify(__perf.SYS.game.serialize(__perf.G, Date.now()))'); ctx.close()
    S = {}
    for name in ['watch', 'interact']:
        ctx = browser.new_context(viewport={'width': 1600, 'height': 900}); ctx.route('**/*', local)
        ctx.add_init_script('localStorage.setItem("thesevensim.save",' + json.dumps(fixture) + ')')
        pg = ctx.new_page(); pg.goto(BASE + '/index.html?dev=play&rep=1'); pg.wait_for_timeout(2500); pg.evaluate(X16)
        cdp = ctx.new_cdp_session(pg); cdp.send('Performance.enable')
        S[name] = {'page': pg, 'cdp': cdp, 'file': (OUT / f'soak2_{name}.jsonl').open('w', encoding='utf-8'), 'step': 0}
    t0 = time.time(); minute = 0; nxt = t0
    while minute <= MINUTES:
        s = S['interact']; pg = s['page']; k = s['step'] % 4; s['step'] += 1
        try:
            if k == 0: pg.evaluate(CLICK, 'button[data-tab="character"]')
            elif k == 1: pg.evaluate(CLICK, 'button[data-tab="codex"]')
            elif k == 2: pg.evaluate(CLICK, 'button[data-tab="research"]')
            else:
                pg.evaluate(PARTY); pg.wait_for_timeout(800); pg.evaluate(X16)
                for x, y in pg.evaluate(UNITS): pg.mouse.move(x, y); pg.wait_for_timeout(150)
                pg.mouse.move(5, 5)
        except Exception as e:
            print('interact err', str(e)[:150], flush=True)
        S['watch']['page'].evaluate(X16)
        if time.time() >= nxt:
            for name, s in S.items():
                s['cdp'].send('HeapProfiler.collectGarbage') if False else None
                m = {x['name']: x['value'] for x in s['cdp'].send('Performance.getMetrics')['metrics']}
                row = {'min': minute, 'heap': m['JSHeapUsedSize'], 'nodes': m['Nodes'], 'listeners': m['JSEventListeners'], **s['page'].evaluate(PROBE)}
                s['file'].write(json.dumps(row) + '\n'); s['file'].flush()
            minute += 1; nxt = t0 + minute * 60
        S['interact']['page'].wait_for_timeout(10000)
    # 끝에 GC 를 한 번 강제한 값도 남긴다 — HeapProfiler 는 마지막에만 켠다
    for name, s in S.items():
        s['cdp'].send('HeapProfiler.enable'); s['cdp'].send('HeapProfiler.collectGarbage')
        m = {x['name']: x['value'] for x in s['cdp'].send('Performance.getMetrics')['metrics']}
        s['file'].write(json.dumps({'min': 'gc', 'heap': m['JSHeapUsedSize'], 'nodes': m['Nodes'], 'listeners': m['JSEventListeners'], **s['page'].evaluate(PROBE)}) + '\n')
        s['file'].close()
    browser.close()
print('done', flush=True)
