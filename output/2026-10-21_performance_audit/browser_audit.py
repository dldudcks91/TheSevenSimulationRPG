from pathlib import Path
import json, time
from playwright.sync_api import sync_playwright

OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[1]
BASE='http://127.0.0.1:8879'
INIT="""(() => {
window.audit={writes:[],longTasks:[],frames:[]};
const set=Storage.prototype.setItem;
Storage.prototype.setItem=function(k,v){const t=performance.now();const r=set.call(this,k,v);if(k==='thesevensim.save')audit.writes.push({t,ms:performance.now()-t,bytes:v.length});return r;};
new PerformanceObserver(l=>audit.longTasks.push(...l.getEntries().map(e=>({start:e.startTime,ms:e.duration})))).observe({type:'longtask',buffered:true});
let prev=0;function frame(t){if(prev)audit.frames.push(t-prev);prev=t;requestAnimationFrame(frame)}requestAnimationFrame(frame);
})()"""
EXPOSE="""\nwindow.__perf={get G(){return G},get state(){return state},get SYS(){return SYS},D,render,save,expTick,runBattle,now};\n"""
def summarize(page):
    return page.evaluate("""() => ({...audit,resources:performance.getEntriesByType('resource').map(e=>({url:e.name,bytes:e.encodedBodySize,transfer:e.transferSize,ms:e.duration,type:e.initiatorType})),navigation:performance.getEntriesByType('navigation')[0].toJSON(),dom:document.querySelectorAll('*').length,images:[...document.images].map(i=>({url:i.currentSrc,w:i.naturalWidth,h:i.naturalHeight,displayW:i.width,displayH:i.height})),heap:performance.memory?.usedJSHeapSize,saveBytes:localStorage.getItem('thesevensim.save')?.length,reportCount:window.__perf?.G?.reports.length,errors:document.querySelector('.down')?.textContent})""")

results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    for label,query,admin,seconds in [
        ('menu','',False,2),('newgame','?dev=newgame',False,3),
        ('battle','?dev=play&rep=1',False,12),
        ('late_battle','?dev=play&rep=1&lv=70&stage=5051',True,12),
        ('reports','?dev=battle&runs=20&tab=character',True,3),
        ('resource','?dev=newgame&tab=resource',True,8),
        ('codex','?dev=newgame&tab=codex',True,3),
        ('help','?dev=newgame&tab=help',True,2)]:
        context=browser.new_context(viewport={'width':1600,'height':900})
        context.add_init_script(INIT)
        if admin:context.add_init_script("localStorage.setItem('devAdmin','1')")
        # External services deliberately blocked: isolated tests never upload saves.
        context.route('**/*',lambda route: route.continue_() if route.request.url.startswith(BASE) else route.abort())
        context.route('**/ui/app.js',lambda route: route.fulfill(status=200,content_type='text/javascript',body=(ROOT/'src/ui/app.js').read_text(encoding='utf-8')+EXPOSE))
        page=context.new_page(); errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        cdp=context.new_cdp_session(page)
        cdp.send('Performance.enable')
        started=time.perf_counter()
        page.goto(BASE+'/index.html'+query,wait_until='load')
        page.wait_for_function("window.__perf && !document.querySelector('#app.booting')",timeout=60000)
        ready_ms=(time.perf_counter()-started)*1000
        cdp.send('Profiler.enable');cdp.send('Profiler.start')
        before=cdp.send('Performance.getMetrics')
        page.wait_for_timeout(seconds*1000)
        after=cdp.send('Performance.getMetrics')
        profile=cdp.send('Profiler.stop')['profile']
        (OUT/f'profile_{label}.json').write_text(json.dumps(profile),encoding='utf-8')
        result=summarize(page)
        result.update(label=label,query=query,admin=admin,observeSeconds=seconds,readyMs=ready_ms,pageErrors=errors,metricsBefore=before,metricsAfter=after)
        if label in {'newgame','reports','resource','codex','late_battle'}:
            result['bench']=page.evaluate("""() => {
                const {G,SYS,render,expTick}=__perf;
                const measure=(fn,n)=>{let a=[];for(let i=0;i<n;i++){const t=performance.now();fn();a.push(performance.now()-t)}a.sort((a,b)=>a-b);return {median:a[Math.floor(n/2)],p95:a[Math.floor(n*.95)],max:a[n-1]}};
                return {serialize:measure(()=>SYS.game.serialize(G,Date.now()),30),stringify:measure(()=>JSON.stringify(G),30),render:measure(render,10),expTick:measure(expTick,20),heroCombat:measure(()=>SYS.game.heroCombat(G,G.heroes[0]),100),stateBytes:JSON.stringify(G).length,reports:G.reports.length,heroes:G.heroes.length,items:Object.keys(G.items).length};
            }""")
        (OUT/f'browser_{label}.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
        results.append({k:result[k] for k in ['label','readyMs','dom','saveBytes','reportCount','pageErrors']})
        print(json.dumps(results[-1],ensure_ascii=False),flush=True)
        context.close()
    browser.close()
(OUT/'browser_summary.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
