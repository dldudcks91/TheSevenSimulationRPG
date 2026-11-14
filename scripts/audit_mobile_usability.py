"""Capture reachable mobile panels and their actual scrolling regions in an isolated browser."""
import argparse, json, os
from pathlib import Path
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--port',type=int,default=8854)
parser.add_argument('--width',type=int,default=390)
parser.add_argument('--height',type=int,default=844)
parser.add_argument('--output-dir',required=True)
parser.add_argument('--preview',action='store_true')
parser.add_argument('--lang',choices=['ko','en'],default='ko')
parser.add_argument('--skin',choices=['d2min','now'],default='d2min')
args=parser.parse_args()
out=Path(args.output_dir);out.mkdir(parents=True,exist_ok=True)
os.environ['PW_TEST_SCREENSHOT_NO_FONTS_READY']='1'
records=[];errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    ctx=browser.new_context(viewport={'width':args.width,'height':args.height},has_touch=not args.preview,is_mobile=not args.preview)
    ctx.add_init_script("localStorage.setItem('devAdmin','1')")
    if args.preview: ctx.add_init_script("localStorage.setItem('thesevensim.screenLayout','mobile')")
    for url in ['https://fonts.googleapis.com/**','https://fonts.gstatic.com/**','https://cdn.jsdelivr.net/**']:
        ctx.route(url,lambda r:r.abort())
    page=ctx.new_page();page.set_default_timeout(15000)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{args.port}/index.html?dev=box&tab=expedition&lang={args.lang}&skin={args.skin}',wait_until='domcontentloaded')
    page.wait_for_function("[...document.querySelectorAll('link[rel=stylesheet]')].filter(n=>new URL(n.href).origin===location.origin).every(n=>n.sheet)",timeout=15000)
    page.locator('.mobile-dock').wait_for(timeout=60000)
    def act(locator):
        locator.click() if args.preview else locator.tap()
    def audit(name):
        page.wait_for_timeout(100)
        data=page.locator('.main').evaluate('''main=>{
            const stage=document.querySelector('#stage').getBoundingClientRect(), scale=stage.width/document.querySelector('#stage').offsetWidth;
            const visible=n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(n).visibility!=='hidden'&&!n.closest('[inert]')};
            const scroll=[main,...main.querySelectorAll('*')].filter(visible).filter(n=>{
                const s=getComputedStyle(n);return /auto|scroll/.test(s.overflowY)&&n.scrollHeight>n.clientHeight+2||/auto|scroll/.test(s.overflowX)&&n.scrollWidth>n.clientWidth+2;
            }).map(n=>({class:n.className,tag:n.tagName,width:n.clientWidth,height:n.clientHeight,scrollWidth:n.scrollWidth,scrollHeight:n.scrollHeight,text:n.textContent.trim().slice(0,70)}));
            const places=[...main.querySelectorAll('.zone')].map(n=>{const r=n.getBoundingClientRect();return {text:n.textContent.trim().slice(0,60),height:r.height/scale,top:(r.top-stage.top)/scale,bottom:(r.bottom-stage.top)/scale}});
            const clippedControls=[...main.querySelectorAll('button,select,input,[role="button"]')].filter(visible).flatMap(n=>{
                const r=n.getBoundingClientRect();let scrollable=false;
                for(let p=n.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),b=p.getBoundingClientRect();
                    if(s.display==='contents')continue;
                    if(/auto|scroll/.test(s.overflowY)&&p.scrollHeight>p.clientHeight+2||/auto|scroll/.test(s.overflowX)&&p.scrollWidth>p.clientWidth+2)scrollable=true;
                    if(!scrollable&&(/hidden|clip/.test(s.overflowY)&&(r.top<b.top-2||r.bottom>b.bottom+2)||/hidden|clip/.test(s.overflowX)&&(r.left<b.left-2||r.right>b.right+2)))return [{class:n.className,text:n.textContent.trim().slice(0,50),ancestor:p.className}];
                }return [];
            });
            return {scroll,places,clippedControls,mainHeight:main.clientHeight,mainScroll:main.scrollHeight};
        }''')
        records.append({'name':name,**data})
        if data['clippedControls']:print(json.dumps({'name':name,'clippedControls':data['clippedControls']},ensure_ascii=True),flush=True)
    def tutorials():
        for _ in range(8):
            n=page.locator('.tutorial-card button').first
            if not n.count() or not n.is_visible():break
            act(n)
    for tab in ['expedition','party','character','research','tavern','shop','forge','library','resource','explore','colosseum','arena','codex','help','lab']:
        act(page.locator('[data-mobile-menu]'))
        act(page.locator(f'.nav [data-tab="{tab}"]'))
        tutorials()
        page.wait_for_timeout(150)
        page.screenshot(path=str(out/f'{tab}.png'))
        awaitables=page.locator('.main .mobile-pages > button')
        ids=awaitables.evaluate_all('(nodes)=>nodes.map(n=>n.id)')
        if not ids:audit(tab)
        for i,id in enumerate(ids):
            n=page.locator('#'+id)
            if n.is_visible():
                act(n);tutorials();audit(f'{tab}-{i}')
                if tab in ['party','research','tavern','library','resource']:page.screenshot(path=str(out/f'{tab}-{i}.png'))
    browser.close()
(out/'audit.json').write_text(json.dumps({'at':datetime.now(timezone.utc).isoformat(),'records':records,'errors':errors},ensure_ascii=False,indent=2),encoding='utf8')
print('Audit complete',len(records),'panels;',len(errors),'browser exceptions')
raise SystemExit(bool(errors or any(row['clippedControls'] for row in records)))
