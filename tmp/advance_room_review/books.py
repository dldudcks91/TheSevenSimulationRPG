from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
HARNESS='''
window.__booksReview={
 prepare:()=>{G.resources.gold=100000; for(const m of D.labMaterials) G.materials[m.id]=1000;G.materials.dust=1000;render();},
 read:()=>({books:structuredClone(G.books),blueprints:structuredClone(G.blueprints),hero:structuredClone(heroById(state.heroUid)),
   book:SYS.game.bookState(G,state.heroUid),sel:state.bookCraftSel}),
};
'''
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='msedge',headless=True)
    for touch in (False,True):
        ctx=browser.new_context(viewport={'width':390 if touch else 1600,'height':844 if touch else 900},has_touch=touch,is_mobile=touch)
        for url in ['https://fonts.googleapis.com/**','https://fonts.gstatic.com/**','https://cdn.jsdelivr.net/**']:ctx.route(url,lambda r:r.abort())
        ctx.route('**/ui/app.js',lambda r:r.fulfill(content_type='text/javascript',body=(ROOT/'src/ui/app.js').read_text(encoding='utf-8')+HARNESS))
        page=ctx.new_page()
        page.goto('http://127.0.0.1:8873/?dev=book')
        page.locator('.lib-advance-open').wait_for()
        page.evaluate('__booksReview.prepare()')
        before=page.evaluate('__booksReview.read()')
        if touch:page.locator('#mobile-tab-library-books-1').click()
        page.locator('[data-keep="library-craft"] .bk-buy button').click()
        after=page.evaluate('__booksReview.read()')
        skill=before['sel']
        assert after['books'].get(skill,0)==before['books'].get(skill,0)+1
        assert after['blueprints'].get(skill,0)==before['blueprints'].get(skill,0)-1
        if touch:page.locator('#mobile-tab-library-books-0').click()
        # Upgrade an already known skill; the original book action remains available.
        before=page.evaluate('__booksReview.read()')
        n,b=next((i,b) for i,b in enumerate(before['book']['books']) if b['plan']['act']=='upgrade' and not b['plan']['err'])
        page.locator('[data-keep="library-learn"] .bk-grid .inv-cell').nth(n).click()
        page.locator('[data-keep="library-learn"] .bk-buy button').click()
        after=page.evaluate('__booksReview.read()')
        assert after['books'].get(b['id'],0)==before['books'][b['id']]-b['plan']['need']
        print(('mobile' if touch else 'desktop')+': craft and upgrade PASS',flush=True)
        ctx.close()
    browser.close()
