"""Read-only product verification in isolated Edge; pin source bytes before execution."""
import functools
import hashlib
import http.server
import json
import mimetypes
import sys
import threading
from pathlib import Path
from urllib.parse import unquote, urlparse

from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]
QA = ROOT / 'output/2026-10-30_fun_qa'


def sources(baseline):
    if baseline == 'archived':
        folder = QA / 'snapshot/src'
    else:
        if baseline not in {'current', 'latest'}:
            raise ValueError('baseline must be archived, current or latest')
        folder = OUT / f'{baseline}_snapshot/src'
        if not folder.exists():
            for p in (ROOT / 'src').rglob('*'):
                if p.is_file() and (p.suffix in {'.js', '.csv', '.css', '.html', '.json'}):
                    dest = folder / p.relative_to(ROOT / 'src')
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    dest.write_bytes(p.read_bytes())
    data = {'/' + p.relative_to(folder).as_posix(): p.read_bytes()
            for p in folder.rglob('*') if p.is_file()}
    manifest = {k: hashlib.sha256(v).hexdigest() for k, v in data.items()}
    (OUT / f'{baseline}_source_manifest.json').write_text(
        json.dumps(manifest, indent=2), encoding='utf-8')
    return data


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    baseline = sys.argv[1] if len(sys.argv) > 1 else 'archived'
    mode = sys.argv[2] if len(sys.argv) > 2 else 'inspect'
    source = sources(baseline)
    source['/probe.js'] = (OUT / 'probe.js').read_bytes()
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0),
        functools.partial(Handler, directory=str(ROOT / 'src')))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    raw = json.loads((QA / 'simulation/critical_seed10/checkpoints/state_basic_seed10_5520.json').read_text(encoding='utf-8'))
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(channel='msedge', headless=True)
            context = browser.new_context()
            page = context.new_page()
            errors, external = [], []
            page.on('pageerror', lambda e: errors.append(str(e)))

            def route_request(route):
                parsed = urlparse(route.request.url)
                path = unquote(parsed.path)
                if parsed.hostname != '127.0.0.1':
                    external.append(route.request.url)
                    return route.abort()
                if path == '/probe.html':
                    return route.fulfill(content_type='text/html', body='<title>First boss recovery</title>')
                if path in source:
                    return route.fulfill(content_type=mimetypes.guess_type(path)[0] or 'application/octet-stream', body=source[path])
                return route.fulfill(status=404, body='not in frozen input: ' + path)

            page.route('**/*', route_request)
            page.goto(f'http://127.0.0.1:{server.server_port}/probe.html')
            result = page.evaluate('async x => (await import("/probe.js")).probe(x)', {'mode': mode, 'raw': raw})
            result.update(baseline=baseline, page_errors=errors, external_requests=external)
            (OUT / f'{baseline}_{mode}.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
            if mode == 'inspect':
                print(json.dumps(result, ensure_ascii=True)[:22000], flush=True)
            else:
                print(json.dumps(result.get('summary', result), ensure_ascii=True)[:12000], flush=True)
            browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
