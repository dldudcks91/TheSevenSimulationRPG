"""Current-data battle sweep over all main chapters, difficulty modes and varied legal kits."""
import json
import mimetypes
import sys
import time
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright

OUT=Path(__file__).resolve().parent
BASE='http://127.0.0.1:8921'


def main():
    sources={'/'+p.relative_to(OUT/'snapshot').as_posix():p.read_bytes() for p in (OUT/'snapshot').rglob('*') if p.is_file()}
    for name in ['general_cases.js','sweep_cases.js']:sources['/'+name]=(OUT/name).read_bytes()
    started=time.time()
    results={'batches':[],'errors':[]}
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel='msedge',headless=True)
        page=browser.new_page()
        def route_file(route):
            u=urlparse(route.request.url)
            if u.hostname!='127.0.0.1':return route.abort()
            path=unquote(u.path)
            if path=='/verify.html':return route.fulfill(content_type='text/html',body='<title>Battle sweep</title>')
            if path in sources:return route.fulfill(content_type=mimetypes.guess_type(path)[0] or 'text/plain',body=sources[path])
            return route.continue_()
        page.route('**/*',route_file)
        page.on('pageerror',lambda e:results['errors'].append(str(e)))
        page.goto(BASE+'/verify.html')
        first=int(sys.argv[1]) if len(sys.argv)>1 else 1
        count=int(sys.argv[2]) if len(sys.argv)>2 else 30
        result_file=OUT/('sweep.json' if first==1 else f'sweep_{first}_{first+count-1}.json')
        for seed in range(first,first+count):
            batch=page.evaluate('async seed=>(await import("/sweep_cases.js")).batch(seed,1)',seed)
            results['batches'].append(batch)
            results['elapsed_sec']=round(time.time()-started,2)
            result_file.write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
            print(json.dumps({'seed':seed,'runs':batch['runs'],'events':batch['events'],'failures':batch['failures'][:8],'failure_count':len(batch['failures']),'elapsed_sec':results['elapsed_sec']},ensure_ascii=True),flush=True)
        browser.close()


if __name__=='__main__':main()
