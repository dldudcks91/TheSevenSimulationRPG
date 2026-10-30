"""Ordinary first-session click path plus 90 seconds of actual default-speed watching."""
import json,time
from fun_browser import Session,OUT,SOURCE,boot,take,write

def main():
    s=Session();result={'actions':[],'observations':[],'method':'Fresh browser, normal UI clicks, native real time; 90-second first battle observation. No dev URL, resources, or levels injected.'}
    started=time.monotonic()
    c,page=s.context()
    def click(selector,description):
        page.locator(selector).first.click();result['actions'].append({'elapsed_sec':round(time.monotonic()-started,2),'action':description,'selector':selector});write('onboarding.json',result)
    try:
        boot(page,s.base)
        result['observations'].append(take(page,'onboard_01_menu'))
        click('.mn-btn','새 게임')
        result['candidates_before']=page.evaluate('__fun.state.candidates')
        result['observations'].append(take(page,'onboard_02_candidates'))
        click('.ng-actions .btn:not(.primary)','무료 파티 전체 다시 굴리기 1회')
        result['candidates_after']=page.evaluate('__fun.state.candidates')
        result['observations'].append(take(page,'onboard_03_rerolled'))
        click('.ng-actions .primary','현재 세 영웅으로 확정')
        result['prologue']=[]
        while page.locator('.pro-wrap').count():
            result['prologue'].append({'title':page.locator('.pro-h').inner_text(),'body':page.locator('.pro-body').inner_text()})
            click('.pro-actions .primary','프롤로그 다음 또는 시작')
            page.wait_for_timeout(650)
            if len(result['prologue'])>6:raise RuntimeError('prologue loop')
        result['observations'].append(take(page,'onboard_04_game_goal'))
        click('.notification-btn','첫 목표를 확인하려 종 열기')
        click('[data-notification-action="folder-missions"]','임무 폴더 확인')
        result['observations'].append(take(page,'onboard_05_first_goal'))
        click('[data-notification-action="firstExpedition"]','첫 원정 바로가기')
        click('.zone:not(.locked)','첫 원정 장소 선택')
        result['observations'].append(take(page,'onboard_06_departure_choices'))
        result['departure_text']=page.locator('.depart-box').inner_text()
        click('.form-actions .primary','기본 편성·기본 배속으로 첫 출정')
        battle_at=time.monotonic()
        result['observations'].append(take(page,'onboard_07_battle_start'))
        for sec in [15,30,60,90]:
            while time.monotonic()-battle_at<sec:page.wait_for_timeout(250)
            obs=take(page,f'onboard_battle_{sec}s')
            obs['actual_battle_watch_sec']=round(time.monotonic()-battle_at,2)
            result['observations'].append(obs)
            write('onboarding.json',result)
            print(json.dumps({'watch_sec':sec,'levels':[h['level'] for h in obs['game']['levels']],'gold':obs['game']['gold'],'bag':obs['game']['inventory'],'rounds':obs['game']['report'].get('roundsCleared'),'items':obs['game']['items']},ensure_ascii=True),flush=True)
        click('.nav button[data-tab="character"]','전투를 유지하며 캐릭터·장비 확인')
        result['observations'].append(take(page,'onboard_08_first_character'))
        result['mastery_state']=page.evaluate('__fun.SYS.game.masteryState(__fun.G,__fun.state.heroUid)')
        # The control exists from level1; inspect what choice it currently offers without spending points.
        mastery=page.locator('button').filter(has_text='마스터리 열기')
        if mastery.count():
            mastery.first.click();result['actions'].append({'elapsed_sec':round(time.monotonic()-started,2),'action':'첫 마스터리 창 열기'})
            result['observations'].append(take(page,'onboard_09_mastery_choices'))
            page.keyboard.press('Escape')
        page.locator('.nav button[data-tab="research"]').click()
        result['observations'].append(take(page,'onboard_10_first_build_choices'))
        result['final_save']=page.evaluate('__fun.snapshot()')
        result['elapsed_wall_sec']=round(time.monotonic()-started,2)
        result['page_errors']=s.errors;result['http_errors']=s.http_errors;result['external_blocked']=s.external
        write('onboarding.json',result)
        print(json.dumps({'done':True,'actions':len(result['actions']),'wall_sec':result['elapsed_wall_sec'],'errors':s.errors,'http_errors':s.http_errors},ensure_ascii=True),flush=True)
    except Exception as exc:
        result['exception']=str(exc);result['page_errors']=s.errors;write('onboarding.json',result)
        page.screenshot(path=str(OUT/'onboarding_exception.png'))
        raise
    finally:c.close();s.close()

if __name__=='__main__':main()
