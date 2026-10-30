"""Record the same frozen product with the corrected current test expectation only."""
import hashlib
import json
import time
from fun_browser import Session, SOURCE, ROOT, write


def main():
    data=(ROOT/'src/dev/test.js').read_bytes()
    old=SOURCE['/dev/test.js']
    source_changes=[]
    import difflib
    source_changes=list(difflib.unified_diff(old.decode('utf-8').splitlines(),data.decode('utf-8').splitlines(),fromfile='frozen/dev/test.js',tofile='current/dev/test.js'))
    SOURCE['/dev/test.js']=data
    s=Session();c,page=s.context();start=time.monotonic()
    try:
        page.goto(s.base+'/dev/test.html',wait_until='domcontentloaded')
        page.wait_for_function("document.title.startsWith('PASS')||document.title.startsWith('FAIL')",timeout=180000)
        result={'method':'All frozen inputs retained; only /dev/test.js overlaid from current workspace to correct17/16 tooltip expectation. Frozen baseline result is retained separately.',
                'overlay_sha256':hashlib.sha256(data).hexdigest(),'frozen_test_sha256':hashlib.sha256(old).hexdigest(),'diff':source_changes,
                'title':page.title(),'passed':page.locator('#out li.ok').count(),'failed':page.locator('#out li.fail').count(),
                'failures':page.locator('#out li.fail').all_text_contents(),'page_errors':s.errors,'http_errors':s.http_errors,
                'elapsed_sec':round(time.monotonic()-start,2)}
        write('expectation_overlay_assertions.json',result)
        print(json.dumps({k:v for k,v in result.items()if k not in ['diff','method']},ensure_ascii=True),flush=True)
    finally:c.close();s.close()

if __name__=='__main__':main()
