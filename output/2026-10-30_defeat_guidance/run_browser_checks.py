"""Isolated browser checks for retryPreparation notification navigation.

Artificial repeated-report fixtures use a real 60-minute player's recorded defeat.
No product source changes, production requests, or existing browser saves are used.
"""
import functools,hashlib,http.server,json,mimetypes,threading,time
from pathlib import Path
from urllib.parse import unquote,urlparse
from playwright.sync_api import sync_playwright

OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[1]
BASE_SAVE=ROOT/'output/2026-10-30_new_player_qa/simulation/state_managed_3600.json'
ACCESSOR='''
window.__dg={getG:()=>G,get SYS(){return SYS},D,state,render,runBattle,dropBattles,
 reset(raw,paint=true){dropBattles();G=SYS.game.deserialize(raw);state.screen='game';state.tab='expedition';state.exp='idle';state.modal=null;state.repSel=null;state.repNo=null;state.heroUid=G.heroes.at(-1).uid;state.invNo=2;if(paint)render();},
 fixture(raw,attempts=5,postOnboarding=true){
  this.reset(raw,false);G.runs=G.runs.map(()=>null);G.notice=null;
  if(postOnboarding)G.commissions.fame=1;
  const loss=JSON.parse(JSON.stringify(G.reports.find(r=>r.reason==='wipe'&&!r.won)));
  if(!loss)throw Error('recorded defeat fixture missing');
  const stageId=loss.stageId,no=loss.preset;
  runBattle(stageId,{preset:no,focus:false,defer:true});
  const live=G.reports.find(r=>r.reason==null);
  G.reports=[...(live?[live]:[]),...Array.from({length:attempts},(_,i)=>({...JSON.parse(JSON.stringify(loss)),at:Date.now()-(i+1)*60000}))];
  state.tab='expedition';state.exp='report';state.repNo=no;state.repSel=G.reports.find(r=>r.reason==='wipe');
  render();return {stageId,preset:no,hero:loss.party[0],threshold:D.balance.expedition_retry_guide_runs};
 },
 invariants(){return JSON.stringify({runs:G.runs,counters:G.counters,resources:G.resources,materials:G.materials,potions:G.potions,presets:G.presets,reports:G.reports,handles:Object.keys(state.battles)});}
};
'''
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
class Server(http.server.ThreadingHTTPServer):
    request_queue_size=128
    def handle_error(self,*args):pass

