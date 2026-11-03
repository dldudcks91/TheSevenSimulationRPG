/**
 * devsave.js — `⚙` 판의 **Save** 탭 · 세이브 슬롯 셋 (**개발 장치** · 2026-10-23 사용자 지시 · SCREEN_DESIGN §10-4 · ADR-0738)
 *
 * 판을 **자동 저장과 따로** 남겨 두고 다시 연다 — 사용자 「특정구간을 저장」 · 「데이터확인용」.
 *   [Save]  = 지금 판을 그 슬롯에 복사 (빈 슬롯은 한 번 · 찬 슬롯은 두 번 누름 — 덮어쓰기)
 *   [Load]  = 그 슬롯으로 판을 바꾸고 자동 저장을 그 내용으로 덮는다 — **거기서부터 자동 저장이 다시 갱신된다** · 슬롯은 그대로 (두 번 누름)
 *   [Clear] = 슬롯 비우기 (두 번 누름)
 * 메뉴의 [불러오기]는 지금처럼 자동 저장을 연다.
 *
 * 판을 만지는 일은 `app.js` 가 넘긴다 — 판이 있나(`hasGame`) · 복사(`snapshot`) · 열 수 있나(`canLoad`) ·
 *   불러오기(`restore` — 메뉴의 이어 하기와 같은 길 · 저장 뒤 흐른 시간은 꺼진 동안처럼 센다). 저장소는 `storage.js` 의 슬롯 함수만 만진다.
 *
 * ⚠ 문구는 영어다 — 다국어 대상이 아니다(devpalette.js 의 Palette 탭과 같다).
 * ⚠ 걷어내려면 이 파일과 `app.js` 의 import · `mountDevPalette` 에 넘기는 탭, `storage.js` 의 슬롯 함수 셋을 지운다.
 */

import { loadSlot, writeSlot, clearSlot } from './storage.js';

/** 슬롯 수 — 개발 장치의 상수라 CSV 가 아니다 (사용자 「3개정도」) */
export const SLOTS = 3;

// 첫 누름을 받은 버튼(`'load:2'` 꼴) — 다른 버튼을 누르면 풀린다. 탭이 다시 서도 남는다(앱이 다시 그려도 첫 누름이 안 지워지게)
let armed = null;

/** Save 탭 — `devpalette.js` 가 판에 덧붙는 탭으로 받는다. `opts` = { hasGame() · snapshot() → 세이브 · canLoad(세이브) · restore(세이브) → 됐나 } */
export function saveSlotsTab(opts) {
    injectStyle();
    return { id: 'save', label: 'Save', body: () => slotsBody(opts) };
}

function slotsBody(opts) {
    const box = document.createElement('div');
    box.className = 'ds-box';
    // 슬롯 줄 셋뿐이라 통째로 다시 세운다 — 게임 화면은 안 다시 그린다(도는 원정 · 재생 위치가 그대로)
    const redraw = () => box.replaceWith(slotsBody(opts));
    for (let n = 1; n <= SLOTS; n++) box.appendChild(slotRow(n, opts, redraw));
    return box;
}

function slotRow(n, opts, redraw) {
    const s = loadSlot(n);
    const live = !!s && opts.canLoad(s);
    const row = document.createElement('div');
    row.className = 'ds-row';
    // 요약은 메뉴의 세이브 요약과 같은 셋(영웅 · 클리어 칸 · 골드) — 판정 없이 칸을 고르기만 한다
    const info = !s ? 'Empty'
        : !live ? `Old save v${s.version}`
        : `${new Date(s.savedAt).toLocaleString()}<br>Heroes ${s.heroes.length} · Cleared ${s.progress.cleared.length} · Gold ${s.resources.gold.toLocaleString()}`;
    row.innerHTML = `<div class="ds-h">Slot ${n}</div><div class="ds-i${live ? '' : ' off'}">${info}</div><div class="ds-b"></div>`;
    const bar = row.querySelector('.ds-b');
    /** `ask` = 첫 누름에 바뀌는 글 — 없으면 한 번에 일어난다 */
    const btn = (act, label, ask, disabled, run) => {
        const id = `${act}:${n}`;
        const b = document.createElement('button');
        b.className = `btn sm${armed === id ? ' armed' : ''}`;
        b.textContent = armed === id ? ask : label;
        b.disabled = disabled;
        b.onclick = () => {
            if (ask && armed !== id) { armed = id; redraw(); return; }
            armed = null;
            run();
        };
        bar.appendChild(b);
    };
    btn('save', 'Save', s ? 'Overwrite?' : null, !opts.hasGame(), () => { writeSlot(n, opts.snapshot()); redraw(); });
    // 누른 순간의 슬롯을 다시 읽는다 — 줄을 세운 뒤 다른 탭이 그 슬롯을 썼을 수 있다
    btn('load', 'Load', 'Load?', !live, () => { const cur = loadSlot(n); if (!cur || !opts.restore(cur)) redraw(); });
    btn('clear', 'Clear', 'Clear?', !s, () => { clearSlot(n); redraw(); });
    return row;
}

let styled = false;
function injectStyle() {
    if (styled) return;
    styled = true;
    const s = document.createElement('style');
    s.textContent = `
.ds-box { padding: 4px 0 2px; }
.ds-row { padding: 7px 0; border-bottom: 1px solid #2a2a2a; }
.ds-row:last-child { border-bottom: 0; }
.ds-h { font-weight: 700; }
.ds-i { color: #9a9a9a; font-size: 11px; line-height: 1.45; margin: 2px 0 6px; }
.ds-i.off { color: #666; }
.ds-b { display: flex; gap: 4px; }
.ds-b .btn.armed { border-color: #d8a23a; color: #f0c060; }`;
    document.head.appendChild(s);
}
