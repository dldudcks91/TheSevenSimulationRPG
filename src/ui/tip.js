/**
 * 툴팁 — **기계장치를 한 곳에** (2026-08-28).
 *
 * 화면 렌더러(`app.js`)와 관전 재생기(`battle.js`)가 같은 `#tooltip` 한 자리를 쓴다. 표시·따라다니기·넘침 보정을
 * 두 번 짜면 한쪽만 고쳐지므로 여기 하나만 둔다. **내용은 부르는 쪽이 만든다** — `bindTipNode(node, build)` 의
 * `build()` 가 붙일 노드를 돌려준다.
 *
 * 다만 **영웅 카드 · 스킬 카드는 여기 둔다**: 두 렌더러가 같은 카드를 띄우기 때문이다(영웅 띠 ↔ 관전 유닛 카드).
 * 몬스터 카드(관전 적 카드 · 2026-09-14)도 여기 있다 — 영웅 카드와 몸통이 하나다(유닛 카드 · ADR-0114).
 * 그 몸통의 줄 조립(`attrRowsHtml` · `sheetRowsHtml`)은 **캐릭터 탭의 기본 옵션 · 세부 옵션도 부른다** — 두 자리가 한 표기다.
 * 아이템 비교 카드는 `app.js` 에 남는다 — 희귀도 · 접사 · 무기군처럼 app 쪽 헬퍼를 많이 타서 옮기면 그게 따라온다.
 *
 * **Alt 상태도 여기 든다** (2026-09-10 · SCREEN_DESIGN §2 · ADR-0089 · ADR-0114) — 누르는 동안만 켜지고,
 * 떠 있는 **`data-alt` 카드**(스킬 카드 · 유닛 카드)만 그 자리에서 다시 그린다. 스킬 창의 줄 문장(`skillLineHtml`)은 이 상태를 안 본다.
 *
 * **겹쳐 붙은 툴팁** — 관전 유닛 카드(영웅) 안에 스킬 칸이 들어 있다. 칸에서 나가 카드로 돌아올 때
 * `mouseenter` 는 다시 안 뜨므로(자식에서 부모로 돌아오는 건 진입이 아니다) 여기서 조상의 툴팁을 되살린다.
 *
 * i18n 규약: **이 파일에 한국어 리터럴을 쓰지 않는다** (주석 제외) — app.js · battle.js 와 같다.
 */

import * as M from './mock.js';
import { t, L, has as STRINGS_HAS } from './i18n.js';
import { D, SYS, skillTagName } from './data.js';

const $tip = () => document.querySelector('#tooltip');

const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
};

/* 스킬 아이콘 그림 — `app.js`·`battle.js` 와 같은 규칙 (SCREEN_DESIGN §2 · 규칙은 `mock.skillIcon` 한 곳) */
const skillImg = s => {
    const src = M.skillIcon(s?.id);
    return src ? `<img src="${src}" alt="" loading="lazy" onerror="this.remove()">` : '';
};

/* ───────── 기계장치 ───────── */

/**
 * node 위에 올리면 build() 가 만든 카드를 띄운다.
 * @param build () => Node | Node[]
 * @param anchor true 면 커서가 아니라 **node 옆**에 선다 — 유닛 카드(관전 · 출정 창 띠)만 준다.
 *   크고 오래 읽는 카드라 커서를 따라가면 읽는 동안 흔들린다 (SCREEN_DESIGN §2 「유닛 툴팁 규격」 · ADR-0120)
 */
export function bindTipNode(node, build, { anchor = false } = {}) {
    node.dataset.tip = '1';
    node._tipBuild = build;
    node._tipAnchor = anchor;
    node.onmouseenter = ev => openTip(node, ev);
    node.onmousemove = moveTip;
    node.onmouseleave = ev => {
        const up = node.parentElement?.closest('[data-tip]');
        // 카드 속 칸(스킬)에서 카드로 돌아오면 카드의 툴팁이 **카드의 자리 규칙**으로 다시 선다
        if (up?._tipBuild && ev.relatedTarget && up.contains(ev.relatedTarget)) openTip(up, ev);
        else hideTip();
    };
}

/** 지금 뜬 툴팁이 붙은 노드 — `null` 이면 커서를 따른다 (ADR-0120) */
let anchorNode = null;
/**
 * 붙은 쪽 — 카드 옆 중 화면이 더 넓게 남은 쪽. **카드를 짓기 전에** 정한다: 유닛 카드가 이 쪽을 보고 세부 옵션 열을
 * 기본 옵션의 **바깥**에 세운다(왼쪽에 섰으면 왼쪽 · ADR-0126). 쪽은 **카드 자리만** 본다 — 툴팁 폭으로 정하면 Alt 로 넓어지는 순간 튄다(실측)
 */
let anchorSide = 'right';

/** 노드의 툴팁을 연다 — 앵커 · 쪽을 먼저 정하고 그다음에 카드를 짓는다 */
function openTip(node, ev) {
    anchorNode = node._tipAnchor ? node : null;
    if (anchorNode) {
        const r = stageRect(anchorNode);
        anchorSide = r.w - r.right >= r.left ? 'right' : 'left';
    } else anchorSide = 'right';
    showTip(node._tipBuild(), ev);
}

