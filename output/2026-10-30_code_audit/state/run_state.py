"""Read-only game-state audit with frozen JS/CSV and an isolated browser."""
import functools, hashlib, http.server, json, mimetypes, sys, threading, time
from pathlib import Path
from urllib.parse import unquote, urlparse
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

def main():
    sources = {'/' + p.relative_to(ROOT/'src').as_posix(): p.read_bytes()
               for p in (ROOT/'src').rglob('*')
               if p.is_file() and p.suffix in ['.js', '.csv', '.json', '.html']}
    sources['/state_cases.js'] = (OUT/'state_cases.js').read_bytes()
    (OUT/'source_manifest.json').write_text(json.dumps({p: hashlib.sha256(b).hexdigest() for p,b in sources.items()},indent=2),encoding='utf-8')
    server = http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT/'src')))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    result = {'page_errors':[]}
    started = time.time()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(channel='msedge',headless=True)
            page = browser.new_page()
            page.on('pageerror',lambda e:result['page_errors'].append(str(e)))
            def routed(route):
                path = unquote(urlparse(route.request.url).path)
                if path == '/verify.html': return route.fulfill(content_type='text/html',body='<html><title>State audit</title></html>')
                if path not in sources: return route.fulfill(status=404,body='missing '+path)
                return route.fulfill(content_type=mimetypes.guess_type(path)[0] or 'application/octet-stream',body=sources[path])
            page.route('**/*',routed)
            page.goto(f'http://127.0.0.1:{server.server_port}/verify.html')
            result['cases'] = page.evaluate("async()=>await (await import('/state_cases.js')).verify()")
            result['elapsed_sec'] = round(time.time()-started,2)
            result['changed_sources'] = [p for p,b in sources.items() if p != '/state_cases.js' and (ROOT/'src'/p.lstrip('/')).read_bytes()!=b]
            (OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
            print(json.dumps(result,ensure_ascii=True),flush=True)
            browser.close()
    finally:
        server.shutdown()
        server.server_close()

if __name__ == '__main__': main()
