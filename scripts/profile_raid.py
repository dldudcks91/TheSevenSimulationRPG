"""Measure live raid frames and Chromium main-thread work on the local server."""
import argparse
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/2026-10-30_raid/performance'
BASE = 'http://127.0.0.1:8799'
HARNESS = '''
window.__raidProfile = {
    ready: () => !!G?.heroes?.length,
    unlock: () => { G.heroes[0].level=30; state.tab='lab';state.lab.tool='raid';render(); },
    start: () => document.querySelector('[data-raid-start]').click(),
    speed: n => { raidSession.speed=n; render(); },
    jump: t => { raidSession.run.advance(t); render(); },
    time: () => raidSession?.run?.view().t,
};
'''
PROBE = '''() => {
    window.__perf={frames:[],long:[],offsets:0,offsetMs:0,active:false,last:null};
    const p=__perf, descriptor=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'offsetWidth');
    Object.defineProperty(HTMLElement.prototype,'offsetWidth',{...descriptor,get(){
        if(!p.active) return descriptor.get.call(this);
        const at=performance.now(),value=descriptor.get.call(this); p.offsets++;p.offsetMs+=performance.now()-at;return value;
    }});
    new PerformanceObserver(list=>{if(p.active)p.long.push(...list.getEntries().map(e=>e.duration))}).observe({entryTypes:['longtask']});
    function frame(t){if(p.active&&p.last!==null)p.frames.push(t-p.last);p.last=p.active?t:null;requestAnimationFrame(frame)}requestAnimationFrame(frame);
}'''


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--label',default='before')
    parser.add_argument('--seconds',type=float,default=8)
    parser.add_argument('--ablate',action='store_true')
    parser.add_argument('--software',action='store_true')
    parser.add_argument('--single',action='store_true')
    parser.add_argument('--speed',type=int,default=4)
    parser.add_argument('--throttle',type=int,default=4)
    parser.add_argument('--start',type=float,default=12)
    parser.add_argument('--scale',type=float,default=1)
    args=parser.parse_args()
    OUT.mkdir(parents=True,exist_ok=True)
    scenarios=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='msedge',headless=True,args=['--disable-gpu'] if args.software else [])
        modes=[(1,True,4,'full'),(1,True,4,'no_flash'),(1,True,4,'no_filters'),(1,True,4,'no_skill'),(1,False,4,'no_fx')] if args.ablate else [(1,True,1,'full'),(4,True,1,'full'),(4,False,1,'no_fx'),(4,True,4,'full')]
        if args.single: modes=[(args.speed,True,args.throttle,'full')]
        for speed,fx,throttle,mode in modes:
            context=browser.new_context(viewport={'width':1600,'height':900},device_scale_factor=args.scale)
            context.route('**/ui/app.js',lambda route:route.fulfill(status=200,content_type='text/javascript',body=(ROOT/'src/ui/app.js').read_text(encoding='utf-8')+HARNESS))
            page=context.new_page();errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(BASE+'/index.html?dev=raid&lang=ko',wait_until='domcontentloaded')
            page.wait_for_function('__raidProfile.ready()',timeout=60000)
            page.evaluate('__raidProfile.unlock()')
            page.wait_for_selector('.raid-page',timeout=60000)
            page.evaluate(PROBE)
            if mode=='no_flash':
                page.evaluate("""() => {const original=Element.prototype.animate;Element.prototype.animate=function(frames,options){return original.call(this,Array.isArray(frames)&&frames.some(f=>f.filter)?[{opacity:1},{opacity:1}]:frames,options)}}""")
            if mode=='no_filters':
                page.add_style_tag(content='.raid-page *,.raid-page *::before,.raid-page *::after {filter:none!important;mask-image:none!important;-webkit-mask-image:none!important;backdrop-filter:none!important}')
            if mode=='no_skill':
                page.evaluate("async()=>{const m=await import('./ui/fx.js');m.setFxOn('skill',false)}")
            if not fx:
                page.evaluate("async()=>{const m=await import('./ui/fx.js');for(const k of ['skill','basic','hit','lunge'])m.setFxOn(k,false)}")
            page.evaluate('__raidProfile.start()')
            if not args.ablate: page.evaluate('__raidProfile.jump('+str(args.start)+')')
            page.evaluate('__raidProfile.speed('+str(speed)+')')
            page.wait_for_timeout(600)
            cdp=context.new_cdp_session(page)
            cdp.send('Performance.enable')
            cdp.send('Emulation.setCPUThrottlingRate',{'rate':throttle})
            def metrics():return {m['name']:m['value'] for m in cdp.send('Performance.getMetrics')['metrics']}
            before=metrics()
            page.evaluate('__perf.active=true')
            page.wait_for_timeout(args.seconds*1000)
            stats=page.evaluate('''()=>{__perf.active=false;const p=__perf,sorted=p.frames.slice().sort((a,b)=>a-b);return {frames:p.frames.length,p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1),over33:p.frames.filter(t=>t>33.4).length,long:p.long,offsets:p.offsets,offsetMs:p.offsetMs,fxNodes:document.querySelectorAll('.raid-page .fx-layer>*').length,nodes:document.querySelectorAll('.raid-page *').length,t:__raidProfile.time()}}''')
            after=metrics()
            values={k:round(after[k]-before[k],5) for k in ['LayoutCount','LayoutDuration','RecalcStyleCount','RecalcStyleDuration','ScriptDuration','TaskDuration']}
            result={'speed':speed,'fx':fx,'mode':mode,'software':args.software,'cpuThrottle':throttle,'scale':args.scale,'start':args.start,'wallSeconds':args.seconds,**stats,'metrics':values,'errors':errors}
            scenarios.append(result)
            print(json.dumps(result),flush=True)
            context.close()
        browser.close()
    (OUT/(args.label+'.json')).write_text(json.dumps(scenarios,indent=2),encoding='utf-8')


if __name__=='__main__':main()
