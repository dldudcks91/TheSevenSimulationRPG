"""In-memory experiment only. No application file is modified."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent
BASE='http://127.0.0.1:8879'
APP=(ROOT/'src/ui/app.js').read_text(encoding='utf-8')+'\nwindow.__perf={get G(){return G},get SYS(){return SYS},D,render};'
BATTLE=(ROOT/'src/ui/battle.js').read_text(encoding='utf-8')
for old,new in [
    (".style.width = pct + '%'", ".style.transform = 'scaleX(' + pct / 100 + ')'"),
    ("el.style.width = fill * 100 + '%'", "el.style.transform = 'scaleX(' + fill + ')'"),
    ("act.style.width = fill * 100 + '%'", "act.style.transform = 'scaleX(' + fill + ')'"),
    (".style.height = (1 - pct) * 100 + '%'", ".style.transform = 'scaleY(' + (1 - pct) + ')'"),
]:
    assert old in BATTLE,old
    BATTLE=BATTLE.replace(old,new)
CSS=(ROOT/'src/ui/style.css').read_text(encoding='utf-8')+"\n.act-fill,.bar.hp>i{width:100%!important;transform-origin:left;transition:transform .1s linear}.cd-slot .cd-mask{height:100%!important;transform-origin:top;transition:transform .1s linear}"
def local(r):r.continue_() if r.request.url.startswith(BASE) else r.abort()
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    ctx=browser.new_context();ctx.route('**/*',local);ctx.route('**/ui/app.js',lambda r:r.fulfill(status=200,content_type='text/javascript',body=APP))
    page=ctx.new_page();page.goto(BASE+'/index.html?dev=newgame&cn=max');page.wait_for_function('window.__perf?.G')
    bench=page.evaluate("""() => {
        const {G,SYS,render}=__perf;G.seed=12345;
        const out={};for(const post of ['mine','gather','log']){
            const r=SYS.game.mgRound(G,post,1);if(!r.ok){out[post]=r;continue}
            const round=r.round;
            const input=post==='mine'?round.spawns.map(s=>({t:s.at+50,cell:s.cell})).filter((c,i)=>round.spawns[i].kind!=='bad'):[];
            const t=performance.now();for(let i=0;i<1000;i++)SYS.game.mgJudge(round,input,30000);
            out[post]={meanMs:(performance.now()-t)/1000,inputs:input.length,spawns:round.spawns?.length,plants:round.plants?.length,segs:round.segs?.length};
        }return {minigame:out,fixture:JSON.stringify(SYS.game.serialize(G,Date.now()))};
    }""")
    fixture=bench.pop('fixture');ctx.close();results=[]
    for mode in ['original','transform_experiment']:
        ctx=browser.new_context(viewport={'width':1600,'height':900});ctx.route('**/*',local)
        ctx.add_init_script('localStorage.setItem("thesevensim.save",'+json.dumps(fixture)+')')
        if mode!='original':
            ctx.route('**/ui/battle.js',lambda r:r.fulfill(status=200,content_type='text/javascript',body=BATTLE))
            ctx.route('**/ui/style.css',lambda r:r.fulfill(status=200,content_type='text/css',body=CSS))
        page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE+'/index.html?dev=play&rep=1');page.wait_for_selector('.arena')
        cdp=ctx.new_cdp_session(page);cdp.send('Performance.enable');cdp.send('Emulation.setCPUThrottlingRate',{'rate':4})
        page.wait_for_timeout(1500)
        before={r['name']:r['value'] for r in cdp.send('Performance.getMetrics')['metrics']}
        page.wait_for_timeout(10000)
        after={r['name']:r['value'] for r in cdp.send('Performance.getMetrics')['metrics']}
        result={'mode':mode,'seconds':10,'cpuRate':4,'errors':errors,'metrics':{k:after[k]-before[k] for k in ['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration','LayoutCount','RecalcStyleCount']}}
        results.append(result);print(json.dumps(result),flush=True);ctx.close()
    (OUT/'layout_experiment.json').write_text(json.dumps({'results':results,**bench},ensure_ascii=False,indent=2),encoding='utf-8')
    browser.close()
