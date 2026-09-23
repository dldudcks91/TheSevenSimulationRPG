/**
 * devadmin.js — 관리자 모드 `Admin` (**개발 장치** · 2026-09-24 사용자 지시 · SCREEN_DESIGN §10-3)
 *
 * 상단바 언어 버튼 오른쪽의 `Admin` — 켜 두면 건물 때문에 막힌 것(탭 · 기능 · 상한)이 전부 **열린 척한다.** **게임 기능이 아니다.**
 *
 * 어떻게 동작하나 — 판정은 `game_logic` 이 한다. `data.js` 가 조립 때 `adminOn` 을 `createGameSystem({openAll})` 로 넘기고,
 *   「무엇이 열렸나」를 세는 셋(`limitsOf` · `hasFeature` · `constructionState.tabs`)이 이 값이 참이면 모든 건물을 최대 랭크로 친다(INTERFACE §2-7).
 *   **건물은 안 짓는다** — 세이브의 건물 랭크는 그대로라 끄면 원래 진행으로 돌아간다. 누르면 앱이 전체를 다시 그린다
 *   (새로고침이 아니다 — 새로고침은 도는 원정을 끊는다). 켠 상태는 이 브라우저에만 남는다(localStorage).
 *
 * ⚠ 걷어내려면 이 파일과 `app.js` 의 import · 호출 두 줄, `data.js` 의 import · 주입 두 줄을 지운다.
 * ⚠ 문구는 영어다 — 다국어 대상이 아니다(유저에게 안 보인다 · devcompare.js 와 같다).
 */

const KEY = 'devAdmin';
const read = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
const write = v => { try { if (v) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch { /* 사생활 모드 */ } };

let on = read();
/** 지금 켜져 있나 — `data.js` 가 `openAll` 로 주입한다 */
export const adminOn = () => on;

let styled = false;
/** 상단바가 다시 그려질 때마다 호출된다 — 버튼은 매번 새로 붙는다. `rerender` = 앱의 전체 다시 그림 */
export function mountAdmin(container, rerender) {
    if (!styled) { styled = true; injectStyle(); }
    const b = document.createElement('button');
    b.className = `btn sm da-b${on ? ' on' : ''}`;
    b.textContent = 'Admin';
    b.title = 'Dev — every building counts as max rank (save unchanged)';
    b.onclick = () => { on = !on; write(on); rerender(); };
    container.appendChild(b);
}

function injectStyle() {
    const s = document.createElement('style');
    s.textContent = `
.btn.da-b.on { border-color: #d8a23a; color: #f0c060; }`;
    document.head.appendChild(s);
}
