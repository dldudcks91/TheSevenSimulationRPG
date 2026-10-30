import json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    ctx=browser.new_context(viewport={'width':1600,'height':900})
    ctx.route('**/ui/battle.js', lambda route:route.fulfill(status=200,content_type='text/javascript',body=(ROOT/'src/ui/battle.js').read_text(encoding='utf-8')+'\nwindow.__headingTeams=renderTeams;'))
    page=ctx.new_page()
    errors=[]
    page.on('pageerror',lambda err:errors.append(str(err)))
    page.goto('http://127.0.0.1:8777/index.html?dev=battle&cn=max&lang=ko')
    page.wait_for_timeout(3000)
    print(json.dumps({'errors':errors,'headings':page.locator('.main h2').all_text_contents(),'main':page.locator('.main').inner_text()[:300]},ensure_ascii=False),flush=True)
    print(json.dumps(page.evaluate('''() => {
      const pane=document.createElement('div'); document.querySelector('.main').append(pane);
      window.__headingTeams({teamPane:pane,dmg:new Map(),teamView:'rows'});
      return {battle_help:pane.querySelectorAll('.q-btn').length,bodies:[...pane.querySelectorAll('.q-btn')].map(q=>q._tipBuild().textContent)};
    }'''),ensure_ascii=False),flush=True)
    browser.close()
