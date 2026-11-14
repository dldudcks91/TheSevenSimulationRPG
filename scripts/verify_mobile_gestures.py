"""Exercise mobile pages with real Edge pointer/touch input, never call the pager API.

Profiles and saves are disposable. --soak-minutes repeats navigation for elapsed time.
"""
import argparse, hashlib, json, os, time
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--port', type=int, default=8854)
parser.add_argument('--output-dir', default='output/mobile-gestures-2026-11-14/gestures')
parser.add_argument('--soak-minutes', type=float, default=0)
parser.add_argument('--soak-preview', action='store_true', help='Repeat real mouse drags in a fixed PC preview at large and small host sizes.')
args = parser.parse_args()
OUT = ROOT / args.output_dir; OUT.mkdir(parents=True, exist_ok=True)
os.environ['PW_TEST_SCREENSHOT_NO_FONTS_READY'] = '1'
checks, errors, cycles = [], [], []
started = time.monotonic()
start_utc = datetime.now(timezone.utc).isoformat()
def sources():
    paths=[p for p in (ROOT/'src/ui').glob('mobile*') if p.suffix in ['.js','.css']]
    paths += [ROOT/'src/ui'/name for name in ['app.js','style.css','i18n.js']] + [ROOT/'src/index.html']
    return {p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
source_start = sources()
def check(name, ok, detail=None):
    checks.append({'name':name,'ok':bool(ok),'detail':detail})
    if not ok: print(json.dumps(checks[-1],ensure_ascii=True),flush=True)
def save():
    (OUT/'results.json').write_text(json.dumps({'started':start_utc,'elapsed_seconds':time.monotonic()-started,
        'input':'mouse-fixed-preview' if args.soak_preview else 'touch','requested_seconds':args.soak_minutes*60,
        'source_start':source_start,'source_end':sources(),'checks':checks,'errors':errors,'cycles':cycles},ensure_ascii=False,indent=2),encoding='utf8')
def context(browser,w,h,preview=False,reduced=False):
    ctx=browser.new_context(viewport={'width':w,'height':h},has_touch=not preview,is_mobile=not preview,
        reduced_motion='reduce' if reduced else 'no-preference')
    ctx.add_init_script("localStorage.setItem('devAdmin','1')")
    if preview:ctx.add_init_script("localStorage.setItem('thesevensim.screenLayout','mobile')")
    for url in ['https://fonts.googleapis.com/**','https://fonts.gstatic.com/**','https://cdn.jsdelivr.net/**']:ctx.route(url,lambda r:r.abort())
    ctx.route('**/ui/app.js', lambda r:r.fulfill(status=200,content_type='text/javascript',body=(ROOT/'src/ui/app.js').read_text(encoding='utf8')+
        '\nwindow.__gestureReview=()=>({heroes:G?.heroes.length,gold:G?.resources.gold,modal:state.modal,adv:state.advSel});'))
    page=ctx.new_page(); page.set_default_timeout(12000)
    page.on('pageerror',lambda e:errors.append(str(e)))
    return ctx,page
def load(page,tab='character',lang='ko'):
    page.goto(f'http://127.0.0.1:{args.port}/index.html?dev=box&tab={tab}&lang={lang}&skin=d2min',wait_until='domcontentloaded')
    page.locator('.mobile-dock').wait_for(timeout=60000)
    page.wait_for_function("[...document.querySelectorAll('link[rel=stylesheet]')].filter(n=>new URL(n.href).origin===location.origin).every(n=>n.sheet)")
    tutorials(page)
def tutorials(page):
    for _ in range(8):
        btn=page.locator('.tutorial-card button').first
        if not btn.count() or not btn.is_visible():break
        btn.click()
def tab(page,name):
    page.locator('[data-mobile-menu]').click();page.locator(f'.nav [data-tab="{name}"]').click(); tutorials(page)
def active(page,key='character'):
    return page.locator(f'[data-mobile-deck="{key}"] > .mobile-pages > .on').get_attribute('id')
def swipe(page,selector,dx,dy=0,mouse=False,cancel=False,start=.45,mid_capture=None,settle=220):
    loc=page.locator(selector).first;box=loc.bounding_box()
    if not box:raise AssertionError('No swipe surface: '+selector)
    scale=page.locator('#stage').evaluate('n=>n.getBoundingClientRect().width/n.offsetWidth')
    x=box['x']+box['width']*start;y=box['y']+box['height']*.45
    if mouse:
        page.mouse.move(x,y);page.mouse.down()
        for i in range(1,9):page.mouse.move(x+dx*scale*i/8,y+dy*scale*i/8);page.wait_for_timeout(18)
        if mid_capture:page.screenshot(path=str(OUT/mid_capture))
        page.mouse.up()
    else:
        cdp=page.context.new_cdp_session(page)
        def touch(kind,x=x,y=y):cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if kind in ['touchEnd','touchCancel'] else [{'x':x,'y':y,'id':1}]})
        touch('touchStart')
        for i in range(1,9):touch('touchMove',x+dx*scale*i/8,y+dy*scale*i/8);page.wait_for_timeout(18)
        if mid_capture:page.screenshot(path=str(OUT/mid_capture))
        touch('touchCancel' if cancel else 'touchEnd');cdp.detach()
    page.wait_for_timeout(settle)
