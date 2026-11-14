import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
os.environ['PW_TEST_SCREENSHOT_NO_FONTS_READY'] = '1'
errors = []
HARNESS = '''
window.__advanceReview = {
 read: () => ({hero: structuredClone(heroById(state.heroUid)), gold: G.resources.gold, modal: state.modal,
   selection: state.advSel, preview: state.advPreview, advance: SYS.game.advanceState(G,state.heroUid,now()),
   books: structuredClone(G.books), blueprints: structuredClone(G.blueprints)}),
 ready: () => { const h=heroById(state.heroUid); h.level=D.balance.advance_unlock_level; G.resources.gold=D.balance.advance_gold*2; render(); },
 gold: n => { G.resources.gold=n; render(); },
 hero: n => { state.heroUid=G.heroes[n].uid; render(); },
};
'''

with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='msedge', headless=True)
    for width,height,touch,lang,skin in [(1600,900,False,'ko','now'),(390,844,True,'ko','d2min'),(320,568,True,'en','now'),(844,390,True,'en','d2min')]:
        ctx=browser.new_context(viewport={'width':width,'height':height}, has_touch=touch,is_mobile=touch)
        ctx.add_init_script("localStorage.setItem('devAdmin','1')")
        for url in ['https://fonts.googleapis.com/**','https://fonts.gstatic.com/**','https://cdn.jsdelivr.net/**']:
            ctx.route(url,lambda route:route.abort())
        ctx.route('**/ui/app.js',lambda route:route.fulfill(content_type='text/javascript',body=(ROOT/'src/ui/app.js').read_text(encoding='utf-8')+HARNESS))
        page=ctx.new_page()
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(f'http://127.0.0.1:8873/?dev=book&lang={lang}&skin={skin}')
        page.locator('.lib-advance-open').wait_for(timeout=25000)
        page.screenshot(path=str(OUT/f'{width}-{lang}-books.png'))
        page.locator('.lib-advance-open').click()
        page.locator('.advance-path').first.wait_for()
        page.screenshot(path=str(OUT/f'{width}-{lang}-room.png'))
        print(json.dumps({'size':[width,height],'paths':page.locator('.advance-path').count(),'disabled':page.locator('.tr-adv-go').is_disabled(),'errors':errors},ensure_ascii=True),flush=True)
        ctx.close()
    browser.close()
assert not errors,errors
