"""Inspect real current UI using genuine saved reports; act via browser clicks."""
import functools
import http.server
import json
import mimetypes
import sys
import threading
from urllib.parse import unquote, urlparse

from playwright.sync_api import sync_playwright
from run_probe import OUT, ROOT, QA, Handler, sources

ACCESSOR = '''
window.__review={get G(){return G},get SYS(){return SYS},get D(){return D},state,render,
 restore(raw){dropBattles();G=SYS.game.deserialize(raw);window.__reviewNow=raw.savedAt;
 state.screen='game';state.tab='expedition';state.exp='idle';state.modal=null;state.repSel=null;
 state.heroUid=G.heroes[0].uid;render();},
 read(){return {tab:state.tab,hero:state.heroUid,inventory:state.invNo,stage:state.expStage,
 gold:G.resources.gold,guide:SYS.game.notificationState(G,Date.now()),
 heroes:G.heroes.map(h=>({uid:h.uid,level:h.level,mastery:h.mastery,points:h.masteryPoints,combat:SYS.game.heroCombat(G,h)}))}}
};
'''


def main():
    baseline = sys.argv[1] if len(sys.argv)>1 else 'current'
    source = sources(baseline)
    source['/ui/app.js'] = source['/ui/app.js'].decode('utf-8') + ACCESSOR
    source['/ui/cloud.js'] = 'export async function pushTrack(){return {ok:true};}'
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0),
        functools.partial(Handler, directory=str(ROOT / 'src')))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    raw = json.loads((QA / 'simulation/critical_seed10/checkpoints/state_basic_seed10_5520.json').read_text(encoding='utf-8'))
    result = {'checks': [], 'actions': [], 'observations': [], 'page_errors': [], 'http_errors': [], 'external_blocked': [],
        'method': 'Current frozen product UI. Restore genuine live-session checkpoint without fabricating reports; fixed clock and empty isolated browser context. Actual browser clicks for guide, mastery and departure. UI bridge only reads state and restores copied saves; no resources, levels, counters or ranks supplied.'}

    def write():
        name = 'ui_results.json' if baseline=='current' else f'{baseline}_ui_results.json'
        (OUT / name).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')

    def check(name, ok, evidence=None):
        result['checks'].append({'name': name, 'passed': bool(ok), 'evidence': evidence})
        write()
        if not ok:
            raise AssertionError(name)

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(channel='msedge', headless=True)
            context = browser.new_context(viewport={'width': 1600, 'height': 900}, device_scale_factor=1)
            context.add_init_script('window.__reviewNow=' + str(raw['savedAt']) + ';Date.now=()=>window.__reviewNow;')

            def route_request(route):
                parsed = urlparse(route.request.url)
                path = unquote(parsed.path)
                if parsed.hostname != '127.0.0.1':
                    result['external_blocked'].append(route.request.url)
                    return route.abort()
                if path in source:
                    return route.fulfill(content_type=mimetypes.guess_type(path)[0] or 'application/octet-stream', body=source[path])
                if path.startswith('/assets/') or path == '/favicon.ico':
                    return route.continue_()
                return route.fulfill(status=404, body='missing frozen source ' + path)

            context.route('**/*', route_request)
            page = context.new_page()
            page.on('pageerror', lambda e: result['page_errors'].append(str(e)))
            page.on('response', lambda r: result['http_errors'].append({'url': r.url, 'status': r.status}) if r.status >= 400 and '/favicon.ico' not in r.url else None)

            def click(selector, label):
                page.locator(selector).first.click()
                result['actions'].append(label)

            def capture(name):
                prefix = '' if baseline=='current' else baseline+'_'
                page.screenshot(path=str(OUT / f'{prefix}{name}.png'))
                result['observations'].append({'name': name, 'text': page.locator('body').inner_text(), 'state': page.evaluate('__review.read()')})
                write()

            page.goto(f'http://127.0.0.1:{server.server_port}/index.html', wait_until='domcontentloaded')
            page.wait_for_function('window.__review && __review.SYS')
            page.wait_for_selector('.mn-btn')
            page.evaluate('raw=>__review.restore(raw)', raw)
            check('genuine six-defeat checkpoint exposes preparation guide', page.evaluate('__review.read().guide.guide.id') == 'retryPreparation')
            click('.notification-btn', '종 알림 열기')
            click('[data-notification-action="folder-missions"]', '임무 폴더 열기')
            guide = page.locator('.notification-guide')
            text = guide.inner_text()
            check('guide names equipment, mastery, potions and earlier-stage farming', all(s in text for s in ['장비', '마스터리', '물약', '이전 구간', '6회']), text)
            capture('01_preparation_guide')
            click('[data-notification-action="retryPreparation"]', '준비 점검 바로가기')
            target = page.evaluate('__review.read()')
            check('shortcut reaches actual expedition hero and party inventory', target['tab'] == 'character' and target['hero'] == 'h1' and target['inventory'] == 1)
            capture('02_character_before')
            click('.go-tree', '마스터리 열기')
            node = page.locator('.sk-cell[data-node="sin_greed_t1_gold"]')
            node.hover()
            result['mastery_tooltip'] = page.locator('#tooltip').inner_text()
            capture('03_existing_mastery')
            page.mouse.move(15, 15)
            before = page.evaluate('__review.read()')
            page.get_by_role('button', name='초기화', exact=True).click()
            result['actions'].append('무료 초기화')
            after = page.evaluate('__review.read()')
            check('reset refunds all ten points without gold cost', after['heroes'][0]['points'] == 10 and after['gold'] == before['gold'])
            for node_id in ['cls_warrior_t1_hp', 'cls_warrior_t1_resall']:
                for _ in range(5):
                    click(f'.sk-cell[data-node="{node_id}"]', f'{node_id} 1점')
            after = page.evaluate('__review.read()')
            check('visible survival allocation raises HP and fire resistance',
                after['heroes'][0]['combat']['hp_max'] > before['heroes'][0]['combat']['hp_max'] and
                after['heroes'][0]['combat']['res_fire'] > before['heroes'][0]['combat']['res_fire'],
                {'before': before['heroes'][0]['combat'], 'after': after['heroes'][0]['combat']})
            capture('04_survival_mastery')
            page.keyboard.press('Escape')
            click('.nav button[data-tab="expedition"]', '원정 장소 목록으로 이동')
            capture('05_farming_locations')
            result['zone_texts'] = page.locator('.zone').all_inner_texts()
            page.locator('.zone').filter(has_text='Ch1-2 ').click()
            result['actions'].append('앞서 클리어한 Ch1-2 선택')
            depart = page.locator('.depart-box')
            check('earlier-stage departure is available', depart.is_visible())
            result['departure_text'] = depart.inner_text()
            result['departure_buttons'] = depart.locator('button').evaluate_all('ns=>ns.map(n=>({text:n.innerText,disabled:n.disabled,cls:n.className}))')
            capture('06_farming_departure')
            page.get_by_role('button', name='반복 원정', exact=True).click()
            result['actions'].append('이전 장소 반복 원정 켜기')
            click('.form-actions .primary', '정상 보내기로 Ch1-2 I 파밍 시작')
            capture('07a_departure_confirmation')
            if page.evaluate('__review.state.modal') == 'departConfirm':
                page.locator('.dismiss-actions button.primary').click()
                result['actions'].append('진행 중인 보스 원정을 끊고 이전 구간으로 이동 확인')
            check('normal departure starts selected earlier stage with repeat enabled',
                page.evaluate('__review.G.runs[0].stageId===1021 && __review.G.runs[0].repeat===true && __review.G.runs[0].active===true'))
            capture('07_farming_started')
            check('chapter two remains locked before first boss clear', page.evaluate('!__review.SYS.game.stageUnlocked(__review.G,2011,"normal")'))
            successful = json.loads((OUT / f'{baseline}_successful_save.json').read_text(encoding='utf-8'))
            page.evaluate('raw=>__review.restore(raw)', successful)
            check('successful normal-cost branch unlocks chapter two', page.evaluate('__review.SYS.game.stageUnlocked(__review.G,2011,"normal")'))
            page.locator('.segmented button').filter(has_text='Ch2 ').first.click()
            check('unlocked chapter-two location is visible and selectable', page.locator('.zone:not(.locked)').filter(has_text='Ch2-1 ').count() == 1)
            capture('08_after_first_boss_clear')
            check('no JavaScript errors in inspected UI path', not result['page_errors'], result['page_errors'])
            check('no local HTTP errors in inspected UI path', not result['http_errors'], result['http_errors'])
            print(json.dumps({'checks': len(result['checks']), 'passed': sum(c['passed'] for c in result['checks']), 'zones': result['zone_texts'], 'departure_buttons': result['departure_buttons']}, ensure_ascii=True), flush=True)
            browser.close()
    except Exception as exc:
        result['exception'] = str(exc)
        write()
        raise
    finally:
        write()
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