function showTip(content, ev) {
    const tip = $tip();
    if (!tip) return;
    tip.innerHTML = '';
    for (const n of [].concat(content)) if (n) tip.appendChild(n);
    tip.classList.add('show');
    moveTip(ev);
}

/**
 * 창 좌표 → **한 장 좌표** (SCREEN_DESIGN §2 · ADR-0087 · ADR-0109). 화면은 `#stage` 한 장이 `transform` 으로 통째로 줄고 늘고
 * (터치 기기의 세로 창에서는 90° 눕고), 마우스의 `clientX/Y` 를 그대로 `left/top` 에 넣으면 그만큼 어긋난다 —
 * `app.js:fitStage` 가 건 행렬을 **그대로 뒤집어** 되돌린다(회전도 함께 풀린다 · `#stage` 는 왼쪽 위 0,0 · `transform-origin: 0 0`).
 * ⚠ 창 사각형(`getBoundingClientRect`)을 옮길 때는 모서리 둘을 각각 바꿔 작은 쪽 · 큰 쪽을 고른다 — 눕힌 한 장에서는 창의 왼쪽 위가 한 장의 왼쪽 위가 아니다.
 * `#stage` 가 없으면(dev/test.html 이 이 파일을 import 한다) 창 좌표 그대로다. **부를 때만** DOM 을 읽는다.
 * @returns {{x:number, y:number, s:number, w:number, h:number}} x·y = 한 장 안의 점 · s = 배율 · w·h = 한 장 크기
 */
export function stagePoint(ev) {
    const st = document.getElementById('stage');
    if (!st) return { x: ev.clientX, y: ev.clientY, s: 1, w: window.innerWidth, h: window.innerHeight };
    const t = getComputedStyle(st).transform;
    const m = t === 'none' ? new DOMMatrix() : new DOMMatrix(t);
    const p = m.inverse().transformPoint(new DOMPoint(ev.clientX, ev.clientY));
    return { x: p.x, y: p.y, s: Math.hypot(m.a, m.b), w: st.offsetWidth, h: st.offsetHeight };
}

/**
 * 노드의 창 사각형 → **한 장 좌표** 사각형. 모서리 둘을 각각 옮겨 작은 쪽 · 큰 쪽을 고른다 — 눕힌 한 장(ADR-0109)에서는
 * 창의 왼쪽 위가 한 장의 왼쪽 위가 아니다 (위 `stagePoint` 의 ⚠)
 */
function stageRect(node) {
    const b = node.getBoundingClientRect();
    const a = stagePoint({ clientX: b.left, clientY: b.top }), z = stagePoint({ clientX: b.right, clientY: b.bottom });
    return { left: Math.min(a.x, z.x), right: Math.max(a.x, z.x), top: Math.min(a.y, z.y), w: a.w, h: a.h };
}

/**
 * 커서를 따라다니되 **한 장** 밖으로 나가면 반대쪽으로 접는다 — 좌표 · 크기는 전부 한 장 단위다(`stagePoint`).
 * 앵커가 있으면(유닛 카드 · ADR-0120) 커서 대신 **그 카드 옆**에 선다 — 오른쪽, 넘치면 왼쪽 · 윗변은 카드 윗변 · 아래로 넘치면 올린다.
 * 카드가 다시 그려져 앵커가 문서에서 빠졌으면 커서로 돌아간다
 */
export function moveTip(ev) {
    const tip = $tip();
    if (!tip) return;
    const anchored = anchorNode?.isConnected;
    if (!anchored && !ev) return;
    // 카드 옆이면 재기 전에 한 장 왼쪽 끝으로 보낸다 — 옛 자리의 남은 폭에 눌려 넓어진 카드(Alt)가 좁게 재이지 않게. 같은 틱이라 안 깜빡인다
    tip.style.right = '';
    if (anchored) tip.style.left = '0px';
    const tw = tip.offsetWidth, th = tip.offsetHeight;   // 배율 전 크기 = 한 장 단위
    let x, y, w, h;
    if (anchored) {
        const r = stageRect(anchorNode);
        ({ w, h } = r);
        y = r.top;
        // 쪽은 띄울 때 정했다(`openTip` 의 `anchorSide`) · 넘치면 한 장 안으로 민다
        if (anchorSide === 'right') x = Math.min(r.right + 8, w - tw - 8);
        else if (r.left - 8 - tw >= 8) {
            // 왼쪽이면 **오른변을 카드 쪽에 못 박는다**(`right`) — 그 변에 기본 옵션 열이 있어 Alt 로 넓어져도 제자리다(ADR-0126).
            //   `left` 로 놓으면 폭의 소수점이 반올림돼 열이 1px 흔들렸다(실측 780 → 779)
            tip.style.left = 'auto';
            tip.style.right = `${w - (r.left - 8)}px`;
            x = null;
        } else x = 8;   // 왼쪽에도 다 안 들어가면 한 장 왼쪽 끝
    } else {
        const p = stagePoint(ev);
        ({ w, h } = p);
        x = p.x + 16; y = p.y + 16;
        if (x + tw > w - 8) x = p.x - tw - 16;
    }
    if (y + th > h - 8) y = h - th - 8;
    if (x !== null) tip.style.left = Math.max(8, x) + 'px';
    tip.style.top = Math.max(8, y) + 'px';
}

