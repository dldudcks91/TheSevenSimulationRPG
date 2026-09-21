/**
 * devcompare.js — 개발용 전/후 비교 버튼 (**임시** · 2026-09-21 사용자 지시)
 *
 * 상단바 ⚙ 왼쪽의 `Card [Before | After]` — 관전 유닛 카드의 개편 전(ADR-0017 모양) / 개편 후(ADR-0262 이름 띠와
 * 뒤따르는 카드 개편 전부)를 그 자리에서 오간다. **게임 기능이 아니다.** 고른 쪽은 이 브라우저에만 남는다(localStorage).
 *
 * 어떻게 동작하나 — `<html data-card="v1|v2">` 하나를 건다. 재생기가 카드를 그릴 때 `battle.js:cardV2()` 로 이 값을 읽고,
 *   값이 없으면 `battle.js:CARD_V2` 기본값을 쓴다. 누르면 앱이 전체를 다시 그려 관전이 **같은 재생 위치**에서 다른 카드로 선다
 *   (새로고침이 아니다 — 새로고침은 도는 원정을 「게임 종료」로 끊는다).
 *
 * ⚠ 걷어내려면 이 파일과 `app.js` 의 import · 호출 두 줄만 지운다. 개편을 확정하거나 버리는 것은 `CARD_V2` 한 줄이다.
 * ⚠ 문구는 영어 · 기호다 — 다국어 대상이 아니다(유저에게 안 보인다 · devpalette.js 와 같다).
 */
import { cardV2 } from './battle.js';

const KEY = 'devCard';
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const write = v => { try { localStorage.setItem(KEY, v); } catch { /* 사생활 모드 */ } };

let inited = false;
/** 부팅 뒤 첫 상단바에서 1회 — 저장된 선택을 `<html>` 에 되살린다. 관전이 서기 전이라 첫 카드부터 그 모양이다 */
function init() {
    if (inited) return;
    inited = true;
    const v = read();
    if (v === 'v1' || v === 'v2') document.documentElement.dataset.card = v;
    injectStyle();
}

/** 상단바가 다시 그려질 때마다 호출된다 — 버튼은 매번 새로 붙는다. `rerender` = 앱의 전체 다시 그림 */
export function mountCardCompare(container, rerender) {
    init();
    const cur = cardV2() ? 'v2' : 'v1';
    const wrap = document.createElement('span');
    wrap.className = 'dc-wrap';
    wrap.title = 'Dev — battle unit card: before / after the redesign (temporary)';
    wrap.innerHTML = `<span class="dc-k">Card</span>${[['v1', 'Before'], ['v2', 'After']]
        .map(([v, label]) => `<button class="btn sm dc-b${v === cur ? ' on' : ''}" data-v="${v}">${label}</button>`).join('')}`;
    wrap.querySelectorAll('.dc-b').forEach(b => {
        b.onclick = () => {
            if (b.dataset.v === cur) return;
            document.documentElement.dataset.card = b.dataset.v;
            write(b.dataset.v);
            rerender();
        };
    });
    container.appendChild(wrap);
}

function injectStyle() {
    const s = document.createElement('style');
    s.textContent = `
.dc-wrap { display: inline-flex; align-items: center; gap: 3px; margin-left: 6px; }
.dc-k { font-size: 11px; color: #888; margin-right: 2px; }
.dc-wrap .dc-b.on { border-color: #d8a23a; color: #f0c060; }`;
    document.head.appendChild(s);
}
