"""Boss 1051 probe: for every account stuck at the boss at D60 (cleared 1-4 III, not the boss),
replay the boss fight N times from the same saved state with only the battle sequence changed,
and again with every party hero's level raised (gear, mastery, potions untouched).
Usage: python probe.py [N=40] [workers=3]   -> ../probe/boss_<policy>_seed<n>.json
"""
import asyncio, http.server, json, os, sys, threading, time
from pathlib import Path
from playwright.async_api import async_playwright

HERE = Path(__file__).resolve().parent
BASE = HERE.parent
SNAP = BASE / 'snap_wt/src'
OUT = BASE / 'probe'; OUT.mkdir(exist_ok=True)
JS = (HERE / 'fun_simulation.js').read_bytes()
assert b'const result={seed,policy,' in JS
JS = JS.replace(b'const result={seed,policy,', b'window.lastG=G;const result={seed,policy,')
JS += rb"""
window.bossProbe=async function(seed,policy,N,adds){
    window.QA_MARKS=[3600];window.QA_D1=false;
    await window.runFunQA(seed,policy,false,{});
    const G=window.lastG,now=START+3600*1000;
    if(Q.stageCleared(G,1051,'normal'))return {seed,policy,skip:'cleared'};
    if(!Q.stageCleared(G,1043,'normal'))return {seed,policy,skip:'before'};
    const saved=JSON.stringify(Q.serialize(G,now));
    const hs=party(G),out={seed,policy,classes:hs.map(h=>h.cls),levels:hs.map(h=>h.level),
        gear:hs.map(h=>({cls:h.cls,ilvl:r3(avg(Object.values(h.equipped).map(u=>G.items[u]?.ilvl??0).filter(x=>x))),weapon:G.items[h.equipped.weapon]?.ilvl,up:G.items[h.equipped.weapon]?.up??0,might:r3(might(Q.heroCombat(G,h))),hp:Q.heroCombat(G,h).hp_max})),variants:{}};
    const wrapped=SYS.battle.createRun;SYS.battle.createRun=originalCreateRun;   // probe fights are not part of the account timeline
    try{
    for(const add of adds){
        const rows=[];
        for(let k=0;k<N;k++){
            const G2=Q.deserialize(JSON.parse(saved));Q.closeRun(G2,now);
            if(add)for(const h of party(G2))h.level=Math.min(D.balance.hero_level_cap,h.level+add);
            G2.counters.battle+=k*101;
            const r=Q.resolveBattle(G2,1051,now,1,'normal');
            if(!r.ok){rows.push({err:r.err});continue;}
            const tl=r.result.timeline,rd=tl.find(e=>e.e==='round'),en=rd?.enemies??[],boss=en.find(e=>e.grade==='chapter_boss')?.key;
            const hp0=Object.fromEntries(en.map(e=>[e.key,e.hpMax]));
            const ps=party(G2),cls=Object.fromEntries(ps.map((h,i)=>[`p${i}`,h.cls]));
            const isHero=k=>k in cls;
            let bossLeft=hp0[boss],toBoss=0,partySwings=0,partyMiss=0,crit=0,firstBossHit=null;const casts={};let cur=null;
            for(const e of tl){
                if(e.e==='hit'&&e.d===boss&&isHero(e.a)){bossLeft=e.dhp;toBoss+=e.dmg;if(firstBossHit==null)firstBossHit=e.t;}
                if(e.e==='hit'&&isHero(e.a)&&!isHero(e.d)){partySwings++;crit+=e.crit?1:0;}
                if(e.e==='dodge'&&isHero(e.a)&&!isHero(e.d)){partySwings++;partyMiss++;}
                if(e.e==='skill'&&e.u===boss){cur={s:e.s,t:e.t,dmg:0,hits:0,crits:0};(casts[e.s]??=[]).push(cur);}
                if(e.e==='hit'&&e.a===boss&&e.s&&casts[e.s]){const c=casts[e.s].at(-1);c.dmg+=e.dmg;c.hits++;c.crits+=e.crit?1:0;}
            }
            const downs=tl.filter(e=>e.e==='down').map(e=>({t:e.t,who:cls[e.u]??(e.u===boss?'boss':'escort')}));
            rows.push({won:r.report.won,reason:r.report.reason,sec:r.report.durationSec,bossMax:hp0[boss],bossLeftPct:r3(bossLeft/hp0[boss]),reachedBoss:firstBossHit,
                escortsKilled:downs.filter(d=>d.who==='escort').length,partySwings,partyMiss,crit,downs,
                casts:Object.fromEntries(Object.entries(casts).map(([s,v])=>[s,v.map(c=>({t:c.t,dmg:c.dmg,hits:c.hits,crits:c.crits}))])),
                heroHp:ps.map(h=>Q.heroCombat(G2,h).hp_max),keyCheck:k===0?{downed:r.report.downed,uids:ps.map(h=>h.uid)}:undefined});
        }
        out.variants[add]=rows;
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
    N = int(sys.argv[1]) if len(sys.argv) > 1 else 40
    workers = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    adds = json.loads(os.environ.get('PROBE_ADDS', '[0,3,6]'))
    q = asyncio.Queue()
    for s in range(1, 81):
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
                f = OUT / f'boss_{pol}_seed{s}.json'
                if not f.exists():
                    try:
                        r = await page.evaluate('a=>window.bossProbe(...a)', [s, pol, N, adds])
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
