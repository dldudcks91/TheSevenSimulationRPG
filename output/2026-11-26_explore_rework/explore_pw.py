"""탐험 판 화면 검증 (R590 U 단계 · SCREEN_DESIGN §8-4 · ADR-1400 ~ ADR-1404).
PowerShell 에서 anaconda python 으로 돌린다 — Bash 에선 Edge 가 안 뜬다.
  & C:\\Users\\user\\anaconda3\\python.exe output\\2026-11-26_explore_rework\\explore_pw.py 8791
셀렉터에 한국어 리터럴을 쓰지 않는다. Date.now 스큐 + document.hidden 덮어쓰기로 시간 흐름 · 숨긴 탭을 흉내 낸다.
"""
import json
import os
import sys
import time

from playwright.sync_api import sync_playwright

PORT = sys.argv[1] if len(sys.argv) > 1 else '8791'
BASE = f'http://127.0.0.1:{PORT}/index.html'
OUT = os.path.dirname(os.path.abspath(__file__))
INIT = """
(() => {
  const real = Date.now.bind(Date); let skew = 0;
  Date.now = () => real() + skew;
  window.__skew = ms => { skew += ms; };
  let hidden = false;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') });
  window.__hide = h => { hidden = h; document.dispatchEvent(new Event('visibilitychange')); };
})();
"""
RESULTS = []


def check(name, ok, detail=''):
    RESULTS.append({'name': name, 'ok': bool(ok), 'detail': str(detail)[:300]})
    print(('PASS ' if ok else 'FAIL ') + name + ('' if ok else f'  — {detail}'), flush=True)


class Run:
    def __init__(self, p, w=1600, h=800):
        self.b = p.chromium.launch(channel='msedge', headless=True)
        self.ctx = self.b.new_context(viewport={'width': w, 'height': h}, is_mobile=False, has_touch=False)
        self.ctx.add_init_script(INIT)
        self.page = self.ctx.new_page()
        self.errs = []
        self.page.on('pageerror', lambda e: self.errs.append('pageerror: ' + str(e)))
        self.page.on('console', lambda m: self.errs.append('console: ' + m.text) if m.type == 'error' and 'favicon' not in m.text and 'Failed to load resource' not in m.text else None)

    def go(self, q, wait='.nav'):
        self.page.goto(f'{BASE}?{q}', wait_until='domcontentloaded')
        self.page.wait_for_selector(wait, timeout=20000)
        self.page.wait_for_timeout(700)

    def shot(self, name):
        self.page.screenshot(path=os.path.join(OUT, name))

    def close(self, tag):
        check(f'{tag}: 페이지 오류 0', not self.errs, '; '.join(self.errs[:5]))
        self.b.close()


def has(page, sel):
    return page.locator(sel).count() > 0