export function hideTip() { anchorNode = null; $tip()?.classList.remove('show'); }

/* ───────── 카드 — 두 렌더러가 함께 쓴다 ───────── */

// 등급 표기 — SSOT 는 `hero_tier.csv` 다 (2026-09-08 R48 · ~~mock.js:HERO_TIER~~ 대체 · app.js 와 같은 규칙)
const tierOf = h => D.heroTiers.find(t => t.id === h.tier) ?? D.heroTiers.find(t => t.id === 'rare') ?? D.heroTiers[0];

/* ───────── 유닛 카드 — 영웅 · 몬스터 (SCREEN_DESIGN §2 「유닛 툴팁 규격」 · ADR-0114) ─────────
   몸통은 **캐릭터 탭의 두 표기 그대로**다 — 왼쪽 「기본 옵션」 막대 줄 · Alt 를 누르는 동안 오른쪽 「세부 옵션」 행.
   줄 조립은 **여기 한 곳**이고 캐릭터 탭(app.js attrPanel · detailPanels)도 이것을 부른다 — 두 자리가 따로 짜면 한쪽만 고쳐진다 */

/**
 * 세부 옵션 머리 — 대표값 몇 줄을 굵게 찍고 그 아래 간격을 둔다 (`sheet_order` 1..N · 구분선은 2026-09-15 사용자 지시로 걷었다).
 * 물리·마법 공격력 중 **하나는 늘 꺼져 있다**(무기 종류가 정한다) — 지우지 않는 것이 결정이다: 회색으로 남은
 * 그 자리가 「내 빌드가 어느 쪽인가」를 말한다 (SCREEN_DESIGN §6, 2026-09-01).
 */
const DETAIL_LEAD = 3;

/** 상한이 걸리는 저항 4행 — 값만으로는 "몇 %까지 의미가 있나"를 못 읽는다 (battle_design §9-5) */
const RES_ROWS = ['res_fire', 'res_cold', 'res_lightning', 'res_poison'];

/** 전투 능력치 표기 — 단위 붙이기는 여기 한 곳에서만 */
const fmtCombat = (def, v) => v === undefined ? '—'
    : typeof v === 'object' ? rangeText(v)          // 공격력 두 줄은 범위 {min, max} (R90 · ADR-0108)
    : def.fmt === 'pct' ? `${Math.round(v * 10) / 10}%`
    : def.fmt === 'sec' ? t('sk.cycleSec', { s: v.toFixed(2) })
    : String(v);

/** 세부 옵션의 행 — impl=0 은 computeCombat 이 내지 않는 축이라 안 그린다 · 순서는 sheet_order 하나가 정한다 (combat_stat.csv) */
export const sheetStats = () => D.combatStats.filter(s => s.impl).sort((a, b) => a.sheetOrder - b.sheetOrder);

/**
 * 세부 옵션 행 — 캐릭터 탭 세부 옵션 1·2 와 유닛 툴팁 오른쪽 열이 같이 쓴다.
 * 방어 소재값 → 감쇠율 · 저항 → 현재 상한은 `formula` 가 낸다 — 같은 곡선을 두 번 구현하지 않는다 (battle_design §9-8).
 * @param rows `sheetStats()` 전체 또는 그 조각
 * @param c    computeCombat 모양 — 영웅 `game.heroCombat` · 몬스터 `round` 이벤트의 `sheet`. 없으면 전 행이 흐린 `—`
 */
export function sheetRowsHtml(rows, c) {
    const resCap = SYS.formula.resCap(c?.res_max_bonus ?? 0);
    return rows.map(s => {
        const v = c?.[s.id];
        const has = v !== undefined;
        const extra = RES_ROWS.includes(s.id) ? ` <span class="muted">${t('st.resCap', { cap: resCap })}</span>`
            : s.id === 'defense' && has ? ` <span class="muted">${t('st.mitigation', { p: Math.round(SYS.formula.mitigation(v) * 100) })}</span>` : '';
        // 물리 방어는 정수로 반올림해 찍는다 (2026-09-15 사용자 지시 · SCREEN_DESIGN §6) — 감쇠율은 위에서 반올림 전 값으로 냈다.
        //   fmt 로 가르지 않는다: 같은 `n` 인 HP 재생(0.05)까지 0 이 된다
        const shown = s.id === 'defense' && has ? Math.round(v) : v;
        return `<div class="cs-row${has ? '' : ' off'}${s.sheetOrder <= DETAIL_LEAD ? ' lead' : ''}">
            <span class="cs-n">${L(s)}</span>
            <span class="cs-v">${fmtCombat(s, shown)}${extra}</span></div>`;
    }).join('');
}

/**
 * 기본 옵션 줄 — `.attr-list` 격자 **안에** 들어갈 일곱 줄 (캐릭터 탭 기본 옵션 · 유닛 툴팁 왼쪽 열).
 * 막대 폭은 범위 `hero_attr_min ~ hero_attr_max` 안의 자리다 — 표시 비율이지 전투 계산이 아니다.
 * 범위 숫자 줄(`1 ~ 20`)은 안 찍는다 — 막대 폭이 이미 그 자리를 말한다 (2026-09-15 사용자 지시 · SCREEN_DESIGN §6).
 * @param color 막대 색(CSS 값) — 영웅은 등급 색 · 몬스터는 카드 윗변 색
 */
