"""CPU 프로파일 — 장면마다 20초 · 함수별 자기 시간(self) 상위 · 파일별 합. 앱 파일은 바꾸지 않는다."""
import json, sys
from collections import defaultdict
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(r'C:\Users\ANGames-001\Desktop\LYC\thesevensimulationrpg')
OUT = Path(sys.argv[1]); SECS = 20
BASE = 'http://127.0.0.1:8789'
APP = (ROOT / 'src/ui/app.js').read_text(encoding='utf-8') + '\nwindow.__perf={get G(){return G},get SYS(){return SYS},get S(){return state},D,render};'

def local(r):
    r.continue_() if r.request.url.startswith(BASE) else r.abort()

def serve(body, ct):
    return lambda r: r.fulfill(status=200, content_type=ct, body=body)

def summarize(prof):
    nodes = {n['id']: n for n in prof['nodes']}
    dt = defaultdict(float)
    ts = prof['timeDeltas']; samples = prof['samples']
    for i, sid in enumerate(samples):
        dt[sid] += (ts[i + 1] if i + 1 < len(ts) else 0) / 1000.0  # ms
    by_fn = defaultdict(float); by_file = defaultdict(float)
    for nid, ms in dt.items():
        cf = nodes[nid]['callFrame']; url = cf['url'].rsplit('/', 1)[-1] or '(native)'
        name = cf['functionName'] or '(anon)'
        key = f"{name} {url}:{cf['lineNumber'] + 1}" if cf['url'] else name
        by_fn[key] += ms; by_file[url] += ms
    total = sum(dt.values())
    top = sorted(by_fn.items(), key=lambda x: -x[1])[:30]
    return {'totalMs': round(total), 'byFile': {k: round(v) for k, v in sorted(by_file.items(), key=lambda x: -x[1])[:15]},
            'top': [[k, round(v, 1)] for k, v in top]}

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    ctx = browser.new_context(); ctx.route('**/*', local); ctx.route('**/ui/app.js', serve(APP, 'text/javascript'))
    page = ctx.new_page(); page.goto(BASE + '/index.html?dev=newgame&cn=max'); page.wait_for_function('window.__perf?.G')
    fixture = page.evaluate('() => JSON.stringify(__perf.SYS.game.serialize(__perf.G, Date.now()))'); ctx.close()
    res = {}
    for name, url, speed in [('watch_x16', '/index.html?dev=play&rep=1', 16), ('watch_x1', '/index.html?dev=play&rep=1', 1),
                             ('multi_bg', '/index.html?dev=play&rep=1&parties=3&tab=research', None)]:
        ctx = browser.new_context(viewport={'width': 1600, 'height': 900}); ctx.route('**/*', local)
        ctx.route('**/ui/app.js', serve(APP, 'text/javascript'))
        ctx.add_init_script('localStorage.setItem("thesevensim.save",' + json.dumps(fixture) + ')')
        pg = ctx.new_page(); pg.goto(BASE + url); pg.wait_for_function('window.__perf?.G'); pg.wait_for_timeout(1500)
        if speed and speed != 1: pg.click(f'.b-speed[data-s="{speed}"]')
        pg.wait_for_timeout(3000)
        cdp = ctx.new_cdp_session(pg); cdp.send('Profiler.enable'); cdp.send('Profiler.setSamplingInterval', {'interval': 200})
        cdp.send('Performance.enable')
        m0 = {x['name']: x['value'] for x in cdp.send('Performance.getMetrics')['metrics']}
        cdp.send('Profiler.start'); pg.wait_for_timeout(SECS * 1000); prof = cdp.send('Profiler.stop')['profile']
        m1 = {x['name']: x['value'] for x in cdp.send('Performance.getMetrics')['metrics']}
        s = summarize(prof)
        s['metrics'] = {k: round(m1[k] - m0[k], 3) for k in ['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'LayoutCount', 'RecalcStyleDuration', 'RecalcStyleCount']}
        res[name] = s
        print(name, json.dumps(s['metrics']), flush=True)
        ctx.close()
    browser.close()
(OUT / 'profile.json').write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding='utf-8')
print('done')
