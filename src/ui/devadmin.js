/**
 * devadmin.js — 관리자 모드 `Admin` (**개발 장치** · 2026-09-24 사용자 지시 · SCREEN_DESIGN §10-3)
 *
 * 상단바 언어 버튼 오른쪽의 `Admin` — **누르면 바로 아래에 판이 열린다 · 누르기만으로는 아무것도 안 넣는다** [2026-10-23 사용자 「어떤 것들을 추가할지」 · R332].
 *   판의 줄 = Unlock(켜기 · 끄기) · Gold · Materials · Blueprints · Hero([Add]). **게임 기능이 아니다.**
 *   판은 창 레이어가 아니다 — `Admin` 이나 × 로만 여닫고, 화면을 다시 그려도 열린 채다(페이지를 연 동안 · 상단바가 그려질 때마다 새로 붙는다).
 *
 * **Unlock** — 켜 두면 건물 때문에 막힌 것(탭 · 기능 · 상한)과 **스테이지가 열린 척한다**(이번 버전의 장까지 — 6 · 7장은 켜도 잠긴다 · ADR-0552).
 *   판정은 `game_logic` 이 한다. `data.js` 가 조립 때 `adminOn` 을 `createGameSystem({openAll})` 로 넘기고,
 *   「무엇이 열렸나」를 세는 셋(`limitsOf` · `hasFeature` · `constructionState.tabs`)이 이 값이 참이면 모든 건물을 최대 랭크로 친다 ·
 *   `stageUnlocked` 는 `balance.csv:chapter_open_max` 장까지의 모든 스테이지에 참이다(INTERFACE §2-7 · R227).
 *   **건물은 안 짓고 클리어 기록도 안 쓴다** — 세이브는 그대로라 끄면 원래 진행으로 돌아간다. 누르면 앱이 전체를 다시 그린다
 *   (새로고침이 아니다 — 새로고침은 도는 원정을 끊는다). 켠 상태는 이 브라우저에만 남는다(localStorage).
 *
 * **[Add] 줄** — 무엇을 넣는지는 앱이 `acts` 로 넘긴다(`app.js` 가 세이브를 만진다 · 값 `balance.csv:admin_gold` · `admin_materials` · `admin_blueprints` · `admin_hero_level`).
 *   넣은 것은 세이브에 남는다. Hero 는 누를 때마다 1명(메인 직업 랜덤 · `state.adminHero` · Unlock 과 무관 — 로스터 자리만 본다).
 *
 * ⚠ 걷어내려면 이 파일과 `app.js` 의 import · 호출(`mountAdmin`) 두 줄, `data.js` 의 import · 주입 두 줄을 지운다(`state.adminHero` 는 부르는 곳이 없어질 뿐이다).
 * ⚠ 문구는 영어다 — 다국어 대상이 아니다(유저에게 안 보인다 · devcompare.js 와 같다).
 */

const KEY = 'devAdmin';
const read = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
const write = v => { try { if (v) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch { /* 사생활 모드 */ } };

let on = read();
/** Unlock 이 켜져 있나 — `data.js` 가 `openAll` 로 주입한다 */
export const adminOn = () => on;

/** 판이 열려 있나 — 페이지를 연 동안만(저장 안 함) */
let open = false;

/** [Add] 줄 — 순서 · 이름 · 값 글자. `acts[id]` = { n, run?, full? } — `run` 이 없으면(판이 없다) 흐린다 · `full` 이면 흐린다(로스터가 찼다) */
const ROWS = [
    { id: 'gold',       label: 'Gold',       value: n => n.toLocaleString('en-US') },
    { id: 'materials',  label: 'Materials',  value: n => `${n} each` },
    { id: 'blueprints', label: 'Blueprints', value: n => `${n} each` },
    { id: 'hero',       label: 'Hero',       value: n => `Random Lv${n}` },
];

let styled = false;
/** 상단바가 다시 그려질 때마다 호출된다 — 버튼 · 판은 매번 새로 붙는다. `rerender` = 앱의 전체 다시 그림 · `acts` = [Add] 줄이 할 일 (위 ROWS) */
export function mountAdmin(container, rerender, acts = {}) {
    if (!styled) { styled = true; injectStyle(); }
    const wrap = document.createElement('span');
    wrap.className = 'da-wrap';
    const b = document.createElement('button');
    b.className = `btn sm da-b${on ? ' on' : ''}`;
    b.textContent = 'Admin';
    b.title = 'Dev — pick what to add';
    const panel = buildPanel(rerender, acts);
    panel.hidden = !open;
    // 여닫기는 다시 그리지 않는다 — 판만 숨기고 보인다
    const toggle = () => { open = !open; panel.hidden = !open; };
    b.onclick = toggle;
    panel.querySelector('.da-x').onclick = toggle;
    wrap.append(b, panel);
    container.appendChild(wrap);
}

function buildPanel(rerender, acts) {
    const p = document.createElement('div');
    p.className = 'da-panel';
    p.innerHTML = `
        <div class="da-h"><b>Admin</b><button class="da-x" title="close">×</button></div>
        <div class="da-grid"><div class="da-row"><div class="da-k">Unlock</div><div class="da-v">buildings · stages</div>
            <div class="da-seg"><button class="btn sm" data-v="1">On</button><button class="btn sm" data-v="0">Off</button></div></div></div>`;
    const grid = p.querySelector('.da-grid');
    p.querySelectorAll('.da-seg button').forEach(x => {
        const v = x.dataset.v === '1';
        x.classList.toggle('on', v === on);
        x.onclick = () => { if (v === on) return; on = v; write(on); rerender(); };
    });
    for (const r of ROWS) {
        const a = acts[r.id];
        if (!a) continue;
        const row = document.createElement('div');
        row.className = 'da-row';
        row.innerHTML = `<div class="da-k">${r.label}</div><div class="da-v">${r.value(a.n)}</div>`;
        const add = document.createElement('button');
        add.className = 'btn sm';
        add.textContent = 'Add';
        add.disabled = !a.run || !!a.full;
        if (a.full) add.title = 'Roster full';
        add.onclick = () => { a.run(); rerender(); };
        row.appendChild(add);
        grid.appendChild(row);
    }
    return p;
}

function injectStyle() {
    const s = document.createElement('style');
    s.textContent = `
.btn.da-b.on { border-color: #d8a23a; color: #f0c060; }
/* 판은 Admin 바로 아래 — ⚙ 판(devpalette.js)과 같은 모양 · 상단바에 쌓임 맥락이 없어 창 레이어 위에 선다 */
.da-wrap { position: relative; display: inline-flex; align-items: center; }
.da-panel {
    position: absolute; right: 0; top: calc(100% + 12px); z-index: 90; width: max-content;
    background: #101010; border: 1px solid #444; padding: 8px 12px 10px;
    font-size: 12px; color: #e8e8e8; box-shadow: 0 8px 28px rgba(0,0,0,.8);
}
.da-panel[hidden] { display: none; }
.da-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.da-x { background: none; border: 0; color: #aaa; font-size: 17px; line-height: 1; cursor: pointer; }
/* 줄 다섯이 한 격자 — 이름 · 값 · 버튼 칸이 줄마다 맞는다 */
.da-grid { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 6px 14px; }
.da-row { display: contents; }
.da-row > :last-child { justify-self: end; }
.da-panel .da-k { color: #aaa; }
.da-panel .da-v { color: #e8e8e8; font-variant-numeric: tabular-nums; }
.da-seg { display: flex; gap: 4px; }
.da-seg .btn.on { border-color: #d8a23a; color: #f0c060; }`;
    document.head.appendChild(s);
}
