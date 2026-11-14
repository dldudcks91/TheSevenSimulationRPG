"""Acceptance checks for mobile decisions: actual content, hit targets and actions.

Uses isolated Edge profiles, original game handlers, and a read-only state accessor.
No existing player save is read or changed. Run against `python serve.py 8854`.
"""
import argparse, hashlib, json, os
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--port', type=int, default=8854)
parser.add_argument('--output-dir', default='_scratch/mobile-native-acceptance')
parser.add_argument('--section', choices=['all','regions','choices','navigation','combat','operations','keyboard','visitors','forge'], default='all')
args = parser.parse_args()
OUT = ROOT / args.output_dir; OUT.mkdir(parents=True, exist_ok=True)
os.environ['PW_TEST_SCREENSHOT_NO_FONTS_READY'] = '1'
checks, errors = [], []
started = datetime.now(timezone.utc).isoformat()
def fingerprints():
    return {str(p.relative_to(ROOT)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest()
            for p in [ROOT/'src/ui'/name for name in ['app.js','style.css','mobile.js','mobile.css','mobile-pages.js','mobile-pages.css','mobile-native.js','mobile-native.css','mobile-gestures.js','mobile-gestures.css','i18n.js']]}
source_start = fingerprints()
HARNESS = '''
window.__nativeReview=()=>({modal:state.modal,stage:state.expStage,heroes:G?.heroes.map(h=>h.uid),
 gold:G?.resources.gold,kept:G?.tavern?.kept,adv:state.advSel,watch:state.watchParty,
 tactics: G ? SYS.game.tacticState(G).slots.map(s=>({no:s.no,locked:s.locked,open:s.open})) : [],
 buildings:G?.buildings,research:G ? SYS.game.labState(G,now()).research : null,
 upgrade:G && state.forgeItem ? SYS.game.upgradeState(G,state.forgeItem) : null,
 commissions:G ? SYS.game.commissionState(G).cards : []});
'''

def check(name, ok, detail=None):
    row={'name':name,'ok':bool(ok)}
    if detail is not None:row['detail']=detail
    checks.append(row)
    if not ok:print(json.dumps(row,ensure_ascii=True),flush=True)

def ctx_page(browser,w,h,preview=False,admin=True):
    ctx=browser.new_context(viewport={'width':w,'height':h},has_touch=not preview,is_mobile=not preview)
    if admin:ctx.add_init_script("localStorage.setItem('devAdmin','1')")
    if preview:ctx.add_init_script("localStorage.setItem('thesevensim.screenLayout','mobile')")
    for url in ['https://fonts.googleapis.com/**','https://fonts.gstatic.com/**','https://cdn.jsdelivr.net/**']:ctx.route(url,lambda r:r.abort())
    ctx.route('**/ui/app.js',lambda r:r.fulfill(status=200,content_type='text/javascript',body=(ROOT/'src/ui/app.js').read_text(encoding='utf8')+HARNESS))
    page=ctx.new_page();page.set_default_timeout(12000)
    page.on('pageerror',lambda e:errors.append(str(e)))
    return ctx,page

def load(page,query):
    page.goto(f'http://127.0.0.1:{args.port}/index.html?'+query,wait_until='domcontentloaded')
    page.wait_for_function("[...document.querySelectorAll('link[rel=stylesheet]')].filter(n=>new URL(n.href).origin===location.origin).every(n=>n.sheet)",timeout=15000)
    page.locator('.mobile-dock').wait_for(timeout=60000)
    tutorials(page)

def tutorials(page):
    page.wait_for_timeout(100)
    for _ in range(8):
        btn=page.locator('.tutorial-card button').first
        if not btn.count() or not btn.is_visible():break
        btn.click()

def tab(page,name):
    page.locator('[data-mobile-menu]').click()
    page.locator(f'.nav [data-tab="{name}"]').click();tutorials(page)

def target_info(locator):
    return locator.evaluate('''n=>{
      const r=n.getBoundingClientRect(),stage=document.querySelector('#stage'),scale=stage.getBoundingClientRect().width/stage.offsetWidth;
      let clipped=[];
      for(let p=n.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),b=p.getBoundingClientRect();
        if(s.display==='contents')continue;
        if(/auto|scroll|hidden|clip/.test(s.overflowY)&& (r.top<b.top-2||r.bottom>b.bottom+2))clipped.push(p.className+' vertical');
        if(/auto|scroll|hidden|clip/.test(s.overflowX)&& (r.left<b.left-2||r.right>b.right+2))clipped.push(p.className+' horizontal');
      }
      const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      return {width:r.width/scale,height:r.height/scale,clipped,hit:!!hit&&(n.contains(hit)||hit===n),text:n.textContent.trim()};
    }''')

def target(page,selector,name,minh=1):
    loc=page.locator(selector).first
    if not loc.count():check(name,False,'missing '+selector);return
    info=target_info(loc);check(name,info['width']>0 and info['height']>=minh and not info['clipped'] and info['hit'],info)

def no_scroll(page,selector,name):
    data=page.locator(selector).evaluate('n=>({w:n.clientWidth,sw:n.scrollWidth,h:n.clientHeight,sh:n.scrollHeight,top:n.scrollTop,left:n.scrollLeft})')
    check(name,data['sw']<=data['w']+2 and data['sh']<=data['h']+2 and data['top']==0 and data['left']==0,data)

def regions(browser):
    variants=[(320,568,'ko','d2min',False),(390,844,'ko','d2min',False),(390,844,'en','now',False),
              (568,320,'ko','d2min',False),(844,390,'en','now',False),(768,1024,'en','d2min',False),
              (1440,900,'ko','d2min',True),(320,480,'en','d2min',True)]
    for w,h,lang,skin,preview in variants:
        key=f'region-{w}x{h}-{lang}-{skin}-'+('preview' if preview else 'touch')
        ctx,page=ctx_page(browser,w,h,preview)
        try:
            load(page,f'dev=box&tab=expedition&lang={lang}&skin={skin}')
            for chapter in range(5):
                page.locator('select[data-mobile-select="chapter"]').select_option(str(chapter))
                zones=page.locator('.mobile-zone-list > .zone')
                check(f'{key}:ch{chapter+1}:five-regions',zones.count()==5)
                no_scroll(page,'.diff-panel',f'{key}:ch{chapter+1}:panel-no-overflow')
                no_scroll(page,'.mobile-zone-list',f'{key}:ch{chapter+1}:list-no-overflow')
                for i in range(5):
                    info=target_info(zones.nth(i))
                    check(f'{key}:ch{chapter+1}:region{i+1}-fully-tappable',info['height']>=40 and not info['clipped'] and info['hit'],info)
                before=zones.last.bounding_box()
                page.mouse.move(before['x']+before['width']/2,before['y']+before['height']/2)
                page.mouse.wheel(0,900);page.wait_for_timeout(80)
                after=zones.last.bounding_box()
                check(f'{key}:ch{chapter+1}:wheel-does-not-move-regions',abs(before['y']-after['y'])<1)
                zones.last.click()
                check(f'{key}:ch{chapter+1}:fifth-region-opens-correct-departure',page.evaluate('__nativeReview().modal')=='depart' and f'Ch{chapter+1}-5' in page.locator('.dw-title').inner_text())
                target(page,'.depart-box .form-actions .primary',f'{key}:ch{chapter+1}:departure-action-reachable')
                page.locator('.depart-box .modal-x').click()
            page.screenshot(path=str(OUT/(key+'.png')))
            for difficulty in range(3):
                page.locator('.mobile-region-controls .diff-tab').nth(difficulty).click()
                no_scroll(page,'.diff-panel',f'{key}:difficulty{difficulty}:no-overflow')
                check(f'{key}:difficulty{difficulty}:five-regions',page.locator('.mobile-zone-list > .zone').count()==5)
        except Exception as e:check(key+':scenario',False,str(e));page.screenshot(path=str(OUT/(key+'-failure.png')))
        finally:ctx.close()

def choices(browser):
    for w,h,lang,skin in [(320,568,'ko','d2min'),(390,844,'ko','d2min'),(390,844,'en','now'),(568,320,'en','d2min'),(844,390,'ko','now')]:
        key=f'choices-{w}x{h}-{lang}-{skin}';ctx,page=ctx_page(browser,w,h)
        try:
            load(page,f'dev=box&tab=tavern&lang={lang}&skin={skin}')
            for i in range(page.locator('.tv-cands > .mobile-choice-bar button').count()):
                page.locator('.tv-cands > .mobile-choice-bar button').nth(i).click()
                no_scroll(page,'.tv-hire .mobile-choice-on',f'{key}:candidate{i}:card-fits')
                target(page,'.tv-hire .mobile-choice-on .b-hire',f'{key}:candidate{i}:hire-reachable',32)
                target(page,'.tv-hire .mobile-choice-on .b-keep',f'{key}:candidate{i}:keep-reachable',32)
                for j in range(7):
                    info=target_info(page.locator('.tv-hire .mobile-choice-on .attr-v').nth(j))
                    check(f'{key}:candidate{i}:stat{j}-visible',not info['clipped'] and info['hit'],info)
            page.screenshot(path=str(OUT/(key+'-hire.png')))
            heroes=page.evaluate('__nativeReview().heroes.length')
            page.locator('.tv-hire .mobile-choice-on .b-hire').click();tutorials(page)
            check(key+':hire-original-action',page.evaluate('__nativeReview().heroes.length')==heroes+1)
            tab(page,'party');page.locator('#mobile-tab-party-2').click()
            for i in range(5):
                page.locator('.rs-grid > .mobile-choice-bar button').nth(i).click()
                no_scroll(page,'.rs-grid',f'{key}:tactic{i}:grid-fits')
                no_scroll(page,'.rs-cell.mobile-choice-on',f'{key}:tactic{i}:card-fits')
                target(page,'.rs-cell.mobile-choice-on .rs-pin',f'{key}:tactic{i}:lock-reachable',30)
                before=page.evaluate('__nativeReview().tactics')
                page.locator('.rs-cell.mobile-choice-on .rs-pin').click()
                after=page.evaluate('__nativeReview().tactics')
                check(f'{key}:tactic{i}:lock-original-action',before[i]['locked']!=after[i]['locked'])
            page.screenshot(path=str(OUT/(key+'-tactics.png')))
            page.locator('#mobile-tab-tactic-content-1').click()
            check(key+':bonus-panel-reachable',page.locator('.rs-board.mobile-pane-on').is_visible())
            tab(page,'research');page.locator('#mobile-tab-research-1').click();tutorials(page)
            target(page,'.cn-go',key+':construction-action-reachable',40)
            page.locator('#mobile-tab-building-content-1').click()
            check(key+':rank-history-preserved',page.locator('.cn-ranks > *').count()>1)
            page.locator('#mobile-tab-building-content-0').click()
            info=target_info(page.locator('.cn-head-info'))
            check(key+':current-building-effects-visible',info['height']>0 and not info['clipped'] and bool(info['text']),info)
            tab(page,'library')
            page.locator('.lib-advance-open').click()
            for i in range(3):
                page.locator('.advance-path').nth(i).click()
                check(f'{key}:branch{i}:selected-by-original-action',page.locator('.advance-path.on').count()==1)
                target(page,'.tr-adv-go',f'{key}:branch{i}:advance-reachable',32)
                check(f'{key}:branch{i}:all-three-skills-preserved',page.locator('.advance-room [data-advskill]').count()==3)
            page.screenshot(path=str(OUT/(key+'-advance.png')))
        except Exception as e:check(key+':scenario',False,str(e));page.screenshot(path=str(OUT/(key+'-failure.png')))
        finally:ctx.close()

def navigation(browser):
    for w,h in [(320,568),(390,844),(568,320),(844,390)]:
        key=f'navigation-{w}x{h}';ctx,page=ctx_page(browser,w,h)
        try:
            load(page,'dev=box&tab=explore&lang=ko&skin=d2min')
            for ch in range(1,6):
                page.locator('select[data-mobile-select="explore-chapter"]').select_option(str(ch))
                spots=page.locator('.mobile-explore-spots .ex-spot:not(.mobile-group-hidden)')
                check(f'{key}:explore{ch}:three-spots',spots.count()==3)
                no_scroll(page,'.mobile-explore-spots',f'{key}:explore{ch}:no-scroll')
                for i in range(3):
                    info=target_info(spots.nth(i));check(f'{key}:explore{ch}:spot{i}-reachable',info['height']>=40 and not info['clipped'] and info['hit'],info)
                spots.last.click();check(f'{key}:explore{ch}:original-detail-opens',page.locator('.ex-pop').is_visible())
                page.locator('.ex-pop .modal-x').click()
            tab(page,'resource')
            tab(page,'explore')
            check(key+':explore-chapter-survives-navigation',page.locator('select[data-mobile-select="explore-chapter"]').input_value()=='5')
            tab(page,'resource')
            for i in range(page.locator('select[data-mobile-select="research-line"] option').count()):
                page.locator('select[data-mobile-select="research-line"]').select_option(str(i))
                no_scroll(page,'.dp-tree-grid',f'{key}:research{i}:no-scroll')
                check(f'{key}:research{i}:one-line',page.locator('.mobile-research-line:not(.mobile-group-hidden)').count()==1)
                line=page.locator('.mobile-research-line:not(.mobile-group-hidden)')
                node=line.locator('.dp-tree-cell').last
                info=target_info(node);check(f'{key}:research{i}:last-node-visible',not info['clipped'] and info['hit'],info)
            tab(page,'codex')
            tab(page,'resource')
            check(key+':research-line-survives-navigation',page.locator('select[data-mobile-select="research-line"]').input_value()=='4')
            tab(page,'codex')
            cat=page.locator('select[data-mobile-select="codex-category"]')
            for i in range(cat.locator('option').count()):
                cat.select_option(str(i));check(f'{key}:codex{i}:original-selection',page.locator('.cx-tabs > .on').count()==1)
            tab(page,'help')
            topics=page.locator('select[data-mobile-select="help-topic"]')
            topics.select_option(str(topics.locator('option').count()-1))
            check(key+':help-last-topic-reachable',page.locator('.help-tab.on').count()==1)
            page.locator('#help-search').fill('zzzzzzzz-no-match')
            page.wait_for_timeout(80)
            check(key+':help-empty-filter-syncs',topics.is_disabled())
            page.locator('#help-search').fill('')
            page.wait_for_timeout(80)
            check(key+':help-clear-restores-topics',topics.is_enabled() and page.locator('.help-tab.on').count()==1)
        except Exception as e:check(key+':scenario',False,str(e));page.screenshot(path=str(OUT/(key+'-failure.png')))
        finally:ctx.close()

def operations(browser):
    for w,h,lang in [(320,568,'ko'),(390,844,'en'),(568,320,'en'),(844,390,'ko')]:
        key=f'operations-{w}x{h}-{lang}';ctx,page=ctx_page(browser,w,h,admin=False)
        try:
            load(page,f'dev=mg&open=0&lv=1&cn=max&lang={lang}&skin=d2min')
            page.locator('#mobile-tab-resource-1').click();tutorials(page)
            target(page,'.dp-side-go',key+':research-action-visible',32)
            no_scroll(page,'.mobile-research-decision',key+':research-decision-fits')
            page.locator('#mobile-tab-research-content-1').click()
            check(key+':research-levels-preserved',page.locator('.dp-lvs > *').count()>1)
            page.locator('#mobile-tab-research-content-0').click()
            gold=page.evaluate('__nativeReview().gold')
            page.locator('.dp-side-go').click();tutorials(page)
            check(key+':research-start-original-action',page.evaluate('!!__nativeReview().research'))
            target(page,'.dp-side-go',key+':research-cancel-visible',32)
            no_scroll(page,'.mobile-research-decision',key+':research-running-fits')
            page.screenshot(path=str(OUT/(key+'-research.png')))
            page.locator('.dp-side-go').click()
            check(key+':research-cancel-original-action',not page.evaluate('!!__nativeReview().research'))
            check(key+':research-cancel-refunds',page.evaluate('__nativeReview().gold')==gold)
            page.locator('#mobile-tab-resource-0').click()
            page.locator('.mobile-research-line:not(.mobile-group-hidden) .dp-card-n').click();tutorials(page)
            check(key+':production-visible',page.locator('.mobile-research-production.mobile-pane-on').is_visible())
            page.locator('#mobile-tab-research-line-content-1').click()
            check(key+':registration-effects-preserved',page.locator('.dp-side-fx.mobile-pane-on .dp-kv').count()>0)
            face=page.locator('.dp-fx-heroes .hs-card').first
            info=target_info(face);check(key+':registration-action-visible',not info['clipped'] and info['hit'],info)
            face.click()
            check(key+':registration-original-dialog',page.evaluate('__nativeReview().modal')=='labReg')
            page.screenshot(path=str(OUT/(key+'-registration.png')))
        except Exception as e:check(key+':research-scenario',False,str(e));page.screenshot(path=str(OUT/(key+'-research-failure.png')))
        finally:ctx.close()
        ctx,page=ctx_page(browser,w,h)
        try:
            load(page,f'dev=commission&done=1&ch=5&lang={lang}&skin=d2min')
            page.locator('#mobile-tab-tavern-2').click()
            cards=page.locator('.cm-board > .mobile-choice-bar button')
            for i in range(cards.count()):
                cards.nth(i).click()
                no_scroll(page,'.cm-board',f'{key}:commission{i}:board-fits')
                no_scroll(page,'.cm-card.mobile-choice-on',f'{key}:commission{i}:card-fits')
                target(page,'.cm-card.mobile-choice-on .cm-go',f'{key}:commission{i}:action-visible',32)
            cards.first.click()
            old=page.evaluate('__nativeReview().commissions.find(c=>c.done).no')
            page.locator('.cm-card.mobile-choice-on .cm-go').click()
            check(key+':commission-claim-original-action',page.evaluate(f'!__nativeReview().commissions.some(c=>c.no==={old})'))
            page.locator('.cm-card.mobile-choice-on .cm-go').click()
            check(key+':commission-accept-original-action',page.locator('.cm-card.mobile-choice-on.taken').count()==1)
            page.locator('.cm-card.mobile-choice-on .cm-go').click()
            check(key+':commission-drop-confirmation-preserved',page.locator('.cm-card.mobile-choice-on .cm-go.armed').count()==1)
            page.locator('.cm-card.mobile-choice-on .cm-go').click()
            check(key+':commission-drop-original-action',page.locator('.cm-card.mobile-choice-on.taken').count()==0)
            page.screenshot(path=str(OUT/(key+'-commission.png')))
        except Exception as e:check(key+':commission-scenario',False,str(e));page.screenshot(path=str(OUT/(key+'-commission-failure.png')))
        finally:ctx.close()

def forge(browser):
    for w,h,lang,skin in [(320,568,'en','d2min'),(390,844,'ko','d2min'),(568,320,'en','d2min'),(844,390,'ko','now')]:
        key=f'forge-{w}x{h}-{lang}-{skin}';ctx,page=ctx_page(browser,w,h)
        try:
            load(page,f'dev=mats&cn=max&lang={lang}&skin={skin}')
            page.locator('#mobile-tab-forge-0').click()
            for i in range(4):
                button=page.locator('.c-forge-col > .fg-tabs > button').nth(i)
                info=target_info(button);check(f'{key}:tab{i}-fits',not info['clipped'] and info['hit'] and info['height']>=40,info)
                button.click()
                no_scroll(page,'.c-forge-col > .fg-tabs',f'{key}:tab{i}-no-scroll')
            page.locator('.c-forge-col > .fg-tabs > button').nth(1).click()
            page.locator('.fg-kind .btn').first.click();tutorials(page)
            page.locator('#mobile-tab-forge-3').click()
            page.locator('.bag .inv-cell.filled:not(.box)').first.click();tutorials(page)
            check(key+':item-opens-upgrade',page.locator('.fg-up-work.mobile-pane-on').is_visible())
            no_scroll(page,'.fg-up-work',key+':upgrade-decision-no-scroll')
            target(page,'.fg-up-act > .btn',key+':upgrade-action-visible',32)
            for i in range(page.locator('.fg-up-cmp').count()):
                info=target_info(page.locator('.fg-up-cmp').nth(i));check(f'{key}:effect-and-chance{i}-visible',not info['clipped'] and info['hit'],info)
            for i in range(page.locator('.fg-up-act .cn-matw').count()):
                info=target_info(page.locator('.fg-up-act .cn-matw').nth(i));check(f'{key}:cost{i}-visible',not info['clipped'] and info['hit'],info)
            page.screenshot(path=str(OUT/(key+'-upgrade.png')))
            # The new tempering decision is adjacent to upgrade, reachable by touch.
            nav=page.locator('.fg-up > .mobile-pages').bounding_box()
            cdp=ctx.new_cdp_session(page);x=nav['x']+nav['width']*.4;y=nav['y']+nav['height']*.35
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
            for step in range(1,9):
                cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+100*step/8,'y':y}]});page.wait_for_timeout(20)
            cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});cdp.detach();page.wait_for_timeout(220)
            check(key+':right-swipe-opens-temper',page.locator('.fg-tp.mobile-pane-on').is_visible())
            no_scroll(page,'.fg-tp',key+':temper-no-scroll')
            check(key+':five-material-tiers',page.locator('.fg-tp-stake').count()==5)
            for i in range(5):target(page,f'.fg-tp-stake:nth-child({i+1})',f'{key}:stake{i}-visible',32)
            no_scroll(page,'.fg-tp-mat',key+':selected-material-readable')
            for reel in range(3):
                size=page.locator('.fg-tp-reel').nth(reel).evaluate('n=>({height:n.clientHeight,cell:n.querySelector(".fg-tp-cell").getBoundingClientRect().height})')
                check(f'{key}:reel{reel}-three-rows',size['height']>=size['cell']*3-2,size)
            material=page.locator('.fg-tp-mat').inner_text()
            page.locator('.fg-tp-stake').nth(1).click()
            check(key+':tier-selects-material',page.locator('.fg-tp-mat').inner_text()!=material and page.locator('.fg-tp-stake').nth(1).evaluate('n=>n.classList.contains("on")'))
            check(key+':insufficient-material-disables-temper',page.locator('.fg-tp > .btn').is_disabled())
            page.locator('.fg-tp-stake').first.click()
            target(page,'.fg-tp > .btn',key+':temper-action-visible',32)
            page.screenshot(path=str(OUT/(key+'-temper.png')))
            before_temper=page.evaluate('__nativeReview().upgrade.temper')
            page.locator('.fg-tp > .btn').click();tutorials(page)
            after_temper=page.evaluate('__nativeReview().upgrade.temper')
            check(key+':temper-original-action',after_temper['bonus']>0)
            check(key+':temper-consumes-selected-stake',after_temper['stakes'][0]['have']==before_temper['stakes'][0]['have']-before_temper['stakes'][0]['need'])
            check(key+':temper-only-once',page.locator('.fg-tp > .btn').is_disabled())
            no_scroll(page,'.fg-tp',key+':tempered-result-fits')
            page.wait_for_function("[...document.querySelectorAll('.fg-tp-strip')].every(n=>n.getAnimations().every(a=>a.playState==='finished'))")
            page.screenshot(path=str(OUT/(key+'-tempered.png')))
            page.locator('#mobile-tab-forge-up-0').click()
            before=page.locator('.fg-up-th b').text_content()
            page.locator('.fg-up-act > .btn').click()
            check(key+':upgrade-original-action',page.locator('.fg-up-th b').text_content()!=before)
            check(key+':upgrade-consumes-temper',page.evaluate('__nativeReview().upgrade.temper.bonus')==0)
            page.locator('#mobile-tab-forge-up-1').click()
            check(key+':full-item-reference-visible',page.locator('.fg-up-tipcol.mobile-pane-on').is_visible())
            info=page.locator('.fg-up-tipcol').evaluate('n=>({width:n.clientWidth,scroll:n.scrollWidth})')
            check(key+':item-reference-no-horizontal-scroll',info['scroll']<=info['width']+2,info)
        except Exception as e:check(key+':scenario',False,str(e));page.screenshot(path=str(OUT/(key+'-failure.png')))
        finally:ctx.close()

