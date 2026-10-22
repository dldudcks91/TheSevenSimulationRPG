"""진행 멈춤 재현 — ×16 관전을 10분 · 1분마다 화면 상태 · 오류 · 마지막에 스크린샷."""
import json, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(r'C:\Users\ANGames-001\Desktop\LYC\thesevensimulationrpg')
OUT = Path(sys.argv[1]); MIN = int(sys.argv[2]) if len(sys.argv) > 2 else 10
BASE = 'http://127.0.0.1:8789'
APP = (ROOT / 'src/ui/app.js').read_text(encoding='utf-8') + '\nwindow.__perf={get G(){return G},get SYS(){return SYS},get S(){return state},get frozen(){return frozen},D,render};'
X16 = "() => { const b = document.querySelector('.b-speed[data-s=\"16\"]'); if (b && !b.classList.contains('on')) b.click(); }"
PROBE = """() => { const P = __perf, G = P.G, S = P.S;
  return { live: document.getElementsByTagName('*').length, save: (localStorage.getItem('thesevensim.save') ?? '').length, frozen: P.frozen,
    tab: S.tab, exp: S.exp, screen: S.screen, ended: !!S.battle?.ended, endedAt: S.battle?.endedAt ?? null, stage: S.battle?.run?.stageId ?? null,
    runs: JSON.stringify(G?.runs ?? null).slice(0, 300), modal: !!document.querySelector('#modal:not([hidden]), .modal.on'),
    text: (document.querySelector('.main')?.innerText ?? '').replace(/\\s+/g, ' ').slice(0, 300) }; }"""

def local(r):
    r.continue_() if r.request.url.startswith(BASE) else r.abort()

def serve(body, ct):
    return lambda r: r.fulfill(status=200, content_type=ct, body=body)

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    ctx = browser.new_context(); ctx.route('**/*', local); ctx.route('**/ui/app.js', serve(APP, 'text/javascript'))
    page = ctx.new_page(); page.goto(BASE + '/index.html?dev=newgame&cn=max'); page.wait_for_function('window.__perf?.G')
    fixture = page.evaluate('() => JSON.stringify(__perf.SYS.game.serialize(__perf.G, Date.now()))'); ctx.close()
    ctx = browser.new_context(viewport={'width': 1600, 'height': 900}); ctx.route('**/*', local)
    ctx.route('**/ui/app.js', serve(APP, 'text/javascript'))
    ctx.add_init_script('localStorage.setItem("thesevensim.save",' + json.dumps(fixture) + ')')
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:500]))
    pg.on('console', lambda m: m.type in ('error', 'warning') and 'ERR_FAILED' not in m.text and errs.append(m.type.upper() + ' ' + m.text[:300]))
    pg.goto(BASE + '/index.html?dev=play&rep=1'); pg.wait_for_function('window.__perf?.G'); pg.wait_for_timeout(2000); pg.evaluate(X16)
    for m in range(MIN + 1):
        r = pg.evaluate(PROBE); print(m, json.dumps(r, ensure_ascii=False)[:700], '| errs', len(errs), flush=True)
        if m == MIN: break
        for _ in range(6): pg.wait_for_timeout(10000); pg.evaluate(X16)
    pg.screenshot(path=str(OUT / 'stall_end.png'))
    print('\n'.join(errs[:15]))
    browser.close()
