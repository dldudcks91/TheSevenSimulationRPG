"""Exercise all specified party conditions in the real Korean/English party screen."""
from functools import partial
import json
from threading import Thread
from playwright.sync_api import sync_playwright
from verify import ROOT, OUT, QuietHandler, LocalServer

HARNESS = r'''
window.__partyTacticReview = {
    options: () => SYS?.tactic?.families.filter(f => f.category === 'party').map(f => ({id:f.id, kind:f.condKind, arg:f.condArg})) ?? [],
    setup(id, match = true) {
        const f = SYS.tactic.families.find(f => f.id === id);
        const sin = f.condKind === 'sin_count';
        const classes = SYS.hero.mainClasses;
        const other = classes.find(c => c !== f.condArg);
        const cls = sin ? ['knight','archer','priest'] : (match ? [f.condArg,f.condArg,other] : [other,other,other]);
        const rng = makeRng(20261101);
        G = SYS.game.newGame(20261101, cls.map(c => SYS.hero.rollHeroOf(rng,c)), 0);
        G.buildings.command = 7;
        G.resources.gold = 100000000;
        const p = G.presets[0];
        p.tactics.slots[2] = {id,grade:'rare'};
        for (const h of G.heroes) h.stats.ldr = 10;
        if (sin) {
            const otherSin=Object.keys(M.SINS).find(s=>s!==f.condArg);
            for (const h of G.heroes.slice(0,3)) h.sin=match?f.condArg:otherSin;
            G.heroes[3].sin=f.condArg;
        } else G.heroes[3].cls=f.condArg;
        state.tab='party'; state.heroUid=p.party[0];
        writeTutorialSeen(tutorialOwner(),['expedition','loot','mastery','potions','construction','laboratory']);
        tutorial.reset(); render();
        return this.snapshot();
    },
    snapshot() { return SYS.game.tacticState(G).slots[1]; },
    lockOthers() {
        for (const s of SYS.game.tacticState(G).slots) if(s.no!==2&&!s.locked) SYS.game.toggleTacticLock(G,s.no);
        render();
        return {ids:SYS.game.tacticState(G).slots.map(s=>s.option.id),counter:G.counters.tactic,gold:G.resources.gold,cost:SYS.game.tacticState(G).rerollCost};
    },
    pvp() {
        const before=SYS.arena.snapshotTeam(G.heroes.slice(0,3),G.items);
        const after=SYS.arena.snapshotTeam(G.heroes.slice(0,3),G.items,{},SYS.game.arenaLoadout(G));
        return {
            before:before.map(x=>x.combat.action_period),after:after.map(x=>x.combat.action_period),
            healBefore:before.map(x=>x.combat.option_fx?.healOut??0),healAfter:after.map(x=>x.combat.option_fx?.healOut??0),
        };
    },
    state() {return {ids:SYS.game.tacticState(G).slots.map(s=>s.option.id),counter:G.counters.tactic,gold:G.resources.gold};}
};
'''

NAMES = {
    'wrath': ('분노','Wrath'), 'envy': ('시기','Envy'), 'greed': ('탐욕','Greed'),
    'sloth': ('나태','Sloth'), 'gluttony': ('폭식','Gluttony'), 'lust': ('색욕','Lust'), 'pride': ('오만','Pride'),
    'warrior': ('전사','Warrior'), 'knight': ('기사','Knight'), 'mage': ('마법사','Mage'),
    'archer': ('궁수','Archer'), 'priest': ('사제','Priest'),
}


