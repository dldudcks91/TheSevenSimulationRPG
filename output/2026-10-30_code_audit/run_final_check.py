"""Freeze the latest files and recheck the unmodified regression suite before reporting."""
import hashlib
import json
import mimetypes
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright

OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[1]
BASE='http://127.0.0.1:8921'


def main():
    sources={'/'+p.relative_to(ROOT/'src').as_posix():p.read_bytes() for p in (ROOT/'src').rglob('*') if p.is_file() and p.suffix in {'.js','.css','.html','.json','.csv'}}
    manifest={p:hashlib.sha256(b).hexdigest() for p,b in sources.items()}
    (OUT/'latest_source_manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    initial=json.loads((OUT/'source_manifest.json').read_text(encoding='utf-8'))
    result={'checked_at_utc':datetime.now(timezone.utc).isoformat(),'source_files':len(sources),'changed_since_initial_snapshot':[p for p,h in manifest.items() if initial.get(p)!=h]}
    for p,b in sources.items():
        if initial.get(p)!=manifest[p]:
            target=OUT/'latest_changed_files'/p.lstrip('/')
            target.parent.mkdir(parents=True,exist_ok=True)
            target.write_bytes(b)
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel='msedge',headless=True)
        page=browser.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        def route_file(route):
            u=urlparse(route.request.url)
            if u.hostname!='127.0.0.1':return route.abort()
            path=unquote(u.path)
            if path in sources:return route.fulfill(content_type=mimetypes.guess_type(path)[0] or 'text/plain',body=sources[path])
            return route.continue_()
        page.route('**/*',route_file)
        page.goto(BASE+'/dev/test.html',wait_until='domcontentloaded')
        page.wait_for_function("/^(PASS|FAIL)/.test(document.title)",timeout=240000)
        result.update(title=page.title(),passed=page.locator('#out li.ok').count(),failed=page.locator('#out li.fail').count(),failures=page.locator('#out li.fail').all_text_contents(),page_errors=errors)
        result['changed_during_final_check']=[p for p,b in sources.items() if (ROOT/'src'/p.lstrip('/')).read_bytes()!=b]
        (OUT/'latest_regression.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps(result,ensure_ascii=True),flush=True)
        browser.close()


if __name__=='__main__':main()
