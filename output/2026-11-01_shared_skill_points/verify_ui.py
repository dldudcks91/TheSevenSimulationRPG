from functools import partial
import json
import sys
from threading import Thread
from playwright.sync_api import sync_playwright
from verify import ROOT, OUT, Handler, Server

HARNESS = r'''
window.__skillPointReview = {
    ready:()=>!!SYS?.game && !!G,
    setup(level=30,points=4) {
        const rng=makeRng(20261101);
        G=SYS.game.newGame(20261101,['warrior','knight','priest'].map(cls=>SYS.hero.rollHeroOf(rng,cls)),now());
        const h=G.heroes[0]; h.level=level; h.masteryPoints=points;
        h.advance=SYS.game.advanceState(G,h.uid,now()).branches[0].id;
        state.tab='character'; state.heroUid=h.uid; state.modal='skill';
        writeTutorialSeen(tutorialOwner(),['expedition','loot','mastery','potions','construction','laboratory']);
        tutorial.reset(); render();
        return this.snapshot();
    },
    levelTo(level) {
        const h=G.heroes[0];
        while(h.level<level)SYS.hero.grantXp(h,SYS.hero.xpNeeded(h.level)-h.xp,makeRng(1));
        render();return this.snapshot();
    },
    snapshot() {
        const h=G.heroes[0],a=SYS.game.advanceState(G,h.uid,now()).hero;
        return {points:h.masteryPoints,level:h.level,skill:h.advanceSkill,lv:a.lv,have:a.points.have,canLearn:a.canLearn,canLevelUp:a.canLevelUp,nextLevel:a.nextLevel};
    }
};
'''

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    server=Server(('127.0.0.1',0),partial(Handler,directory=str(ROOT/'src')))
    thread=Thread(target=server.serve_forever,daemon=True);thread.start()
    result={'checks':[],'errors':[],'screenshots':[]}
    def check(name,ok):
        result['checks'].append({'name':name,'ok':bool(ok)})
        if not ok: raise AssertionError(name)
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(channel='msedge',headless=True)
            for skin,lang,width,height in [('d2min','ko',1600,900),('now','en',1600,900),('d2min','en',1366,768),('now','ko',1366,768)]:
                prefix=f'{skin}-{lang}-{width}'
                context=browser.new_context(viewport={'width':width,'height':height})
                context.route('https://**',lambda route:route.abort())
                context.route('**/ui/app.js',lambda route:route.fulfill(status=200,content_type='text/javascript',body=(ROOT/'src/ui/app.js').read_text(encoding='utf-8')+HARNESS))
                page=context.new_page();page.on('pageerror',lambda error:result['errors'].append(str(error)))
                page.goto(f'http://127.0.0.1:{server.server_port}/index.html?dev=newgame&lang={lang}&skin={skin}',wait_until='domcontentloaded')
                page.wait_for_function('window.__skillPointReview?.ready()')
                snap=page.evaluate('()=>__skillPointReview.setup()')
                root=page.locator('[data-advskill="war_ragnarok"]')
                check(prefix+': existing points can learn at Lv30',snap['points']==4 and snap['canLearn'] and 'can' in root.get_attribute('class'))
                check(prefix+': no separate advancement point row',page.locator('.sk-adv-pts').count()==0)
                root.click()
                snap=page.evaluate('()=>__skillPointReview.snapshot()')
                check(prefix+': main learning spends shared point',snap['points']==3 and snap['lv']==1 and snap['have']==4)
                check(prefix+': next rank dimmed below Lv35','can' not in root.get_attribute('class'))
                root.hover()
                page.wait_for_timeout(350)
                check(prefix+': next hero level shown in tooltip','35' in page.locator('.tip-card').last.inner_text())
                root.click()
                check(prefix+': blocked click preserves shared points',page.evaluate('()=>__skillPointReview.snapshot().points')==3)
                node=page.locator('#modal [data-node].can').first
                node_id=node.get_attribute('data-node');node.click()
                check(prefix+': mastery shares wallet',page.evaluate('()=>__skillPointReview.snapshot().points')==2)
                page.locator(f'#modal [data-node="{node_id}"]').click(button='right')
                check(prefix+': mastery refund shared',page.evaluate('()=>__skillPointReview.snapshot().points')==3)
                snap=page.evaluate('()=>__skillPointReview.levelTo(31)')
                check(prefix+': one level grants point without new main rank',snap['points']==4 and not snap['canLevelUp'] and snap['lv']==1)
                snap=page.evaluate('()=>__skillPointReview.levelTo(35)')
                check(prefix+': rank unlock independent of wallet',snap['points']==8 and snap['canLevelUp'])
                page.locator('[data-advskill="war_ragnarok"]').click()
                snap=page.evaluate('()=>__skillPointReview.snapshot()')
                check(prefix+': rank two costs only one shared point',snap['points']==7 and snap['lv']==2 and not snap['canLevelUp'] and snap['nextLevel']==40)
                path=OUT/f'{prefix}-rank2.png';page.screenshot(path=str(path),full_page=True);result['screenshots'].append(path.name)
                page.locator('[data-advskill="war_ragnarok"]').click(button='right')
                snap=page.evaluate('()=>__skillPointReview.snapshot()')
                check(prefix+': main refund returns both points',snap['points']==9 and snap['lv']==0 and snap['canLearn'])
                snap=page.evaluate('()=>__skillPointReview.setup(30,0)')
                page.locator('[data-advskill="war_ragnarok"]').click()
                after=page.evaluate('()=>__skillPointReview.snapshot()')
                check(prefix+': advancement does not create a new point',not snap['canLearn'] and after['points']==0 and after['lv']==0)
                check(prefix+': skill dialog fits viewport',page.locator('#modal').evaluate('n=>n.getBoundingClientRect().right<=innerWidth+1'))
                context.close()
            browser.close()
    finally:
        server.shutdown();server.server_close();thread.join(timeout=5)
        (OUT/'ui.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'passed':sum(x['ok'] for x in result['checks']),'checks':len(result['checks']),'errors':result['errors']},ensure_ascii=False))

if __name__=='__main__':main()
