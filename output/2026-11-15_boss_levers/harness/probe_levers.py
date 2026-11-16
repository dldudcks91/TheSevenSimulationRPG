"""Boss 1051 lever probe (2026-11-15).
For every account stuck at the chapter-1 boss at D60 (cleared 1-4 III, not 1-5), clone the saved state and
apply ONE player lever (or all of them) with the account's own resources, then replay the boss N times.
Battle sequence offsets are identical across variants (paired comparison).

Variants
  base       - as is (= 11-12 probe add 0)
  mastery    - free reset + combat-priority order (fun_simulation masteryOrder 'adaptive')
  potion     - fill every potion slot with the best shop potion the gold allows
  shop       - free shop reroll centred on the highest-level hero, buy weapons that raise a hero's might, equip
  upgrade    - keep upgrading equipped weapon / armour past +3 while gold, materials and tries last
  tactic     - reroll tactics while gold lasts, keep the best roll by party might (upper bound)
  formation  - try 8 formations (4 templates x who stands front/back) on separate selection seeds, keep best
  all        - mastery -> potion -> shop -> upgrade -> tactic -> formation, one shared purse
  all_gold30 - all, after adding half of the account's last-hour battle gold (= 30 more minutes of farming)
  lv6        - every party hero +6 levels, nothing else (11-12 reference)
Usage: python probe_levers.py [N=40] [workers=3] [seeds=1-80]  -> ../probe/levers_<policy>_seed<n>.json
"""
import asyncio, http.server, json, os, sys, threading, time
from pathlib import Path
from playwright.async_api import async_playwright