def main():
    sources={'/'+p.relative_to(ROOT/'src').as_posix():p.read_bytes() for p in (ROOT/'src').rglob('*') if p.is_file() and p.suffix in ['.js','.csv','.json','.html','.css']}
    manifest={p:hashlib.sha256(b).hexdigest() for p,b in sources.items()}
    (OUT/'browser_source_manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    raw=json.loads(BASE_SAVE.read_text(encoding='utf-8'))
    server=Server(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT/'src')))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{server.server_port}'
    result={'checks':[],'page_errors':[],'http_errors':[],'source_manifest':'browser_source_manifest.json','fixture':'real recorded defeat, artificial repeated reports; no progression timing claim'}
    def save(): (OUT/'browser_results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    def check(name,ok,detail=None):
        result['checks'].append({'name':name,'ok':ok,'detail':detail});save()
        print(json.dumps(result['checks'][-1],ensure_ascii=True),flush=True)
    started=time.time()
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(channel='msedge',headless=True)
            for width,height,language in [(1600,900,'ko'),(1280,720,'en')]:
                context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1)
                context.set_default_timeout(15000)
                def route_file(route):
                    path=unquote(urlparse(route.request.url).path)
                    if path=='/ui/cloud.js':return route.fulfill(content_type='text/javascript',body='export async function pushTrack(){return {ok:true};}')
                    if urlparse(route.request.url).hostname not in ['127.0.0.1','localhost']:return route.abort()
                    if path not in sources:return route.continue_()
                    data=sources[path]
                    if path=='/ui/app.js':data=data.decode('utf-8')+ACCESSOR
                    return route.fulfill(content_type=mimetypes.guess_type(path)[0] or 'application/octet-stream',body=data)
                context.route('**/*',route_file)
                context.add_init_script('Date.now=()=>'+str(raw['savedAt']+1)+''';
window.__dgBubbleSchedules=0;const qaTimeout=window.setTimeout;window.setTimeout=(fn,ms,...args)=>{if(ms===3000&&String(fn).includes("bubble = ''"))window.__dgBubbleSchedules++;return qaTimeout(fn,ms,...args);};''')
                page=context.new_page()
                page.on('pageerror',lambda e:result['page_errors'].append(str(e)))
                page.on('response',lambda r:result['http_errors'].append({'url':r.url,'status':r.status}) if r.status>=400 else None)
                page.goto(base+'/index.html',wait_until='domcontentloaded')
                page.wait_for_function('window.__dg && __dg.SYS')
                page.wait_for_selector('.mn-btn')
                if language=='en':page.locator('.lang-btn').click()
                fixture=page.evaluate('(raw)=>__dg.fixture(raw,5,true)',raw)
                model=page.evaluate('__dg.SYS.game.notificationState(__dg.getG(),Date.now())')
                check(f'{language} repeated defeat guide after onboarding',model['guide'] and model['guide']['id']=='retryPreparation',model)
                expected_hero=model['guide']['target']['hero']
                check(f'{language} no bubble for loaded owner guide',page.evaluate('window.__dgBubbleSchedules')==0)
                before=page.evaluate('__dg.invariants()')
                page.locator('.notification-btn').click()
                page.locator('[data-notification-action="folder-missions"]').click()
                advice=page.locator('.notification-guide')
                check(f'{language} advice visible',advice.is_visible(),advice.inner_text())
                detail=advice.locator('.notification-detail').evaluate('e=>({clientWidth:e.clientWidth,scrollWidth:e.scrollWidth,clientHeight:e.clientHeight,scrollHeight:e.scrollHeight,whiteSpace:getComputedStyle(e).whiteSpace,rect:e.getBoundingClientRect().toJSON(),card:e.closest(".notification-card").getBoundingClientRect().toJSON()})')
                check(f'{language} all advice text wraps without clipping',detail['whiteSpace']!='nowrap' and detail['scrollWidth']<=detail['clientWidth']+1 and detail['scrollHeight']<=detail['clientHeight']+1 and detail['rect']['bottom']<=detail['card']['bottom']+1,detail)
                action=page.locator('[data-notification-action="retryPreparation"]')
                bounds=action.bounding_box();panel=page.locator('.notification-panel').bounding_box()
                check(f'{language} advice button within panel',bounds and panel and bounds['x']>=panel['x'] and bounds['y']>=panel['y'] and bounds['x']+bounds['width']<=panel['x']+panel['width']+1 and bounds['y']+bounds['height']<=panel['y']+panel['height']+1,{'button':bounds,'panel':panel})
                page.screenshot(path=str(OUT/f'{language}_{width}_advice.png'))
                page.locator('[data-notification-action="guide-toggle"]').click()
                check(f'{language} collapse advice',page.locator('.notification-guide').count()==0)
                page.locator('[data-notification-action="guide-toggle"]').click()
                page.keyboard.press('Escape')
                check(f'{language} Escape closes panel',page.locator('.notification-panel').is_hidden())
                check(f'{language} panel controls preserve expedition',page.evaluate('__dg.invariants()')==before)
                page.locator('.notification-btn').click()
                page.locator('[data-notification-action="folder-missions"]').click()
                page.locator('[data-notification-action="retryPreparation"]').click()
                target=page.evaluate('({tab:__dg.state.tab,hero:__dg.state.heroUid,inventory:__dg.state.invNo,handles:Object.keys(__dg.state.battles),preset:__dg.getG().preset})')
                check(f'{language} shortcut reaches correct character and inventory',target['tab']=='character' and target['inventory']==fixture['preset'] and target['hero']==expected_hero,target)
                check(f'{language} shortcut preserves selected game preset',target['preset']==raw['preset'],target)
                check(f'{language} shortcut preserves live expedition',page.evaluate('__dg.invariants()')==before)
                check(f'{language} panel closes after navigation',page.locator('.notification-panel').is_hidden())
                page.screenshot(path=str(OUT/f'{language}_{width}_character.png'))
                # The unchanged report must retain its layout and scrolling after visiting Character.
                page.evaluate("__dg.state.tab='expedition';__dg.state.exp='report';__dg.render()")
                rects=page.locator('.rep-detail').evaluate('e=>({height:e.clientHeight,scrollHeight:e.scrollHeight,overflow:getComputedStyle(e).overflowY,rect:e.getBoundingClientRect().toJSON()})')
                check(f'{language} report remains internally scrollable',rects['overflow']=='auto' and rects['height']>0,rects)
                page.locator('.rep-detail').evaluate('e=>e.scrollTop=e.scrollHeight')
                check(f'{language} remaining enemies reachable',page.locator('.rep-foes').is_visible())
                page.screenshot(path=str(OUT/f'{language}_{width}_report.png'))
                # No advice below the threshold; visible guide must be current, not cached by the menu.
                page.evaluate('(raw)=>__dg.fixture(raw,4,true)',raw)
                model=page.evaluate('__dg.SYS.game.notificationState(__dg.getG(),Date.now())')
                check(f'{language} below threshold hides advice',not model['guide'] or model['guide']['id']!='retryPreparation',model)
                # First live arrival raises a bubble once; a larger loss count must not repeat it.
                schedules=page.evaluate('window.__dgBubbleSchedules')
                page.evaluate("const dgLoss=JSON.parse(JSON.stringify(__dg.getG().reports.find(r=>r.reason==='wipe')));dgLoss.at-=300000;__dg.getG().reports.push(dgLoss);__dg.render()")
                check(f'{language} first live arrival creates one bubble',page.evaluate('window.__dgBubbleSchedules')==schedules+1)
                check(f'{language} live bubble visible',page.locator('.notification-bubble').is_visible())
                page.evaluate("const dgExtra=JSON.parse(JSON.stringify(__dg.getG().reports.find(r=>r.reason==='wipe')));dgExtra.at-=600000;__dg.getG().reports.push(dgExtra);__dg.render()")
                check(f'{language} repeated losses do not repeat bubble',page.evaluate('window.__dgBubbleSchedules')==schedules+1)
                # Keep an actual old button reference, invalidate the guide without rendering, then click.
                page.locator('.notification-btn').click()
                page.locator('[data-notification-action="folder-missions"]').click()
                page.evaluate("__dg.getG().reports.find(r=>r.reason==='wipe').reason='closed'")
                stale_before=page.evaluate('__dg.invariants()')
                page.locator('[data-notification-action="retryPreparation"]').click()
                check(f'{language} stale shortcut rejected',page.evaluate('__dg.state.tab')=='expedition')
                check(f'{language} stale shortcut preserves expedition',page.evaluate('__dg.invariants()')==stale_before)
                component=page.evaluate('''async()=>{
                    const {createNotifications}=await import('/ui/notifications.js');
                    let owner={},model={guide:null,items:[],count:0};
                    const menu=createNotifications({read:()=>({owner,model}),describe:i=>({title:i.id,detail:String(i.target?.attempts??'')}),navigate:()=>{},hideTip:()=>{},lockIcon:()=>'',readDismissed:()=>[],writeDismissed:()=>{}});
                    const host=menu.mount();document.body.appendChild(host);menu.paint();
                    const start=window.__dgBubbleSchedules,steps=[];
                    const update=(preset,attempts)=>{model={guide:preset?{id:'retryPreparation',tab:'character',target:{preset,difficulty:'normal',stageId:1051,attempts}}:null,items:[],count:0};menu.refresh();steps.push(window.__dgBubbleSchedules-start);};
                    update(1,5);update(2,6);update(1,7);update(null,0);update(1,8);
                    owner={};update(1,9);
                    host.remove();return steps;
                }''')
                check(f'{language} multi-party A5 B6 A7 does not repeat old bubble',component[:3]==[1,2,2],component)
                check(f'{language} reeligibility and new owner do not replay old bubble',component[3:]==[2,2,2],component)
                context.close()
            result['elapsed_sec']=round(time.time()-started,2)
            result['source_changed_during_run']=[p for p,b in sources.items() if (ROOT/'src'/p.lstrip('/')).read_bytes()!=b]
            check('no uncaught JavaScript errors',not result['page_errors'],result['page_errors'])
            check('no local HTTP errors',not result['http_errors'],result['http_errors'])
            save();browser.close()
    finally:
        server.shutdown();server.server_close()

if __name__=='__main__':main()