def visitors(browser):
    for w,h,lang in [(320,568,'ko'),(390,844,'en'),(568,320,'en'),(844,390,'ko')]:
        key=f'visitors-{w}x{h}-{lang}';ctx,page=ctx_page(browser,w,h,admin=False)
        try:
            load(page,f'dev=visit&n=3&cn=max&lang={lang}&skin=d2min')
            page.locator('#mobile-tab-tavern-1').click()
            count=page.locator('button.tv-join-slot').count()
            check(key+':arriving-heroes-present',count>=2)
            page.locator('button.tv-join-slot').last.click()
            no_scroll(page,'.tv-search-row',key+':arrival-panel-fits')
            no_scroll(page,'.tv-join-card',key+':arrival-card-fits')
            for i in range(7):
                info=target_info(page.locator('.tv-join-card .attr-v').nth(i))
                check(f'{key}:stat{i}-visible',not info['clipped'] and info['hit'],info)
            target(page,'.tv-join-card .b-take',key+':hire-visible',32)
            target(page,'.tv-join-card .b-drop',key+':drop-visible',32)
            page.screenshot(path=str(OUT/(key+'-selected.png')))
            page.locator('.tv-join-card .b-drop').click()
            check(key+':drop-original-action',page.locator('button.tv-join-slot').count()==count-1)
            check(key+':arrival-status-restored',page.locator('.tv-visit').is_visible())
            no_scroll(page,'.tv-visit',key+':arrival-status-and-registration-fit')
            for i in range(page.locator('.tv-visit-hero').count()):
                info=target_info(page.locator('.tv-visit-hero').nth(i));check(f'{key}:registration{i}-visible',not info['clipped'] and info['hit'],info)
            page.locator('button.tv-join-slot').first.click()
            heroes=page.evaluate('__nativeReview().heroes.length')
            page.locator('.tv-join-card .b-take').click();tutorials(page)
            check(key+':hire-original-action',page.evaluate('__nativeReview().heroes.length')==heroes+1)
            check(key+':hire-removes-arrival',page.locator('button.tv-join-slot').count()==count-2)
            load(page,f'dev=mg&line=visit&reg=1&open=0&cn=max&tab=tavern&lang={lang}&skin=d2min')
            page.locator('#mobile-tab-tavern-1').click()
            no_scroll(page,'.tv-visit',key+':registered-hero-status-fits')
            for i in range(page.locator('.tv-visit-hero').count()):
                info=target_info(page.locator('.tv-visit-hero').nth(i));check(f'{key}:registered-row{i}-visible',not info['clipped'] and info['hit'],info)
            page.screenshot(path=str(OUT/(key+'-status.png')))
            page.locator('.tv-visit-hero').first.click()
            check(key+':registered-row-opens-original-dialog',page.evaluate('__nativeReview().modal')=='labReg')
        except Exception as e:check(key+':scenario',False,str(e));page.screenshot(path=str(OUT/(key+'-failure.png')))
        finally:ctx.close()