export function attrRowsHtml(stats, color) {
    const min = D.balance.hero_attr_min, max = D.balance.hero_attr_max;
    return D.heroAttributes.map(s => {
        const v = stats?.[s.id];
        const pct = v === undefined ? 0 : Math.max(0, Math.min(100, (v - min) / (max - min) * 100));
        return `<div class="attr-row">
            <span class="attr-n">${L(s)}<i class="cs-a">${s.abbr}</i></span>
            <span class="attr-bar"><i style="width:${pct}%;background:${color}"></i></span>
            <span class="attr-v">${v ?? '—'}</span></div>`;
    }).join('');
}

/**
 * 세부 옵션을 두 쪽으로 가르는 자리 — '피해 감소' 앞에서 끊는다 (SCREEN_DESIGN §6, 2026-09-01).
 * 1 = 대표 3 + 공격 + 물리 방어 + 저항 4 + 최대 저항 증가(때리고 막는 밑수) / 2 = 피해 감소부터 끝(부가 효과).
 * 저항 4행과 그 상한을 움직이는 `res_max_bonus` 는 한 쪽에 둔다 — 값 뒤에 같은 상한이 붙는 묶음이라 갈리면 상한이 두 번 나온다.
 * 캐릭터 탭의 두 패널과 유닛 툴팁의 두 열이 **같은 자리에서** 끊는다 (ADR-0115)
 */
const DETAIL_SPLIT_AT = 'damage_reduction';
/** 세부 옵션 두 쪽 — `[1쪽 행, 2쪽 행]` (캐릭터 탭 세부 옵션 1 · 2 · 유닛 툴팁 오른쪽 두 열) */
export const sheetPages = () => {
    const rows = sheetStats();
    const cut = rows.findIndex(s => s.id === DETAIL_SPLIT_AT);
    return [rows.slice(0, cut), rows.slice(cut)];
};

/**
 * 유닛 카드 뼈대 — 기본 옵션 막대 + **대표값 3줄**(Alt 와 무관하게 선다 · ADR-0119).
 * **이름 · 소속 줄은 없다** — 툴팁은 올린 카드 바로 옆에 붙어 뜨고(ADR-0120) 그 카드의 이름 줄 · 위칸이 이미 든다 (ADR-0129).
 * 무엇의 툴팁인지는 윗변 색과 붙은 자리가 말한다.
 * **Alt 를 누르는 동안만** 세부 옵션 두 열이 서고 각주가 걷힌다 — 두 열은 캐릭터 탭 세부 옵션 1 · 2 와 같은 자리에서 끊고 열 이름도 같되,
 * 대표값 3줄은 기본 옵션 열이 들므로 **빼고** 찍는다(나란히 두 번 서지 않게). 한 열로 이으면 스무 줄이 넘어 카드가 아레나를 세로로 덮었다 (ADR-0115).
 * Alt 가 바뀌면 `setAlt` 가 떠 있는 카드를 `_rebuild` 로 **같은 인자로** 다시 만든다 — 스킬 카드와 같은 장치다.
 * @param color 막대 색 = 윗변 색(CSS 값)
 * @param cls   카드에 더할 클래스 — 어두운 등급 색이면 `bar-lift`(막대만 밝힌다 · style.css)
 */
function unitCard(stats, color, sheet, rebuild, cls = '') {
    // `grow-left` — 툴팁이 카드 **왼쪽**에 섰다(`openTip` 이 짓기 전에 정한다): 세부 옵션 열이 기본 옵션의 왼쪽에 선다 (ADR-0126).
    //   열 자리는 CSS 격자가 정하고 DOM 순서는 그대로다
    const side = anchorSide === 'left' ? ' grow-left' : '';
    const c = el('div', `tip-card unit${altHeld ? ' alt' : ''}${side}${cls ? ` ${cls}` : ''}`);
    c.dataset.alt = '1';
    c._rebuild = rebuild;
    c.style.setProperty('--unit-line', color);   // 윗변 3px — 관전 카드 · 띠 카드의 윗변과 같은 색이라 어느 카드의 툴팁인지 잇는다
    const isLead = s => s.sheetOrder <= DETAIL_LEAD;
    const pages = altHeld ? sheetPages().map((rows, i) => `
            <div class="tip-unit-col d${i + 1}">
                <div class="tip-col-h">${t('ch.detail.hn', { n: i + 1 })}</div>
                <div class="tip-sheet">${sheetRowsHtml(rows.filter(s => !isLead(s)), sheet)}</div>
            </div>`).join('') : '';
    c.innerHTML = `
        <div class="tip-unit">
            <div class="tip-unit-col base">
                <div class="tip-col-h">${t('ch.attr.h')}</div>
                <div class="attr-list">${attrRowsHtml(stats, color)}</div>
                <div class="tip-sheet tip-lead">${sheetRowsHtml(sheetStats().filter(isLead), sheet)}</div>
            </div>${pages}
        </div>
        ${altHeld ? '' : `<div class="tip-foot">${t('tip.unit.altHint')}</div>`}`;
    return c;
}

