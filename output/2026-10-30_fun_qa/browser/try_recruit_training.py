"""Try a day1 recruit and three game hours of normal Laboratory training."""
import json
from fun_browser import Session,RUN,OUT,boot,take,write

def main():
    path=RUN/'simulation/checkpoints/state_adaptive_seed4_86400.json';raw=json.loads(path.read_text(encoding='utf-8'))
    s=Session();c,page=s.context(fixed_at=raw['savedAt']+1)
    c.add_init_script('localStorage.setItem("thesevensim.save",'+json.dumps(json.dumps(raw))+');')
    result={'method':'Actual hire/register clicks using earned day1 resources. Three training hours advanced through app clock on isolated copy; no combat carry attempted, no claim that recruits cannot catch up through combat.','actions':[],'screens':[]}
    def click(selector,action):page.locator(selector).first.click();result['actions'].append(action)
    def capture(label):result['screens'].append(take(page,'recruit_'+label));write('recruit_training.json',result)
    try:
        boot(page,s.base);click('.mn-btn:nth-of-type(2)','불러오기');page.wait_for_function('__fun.G');page.wait_for_timeout(300)
        if page.locator('.notice-float .b-ok').count():click('.notice-float .b-ok','중단 알림 확인')
        click('.nav button[data-tab="tavern"]','선술집 열기');capture('candidates')
        before=page.evaluate('__fun.G.heroes.length');click('.tv-cands .b-hire:not(:disabled)','600G 신규 후보 고용')
        newhero=page.evaluate('(before)=>__fun.G.heroes[before]',before);result['hero_before']=newhero;capture('hired')
        click('.nav button[data-tab="resource"]','연구소 열기')
        page.locator('.dp-tree-line').nth(2).locator('.dp-reg-face.empty:not(.lock)').first.click();result['actions'].append('훈련 줄 등록 칸 열기')
        page.locator('.lr-grid .hs-card').nth(before).click();result['actions'].append('새 영웅을 훈련에 등록')
        page.keyboard.press('Escape');page.locator('.dp-tree-line').nth(2).locator('.dp-card').click();capture('training_started')
        result['train_before']=page.evaluate('__fun.SYS.game.labState(__fun.G,Date.now()).lines.find(l=>l.line==="train")')
        page.evaluate('window.__funNow+=3*3600000;__fun.expTick();__fun.render()');page.wait_for_timeout(300)
        result['hero_after']=page.evaluate('(uid)=>__fun.G.heroes.find(h=>h.uid===uid)',newhero['uid']);result['xp_needed']=page.evaluate('(h)=>__fun.SYS.hero.xpNeeded(h.level)',newhero)
        capture('after_three_game_hours');result['errors']=s.errors;result['http_errors']=s.http_errors;write('recruit_training.json',result)
        print(json.dumps({'newHero':[newhero['cls'],newhero['tier'],newhero['level']],'after3h':[result['hero_after']['level'],result['hero_after']['xp']],'needed':result['xp_needed'],'train_cap':result['train_before']['cap'],'actions':len(result['actions']),'errors':s.errors},ensure_ascii=True),flush=True)
    finally:c.close();s.close()

if __name__=='__main__':main()
