"""Independent frozen-source validation, including the unmodified regression assertion suite."""
import functools,hashlib,http.server,json,mimetypes,sys,threading,time
from pathlib import Path
from urllib.parse import unquote,urlparse
from playwright.sync_api import sync_playwright

OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[1]
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
class Server(http.server.ThreadingHTTPServer):
    request_queue_size=128
    def handle_error(self,*args):pass

def main():
    sources={'/'+p.relative_to(ROOT/'src').as_posix():p.read_bytes() for p in (ROOT/'src').rglob('*') if p.is_file() and p.suffix in ['.js','.csv','.json','.html']}
    sources['/verify_cases.js']=(OUT/'verify_cases.js').read_bytes()
    manifest={path:hashlib.sha256(body).hexdigest() for path,body in sources.items()}
    (OUT/'source_manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    server=Server(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT/'src')))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{server.server_port}'
    started=time.time()
    result={'page_errors':[],'source_manifest':'source_manifest.json'}
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(channel='msedge',headless=True)
            page=browser.new_page()
            page.on('pageerror',lambda e:result['page_errors'].append(str(e)))
            def route_file(route):
                path=unquote(urlparse(route.request.url).path)
                if path=='/verify.html':return route.fulfill(content_type='text/html',body='<html><title>Offline cap verification</title></html>')
                if path not in sources:return route.fulfill(status=404,body='missing '+path)
                return route.fulfill(content_type=mimetypes.guess_type(path)[0] or 'application/octet-stream',body=sources[path])
            page.route('**/*',route_file)
            page.goto(base+'/verify.html')
            result['independent']=page.evaluate("async()=>await (await import('/verify_cases.js')).verify()")
            (OUT/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
            print(json.dumps({'independent':{k:v for k,v in result['independent'].items() if k!='checks'},'failures':[c for c in result['independent']['checks'] if not c['ok']]},ensure_ascii=True),flush=True)
            page.goto(base+'/dev/test.html',wait_until='domcontentloaded')
            page.wait_for_function("document.title.startsWith('PASS')||document.title.startsWith('FAIL')",timeout=180000)
            result['regression']={'title':page.title(),'passed':page.locator('#out li.ok').count(),'failed':page.locator('#out li.fail').count(),'failures':page.locator('#out li.fail').all_text_contents()}
            result['elapsed_sec']=round(time.time()-started,2)
            result['source_changed_during_run']=[p for p,b in sources.items() if p!='/verify_cases.js' and (ROOT/'src'/p.lstrip('/')).read_bytes()!=b]
            (OUT/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
            print(json.dumps({'regression':result['regression'],'elapsed_sec':result['elapsed_sec'],'page_errors':result['page_errors'],'source_changed_during_run':result['source_changed_during_run']},ensure_ascii=True),flush=True)
            browser.close()
    finally:
        server.shutdown();server.server_close()

if __name__=='__main__':main()
