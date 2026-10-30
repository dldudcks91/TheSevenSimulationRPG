"""Run the full unmodified current regression suite with frozen source responses."""
import functools,hashlib,http.server,json,mimetypes,threading,time
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
    (OUT/'regression_source_manifest.json').write_text(json.dumps({p:hashlib.sha256(b).hexdigest() for p,b in sources.items()},indent=2),encoding='utf-8')
    server=Server(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT/'src')))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    result={'page_errors':[],'source_manifest':'regression_source_manifest.json'}
    started=time.time()
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(channel='msedge',headless=True)
            page=browser.new_page()
            page.on('pageerror',lambda e:result['page_errors'].append(str(e)))
            def serve(route):
                path=unquote(urlparse(route.request.url).path)
                if path not in sources:return route.fulfill(status=404,body='missing '+path)
                return route.fulfill(content_type=mimetypes.guess_type(path)[0] or 'application/octet-stream',body=sources[path])
            page.route('**/*',serve)
            page.goto(f'http://127.0.0.1:{server.server_port}/dev/test.html',wait_until='domcontentloaded')
            page.wait_for_function("document.title.startsWith('PASS')||document.title.startsWith('FAIL')",timeout=180000)
            result.update({'title':page.title(),'passed':page.locator('#out li.ok').count(),'failed':page.locator('#out li.fail').count(),'failures':page.locator('#out li.fail').all_text_contents(),'retry_preparation_tests':page.locator('#out li').all_text_contents()})
            result['retry_preparation_tests']=[t for t in result['retry_preparation_tests'] if any(s in t for s in ['재도전','미클리어','원정 준비','연속 패배'])]
            result['source_changed_during_run']=[p for p,b in sources.items() if (ROOT/'src'/p.lstrip('/')).read_bytes()!=b]
            result['elapsed_sec']=round(time.time()-started,2)
            (OUT/'regression_results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
            print(json.dumps(result,ensure_ascii=True),flush=True)
            browser.close()
    finally:server.shutdown();server.server_close()

if __name__=='__main__':main()