HERE = Path(__file__).resolve().parent
BASE = HERE.parent
SNAP = BASE / os.environ.get('SNAP', 'snap_head') / 'src'
OUT = BASE / 'probe'; OUT.mkdir(exist_ok=True)
JS = (HERE / 'fun_simulation.js').read_bytes()
assert b'const result={seed,policy,' in JS
JS = JS.replace(b'const result={seed,policy,', b'window.lastG=G;const result={seed,policy,')
JS += rb"""
const preOf=G=>G.presets[(G.preset??1)-1]??G.presets[0];
const partyMight=G=>sum(party(G).map(h=>might(Q.heroCombat(G,h))));
const clonedState=(G,now)=>Q.deserialize(JSON.parse(JSON.stringify(Q.serialize(G,now))));
function leverMastery(G,now,log){
    let pts=0;
    for(const h of party(G)){
        Q.resetMastery(G,h.uid);
        const order=masteryOrder({policy:'adaptive',G},h,Q.masteryState(G,h.uid).nodes);
        for(let g=0;g<200;g++){const n=order.find(x=>Q.masteryState(G,h.uid).nodes.find(y=>y.id===x.id)?.canLearn);if(!n)break;if(!Q.learnMastery(G,h.uid,n.id).ok)break;pts++;}
    }
    log.mastery={points:pts};
}
function leverPotion(G,now,log){
    if(!Q.hasFeature(G,'shop')){log.potion={skip:'noShop'};return;}
    const slots=Q.limitsOf(G).potionSlots,sold=Q.shopState(G,now).potions.slice().sort((a,b)=>b.tier-a.tier);
    let pick=null;
    for(const p of sold){const need=Math.max(0,slots-(G.potions?.[p.id]??0));if(need===0||G.resources.gold>=p.gold*need){pick=p;break;}}
    if(!pick){log.potion={skip:'gold'};return;}
    const need=Math.max(0,slots-(G.potions?.[pick.id]??0));let spent=0;
    if(need>0){const r=Q.shopPotionBuy(G,pick.id,need);if(r.ok)spent=r.gold;}
    for(let s=0;s<slots;s++)Q.setPotionSlot(G,s,pick.id);
    log.potion={id:pick.id,tier:pick.tier,slots,bought:need,gold:spent};
}
function freeBagSlot(G){
    const keepUids=new Set(party(G).flatMap(h=>Object.values(h.equipped)));
    const junk=G.bags[0].map(u=>G.items[u]).filter(i=>i&&!i.box&&!i.locked&&!keepUids.has(i.uid)&&!SPECIAL.has(i.rarity)).sort((a,b)=>worth(a)-worth(b))[0];
    return junk?Q.salvage(G,junk.uid).ok:false;
}
function leverShop(G,now,log){
    const L={rerolled:false,bought:[],gold:0};log.shop=L;
    if(!Q.hasFeature(G,'shop')){L.skip='noShop';return;}
    let S=Q.shopState(G,now);
    const top=party(G).reduce((a,b)=>b.level>a.level?b:a);
    if(S.free){const r=Q.shopReroll(G,S.list,now,top.uid);L.rerolled=r.ok;L.listLevel=r.level;S=Q.shopState(G,now);}
    L.offered=S.equip.filter(e=>e.item.slot==='weapon'&&!e.locked).map(e=>({cls:e.item.cls??e.item.group??null,ilvl:e.item.ilvl,rarity:e.item.rarity,gold:e.gold}));
    for(let guard=0;guard<6;guard++){
        S=Q.shopState(G,now);let best=null;
        S.equip.forEach((e,i)=>{
            if(e.item.slot!=='weapon'||e.locked||e.sold||e.gold>G.resources.gold)return;
            const C=clonedState(G,now);if(C.bags[0].length>=Q.limitsOf(C).bag)freeBagSlot(C);
            const b=Q.shopBuy(C,i,S.list,now);if(!b.ok)return;const it=C.items[b.uid];
            for(const h of party(C)){if(SYS.item.canEquip(h,it)||!SYS.item.fitsClass(it,h.cls))continue;
                const before=might(Q.heroCombat(C,h)),after=might(Q.heroCombatIf(C,h,b.uid)),gain=after/Math.max(before,1e-12);
                if(gain>1+1e-6&&(!best||gain>best.gain))best={i,hero:h.uid,gain,gold:e.gold,ilvl:it.ilvl,rarity:it.rarity};}
        });
        if(!best)break;
        if(G.bags[0].length>=Q.limitsOf(G).bag)freeBagSlot(G);
        const b=Q.shopBuy(G,best.i,S.list,now);if(!b.ok){L.err=b.err;break;}
        const e=Q.equip(G,best.hero,b.uid,'weapon');
        L.bought.push({hero:Q.heroById(G,best.hero).cls,ilvl:best.ilvl,rarity:best.rarity,gold:best.gold,gain:r3(best.gain),equipped:e.ok});L.gold+=best.gold;
    }
}
function leverUpgrade(G,now,log){
    const L={tries:0,success:0,gold:0,stop:{}};log.upgrade=L;
    for(const parts of [['weapon'],['armor','helmet','gloves','boots']]){
        for(let pass=0;pass<40;pass++){let any=false;
            for(const h of party(G))for(const pos of parts){
                const uid=h.equipped[pos];if(!uid)continue;const u=Q.upgradeState(G,uid);
                if(!u?.canUpgrade){if(u)L.stop[pos]=!u.open?'unbuilt':u.tries.left===0?'tries':u.cost==null?'max':G.resources.gold<(u.cost??0)?'gold':'materials';continue;}
                const r=Q.upgradeItem(G,uid);if(r.ok){any=true;L.tries++;L.success+=Number(r.success);L.gold+=r.cost;}
            }
            if(!any)break;}
    }
    L.weaponUp=party(G).map(h=>G.items[h.equipped.weapon]?.up??0);
}
function leverTactic(G,now,log){
    const L={rerolls:0,gold:0};log.tactic=L;
    const st0=Q.tacticState(G);L.open=st0.open;if(!st0.open){L.skip='noSlot';return;}
    let bestVal=partyMight(G),bestSlots=JSON.stringify(preOf(G).tactics??{slots:{},locked:[]});const startVal=bestVal;
    for(let g=0;g<30;g++){if(!Q.tacticState(G).canReroll)break;const r=Q.rerollTactic(G);if(!r.ok)break;L.rerolls++;L.gold+=r.cost;
        const v=partyMight(G);if(v>bestVal){bestVal=v;bestSlots=JSON.stringify(preOf(G).tactics);}}
    preOf(G).tactics=JSON.parse(bestSlots);
    L.mightGain=r3(bestVal/Math.max(startVal,1e-12));
    L.active=Q.tacticState(G).slots.filter(s=>s.open).map(s=>({id:s.option?.id??null,grade:s.option?.grade??null,active:s.active}));
}
function formationConfigs(G){
    const ids=party(G).map(h=>h.uid),out=[{tpl:'3'},{tpl:'0-3'}];
    for(const u of ids)out.push({tpl:'2-1',back:u});
    for(const u of ids)out.push({tpl:'1-2',front:u});
    return out;
}
function applyFormation(G,cfg){
    if(!Q.setFormation(G,cfg.tpl).ok)return false;
    if(cfg.back!=null){Q.placeFormation(G,cfg.back,1);return Q.rankOf(G,cfg.back)===1;}
    if(cfg.front!=null){Q.placeFormation(G,cfg.front,0);return Q.rankOf(G,cfg.front)===0;}
    return true;
}
function fight(G,now,offsets){
    const saved=JSON.stringify(Q.serialize(G,now));let wins=0,left=0;const rows=[];
    for(const k of offsets){
        const G3=Q.deserialize(JSON.parse(saved));G3.counters.battle+=k;
        const r=Q.resolveBattle(G3,1051,now,1,'normal');
        if(!r.ok){rows.push({err:r.err});continue;}
        const tl=r.result.timeline,rd=tl.find(e=>e.e==='round'),en=rd?.enemies??[],boss=en.find(e=>e.grade==='chapter_boss')?.key;
        const hp0=en.find(e=>e.key===boss)?.hpMax??1;let bl=hp0;
        for(const e of tl)if(e.e==='hit'&&e.d===boss)bl=e.dhp;
        wins+=Number(r.report.won);left+=bl/hp0;rows.push(r.report.won?1:0);
    }
    const n=rows.filter(x=>typeof x==='number').length;
    return {wins,n,rate:n?r3(wins/n):null,bossLeft:n?r3(left/n):null,errors:rows.filter(x=>typeof x!=='number').length};
}
function leverFormation(G,now,log,sel){
    const cfgs=formationConfigs(G),cur=party(G).map(h=>Q.rankOf(G,h.uid)).join(''),startTpl=preOf(G).formation?.tpl;
    const scored=[];
    for(const cfg of cfgs){const C=clonedState(G,now);if(!applyFormation(C,cfg)){scored.push({cfg,skip:true});continue;}scored.push({cfg,ranks:party(C).map(h=>Q.rankOf(C,h.uid)).join(''),...fight(C,now,sel)});}
    const ok=scored.filter(s=>!s.skip),best=ok.reduce((a,b)=>(b.wins>a.wins?b:a),ok[0]);
    applyFormation(G,best.cfg);
    log.formation={start:startTpl,startRanks:cur,chosen:best.cfg,chosenRanks:best.ranks,selWins:best.wins,selN:best.n,table:scored.map(s=>({tpl:s.cfg.tpl,ranks:s.ranks,wins:s.wins}))};
}
window.leverProbe=async function(seed,policy,N,M){
    window.QA_MARKS=[3600];window.QA_D1=false;
    const res=await window.runFunQA(seed,policy,false,{});
    const G=window.lastG,now=START+3600*1000;
    if(Q.stageCleared(G,1051,'normal'))return {seed,policy,skip:'cleared'};
    if(!Q.stageCleared(G,1043,'normal'))return {seed,policy,skip:'before'};
    const snap=res.checkpoints.at(-1);
    const saved=JSON.stringify(Q.serialize(G,now));
    const fresh=()=>{const G2=Q.deserialize(JSON.parse(saved));Q.closeRun(G2,now);return G2;};
    const offs=Array.from({length:N},(_,k)=>k*101),sel=Array.from({length:M},(_,k)=>50000+k*101);
    const G0=fresh(),hs=party(G0);
    const out={seed,policy,classes:hs.map(h=>h.cls),levels:hs.map(h=>h.level),gold:G0.resources.gold,materials:{...G0.materials},potions:{...G0.potions},
        buildings:{...G0.buildings},hourGold:snap?.recentHour?.gold??null,weaponIlvl:hs.map(h=>G0.items[h.equipped.weapon]?.ilvl??0),weaponUp:hs.map(h=>G0.items[h.equipped.weapon]?.up??0),
        might:r3(partyMight(G0)),variants:{}};
    const plans={
        base:[],mastery:[leverMastery],potion:[leverPotion],shop:[leverShop],upgrade:[leverUpgrade],tactic:[leverTactic],formation:['F'],
        all:[leverMastery,leverPotion,leverShop,leverUpgrade,leverTactic,'F'],all_gold30:['GOLD',leverMastery,leverPotion,leverShop,leverUpgrade,leverTactic,'F'],lv6:['LV6'],
    };
    const wrapped=SYS.battle.createRun;SYS.battle.createRun=originalCreateRun;
    try{
        for(const [name,steps] of Object.entries(plans)){
            const G2=fresh(),log={};const g0=G2.resources.gold;
            for(const s of steps){
                if(s==='GOLD'){const add=Math.round((snap?.recentHour?.gold??0)/2);G2.resources.gold+=add;log.goldAdded=add;}
                else if(s==='LV6'){for(const h of party(G2))h.level=Math.min(D.balance.hero_level_cap,h.level+6);}
                else if(s==='F')leverFormation(G2,now,log,sel);
                else s(G2,now,log);
            }
            log.goldLeft=G2.resources.gold;log.goldSpent=g0+(log.goldAdded??0)-G2.resources.gold;log.might=r3(partyMight(G2));
            out.variants[name]={...fight(G2,now,offs),log};
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
    lo, hi = (int(x) for x in (sys.argv[3] if len(sys.argv) > 3 else '1-80').split('-'))
    M = int(os.environ.get('PROBE_SEL', '16'))
    q = asyncio.Queue()
    for s in range(lo, hi + 1):
        for pol in ('basic', 'adaptive'): q.put_nowait((s, pol))
    errors = []; t0 = time.monotonic(); done = 0
    print('start', json.dumps({'N': N, 'M': M, 'workers': workers, 'seeds': [lo, hi], 'snap': str(SNAP)}), flush=True)
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
                f = OUT / f'levers_{pol}_seed{s}.json'
                if not f.exists():
                    try:
                        r = await page.evaluate('a=>window.leverProbe(...a)', [s, pol, N, M])
                        f.write_text(json.dumps(r, ensure_ascii=False), encoding='utf-8'); done += 1
                        print('done', pol, s, r.get('skip', 'probe'), round(time.monotonic() - t0, 1), flush=True)
                    except Exception as e:
                        errors.append(f'{pol}{s}: {e}'); print('err', pol, s, str(e)[:300], flush=True)
                q.task_done()
            await ctx.close()
        await asyncio.gather(*(worker(i) for i in range(workers)))
        await browser.close()
    print('end', json.dumps({'sec': round(time.monotonic() - t0, 1), 'done': done, 'errors': errors[:5]}), flush=True)
asyncio.run(main())
server.shutdown()
