"""Inspect and compare legal choices on the shared frozen QA baseline."""
import hashlib
import json
import mimetypes
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
SNAP = OUT/'snapshot'/'src'
OUTCOME = OUT/'interventions'
OUTCOME.mkdir(exist_ok=True)

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
source = {'/'+p.relative_to(SNAP).as_posix(): p.read_bytes() for p in SNAP.rglob('*') if p.is_file()}
source['/probe.js'] = (OUT/'interventions.js').read_bytes()
if (OUT/'analysis'/'mastery_priorities.json').exists():
    source['/mastery_priorities.json'] = (OUT/'analysis'/'mastery_priorities.json').read_bytes()
target = sys.argv[1] if len(sys.argv)>1 else 'initial'
arg = None if target == 'initial' else json.loads(Path(target).read_text(encoding='utf-8'))
mode = sys.argv[2] if len(sys.argv)>2 else 'inspect'
if mode != 'inspect':
    arg = {'mode': mode, 'state': arg}
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='msedge', headless=True)
        page = browser.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: print('console', m.type, m.text, flush=True) if m.type == 'error' else None)
        page.on('requestfailed', lambda r: print('failed', r.url, r.failure, flush=True))
        def local(route):
            path = unquote(urlparse(route.request.url).path)
            if path == '/probe.html':
                return route.fulfill(content_type='text/html', body='<html><title>Fun QA interventions</title></html>')
            if path not in source:
                asset = OUT.parents[1]/'src'/path.lstrip('/')
                if path.startswith('/assets/') and asset.is_file():
                    return route.fulfill(content_type=mimetypes.guess_type(path)[0] or 'application/octet-stream', body=asset.read_bytes())
                return route.fulfill(status=404, body='missing '+path)
            return route.fulfill(content_type=mimetypes.guess_type(path)[0] or 'application/octet-stream', body=source[path])
        page.route('**/*', local)
        page.goto(f'http://127.0.0.1:{server.server_port}/probe.html')
        result = page.evaluate('async state => (await import("/probe.js")).probe(state)', arg)
        result['page_errors'] = errors
        result['baseline_manifest'] = '../source_manifest.json'
        stem = 'initial' if arg is None else Path(target).stem
        (OUTCOME/(stem+('' if mode=='inspect' else '_'+mode)+'.json')).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps({k:v for k,v in result.items() if k not in ['initial_cases','full_state','overview']}, ensure_ascii=True)[:6000])
        browser.close()
finally:
    server.shutdown(); server.server_close()
