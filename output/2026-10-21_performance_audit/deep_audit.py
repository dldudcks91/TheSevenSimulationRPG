from pathlib import Path
import json,time,sys
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[1]
BASE='http://127.0.0.1:8879'
EXPOSE="\nwindow.__perf={get G(){return G},get state(){return state},get SYS(){return SYS},D,render,save,expTick};"
def local(route):
    route.continue_() if route.request.url.startswith(BASE) else route.abort()
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    if '--boundary-only' not in sys.argv:
        ctx=browser.new_context(viewport={'width':1600,'height':900});ctx.route('**/*',local)
        page=ctx.new_page();errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
        start=time.perf_counter();page.goto(BASE+'/dev/test.html',wait_until='domcontentloaded',timeout=120000)
        page.wait_for_function("document.querySelector('#head b')",timeout=120000)
        result={'head':page.locator('#head').inner_text(),'failures':page.locator('li.fail').all_text_contents(),'passed':page.locator('li.ok').count(),'errors':errs,'seconds':time.perf_counter()-start}
        (OUT/'tests.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({k:v for k,v in result.items() if k!='failures'},ensure_ascii=False),flush=True)
        ctx.close()
        # Same seed/save for both branches; only the effects preference differs.
        fixture=None;comparison=[]
        for mode in ['on','off']:
            ctx=browser.new_context(viewport={'width':1600,'height':900});ctx.route('**/*',local)
            ctx.route('**/ui/app.js',lambda r:r.fulfill(status=200,content_type='text/javascript',body=(ROOT/'src/ui/app.js').read_text(encoding='utf-8')+EXPOSE))
            if fixture:ctx.add_init_script('localStorage.setItem("thesevensim.save", '+json.dumps(fixture)+')')
            if mode=='off':ctx.add_init_script("for(const k of ['fxSkill','fxBasic','fxHit'])localStorage.setItem('thesevensim.'+k,'off')")
            page=ctx.new_page();page.goto(BASE+'/index.html?dev=newgame' if fixture is None else BASE+'/index.html?tab=expedition',wait_until='load')
            page.wait_for_function('window.__perf?.G && window.__perf?.SYS')
            if fixture is None:fixture=page.evaluate('localStorage.getItem("thesevensim.save")')
            page.goto(BASE+'/index.html?dev=play&rep=1',wait_until='load');page.wait_for_function('window.__perf?.state?.battle')
            cdp=ctx.new_cdp_session(page);cdp.send('Performance.enable');cdp.send('Emulation.setCPUThrottlingRate',{'rate':4})
            page.wait_for_timeout(1500)
            before={r['name']:r['value'] for r in cdp.send('Performance.getMetrics')['metrics']}
            page.wait_for_timeout(10000)
            after={r['name']:r['value'] for r in cdp.send('Performance.getMetrics')['metrics']}
            rr=page.evaluate("performance.getEntriesByType('resource').filter(e=>e.name.includes('/fx/skills/')).map(e=>({url:e.name,bytes:e.encodedBodySize}))")
            result={'mode':mode,'cpuRate':4,'seconds':10,'metrics':{k:after[k]-before[k] for k in ['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration','LayoutCount','RecalcStyleCount']},'fxCount':len(rr),'fxBytes':sum(x['bytes'] for x in rr)}
            comparison.append(result);print(json.dumps(result),flush=True)
            ctx.close()
        (OUT/'effects_comparison.json').write_text(json.dumps(comparison,indent=2),encoding='utf-8')
    # Boundary-state benchmarks run on copies, never the player's save.
    ctx=browser.new_context();ctx.route('**/*',local)
    ctx.route('**/ui/app.js',lambda r:r.fulfill(status=200,content_type='text/javascript',body=(ROOT/'src/ui/app.js').read_text(encoding='utf-8')+EXPOSE))
    page=ctx.new_page();page.goto(BASE+'/index.html?dev=newgame&cn=max',wait_until='load');page.wait_for_function('window.__perf?.G && window.__perf?.SYS')
    result=page.evaluate("""() => {
        const {SYS,D,G}=__perf;const clone=x=>JSON.parse(JSON.stringify(x));
        const samples=(fn,n=20)=>{const a=[];for(let i=0;i<n;i++){const t=performance.now();fn();a.push(performance.now()-t)}a.sort((a,b)=>a-b);return {median:a[Math.floor(n/2)],p95:a[Math.floor(n*.95)],max:a[n-1]}};
        const base=clone(G), caps=SYS.game.limitsOf(base), out={caps};
        out.battles=[];
        for(const stage of [1011,1051,3051,5051]) {
            const s=clone(base);s.seed=12345;s.heroes.forEach(h=>h.level=D.balance.hero_level_cap);
            s.progress.cleared=D.stageOrder.slice();
            let r;const t=performance.now();r=SYS.game.resolveBattle(s,stage,1000000);
            out.battles.push({stage,ms:performance.now()-t,ok:r.ok,events:r.result?.timeline?.length,seconds:r.result?.durationSec});
        }
        const rich=clone(base);rich.seed=12345;rich.heroes.forEach(h=>h.level=D.balance.hero_level_cap);rich.progress.cleared=D.stageOrder.slice();
        for(let i=0;i<100;i++)SYS.game.resolveBattle(rich,1011,2000000+i*1000000);
        out.populated={reports:rich.reports.length,items:Object.keys(rich.items).length,bytes:JSON.stringify(rich).length,serialize:samples(()=>SYS.game.serialize(rich,Date.now())),save:samples(()=>localStorage.setItem('audit.benchmark',JSON.stringify(SYS.game.serialize(rich,Date.now()))))};
        const high=clone(base);high.labNodes={};for(const n of D.labNodes)high.labNodes[n.line+':'+n.node]=n.max;
        high.heroes.forEach(h=>{h.stats.str=100;h.stats.luck=100;h.stats.vit=100;h.stats.ldr=100});
        // Exclude this constructed case from normal-play claims; record exact setup.
        const labAt=Date.now();SYS.game.labSettle(high,labAt);let t=performance.now();const settled=SYS.game.labSettle(high,labAt+3*3600000);
        out.offlineLab={setup:'all lab nodes max; 3h gap; no hero registration',ms:performance.now()-t,result:settled};
        return out;
    }""")
    (OUT/'boundary_benchmarks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(result,ensure_ascii=False),flush=True)
    browser.close()
