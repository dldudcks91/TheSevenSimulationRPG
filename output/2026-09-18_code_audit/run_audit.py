"""Read-only game audit in an isolated browser; writes evidence beside this script."""
import argparse
import hashlib
import json
import subprocess
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

def write(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')

def manifest():
    return {str(p.relative_to(ROOT)).replace('\\', '/'): hashlib.sha256(p.read_bytes()).hexdigest()
            for folder in ['src/game_logic', 'src/ui', 'src/dev', 'src/data', 'docs']
            for p in (ROOT / folder).rglob('*') if p.is_file() and p.suffix in ['.js', '.csv', '.json', '.md', '.html', '.css']}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--mode', default='baseline')
    args = ap.parse_args()
    before = manifest()
    write(args.mode + '_manifest.json', before)
    server_log = (OUT / (args.mode + '_server.log')).open('w', encoding='utf-8')
    server = subprocess.Popen(['python', str(ROOT / 'serve.py'), '8879'], stdout=server_log, stderr=server_log)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=EDGE, headless=True)
            context = browser.new_context(viewport={'width': 1600, 'height': 800})
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            if args.mode == 'flow':
                instrumentation='\nexport const __audit={getG:()=>G,getState:()=>state,isFrozen:()=>frozen,runBattle,render,save,expTick,closeFrozenRun};'
                context.route('**/ui/app.js',lambda route:route.fulfill(status=200,content_type='text/javascript',body=(ROOT/'src/ui/app.js').read_text(encoding='utf-8')+instrumentation))
                page.goto('http://127.0.0.1:8879/index.html?dev=newgame&tab=character')
                page.wait_for_timeout(500)
                begun=page.evaluate("""async()=>{const {__audit:A}=await import('/ui/app.js'); const {SYS:S}=await import('/ui/data.js');const g=A.getG();g.heroes.forEach(h=>S.game.toggleParty(g,h.uid,Date.now()));A.runBattle(101);return {active:g.run.active,resources:{...g.resources}};}""")
                page.goto('http://127.0.0.1:8879/index.html')
                page.wait_for_timeout(500)
                restored=page.evaluate("""async()=>{const {__audit:A}=await import('/ui/app.js');const g=A.getG();return {active:g.run.active,resources:g.resources,reason:g.reports[0].reason,notice:g.notice?.kind};}""")
                # Trigger a real storage event from another page in this isolated context.
                second=context.new_page()
                second.goto('http://127.0.0.1:8879/dev/test.html')
                second.wait_for_function("document.querySelector('#calib table') !== null",timeout=180000)
                second.evaluate("()=>{const k='thesevensim.save',v=JSON.parse(localStorage.getItem(k));v.savedAt+=1;localStorage.setItem(k,JSON.stringify(v));}")
                page.wait_for_timeout(250)
                frozen=page.evaluate("async()=>{const {__audit:A}=await import('/ui/app.js');return {frozen:A.isFrozen(),modal:A.getState().modal};}")
                second.close()
                sizes=[]
                for w,h in [(1600,800),(1280,700),(1920,1080)]:
                    page.set_viewport_size({'width':w,'height':h})
                    page.wait_for_timeout(100)
                    rect=page.locator('#stage').bounding_box()
                    sizes.append({'viewport':[w,h],'stage':rect,'fits':rect['x']>=-1 and rect['y']>=-1 and rect['x']+rect['width']<=w+1 and rect['y']+rect['height']<=h+1})
                mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
                mp=mobile.new_page();mp.goto('http://127.0.0.1:8879/index.html?dev=newgame&tab=character');mp.wait_for_timeout(500)
                touch=mp.evaluate("()=>{const e=document.querySelector('#stage'),r=e.getBoundingClientRect();return {transform:getComputedStyle(e).transform,x:r.x,y:r.y,width:r.width,height:r.height,viewport:[visualViewport.width,visualViewport.height]};}")
                mp.screenshot(path=str(OUT/'ui_touch.png'));mobile.close()
                result={'reconnect':{'before':begun,'after':restored,'ok':begun['active'] and not restored['active'] and begun['resources']==restored['resources'] and restored['reason']=='closed'},'multiTab':frozen,'sizes':sizes,'touch':touch,'errors':errors}
                write('flow.json',result);print(json.dumps(result,ensure_ascii=False),flush=True)
            elif args.mode == 'ui':
                routes = ['?dev=newgame&tab='+tab for tab in ['expedition','character','forge','tavern','shop','resource','explore','research','codex','help']]
                routes += ['?dev='+s for s in ['form&party=full','tree','tactics','tip','mats','search','battle','play&lay=split','cloud','cloud&c=pick','cloud&c=frozen','prologue']]
                rows=[]
                for lang in ['ko','en']:
                    for route in routes:
                        errors.clear()
                        page.goto('http://127.0.0.1:8879/index.html'+route+'&lang='+lang)
                        page.wait_for_timeout(350)
                        content=page.locator('#app').inner_text()
                        rows.append({'route':route,'lang':lang,'errors':errors[:], 'textLength':len(content), 'suspectText': [w for w in ['NaN','undefined','[object Object]'] if w in content]})
                        if lang=='ko' and route in ['?dev=newgame&tab=character','?dev=play&lay=split','?dev=form&party=full']:
                            page.screenshot(path=str(OUT / ('ui_'+str(len(rows))+'.png')))
                write('ui.json', rows)
                print(json.dumps({'routes':len(rows),'issues':[r for r in rows if r['errors'] or r['suspectText'] or r['textLength']<50]}, ensure_ascii=False),flush=True)
                # Add read-only inspection exports to served JS only; repository files stay intact.
                page.route('**/ui/app.js',lambda route:route.fulfill(status=200,content_type='text/javascript',body=(ROOT/'src/ui/app.js').read_text(encoding='utf-8')+'\nexport const __audit = { getG:()=>G, getState:()=>state, getCloud:()=>cloud, save, linkAccount, adoptRemote, render, continueGame };'))
                page.goto('http://127.0.0.1:8879/index.html?dev=newgame&tab=character')
                page.wait_for_timeout(500)
                result=page.evaluate((OUT/'ui_logic.js').read_text(encoding='utf-8'))
                write('ui_logic.json',result)
                print(json.dumps(result,ensure_ascii=False),flush=True)
            elif args.mode == 'campaign':
                page.goto('http://127.0.0.1:8879/dev/sim.html?mode=campaign&seeds=1-30&runs=100&bot=greedy')
                page.wait_for_function("document.title.startsWith('SIM ')",timeout=180000)
                result=page.locator('#sim').text_content()
                if result:
                    (OUT/'campaign.json').write_text(result,encoding='utf-8')
                    print(json.dumps({'title':page.title(),'summary':json.loads(result)['summary'],'errors':errors},ensure_ascii=False),flush=True)
                else:
                    write('campaign_error.json',{'title':page.title(),'errors':errors,'body':page.locator('body').inner_text()})
                    print('campaign failed',flush=True)
            elif args.mode == 'baseline':
                page.goto('http://127.0.0.1:8879/dev/test.html')
                page.wait_for_function("document.querySelector('#calib table') !== null", timeout=180000)
                results = page.locator('#out li').evaluate_all('(els) => els.map(e => ({ok:e.className === "ok", text:e.textContent}))')
                write('baseline.json', {'title':page.title(), 'errors':errors, 'results':results, 'calibration':page.locator('#calib').inner_text()})
                (OUT / 'baseline.html').write_text(page.content(), encoding='utf-8')
                print(json.dumps({'title':page.title(), 'count':len(results), 'failures':[r for r in results if not r['ok']], 'errors':errors}, ensure_ascii=False), flush=True)
            else:
                page.goto('http://127.0.0.1:8879/dev/test.html')
                page.wait_for_function("document.querySelector('#calib table') !== null", timeout=180000)
                script = (OUT / (args.mode + '.js')).read_text(encoding='utf-8')
                result = page.evaluate(script)
                write(args.mode + '.json', {'result':result, 'errors':errors})
                print(json.dumps(result, ensure_ascii=False), flush=True)
            browser.close()
    finally:
        server.terminate()
        server.wait(timeout=10)
        server_log.close()
        after = manifest()
        write(args.mode + '_changes_during_run.json', [k for k in before.keys() | after.keys() if before.get(k) != after.get(k)])

if __name__ == '__main__':
    main()
