/**
 * devcompare.js — 개발용 비교 버튼 (**임시** · 2026-09-21 사용자 지시 · Focus 2026-10-03)
 *
 * `⚙` 판 설정 탭 마지막 줄 (SCREEN_DESIGN §10-2) — **게임 기능이 아니다.** 고른 쪽은 이 브라우저에만 남는다(localStorage).
 *   · `Focus [Off | Stop | Dim]` — 관전에서 한 유닛이 행동하면 재생을 잠깐 세워 시선을 모은다(`battle.js:focusMode`)
 *   ~~`Card [Before | After]`~~ 는 2026-10-09 걷었다 — 관전 카드는 개편판으로 고정이다(ADR-0566 · 되돌림은 `battle.js:CARD_V2`)
 *
 * 어떻게 동작하나 — `<html data-focus="off|stop|dim">` 하나를 건다. 재생기가 사건을 적용할 때 `battle.js:focusMode()` 로
 *   이 값을 읽고, 값이 없으면 `FOCUS_DEFAULT` 기본값을 쓴다. 다시 그리지 않는다 — 다음 행동부터 먹는다.
 *
 * ⚠ 걷어내려면 이 파일과 `app.js` 의 import · 호출(`settingsBody`) 줄만 지운다. 기본값은 `FOCUS_DEFAULT` 한 줄이다.
 * ⚠ 문구는 영어 · 기호다 — 다국어 대상이 아니다(유저에게 안 보인다 · devpalette.js 와 같다).
 */
import { focusMode, FOCUS_MODES } from './battle.js';

const FOCUS_KEY = 'devFocus';
const read = k => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* 사생활 모드 */ } };

// 불러올 때 1회 — 저장된 선택을 `<html>` 에 되살린다. 설정 탭은 판을 열어야 그려지므로 거기서 하면 늦다 — 첫 행동부터 그 모양이어야 한다
{
    // `?focus=off|stop|dim` (개발용 URL · 헤드리스 검증) 이 저장값보다 먼저다 — 그 로드에서만 먹고 저장하지 않는다
    const q = new URLSearchParams(location.search).get('focus');
    const f = FOCUS_MODES.includes(q) ? q : read(FOCUS_KEY);
    if (FOCUS_MODES.includes(f)) document.documentElement.dataset.focus = f;
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
