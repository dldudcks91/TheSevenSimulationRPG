import io
import json
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
HARNESS = '''
window.__forgeOverlay = {
    fill: () => {
        const h = G.heroes[0]; state.heroUid = h.uid; state.invNo = 1;
        const bag = SYS.game.bagOf(G, 1); bag.length = 0; G.stash.length = 0;
        for (const [where, list] of [['bag', bag], ['stash', G.stash]]) {
            for (let i = 0; i < 36; i++) {
                const it = SYS.item.rollGear(makeRng(200 + i), {slots:['weapon'], ilvl:10})[0];
                it.uid = `overlay-review-${where}-${i}`; if (i === 35) it.rarity = 'unique';
                G.items[it.uid] = it; list.push(it.uid);
            }
        }
        state.tab = 'forge'; state.forgeTab = 'up'; state.forgeItem = null; render();
    },
    tab: tab => { state.tab = tab; render(); },
    modal: modal => { state.modal = modal; render(); },
    cover: (layer = 28) => {
        const r = stageRect(document.querySelector('.c-forge .sel'));
        const cover = document.createElement('div'); cover.id = 'overlay-review-cover';
        Object.assign(cover.style, {position:'absolute',zIndex:String(layer),pointerEvents:'none',background:'#00ffff',
            left:`${r.left-8}px`,top:`${r.top-8}px`,width:`${r.right-r.left+16}px`,height:`${r.bottom-r.top+16}px`});
        document.getElementById('stage').appendChild(cover);
    }
};
'''
MEASURE = '''() => {
    const cell = document.querySelector('.c-forge .sel');
    const outline = document.querySelector('.forge-selection-outline');
    const a = cell.getBoundingClientRect(), b = outline.getBoundingClientRect();
    const c = getComputedStyle(cell), s = getComputedStyle(outline);
    return {box:{x:a.x,y:a.y,width:a.width,height:a.height},
        error:Math.max(...['left','right','top','bottom'].map(k=>Math.abs(a[k]-b[k]))),
        sameSize:c.outlineWidth===s.outlineWidth && c.outlineOffset===s.outlineOffset,
        outside:parseFloat(s.outlineOffset)>0, top:Number(s.zIndex)>28 && Number(s.zIndex)<30,
        passive:s.pointerEvents==='none', direct:outline.parentElement.id==='stage',
        count:document.querySelectorAll('.forge-selection-outline').length};
}'''

def settled(page):
    page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')

def red_edges(page, box):
    shot = page.screenshot()
    picture = Image.open(io.BytesIO(shot)).convert('RGB')
    x, y, w, h = (box[k] for k in ['x', 'y', 'width', 'height'])
    edges = [
        [(round(x+d), round(y+h/2)) for d in [-3,-2,-1]],
        [(round(x+w+d), round(y+h/2)) for d in [0,1,2]],
        [(round(x+w/2), round(y+d)) for d in [-3,-2,-1]],
        [(round(x+w/2), round(y+h+d)) for d in [0,1,2]],
    ]
    def red(point):
        r,g,b = picture.getpixel(point)
        return r>150 and g<110 and b<110
    return all(any(red(point) for point in edge) for edge in edges)

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    context = browser.new_context(viewport={'width':1600,'height':800})
    context.route('**/ui/app.js', lambda route: route.fulfill(status=200, content_type='text/javascript', body=(ROOT/'src/ui/app.js').read_text(encoding='utf-8')+'\n'+HARNESS))
    page = context.new_page()
    errors, checks = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    for width,height in [(1600,800),(1366,768)]:
        page.set_viewport_size({'width':width,'height':height})
        for skin in ['now','d2min','200']:
            page.goto(f'http://127.0.0.1:8806/index.html?dev=newgame&cn=max&tab=forge&skin={skin}')
            page.wait_for_selector('.c-forge', timeout=60000)
            page.evaluate('__forgeOverlay.fill()')
            for where in ['store-bag','store-stash']:
                for index in [0,11,24,35]:
                    page.locator(f'.{where} .inv-cell.filled').nth(index).click()
                    page.mouse.move(0,0)
                    settled(page)
                    data = page.evaluate(MEASURE)
                    data['redOutside'] = red_edges(page, data['box'])
                    data['ok'] = data['error']<0.1 and data['sameSize'] and data['outside'] and data['top'] and data['passive'] and data['direct'] and data['count']==1 and data['redOutside']
                    checks.append({'case':f'{skin}_{width}_{where}_{index}',**data})
            page.locator('.pd-cell.filled').first.click()
            settled(page)
            data = page.evaluate(MEASURE)
            checks.append({'case':f'{skin}_{width}_gear','ok':data['error']<0.1 and data['sameSize'],**data})
            page.locator('.store-bag .inv-cell.filled').first.click()
            page.mouse.move(0,0)
            settled(page)
            page.screenshot(path=str(OUT/f'top_layer_{skin}_{width}.png'))
            page.evaluate('__forgeOverlay.cover()')
            data = page.evaluate(MEASURE)
            checks.append({'case':f'{skin}_{width}_above_inventory','ok':red_edges(page,data['box'])})
            if skin=='200' and width==1600:
                page.screenshot(path=str(OUT/'top_layer_above_ui.png'))
            page.evaluate("document.getElementById('overlay-review-cover').remove()")
            for layer in [30,39,50,51]:
                page.evaluate(f'__forgeOverlay.cover({layer})')
                checks.append({'case':f'{skin}_{width}_below_popup_{layer}','ok':not red_edges(page,data['box'])})
                page.evaluate("document.getElementById('overlay-review-cover').remove()")
    page.evaluate("const grid=document.querySelector('.store-bag .inv-cells'); grid.style.maxHeight='65px'; grid.scrollTop=grid.scrollHeight;")
    settled(page)
    checks.append({'case':'fully_scrolled_out','ok':page.locator('.forge-selection-outline').is_hidden()})
    page.evaluate("document.querySelector('.store-bag .inv-cells').scrollTop=0")
    settled(page)
    checks.append({'case':'scroll_back','ok':page.locator('.forge-selection-outline').is_visible() and page.evaluate(MEASURE)['error']<0.1})
    page.evaluate("document.documentElement.dataset.skin='d2min'; document.documentElement.dataset.skinParts='200'")
    settled(page)
    checks.append({'case':'skin_change_follows','ok':page.evaluate(MEASURE)['error']<0.1})
    page.set_viewport_size({'width':1920,'height':1080})
    settled(page)
    checks.append({'case':'resize_follows','ok':page.evaluate(MEASURE)['error']<0.1})
    page.evaluate("__forgeOverlay.modal('mail')")
    checks.append({'case':'modal_cleanup','ok':page.locator('.forge-selection-outline').count()==0})
    page.evaluate("__forgeOverlay.modal(null); __forgeOverlay.tab('character')")
    checks.append({'case':'tab_cleanup','ok':page.locator('.forge-selection-outline').count()==0})
    result = {'checks':checks,'errors':errors}
    (OUT/'layer_order_result.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    browser.close()
    print(json.dumps({'checks':len(checks),'failed':[c for c in checks if not c['ok']],'errors':errors}))
    assert not errors and all(c['ok'] for c in checks)
