"""Confirm the visible higher-material action using one earned day1 account copy."""
import json
from fun_browser import Session,RUN,OUT,boot,take,write

def main():
    raw=json.loads((RUN/'simulation/checkpoints/state_basic_seed3_86400.json').read_text(encoding='utf-8'))
    s=Session();c,page=s.context(fixed_at=raw['savedAt']+1)
    c.add_init_script('localStorage.setItem("thesevensim.save",'+json.dumps(json.dumps(raw))+');')
    result={}
    try:
        boot(page,s.base);page.locator('.mn-btn').nth(1).click();page.wait_for_function('__fun.G');page.wait_for_timeout(300)
        if page.locator('.notice-float .b-ok').count():page.locator('.notice-float .b-ok').click()
        page.locator('.nav button[data-tab="forge"]').click()
        result['before']=page.evaluate('''()=>({gold:__fun.G.resources.gold,materials:{...__fun.G.materials},make:__fun.SYS.game.makeState(__fun.G,'weapon',20),upgrade:__fun.SYS.game.upgradeState(__fun.G,__fun.G.heroes[0].equipped.weapon)})''')
        page.locator('.fg-tab').filter(has_text='합성').click()
        result['before_screen']=take(page,'material_synth_before')
        first=page.locator('.sy-row button:not(:disabled)')
        if not first.count():first=page.locator('.fg-synth button:not(:disabled)')
        if not first.count():raise RuntimeError('Inspect synthesis selector before clicking')
        result['button']=first.first.inner_text();first.first.click()
        result['after_screen']=take(page,'material_synth_after')
        result['after']=page.evaluate('''()=>({gold:__fun.G.resources.gold,materials:{...__fun.G.materials},make:__fun.SYS.game.makeState(__fun.G,'weapon',20),upgrade:__fun.SYS.game.upgradeState(__fun.G,__fun.G.heroes[0].equipped.weapon)})''')
        result['errors']=s.errors;write('material_synthesis.json',result)
        print(json.dumps({'gold':[result['before']['gold'],result['after']['gold']],'materials_before':result['before']['materials'],'materials_after':result['after']['materials'],'errors':s.errors},ensure_ascii=True),flush=True)
    except Exception as e:
        result['exception']=str(e);result['body']=page.locator('.main').inner_text();write('material_synthesis.json',result);raise
    finally:c.close();s.close()

if __name__=='__main__':main()
