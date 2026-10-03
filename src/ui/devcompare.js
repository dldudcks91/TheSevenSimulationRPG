/**
 * devcompare.js — 개발용 전/후 비교 버튼 (**임시** · 2026-09-21 사용자 지시 · Focus 2026-10-03)
 *
 * `⚙` 판 설정 탭 끝 두 줄 (SCREEN_DESIGN §10-2) — **게임 기능이 아니다.** 고른 쪽은 이 브라우저에만 남는다(localStorage).
 *   · `Card [Before | After]` (2026-10-01 상단바에서 옮김) — 관전 유닛 카드의 개편 전(ADR-0017 모양) / 개편 후(ADR-0262 이름 띠와 뒤따르는 카드 개편 전부)
 *   · `Focus [Off | Stop | Dim]` — 관전에서 한 유닛이 행동하면 재생을 잠깐 세워 시선을 모은다(`battle.js:focusMode`)
 *
 * 어떻게 동작하나 — `<html data-card="v1|v2">` · `<html data-focus="off|stop|dim">` 하나씩을 건다. 재생기가 카드를 그릴 때 `battle.js:cardV2()` 로,
 *   사건을 적용할 때 `battle.js:focusMode()` 로 이 값을 읽고, 값이 없으면 `CARD_V2` · `FOCUS_DEFAULT` 기본값을 쓴다.
 *   Card 는 누르면 앱이 전체를 다시 그려 관전이 **같은 재생 위치**에서 다른 카드로 선다
 *   (새로고침이 아니다 — 새로고침은 도는 원정을 「게임 종료」로 끊는다). 판은 열린 채 설정 탭만 새로 선다(devpalette.js).
 *   Focus 는 다시 그리지 않는다 — 다음 행동부터 먹는다.
 *
 * ⚠ 걷어내려면 이 파일과 `app.js` 의 import · 호출(`settingsBody`) 줄만 지운다. 개편을 확정하거나 버리는 것은 `CARD_V2` · `FOCUS_DEFAULT` 한 줄이다.
 * ⚠ 문구는 영어 · 기호다 — 다국어 대상이 아니다(유저에게 안 보인다 · devpalette.js 와 같다).
 */
import { cardV2, focusMode, FOCUS_MODES } from './battle.js';

const KEY = 'devCard', FOCUS_KEY = 'devFocus';
const read = k => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* 사생활 모드 */ } };

// 불러올 때 1회 — 저장된 선택을 `<html>` 에 되살린다. 설정 탭은 판을 열어야 그려지므로 거기서 하면 늦다 — 첫 관전 카드부터 그 모양이어야 한다
{
    const v = read(KEY);
    if (v === 'v1' || v === 'v2') document.documentElement.dataset.card = v;
    // `?focus=off|stop|dim` (개발용 URL · 헤드리스 검증) 이 저장값보다 먼저다 — 그 로드에서만 먹고 저장하지 않는다
    const q = new URLSearchParams(location.search).get('focus');
    const f = FOCUS_MODES.includes(q) ? q : read(FOCUS_KEY);
    if (FOCUS_MODES.includes(f)) document.documentElement.dataset.focus = f;
}

/** 설정 탭이 그려질 때마다 호출된다 — 줄은 매번 새로 붙는다. `container` = 설정 탭 속(`.set-box`) · `rerender` = 앱의 전체 다시 그림 */
export function mountCardCompare(container, rerender) {
    const cur = cardV2() ? 'v2' : 'v1';
    const row = document.createElement('div');
    row.className = 'set-row';
    row.title = 'Dev — battle unit card: before / after the redesign (temporary)';
    row.innerHTML = `<span class="set-k">Card</span><div class="segmented">${[['v1', 'Before'], ['v2', 'After']]
        .map(([v, label]) => `<button class="btn sm${v === cur ? ' on' : ''}" data-v="${v}">${label}</button>`).join('')}</div>`;
    row.querySelectorAll('button').forEach(b => {
        b.onclick = () => {
            if (b.dataset.v === cur) return;
            document.documentElement.dataset.card = b.dataset.v;
            write(KEY, b.dataset.v);
            rerender();
        };
    });
    container.appendChild(row);
}

/** 설정 탭 마지막 줄 — 공격자 포커스. 누르면 이 줄의 켜진 버튼만 갈아 끼운다(관전은 다음 행동부터 그 방식) */
export function mountFocusCompare(container) {
    const row = document.createElement('div');
    row.className = 'set-row';
    row.title = 'Dev — battle: pause everyone else while one unit acts. Dim = pause + darken the cards not in that action (temporary)';
    row.innerHTML = `<span class="set-k">Focus</span><div class="segmented">${[['off', 'Off'], ['stop', 'Stop'], ['dim', 'Dim']]
        .map(([v, label]) => `<button class="btn sm" data-v="${v}">${label}</button>`).join('')}</div>`;
    const paint = () => row.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === focusMode()));
    row.querySelectorAll('button').forEach(b => {
        b.onclick = () => {
            document.documentElement.dataset.focus = b.dataset.v;
            write(FOCUS_KEY, b.dataset.v);
            paint();
        };
    });
    paint();
    container.appendChild(row);
}
