"""Normal first-session clicks on captured product inputs, then earned choices."""
import json
import time
from fun_browser import Session, OUT, boot, take, write


def main():
    s = Session()
    c, page = s.context(fixed_at=1793332800000)
    result = {'method': 'Fresh isolated Edge. Normal menu/reroll/prologue/first expedition clicks. Fixed account Date.now, real 75-second browser clock watching. No injected resource, rank, item or level.', 'actions': [], 'observations': [], 'checks': []}
    started = time.monotonic()
    def check(name, ok, detail=None):
        result['checks'].append({'name': name, 'ok': bool(ok), 'detail': detail})
        write('onboarding.json', result)
        if not ok:
            raise AssertionError(name)
    def click(selector, label):
        page.locator(selector).first.click()
        result['actions'].append({'action': label, 'elapsed': round(time.monotonic()-started, 2)})
    def capture(label):
        result['observations'].append(take(page, label))
        write('onboarding.json', result)
    def guide():
        cards = page.locator('.tutorial-card')
        return cards.get_attribute('data-tutorial') if cards.count() else None
    try:
        boot(page, s.base)
        click('.mn-btn', '새 게임')
        before = page.evaluate('JSON.stringify(__fun.state.candidates)')
        click('.ng-actions .btn:not(.primary)', '무료 전체 다시 굴리기')
        check('normal reroll changes candidates', page.evaluate('JSON.stringify(__fun.state.candidates)') != before)
        click('.ng-actions .primary', '세 영웅 확정')
        prologue = []
        while page.locator('.pro-wrap').count():
            prologue.append({'title': page.locator('.pro-h').inner_text(), 'body': page.locator('.pro-body').inner_text()})
            click('.pro-actions .primary', '프롤로그 다음 또는 시작')
            page.wait_for_timeout(650)
            if len(prologue)>6: raise RuntimeError('prologue loop')
        result['prologue'] = prologue
        check('five normal prologue scenes', len(prologue)==5, len(prologue))
        check('first tutorial targets unlocked place text', guide()=='expedition' and page.locator('.zone:not(.locked) .title > span:last-child.tutorial-target').count()==1)
        capture('fresh_01_first_guide')
        click('.tutorial-confirm', '첫 원정 안내 확인')
        click('.nav button[data-tab="party"]', '편성 물약 설정 보기')
        check('potion tutorial points to actual party setting', guide()=='potions' and page.locator('.pt-potion.tutorial-target').count()==1)
        capture('fresh_02_potions')
        click('.tutorial-confirm', '물약 안내 확인')
        click('.nav button[data-tab="research"]', '초기 건설 비용 보기')
        check('construction tutorial targets actual next rank', guide()=='construction' and page.locator('.cn-next.tutorial-target').count()==1)
        result['initial_construction'] = page.evaluate('__fun.SYS.game.constructionState(__fun.G)')
        capture('fresh_03_construction')
        click('.tutorial-confirm', '건설 안내 확인')
        click('.nav button[data-tab="expedition"]', '첫 원정으로 돌아가기')
        click('.zone:not(.locked)', '첫 장소 선택')
        capture('fresh_04_departure')
        click('.form-actions .primary', '기본 편성으로 첫 출정')
        check('native expedition starts', page.evaluate('__fun.G.runs.some(r=>r?.active)'))
        # Fixed Date.now suppresses the app's wall clock. Move Date.now with native performance
        # for this real watch; the captured engine and its own pacing remain unchanged.
        page.evaluate('window.__funStart=performance.now(); window.__funEpoch=window.__funNow; Date.now=()=>window.__funEpoch+performance.now()-window.__funStart')
        battle_at = time.monotonic()
        for seconds in [15, 45, 75]:
            while time.monotonic()-battle_at<seconds:
                page.wait_for_timeout(250)
            capture(f'fresh_battle_{seconds}s')
        click('.nav button[data-tab="character"]', '실제 획득 장비와 마스터리 보기')
        result['earned'] = page.evaluate('__fun.read()')
        capture('fresh_05_earned_character')
        cells = page.locator('.store-bag .inv-cell.filled:not(.box)')
        result['loot_guide_observed'] = guide()=='loot'
        if cells.count():
            check('earned loot tutorial targets real unboxed inventory', guide()=='loot')
            cells.first.hover()
            page.wait_for_timeout(200)
            result['earned_tooltip'] = page.locator('#tooltip').inner_text()
            capture('fresh_06_earned_loot_compare')
            page.mouse.move(10,10)
            click('.tutorial-confirm', '장비 안내 확인')
        else:
            result['earned_loot_note'] = 'No unequipped real drop in 75 seconds; inspect natural 10-minute checkpoint separately.'
        points = page.evaluate('__fun.G.heroes.find(h=>h.masteryPoints>0)?.uid??null')
        result['earned_points_hero'] = points
        if points:
            page.evaluate('(uid)=>{__fun.state.heroUid=uid;__fun.render()}', points)
            click('.go-tree', '실제 획득 포인트 마스터리 열기')
            check('mastery guide targets learnable node', guide()=='mastery' and page.locator('.sk-cell.can.tutorial-target[data-node]').count()==1)
            capture('fresh_07_earned_mastery')
            click('.tutorial-confirm', '마스터리 안내 확인')
            node = page.locator('.sk-cell.can[data-node]').first.get_attribute('data-node')
            before = page.evaluate('__fun.G.heroes.find(h=>h.uid===__fun.state.heroUid).masteryPoints')
            page.locator(f'.sk-cell[data-node="{node}"]').click()
            after = page.evaluate('__fun.G.heroes.find(h=>h.uid===__fun.state.heroUid).masteryPoints')
            check('actual learn spends exactly one earned point', after==before-1, {'before':before,'after':after,'node':node})
            capture('fresh_08_mastery_spent')
        result['save'] = page.evaluate('__fun.snapshot()')
        result['page_errors'], result['http_errors'], result['external'] = s.errors, s.http_errors, s.external
        check('no runtime or local HTTP errors', not s.errors and not s.http_errors, [s.errors, s.http_errors])
        result['elapsed_sec'] = round(time.monotonic()-started,2)
        write('onboarding.json',result)
        print(json.dumps({'checks':len(result['checks']),'passed':sum(c['ok']for c in result['checks']),'loot_guide':result['loot_guide_observed'],'points_hero':points,'errors':s.errors,'http_errors':s.http_errors},ensure_ascii=True),flush=True)
    except Exception as exc:
        result['exception']=str(exc)
        result['page_errors'], result['http_errors']=s.errors,s.http_errors
        write('onboarding.json',result)
        page.screenshot(path=str(OUT/'onboarding_exception.png'))
        raise
    finally:
        c.close()
        s.close()


if __name__=='__main__':
    main()
