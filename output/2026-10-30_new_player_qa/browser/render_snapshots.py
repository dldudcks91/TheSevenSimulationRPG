"""Load actual simulation checkpoint saves through the normal continue-game path."""
import functools,json,threading,hashlib,datetime,sys
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
from run_ui_qa import OUT,ROOT,Server,Handler,ACCESSOR,write

def main():
    frozen={}
    manifest={'created_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':[]}
    passive='--passive' in sys.argv
    source_root=OUT/'source_snapshot' if passive else ROOT/'src'
    for path in list((source_root/'ui').glob('*.js'))+list((source_root/'game_logic').glob('*.js'))+list((source_root/'data').glob('*.csv'))+list((source_root/'ui').glob('style.css')):
        relative=path.relative_to(source_root).as_posix()
        raw=path.read_bytes()
        frozen['/'+relative]=raw
        manifest['files'].append({'path':relative,'sha256':hashlib.sha256(raw).hexdigest(),'mtime_ns':path.stat().st_mtime_ns,'bytes':len(raw)})
        if not passive:
            destination=OUT/'source_snapshot'/relative
            destination.parent.mkdir(parents=True,exist_ok=True)
            destination.write_bytes(raw)
    if not passive:write('snapshot_source_manifest.json',manifest)
    server=Server(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT/'src')))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{server.server_port}'
    result={'checkpoints':[],'source_manifest':'snapshot_source_manifest.json','source_frozen':True,'date_now':'checkpoint.savedAt + 1ms','production_backend':'stubbed'}
    policy='passive' if passive else 'managed'
    result_file='passive_snapshot_ui_results.json' if passive else 'snapshot_ui_results.json'
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel='msedge',headless=True)
        for sec in ([86400] if passive else [600,3600,86400]):
            raw=json.loads((OUT.parent/'simulation'/f'state_{policy}_{sec}.json').read_text(encoding='utf-8'))
            context=browser.new_context(viewport={'width':1600,'height':900},device_scale_factor=1)
            context.set_default_timeout(15000)
            def frozen_route(route):
                path=urlparse(route.request.url).path
                if path not in frozen:return route.continue_()
                body=frozen[path]
                if path=='/ui/app.js':body=body.decode('utf-8')+ACCESSOR
                kind='text/javascript' if path.endswith('.js') else 'text/csv' if path.endswith('.csv') else 'text/css'
                route.fulfill(status=200,content_type=kind,body=body)
            context.route('**/*',frozen_route)
            context.route('https://**',lambda route:route.abort())
            context.route('**/ui/cloud.js',lambda route:route.fulfill(status=200,content_type='text/javascript',body='export async function pushTrack(){return {ok:true};}'))
            context.add_init_script('Date.now=()=>'+str(raw['savedAt']+1)+'; localStorage.setItem("thesevensim.save",'+json.dumps(json.dumps(raw))+');')
            page=context.new_page()
            errors=[];http=[]
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.on('response',lambda response:http.append({'url':response.url,'status':response.status}) if response.status>=400 else None)
            page.goto(base+'/index.html',wait_until='domcontentloaded')
            page.wait_for_selector('.mn-btn')
            page.locator('.mn-btn').nth(1).click()
            page.wait_for_function('__qa.getG() && __qa.state.screen==="game"')
            loaded=page.evaluate('({levels:__qa.getG().heroes.map(h=>h.level),gold:__qa.getG().resources.gold,bags:__qa.getG().bags,items:Object.keys(__qa.getG().items).length,cleared:__qa.getG().progress.cleared,run:__qa.getG().runs})')
            rec={'seconds':sec,'loaded':loaded,'preserved_levels':loaded['levels']==[h['level'] for h in raw['heroes']],'preserved_gold':loaded['gold']==raw['resources']['gold'],'views':{},'page_errors':errors,'http_errors':http}
            for tab in ['expedition','character','resource']:
                page.locator(f'.nav button[data-tab="{tab}"]').click()
                page.screenshot(path=str(OUT/f'{policy}_{sec}_{tab}.png'),timeout=15000)
                rec['views'][tab]=page.locator('.main').inner_text()
            result['checkpoints'].append(rec)
            write(result_file,result)
            # Normal Report click preserves actual saved battle records if available.
            page.locator('.nav button[data-tab="expedition"]').click()
            notice=page.locator('.notice-float .b-ok')
            if notice.count():notice.click()
            report=page.locator('.dt-report')
            if report.count() and report.is_enabled():
                report.click()
                rec['views']['report']=page.locator('.main').inner_text()
                page.screenshot(path=str(OUT/f'{policy}_{sec}_report.png'),timeout=15000)
                if sec==3600 and page.locator('.rep-run').count()>1:
                    page.locator('.rep-run').nth(1).click()
                    rec['views']['defeat_report']=page.locator('.main').inner_text()
                    page.screenshot(path=str(OUT/f'{policy}_{sec}_defeat.png'),timeout=15000)
                if passive:
                    index=page.evaluate('__qa.getG().reports.findIndex(r=>r.discarded>0)')
                    if index>=0:
                        page.locator('.rep-run').nth(index).click()
                        rec['views']['overflow_report']=page.locator('.main').inner_text()
                        page.screenshot(path=str(OUT/f'{policy}_{sec}_overflow.png'),timeout=15000)
            write(result_file,result)
            print(json.dumps({'seconds':sec,'levels':loaded['levels'],'gold':loaded['gold'],'preserved_levels':rec['preserved_levels'],'preserved_gold':rec['preserved_gold'],'errors':errors,'http_errors':http},ensure_ascii=True),flush=True)
            context.close()
        browser.close()
    server.shutdown()

if __name__=='__main__':main()