/**
 * 영웅 카드 — 기본 옵션 · 대표값 · (Alt) 세부 옵션 (SCREEN_DESIGN §2 「유닛 툴팁 규격」 · §4-2 · §5). 막대 · 윗변 색 = 등급 색(`hero_tier.csv`).
 * 능력치는 `h.stats` 에서 그대로 읽는다. 세부 옵션은 **부르는 쪽이 넘긴다** — `game.heroCombat` 은 상태 `G` 가 있어야 하는데 이 파일은 `G` 를 모른다.
 * 이름 · 직업 · 레벨 · 죄종 · 등급 줄은 없다 — 올린 카드가 이미 든다 (ADR-0129)
 * @param combat computeCombat 결과 — 없으면 세부 옵션이 전부 `—`
 */
export function heroTipCard(h, combat = null) {
    if (!h) return null;
    return unitCard(h.stats, tierOf(h).color, combat, () => heroTipCard(h, combat));
}

/** 몬스터 막대 색 = **카드 윗변 색** — 관전 카드가 등급으로 칠하는 토큰 그대로다(style.css `.unit.enemy` · `.unit.elite` · `.unit.boss`) */
const GRADE_LINE = { normal: 'var(--enemy-line)', elite: 'var(--color-warning)', stage_boss: 'var(--boss-line)', chapter_boss: 'var(--boss-line)' };

/**
 * 몬스터 카드 — 기본 옵션 · 대표값 · (Alt) 세부 옵션 (SCREEN_DESIGN §2 「유닛 툴팁 규격」 · §4-2).
 * 기본 능력치는 `round` 이벤트의 `stats`(monster.csv 의 7 칸), 세부 옵션은 같은 이벤트의 `sheet`(R94) 그대로다 — 렌더러는 계산하지 않는다.
 * 이름 · 직업 · 등급 줄은 없다 — 올린 카드의 이름 줄 · 테두리 색이 이미 든다 (ADR-0129)
 * @param u 재생기의 적 유닛 `{grade, stats, sheet}`
 */
export function monsterTipCard(u) {
    if (!u) return null;
    // 어두운 등급 색(일반 `--enemy-line` · 보스 `--boss-line`)은 막대만 밝힌다 — 검은 막대 바탕에 묻힌다. 정예(노랑)는 그대로 (2026-09-15 · SCREEN_DESIGN §2)
    const lift = u.grade === 'elite' ? '' : 'bar-lift';
    return unitCard(u.stats, GRADE_LINE[u.grade] ?? GRADE_LINE.normal, u.sheet ?? null, () => monsterTipCard(u), lift);
}

/* ───────── 스킬 문장 (SCREEN_DESIGN §2 「스킬 설명창 규격」 · 전면 개정 2026-09-08 · 숫자 자리 셋 2026-09-10) ─────────
   ~~표기/실효 쿨 두 줄~~ 대신 **데이터로 조립한 한 문장**을 낸다. 파생값(피해 · 실효값)과 **식의 재료**(원값 · 배율 · 능력치 · 계수)는
   `game_logic/skill.js:previewOf().parts` 가 내고 여기서는 **문장만** 만든다 — 렌더러는 더하지도 곱하지도 않는다 (ADR-0089). */

/** 숫자 강조 — 문장에서 눈에 걸려야 하는 값만 감싼다 */
const hl = v => `<b class="tip-hl">${v}</b>`;
/** 수 표기 — 7.2 는 그대로, 12.0 은 12 로 (소수점이 붙으면 정밀해 보여 오해를 준다) */
const num = v => String(Number(Number(v).toFixed(1)));
/** 쿨 자리 — 괄호가 안 붙는다(능력치가 미는 슬롯이 없다) */
const sec = v => hl(num(v));
/**
 * 범위 표기 `{min, max}` — 양끝이 다르면 `st.range`(「1,200~1,800」) · 같으면 한 수 (R90 · SCREEN_DESIGN §2 · §6 · ADR-0108).
 * 무기 피해 · 스킬 피해 · 회복량이 쓴다 — 캐릭터 시트 · 아이템 툴팁 · 제련소도 같은 함수를 부른다(app.js)
 */
export const rangeText = r => (r.min === r.max ? r.min.toLocaleString()
    : t('st.range', { a: r.min.toLocaleString(), b: r.max.toLocaleString() }));

/** 숫자 자리의 단위 — 틀이 아니라 **자리 안에** 든다. 틀이 `{s}초간` 처럼 단위를 들면 Alt 의 식이 값과 단위 사이에 끼인다 */
const UNIT = {
    none: v => v,
    pct: v => `${v}%`,
    sec: v => t('time.s', { s: v }),
    times: v => t('sk.u.times', { v }),
};

/** 식의 밑수 이름 — 공격력은 `st.atk`(CSV 에 「공격력」 한 단어 행이 없다) · 나머지 둘은 `combat_stat.csv` 이름 그대로 */
const statName = id => L(D.combatStats?.find(x => x.id === id) ?? { ko: id, en: id });
const BASIS_NAME = { atk: () => t('st.atk'), matk: () => statName('atk_magic'), hpMax: () => statName('hp_max') };
/** 능력치 약어 — `hero_attribute.csv:abbr` */
const abbrOf = id => D.heroAttributes?.find(a => a.id === id)?.abbr ?? id;

