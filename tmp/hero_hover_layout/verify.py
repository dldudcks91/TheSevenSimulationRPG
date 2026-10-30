import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
CHECKS = []
ERRORS = []


def check(name, passed):
    CHECKS.append(name)
    if not passed:
        raise AssertionError(name)


MEASURE = '''() => {
    const card=document.querySelector('#tooltip .tip-card.unit');
    const gear=card.querySelector('.tip-equipment');
    const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,cssW:parseFloat(getComputedStyle(n).width)};};
    return {base:rect(card.querySelector('.base')),gear:rect(gear),
        rows:[...gear.children].filter((_,i)=>i%3===0).map(rect),
        skills:[...card.querySelectorAll('.tip-skills .tip-skill')].map(n=>({...rect(n),vacant:n.classList.contains('vacant'),lv:n.querySelector('.sk-lv')?.textContent??null,img:n.querySelector('img')?.getAttribute('src')??null,background:getComputedStyle(n).backgroundImage,padding:parseFloat(getComputedStyle(n).paddingTop)})),
        details:card.querySelectorAll('.d1,.d2').length};
}'''


with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='msedge', headless=True)
    for skin, language in [('d2min', 'ko'), ('now', 'en')]:
        context = browser.new_context(viewport={'width': 1600, 'height': 900})
        context.route('https://**', lambda route: route.abort())
        context.route('**/ui/app.js', lambda route: route.fulfill(
            status=200, content_type='text/javascript',
            body=(ROOT/'src/ui/app.js').read_text(encoding='utf-8') +
            '\n;globalThis.__heroHover={get G(){return G},get SYS(){return SYS},activeCells,render,state,combatOf,itemOf};'))
        page = context.new_page()
        page.set_default_timeout(15000)
        page.on('pageerror', lambda error: ERRORS.append(str(error)))
        page.goto(f'http://127.0.0.1:8777/index.html?dev=newgame&tab=party&lang={language}&skin={skin}', wait_until='networkidle')
        page.wait_for_selector('.hs-card[data-tip]')
        page.locator('.hs-card[data-tip]').first.hover()
        page.wait_for_selector('#tooltip.show .tip-gear-below.with-skills')
        initial = page.evaluate(MEASURE)
        check(f'{skin}: three slots including two unlearned slots', len(initial['skills']) == 3 and sum(s['vacant'] for s in initial['skills']) == 2)
        check(f'{skin}: new hero has a lock only in the advance slot', page.locator('#tooltip .tip-skill.locked').count()==1 and page.locator('#tooltip .tip-skill').nth(2).locator('.sk-lock svg').count()==1)
        page.screenshot(path=str(OUT/f'{skin}_unlearned.png'))

        for level in [29, 30]:
            page.mouse.move(1550, 870)
            page.evaluate('''level => { const a=__heroHover; a.G.heroes[0].level=level; a.render(); }''', level)
            page.locator('.hs-card[data-tip]').first.hover()
            page.wait_for_selector('#tooltip.show .tip-gear-below.with-skills')
            slot=page.locator('#tooltip .tip-skill').nth(2)
            check(f'{skin}: level {level} advance lock boundary', slot.locator('.sk-lock svg').count()==(1 if level<30 else 0) and slot.locator('img').count()==0)
            if level<30:
                centered=slot.evaluate('''n => {
                    const a=n.getBoundingClientRect(), b=n.querySelector('.sk-lock').getBoundingClientRect();
                    return Math.abs(a.x+a.width/2-b.x-b.width/2)<0.5 && Math.abs(a.y+a.height/2-b.y-b.height/2)<0.5;
                }''')
                check(f'{skin}: advance lock stays centered in the original slot', centered)
                page.locator('#tooltip').screenshot(path=str(OUT/f'{skin}_advance_locked_29.png'))
                page.keyboard.down('Alt')
                page.wait_for_selector('#tooltip .tip-card.alt .d2')
                check(f'{skin}: Alt preserves advance lock', page.locator('#tooltip .tip-skill.locked .sk-lock svg').count()==1)
                page.keyboard.up('Alt')

        expected = page.evaluate('''() => {
            const a=__heroHover, h=a.G.heroes[0];
            const defs=Object.values(a.SYS.skill.defs);
            h.bookSkill=defs.find(d=>d.ownerKind==='job' && d.id!==h.innate).id;
            h.advanceSkill=defs.find(d=>d.ownerKind==='advance').id;
            h.skillLv={[h.innate]:2,[h.bookSkill]:1}; h.advanceUp=3;
            h.skillOrder=[h.advanceSkill,h.bookSkill,h.innate];
            a.render();
            return a.activeCells(h).map(s=>({lv:s.lv,id:s.id}));
        }''')
        page.mouse.move(1550, 870)
        page.locator('.hs-card[data-tip]').first.hover()
        page.wait_for_selector('#tooltip.show .tip-gear-below.with-skills')
        normal = page.evaluate(MEASURE)
        (OUT/f'{skin}_measurements.json').write_text(json.dumps(normal,indent=2),encoding='utf-8')
        check(f'{skin}: all learned slots display their actual level in source order', [s['lv'] for s in normal['skills']] == [f"Lv.{s['lv']}" for s in expected])
        scale = normal['base']['w']/278
        check(f'{skin}: equipment moves left and skills stay to its right', normal['gear']['x'] < normal['base']['x'] + (normal['base']['w'] - normal['gear']['w'])/2 and normal['skills'][0]['x'] >= normal['gear']['x']+normal['gear']['w']+11*scale)
        check(f'{skin}: equipment to skill gap increases to 20px', abs((normal['skills'][0]['x']-normal['gear']['x']-normal['gear']['w'])/scale-20)<0.1)
        check(f'{skin}: three skill slots align with equipment rows', all(abs(row['y']-skill['y']) < 0.5 and abs(skill['cssW']-53)<0.1 and abs(skill['h']-row['h'])<0.5 for row,skill in zip(normal['rows'],normal['skills'])))
        check(f'{skin}: base column retains width', abs(normal['base']['cssW']-278)<0.1)
        check(f'{skin}: skill icons load', page.locator('#tooltip .tip-skills img').evaluate_all('nodes=>nodes.length===3 && nodes.every(n=>n.complete&&n.naturalWidth>0)'))
        page.screenshot(path=str(OUT/f'{skin}_hero_hover.png'))
        page.locator('#tooltip').screenshot(path=str(OUT/f'{skin}_hero_hover_detail.png'))
        page.keyboard.down('Alt')
        page.wait_for_selector('#tooltip .tip-card.alt .d2')
        expanded = page.evaluate(MEASURE)
        check(f'{skin}: Alt preserves equipment and skill position', abs(normal['gear']['x']-expanded['gear']['x']) < .5 and all(abs(s['x']-e['x'])<.5 and abs(s['y']-e['y'])<.5 for s,e in zip(normal['skills'],expanded['skills'])))
        page.locator('#tooltip .pd-cell[data-equip-i]').first.hover()
        page.wait_for_selector('#equipment-item-tooltip.show')
        check(f'{skin}: equipped item hover still opens', page.locator('#equipment-item-tooltip.show').count()==1)
        page.screenshot(path=str(OUT/f'{skin}_hero_alt.png'))
        page.keyboard.up('Alt')
        page.mouse.move(1550, 870)
        check(f'{skin}: tooltip closes on leave', page.locator('#tooltip.show').count()==0)

        # The same builder is used by battle cards; a monster still uses its original equipment-only layout.
        monster = page.evaluate('''async () => {
            const {monsterTipCard}=await import('./ui/tip.js');
            const h=__heroHover.G.heroes[0];
            const card=monsterTipCard({monsterId:'101101',grade:'normal',stats:h.stats,gear:[]});
            return {gear:card.querySelectorAll('.tip-gear-below .tip-equipment').length,skills:card.querySelectorAll('.tip-skills').length};
        }''')
        check(f'{skin}: monster keeps its existing layout', monster['gear']==1 and monster['skills']==0)
        character_style = page.evaluate('''() => {
            const a=__heroHover; a.state.tab='character'; a.state.heroUid=a.G.heroes[0].uid; a.render();
            const s=getComputedStyle(document.querySelector('.sk-card:not(.vacant)'));
            return {background:s.backgroundImage,padding:parseFloat(s.paddingTop)};
        }''')
        check(f'{skin}: skill frame and artwork inset match character window', normal['skills'][0]['background']==character_style['background'] and abs(normal['skills'][0]['padding']-character_style['padding'])<0.1)
        if skin=='d2min':
            check(f'{skin}: gray slot frame is visible behind every skill', all('url(' in s['background'] and abs(s['padding']-6)<0.1 for s in normal['skills']))
        context.close()
    check('no browser runtime errors', not ERRORS)
    browser.close()

result = {'passed': len(CHECKS), 'checks': CHECKS, 'errors': ERRORS}
(OUT/'results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(result, ensure_ascii=True), flush=True)
