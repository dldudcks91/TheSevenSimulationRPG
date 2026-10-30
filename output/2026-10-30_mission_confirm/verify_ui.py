"""Mission shortcut/acknowledgement QA. The app accessor is response-only."""
import json
import traceback
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
BASE = 'http://127.0.0.1:8823'
CHECKS, ERRORS = [], []
HARNESS = '''
;globalThis.__missionQA = {
    get game(){return G;}, get SYS(){return SYS;}, state, render, notifications, save, startGame,
    model: () => SYS.game.notificationState(G, now()),
};
'''

def check(name, ok, detail=None):
    CHECKS.append({'name': name, 'ok': bool(ok), **({'detail': detail} if detail is not None else {})})
    if not ok:
        raise AssertionError(name + (': '+str(detail) if detail is not None else ''))

def badge(page):
    node = page.locator('.notification-btn .mail-n')
    return node.inner_text() if node.count() else None

def folders(page):
    return page.locator('.notification-folder').evaluate_all('''nodes=>Object.fromEntries(nodes.map(n=>
        [n.dataset.folder,n.querySelector('.notification-folder-count')?.textContent??null]))''')

def bell(page, folder='missions'):
    if not page.locator('.notification-panel').is_visible():
        page.locator('.notification-btn').click()
    page.locator('#notification-folder-'+folder).click()

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    failure = None
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='msedge', headless=True)
        ctx = browser.new_context(viewport={'width':1600,'height':900})
        ctx.route('https://**', lambda route: route.abort())
        ctx.route('**/ui/app.js', lambda route: route.fulfill(status=200,content_type='text/javascript',
            body=(ROOT/'src/ui/app.js').read_text(encoding='utf-8')+HARNESS))
        page = ctx.new_page()
        page.set_default_timeout(10000)
        page.on('pageerror', lambda error: ERRORS.append(str(error)))
        try:
            page.goto(BASE+'/index.html?dev=newgame&lang=ko&skin=d2min',wait_until='networkidle')
            page.wait_for_selector('.notification-btn')
            page.evaluate('''()=>{const a=__missionQA,g=a.game;g.counters.battle=1;g.resources.gold=1000000;
                g.heroes[0].masteryPoints=1; a.render();}''')
            check('fixture has buildShop mission and one independent mastery notice',page.evaluate("__missionQA.model().guide.id==='buildShop' && __missionQA.model().items.length===1") and badge(page)=='2')
            bell(page)
            check('mission copy uses requested Korean instruction',page.locator('.notification-guide .notification-title').inner_text()=='상단을 건설하세요')
            check('mission has shortcut followed by confirmation',page.locator('.notification-guide .notification-actions button').all_inner_texts()==['바로가기','확인'])
            check('mixed badges count each folder separately',folders(page)=={'notifications':'1','missions':'1','achievements':None})
            page.screenshot(path=str(OUT/'build_shop_ko.png'))
            before=page.evaluate('JSON.stringify(__missionQA.game)')
            page.locator('.notification-guide .notification-go').click()
            check('mission shortcut opens correct building and keeps mission',page.evaluate("__missionQA.state.tab==='research' && __missionQA.state.cnPick==='shop'") and page.locator('.cn-side.notification-target').count()==1 and badge(page)=='2')
            check('shortcut does not mutate game state',page.evaluate('JSON.stringify(__missionQA.game)')==before)
            bell(page)
            page.locator('.notification-guide .notification-confirm').click()
            check('confirmation hides only mission and lowers badge',page.locator('.notification-guide').count()==0 and badge(page)=='1' and folders(page)=={'notifications':'1','missions':None,'achievements':None})
            check('mission confirmation does not mutate game or original guide',page.evaluate('JSON.stringify(__missionQA.game)')==before and page.evaluate("__missionQA.model().guide.id==='buildShop' && __missionQA.model().count===2"))
            check('mission confirmation returns focus to missions folder',page.locator('#notification-folder-missions').evaluate('(n)=>n===document.activeElement'))
            record=page.evaluate("JSON.parse(localStorage.getItem('thesevensim.notificationDismissed'))")
            check('mission uses separate stable dismissal key',any(key.startswith('mission:') and 'buildShop' in key for keys in record.values() for key in keys),record)
            page.evaluate('__missionQA.notifications.refresh(); __missionQA.render(); __missionQA.save()')
            check('refresh and rerender keep acknowledged mission hidden',page.locator('.notification-guide').count()==0 and badge(page)=='1')
            identity=page.evaluate('[__missionQA.game.seed,__missionQA.game.createdAt]')
            page.goto(BASE+'/index.html?tab=research&lang=ko&skin=d2min',wait_until='networkidle')
            page.wait_for_selector('.notification-btn')
            bell(page)
            check('reload preserves game identity and acknowledged mission',page.evaluate('[__missionQA.game.seed,__missionQA.game.createdAt]')==identity and page.locator('.notification-guide').count()==0 and badge(page)=='1')
            check('acknowledged mission folder keeps normal empty layout',page.locator('.notification-list .empty').count()==3)
            page.locator('#notification-folder-notifications').click()
            check('independent mastery item remains visible',page.locator('.notification-card:not(.empty)').count()==1)
            page.locator('.notification-confirm').click()
            check('notification can be acknowledged independently',badge(page) is None and page.evaluate('__missionQA.model().items.length===1'))
            page.keyboard.press('Escape')
            page.evaluate('''()=>{const a=__missionQA,r=a.SYS.game.construct(a.game,'shop');
                if(!r.ok)throw Error(JSON.stringify(r));a.render();}''')
            check('real building completion shows next new mission',page.evaluate("__missionQA.model().guide.id==='buildTavern'") and badge(page)=='1')
            bell(page)
            check('new mission retains both actions',page.locator('.notification-guide .notification-actions button').count()==2)
            page.keyboard.press('Escape')
            page.evaluate('''()=>{const a=__missionQA;a.startGame();a.game.counters.battle=1;
                a.game.resources.gold=1000000;a.render();}''')
            check('new game does not inherit old mission acknowledgement',page.evaluate('[__missionQA.game.seed,__missionQA.game.createdAt]')!=identity and badge(page)=='1')
            page.locator('.lang-btn').click()
            bell(page)
            check('English mission instruction and two actions are translated',page.locator('.notification-guide .notification-title').inner_text()=='Build the Trading House' and page.locator('.notification-guide .notification-actions button').all_inner_texts()==['Go to','OK'])
            check('English mission confirmation accessible name is complete',page.locator('.notification-guide .notification-confirm').get_attribute('aria-label')=='Build the Trading House · OK')
            page.screenshot(path=str(OUT/'build_shop_en.png'))
            for width,height,skin in [(1280,720,'now'),(1920,1080,'d2min')]:
                page.set_viewport_size({'width':width,'height':height})
                page.evaluate('(skin)=>document.documentElement.dataset.skin=skin',skin)
                rect=page.locator('.notification-panel').bounding_box()
                check(f'mission actions fit {width}x{height} {skin}',rect['x']>=0 and rect['y']>=0 and rect['x']+rect['width']<=width+1 and rect['y']+rect['height']<=height+1,rect)

            # Use the real module with an injected state reader to exercise retry identities without running combat.
            isolated=ctx.new_page()
            isolated.route('**/__mission_confirm.html',lambda route:route.fulfill(status=200,content_type='text/html',body='<!doctype html><html><body></body></html>'))
            isolated.goto(BASE+'/__mission_confirm.html')
            result=isolated.evaluate('''async()=>{
                const {createNotifications}=await import('/ui/notifications.js');
                const owner={};let dismissed=[];
                const model={guide:null,items:[],count:0};
                const retry=(stageId,attempts=5,preset=1)=>({id:'retryPreparation',tab:'character',target:{preset,hero:'h1',stageId,difficulty:'normal',attempts}});
                const n=createNotifications({read:()=>({owner,model}),describe:item=>({title:item.id}),navigate:()=>{},hideTip:()=>{},lockIcon:()=>'',readDismissed:()=>dismissed,writeDismissed:(_,ids)=>{dismissed=ids}});
                document.body.appendChild(n.mount());n.paint();
                const snap=()=>({guide:!!document.querySelector('.notification-guide'),badge:document.querySelector('.notification-btn .mail-n')?.textContent??null,bubble:!!document.querySelector('.notification-bubble')});
                model.guide=retry(1011);n.refresh();const arrived=snap();
                document.querySelector('.notification-btn').click();document.querySelector('#notification-folder-missions').click();
                const stale=document.querySelector('.notification-guide .notification-confirm');stale.click();const confirmed=snap();
                document.querySelector('.notification-close').click();
                model.guide=retry(1011,6);n.refresh();const attempts=snap();
                model.guide=retry(1011,7);model.guide.target.hero='h2';n.refresh();const hero=snap();
                model.guide=retry(1012);n.refresh();const nextStage=snap();
                document.querySelector('.notification-btn').click();document.querySelector('#notification-folder-missions').click();
                stale.click();const staleDidNotHideNew=!!document.querySelector('.notification-guide');
                document.querySelector('.notification-guide .notification-confirm').click();
                model.guide=retry(1012,8,2);n.refresh();const nextParty=snap();
                document.querySelector('.notification-guide .notification-confirm').click();
                model.guide={id:'earnGold',tab:'expedition',target:{building:'shop'}};n.refresh();const fundsShop=snap();
                document.querySelector('.notification-guide .notification-confirm').click();
                model.guide={id:'earnGold',tab:'expedition',target:{building:'tavern'}};n.refresh();const fundsTavern=snap();
                document.querySelector('.notification-guide .notification-confirm').click();
                model.guide={id:'progressCommission',tab:'expedition',target:{commission:1}};n.refresh();
                document.querySelector('.notification-guide .notification-confirm').click();
                model.guide={id:'progressCommission',tab:'expedition',target:{commission:2}};n.refresh();const commission=snap();
                return {arrived,confirmed,attempts,hero,nextStage,staleDidNotHideNew,nextParty,fundsShop,fundsTavern,commission,dismissed};
            }''')
            check('new retry mission contributes count and bubble',result['arrived']['badge']=='1' and result['arrived']['bubble'],result)
            check('retry confirmation removes counted mission',not result['confirmed']['guide'] and result['confirmed']['badge'] is None)
            check('retry attempt increments do not replay confirmed mission or bubble',result['attempts']['badge'] is None and not result['attempts']['bubble'])
            check('hero replacement does not bypass retry acknowledgement',result['hero']['badge'] is None and not result['hero']['bubble'])
            check('new retry stage has a new counted mission',result['nextStage']['badge']=='1' and result['nextStage']['bubble'])
            check('stale confirm handler cannot hide a newer mission',result['staleDidNotHideNew'])
            check('new retry party has a separate mission',result['nextParty']['guide'] and result['nextParty']['badge']=='1')
            check('building context differentiates funding missions',result['fundsShop']['guide'] and result['fundsTavern']['guide'])
            check('new commission context has a new mission',result['commission']['guide'] and result['commission']['badge']=='1')
            check('no browser runtime exceptions',not ERRORS,ERRORS)
        except Exception:
            failure=traceback.format_exc()
            page.screenshot(path=str(OUT/'failure.png'))
        finally:
            result={'passed':sum(c['ok'] for c in CHECKS),'checks':CHECKS,'errors':ERRORS,'failure':failure}
            (OUT/'ui_results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
            print(json.dumps(result,ensure_ascii=True),flush=True)
            browser.close()
    if failure or any(not c['ok'] for c in CHECKS):
        raise SystemExit(1)

if __name__=='__main__':
    main()
