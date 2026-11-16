"""Satan(1051) class probe: each account's state at 40 min (if 1-4 III is cleared), boss fight replayed N times
with only the battle sequence changed. Records per-hero damage (escorts / boss · basic / skill), downs, escort-clear time.
Usage: python probe_class.py [N=20] [workers=3]   -> ../probe/class_<policy>_seed<n>.json
"""
import asyncio, http.server, json, os, sys, threading, time
from pathlib import Path
from playwright.async_api import async_playwright

HERE = Path(__file__).resolve().parent
BASE = HERE.parent
SNAP = BASE / 'snap_head/src'
OUT = BASE / 'probe'; OUT.mkdir(exist_ok=True)
JS = (HERE / 'fun_simulation.js').read_bytes()
assert b'const result={seed,policy,' in JS
JS = JS.replace(b'const result={seed,policy,', b'window.lastG=G;const result={seed,policy,')
JS += rb"""
window.classProbe=async function(seed,policy,N,mark){
    window.QA_MARKS=[mark];window.QA_D1=false;
    await window.runFunQA(seed,policy,false,{});
    const G=window.lastG,now=START+mark*1000;
    if(!Q.stageCleared(G,1043,'normal'))return {seed,policy,skip:'before'};
    const saved=JSON.stringify(Q.serialize(G,now));
    const hs=party(G);
    const out={seed,policy,bossClearedAlready:Q.stageCleared(G,1051,'normal'),classes:hs.map(h=>h.cls),levels:hs.map(h=>h.level),
        heroes:hs.map(h=>{const c=Q.heroCombat(G,h);return {cls:h.cls,hp:c.hp_max,might:r3(might(c)),innate:h.skills?.innate??h.innate??null};}),fights:[]};
    const wrapped=SYS.battle.createRun;SYS.battle.createRun=originalCreateRun;
    try{
        for(let k=0;k<N;k++){
            const G2=Q.deserialize(JSON.parse(saved));Q.closeRun(G2,now);
            G2.counters.battle+=k*101;
            const r=Q.resolveBattle(G2,1051,now,1,'normal');
            if(!r.ok){out.fights.push({err:r.err});continue;}
            const tl=r.result.timeline,rd=tl.find(e=>e.e==='round'),en=rd?.enemies??[];
            const boss=en.find(e=>e.grade==='chapter_boss')?.key;
            const ps=party(G2),idx=Object.fromEntries(ps.map((h,i)=>[`p${i}`,i]));
            const H=ps.map(h=>({cls:h.cls,toEscort:0,toBoss:0,basic:0,skill:0,heal:0,down:null,skills:{}}));
            let escortDown=0,escortsClearedAt=null,firstBossHit=null;
            for(const e of tl){
                if(e.e==='hit'&&e.a in idx&&!(e.d in idx)){
                    const h=H[idx[e.a]];
                    if(e.d===boss){h.toBoss+=e.dmg;if(firstBossHit==null)firstBossHit=e.t;}else h.toEscort+=e.dmg;
                    if(e.s){h.skill+=e.dmg;h.skills[e.s]=(h.skills[e.s]??0)+e.dmg;}else h.basic+=e.dmg;
                }
                if(e.e==='heal'&&e.a in idx){H[idx[e.a]].heal+=(e.amt??e.v??e.dmg??0);}
                if(e.e==='down'){
                    if(e.u in idx)H[idx[e.u]].down=e.t;
                    else if(e.u!==boss){escortDown++;if(escortDown===2)escortsClearedAt=e.t;}
                }
            }
            out.fights.push({won:r.report.won,sec:r.report.durationSec,escortsClearedAt,firstBossHit,heroes:H});
        }
    }finally{SYS.battle.createRun=wrapped;}
    return out;
};
window.probeReady=true;
"""

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw): super().__init__(*a, directory=str(SNAP), **kw)
    def do_GET(self):
        key = self.path.split('?', 1)[0]
        if key == '/qa.html':
            b = b'<!doctype html><title>Probe</title><script type="module" src="/qa.js"></script>'
            self.send_response(200); self.send_header('Content-Type', 'text/html'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
        elif key == '/qa.js':
            self.send_response(200); self.send_header('Content-Type', 'text/javascript'); self.send_header('Content-Length', str(len(JS))); self.end_headers(); self.wfile.write(JS)
        elif key == '/favicon.ico':
            self.send_response(204); self.end_headers()
        else: super().do_GET()
    def log_message(self, *a): pass
class Server(http.server.ThreadingHTTPServer): request_queue_size = 256
server = Server(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()

async def main():
    N = int(sys.argv[1]) if len(sys.argv) > 1 else 20
    workers = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    mark = int(os.environ.get('PROBE_MARK', '2400'))
    seeds = json.loads(os.environ.get('PROBE_SEEDS', '[]')) or list(range(1, 81))
    q = asyncio.Queue()
    for s in seeds:
        for pol in ('basic', 'adaptive'): q.put_nowait((s, pol))
    errors = []; t0 = time.monotonic(); done = 0
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel='msedge', headless=True, args=['--disable-background-timer-throttling'])
        async def worker(n):
            nonlocal done
            ctx = await browser.new_context()
            await ctx.route('**/*', lambda route: route.continue_() if route.request.url.startswith(f'http://127.0.0.1:{server.server_port}/') else route.abort())
            page = await ctx.new_page()
            page.on('pageerror', lambda e: errors.append(str(e)))
            await page.goto(f'http://127.0.0.1:{server.server_port}/qa.html')
            await page.wait_for_function('window.probeReady===true', timeout=60000)
            while not q.empty():
                s, pol = await q.get()
                f = OUT / f'class_{pol}_seed{s}.json'
                if not f.exists():
                    try:
                        r = await page.evaluate('a=>window.classProbe(...a)', [s, pol, N, mark])
                        f.write_text(json.dumps(r, ensure_ascii=False), encoding='utf-8'); done += 1
                    except Exception as e:
                        errors.append(f'{pol}{s}: {e}')
                q.task_done()
            await ctx.close()
        await asyncio.gather(*(worker(i) for i in range(workers)))
        await browser.close()
    print('FINISHED', json.dumps({'sec': round(time.monotonic() - t0, 1), 'done': done, 'errors': errors[:5]}), flush=True)
asyncio.run(main())
server.shutdown()