/**
 * 숫자 자리 하나 — **상태 셋** (SCREEN_DESIGN §2 「스킬 설명창 규격」):
 *   기본 `25%` · Alt `25% (15 + LDR × 1)` · 값 없음 `(15 + LDR × 1)%`.
 * 괄호는 **슬롯이 미는 숫자에만** 붙는다 — `part`(= `previewOf().parts.*`)가 없으면 원값 그대로다.
 * @param o.raw  슬롯이 없을 때 찍는 원값 (음수 디버프는 절댓값으로 넘긴다 — 방향은 틀이 든다)
 * @param o.part `parts.*` 또는 undefined
 * @param o.unit `UNIT.*`
 * @param o.head 식의 첫 항 `wrap => html` — 기본은 원값의 절댓값. 피해 · 회복 · 벽은 `밑수 × 배율%`
 * @param o.show 값 표기 — 기본 `num`
 * @param R      렌더 상태 `{alt, fx}` — 괄호를 붙일 수 있는 자리를 만나면 `fx = true`(각주를 세울지 카드가 본다)
 */
function slot({ raw, part, unit = UNIT.none, head, show = num }, R) {
    if (!part) return unit(hl(show(raw)));
    const fx = wrap => `(${head ? head(wrap) : wrap(num(Math.abs(part.raw)))}`
        + part.terms.map(x => ` + ${abbrOf(x.attr)} × ${wrap(String(x.coef))}`).join('') + ')';
    // 값 없음 — 식이 숫자 자리를 **대신**한다. 흐리게 두지 않고 식 속 숫자를 강조한다(흐리면 문장의 강조가 쿨 하나만 남는다)
    if (part.value == null) return unit(fx(hl));
    // 피해 · 회복량은 범위 객체 `{min, max}` 로 온다(R90) — 절댓값을 안 씌우고 `show` 가 범위를 푼다
    const v = unit(hl(show(typeof part.value === 'object' ? part.value : Math.abs(part.value))));
    if (!part.terms.length) return v;
    R.fx = true;
    return R.alt ? `${v} <span class="tip-fx">${fx(x => x)}</span>` : v;
}

/** 피해 · 회복량 · 벽 HP 자리 — 식의 첫 항이 `밑수 이름 × 배율%` 다 · 값은 범위 `{min, max}`(벽은 양끝이 같아 한 수 · R90) */
const amountSlot = (part, R) => slot({
    part,
    show: rangeText,
    head: wrap => `${BASIS_NAME[part.basis]?.() ?? part.basis} × ${wrap(num(part.pct))}%`,
}, R);

/**
 * 수량 구절 — 값을 아는 자리는 **실제 수치**(`{v} 의 물리 피해`), 모르는 자리는 **식**(`{f} 만큼 피해`)으로 접는다.
 * ⚠ 감소·치명·추가 피해 **전**의 값이다 (previewOf 주석) — 설명창이 약속하는 건 「내가 때리는 세기」다.
 */
function amountPhrase(def, part, atkType, R) {
    if (!part) return null;
    const heal = def.kind === 'heal';
    const d = amountSlot(part, R);
    if (part.value == null) return t(heal ? 'sk.amt.healFx' : 'sk.amt.fx', { f: d });
    return t(heal ? 'sk.amt.heal' : (atkType && atkType !== 'physical' ? 'sk.amt.magic' : 'sk.amt.physical'), { v: d });
}

/**
 * 버프 효과 구절 — 이름 + 값만. 어휘에 없는 stat 이면 null(그 문장을 안 만든다).
 * **음수 값은 디버프**다 (참회 · 속박 — 같은 창을 반대로 쓴다). 부호를 문장에 그대로 흘리면
 *   「공격력 +-25%」가 되므로 절댓값을 넘기고 **`.neg` 틀이 방향을 든다**. 값 자리가 `%` 까지 든다(틀은 단위를 안 든다).
 */
function effectPhrase(def, P, R) {
    const key = `sk.eff.${def.stat}${def.value < 0 ? '.neg' : ''}`;
    return STRINGS_HAS(key) ? t(key, { v: slot({ raw: Math.abs(def.value), part: P.value, unit: UNIT.pct }, R) }) : null;
}

/**
 * 문장 — `kind` × `target` 이 틀을 정한다. 틀이 없으면 `null`(설명만 뜬다).
 * 숫자 자리는 **틀이 쓸 때만** 만든다(`() =>`) — 안 쓰는 자리가 `R.fx` 를 켜서 각주가 헛서지 않게.
 * @returns {string[] | null} 첫째가 본 문장 · 둘째는 확률로 터지는 추가 피해(있을 때만 — **완결된 둘째 문장**이라 틀에 잇지 않는다)
 */
