"""장시간 메모리 실측 — 세 장면을 같은 세이브로 동시에 돌리고 1분마다 GC 뒤 지표를 적는다. 앱 파일은 바꾸지 않는다(app.js 에 읽기 접근자만 메모리에서 붙인다)."""
import json, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(r'C:\Users\ANGames-001\Desktop\LYC\thesevensimulationrpg')
OUT = Path(sys.argv[1]); MINUTES = int(sys.argv[2]) if len(sys.argv) > 2 else 40
BASE = 'http://127.0.0.1:8789'
APP = (ROOT / 'src/ui/app.js').read_text(encoding='utf-8') + '\nwindow.__perf={get G(){return G},get SYS(){return SYS},get S(){return state},D,render};'
METRICS = ['JSHeapUsedSize', 'JSHeapTotalSize', 'Nodes', 'JSEventListeners', 'Documents', 'LayoutCount', 'RecalcStyleCount', 'TaskDuration', 'ScriptDuration', 'LayoutDuration']
PROBE = """() => {
    const P = window.__perf, G = P?.G, S = P?.S;
    let saveLen = 0; try { saveLen = (localStorage.getItem('thesevensim.save') ?? '').length; } catch {}
    const gKeys = {}; try { for (const [k, v] of Object.entries(G ?? {})) gKeys[k] = (JSON.stringify(v) ?? '').length; } catch (e) { gKeys.err = String(e); }
    const tl = {}; try { for (const [k, h] of Object.entries(S?.battles ?? {})) tl[k] = h?.result?.timeline?.length ?? null; } catch {}
    return { live: document.getElementsByTagName('*').length, saveLen, gKeys, timelines: tl, tab: S?.tab, exp: S?.exp };
}"""

def local(r):
    r.continue_() if r.request.url.startswith(BASE) else r.abort()

def serve(body, ct):
    return lambda r: r.fulfill(status=200, content_type=ct, body=body)

def x16(page):
    try:
        b = page.query_selector('.b-speed[data-s="16"]')
        if b and 'on' not in (b.get_attribute('class') or ''): b.click()
    except Exception: pass

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    ctx = browser.new_context(); ctx.route('**/*', local); ctx.route('**/ui/app.js', serve(APP, 'text/javascript'))
    page = ctx.new_page(); page.goto(BASE + '/index.html?dev=newgame&cn=max'); page.wait_for_function('window.__perf?.G')
    fixture = page.evaluate('() => JSON.stringify(__perf.SYS.game.serialize(__perf.G, Date.now()))'); ctx.close()

    scenes = {'watch': '/index.html?dev=play&rep=1', 'interact': '/index.html?dev=play&rep=1', 'multi_bg': '/index.html?dev=play&rep=1&parties=3&tab=research'}
    S = {}
    for name, url in scenes.items():
        ctx = browser.new_context(viewport={'width': 1600, 'height': 900}); ctx.route('**/*', local)
        ctx.route('**/ui/app.js', serve(APP, 'text/javascript'))
        ctx.add_init_script('localStorage.setItem("thesevensim.save",' + json.dumps(fixture) + ')')
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e, errs=errs: errs.append(str(e)[:300]))
        pg.goto(BASE + url); pg.wait_for_function('window.__perf?.G'); pg.wait_for_timeout(1500)
        if name != 'multi_bg': x16(pg)
        cdp = ctx.new_cdp_session(pg); cdp.send('Performance.enable'); cdp.send('HeapProfiler.enable')
        S[name] = {'page': pg, 'cdp': cdp, 'errs': errs, 'file': (OUT / f'soak_{name}.jsonl').open('w', encoding='utf-8'), 'step': 0}

    t0 = time.time(); next_sample = t0; minute = 0
    while minute <= MINUTES:
        # 잦은 조작 — 10초마다 탭을 돌고 관전으로 돌아와 카드에 올린다(다시 그리기 · 재마운트 · 툴팁)
        s = S['interact']; pg = s['page']
        try:
            k = s['step'] % 4; s['step'] += 1
            if k == 0: pg.click('button[data-tab="character"]')
            elif k == 1: pg.click('button[data-tab="codex"]')
            elif k == 2: pg.click('button[data-tab="research"]')
            else:
                pg.locator('text=Party I').first.click(); pg.wait_for_timeout(800); x16(pg)
                for u in pg.query_selector_all('.arena .unit')[:3]:
                    u.hover(); pg.wait_for_timeout(150)
                pg.mouse.move(5, 5)
        except Exception as e:
            s['errs'].append('interact: ' + str(e)[:200])
        x16(S['watch']['page'])
        if time.time() >= next_sample:
            for name, s in S.items():
                try:
                    s['cdp'].send('HeapProfiler.collectGarbage')
                    m = {x['name']: x['value'] for x in s['cdp'].send('Performance.getMetrics')['metrics']}
                    row = {'min': minute, **{k: m.get(k) for k in METRICS}, **s['page'].evaluate(PROBE), 'errors': len(s['errs'])}
                except Exception as e:
                    row = {'min': minute, 'probeError': str(e)[:300]}
                s['file'].write(json.dumps(row, ensure_ascii=False) + '\n'); s['file'].flush()
            print(f'min {minute} ' + ' | '.join(f"{n}: heap {S[n]['page'] and 0 or 0}" for n in []), flush=True)
            minute += 1; next_sample = t0 + minute * 60
        S['interact']['page'].wait_for_timeout(10000)

    for name, s in S.items():
        (OUT / f'soak_{name}_errors.json').write_text(json.dumps(s['errs'][:200], ensure_ascii=False, indent=1), encoding='utf-8')
        s['file'].close()
    browser.close()
print('done', flush=True)
