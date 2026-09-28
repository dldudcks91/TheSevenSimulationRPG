/**
 * devfx.js — 관전 연출 단계 버튼 (**임시** · 2026-09-28 사용자 지시 · SCREEN_DESIGN §10-4 · ADR-0406)
 *
 * 상단바 카드 전/후 버튼 오른쪽의 `FX [1] [2] [3]` — 관전 연출(fx.js)의 세 단계를 **따로** 켜고 끈다.
 *   1 피격 반응 · 2 스킬 이펙트 · 3 타격 그림. **게임 기능이 아니다.** 고른 값은 이 브라우저에만 남는다(localStorage).
 *
 * 어떻게 동작하나 — `<html data-fx="123">` 하나를 건다(fx.js 의 `setFx`). 연출은 사건마다 이 값을 읽으므로
 *   **다시 그리지 않는다** — 누른 순간부터 다음 사건에 먹는다(도는 원정 · 재생 위치 그대로).
 *   값이 없으면 fx.js 가 `FX_DEFAULT` 를 건다.
 *
 * ⚠ 걷어내려면 이 파일과 `app.js` 의 import · 호출 두 줄만 지운다. 단계를 넣거나 빼는 것은 `fx.js:FX_DEFAULT` 한 줄이다.
 * ⚠ 문구는 영어 · 숫자다 — 다국어 대상이 아니다(유저에게 안 보인다 · devcompare.js 와 같다).
 */
import { fxOn, setFx } from './fx.js';

const KEY = 'devFx';
const STAGES = [[1, 'hit reaction'], [2, 'skill effects'], [3, 'hit art']];
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const write = v => { try { localStorage.setItem(KEY, v); } catch { /* 사생활 모드 */ } };

let inited = false;
/** 부팅 뒤 첫 상단바에서 1회 — 저장된 선택을 `<html>` 에 되살린다. 관전이 서기 전이라 첫 사건부터 그 값이다 */
function init() {
    if (inited) return;
    inited = true;
    const v = read();
    if (v !== null && /^[123]*$/.test(v)) setFx(v);
    injectStyle();
}

/** 상단바가 다시 그려질 때마다 호출된다 — 버튼은 매번 새로 붙는다 */
export function mountFxToggle(container) {
    init();
    const wrap = document.createElement('span');
    wrap.className = 'dfx-wrap';
    wrap.title = 'Dev — battle effects by stage (temporary)';
    wrap.innerHTML = `<span class="dfx-k">FX</span>${STAGES
        .map(([n, label]) => `<button class="btn sm dfx-b${fxOn(n) ? ' on' : ''}" data-n="${n}" title="${n} — ${label}">${n}</button>`).join('')}`;
    wrap.querySelectorAll('.dfx-b').forEach(b => {
        b.onclick = () => {
            b.classList.toggle('on');
            const v = [...wrap.querySelectorAll('.dfx-b.on')].map(x => x.dataset.n).join('');
            setFx(v);
            write(v);
        };
    });
    container.appendChild(wrap);
}

function injectStyle() {
    const s = document.createElement('style');
    s.textContent = `
.dfx-wrap { display: inline-flex; align-items: center; gap: 3px; margin-left: 6px; }
.dfx-k { font-size: 11px; color: #888; margin-right: 2px; }
.dfx-wrap .dfx-b { min-width: 24px; padding-left: 0; padding-right: 0; }
.dfx-wrap .dfx-b.on { border-color: #d8a23a; color: #f0c060; }`;
    document.head.appendChild(s);
}