function skillLines(def, pv, atkType, R) {
    const P = pv?.parts ?? {};
    // 표기 쿨 — 실효 쿨은 폐기됐다 (개정 2026-09-08 2차 · ADR-0038). 어느 영웅이 들든 같은 수다
    const n = sec(pv?.baseSec ?? def.cool);
    const at = (raw, key, unit) => slot({ raw, part: P[key], unit }, R);
    if (def.kind === 'attack') {
        const d = amountPhrase(def, P.amount, atkType, R);
        if (d === null) return null;
        const k = () => at(def.decay, 'decay', UNIT.pct);
        const h = () => at(def.hits, 'hits', UNIT.times);
        let line;
        // 광역 — 감쇠가 있으면 **주 대상만 온전**하다(멀티샷). 감쇠가 없는 광역은 옛 틀 그대로
        if (def.target === 'enemy_all') line = (P.decay || def.decay > 0) ? t('sk.line.allDecay', { n, d, k: k() }) : t('sk.line.all', { n, d });
        else if (def.target === 'enemy_chain') line = t('sk.line.chain', { n, d, k: k() });
        else if (def.target === 'enemy_rotate') line = t('sk.line.rotate', { n, d, h: h() });
        // 가이디드 — 단타 + 방어 감소(감쇠 칸이 그 적의 방어를 깎는 비율이다 · skill.csv note)
        else if (def.target === 'enemy_highest_def') line = t('sk.line.guided', { n, d, k: k() });
        else {
            // 타수 슬롯이 있으면 여럿일 수 있으므로(모르면 식) 다타 틀로 — 버림은 `scaleDef` 가 이미 했다
            const many = P.hits ? (P.hits.value == null || P.hits.value > 1) : def.hits > 1;
            line = many ? t('sk.line.singleN', { n, d, h: h() }) : t('sk.line.single', { n, d });
        }
        if (!(def.procChance > 0)) return [line];
        return [line, t('sk.line.proc', { c: at(def.procChance, 'procChance', UNIT.pct), x: at(def.procMult, 'procMult', UNIT.pct) })];
    }
    if (def.kind === 'heal') {
        const d = amountPhrase(def, P.amount, atkType, R);
        return d === null ? null : [t(def.target === 'ally_single' ? 'sk.line.healOne' : 'sk.line.heal', { n, d })];
    }
    // 소환 — 벽의 HP 가 `시전자 최대 HP × 배율 + 능력치 항` 이다 (skill_design §12-6). 피해가 아니라 구절 없이 자리만 쓴다
    if (def.kind === 'summon') return P.amount ? [t('sk.line.summon', { n, d: amountSlot(P.amount, R) })] : null;
    // 오오라 — **쿨이 없다.** 그래서 이 문장만 `{n}` 을 안 든다 (skill_design §1-5)
    if (def.kind === 'aura') {
        const e = effectPhrase(def, P, R);
        return e === null ? null : [t('sk.line.aura', { e })];
    }
    if (def.kind === 'buff') {
        const s = () => at(def.dur, 'dur', UNIT.sec);
        if (def.stat === 'taunt') return [t('sk.line.taunt', { n, s: s() })];
        // 지목은 창의 길이를 안 말한다 — 「라운드가 끝날 때까지」라 초로 셀 것이 아니다. 효과값은 그동안 **시전자가 받는 피해 감소**다
        if (def.stat === 'duel') return [t('sk.line.duel', { n, v: at(Math.abs(def.value), 'value', UNIT.pct) })];
        const e = effectPhrase(def, P, R);
        if (e === null) return null;
        const key = def.target === 'party' ? 'sk.line.buffParty'
            : def.target === 'party_adjacent' ? 'sk.line.buffAdjacent'
            : (def.target === 'enemy_all' || def.target === 'enemy_single') ? 'sk.line.debuffAll'
            : 'sk.line.buffSelf';
        return [t(key, { n, s: s(), e })];
    }
    return null;
}

/* ───────── Alt 계산식 — 누르는 동안만 (SCREEN_DESIGN §2 「스킬 설명창 규격」 · ADR-0089) ─────────
   토글이 아니다 — 켜 둔 것을 잊으면 모든 설명창이 식으로 부푼다. 떠 있는 설명창도 **즉시** 바꾼다
   (마우스를 다시 올리게 하면 보려던 순간을 놓친다). 바꾸는 것은 **`data-alt` 카드** — 스킬 카드(식) · 유닛 카드(세부 옵션 열 · 2026-09-14). 아이템 카드는 그대로다.
   스킬 창의 줄 문장(`skillLineHtml`)은 이 상태를 **안 본다** — 판 안에 셋이 나란히 서서 식이 붙으면 세 줄이 같이 부푼다 */
let altHeld = false;
/** 마지막 마우스 위치 — 다시 그린 카드의 높이가 달라져도 넘침 보정이 맞게 `moveTip` 을 한 번 더 부른다 */
let lastMove = null;

function setAlt(on) {
    if (altHeld === on) return;
    altHeld = on;
    const tip = $tip();
    if (!tip?.classList.contains('show')) return;
    // 다시 그리는 카드 = `data-alt` 를 단 것 — 스킬 설명창 · 유닛 카드(ADR-0114). 제 인자를 쥔 `_rebuild` 로 같은 카드를 새로 만든다
    const cards = tip.querySelectorAll('.tip-card[data-alt]');
    for (const c of cards) c.replaceWith(c._rebuild());
    // 카드 옆에 붙은 툴팁(ADR-0120)은 마우스 위치 없이도 다시 놓인다 — 넓어진 카드가 넘치면 왼쪽 · 위로 옮긴다
    if (cards.length && (anchorNode || lastMove)) moveTip(lastMove);
}

