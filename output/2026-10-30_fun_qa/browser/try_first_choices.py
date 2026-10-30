"""Spend earned first-session resources through real controls on an isolated saved copy."""
import json
from fun_browser import Session,OUT,boot,take,write

def main():
    raw=json.loads((OUT/'native_90s_save.json').read_text(encoding='utf-8'))
    s=Session();c,page=s.context(fixed_at=raw['savedAt']+1)
    c.add_init_script('localStorage.setItem("thesevensim.save",'+json.dumps(json.dumps(raw))+');')
    result={'method':'Isolated continuation of actual90s account, using only earned gold/point. Normal Load closes prior active battle; timings here are click steps, not continuous first-session reward timestamps.','actions':[],'observations':[]}
    def click(selector,label):page.locator(selector).first.click();result['actions'].append(label)
    def capture(label):result['observations'].append(take(page,'first_choice_'+label));write('first_choices.json',result)
    try:
        boot(page,s.base);click('.mn-btn:nth-of-type(2)','불러오기');page.wait_for_function('__fun.G');page.wait_for_timeout(300)
        if page.locator('.notice-float .b-ok').count():click('.notice-float .b-ok','중단 알림 확인')
        click('.nav button[data-tab="character"]','캐릭터')
        before=page.evaluate('__fun.SYS.game.heroCombat(__fun.G,__fun.G.heroes[0])')
        click('.go-tree','마스터리 열기')
        hp=page.locator('.sk-cell[data-node="cls_knight_t1_hp"]')
        hp.hover();page.wait_for_timeout(180)
        result['hp_tooltip']=page.locator('#tooltip').inner_text();capture('hp_before')
        hp.click();result['hp_before']=before;result['hp_after']=page.evaluate('__fun.SYS.game.heroCombat(__fun.G,__fun.G.heroes[0])')
        capture('hp_after');page.keyboard.press('Escape')
        # The first goal points to the Trading House, which the earned wallet can actually build.
        click('.nav button[data-tab="research"]','건설')
        page.locator('.cn-lot').filter(has_text='상단').click();result['actions'].append('상단 부지 선택')
        result['first_build_cost']=page.evaluate('__fun.SYS.game.constructionState(__fun.G).buildings.find(b=>b.id==="shop").next')
        capture('shop_cost');click('.cn-go','600G 상단 건설')
        result['after_build']=page.evaluate('__fun.read()');capture('shop_built')
        click('.nav button[data-tab="shop"]','처음 열린 상점')
        shop=page.evaluate('__fun.SYS.game.shopState(__fun.G,Date.now())')
        result['shop']=shop;capture('shop_goods')
        result['shop_comparisons']=[]
        for i in range(3):
            cell=page.locator('.td-group[data-part="weapon"] .inv-cell.filled').nth(i)
            cell.hover();page.wait_for_timeout(180)
            result['shop_comparisons'].append(page.locator('#tooltip').inner_text())
            page.screenshot(path=str(OUT/f'first_choice_shop_compare_{i}.png'))
            page.mouse.move(20,20)
        # Evaluate affordability/fit without inventing a free purchase or a guaranteed useful offer.
        result['affordable_fitting_weapons']=page.evaluate('''()=>{const {G,SYS}=__fun;const S=SYS.game.shopState(G,Date.now());return S.equip.filter(x=>!x.locked&&!x.sold&&x.gold<=G.resources.gold).map(x=>({name:x.item.name,ilvl:x.item.ilvl,gold:x.gold,fits:G.heroes.filter(h=>SYS.item.fitsClass(x.item,h.cls)).map(h=>h.uid),item:x.item}));}''')
        result['errors']=s.errors;result['http_errors']=s.http_errors;write('first_choices.json',result)
        print(json.dumps({'hp':[result['hp_before']['hp_max'],result['hp_after']['hp_max']],'gold_after_build':result['after_build']['gold'],'offers':len(result['affordable_fitting_weapons']),'errors':s.errors},ensure_ascii=True),flush=True)
    finally:c.close();s.close()

if __name__=='__main__':main()