def main():
    server = LocalServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT / 'src')))
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    result = {'checks': [], 'errors': [], 'screenshots': []}

    def check(name, ok):
        result['checks'].append({'name': name, 'ok': bool(ok)})
        if not ok:
            raise AssertionError(name)

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(channel='msedge', headless=True)
            for skin, language, width, height in [('d2min','ko',1600,900),('now','en',1600,900),('d2min','ko',1366,768),('now','en',1366,768)]:
                prefix = f'{skin}-{language}-{width}'
                context = browser.new_context(viewport={'width':width,'height':height})
                context.route('https://**', lambda route: route.abort())
                context.route('**/ui/app.js', lambda route: route.fulfill(status=200,content_type='text/javascript',body=(ROOT/'src/ui/app.js').read_text(encoding='utf-8')+HARNESS))
                page = context.new_page()
                page.on('pageerror', lambda error: result['errors'].append(str(error)))
                page.goto(f'http://127.0.0.1:{server.server_port}/index.html?dev=newgame&lang={language}&skin={skin}', wait_until='domcontentloaded')
                page.wait_for_function('globalThis.__partyTacticReview && __partyTacticReview.options().length === 12')
                options = page.evaluate('() => __partyTacticReview.options()')
                for option in options:
                    for match in (True, False):
                        slot = page.evaluate('a => __partyTacticReview.setup(a.id,a.match)', {'id':option['id'],'match':match})
                        row = page.locator('.rs-cell').nth(1)
                        cond = row.locator('.rs-cond').inner_text()
                        check(f'{prefix}: {option["id"]} match={match}',
                              slot['active'] is match and slot['have'] == (slot['need'] if match else 0)
                              and str(slot['need']) in cond
                              and NAMES[option['arg']][0 if language=='ko' else 1] in cond
                              and row.locator('.rs-cnt').inner_text() == f'{slot["have"]} / {slot["need"]}')
                page.evaluate("() => __partyTacticReview.setup('opt_party_cls_mage',true)")
                pvp = page.evaluate('() => __partyTacticReview.pvp()')
                check(prefix+': caster speed reaches PvP snapshot',all(b<a for a,b in zip(pvp['before'][:2],pvp['after'][:2])))
                page.evaluate("() => __partyTacticReview.setup('opt_party_cls_priest',true)")
                pvp = page.evaluate('() => __partyTacticReview.pvp()')
                check(prefix+': healing done reaches PvP snapshot',all(b>a for a,b in zip(pvp['healBefore'],pvp['healAfter'])))
                before = page.evaluate('() => __partyTacticReview.lockOthers()')
                page.locator('.rs-roll').click()
                after = page.evaluate('() => __partyTacticReview.state()')
                check(prefix+': reroll changes only slot 2 and charges once',
                      after['ids'][1]!=before['ids'][1] and after['counter']==before['counter']+1
                      and after['gold']==before['gold']-before['cost']
                      and all(a==b for i,(a,b) in enumerate(zip(after['ids'],before['ids'])) if i!=1))
                page.evaluate("() => __partyTacticReview.setup('opt_party_sin_gluttony',true)")
                check(prefix+': condition and page fit horizontally',
                      page.locator('.rs-cond').evaluate_all('ns => ns.every(n=>n.scrollWidth<=n.clientWidth+1)')
                      and page.evaluate('document.body.scrollWidth<=innerWidth'))
                screenshot = f'{prefix}.png'
                page.screenshot(path=str(OUT/screenshot))
                result['screenshots'].append(screenshot)
                context.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
        (OUT/'ui.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    assert not result['errors'], result['errors']
    before = json.loads((OUT/'before.json').read_text(encoding='utf-8'))
    after = json.loads((OUT/'after.json').read_text(encoding='utf-8'))
    changed = [(a['seed'],i+1) for a,b in zip(before['initialAssignments'],after['initialAssignments']) for i,(x,y) in enumerate(zip(a['slots'],b['slots'])) if i!=1 and x!=y]
    assert not changed, changed[:10]
    comparison = {'seeds':len(before['initialAssignments']),'otherSlotsCompared':len(before['initialAssignments'])*6,'otherSlotChanges':len(changed)}
    (OUT/'initial_comparison.json').write_text(json.dumps(comparison,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'checks':len(result['checks']),'failed':sum(not x['ok'] for x in result['checks']),'errors':result['errors'],'screenshots':result['screenshots']},ensure_ascii=False))


if __name__=='__main__':
    main()
