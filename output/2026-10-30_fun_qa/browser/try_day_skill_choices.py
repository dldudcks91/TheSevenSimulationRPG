"""Try earned book/advance choices with real UI, then compare one paired engine battle.

This measures usability and causal feedback, not engagement, win-rate, or new progression time.
"""
import json
from pathlib import Path
from fun_browser import Session,RUN,OUT,boot,take,write

COMPARE_JS='''(pair)=>{
 const {SYS}=__fun,g=SYS.game;
 return pair.states.map(raw=>{
  const copy=g.deserialize(raw),r=g.resolveBattle(copy,pair.stage,Date.now(),1);
  if(!r.ok)return r;
  const casts={};for(const e of r.result.timeline)if(e.e==='skill'&&e.u?.startsWith('p'))casts[e.s]=(casts[e.s]??0)+1;
  return {ok:true,won:r.report.won,reason:r.report.reason,duration:r.report.durationSec,rounds:r.report.roundsCleared,downed:r.report.downed.length,casts};
 });
}'''

def run_case(s,policy,seed,label,advance=False):
    path=RUN/f'simulation/checkpoints/state_{policy}_seed{seed}_86400.json'
    raw=json.loads(path.read_text(encoding='utf-8'));c,page=s.context(fixed_at=raw['savedAt']+1)
    c.add_init_script('localStorage.setItem("thesevensim.save",'+json.dumps(json.dumps(raw))+');')
    result={'label':label,'input':str(path),'actions':[],'screens':[],'scope':'Real UI decisions using earned gold/materials on isolated copy; one paired deterministic battle is causal demonstration, not progression or win-rate estimate.'}
    def click(selector,action):page.locator(selector).first.click();result['actions'].append(action)
    def capture(name):result['screens'].append(take(page,label+'_'+name));write(label+'.json',result)
    try:
        boot(page,s.base);click('.mn-btn:nth-of-type(2)','불러오기');page.wait_for_function('__fun.G');page.wait_for_timeout(300)
        if page.locator('.notice-float .b-ok').count():click('.notice-float .b-ok','중단 알림 확인')
        stage=page.evaluate('__fun.G.runs[0]?.stageId ?? __fun.G.reports[0].stageId')
        before=page.evaluate('__fun.snapshot()')
        click('.nav button[data-tab="library"]','도서관으로 이동')
        result['state_before']=page.evaluate('__fun.read()');capture('library_before')
        if not advance:
            choice=page.evaluate('''()=>{const {G,SYS}=__fun,h=G.heroes[0],b=SYS.game.bookState(G,h.uid);const cs=SYS.item.groupOf(G.items[h.equipped.weapon])?.classes??[];return b.craft.map((c,i)=>({...c,index:i,def:SYS.skill.defs[c.id]})).find(c=>!c.err&&c.id!==h.innate&&c.def.classId===h.cls&&SYS.skill.fitsWeapon(c.def,cs));}''')
            if not choice:raise RuntimeError('No affordable compatible new book in real inventory')
            result['choice']={'id':choice['id'],'gold':choice['gold'],'dust':choice['dust'],'herb':choice['herb']}
            page.locator('[data-keep="library-craft"] .bk-grid .inv-cell').nth(choice['index']).hover();page.wait_for_timeout(180)
            result['choice']['tooltip']=page.locator('#tooltip').inner_text();capture('book_tooltip')
            page.locator('[data-keep="library-craft"] .bk-grid .inv-cell').nth(choice['index']).click();result['actions'].append('호환되는 새 스킬 도안 선택')
            click('[data-keep="library-craft"] .bk-buy .primary','1000G·가루10·약초10으로 책 제작')
            # A previously empty learned-skill slot gains one actual skill.
            book_index=page.evaluate('(id)=>__fun.SYS.game.bookState(__fun.G,__fun.G.heroes[0].uid).books.findIndex(b=>b.id===id)',choice['id'])
            page.locator('[data-keep="library-learn"] .bk-grid .inv-cell').nth(book_index).click();result['actions'].append('제작한 책 선택')
            click('[data-keep="library-learn"] .bk-buy .primary','새 습득 스킬 배우기')
            capture('book_learned')
        else:
            result['choice']=page.evaluate('__fun.SYS.game.advanceState(__fun.G,__fun.G.heroes[0].uid,Date.now())')
            click('.tr-adv-branch.can-pick','첫 전직 갈래 선택(3갈래 중1)')
            click('.tr-adv-go','50000G 전직 확정')
            capture('advanced_no_skill_yet')
            click('.nav button[data-tab="character"]','캐릭터로 이동')
            click('.go-tree','마스터리·전직 스킬 창 열기')
            choices=page.locator('.sk-cell.can[data-advskill]')
            result['available_advance_skills']=choices.count()
            choices.first.hover();page.wait_for_timeout(180);result['advance_tooltip']=page.locator('#tooltip').inner_text()
            capture('advance_skill_choices')
            choices.first.click();result['actions'].append('전직 포인트로3개 중1개스킬 습득')
            capture('advance_skill_learned');page.keyboard.press('Escape')
        after=page.evaluate('__fun.snapshot()')
        result['state_after']=page.evaluate('__fun.read()')
        result['paired_battle']=page.evaluate(COMPARE_JS,{'states':[before,after],'stage':stage})
        write(label+'.json',result)
        print(json.dumps({'label':label,'actions':len(result['actions']),'paired_battle':result['paired_battle'],'new_skills':result['state_after']['levels'][0]},ensure_ascii=True),flush=True)
    except Exception as e:
        result['exception']=str(e);write(label+'.json',result);page.screenshot(path=str(OUT/(label+'_exception.png')));raise
    finally:c.close()

def main():
    s=Session()
    try:
        run_case(s,'basic',3,'day_weak_book',False)
        run_case(s,'adaptive',4,'day_strong_advance',True)
        write('day_choices_errors.json',{'page_errors':s.errors,'http_errors':s.http_errors,'external':s.external})
    finally:s.close()

if __name__=='__main__':main()
