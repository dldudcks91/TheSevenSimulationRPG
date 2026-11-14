"""Check the Library advancement room in isolated Edge profiles.

Run python serve.py 8873, then python scripts/verify_advance_room.py.
Fixtures change only the isolated browser's in-memory game. All advancement,
skill selection, navigation and book operations use the rendered controls.
"""
import argparse
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--port', type=int, default=8873)
parser.add_argument('--output-dir', default='tmp/advance_room_review')
args = parser.parse_args()
OUT = ROOT / args.output_dir
OUT.mkdir(parents=True, exist_ok=True)
os.environ['PW_TEST_SCREENSHOT_NO_FONTS_READY'] = '1'
errors, checks = [], []
HARNESS = '''
window.__advanceReview = {
 read: () => ({hero: structuredClone(heroById(state.heroUid)), gold: G.resources.gold, modal: state.modal,
   selection: state.advSel, advance: SYS.game.advanceState(G,state.heroUid,now()),
   books: structuredClone(G.books), blueprints: structuredClone(G.blueprints)}),
 ready: () => { const h=heroById(state.heroUid); h.level=D.balance.advance_unlock_level; G.resources.gold=D.balance.advance_gold*2; render(); },
 gold: n => { G.resources.gold=n; render(); },
 income: () => { G.resources.gold=D.balance.advance_gold*2; refreshGold(); },
 lock: () => { G.buildings.library=1; render(); },
 hero: n => { state.heroUid=G.heroes[n].uid; render(); },
 cls: cls => { const h=heroById(state.heroUid); h.cls=cls; state.advSel=null; state.advPreview={}; render(); },
};
'''


def check(name, ok, detail=None):
    checks.append({'name': name, 'ok': bool(ok), 'detail': detail})
    assert ok, (name, detail)


def read(page):
    return page.evaluate('window.__advanceReview.read()')


def unchanged(before, after):
    return all(before[key] == after[key] for key in ('hero', 'gold', 'books', 'blueprints'))


def reachable(page, selector):
    return page.locator(selector).evaluate('''el => {
        const r=el.getBoundingClientRect();
        const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
        return r.width>0 && r.height>0 && r.x>=0 && r.y>=0 &&
          r.right<=innerWidth+1 && r.bottom<=innerHeight+1 && (hit===el || el.contains(hit));
    }''')


