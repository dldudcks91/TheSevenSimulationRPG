"""Boundary, generative and deployment transform checks against the frozen source snapshot."""
import importlib.util
import json
import mimetypes
import time
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]
BASE = 'http://127.0.0.1:8921'


def main():
    sources = {'/' + p.relative_to(OUT/'snapshot').as_posix(): p.read_bytes() for p in (OUT/'snapshot').rglob('*') if p.is_file()}
    sources['/general_cases.js'] = (OUT/'general_cases.js').read_bytes()
    spec = importlib.util.spec_from_file_location('audit_deploy', ROOT/'scripts/build_deploy.py')
    deploy = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(deploy)
    transformed = {}
    transform_errors = []
    for path, data in sources.items():
        ext=Path(path).suffix
        try:
            fn={'.js':deploy.strip_js,'.css':deploy.strip_css,'.html':deploy.strip_html}.get(ext)
            transformed[path]=fn(data.decode('utf-8'), path).encode('utf-8') if fn else data
        except Exception as e:
            transform_errors.append({'path':path,'error':str(e)})
    results={'transform_errors':transform_errors, 'transformed_files':len(transformed)}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='msedge',headless=True)
        context=browser.new_context()
        page=context.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        active=sources
        def route_file(route):
            url=urlparse(route.request.url)
            if url.hostname!='127.0.0.1':return route.abort()
            path=unquote(url.path)
            if path=='/verify.html':return route.fulfill(content_type='text/html',body='<title>General audit</title>')
            if path in active:return route.fulfill(content_type=mimetypes.guess_type(path)[0] or 'text/plain',body=active[path])
            return route.continue_()
        context.route('**/*',route_file)
        page.goto(BASE+'/verify.html')
        results['generative']=page.evaluate("async()=>await(await import('/general_cases.js')).verify()")
        (OUT/'general.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps({'transform_errors':transform_errors,'generated_failures':results['generative']['generated'], 'item_range':{k:v for k,v in results['generative']['item_range'].items() if k!='failures'},'item_range_failures':len(results['generative']['item_range']['failures']),'malformed':[{k:v for k,v in r.items() if k!='import_team'} for r in results['generative']['malformed']]},ensure_ascii=True),flush=True)
        active=transformed
        page.goto(BASE+'/dev/test.html',wait_until='domcontentloaded')
        page.wait_for_function("/^(PASS|FAIL)/.test(document.title)",timeout=240000)
        results['transformed_suite']={'title':page.title(),'passed':page.locator('#out li.ok').count(),'failed':page.locator('#out li.fail').count(),'failures':page.locator('#out li.fail').all_text_contents(),'page_errors':errors}
        print(json.dumps(results['transformed_suite'],ensure_ascii=True),flush=True)
        (OUT/'general.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
        browser.close()


if __name__=='__main__':main()