def no_main_scroll(page,name):
    v=page.locator('.main').evaluate('n=>({h:n.clientHeight,sh:n.scrollHeight,w:n.clientWidth,sw:n.scrollWidth})')
    check(name,v['sh']<=v['h']+2 and v['sw']<=v['w']+2,v)

def acceptance(browser):
    for w,h,preview in [(390,844,False),(320,568,False),(844,390,False),(1440,900,True),(320,480,True)]:
        name=f'{w}x{h}-'+('mouse' if preview else 'touch')
        ctx,page=context(browser,w,h,preview)
        try:
            load(page)
            check(name+':stats-first',active(page)=='mobile-tab-character-1',active(page))
            page.screenshot(path=str(OUT/(name+'-stats.png')))
            swipe(page,'.attr-list',110,mouse=preview,mid_capture=name+'-drag.png')
            check(name+':right-opens-details',active(page)=='mobile-tab-character-2',active(page))
            page.screenshot(path=str(OUT/(name+'-detail.png')))
            swipe(page,'[data-sheet="0"]',100,mouse=preview)
            check(name+':right-opens-second-details',active(page)=='mobile-tab-character-3',active(page))
            swipe(page,'[data-sheet="1"]',100,mouse=preview)
            check(name+':edge-stays-on-page',active(page)=='mobile-tab-character-3',active(page))
            swipe(page,'[data-sheet="1"]',-100,mouse=preview)
            check(name+':reverse-returns',active(page)=='mobile-tab-character-2',active(page))
            swipe(page,'[data-sheet="0"]',20,mouse=preview)
            check(name+':short-drag-cancels',active(page)=='mobile-tab-character-2')
            if not preview:
                swipe(page,'[data-sheet="0"]',100,cancel=True)
                check(name+':pointercancel-stays',active(page)=='mobile-tab-character-2')
            swipe(page,'[data-sheet="0"]',0,-90,mouse=preview)
            check(name+':vertical-does-not-page',active(page)=='mobile-tab-character-2')
            check(name+':gesture-cleanup',page.locator('.mobile-swiping,.mobile-swipe-moving').count()==0)
            no_main_scroll(page,name+':no-main-scroll')
            page.locator('#mobile-tab-character-1').click()
            page.locator('#mobile-tab-character-1').press('ArrowLeft')
            check(name+':keyboard-follows-spatial-order',active(page)=='mobile-tab-character-2')
            check(name+':keyboard-focus',page.locator('#mobile-tab-character-2').evaluate('n=>n===document.activeElement'))
            tab(page,'tavern')
            card='.tv-cands .mobile-choice-on'
            before=page.locator(card).get_attribute('id')
            swipe(page,card, -100,mouse=preview,start=.65)
            after=page.locator(card).get_attribute('id')
            check(name+':candidate-swipes',before!=after,{'before':before,'after':after})
            check(name+':nested-card-keeps-parent',active(page,'tavern')=='mobile-tab-tavern-0')
            swipe(page,card,-100,mouse=preview,start=.65)
            check(name+':card-edge-does-not-escape',active(page,'tavern')=='mobile-tab-tavern-0' and page.locator(card).get_attribute('id')==after)
            swipe(page,card+' .hero-face img',100,mouse=preview)
            check(name+':portrait-is-swipe-surface',page.locator(card).get_attribute('id')==before)
            swipe(page,card,-100,mouse=preview,start=.65)
            check(name+':portrait-swipe-returns',page.locator(card).get_attribute('id')==after)
            page.screenshot(path=str(OUT/(name+'-hire.png')))
            no_main_scroll(page,name+':hire-no-main-scroll')
            state=page.evaluate('__gestureReview()')
            swipe(page,'.tv-cands .mobile-choice-on .b-hire',25,mouse=preview)
            check(name+':drag-on-action-does-not-hire',page.evaluate('__gestureReview().heroes')==state['heroes'])
            check(name+':drag-on-action-does-not-spend',page.evaluate('__gestureReview().gold')==state['gold'])
            # The outer hint is an always available gesture surface outside nested cards.
            swipe(page,'[data-mobile-deck="tavern"] > .mobile-pages .mobile-swipe-hint',-100,mouse=preview,start=.65)
            check(name+':outer-header-swipes',active(page,'tavern')=='mobile-tab-tavern-1',active(page,'tavern'))
            tab(page,'expedition')
            check(name+':five-regions',page.locator('.mobile-zone-list > .zone').count()==5)
            no_main_scroll(page,name+':regions-no-main-scroll')
            tab(page,'character')
            check(name+':page-persists-after-navigation',active(page)=='mobile-tab-character-2')
        except Exception as e:
            check(name+':completed',False,str(e));page.screenshot(path=str(OUT/(name+'-failure.png')))
        finally:ctx.close();save()
    ctx,page=context(browser,390,844,reduced=True)
    try:
        load(page,lang='en');swipe(page,'.attr-list',100)
        check('reduced-motion:swipe-works',active(page)=='mobile-tab-character-2')
        check('english:no-missing-string',not page.locator('.mobile-swipe-hint').first.inner_text().startswith('mobile.'))
    finally:ctx.close();save()

    ctx,page=context(browser,1440,900,preview=True)
    try:
        load(page)
        # Releasing outside the page before direction lock must not leave a drag armed.
        box=page.locator('.attr-list').bounding_box()
        x=box['x']+box['width']-2;y=box['y']+30
        page.mouse.move(x,y);page.mouse.down();page.mouse.move(1430,y);page.mouse.up()
        page.mouse.move(box['x']+100,y);page.wait_for_timeout(100)
        check('mouse:outside-release-cleans-up',page.locator('.mobile-swiping,.mobile-swipe-moving').count()==0)
        # A resize interrupts a gesture and the newly mounted page remains usable.
        page.locator('#mobile-tab-character-1').click()
        box=page.locator('.attr-list').bounding_box()
        page.mouse.move(box['x']+100,box['y']+30);page.mouse.down();page.mouse.move(box['x']+130,box['y']+30)
        page.set_viewport_size({'width':320,'height':480});page.mouse.up();page.wait_for_timeout(250)
        check('mouse:resize-cleans-up',page.locator('.mobile-swiping,.mobile-swipe-moving').count()==0)
        page.locator('#mobile-tab-character-1').click();swipe(page,'.attr-list',100,mouse=True)
        check('mouse:resize-retains-swipe',active(page)=='mobile-tab-character-2')
    except Exception as e:check('mouse:interruption',False,str(e))
    finally:ctx.close();save()

    ctx,page=context(browser,390,844)
    try:
        load(page)
        # A stationary long press continues to open the existing stat explanation.
        box=page.locator('.attr-n[data-tip]').first.bounding_box()
        cdp=ctx.new_cdp_session(page)
        point={'x':box['x']+box['width']/2,'y':box['y']+box['height']/2,'id':1}
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point]});page.wait_for_timeout(550)
        check('long-press:stat-tooltip-kept',page.locator('#tooltip.show').count()==1)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        page.wait_for_timeout(450)
        swipe(page,'.attr-list',110)
        check('long-press:next-swipe-clears-tooltip',page.locator('#tooltip.show').count()==0 and active(page)=='mobile-tab-character-2')
        # A second finger cancels the current page drag rather than committing it.
        box=page.locator('[data-sheet="0"]').bounding_box()
        point={'x':box['x']+80,'y':box['y']+70,'id':1}
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point]})
        point['x']+=30;cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[point]})
        second={'x':point['x']+50,'y':point['y']+30,'id':2}
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point,second]})
        point['x']+=70;second['x']+=70
        cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[point,second]})
        cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(250)
        check('multi-touch:does-not-page',active(page)=='mobile-tab-character-2')
        check('multi-touch:cleanup',page.locator('.mobile-swiping,.mobile-swipe-moving').count()==0)
        page.locator('#mobile-tab-character-1').click()
        swipe(page,'.attr-list',100,settle=10)
        swipe(page,'[data-sheet="0"]',100,settle=10)
        swipe(page,'[data-sheet="1"]',-100,settle=10)
        swipe(page,'[data-sheet="0"]',-100)
        check('rapid-swipes:returns-to-stats',active(page)=='mobile-tab-character-1')
        check('rapid-swipes:no-stale-animation',page.locator('.mobile-pane-on').evaluate('n=>getComputedStyle(n).transform')=='none')
        tab(page,'library')
        page.locator('.lib-advance-open').click()
        page.locator('.advance-path').nth(1).click()
        branch=page.locator('.advance-path.on').get_attribute('data-branch')
        original=page.evaluate('__gestureReview()')
        swipe(page,'.advance-room-desc',-110,start=.65)
        check('advance:swipe-keeps-explicit-choice',page.locator('.advance-path.on').get_attribute('data-branch')==branch)
        check('advance:all-paths-remain-visible',page.locator('.advance-path:visible').count()==3)
        check('advance:swipe-does-not-spend',page.evaluate('__gestureReview().gold')==original['gold'])
        check('advance:swipe-does-not-confirm',page.evaluate('__gestureReview().modal')==original['modal'])
        page.locator('.advance-path').first.click()
        check('advance:choice-survives-render',page.locator('.advance-path.on').get_attribute('data-branch')!=branch)
        page.keyboard.press('Escape')
        tab(page,'tavern');page.locator('#mobile-tab-tavern-2').click()
        original=page.evaluate('__gestureReview()')
        before=page.locator('.cm-card.mobile-choice-on').get_attribute('id')
        swipe(page,'.cm-card.mobile-choice-on',-100,start=.65)
        check('commissions:swipe-compares',page.locator('.cm-card.mobile-choice-on').get_attribute('id')!=before)
        check('commissions:swipe-has-no-action',page.evaluate('__gestureReview().gold')==original['gold'] and page.evaluate('__gestureReview().modal')==original['modal'])
        tab(page,'research');page.locator('#mobile-tab-research-1').click();tutorials(page)
        swipe(page,'.mobile-building-overview',-110,start=.65)
        check('building:swipe-opens-history',active(page,'building-content')=='mobile-tab-building-content-1')
        check('building:inner-swipe-keeps-building',active(page,'research')=='mobile-tab-research-1')
    except Exception as e:
        check('advanced:completed',False,str(e));page.screenshot(path=str(OUT/'advanced-failure.png'))
    finally:ctx.close();save()

