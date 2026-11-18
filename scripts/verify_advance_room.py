"""Check the Library (advancement room + skill book crafting) in isolated Edge profiles.

Run python serve.py 8873, then python scripts/verify_advance_room.py.
Fixtures change only the isolated browser's in-memory game. All advancement,
skill selection, crafting, salvaging and book operations use the rendered controls.
Mobile layouts are locked (mobile.js:MOBILE_LOCKED · ADR-1195), so only PC sizes run.
Restored 2026-11-18 with the room (SCREEN_DESIGN §17 · ADR-1262 · R540).
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
   books: structuredClone(G.books), shards: G.skillShards ?? 0, craft: SYS.game.bookState(G).craft.map(c => c.id),
   craftSel: state.bookCraftSel, stashSel: state.bookStashSel}),
 ready: () => { const h=heroById(state.heroUid); h.level=D.balance.advance_unlock_level; G.resources.gold=D.balance.advance_gold*2; render(); },
 gold: n => { G.resources.gold=n; render(); },
 income: () => { G.resources.gold=D.balance.advance_gold*2; refreshGold(); },
 lock: () => { G.buildings.library=1; render(); },
 hero: n => { state.heroUid=G.heroes[n].uid; render(); },
 cls: cls => { const h=heroById(state.heroUid); h.cls=cls; state.advSel=null; state.advPreview={}; render(); },
 craftReady: () => { G.skillShards=D.balance.skill_craft_shards; G.resources.gold=Math.max(G.resources.gold, D.balance.skill_craft_gold); render(); },
 stash: () => { state.tab='character'; state.stashTab='book'; state.bookStashSel=null; render(); },
 library: () => { state.tab='library'; render(); },
};
'''


def check(name, ok, detail=None):
    checks.append({'name': name, 'ok': bool(ok), 'detail': detail})
    assert ok, (name, detail)


def read(page):
    return page.evaluate('window.__advanceReview.read()')


def seen(page, selector):
    page.locator(selector).scroll_into_view_if_needed()
    return reachable(page, selector)


def unchanged(before, after):
    return all(before[key] == after[key] for key in ('hero', 'gold', 'books', 'shards'))


def reachable(page, selector):
    return page.locator(selector).evaluate('''el => {
        const r=el.getBoundingClientRect();
        const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
        return r.width>0 && r.height>0 && r.x>=0 && r.y>=0 &&
          r.right<=innerWidth+1 && r.bottom<=innerHeight+1 && (hit===el || el.contains(hit));
    }''')


with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='msedge', headless=True)
    matrix = [(1600,800,'ko','now'), (1600,800,'en','now'), (1280,720,'en','d2min')]
    for width,height,lang,skin in matrix:
        key=f'{width}-{lang}-{skin}'
        ctx=browser.new_context(viewport={'width':width,'height':height})
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
            check(key+':room-cell',page.locator('.lib-top > .lib-room .lib-room-art').count()==3)
            page.screenshot(path=str(OUT/f'{key}-books.png'))
            # Skill book crafting — the fixture holds one craft's worth of shards and enough gold.
            before=read(page)
            check(key+':craft-list-is-seen-books',len(before['craft'])>0 and page.locator('.lib-craft .bk-grid .inv-cell').count()==len(before['craft']))
            check(key+':craft-cells-no-count-badge',page.locator('.lib-craft .bk-grid .inv-lv').count()==0)
            sel=before['craftSel']
            go=page.locator('.lib-craft .bk-buy .btn.primary')
            check(key+':craft-ready',sel is not None and not go.is_disabled())
            go.click()
            after=read(page)
            check(key+':craft-adds-one-book',(after['books'].get(sel,0))==(before['books'].get(sel,0))+1)
            check(key+':craft-spends-shards-and-gold',after['shards']==before['shards']-10 and after['gold']<before['gold'])
            check(key+':craft-keeps-selection',after['craftSel']==sel)
            check(key+':craft-short-disabled',go.is_disabled() and page.locator('.lib-craft .bk-buy .bk-need.no').count()>=1)
            page.screenshot(path=str(OUT/f'{key}-crafted.png'))
            # Stash salvage — one book becomes one shard.
            page.evaluate('__advanceReview.stash()')
            page.locator('.stash-books .inv-cell.filled').first.click()
            sb=read(page)
            page.locator('.bk-shard-have + .btn').click()
            sa=read(page)
            check(key+':salvage-gives-shard',sa['shards']==sb['shards']+1)
            check(key+':salvage-count-shown',page.locator('.bk-shard-have').count()==1)
            page.screenshot(path=str(OUT/f'{key}-stash.png'))
            page.evaluate('__advanceReview.library()')
            page.locator('.lib-advance-open').wait_for()
            before=read(page)
            page.locator('.lib-advance-open').click()
            check(key+':low-level-disabled',page.locator('.tr-adv-go').is_disabled())
            check(key+':all-paths-visible',page.locator('.advance-path').count()==3 and all(seen(page,f'.advance-path:nth-child({n})') for n in (1,2,3)))
            check(key+':footer-visible',reachable(page,'.tr-adv-go'))
            page.locator('.advance-path').nth(1).click()
            check(key+':preview-free',unchanged(before,read(page)))
            check(key+':board-follows-click',page.locator('#modal .adv-board').count()==1 and page.locator('.advance-path.on').get_attribute('data-branch')==read(page)['selection']['branch'])
            page.screenshot(path=str(OUT/f'{key}-room.png'))
            page.locator('#modal .modal-x').click()
            check(key+':close-preserves-game',unchanged(before,read(page)))
            page.locator('.lib-advance-open').click()
            top=read(page)['advance']['branches'][0]['id']
            check(key+':reopen-top-path-selected',page.locator('.advance-path.on').get_attribute('data-branch')==top and page.locator('#modal .adv-board').count()==1)
            page.evaluate('__advanceReview.ready()')
            check(key+':top-path-ready',not page.locator('.tr-adv-go').is_disabled())
            # Every class and branch must render its real skills and strengthening cells.
            for cls in ('warrior','knight','mage','archer','priest'):
                page.evaluate('__advanceReview.cls',cls)
                expected=read(page)['advance']['branches']
                before=read(page)
                for i,branch in enumerate(expected):
                    page.locator('.advance-path').nth(i).click()
                    check(key+':'+branch['id']+':selected',read(page)['selection']['branch']==branch['id'])
                    for j,skill in enumerate(branch['skills']):
                        cell=page.locator(f'#modal .adv-board [data-advskill="{skill}"]')
                        cell.scroll_into_view_if_needed()
                        cell.click()
                        check(key+':'+skill+':selects-its-path',read(page)['selection']['branch']==branch['id'])
                        check(key+':'+skill+':preview-cells',page.locator('#modal .adv-board [data-advtail]').count()==3)
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
            check(key+':does-not-auto-learn',not after['hero'].get('advanceSkill'))
            check(key+':completed-path-marked',page.locator('.advance-path').count()==3 and page.locator('.advance-path.done').get_attribute('data-branch')==chosen and page.locator('.tr-adv-go').count()==0)
            check(key+':mastery-action-visible',reachable(page,'.advance-mastery-open'))
            page.screenshot(path=str(OUT/f'{key}-complete.png'))
            page.locator('.advance-mastery-open').click()
            check(key+':mastery-open',read(page)['modal']=='skill')
            skill=after['advance']['branches'][1]['skills'][0]
            page.locator(f'.c-skill [data-advskill="{skill}"]').click()
            check(key+':mastery-learns-skill',read(page)['hero'].get('advanceSkill')==skill)
            page.locator('#modal .modal-x').click()
            check(key+':mastery-returns-to-room',read(page)['modal']=='advance')
            page.locator('#modal .modal-x').click()
            check(key+':completed-entry',page.locator('.lib-room .lib-room-art.off').count()==2)
            check(key+':no-double-charge',read(page)['gold']==after['gold'])
            page.locator('.lib-advance-open').click()
            check(key+':completed-room-locks-choice',page.locator('.advance-path.done').count()==1 and page.locator('.advance-path.off').count()==2)
            page.keyboard.press('Escape')
            check(key+':room-closes-to-books',read(page)['modal'] is None)
            # Switching heroes must discard applicability of the previous hero's choice.
            page.evaluate('__advanceReview.hero(1)')
            page.locator('.lib-advance-open').click()
            check(key+':hero-context',read(page)['selection'] is None and page.locator('.advance-path').count()==3 and page.locator('.advance-path.on').get_attribute('data-branch')==read(page)['advance']['branches'][0]['id'])
            page.evaluate('__advanceReview.lock()')
            page.locator('.advance-path').first.click()
            check(key+':building-gate-still-previews',not read(page)['advance']['open'] and page.locator('.tr-adv-go').is_disabled() and page.locator('#modal .adv-board').count()==1)
            page.screenshot(path=str(OUT/f'{key}-locked.png'))
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