def keyboard(browser):
    for w,h,preview in [(390,844,False),(1440,900,True),(320,480,True)]:
        key=f'keyboard-{w}x{h}';ctx,page=ctx_page(browser,w,h,preview)
        try:
            load(page,'dev=box&tab=expedition&lang=en&skin=d2min')
            select=page.locator('select[data-mobile-select="chapter"]')
            select.focus();select.press('ArrowDown')
            check(key+':chapter-keyboard-selection',select.input_value()=='1')
            check(key+':chapter-focus-after-render',select.evaluate('n=>document.activeElement===n'))
            zone=page.locator('.mobile-zone-list .zone').last
            zone.focus();zone.press('Enter');tutorials(page)
            check(key+':region-keyboard-opens-departure',page.locator('.depart-box').is_visible())
            page.keyboard.press('Escape')
            check(key+':escape-closes-departure',not page.locator('.depart-box').count())
            tab(page,'library')
            page.locator('.lib-advance-open').click()
            choice=page.locator('.advance-path').nth(1)
            choice.focus();choice.press('Enter')
            check(key+':branch-keyboard-original-selection',page.locator('.advance-path.on').count()==1)
            check(key+':branch-focus-after-render',page.locator('.advance-path').nth(1).evaluate('el=>el===document.activeElement'))
            page.keyboard.press('Escape')
            tab(page,'tavern')
            choice=page.locator('.tv-cands .mobile-choice-button').first
            choice.focus();choice.press('ArrowLeft')
            check(key+':candidate-keyboard-wrap',page.locator('.tv-cands .mobile-choice-button').last.get_attribute('aria-selected')=='true')
            check(key+':hidden-cards-inert',page.locator('.mobile-choice-card:not(.mobile-choice-on)').evaluate_all('nodes=>nodes.every(n=>n.inert)'))
            page.locator('#mobile-tab-tavern-2').click()
            page.locator('.cm-card.mobile-choice-on .cm-go').click()
            page.locator('.cm-card.mobile-choice-on .cm-go').click()
            page.locator('.cm-card.mobile-choice-on .cm-go').click()
            page.wait_for_timeout(300)
            boxes=page.evaluate('''()=>{
                const stage=document.querySelector('#stage').getBoundingClientRect(),action=document.querySelector('.cm-card.mobile-choice-on .cm-go').getBoundingClientRect();
                return [...document.querySelectorAll('.toast')].map(n=>{const r=n.getBoundingClientRect();return {visible:r.width>0,inside:r.left>=stage.left-1&&r.right<=stage.right+1&&r.top>=stage.top&&r.bottom<=stage.bottom,aboveAction:r.bottom<=action.top,passThrough:getComputedStyle(n).pointerEvents==='none'};});
            }''')
            check(key+':feedback-does-not-cover-action',bool(boxes) and all(all(x.values()) for x in boxes),boxes)
            page.screenshot(path=str(OUT/(key+'-feedback.png')))
        except Exception as e:check(key+':scenario',False,str(e));page.screenshot(path=str(OUT/(key+'-failure.png')))
        finally:ctx.close()

