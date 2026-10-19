/**
 * devadmin.js — 관리자 모드 `Admin` (**개발 장치** · 2026-09-24 사용자 지시 · SCREEN_DESIGN §10-3)
 *
 * 상단바 언어 버튼 오른쪽의 `Admin` — 켜 두면 건물 때문에 막힌 것(탭 · 기능 · 상한)과 **스테이지가 열린 척한다**(이번 버전의 장까지 — 6 · 7장은 켜도 잠긴다 · ADR-0552). **게임 기능이 아니다.**
 *
 * 어떻게 동작하나 — 판정은 `game_logic` 이 한다. `data.js` 가 조립 때 `adminOn` 을 `createGameSystem({openAll})` 로 넘기고,
 *   「무엇이 열렸나」를 세는 셋(`limitsOf` · `hasFeature` · `constructionState.tabs`)이 이 값이 참이면 모든 건물을 최대 랭크로 친다 ·
 *   `stageUnlocked` 는 `balance.csv:chapter_open_max` 장까지의 모든 스테이지에 참이다(INTERFACE §2-7 · R227).
 *   **건물은 안 짓고 클리어 기록도 안 쓴다** — 세이브는 그대로라 끄면 원래 진행으로 돌아간다. 누르면 앱이 전체를 다시 그린다
 *   (새로고침이 아니다 — 새로고침은 도는 원정을 끊는다). 켠 상태는 이 브라우저에만 남는다(localStorage).
 *
 * **켤 때 골드 · 재료를 채운다** [2026-09-27 · 재료 2026-10-09 사용자 지시] — `onEnable` 콜백이 앱의 세이브를 만진다(`app.js` · 값 `balance.csv:admin_gold` · `admin_materials`). 이것만은 세이브에 남는다.
 *
 * **켜 둔 동안 `+Lv30` 이 옆에 선다** [2026-10-08 사용자 지시] — 전사 · 마법사 · 기사를 `balance.csv:admin_hero_level` 로 로스터에 넣는다(`mountAdminHeroes`). 이것도 세이브에 남는다.
 *
 * ⚠ 걷어내려면 이 파일과 `app.js` 의 import · 호출 세 줄, `data.js` 의 import · 주입 두 줄을 지운다(`state.adminHero` 는 `openAll` 이 꺼져 있으면 거절만 한다).
 * ⚠ 문구는 영어다 — 다국어 대상이 아니다(유저에게 안 보인다 · devcompare.js 와 같다).
 */

const KEY = 'devAdmin';
const read = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
const write = v => { try { if (v) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch { /* 사생활 모드 */ } };

/** `+Lv30` 이 넣는 직업 — 이 순서로 들어가고 로스터 자리가 모자라면 앞에서부터 들어가는 만큼만 [2026-10-08 사용자 지시] */
export const ADMIN_HERO_CLASSES = ['warrior', 'mage', 'knight'];

let on = read();
/** 지금 켜져 있나 — `data.js` 가 `openAll` 로 주입한다 */
export const adminOn = () => on;

let styled = false;
/** 상단바가 다시 그려질 때마다 호출된다 — 버튼은 매번 새로 붙는다. `rerender` = 앱의 전체 다시 그림 */
export function mountAdmin(container, rerender, onEnable = null) {
    if (!styled) { styled = true; injectStyle(); }
    const b = document.createElement('button');
    b.className = `btn sm da-b${on ? ' on' : ''}`;
    b.textContent = 'Admin';
    b.title = 'Dev — every building counts as max rank · every stage open up to this version\'s last chapter · gold and materials topped up when turned on';
    b.onclick = () => { on = !on; write(on); if (on) onEnable?.(); rerender(); };
    container.appendChild(b);
}

/**
 * `+Lv<n>` — **켜져 있을 때만** `Admin` 오른쪽에 선다 [2026-10-08 사용자 「30레벨 전사, 마법사, 기사 … 키우기 귀찮아서」 · SCREEN_DESIGN §10-3].
 * 누르면 `onClick` 이 영웅을 넣는다(앱이 `state.adminHero` 를 부른다 · 진짜 영웅이라 세이브에 남는다). `full` 이면 흐리고 안 눌린다(로스터가 찼다)
 */
export function mountAdminHeroes(container, level, full, onClick) {
    if (!on) return;
    const b = document.createElement('button');
    b.className = 'btn sm da-b';
    b.textContent = `+Lv${level}`;
    b.title = full ? 'Roster full' : `Dev — add Warrior · Mage · Knight at level ${level} (real heroes · saved)`;
    b.disabled = full;
    b.onclick = onClick;
    container.appendChild(b);
}

function injectStyle() {
    const s = document.createElement('style');
    s.textContent = `
.btn.da-b.on { border-color: #d8a23a; color: #f0c060; }`;
    document.head.appendChild(s);
}
