import json
from playwright.sync_api import sync_playwright
from smoke_ui import OUT, setup, SOURCE_SET_HASH

with sync_playwright() as p:
    b=p.chromium.launch(channel='msedge',headless=True)
    ctx=b.new_context(viewport={'width':1440,'height':1000});setup(ctx)
    page=ctx.new_page();warnings=[];errors=[]
    page.on('console',lambda msg:warnings.append(msg.text) if msg.type=='warning' else None)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:8921/index.html');page.wait_for_selector('.mn-wrap')
    quota=page.evaluate('''() => {
      let lo=0,hi=12*1024*1024,fail='';
      while(lo<hi) {
        const mid=Math.ceil((lo+hi)/2);
        try {localStorage.setItem('audit.quota','x'.repeat(mid));lo=mid;}
        catch(e){hi=mid-1;fail=e.name;}
      }
      return {storedChars:lo,error:fail,keys:Object.keys(localStorage)};
    }''')
    page.locator('.mn-btn').first.click()
    page.locator('.ng-actions .btn.lg').click()
    page.wait_for_selector('.pro-wrap')
    after=page.evaluate('({screen:__uiAudit.state().screen,gameExists:!!__uiAudit.game(),save:localStorage.getItem("thesevensim.save"),toast:document.querySelector("#toast").textContent})')
    page.screenshot(path=str(OUT/'save_quota_no_warning.png'))
    page.reload();page.wait_for_selector('.mn-wrap')
    reload=page.evaluate('({screen:__uiAudit.state().screen,game:__uiAudit.game(),save:localStorage.getItem("thesevensim.save"),loadDisabled:document.querySelectorAll(".mn-btn")[1].disabled})')
    data={'source_set_sha256':SOURCE_SET_HASH,'quota':quota,'after_start':after,'after_reload':reload,'warnings':warnings,'pageerrors':errors}
    (OUT/'repro_save_quota.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(data,ensure_ascii=True),flush=True)
    b.close()