def combat(browser):
    for w,h,lang in [(320,568,'en'),(390,844,'ko'),(568,320,'en'),(844,390,'ko')]:
        key=f'combat-{w}x{h}-{lang}'
        ctx,page=ctx_page(browser,w,h,admin=False)
        try:
            load(page,f'dev=box&tab=expedition&lang={lang}&skin=d2min')
            check(key+':locked-regions-preserved',page.locator('.mobile-zone-list .zone.locked').count()==4)
            no_scroll(page,'.diff-panel',key+':locked-regions-no-scroll')
            no_scroll(page,'.mobile-region-controls',key+':locked-controls-fit')
            for i in range(5):
                info=target_info(page.locator('.mobile-zone-list .zone').nth(i))
                check(f'{key}:locked-region{i}-visible',info['height']>=40 and not info['clipped'] and info['hit'],info)
            locked=page.locator('.mobile-zone-list .zone').last.bounding_box()
            page.mouse.click(locked['x']+locked['width']/2,locked['y']+locked['height']/2)
            check(key+':locked-region-does-not-open',page.locator('.depart-box').count()==0)
            check(key+':chapter-locks-preserved',page.locator('select[data-mobile-select="chapter"] option:disabled').count()==6)
            check(key+':difficulty-locks-preserved',page.locator('.diff-tab:disabled').count()==2)
            page.screenshot(path=str(OUT/(key+'-locked.png')))
        except Exception as e:check(key+':locked-scenario',False,str(e))
        finally:ctx.close()
        ctx,page=ctx_page(browser,w,h)
        try:
            load(page,f'dev=play&parties=3&rep=1&lang={lang}&skin=d2min')
            tab(page,'expedition')
            check(key+':three-live-party-links',page.locator('.zone-go button').count()==3)
            no_scroll(page,'.diff-panel',key+':live-regions-no-scroll')
            for i in range(3):
                target(page,f'.zone-go button:nth-child({i+1})',f'{key}:live-party{i}-reachable',32)
                page.locator('.zone-go button').nth(i).click()
                check(f'{key}:live-party{i}-opens-battle',page.locator('.battle-panel').is_visible())
                tab(page,'expedition')
            page.screenshot(path=str(OUT/(key+'-live-regions.png')))
        except Exception as e:check(key+':live-scenario',False,str(e));page.screenshot(path=str(OUT/(key+'-live-failure.png')))
        finally:ctx.close()
        ctx,page=ctx_page(browser,w,h)
        try:
            load(page,f'dev=colosseum&party=full&lang={lang}&skin=d2min')
            page.locator('#mobile-tab-colosseum-1').click();tutorials(page)
            no_scroll(page,'.arena-main',key+':prepare-no-scroll')
            no_scroll(page,'.arena-prep',key+':teams-no-scroll')
            units=page.locator('.arena-prep .unit')
            check(key+':six-team-members',units.count()==6)
            for i in range(units.count()):
                info=target_info(units.nth(i));check(f'{key}:member{i}-fully-visible',not info['clipped'] and info['hit'],info)
            target(page,'.arena-fight',key+':fight-action-reachable',32)
            page.screenshot(path=str(OUT/(key+'-prepare.png')))
            page.locator('#mobile-tab-arena-preparation-1').click()
            check(key+':loadout-panel',page.locator('.arena-load.mobile-pane-on').is_visible())
            target(page,'.arena-fight',key+':fight-action-from-loadout',32)
            page.locator('.arena-fight').click()
            check(key+':original-fight-starts',page.locator('.battle-panel').is_visible())
        except Exception as e:check(key+':prepare-scenario',False,str(e));page.screenshot(path=str(OUT/(key+'-prepare-failure.png')))
        finally:ctx.close()

with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    for name in ['regions','choices','navigation','combat','operations','keyboard','visitors','forge']:
        if args.section in ['all',name]:globals()[name](browser)
    browser.close()
report={'started_at':started,'at':datetime.now(timezone.utc).isoformat(),'source_start':source_start,'source_end':fingerprints(),'checks':checks,'errors':errors}
(OUT/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
failed=sum(not row['ok'] for row in checks)
print(f'{len(checks)} checks, {failed} failures, {len(errors)} browser exceptions')
raise SystemExit(bool(failed or errors))
