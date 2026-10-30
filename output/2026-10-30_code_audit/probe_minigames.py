import json
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[1]
app=(ROOT/'src/ui/app.js').read_text(encoding='utf-8')
harness='\nwindow.__auditMG=()=>({run:mgRun,modal:state.modal,frozen,toast:document.querySelector("#toast").textContent});'
with sync_playwright() as pw:
    b=pw.chromium.launch(channel='msedge',headless=True)
    c=b.new_context(viewport={'width':1440,'height':1000})
    c.route('https://**/*',lambda r:r.abort())
    c.route('**/ui/app.js',lambda r:r.fulfill(content_type='text/javascript',body=app+harness))
    p=c.new_page();errors=[]
    p.on('pageerror',lambda e:errors.append(str(e)))
    records=[]
    for post in ['mine','gather','log']:
        p.goto('http://127.0.0.1:8921/index.html?dev=mg&mg='+post,wait_until='domcontentloaded')
        p.wait_for_selector('.mg-go')
        p.locator('.mg-go').click()
        info=p.evaluate('(()=>{const r=__auditMG();return {modal:r.modal,frozen:r.frozen,toast:r.toast,t:r.run?.t,phase:r.run?.phase,readyCount:document.querySelectorAll(".mg-ready").length,field:document.querySelector(".mg-field")?.innerText.slice(0,250)}})()')
        records.append({'post':post,'info':info,'errors':errors[:]})
        print(json.dumps(records[-1],ensure_ascii=True),flush=True)
    (OUT/'minigame_probe.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
    b.close()