def main():
    with sync_playwright() as p:
        # ① 지도 + 지점 창 (표 있음) — ko/en · 1600/1366
        for lang, w in (('ko', 1600), ('en', 1600), ('ko', 1366), ('en', 1366)):
            r = Run(p, w=w)
            r.go(f'dev=explore&s=idle&sel=1:cave&lang={lang}', '.ex-pop')
            pg = r.page
            check(f'1 지점 창 {lang} {w}: 표 칸', pg.locator('.ex-pop .ex-tk').count() >= 1, pg.locator('.ex-pop .ex-tk').count())
            check(f'1 지점 창 {lang} {w}: 표 배지', has(pg, '.ex-spot .ex-n'))
            check(f'1 지점 창 {lang} {w}: 보내기 · 이어 돌기 · 지면 멈춤', has(pg, '.ex-pop .ex-go') and has(pg, '.ex-repeat') and has(pg, '.ex-stoploss'))
            ov = pg.evaluate("(() => { const m = document.querySelector('.main'); return m ? m.scrollWidth - m.clientWidth : -1; })()")
            check(f'1 지점 창 {lang} {w}: 가로 넘침 없음', ov <= 1, ov)
            r.shot(f'01_spot_{lang}_{w}.png')
            r.close(f'1 {lang} {w}')

        # ② 표 없는 지점 — 「표 없음」 · 보내기 누르면 사유 플래시
        r = Run(p)
        r.go('dev=explore&s=idle&tk=0&sel=3:ruins&lang=ko', '.ex-pop')
        pg = r.page
        check('2 표 없음 줄', has(pg, '.ex-pop .ex-none'))
        pg.click('.ex-pop .ex-go')
        pg.wait_for_timeout(300)
        check('2 거절 플래시', pg.locator('#toast .toast').count() >= 1, pg.locator('#toast').inner_text())
        r.shot('02_spot_noticket_ko.png')
        # 이어 돌기 켜기 → 지면 멈춤 눌림
        pg.click('.ex-repeat')
        pg.wait_for_timeout(200)
        check('2 이어 돌기 켜면 지면 멈춤이 눌린다', pg.locator('.ex-stoploss').is_enabled())
        r.close('2')

        # ③ 지점 창에서 보내기 → 동굴 관전(원정 관전 화면) · 위쪽 부대 칸 · 이긴 칸 → 결과 띠가 다음 칸을 센다
        r = Run(p)
        r.go('dev=explore&s=idle&sel=1:cave&lv=30&lang=ko', '.ex-pop')
        pg = r.page
        pg.click('.ex-pop .ex-go')
        pg.wait_for_selector('.battle-panel', timeout=8000)
        pg.wait_for_timeout(1200)
        check('3 보내기 → 동굴 전투 화면', has(pg, '.ex-fight .battle-panel'))
        check('3 위쪽 부대 칸 = 탐험 판(지점 아이콘)', has(pg, '.tab-seg .seg-ex .seg-ex-ico'))
        check('3 부대 칸이 고른 칸', has(pg, '.tab-seg .seg-ex.on'))
        check('3 아래 보관 칸', has(pg, '.ex-fight .inv-cells'))
        check('3 철수 자리 = 부르기', has(pg, '.b-skip'))
        r.shot('03_cave_fight_ko.png')
        if has(pg, '.b-speed[data-s="16"]'):
            pg.click('.b-speed[data-s="16"]')
        try:
            pg.wait_for_selector('.battle-result.show', timeout=120000)
            pg.wait_for_timeout(600)
            won = has(pg, '.battle-result .verdict.up')
            check('3 동굴 칸 이김(lv30)', won)
            check('3 결과 띠가 다음 칸을 센다', has(pg, '.battle-result .b-next'), pg.locator('.battle-result').inner_text())
            check('3 결과 띠에 건너뛰기 없음', not has(pg, '.battle-result .b-go'))
            r.shot('03b_cave_band_next_ko.png')
            pg.wait_for_timeout(int(5500))
            check('3 숨 뒤 다음 칸 전투가 선다', has(pg, '.ex-fight .battle-panel') and not has(pg, '.battle-result.show'))
            r.shot('03c_cave_next_cell_ko.png')
        except Exception as e:
            check('3 결과 띠', False, e)
        # 다른 탭에서 부대 칸을 누르면 그 판 관전
        pg.click('.nav button[data-tab="party"]')
        pg.wait_for_timeout(500)
        if has(pg, '.tab-seg .seg-ex'):
            pg.click('.tab-seg .seg-ex')
            pg.wait_for_timeout(900)
            check('3 다른 탭에서 부대 칸 → 탐험 관전', has(pg, '.ex-fight') or has(pg, '.exw-map'))
        else:
            check('3 다른 탭에서 부대 칸 → 탐험 관전', False, 'no seg-ex')
        r.close('3')

        # ③-2 진 동굴 칸 → 결과 띠 [결과 보기] → 결과 카드(실패 · 잃음) · 끝 알림 · 부대 칸이 대기로
        r = Run(p)
        r.go('dev=explore&send=cave&watch=1&lang=ko', '.ex-fight')
        pg = r.page
        if has(pg, '.b-speed[data-s="16"]'):
            pg.click('.b-speed[data-s="16"]')
        try:
            pg.wait_for_selector('.battle-result.show', timeout=120000)
            pg.wait_for_timeout(700)
            lost = has(pg, '.battle-result .verdict.down')
            print('INFO 3-2 lost =', lost, flush=True)   # 장소가 시드로 갈려 질 수도 이길 수도 있다 — 진 판만 결과 카드를 본다
            if lost:
                check('3-2 끝 알림(실패)', pg.locator('#toast .toast').count() >= 1)
                check('3-2 부대 칸이 대기로', not has(pg, '.tab-seg .seg-ex'))
                pg.click('.battle-result .b-report')
                pg.wait_for_selector('.exr-modal', timeout=4000)
                check('3-2 결과 카드 = 잃음', has(pg, '.exr-modal .exr-lost') and has(pg, '.exr-verdict.lost'))
                r.shot('03d_cave_lost_result_ko.png')
        except Exception as e:
            check('3-2 결과 띠', False, e)
        r.close('3-2')

        # ④ 상단 의뢰 지도 — 지난 습격 체크 · 마차 · 정보 카드 · 시간이 흐르면 마차가 간다
        for lang in ('ko', 'en'):
            r = Run(p)
            r.go(f'dev=explore&send=caravan&watch=1&jump=1:2:5&lang={lang}', '.exw-map')
            pg = r.page
            check(f'4 상단 지도 {lang}', has(pg, '.exw-map.exw-caravan'))
            check(f'4 지난 습격 체크 {lang}', pg.locator('.exw-mark.k-raid.won').count() == 1, pg.locator('.exw-mark').count())
            check(f'4 앞 습격 자리 안 보임 {lang}', pg.locator('.exw-mark').count() == 1)
            check(f'4 마차 · 깃발 · 정보 카드 {lang}', has(pg, '.exw-token.wagon') and has(pg, '.exw-goal') and has(pg, '.exw-card'))
            check(f'4 습격 칸(체크 1) {lang}', pg.locator('.exw-pip.done').count() == 1, pg.locator('.exw-pip').count())
            x0 = pg.eval_on_selector('.exw-token', 'n => n.style.left')
            r.shot(f'04_caravan_map_{lang}.png')
            pg.evaluate('window.__skew(15000)')
            pg.wait_for_timeout(900)
            x1 = pg.eval_on_selector('.exw-token', 'n => n.style.left') if has(pg, '.exw-token') else None
            check(f'4 시간이 흐르면 마차가 간다 {lang}', x1 is None or x1 != x0, f'{x0} → {x1}')
            r.close(f'4 {lang}')

        # ⑤ 습격 — 번쩍임 + 말풍선 → 전투 화면 → 결과
        r = Run(p)
        r.go('dev=explore&send=caravan&watch=1&jump=1:1&lv=30&lang=ko', '.exw-map')
        pg = r.page
        check('5 습격 번쩍임 · 말풍선 · 흔들림', has(pg, '.exw-map.alert .exw-flash') and has(pg, '.exw-bubble') and has(pg, '.exw-token.shake'))
        r.shot('05_ambush_ko.png')
        pg.wait_for_selector('.ex-fight .battle-panel', timeout=6000)
        pg.wait_for_timeout(900)
        check('5 습격 전투 화면(상하 대치)', has(pg, '.ex-fight .side-enemy .unit') and has(pg, '.ex-fight .side-party .unit'))
        r.shot('06_raid_fight_ko.png')
        if has(pg, '.b-speed[data-s="16"]'):
            pg.click('.b-speed[data-s="16"]')
        try:
            pg.wait_for_selector('.battle-result.show', timeout=90000)
            pg.wait_for_timeout(700)
            won = has(pg, '.battle-result .verdict.up')
            r.shot('06b_raid_band_ko.png')
            pg.click('.battle-result .b-report')
            pg.wait_for_timeout(900)
            if won:
                check('5 이긴 습격 → 지도로 · 체크', has(pg, '.exw-mark.k-raid.won'))
                r.shot('07_raid_back_map_ko.png')
            else:
                check('5 진 습격 → 결과 카드(실패)', has(pg, '.exr-modal') and has(pg, '.exr-lost'))
                r.shot('07_raid_lost_result_ko.png')
        except Exception as e:
            check('5 습격 결과 띠', False, e)
        r.close('5')

        # ⑥ 폐허 — 안개 · 지난 이벤트 표지 · 정보 카드(모은 것)
        for lang in ('ko', 'en'):
            r = Run(p)
            r.go(f'dev=explore&send=ruins&watch=1&jump=1:4:60&lang={lang}', '.exw-map')
            pg = r.page
            check(f'6 폐허 지도 + 안개 {lang}', has(pg, '.exw-map.exw-ruins .exw-fog'))
            check(f'6 지난 이벤트 표지 둘 {lang}', pg.locator('.exw-mark').count() == 2, pg.locator('.exw-mark').count())
            check(f'6 리더 표지 · 모은 것 줄 {lang}', has(pg, '.exw-token .hero-face') and has(pg, '.exw-bank'))
            r.shot(f'08_ruins_map_{lang}.png')
            r.close(f'6 {lang}')
        # 폐허 전투 이벤트 — 단계 1 · 3 · 5 중 전투가 나오는 곳에서 표지가 드러난 뒤 전투 화면
        r = Run(p)
        found = False
        for step in (1, 3, 5, 7, 9):
            r.go(f'dev=explore&send=ruins&watch=1&jump=1:{step}&lang=ko', '.main')
            pg = r.page
            if has(pg, '.exw-map.alert') or has(pg, '.exw-mark.now'):
                r.shot('09_ruins_event_reveal_ko.png')
                try:
                    pg.wait_for_selector('.ex-fight .battle-panel', timeout=5000)
                    pg.wait_for_timeout(800)
                    r.shot('09b_ruins_fight_ko.png')
                    found = True
                    break
                except Exception:
                    pass
        check('6 폐허 전투 이벤트 → 표지 → 전투 화면', found)
        r.close('6b')

        # ⑦ 부르기 — 확인 창 → 지도
        r = Run(p)
        r.go('dev=explore&send=caravan&watch=1&jump=1:0&lang=ko', '.exw-map')
        pg = r.page
        pg.click('.exw-recall')
        pg.wait_for_selector('#modal .dismiss-box', timeout=4000)
        r.shot('10_recall_confirm_ko.png')
        check('7 부르기 확인 창', has(pg, '#modal .dismiss-box'))
        pg.click('#modal .dismiss-actions .btn.primary')
        pg.wait_for_timeout(700)
        check('7 부르기 뒤 세계지도', has(pg, '.ex-map') and not has(pg, '.exw-map'))
        check('7 부르기 뒤 부대 칸이 대기', not has(pg, '.tab-seg .seg-ex'))
        r.close('7')

        # ⑧ 결과 카드 — 끝까지 계산(이김 또는 짐) · 부름(잃음)
        for lang in ('ko', 'en'):
            r = Run(p)
            r.go(f'dev=explore&send=caravan&res=1&lang={lang}', '.exr-modal')
            pg = r.page
            check(f'8 결과 카드 {lang}', has(pg, '.exr-modal .exr-head') and has(pg, '.exr-verdict'))
            r.shot(f'11_result_{lang}.png')
            pg.click('#modal .dismiss-actions .btn.primary')
            pg.wait_for_timeout(400)
            check(f'8 결과 카드 닫힘 {lang}', not has(pg, '.exr-modal'))
            r.close(f'8 {lang}')
        r = Run(p)
        r.go('dev=explore&send=cave&recall=1&sel=1:cave&lang=ko', '.ex-pop')
        pg = r.page
        check('8 부른 판은 본 것 — 결과 줄 · 「!」 없음', not has(pg, '.ex-pop .ex-res') and not has(pg, '.ex-spot.done'))
        r.close('8 recall row')
        r = Run(p)
        r.go('dev=explore&send=cave&recall=1&res=1&lang=ko', '.exr-modal')
        pg = r.page
        check('8 부른 판 = 잃음 한 줄', has(pg, '.exr-modal .exr-lost') and has(pg, '.exr-verdict.recalled'))
        r.shot('12_result_recalled_ko.png')
        r.close('8 recall card')

        # ⑨ 다시 켜기 — 결과는 바로 계산 · 끝 시각까지 기다림(탐험 중) · 시간을 밀면 결과 (11-26 「끝 시각 유지」)
        for spot in ('cave', 'caravan', 'ruins'):
            r = Run(p)
            r.go(f'dev=explore&send={spot}&lv=30&lang=ko', '.nav')
            pg = r.page
            pg.wait_for_timeout(600)
            pg.goto(f'{BASE}?lang=ko', wait_until='domcontentloaded')
            pg.wait_for_selector('.mn-btn', timeout=15000)
            pg.wait_for_timeout(1500)
            pg.locator('.mn-btn').nth(1).click()
            pg.wait_for_selector('.nav', timeout=15000)
            pg.wait_for_timeout(600)
            check(f'9 {spot} 다시 켜기 → 탐험 중(부대 칸)', has(pg, '.tab-seg .seg-ex'))
            check(f'9 {spot} 다시 켜기 → 끝 알림 없음', pg.locator('#toast .toast').count() == 0, pg.locator('#toast').inner_text())
            pg.click('.tab-seg .seg-ex')
            pg.wait_for_timeout(900)
            if spot == 'cave':
                check('9 cave 기다림 판', has(pg, '.exw-cave .exw-wait') and has(pg, '.exw-card .exw-recall') and not has(pg, '.ex-fight'))
            else:
                check(f'9 {spot} 기다림 지도', has(pg, f'.exw-map.exw-{spot}') and has(pg, '.exw-card [data-exw-left]'))
            left0 = pg.locator('.exw-card [data-exw-left]').inner_text()
            r.shot(f'13_reopen_wait_{spot}_ko.png')
            x0 = pg.eval_on_selector('.exw-token', 'n => n.style.left') if has(pg, '.exw-token') else None
            pg.evaluate('window.__skew(60000)')
            pg.wait_for_timeout(900)
            if spot != 'cave' and has(pg, '.exw-token'):
                x1 = pg.eval_on_selector('.exw-token', 'n => n.style.left')
                check(f'9 {spot} 기다림 중 표지가 간다', x1 != x0, f'{x0} → {x1}')
                r.shot(f'13b_reopen_wait_{spot}_moved_ko.png')
            left1 = pg.locator('.exw-card [data-exw-left]').inner_text() if has(pg, '.exw-card [data-exw-left]') else ''
            check(f'9 {spot} 남은 시간이 준다', left1 != left0, f'{left0} → {left1}')
            for _ in range(45):   # 켜져 있는 동안 시간이 흐른다 — 한 번에 2분(멈춘 공백 문턱) 안쪽씩
                pg.evaluate('window.__skew(100000)')
                pg.wait_for_timeout(250)
            pg.wait_for_timeout(800)
            check(f'9 {spot} 끝 시각 뒤 → 결과 카드', has(pg, '.exr-modal'))
            check(f'9 {spot} 끝 뒤 부대 칸 대기', not has(pg, '.tab-seg .seg-ex'))
            r.shot(f'13c_reopen_result_{spot}_ko.png')
            r.close(f'9 {spot}')
        # 기다리는 동안 부르기
        r = Run(p)
        r.go('dev=explore&send=ruins&wait=1&watch=1&lang=ko', '.exw-map')
        pg = r.page
        pg.click('.exw-recall')
        pg.wait_for_selector('#modal .dismiss-box', timeout=4000)
        pg.click('#modal .dismiss-actions .btn.primary')
        pg.wait_for_timeout(700)
        check('9 기다림 중 부르기 → 지도 · 대기', not has(pg, '.exw-map') and not has(pg, '.tab-seg .seg-ex') and not has(pg, '.ex-spot.done'))
        r.close('9 recall')

        # ⑩ 숨긴 탭 — 50초 숨김(앱 시계가 민다) · 3분 공백(멈춘 공백 → 결과 계산 · 끝 시각까지 기다림)
        r = Run(p)
        r.go('dev=explore&send=caravan&watch=1&jump=1:0&lang=ko', '.exw-map')
        pg = r.page
        x0 = pg.eval_on_selector('.exw-token', 'n => n.style.left')
        pg.evaluate('window.__hide(true)')
        for _ in range(5):
            pg.evaluate('window.__skew(10000)')
            pg.wait_for_timeout(300)
        pg.evaluate('window.__hide(false)')
        pg.wait_for_timeout(900)
        x1 = pg.eval_on_selector('.exw-token', 'n => n.style.left') if has(pg, '.exw-token') else 'fight'
        check('10 숨긴 탭도 판이 간다', x1 != x0, f'{x0} → {x1}')
        pg.evaluate('window.__hide(true)')
        pg.evaluate('window.__skew(200000)')
        pg.wait_for_timeout(800)
        pg.evaluate('window.__hide(false)')
        pg.wait_for_timeout(900)
        check('10 멈춘 공백 → 기다림 지도(탐험 중)', (has(pg, '.exw-map') and has(pg, '.tab-seg .seg-ex')) or has(pg, '.exr-modal'))
        r.shot('14_frozen_gap_wait_ko.png')
        r.close('10')

        # ⑪ 탐험 중인 편성을 원정에 — 출정 확인 창의 부르기 줄
        r = Run(p)
        r.go('dev=form&explore=1&lang=ko', '.nav')
        pg = r.page
        check('11 출정 확인 창(탐험 부르기 줄)', has(pg, '#modal .dismiss-box'))
        r.shot('15_depart_confirm_ko.png')
        r.close('11')

        # ⑫ 도움말 탐험 절
        for lang in ('ko', 'en'):
            r = Run(p)
            r.go(f'dev=explore&s=idle&lang={lang}&tab=help', '.help-tabs')
            pg = r.page
            pg.click('#help-tab-explore')
            pg.wait_for_timeout(400)
            txt = pg.locator('#help-explore').inner_text()
            check(f'12 도움말 탐험 {lang}', len(txt) > 400 and '{' not in txt, txt[:120])
            r.shot(f'16_help_explore_{lang}.png')
            r.close(f'12 {lang}')

    ok = sum(1 for x in RESULTS if x['ok'])
    print(f'\n{ok}/{len(RESULTS)} PASS')
    with open(os.path.join(OUT, 'results.json'), 'w', encoding='utf-8') as f:
        json.dump(RESULTS, f, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
