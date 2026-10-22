"""누수 추적 — ×16 관전을 N분 돌린 뒤 힙 스냅샷 · 떨어진(detached) DOM 의 이름별 수 · 그것을 붙잡는 첫 '붙은/JS' 쪽 경로를 모은다."""
import json, sys
from collections import Counter, defaultdict
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(r'C:\Users\ANGames-001\Desktop\LYC\thesevensimulationrpg')
OUT = Path(sys.argv[1]); MIN = float(sys.argv[2]) if len(sys.argv) > 2 else 4
BASE = 'http://127.0.0.1:8789'
APP = (ROOT / 'src/ui/app.js').read_text(encoding='utf-8') + '\nwindow.__perf={get G(){return G},get SYS(){return SYS},get S(){return state},D,render};'

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
    ctx.add_init_script('localStorage.setItem("thesevensim.save",' + json.dumps(fixture) + ')')
    pg = ctx.new_page(); pg.goto(BASE + '/index.html?dev=play&rep=1'); pg.wait_for_selector('.arena'); pg.wait_for_timeout(1500)
    pg.click('.b-speed[data-s="16"]')
    pg.wait_for_timeout(int(MIN * 60000))
    cdp = ctx.new_cdp_session(pg); cdp.send('HeapProfiler.enable'); cdp.send('HeapProfiler.collectGarbage')
    cdp.send('Performance.enable')
    print('metrics', {x['name']: x['value'] for x in cdp.send('Performance.getMetrics')['metrics'] if x['name'] in ('Nodes', 'JSEventListeners', 'JSHeapUsedSize')}, flush=True)
    chunks = []
    cdp.on('HeapProfiler.addHeapSnapshotChunk', lambda ev: chunks.append(ev['chunk']))
    cdp.send('HeapProfiler.takeHeapSnapshot', {'reportProgress': False, 'captureNumericValue': False})
    browser.close()

snap = json.loads(''.join(chunks))
meta = snap['snapshot']['meta']
NF = meta['node_fields']; EF = meta['edge_fields']; nf, ef = len(NF), len(EF)
NT = meta['node_types'][0]; ET = meta['edge_types'][0]
nodes, edges, strings = snap['nodes'], snap['edges'], snap['strings']
iT, iN, iE, iD = NF.index('type'), NF.index('name'), NF.index('edge_count'), (NF.index('detachedness') if 'detachedness' in NF else None)
eT, eN, eTo = EF.index('type'), EF.index('name_or_index'), EF.index('to_node')
N = len(nodes) // nf
name = lambda i: strings[nodes[i * nf + iN]]
ntype = lambda i: NT[nodes[i * nf + iT]]
det = lambda i: nodes[i * nf + iD] if iD is not None else 0
rev = defaultdict(list)
e = 0
for i in range(N):
    for _ in range(nodes[i * nf + iE]):
        t = ET[edges[e + eT]]; to = edges[e + eTo] // nf; nm = edges[e + eN]
        ename = strings[nm] if t not in ('element', 'hidden') else str(nm)
        if t != 'weak': rev[to].append((i, t, ename))
        e += ef
detached = [i for i in range(N) if det(i) == 2]
print('detached nodes', len(detached), 'by name', Counter(name(i) for i in detached).most_common(15), flush=True)

# 떨어진 노드 표본마다 위로 오른다 — 떨어진 DOM 을 지나 처음 만나는 '떨어지지 않은' 붙잡는 자와 그 위 몇 단
first = Counter(); chains = []
for i in detached[:: max(1, len(detached) // 300)]:
    cur, path, seen = i, [], {i}
    for _ in range(40):
        rs = [r for r in rev[cur] if r[0] not in seen]
        if not rs: break
        nd = [r for r in rs if det(r[0]) != 2]
        r = nd[0] if nd else rs[0]
        path.append(f"{ntype(r[0])}:{name(r[0])[:50]} -[{r[1]}:{r[2][:30]}]->")
        seen.add(r[0]); cur = r[0]
        if det(cur) != 2 and len([p for p in path if not p.startswith('native:Detached')]) >= 8: break
    key = next((p for p in path if 'Detached' not in p and not p.startswith('native:HTML') and not p.startswith('native:Text')), path[-1] if path else '?')
    first[key] += 1
    if len(chains) < 6: chains.append(path[:14])
print('first non-DOM retainers:', first.most_common(12))
for c in chains: print('\n  ' + '\n  '.join(c))
