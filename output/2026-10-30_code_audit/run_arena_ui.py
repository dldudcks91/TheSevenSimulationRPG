"""Exercise the real friendly-team paste buttons with malformed but valid JSON codes."""
import json
import mimetypes
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
BASE = 'http://127.0.0.1:8921'


def main():
    sources={'/'+p.relative_to(OUT/'snapshot').as_posix():p.read_bytes() for p in (OUT/'snapshot').rglob('*') if p.is_file()}
    sources['/general_cases.js']=(OUT/'general_cases.js').read_bytes()
    results=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel='msedge',headless=True)
        for case in ['valid', 'affixes_object', 'skill_order_object', 'name_object']:
            context=browser.new_context(viewport={'width':1600,'height':1000})
            def route_file(route):
                u=urlparse(route.request.url)
                if u.hostname!='127.0.0.1':return route.abort()
                path=unquote(u.path)
                if path in sources:return route.fulfill(content_type=mimetypes.guess_type(path)[0] or 'text/plain',body=sources[path])
                return route.continue_()
            context.route('**/*',route_file)
            page=context.new_page()
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(BASE+'/index.html?dev=arena&modal=1&lang=ko',wait_until='domcontentloaded')
            page.wait_for_selector('.arena-code-box textarea')
            payload=page.evaluate("async()=>JSON.parse(JSON.stringify((await import('/general_cases.js')).valid))")
            if case=='affixes_object':payload['heroes'][0]['gear'][0]['item']['affixes']={}
            elif case=='skill_order_object':payload['heroes'][0]['hero']['skillOrder']={}
            elif case=='name_object':payload['heroes'][0]['hero']['name']={'ko':{'toString':1},'en':{'toString':1}}
            encoded=page.evaluate("p=>btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(p))))",payload)
            page.locator('.arena-code-box').nth(1).locator('textarea').fill(encoded)
            page.locator('.arena-code-box').nth(1).locator('button').click()
            page.wait_for_timeout(300)
            results.append({'case':case,'page_errors':errors,'modal_visible':page.locator('#modal').is_visible(),'main_text':page.locator('.main').inner_text()[:300]})
            if errors:page.screenshot(path=str(OUT/('arena_'+case+'.png')))
            (OUT/('payload_'+case+'.json')).write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8')
            print(json.dumps(results[-1],ensure_ascii=True),flush=True)
            context.close()
        browser.close()
    (OUT/'arena_ui.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')


if __name__=='__main__':main()
