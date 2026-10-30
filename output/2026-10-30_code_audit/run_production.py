"""Actual deployment copy, production hostname, normal new-game/save/load clicks.

External fonts and network requests are blocked; cloud telemetry is replaced by a
successful in-memory stub so this audit never writes to an external service.
"""
import json
import mimetypes
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright

OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[1]
BUILD=ROOT/'_site/audit_20261030_1833'
BASE='http://audit.invalid'


def main():
    results=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel='msedge',headless=True)
        for language in ['ko','en']:
            context=browser.new_context(viewport={'width':1600,'height':1000})
            page=context.new_page()
            errors=[]
            missing=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            def route_file(route):
                u=urlparse(route.request.url)
                if u.hostname!='audit.invalid':return route.abort()
                path=unquote(u.path)
                if path=='/src/ui/cloud.js':return route.fulfill(content_type='text/javascript',body='export async function pushTrack(summary, save) {window.__auditTrack=(window.__auditTrack??0)+1; return {ok:true};}')
                target=BUILD/path.lstrip('/')
                if not target.is_file():
                    missing.append(path)
                    return route.fulfill(status=404,body='missing')
                return route.fulfill(content_type=mimetypes.guess_type(path)[0] or 'application/octet-stream',body=target.read_bytes())
            context.route('**/*',route_file)
            page.goto(BASE+'/index.html?lang='+language,wait_until='domcontentloaded')
            page.wait_for_selector('.mn-btn')
            row={'language':language,'initial_load_disabled':page.locator('.mn-btn').nth(1).is_disabled()}
            page.locator('.mn-btn').nth(0).click()
            page.locator('.ng-actions .btn.lg').click()
            page.wait_for_function('localStorage.getItem("thesevensim.save")!==null')
            row['new_save']=page.evaluate('(()=>{const s=JSON.parse(localStorage.getItem("thesevensim.save"));return {version:s.version,heroes:s.heroes.length,gold:s.resources.gold,seed:s.seed};})()')
            page.reload(wait_until='domcontentloaded')
            page.wait_for_selector('.mn-btn')
            row['load_enabled_after_reload']=page.locator('.mn-btn').nth(1).is_enabled()
            page.locator('.mn-btn').nth(1).click()
            page.wait_for_selector('.nav button[data-tab]')
            row['dev_admin_visible']=page.locator('.admin-toggle').count()
            row['lab_tab_visible']=page.locator('.nav button[data-tab="lab"]').count()
            row['tabs']=[]
            for tab in page.locator('.nav button[data-tab]').evaluate_all('ns=>ns.filter(n=>!n.disabled).map(n=>n.dataset.tab)'):
                page.locator(f'.nav button[data-tab="{tab}"]').click()
                page.wait_for_timeout(50)
                row['tabs'].append({'id':tab,'main_nonempty':bool(page.locator('.main').inner_text().strip())})
            row.update(page_errors=errors,missing=missing,telemetry_stub_calls=page.evaluate('window.__auditTrack??0'))
            results.append(row)
            print(json.dumps(row,ensure_ascii=True),flush=True)
            context.close()
        browser.close()
    (OUT/'production.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')


if __name__=='__main__':main()
