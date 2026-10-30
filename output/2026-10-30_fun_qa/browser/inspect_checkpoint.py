"""Inspect a real simulated save through normal UI and try reversible choices.

Usage: python inspect_checkpoint.py SAVE_PATH LABEL [--return-day]
"""
import json,sys,time
from pathlib import Path
from fun_browser import Session,OUT,boot,take,write

PROFILE_JS='''() => {
 const {G,SYS,D}=__fun,g=SYS.game,now=Date.now();
 return {limits:g.limitsOf(G),guide:g.notificationState(G,now),construction:g.constructionState(G),commissions:g.commissionState(G),
  heroes:G.heroes.map(h=>({uid:h.uid,name:h.name,cls:h.cls,sin:h.sin,level:h.level,combat:g.heroCombat(G,h),gear:g.heroItems(G,h),mastery:g.masteryState(G,h.uid),book:g.bookState(G,h.uid),advance:g.advanceState(G,h.uid,now)})),
  inventory:G.bags.map(b=>b.map(uid=>G.items[uid])),tavern:g.tavernState(G,now),lab:g.labState(G,now),potions:g.potionState(G),
  skillBlueprints:G.blueprints,books:G.books,material:G.materials,mail:G.mail,shop:g.shopState(G,now),exploration:g.exploreState(G,now)};
}'''

def main():
    path=Path(sys.argv[1]);label=sys.argv[2];raw=json.loads(path.read_text(encoding='utf-8'))
    return_day='--return-day' in sys.argv
    # A day1 return from the 60-minute session is 23h after the save; total account age24h.
    now=raw['savedAt']+(23*3600000 if return_day else 1)
    s=Session();c,page=s.context(fixed_at=now)
    c.add_init_script('localStorage.setItem("thesevensim.save",'+json.dumps(json.dumps(raw))+');')
    result={'label':label,'source_save':str(path),'method':'Normal menu Load; fixed Date.now at checkpoint(+1ms) or 24h account-age return from60m. Closing active battle on Load is product behavior. No injected resources/levels. Reversible choices on isolated copy only.','return_day':return_day,'raw_at':raw['savedAt'],'view_at':now,'observations':[],'actions':[]}
    def capture(suffix):
        result['observations'].append(take(page,f'{label}_{suffix}'));write(f'{label}.json',result)
    def click(selector,action):
        page.locator(selector).first.click();result['actions'].append(action)
    try:
        boot(page,s.base)
        click('.mn-btn:nth-of-type(2)','메뉴 불러오기')
        page.wait_for_function('__fun.G && __fun.state.screen==="game"')
        page.wait_for_timeout(1200)
        result['after_load']=page.evaluate('__fun.read()')
        capture('01_return_or_stage')
        notice=page.locator('.notice-float .b-ok')
        if notice.count():click('.notice-float .b-ok','원정 중단 알림 확인')
        result['profile']=page.evaluate(PROFILE_JS)
        if result['profile']['guide']['guide']:
            click('.notification-btn','종 알림 열기')
            click('[data-notification-action="folder-missions"]','임무 폴더 확인')
            capture('02_current_goal')
            page.keyboard.press('Escape')
        for tab in ['character','party','tavern','library','forge','resource','explore','research']:
            nav=page.locator(f'.nav button[data-tab="{tab}"]')
            locked='dim' in (nav.get_attribute('class') or '')
            nav.click();result['actions'].append(f'{tab} 탭 확인'+(' (잠김)' if locked else ''))
            if not locked:capture('tab_'+tab)
        # Inventory decisions: hover up to4 actual gear drops and record what the user can compare.
        click('.nav button[data-tab="character"]','캐릭터로 돌아와 실제 드롭 비교')
        result['comparisons']=[]
        cells=page.locator('.store-bag .inv-cell.filled:not(.box)')
        if not cells.count():cells=page.locator('.bag .inv-cell.filled:not(.box)')
        for i in range(min(4,cells.count())):
            cells.nth(i).hover();page.wait_for_timeout(180)
            result['comparisons'].append({'slot':i,'tooltip':page.locator('#tooltip').inner_text()})
            page.screenshot(path=str(OUT/f'{label}_gear_compare_{i}.png'))
            page.mouse.move(20,20)
        # Spend one available mastery point, inspect its immediate stat feedback, then freely undo.
        chosen=page.evaluate('__fun.G.heroes.find(h=>h.masteryPoints>0)?.uid??null')
        if chosen:
            page.evaluate('(uid)=>{__fun.state.heroUid=uid;__fun.render()}',chosen)
            click('.go-tree','남은 포인트가 있는 영웅의 마스터리 창 열기')
            nodes=page.locator('.sk-cell.can[data-node]')
            result['mastery_choice']={'hero':chosen,'available_cells':nodes.count(),'before':page.evaluate('__fun.SYS.game.heroCombat(__fun.G,__fun.G.heroes.find(h=>h.uid===__fun.state.heroUid))')}
            if nodes.count():
                node=nodes.first.get_attribute('data-node');nodes.first.hover();page.wait_for_timeout(180)
                result['mastery_choice']['node']=node;result['mastery_choice']['tooltip']=page.locator('#tooltip').inner_text()
                capture('mastery_before')
                page.locator(f'.sk-cell[data-node="{node}"]').click()
                result['mastery_choice']['after']=page.evaluate('__fun.SYS.game.heroCombat(__fun.G,__fun.G.heroes.find(h=>h.uid===__fun.state.heroUid))')
                result['mastery_choice']['toast']=page.locator('#toast').inner_text()
                capture('mastery_after')
                page.locator(f'.sk-cell[data-node="{node}"]').click(button='right')
            page.keyboard.press('Escape')
        result['page_errors']=s.errors;result['http_errors']=s.http_errors;result['external_blocked']=s.external
        write(f'{label}.json',result)
        print(json.dumps({'label':label,'levels':[h['level'] for h in result['after_load']['levels']],'gold':result['after_load']['gold'],'bag':result['after_load']['inventory'],'guide':result['profile']['guide']['guide'],'comparisons':len(result.get('comparisons',[])),'errors':s.errors,'http_errors':s.http_errors},ensure_ascii=True),flush=True)
    except Exception as exc:
        result['exception']=str(exc);result['page_errors']=s.errors;write(f'{label}.json',result)
        page.screenshot(path=str(OUT/f'{label}_exception.png'));raise
    finally:c.close();s.close()

if __name__=='__main__':main()
