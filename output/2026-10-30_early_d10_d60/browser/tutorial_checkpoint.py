"""Replay contextual guides on a real ten-minute save without injected loot/XP."""
import json
from fun_browser import Session, OUT, RUN, boot, take, write


def main():
    raw=json.loads((RUN/'simulation/pilot/checkpoints/state_passive_seed1_600.json').read_text(encoding='utf-8'))
    s=Session(); c,page=s.context(fixed_at=raw['savedAt']+1)
    c.add_init_script('localStorage.setItem("thesevensim.save",'+json.dumps(json.dumps(raw))+');')
    result={'method':'Natural passive seed1 ten-minute state. Normal Load and settings Replay tutorials. No resource, item, rank or level injection.', 'checks':[],'observations':[]}
    def check(name,ok,detail=None):
        result['checks'].append({'name':name,'ok':bool(ok),'detail':detail})
        write('tutorial_checkpoint.json',result)
        if not ok:raise AssertionError(name)
    def active():
        n=page.locator('.tutorial-card')
        return n.get_attribute('data-tutorial')if n.count()else None
    def capture(label):
        result['observations'].append(take(page,label));write('tutorial_checkpoint.json',result)
    try:
        boot(page,s.base)
        page.locator('.mn-btn:nth-of-type(2)').click()
        page.wait_for_function('__fun.G&&__fun.state.screen==="game"')
        page.locator('.notice-float .b-ok').click()if page.locator('.notice-float .b-ok').count()else None
        page.locator('.nav button[data-tab="character"]').click()
        page.locator('.dp-btn').click()
        page.locator('.tutorial-replay').click()
        check('natural ten-minute spare gear triggers loot guide',active()=='loot')
        check('loot guide targets actual inventory cell',page.locator('.store-bag .inv-cell.filled:not(.box).tutorial-target').count()==1)
        page.locator('.store-bag .inv-cell.filled:not(.box)').first.hover()
        page.wait_for_timeout(200)
        check('actual gear comparison opens above tutorial',page.locator('#tooltip.show .tip-compare').count()==1)
        capture('tutorial_natural_loot')
        page.mouse.move(10,10)
        page.locator('.tutorial-confirm').click()
        page.locator('.go-tree.has-points').click()
        check('natural earned points trigger mastery guide',active()=='mastery')
        check('mastery tutorial targets real learnable node',page.locator('.sk-cell.can.tutorial-target[data-node]').count()==1)
        node=page.locator('.sk-cell.can.tutorial-target[data-node]').get_attribute('data-node')
        result['real_node']=node
        capture('tutorial_natural_mastery')
        before=page.evaluate('__fun.G.heroes.find(h=>h.uid===__fun.state.heroUid).masteryPoints')
        page.locator('.tutorial-confirm').click()
        page.locator(f'.sk-cell[data-node="{node}"]').click()
        after=page.evaluate('__fun.G.heroes.find(h=>h.uid===__fun.state.heroUid).masteryPoints')
        check('actual node spends one earned mastery point',after==before-1,{'before':before,'after':after})
        page.locator(f'.sk-cell[data-node="{node}"]').click(button='right')
        refunded=page.evaluate('__fun.G.heroes.find(h=>h.uid===__fun.state.heroUid).masteryPoints')
        check('actual right-click restores that point free',refunded==before,{'before':before,'refunded':refunded})
        check('no runtime or HTTP errors',not s.errors and not s.http_errors,[s.errors,s.http_errors])
        result['page_errors'],result['http_errors']=s.errors,s.http_errors
        write('tutorial_checkpoint.json',result)
        print(json.dumps({'passed':sum(x['ok']for x in result['checks']),'checks':len(result['checks'])}),flush=True)
    except Exception as exc:
        result['exception']=str(exc);write('tutorial_checkpoint.json',result)
        page.screenshot(path=str(OUT/'tutorial_checkpoint_exception.png'));raise
    finally:c.close();s.close()

if __name__=='__main__':main()
