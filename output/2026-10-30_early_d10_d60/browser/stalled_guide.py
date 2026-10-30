"""Real live-session save preserves the guide eligibility that normal Load clears."""
import json
from fun_browser import Session, RUN, OUT, boot, take, write


def main():
    raw=json.loads((RUN/'simulation/pilot/checkpoints/state_basic_seed11_3600.json').read_text(encoding='utf-8'))
    s=Session();c,page=s.context(fixed_at=raw['savedAt'])
    result={'method':'Restore genuine online seed11 60-minute checkpoint without changing reports or resources. Separate from normal Load, which intentionally closes current run and clears live guide eligibility. Guide, shortcut and free reset use actual UI clicks.', 'checks':[],'observations':[]}
    def check(name,ok,detail=None):
        result['checks'].append({'name':name,'ok':bool(ok),'detail':detail});write('stalled_guide.json',result)
        if not ok:raise AssertionError(name)
    def capture(label):result['observations'].append(take(page,label));write('stalled_guide.json',result)
    try:
        boot(page,s.base)
        page.evaluate('raw=>__fun.restore(raw)',raw)
        actual=page.evaluate('__fun.SYS.game.notificationState(__fun.G,Date.now()).guide')
        check('genuine online stall exposes preparation guide',actual['id']=='retryPreparation',actual)
        page.locator('.notification-btn').click()
        page.locator('[data-notification-action="folder-missions"]').click()
        text=page.locator('.notification-guide').inner_text()
        check('guide names actual nineteen attempts and recovery categories',all(w in text for w in ['19','장비','마스터리','물약','이전 구간']),text)
        capture('stalled_s11_preparation_guide')
        page.locator('[data-notification-action="retryPreparation"]').click()
        check('actual shortcut targets expedition character',page.evaluate('__fun.state.tab==="character"&&__fun.state.heroUid==="h1"&&__fun.state.invNo===1'))
        page.locator('.go-tree').click()
        before=page.evaluate('({gold:__fun.G.resources.gold,points:__fun.G.heroes[0].masteryPoints,nodes:__fun.G.heroes[0].mastery})')
        result['before_reset']=before
        page.get_by_role('button',name='초기화',exact=True).click()
        after=page.evaluate('({gold:__fun.G.resources.gold,points:__fun.G.heroes[0].masteryPoints,nodes:__fun.G.heroes[0].mastery})')
        check('actual free mastery reset preserves scarce gold',before['gold']==after['gold']==48,after)
        check('actual free reset refunds spent points',after['points']>before['points'] and not any(after['nodes'].values()),after)
        capture('stalled_s11_free_reset')
        page.keyboard.press('Escape')
        page.locator('.nav button[data-tab="expedition"]').click()
        check('previous unlocked places remain available',page.locator('.zone:not(.locked)').count()>=4,page.locator('.zone:not(.locked)').count())
        capture('stalled_s11_prior_places')
        check('no runtime or HTTP errors',not s.errors and not s.http_errors,[s.errors,s.http_errors])
        result['page_errors'],result['http_errors']=s.errors,s.http_errors
        write('stalled_guide.json',result)
        print(json.dumps({'checks':len(result['checks']),'passed':sum(x['ok']for x in result['checks'])}),flush=True)
    except Exception as exc:
        result['exception']=str(exc);write('stalled_guide.json',result)
        page.screenshot(path=str(OUT/'stalled_guide_exception.png'));raise
    finally:c.close();s.close()

if __name__=='__main__':main()
