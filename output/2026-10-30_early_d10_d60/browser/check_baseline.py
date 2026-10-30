import json,time
from fun_browser import Session,write

def main():
    s=Session();c,page=s.context();started=time.monotonic()
    try:
        page.goto(s.base+'/dev/test.html',wait_until='domcontentloaded')
        page.wait_for_function("document.title.startsWith('PASS')||document.title.startsWith('FAIL')",timeout=180000)
        result={'title':page.title(),'passed':page.locator('#out li.ok').count(),'failed':page.locator('#out li.fail').count(),'failures':page.locator('#out li.fail').all_text_contents(),'elapsed_sec':round(time.monotonic()-started,2),'page_errors':s.errors,'http_errors':s.http_errors,'source':'../snapshot/src (frozen)'}
        write('baseline_assertions.json',result);print(json.dumps(result,ensure_ascii=True),flush=True)
    finally:c.close();s.close()

if __name__=='__main__':main()
