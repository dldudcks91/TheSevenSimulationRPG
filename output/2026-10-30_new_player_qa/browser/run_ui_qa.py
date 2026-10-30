"""Actual clicks on an isolated new game; response-only accessors collect evidence."""
import functools
import http.server
import json
import threading
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[2]
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        super().end_headers()
class Server(http.server.ThreadingHTTPServer):
    request_queue_size=128
def write(name,value):
    (OUT/name).write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')
ACCESSOR='''
window.__qa={getG:()=>G,state,get SYS(){return SYS},D,save,render,loadTrack,now,runBattle,expTick,dropBattles};
'''

def main():
    server=Server(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT/'src')))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{server.server_port}'
    result={'base':base,'checks':[],'page_errors':[],'http_errors':[],'external_blocked':[],'requests':[],'console':[],'failed_requests':[]}
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel='msedge',headless=True)
        context=browser.new_context(viewport={'width':1600,'height':900},device_scale_factor=1)
        context.set_default_timeout(15000)
        context.route('https://**',lambda route:(result['external_blocked'].append(route.request.url),route.abort()))
        context.route('**/ui/cloud.js',lambda route:route.fulfill(status=200,content_type='text/javascript',body='export async function pushTrack(){return {ok:true};}'))
        context.route('**/ui/app.js',lambda route:route.fulfill(status=200,content_type='text/javascript',body=(ROOT/'src/ui/app.js').read_text(encoding='utf-8')+ACCESSOR))
        page=context.new_page()
        page.on('request',lambda request:result['requests'].append(request.url))
        page.on('requestfailed',lambda request:result['failed_requests'].append({'url':request.url,'failure':request.failure}))
        page.on('console',lambda message:result['console'].append({'type':message.type,'text':message.text}))
        page.on('pageerror',lambda error:result['page_errors'].append(str(error)))
        page.on('response',lambda response:result['http_errors'].append({'url':response.url,'status':response.status}) if response.status>=400 else None)
        def check(name,ok,detail=None):
            result['checks'].append({'name':name,'ok':ok,'detail':detail})
            write('ui_results.json',result)
            print(json.dumps(result['checks'][-1],ensure_ascii=True),flush=True)
        def shot(name):
            page.screenshot(path=str(OUT/name),timeout=15000)
        try:
            page.goto(base+'/index.html',wait_until='domcontentloaded')
            page.wait_for_function("window.__qa && !document.querySelector('#app').classList.contains('booting')")
            check('fresh menu has no save',page.locator('.mn-btn').count()==2 and page.locator('.mn-btn').nth(1).is_disabled(),page.locator('body').inner_text())
            shot('01_menu.png')
            page.locator('.mn-btn').first.click()
            check('three hero candidates',page.locator('.ng-card').count()==3,page.locator('.ng-actions').inner_text())
            shot('02_candidates.png')
            page.locator('.ng-actions .primary').click()
            page.wait_for_selector('.pro-wrap')
            pro_save=page.evaluate("JSON.parse(localStorage.getItem('thesevensim.save'))")
            check('save created before prologue',pro_save is not None and len(pro_save['heroes'])>=3,{'heroes':len(pro_save['heroes']),'createdAt':pro_save.get('createdAt')})
            scenes=[]
            while page.locator('.pro-wrap').count():
                scenes.append(page.locator('.pro-h').inner_text())
                page.locator('.pro-actions .primary').click()
                page.wait_for_timeout(650)
                if len(scenes)>8: raise RuntimeError('prologue did not terminate')
            check('all prologue scenes lead to game',len(scenes)==5,scenes)
            shot('03_initial_game.png')
            result['initial_game']=page.evaluate("({heroes:__qa.getG().heroes,resources:__qa.getG().resources,construction:__qa.SYS.game.constructionState(__qa.getG()),buttons:[...document.querySelectorAll('button')].map(b=>({text:b.innerText,tab:b.dataset.tab,disabled:b.disabled}))})")
            tabs=page.locator('.nav button[data-tab]').evaluate_all("nodes=>nodes.map(n=>({id:n.dataset.tab,locked:n.classList.contains('dim')}))")
            for tab in tabs:
                before=page.evaluate('__qa.state.tab')
                page.locator(f'.nav button[data-tab="{tab["id"]}"]').click()
                actual=page.evaluate('__qa.state.tab')
                check('navigate '+tab['id'],actual==(before if tab['locked'] else tab['id']),{'locked':tab['locked'],'actual':actual,'body':page.locator('.main').inner_text()[:800]})
            page.locator('.nav button[data-tab="expedition"]').click()
            page.locator('.zone:not(.locked)').first.click()
            page.wait_for_selector('.depart-box')
            check('first departure available',page.locator('.form-actions .primary').is_visible(),page.locator('.depart-box').inner_text())
            shot('04_departure.png')
            page.keyboard.press('Escape')
            check('escape closes departure',page.locator('.depart-box').count()==0)
            page.locator('.zone:not(.locked)').first.click()
            page.locator('.form-actions .primary').click()
            page.wait_for_timeout(1500)
            check('first battle started',page.evaluate('Object.keys(__qa.state.battles).length===1'),page.evaluate('({runs:__qa.getG().runs,exp:__qa.state.exp})'))
            shot('05_first_battle.png')
            # Leave the battle visible only briefly; real-time progression is exercised by the main simulation runner.
            page.locator('.nav button[data-tab="character"]').click()
            check('character while expedition runs',page.evaluate('__qa.state.tab==="character" && Object.keys(__qa.state.battles).length===1'))
            shot('06_character.png')
            # Settings nickname is the only free-text player field in the current local flow.
            settings=page.locator('.dp-toggle')
            if not settings.count():
                settings=page.locator('button').filter(has_text='⚙')
            settings.first.click()
            page.wait_for_selector('.set-nick')
            page.locator('.set-nick').fill('  QA New Player  ')
            page.locator('.set-nick').press('Enter')
            check('nickname Enter trims and saves',page.evaluate('__qa.loadTrack().nick')=='QA New Player',page.evaluate('__qa.loadTrack()'))
            before=page.evaluate('({heroes:__qa.getG().heroes.map(h=>h.uid),createdAt:__qa.getG().createdAt,gold:__qa.getG().resources.gold})')
            page.evaluate('__qa.save()')
            saved=page.evaluate("JSON.parse(localStorage.getItem('thesevensim.save'))")
            write('saved_before_reload.json',saved)
            page.reload(wait_until='domcontentloaded')
            page.wait_for_selector('.mn-btn')
            check('reload offers load',page.locator('.mn-btn').nth(1).is_enabled())
            page.locator('.mn-btn').nth(1).click()
            page.wait_for_function('__qa.state.screen==="game"')
            after=page.evaluate('({heroes:__qa.getG().heroes.map(h=>h.uid),createdAt:__qa.getG().createdAt,gold:__qa.getG().resources.gold})')
            check('save and reload retains party and currency',before==after,{'before':before,'after':after})
            check('reload preserves nickname',page.evaluate('__qa.loadTrack().nick')=='QA New Player')
            shot('07_reloaded.png')
            check('no local HTTP errors',len(result['http_errors'])==0,result['http_errors'])
            check('no uncaught JavaScript errors',len(result['page_errors'])==0,result['page_errors'])
        except Exception as e:
            result['exception']=str(e)
            result['exception_url']=page.url
            result['exception_html']=page.content()[:12000]
            result['exception_body']=page.locator('body').inner_text()[:6000]
            try: shot('failure.png')
            except: pass
            print(json.dumps({'exception':str(e)},ensure_ascii=True),flush=True)
        write('ui_results.json',result)
        browser.close()
    server.shutdown()

if __name__=='__main__':main()