with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='msedge', headless=True)
    matrix = [(1600,900,False,'ko','now'), (1280,720,False,'en','d2min'),
              (390,844,True,'ko','d2min'), (320,568,True,'en','now'), (844,390,True,'en','d2min')]
    for width,height,touch,lang,skin in matrix:
        key=f'{width}-{lang}-{skin}'
        ctx=browser.new_context(viewport={'width':width,'height':height},has_touch=touch,is_mobile=touch)
        for url in ['https://fonts.googleapis.com/**','https://fonts.gstatic.com/**','https://cdn.jsdelivr.net/**']:
            ctx.route(url,lambda route:route.abort())
        ctx.route('**/ui/app.js',lambda route:route.fulfill(content_type='text/javascript',body=(ROOT/'src/ui/app.js').read_text(encoding='utf-8')+HARNESS))
        page=ctx.new_page()
        page.set_default_timeout(12000)
        page.on('pageerror',lambda error:errors.append(str(error)))
        try:
            page.goto(f'http://127.0.0.1:{args.port}/?dev=book&lang={lang}&skin={skin}')
            page.locator('.lib-advance-open').wait_for(timeout=25000)
            check(key+':no-folder-tabs',page.locator('.c-lib-col > .fg-tabs').count()==0)
            check(key+':book-panels',page.locator('.lib-split > .lib-sec').count()==2)
            page.screenshot(path=str(OUT/f'{key}-books.png'))
            before=read(page)
            page.locator('.lib-advance-open').click()
            check(key+':low-level-disabled',page.locator('.tr-adv-go').is_disabled())
            check(key+':all-paths-visible',page.locator('.advance-path').count()==3 and all(reachable(page,f'.advance-path:nth-child({n})') for n in (1,2,3)))
            check(key+':footer-visible',reachable(page,'.tr-adv-go'))
            page.locator('.advance-path').nth(1).click()
            check(key+':preview-free',unchanged(before,read(page)))
            page.screenshot(path=str(OUT/f'{key}-room.png'))
            page.locator('#modal .modal-x').click()
            check(key+':close-preserves-game',unchanged(before,read(page)))
            page.locator('.lib-advance-open').click()
            check(key+':reopen-requires-choice',read(page)['selection'] is None)
            page.evaluate('__advanceReview.ready()')
            check(key+':no-implicit-confirm',page.locator('.tr-adv-go').is_disabled())
            # Every class and branch must render its real skills and strengthening cells.
            for cls in ('warrior','knight','mage','archer','priest'):
                page.evaluate('__advanceReview.cls',cls)
                expected=read(page)['advance']['branches']
                before=read(page)
                for i,branch in enumerate(expected):
                    page.locator('.advance-path').nth(i).click()
                    check(key+':'+branch['id']+':selected',read(page)['selection']['branch']==branch['id'])
                    for j,skill in enumerate(branch['skills']):
                        cell=page.locator(f'.advance-room [data-advskill="{skill}"]')
                        cell.scroll_into_view_if_needed()
                        cell.click()
                        check(key+':'+skill+':preview-cells',page.locator('.advance-room [data-advtail]').count()==3)
                        images=page.locator('.advance-room [data-advtail] img').evaluate_all('(els)=>els.map(e=>e.getAttribute("src"))')
                        check(key+':'+skill+':matching-art',all(skill+'_' in src for src in images) and len(images)==3)
                    check(key+':'+branch['id']+':no-game-mutation',unchanged(before,read(page)))
            # Keyboard selection, money gating and actual irreversible action.
            page.evaluate('__advanceReview.cls','warrior')
            page.locator('.advance-path').nth(1).focus()
            page.keyboard.press('Enter')
            chosen=read(page)['selection']['branch']
            page.evaluate('__advanceReview.gold(0)')
            check(key+':gold-gate',page.locator('.tr-adv-go').is_disabled())
            page.evaluate('__advanceReview.income()')
            check(key+':passive-gold-unlocks-without-render',not page.locator('.tr-adv-go').is_disabled())
            before=read(page)
            page.locator('.tr-adv-go').click()
            after=read(page)
            check(key+':advance-charges-once',after['gold']==before['gold']-before['advance']['gold']['need'])
            check(key+':correct-path',after['hero']['advance']==chosen)
            check(key+':does-not-auto-learn',not after['hero']['advanceSkill'])
            check(key+':completed-one-path',page.locator('.advance-path').count()==1 and page.locator('.tr-adv-go').count()==0)
            check(key+':mastery-action-visible',reachable(page,'.advance-mastery-open'))
            page.screenshot(path=str(OUT/f'{key}-complete.png'))
            page.locator('.advance-mastery-open').click()
            check(key+':mastery-open',read(page)['modal']=='skill')
            # Mobile mastery has its existing page controls; reveal the advancement panel.
            if touch:
                tabs=page.locator('.modal-box .mobile-page-tabs button')
                if tabs.count(): tabs.last.click()
                else:
                    page.locator('.modal-box .adv-board').evaluate("el=>{const pane=el.closest('.mobile-pane'); if(pane) document.querySelector('[aria-controls='+pane.id+']')?.click();}")
            skill=after['advance']['branches'][1]['skills'][0]
            page.locator(f'.c-skill [data-advskill="{skill}"]').click()
            check(key+':mastery-learns-skill',read(page)['hero']['advanceSkill']==skill)
            page.locator('#modal .modal-x').click()
            check(key+':mastery-returns-to-room',read(page)['modal']=='advance')
            page.locator('#modal .modal-x').click()
            check(key+':completed-entry',page.locator('.lib-mastery-open').count()==1)
            check(key+':no-double-charge',read(page)['gold']==after['gold'])
            page.locator('.lib-mastery-open').click()
            page.locator('#modal .modal-x').click()
            check(key+':direct-mastery-returns-to-books',read(page)['modal'] is None)
            # Switching heroes must discard applicability of the previous hero's choice.
            page.evaluate('__advanceReview.hero(1)')
            page.locator('.lib-advance-open').click()
            check(key+':hero-context',read(page)['selection'] is None and page.locator('.advance-path').count()==3)
            page.evaluate('__advanceReview.lock()')
            page.locator('.advance-path').first.click()
            check(key+':building-gate-still-previews',not read(page)['advance']['open'] and page.locator('.tr-adv-go').is_disabled() and page.locator('.advance-room .adv-board').count()==1)
            page.keyboard.press('Escape')
            check(key+':escape-closes',read(page)['modal'] is None)
            print(key+': PASS',flush=True)
        except Exception as exc:
            checks.append({'name':key+':scenario','ok':False,'detail':str(exc)})
            page.screenshot(path=str(OUT/f'{key}-failure.png'))
            print(key+': FAIL '+str(exc),flush=True)
        finally:
            ctx.close()
    browser.close()

(OUT/'results.json').write_text(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2),encoding='utf-8')
failed=[c for c in checks if not c['ok']]
print(f'{len(checks)-len(failed)}/{len(checks)} checks passed; {len(errors)} browser errors')
raise SystemExit(1 if failed or errors else 0)