// Alt 만 기본 동작을 막는다 — 막지 않으면 떼는 순간 브라우저 메뉴로 포커스가 넘어간다.
// 창이 포커스를 잃으면(Alt+Tab) keyup 이 안 오므로 떼는 것으로 친다
window.addEventListener('keydown', ev => { if (ev.key === 'Alt') { ev.preventDefault(); setAlt(true); } });
window.addEventListener('keyup', ev => { if (ev.key === 'Alt') { ev.preventDefault(); setAlt(false); } });
window.addEventListener('blur', () => setAlt(false));
window.addEventListener('mousemove', ev => { lastMove = ev; }, { passive: true });

/**
 * 툴팁이 내는 **문장**을 그대로 낸다 — 스킬 창의 액티브 줄 · 아이템 툴팁의 담은 스킬 줄이 hover 와 같은 말을 하게 하는 창이다
 * [2026-09-08 사용자 지시 · SCREEN_DESIGN §7]. 카드와 **같은 함수**(`skillLines`)를 쓰므로 둘이 갈릴 길이 없다.
 * ⚠ **Alt 를 안 본다** — 기본 · 값 없음 두 상태만 탄다 (ADR-0089). 추가 피해 문장은 줄바꿈으로 가른다.
 * ⚠ `desc`(고정 설명)는 **안 낸다** — 줄에서 뺐다(같은 지시). 설명창도 2026-09-15 에 뗐다(ADR-0118).
 * @returns {string} 틀이 없는 스킬이면 빈 문자열
 */
export function skillLineHtml(s, ctx = {}) {
    const def = SYS.skill?.defs?.[s?.id] ?? null;
    if (!def) return '';
    return (skillLines(def, SYS.skill.previewOf(def, ctx), ctx.atkType, { alt: false, fx: false }) ?? []).join('<br>');
}

/**
 * 스킬 카드 — 아이콘 + 이름 / 칩 / **문장**(추가 피해가 있으면 둘째 문장) / 「Alt 계산식」 각주 (SCREEN_DESIGN §2 「스킬 설명창 규격」).
 * 머리에는 **출처 칩**(영웅·무기·전직 — 부르는 자리가 `ctx.source` 를 줄 때만. 출처가 글자로 이미 선 자리는 안 준다 · ADR-0121) · **태그 칩**(파생 포함 — `skill_tag.csv` 가 이름의 SSOT) · **능력치 칩**이 선다.
 * 능력치 칩은 스케일링 슬롯(`def.scales`)이 가리키는 능력치의 약어다 — 슬롯 순서 · 같은 능력치는 한 번 · 계수 0 이어도 찍는다 (ADR-0118).
 * 고정 설명(`def.desc`)은 **안 낸다** — 문장이 같은 말을 값까지 넣어 한다(같은 ADR).
 * Alt 가 바뀌면 `setAlt` 가 떠 있는 카드를 **같은 인자로** 다시 만든다 — 그래서 카드가 제 인자를 쥔 `_rebuild` 를 든다(유닛 카드와 같은 장치).
 * @param s   `.id` 만 있으면 된다 — 정의는 `SYS.skill.defs` 에서 집는다(호출처마다 다른 모양을 받아 왔다)
 * @param ctx {period, atkMin, atkMax, matkMin, matkMax, hpMax, atkType, stats, source} — 모르는 값은 생략한다. 그 숫자 자리가 식으로 접힌다
 */
export function skillTipCard(s, ctx = {}) {
    if (!s) return null;
    const def = SYS.skill?.defs?.[s.id] ?? null;
    const c = el('div', 'tip-card');
    c.dataset.alt = '1';
    c._rebuild = () => skillTipCard(s, ctx);
    const name = L(def?.name ?? s.name ?? { ko: s.id, en: s.id });
    const chips = [];
    if (ctx.source) chips.push(`<i class="tip-chip src">${t(ctx.source === 'innate' ? 'sk.innate' : `sk.src.${ctx.source}`)}</i>`);
    for (const tg of (def ? SYS.skill.tagsOf(def) : [])) chips.push(`<i class="tip-chip">${L(skillTagName(tg))}</i>`);
    for (const at of new Set((def?.scales ?? []).map(x => x.attr))) chips.push(`<i class="tip-chip attr">${abbrOf(at)}</i>`);
    // 정의를 못 찾으면(행이 지워진 옛 세이브) 이름만 낸다 — 던지지 않는다
    const R = { alt: altHeld, fx: false };
    const lines = def ? skillLines(def, SYS.skill.previewOf(def, ctx), ctx.atkType, R) : null;
    c.innerHTML = `
        <div class="tip-head">${t('tip.skill.h')}</div>
        <div class="tip-name"><span class="tip-sk-ico">${skillImg(s)}</span>${name}</div>
        ${chips.length ? `<div class="tip-chips">${chips.join('')}</div>` : ''}
        ${(lines ?? []).map(l => `<div class="tip-line">${l}</div>`).join('')}
        ${R.fx && !R.alt ? `<div class="tip-foot">${t('sk.altHint')}</div>` : ''}`;
    return c;
}