def soak(browser):
    ctx,page=context(browser,1440 if args.soak_preview else 390,900 if args.soak_preview else 844,preview=args.soak_preview)
    end=time.monotonic()+args.soak_minutes*60
    try:
        load(page)
        cycle=0
        while time.monotonic()<end:
            cycle+=1
            if args.soak_preview:
                page.set_viewport_size({'width':1440 if cycle%2 else 320,'height':900 if cycle%2 else 480})
                logical=page.locator('#stage').evaluate('n=>({w:n.offsetWidth,h:n.offsetHeight})')
                check(f'cycle{cycle}:fixed-preview',logical=={'w':390,'h':844},logical)
            else:page.set_viewport_size({'width':390 if cycle%2 else 844,'height':844 if cycle%2 else 390})
            page.locator('#mobile-tab-character-1').click()
            swipe(page,'.attr-list',100,mouse=args.soak_preview)
            check(f'cycle{cycle}:detail',active(page)=='mobile-tab-character-2')
            swipe(page,'[data-sheet="0"]',-100,mouse=args.soak_preview)
            check(f'cycle{cycle}:stats',active(page)=='mobile-tab-character-1')
            no_main_scroll(page,f'cycle{cycle}:layout')
            if cycle%15==0:page.reload(wait_until='domcontentloaded');page.locator('.mobile-dock').wait_for();tutorials(page)
            record={'cycle':cycle,'seconds':round(time.monotonic()-started,2),'nodes':page.locator('*').count()}
            if cycle%15==0:record['source_sha256']=sources()
            cycles.append(record)
            save();page.wait_for_timeout(2500)
        page.screenshot(path=str(OUT/'soak-final.png'))
    finally:ctx.close();save()

with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    try:
        if args.soak_minutes:soak(browser)
        else:acceptance(browser)
    finally:browser.close();save()
failed=[c for c in checks if not c['ok']]
print(f'{len(checks)-len(failed)}/{len(checks)} checks passed; {len(errors)} errors; {len(cycles)} soak cycles',flush=True)
raise SystemExit(bool(failed or errors))
