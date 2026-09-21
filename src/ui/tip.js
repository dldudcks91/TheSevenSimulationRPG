/**
 * 툴팁 — **기계장치를 한 곳에** (2026-08-28).
 *
 * 화면 렌더러(`app.js`)와 관전 재생기(`battle.js`)가 같은 `#tooltip` 한 자리를 쓴다. 표시·따라다니기·넘침 보정을
 * 두 번 짜면 한쪽만 고쳐지므로 여기 하나만 둔다. **내용은 부르는 쪽이 만든다** — `bindTipNode(node, build)` 의
 * `build()` 가 붙일 노드를 돌려준다.
 *
 * 다만 **영웅 카드 · 스킬 카드는 여기 둔다**: 두 렌더러가 같은 카드를 띄우기 때문이다(영웅 띠 ↔ 관전 유닛 카드).
 * 몬스터 카드(관전 적 카드 · 2026-09-14)도 여기 있다 — **첫 장까지 영웅과 같은 카드다**: 착용 장비 3×3 + Alt 세부 옵션 두 열
 * (ADR-0171 · 몬스터 2026-09-21 ADR-0183). 갈리는 것은 **한 벌의 출처** 하나뿐이다 — 영웅은 `equipped`(위치 → uid) · 몬스터는 `gear`(부위 배열).
 * 그 몸통의 줄 조립(`attrRowsHtml` · `sheetRowsHtml`)은 **캐릭터 탭의 기본 옵션 · 세부 옵션도 부른다** — 두 자리가 한 표기다.
 * 아이템 비교 카드는 `app.js` 에 남는다 — 희귀도 · 접사 · 무기군처럼 app 쪽 헬퍼를 많이 타서 옮기면 그게 따라온다.
 *
 * **Alt 상태도 여기 든다** (2026-09-10 · SCREEN_DESIGN §2 · ADR-0089 · ADR-0114) — 누르는 동안만 켜지고,
 * 떠 있는 **`data-alt` 를 단 것**(스킬 카드 · 유닛 카드 · 아이템 카드의 스킬 칸 — ADR-0139)만 그 자리에서 다시 그린다. 스킬 창의 줄 문장(`skillLineHtml`)은 이 상태를 안 본다.
 *
 * **겹쳐 붙은 툴팁** — 관전 유닛 카드(영웅) 안에 스킬 칸이 들어 있다. 칸에서 나가 카드로 돌아올 때
 * `mouseenter` 는 다시 안 뜨므로(자식에서 부모로 돌아오는 건 진입이 아니다) 여기서 조상의 툴팁을 되살린다.
 *
 * i18n 규약: **이 파일에 한국어 리터럴을 쓰지 않는다** (주석 제외) — app.js · battle.js 와 같다.
 */

import * as M from './mock.js';
import { t, L, lang, has as STRINGS_HAS } from './i18n.js';
import { D, SYS, skillTagName, monsterFace, monsterName, monsterSin, monsterStory, fillStory } from './data.js';

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
    // 제 그림이 없는 스킬은 **검은 칸** — 남의 그림을 안 빌린다 (2026-09-18 · ADR-0162). 스킬이 없는 칸(`s` 없음)은 그대로 빈다
    return src ? `<img src="${src}" alt="" loading="lazy" onerror="this.remove()">` : s?.id ? '<i class="sk-noart"></i>' : '';
};

/* ───────── 기계장치 ───────── */

/**
 * node 위에 올리면 build() 가 만든 카드를 띄운다.
 * @param build () => Node | Node[]
 * @param anchor true 면 커서가 아니라 **node 옆**에 선다 — 유닛 카드(관전 · 출정 창 띠)만 준다.
 *   크고 오래 읽는 카드라 커서를 따라가면 읽는 동안 흔들린다 (SCREEN_DESIGN §2 「유닛 툴팁 규격」 · ADR-0120)
 * @param holdOnAlt true 면 Alt 를 누르는 동안 node 밖으로 나가도 닫지 않고 툴팁이 포인터를 받는다 — 영웅 장비 · 세부 옵션 카드만 준다 (ADR-0171 · ADR-0176)
 */
export function bindTipNode(node, build, { anchor = false, holdOnAlt = false } = {}) {
    node.dataset.tip = '1';
    node._tipBuild = build;
    node._tipAnchor = anchor;
    node._tipHoldOnAlt = holdOnAlt;
    node.onmouseenter = ev => openTip(node, ev);
    node.onmousemove = moveTip;
    node.onmouseleave = ev => {
        const up = node.parentElement?.closest('[data-tip]');
        // 카드 속 칸(스킬)에서 카드로 돌아오면 카드의 툴팁이 **카드의 자리 규칙**으로 다시 선다
        if (up?._tipBuild && ev.relatedTarget && up.contains(ev.relatedTarget)) openTip(up, ev);
        else if (altHeld && node._tipHoldOnAlt && anchorNode === node) return;
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
    hideEquipmentItemTip();
    tip.innerHTML = '';
    for (const n of [].concat(content)) if (n) tip.appendChild(n);
    tip.classList.add('show');
    syncTipInteraction();
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

export function hideTip() {
    anchorNode = null;
    hideEquipmentItemTip();
    $tip()?.classList.remove('show', 'interactive');
}

/** 영웅 툴팁의 장비 hover가 쓰는 **별도** 아이템 설명창 — 부모 폭을 바꾸면 칸이 움직여 hover가 끊기므로 형제로 띄운다 (ADR-0182). */
const $equipmentItemTip = () => document.querySelector('#equipment-item-tooltip');
function equipmentItemTipHost() {
    let host = $equipmentItemTip();
    if (host) return host;
    host = el('div', 'tooltip equipment-item-tooltip');
    host.id = 'equipment-item-tooltip';
    ($tip()?.parentElement ?? document.body).appendChild(host);
    return host;
}

function hideEquipmentItemTip() {
    $tip()?.querySelector('.tip-equip-active')?.classList.remove('tip-equip-active');
    const host = $equipmentItemTip();
    if (!host) return;
    host.classList.remove('show');
    host.innerHTML = '';
}

/** 기존 아이템 카드 한 장을 장비 칸 가까이 놓되 한 장 밖으로는 내보내지 않는다. */
function showEquipmentItemTip(content, cell) {
    hideEquipmentItemTip();
    if (!altHeld || !content || !cell) return;
    const host = equipmentItemTipHost();
    host.appendChild(content);
    host.classList.add('show');
    host.style.left = '0px';
    host.style.right = '';
    host.style.top = '0px';

    const parent = stageRect($tip()), at = stageRect(cell);
    const tw = host.offsetWidth, th = host.offsetHeight;
    // 영웅 카드에서 먼 바깥쪽을 먼저 쓴다. 안 들어가면 반대편, 그래도 넘치면 한 장 안으로 민다.
    let x = anchorSide === 'right' ? parent.right + 8 : parent.left - tw - 8;
    if (anchorSide === 'right' && x + tw > at.w - 8) x = parent.left - tw - 8;
    if (anchorSide === 'left' && x < 8) x = parent.right + 8;
    x = Math.max(8, Math.min(x, Math.max(8, at.w - tw - 8)));
    const y = Math.max(8, Math.min(at.top, Math.max(8, at.h - th - 8)));
    host.style.left = `${x}px`;
    host.style.top = `${y}px`;
    cell.classList.add('tip-equip-active');
}

/* ───────── 카드 — 두 렌더러가 함께 쓴다 ───────── */

// 등급 표기 — SSOT 는 `hero_tier.csv` 다 (2026-09-08 R48 · ~~mock.js:HERO_TIER~~ 대체 · app.js 와 같은 규칙)
const tierOf = h => D.heroTiers.find(t => t.id === h.tier) ?? D.heroTiers.find(t => t.id === 'rare') ?? D.heroTiers[0];

/* 유닛 툴팁의 첫 장 — 캐릭터 탭 페이퍼돌과 같은 배치 · 같은 그림 · 같은 모서리 배지다 (ADR-0171 · 몬스터도 같은 첫 장 ADR-0183).
   Alt 동안만 툴팁이 포인터를 받아 칸 hover를 확인할 수 있다(ADR-0176). 장착은 아래 보관 칸이 맡는다. */
const tipSlotDef = id => D.slots.find(s => s.id === id);
const tipPosDef = pos => tipSlotDef(D.equipSlots.find(s => s.id === pos)?.part);
const tipItemImg = it => {
    const src = M.itemArt(it?.slot, it?.group, it?.uid, it?.baseId);
    return src ? `<img src="${src}" alt="" loading="lazy" onerror="this.remove()">` : (tipSlotDef(it?.slot)?.icon ?? '');
};

/** 영웅의 한 벌 — `equipped` 는 **착용 위치**(equip_slot.csv) → uid 다. uid 를 아이템으로 푸는 것은 앱이 넘긴 `itemOf` 몫이다 */
const wornOfHero = (h, itemOf) => {
    const w = {};
    for (const row of M.PAPERDOLL) for (const pos of row) if (pos) w[pos] = itemOf?.(h.equipped?.[pos]) ?? null;
    return w;
};
/**
 * 몬스터의 한 벌 — `round` 이벤트의 `gear` 는 **부위**(`monster.csv:wear_slots`) 배열이라 위치가 없다 (INTERFACE §2-6 · ADR-0183).
 * 같은 부위의 착용 위치에 **앞 칸부터** 앉힌다 — 부위 하나에 위치가 둘인 반지가 그 자리다. 안 입는 부위는 빈 칸으로 남는다.
 */
const wornOfMonster = gear => {
    const w = {}, rest = [...(gear ?? [])];
    for (const row of M.PAPERDOLL) for (const pos of row) {
        if (!pos) continue;
        const part = D.equipSlots.find(s => s.id === pos)?.part;
        const i = rest.findIndex(it => it?.slot === part);
        w[pos] = i < 0 ? null : rest.splice(i, 1)[0];
    }
    return w;
};

/**
 * 장비 3×3 — 「위치 → 아이템」 한 벌을 그린다. 진영은 안 본다(영웅 · 몬스터가 같은 첫 장 · ADR-0183).
 * @returns `{html, items}` — `items` 는 **찬 칸의 순서**이고 칸의 `data-equip-i` 가 그 자리를 가리킨다.
 *   uid 로 잇지 않는 이유: 몬스터 장비는 세이브에 없어 `uid` 가 `null` 이다 (item.js `build`)
 */
function equipmentHtml(worn) {
    const cells = [], items = [];
    for (const row of M.PAPERDOLL) for (const pos of row) {
        if (!pos) { cells.push('<div class="pd-gap"></div>'); continue; }
        const def = tipPosDef(pos);
        const it = worn?.[pos] ?? null;
        if (!it) {
            const art = M.slotArt(def?.id);
            cells.push(`<div class="pd-cell${art ? ' art' : ''}">${art
                ? `<span class="pd-art"><img src="${art}" alt="" loading="lazy" onerror="this.remove()"></span>`
                : `<div class="pd-icon">${def?.icon ?? ''}</div>`}</div>`);
            continue;
        }
        const rare = M.RARITY[it.rarity] ?? M.RARITY.magic;
        cells.push(`<div class="pd-cell filled" data-equip-i="${items.length}" style="border-color:${rare.color}">
            <div class="pd-icon">${tipItemImg(it)}</div>
            ${(it.up ?? 0) > 0 ? `<span class="pd-up">+${it.up}</span>` : ''}
            <span class="pd-lv">${t('ch.itemLv', { n: it.ilvl })}</span>
        </div>`);
        items.push(it);
    }
    return {
        html: `<div class="tip-col-h">${t('ch.gear.h')}</div><div class="tip-equipment paperdoll">${cells.join('')}</div>`,
        items,
    };
}

/* ───────── 유닛 카드 — 영웅 · 몬스터 (SCREEN_DESIGN §2 「유닛 툴팁 규격」 · ADR-0114) ─────────
   **양 진영이 같은 카드다** — 첫 장은 착용 장비이고 Alt 동안 세부 옵션 두 열만 더 선다(ADR-0171 · 몬스터 2026-09-21 ADR-0183).
   Basic Stats 조립은 **지우지 않는다** — 캐릭터 탭 기본 옵션 · 편성 탭 영웅 툴팁(`statsFirstCard` · ADR-0287)이 같은 막대 조립을 부르고, 첫 장을 되살릴 여지로도 남긴다.
   옵션 줄 조립은 여기 한 곳이고 캐릭터 탭(app.js attrPanel · detailPanels)도 이것을 부른다 — 두 자리가 따로 짜면 한쪽만 고쳐진다 */

/**
 * 세부 옵션 머리 — 대표값 몇 줄을 굵게 찍고 그 아래 간격을 둔다 (`sheet_order` 1..N · 구분선은 2026-09-15 사용자 지시로 걷었다).
 * 넷이다 — 물리 데미지 · 마법 데미지 · 행동 주기 · 최대 HP [2026-09-22 사용자 지시 · ADR-0294 — 행동 주기가 마법 데미지와 최대 HP 사이에 서서 셋에서 넷이 됐다].
 * 물리·마법 공격력 중 **하나는 늘 꺼져 있다**(무기 종류가 정한다) — 지우지 않는 것이 결정이다: 회색으로 남은
 * 그 자리가 「내 빌드가 어느 쪽인가」를 말한다 (SCREEN_DESIGN §6, 2026-09-01).
 */
const DETAIL_LEAD = 4;

/** 상한이 걸리는 저항 4행 — 값만으로는 "몇 %까지 의미가 있나"를 못 읽는다 (battle_design §9-5) */
const RES_ROWS = ['res_fire', 'res_cold', 'res_lightning', 'res_poison'];

/** 전투 능력치 표기 — 단위 붙이기는 여기 한 곳에서만 · `pct` 는 비율로 와서 찍을 때만 100 을 곱한다(소수 1자리 · R111) */
const fmtCombat = (def, v) => v === undefined ? '—'
    : typeof v === 'object' ? rangeText(v)          // 공격력 두 줄은 범위 {min, max} (R90 · ADR-0108)
    : def.fmt === 'pct' ? `${Math.round(M.pctNum(v) * 10) / 10}%`
    : def.fmt === 'sec' ? t('sk.cycleSec', { s: v.toFixed(2) })
    : String(v);

/** 묶은 줄의 한 조각 이름 — 값이 있는 것만 이름을 붙여 찍는다 (`일반 10% · 데몬 5%`) */
const typeParts = o => ['normal', 'demon', 'undead'].map(k => [t(`st.fx.${k}`), o?.[k] ?? 0]);
const one = v => [[null, v ?? 0]];

/**
 * 옵션이 여는 축 — 세부 옵션의 줄이지만 **combat_stat 행이 아니다** [2026-09-22 · SCREEN_DESIGN §6 · ADR-0291].
 * 값은 `computeCombat` 의 `option_fx` 묶음(hero.js)이 들고, 전부 0 이면 묶음째 `null` 이라 모든 값이 0 이다.
 * `after` = 이 줄이 뒤에 서는 combat_stat 행(같은 `after` 끼리는 이 배열 순서) · `parts(x)` = `[[조각 이름, 값]]` —
 * 조각이 **둘 이상이면 묶은 줄**이다(값이 있는 것만 이름을 붙이고 전부 0이면 `—`). 하나면 이름 없이 값만 찍는다.
 * 줄 이름은 아이템 옵션 줄(`M.AFFIX_LABELS`) · combat_stat 이름을 먼저 쓴다 — 같은 축이 두 화면에서 다른 이름이면 안 된다.
 * **전투가 안 읽는 축은 없다** — 상태이상 시간 감소 넷은 아이템 툴팁의 「(미적용)」 줄이 든다 (ADR-0213).
 * 원소 피해 · 타격 시 방어 · 저항 감소 · 타격 시 대상 데미지 감소는 **전투가 읽지만 세우지 않는다** [2026-09-22 사용자 지시 · ADR-0294]
 */
const FX_ROWS = [
    { id: 'fx_vs_type', after: 'def_ignore', fmt: 'pct', name: () => L(D.combatStats.find(s => s.id === 'vs_type_damage')),
        parts: x => typeParts(x?.vs) },
    { id: 'fx_vs_target', after: 'def_ignore', fmt: 'pct', name: () => t('st.fx.vsTarget'),
        parts: x => [[t('kind.elite'), x?.vsElite ?? 0], [t('exp.form.front'), x?.vsFront ?? 0], [t('exp.form.back'), x?.vsBack ?? 0]] },
    { id: 'fx_crush', after: 'def_ignore', fmt: 'pct', name: () => L(M.AFFIX_LABELS.crushing_blow_pct), parts: x => one(x?.crush) },
    { id: 'fx_dr_flat', after: 'res_max_bonus', fmt: 'n', name: () => L(M.AFFIX_LABELS.dr_flat), parts: x => one(x?.drFlat) },
    { id: 'fx_dr_type', after: 'res_max_bonus', fmt: 'pct', name: () => t('st.fx.drType'), parts: x => typeParts(x?.vsDr) },
    { id: 'fx_dr_target', after: 'res_max_bonus', fmt: 'pct', name: () => t('st.fx.drTarget'),
        parts: x => [[t('kind.elite'), x?.vsEliteDr ?? 0], [t('exp.form.front'), x?.vsFrontDr ?? 0], [t('exp.form.back'), x?.vsBackDr ?? 0]] },
    { id: 'fx_counter', after: 'res_max_bonus', fmt: 'pct', name: () => L(M.AFFIX_LABELS.counter_chance), parts: x => one(x?.counter) },
    { id: 'fx_recv', after: 'hp_regen', fmt: 'pct', name: () => L(M.AFFIX_LABELS.hp_recovery_pct), parts: x => one(x?.recv) },
    { id: 'fx_buff_dur', after: 'hp_regen', fmt: 'pct', name: () => L(M.AFFIX_LABELS.buff_dur_pct), parts: x => one(x?.buffDur) },
    { id: 'fx_magic_find', after: 'item_find', fmt: 'pct', name: () => L(M.AFFIX_LABELS.magic_find), parts: x => one(x?.magicFind) },
    { id: 'fx_xp', after: 'gold_find', fmt: 'pct', name: () => L(M.AFFIX_LABELS.xp_gain_pct), parts: x => one(x?.xpGain) },
];
const fxParts = (s, c) => s.parts(c?.option_fx ?? null);
/** 옵션 줄에 값이 하나라도 있나 — 유닛 툴팁은 값이 있는 옵션 줄만 세운다 (ADR-0291) */
const fxOn = (s, c) => fxParts(s, c).some(([, v]) => v);

/** 전투는 읽는데(`impl=1`) 세부 옵션에 안 세우는 행 [2026-09-22 사용자 지시 · ADR-0294] — `impl` 은 「computeCombat 이 내는가」라 그 값을 바꾸지 않고 여기서 거른다 */
const SHEET_HIDDEN = ['res_reduction'];

/**
 * 세부 옵션의 행 — combat_stat `impl=1` 을 **sheet_order 순**으로 세우고(impl=0 은 computeCombat 이 내지 않는 축이라 안 그린다 · `SHEET_HIDDEN` 은 뺀다),
 * 그 사이사이에 옵션이 여는 축(`FX_ROWS`)을 제 `after` 행 뒤에 끼운다 (combat_stat.csv · SCREEN_DESIGN §6)
 */
export const sheetStats = () => D.combatStats.filter(s => s.impl && !SHEET_HIDDEN.includes(s.id)).sort((a, b) => a.sheetOrder - b.sheetOrder)
    .flatMap(s => [s, ...FX_ROWS.filter(r => r.after === s.id).map(r => ({ ...r, fx: true }))]);

/**
 * 세부 옵션 행 — 캐릭터 탭 세부 옵션 1·2 와 유닛 툴팁 오른쪽 열이 같이 쓴다.
 * 방어 소재값 → 감쇠율 · 저항 → 현재 상한은 `formula` 가 낸다 — 같은 곡선을 두 번 구현하지 않는다 (battle_design §9-8).
 * @param rows `sheetStats()` 전체 또는 그 조각
 * @param c    computeCombat 모양 — 영웅 `game.heroCombat` · 몬스터 `round` 이벤트의 `sheet`. 없으면 전 행이 흐린 `—`
 */
export function sheetRowsHtml(rows, c) {
    // 저항 행의 상한 = 기본 + 최대 저항 증가 + **그 원소의** 최대 저항 증가(투구 시기 칸 · `res_max_el` · 2026-09-18) — 곡선은 `formula.resCap` 하나다
    const resCap = id => SYS.formula.resCap(c?.res_max_bonus ?? 0, c?.res_max_el?.[id.slice(4)] ?? 0);   // `res_fire` → `fire`
    return rows.map(s => {
        if (s.fx) return fxRowHtml(s, c);
        const v = c?.[s.id];
        const has = v !== undefined;
        const extra = RES_ROWS.includes(s.id) ? ` <span class="muted">${t('st.resCap', { cap: M.pctNum(resCap(s.id)) })}</span>`
            : s.id === 'defense' && has ? ` <span class="muted">${t('st.mitigation', { p: Math.round(SYS.formula.mitigation(v) * 100) })}</span>` : '';
        // 물리 방어는 정수로 반올림해 찍는다 (2026-09-15 사용자 지시 · SCREEN_DESIGN §6) — 감쇠율은 위에서 반올림 전 값으로 냈다.
        //   fmt 로 가르지 않는다: 같은 `n` 인 HP 재생(0.05)까지 0 이 된다
        const shown = s.id === 'defense' && has ? Math.round(v) : v;
        return `<div class="cs-row${has ? '' : ' off'}${s.sheetOrder <= DETAIL_LEAD ? ' lead' : ''}">
            <span class="cs-n">${L(s)}</span>
            <span class="cs-v">${fmtCombat(s, shown)}${extra}</span></div>`;
    }).join('');
}

/** 옵션이 여는 축 한 줄 — 묶은 줄은 값이 있는 조각만 이름을 붙이고 전부 0이면 `—` · 세부 옵션이 없는 카드(`c` 없음)는 흐린 `—` (ADR-0291) */
function fxRowHtml(s, c) {
    const parts = fxParts(s, c);
    const on = parts.filter(([, v]) => v);
    const shown = !c ? '—'
        : parts.length === 1 ? fmtCombat(s, parts[0][1])
        : on.length ? on.map(([n, v]) => t('st.fx.part', { n, v: fmtCombat(s, v) })).join(' · ') : '—';
    return `<div class="cs-row${c ? '' : ' off'}">
            <span class="cs-n">${s.name()}</span>
            <span class="cs-v">${shown}</span></div>`;
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
 * 세부 옵션을 두 쪽으로 가르는 자리 — '방어 무시' 앞에서 끊는다 (SCREEN_DESIGN §6 · 2026-09-22 ADR-0294).
 * 1 = 사용자가 고른 14줄(대표 4 · 치명타 둘 · 쿨타임 감소 · 물리 방어 · 피해 감소 · 타격 회복 · 저항 4 — 모든 영웅이 늘 값을 갖는 축) /
 * 2 = 방어 무시부터 끝(18줄 — 조건부 · 장비가 열어야 생기는 축). 최대 저항 증가는 2 로 갔다 — 저항 행이 상한을 제 값 뒤에 찍어 상한이 두 번 나오지 않는다.
 * 캐릭터 탭의 두 패널과 유닛 툴팁의 두 열이 **같은 자리에서** 끊는다 (ADR-0115)
 */
const DETAIL_SPLIT_AT = 'def_ignore';
/**
 * 세부 옵션 두 쪽 — `[1쪽 행, 2쪽 행]` (캐릭터 탭 세부 옵션 1 · 2 · 유닛 툴팁 오른쪽 두 열)
 * @param sparse 유닛 툴팁 — 옵션이 여는 축은 **값이 있는 줄만** 남긴다(몬스터는 그 축이 없어 다 빠진다 · ADR-0291). 끊는 자리는 그대로다
 */
export const sheetPages = (c = null, sparse = false) => {
    const rows = sheetStats();
    const cut = rows.findIndex(s => s.id === DETAIL_SPLIT_AT);
    const keep = s => !sparse || !s.fx || fxOn(s, c);
    return [rows.slice(0, cut).filter(keep), rows.slice(cut).filter(keep)];
};

/**
 * 유닛 카드 뼈대 — 영웅은 착용 장비, 몬스터는 기본 옵션 막대 + 대표값(`DETAIL_LEAD`)을 첫 장으로 쓴다.
 * **이름 · 소속 줄은 없다** — 툴팁은 올린 카드 바로 옆에 붙어 뜨고(ADR-0120) 그 카드의 이름 줄 · 위칸이 이미 든다 (ADR-0134).
 * 무엇의 툴팁인지는 윗변 색과 붙은 자리가 말한다.
 * **Alt 를 누르는 동안만** 세부 옵션 두 열이 서고 각주가 걷힌다 — 두 열은 캐릭터 탭 세부 옵션 1 · 2 와 같은 자리에서 끊고 열 이름도 같되,
 * 영웅은 대표값까지 포함한 전 행, 몬스터는 첫 장과 겹치는 대표값을 뺀 행을 찍는다. 한 열로 이으면 스무 줄이 넘어 카드가 아레나를 세로로 덮었다 (ADR-0115 · ADR-0171).
 * Alt 가 바뀌면 `setAlt` 가 떠 있는 카드를 `_rebuild` 로 **같은 인자로** 다시 만든다 — 스킬 카드와 같은 장치다.
 * @param color 막대 색 = 윗변 색(CSS 값)
 * @param cls   카드에 더할 클래스 — 어두운 등급 색이면 `bar-lift`(막대만 밝힌다 · style.css)
 * @param equipment `equipmentHtml()` 의 `{html, items}` — 없으면 Basic Stats 몸통으로 떨어진다
 * @param itemCardOf 장비 **아이템 개체** → 기존 「착용 중」 아이템 카드. 앱이 아이템 표기를 주입한다(ADR-0182 · 몬스터 ADR-0183)
 */
function unitCard(stats, color, sheet, rebuild, cls = '', equipment = null, itemCardOf = null) {
    // `grow-left` — 툴팁이 카드 **왼쪽**에 섰다(`openTip` 이 짓기 전에 정한다): 세부 옵션 열이 기본 옵션의 왼쪽에 선다 (ADR-0126).
    //   열 자리는 CSS 격자가 정하고 DOM 순서는 그대로다
    const side = anchorSide === 'left' ? ' grow-left' : '';
    // 장비 · 세부 옵션 1 · 2 는 같은 278px 열이다. 기본 상태 높이도 보이지 않는 세부 옵션 1이 잡는다 (ADR-0176).
    const c = el('div', `tip-card unit${equipment ? ' equipment' : ''}${altHeld ? ' alt' : ''}${side}${cls ? ` ${cls}` : ''}`);
    c.dataset.alt = '1';
    c._rebuild = rebuild;
    c.style.setProperty('--unit-line', color);   // 윗변 3px — 관전 카드 · 띠 카드의 윗변과 같은 색이라 어느 카드의 툴팁인지 잇는다
    const isLead = s => s.sheetOrder <= DETAIL_LEAD;
    const detailPages = sheetPages(sheet, true);
    const pages = altHeld ? detailPages.map((rows, i) => `
            <div class="tip-unit-col d${i + 1}">
                <div class="tip-col-h">${t('ch.detail.hn', { n: i + 1 })}</div>
                <div class="tip-sheet">${sheetRowsHtml(equipment ? rows : rows.filter(s => !isLead(s)), sheet)}</div>
            </div>`).join('') : '';
    // 영웅은 장비 첫 장만 쓴다. 아래 Basic Stats 몸통은 몬스터와 향후 영웅 복원용으로 그대로 살려 둔다 (ADR-0171).
    // 기본 상태의 숨은 세부 옵션 1은 **높이 기준**일 뿐 화면·접근성 트리에는 보이지 않는다. 언어와 값이 바뀌어도 실제 세부 옵션 1과 정확히 같은 높이다 (ADR-0176).
    const foot = `<div class="tip-foot">${t('tip.unit.altHint')}</div>`;
    const base = equipment ? `
                <div class="tip-equipment-face">
                    ${equipment.html}
                    ${altHeld ? '' : foot}
                </div>
                ${altHeld ? '' : `<div class="tip-equipment-probe" aria-hidden="true">
                    <div class="tip-col-h">${t('ch.detail.hn', { n: 1 })}</div>
                    <div class="tip-sheet">${sheetRowsHtml(detailPages[0], sheet)}</div>
                </div>`}` : `
                <div class="tip-col-h">${t('ch.attr.h')}</div>
                <div class="attr-list">${attrRowsHtml(stats, color)}</div>
                <div class="tip-sheet tip-lead">${sheetRowsHtml(sheetStats().filter(isLead), sheet)}</div>`;
    c.innerHTML = `
        <div class="tip-unit">
            <div class="tip-unit-col base">
                ${base}
            </div>${pages}
        </div>
        ${altHeld || equipment ? '' : foot}`;
    bindEquipmentCells(c, equipment, itemCardOf);
    return c;
}

/** 장비 3×3 의 찬 칸 → 「착용 중」 아이템 카드. Alt 동안만 포인터가 열리므로 그때만 뜬다 · 별도 host라 부모 툴팁 폭·칸 자리는 움직이지 않는다 (ADR-0182) */
function bindEquipmentCells(c, equipment, itemCardOf) {
    if (!equipment || !itemCardOf) return;
    for (const cell of c.querySelectorAll('[data-equip-i]')) {
        cell.classList.add('tip-optionable');
        cell.onmouseenter = () => { if (altHeld) showEquipmentItemTip(itemCardOf(equipment.items[+cell.dataset.equipI]), cell); };
        cell.onmouseleave = hideEquipmentItemTip;
    }
}

/**
 * 편성 탭 영웅 카드 — 첫 장 **기본 옵션**(능력치 7 막대 + 액티브 스킬 그림 셋) · **Alt 동안 그 바깥쪽에** 장비 3×3 · 세부 옵션 1 · 2
 * [2026-09-21 사용자 지시 · ADR-0284 · ADR-0287]. 기본 옵션 열은 Alt 에도 **안 사라진다** — 폭을 못박아 제자리에 선다(style.css `.stats-first`).
 * 대표값은 안 싣는다 — 세부 옵션 1 머리에 있다. 스킬 칸은 그림만이다(캐릭터 탭 스킬 칸과 같은 규칙) — 툴팁 속에 설명창을 걸면 한 자리를 두 카드가 다툰다.
 * 붙는 쪽은 유닛 카드와 같다 — 카드 왼쪽에 선 툴팁은 열이 왼쪽으로 자란다(ADR-0126 · 격자가 자리를 정하고 DOM 순서는 그대로다)
 * @param skills 액티브 칸 셋 — 스킬 개체 또는 `null`(빈 칸). 부르는 쪽이 넘긴다(`app.js:activeCells` — 이 파일은 `G` 를 모른다)
 */
function statsFirstCard(h, combat, itemOf, itemCardOf, skills) {
    const color = tierOf(h).color;
    const side = anchorSide === 'left' ? ' grow-left' : '';
    const c = el('div', `tip-card unit stats-first${altHeld ? ' alt' : ''}${side}`);
    c.dataset.alt = '1';
    c._rebuild = () => statsFirstCard(h, combat, itemOf, itemCardOf, skills);
    c.style.setProperty('--unit-line', color);
    const icons = (skills ?? []).map(s => `<span class="tip-skill${s ? '' : ' vacant'}">${s ? skillImg(s) : ''}</span>`).join('');
    const equipment = altHeld ? equipmentHtml(wornOfHero(h, itemOf)) : null;
    const more = altHeld ? `
            <div class="tip-unit-col gear">${equipment.html}</div>` + sheetPages(combat, true).map((rows, i) => `
            <div class="tip-unit-col d${i + 1}">
                <div class="tip-col-h">${t('ch.detail.hn', { n: i + 1 })}</div>
                <div class="tip-sheet">${sheetRowsHtml(rows, combat)}</div>
            </div>`).join('') : '';
    c.innerHTML = `
        <div class="tip-unit">
            <div class="tip-unit-col base">
                <div class="tip-col-h">${t('ch.attr.h')}</div>
                <div class="attr-list">${attrRowsHtml(h.stats, color)}</div>
                <div class="tip-skills">${icons}</div>
                ${altHeld ? '' : `<div class="tip-foot">${t('tip.unit.altHintGear')}</div>`}
            </div>${more}
        </div>`;
    bindEquipmentCells(c, equipment, itemCardOf);
    return c;
}

/**
 * 영웅 카드 — 착용 장비 · (Alt) 세부 옵션 (SCREEN_DESIGN §2 「유닛 툴팁 규격」 · §4-2 · §5 · ADR-0171).
 * 능력치는 `h.stats` 에서 그대로 읽는다. 세부 옵션은 **부르는 쪽이 넘긴다** — `game.heroCombat` 은 상태 `G` 가 있어야 하는데 이 파일은 `G` 를 모른다.
 * 이름 · 직업 · 레벨 · 죄종 · 등급 줄은 없다 — 올린 카드가 이미 든다 (ADR-0134)
 * @param combat computeCombat 결과 — 없으면 세부 옵션이 전부 `—`
 * @param itemOf uid 로 현재 세이브의 아이템을 찾는 함수 — tip.js 는 G 를 모른다
 * @param itemCardOf **아이템 개체**로 기존 「착용 중」 아이템 카드를 만드는 함수 — 아이템 옵션 표기는 앱이 든다 (ADR-0183 으로 uid → 개체)
 * @param statsFirst 첫 장이 **기본 옵션**인 편성 탭 카드(`statsFirstCard`) — 편성 탭(띠 · 진형 칸)만 준다 [2026-09-21 사용자 지시 · ADR-0284 · ADR-0287]
 * @param skills     `statsFirst` 카드의 액티브 칸 셋(스킬 개체 또는 `null`)
 */
export function heroTipCard(h, combat = null, itemOf = null, itemCardOf = null, { statsFirst = false, skills = null } = {}) {
    if (!h) return null;
    if (statsFirst) return statsFirstCard(h, combat, itemOf, itemCardOf, skills);
    return unitCard(h.stats, tierOf(h).color, combat, () => heroTipCard(h, combat, itemOf, itemCardOf), '',
        equipmentHtml(wornOfHero(h, itemOf)), itemCardOf);
}

/** 몬스터 막대 색 = **카드 윗변 색** — 관전 카드가 등급으로 칠하는 토큰 그대로다(style.css `.unit.enemy` · `.unit.elite` · `.unit.boss`) */
const GRADE_LINE = { normal: 'var(--enemy-line)', elite: 'var(--color-warning)', stage_boss: 'var(--boss-line)', chapter_boss: 'var(--boss-line)' };

/**
 * 몬스터 카드 — 착용 장비 · (Alt) 세부 옵션. **영웅 카드와 같은 첫 장이다** (SCREEN_DESIGN §2 「유닛 툴팁 규격」 · §4-2 · ADR-0183).
 * 한 벌은 `round` 이벤트의 `gear`(그 몬스터가 입고 있는 장비 — 처치 드롭이 이 중 하나로 나간다 · INTERFACE §2-6),
 * 세부 옵션은 같은 이벤트의 `sheet`(R94) 그대로다 — 렌더러는 계산하지 않는다.
 * 이름 · 직업 · 등급 줄은 없다 — 올린 카드의 이름 줄 · 테두리 색이 이미 든다 (ADR-0134)
 * @param u 재생기의 적 유닛 `{grade, stats, sheet, gear}`
 * @param itemCardOf 장비 아이템 개체 → 「착용 중」 아이템 카드. 숫자는 **그 몬스터 기준**이라 부르는 쪽이 문맥을 든다 (ui/battle.js)
 */
export function monsterTipCard(u, itemCardOf = null) {
    if (!u) return null;
    // 어두운 등급 색(일반 `--enemy-line` · 보스 `--boss-line`)은 막대만 밝힌다 — 검은 막대 바탕에 묻힌다. 정예(노랑)는 그대로 (2026-09-15 · SCREEN_DESIGN §2).
    //   장비 첫 장에는 막대가 없어 지금은 안 쓰이지만, Basic Stats 몸통을 되살리면 그대로 걸린다
    const lift = u.grade === 'elite' ? '' : 'bar-lift';
    return unitCard(u.stats, GRADE_LINE[u.grade] ?? GRADE_LINE.normal, u.sheet ?? null, () => monsterTipCard(u, itemCardOf), lift,
        equipmentHtml(wornOfMonster(u.gear)), itemCardOf);
}

/**
 * 도감 몬스터 툴팁 — **두 장**: 왼쪽 선술집 후보 카드 · 오른쪽 이야기 · 단계 (SCREEN_DESIGN §9 · ADR-0206 · ADR-0233).
 * 오른쪽 장 = 「스토리」 머리글 + 이야기 · 아래 「보너스 효과」 머리글 + 단계(초상 · 이름 · 직업은 왼쪽 장이 든다). 처치 수는 **부르는 쪽이 넘긴다** — 이 파일은 `G` 를 모른다.
 * 단계의 보정은 **그 단계에서 더해지는 값**(`codex_level.csv:bonus_pct`)이다 — 카드의 「다음 … +x%」와 같은 수. 합은 스테이지 행이 든다
 * @param m `{id, kills, boss}` — 도감 카드 한 장의 집계
 * @param grade 초상 등급 — 일반 / 정예 고르개를 그대로 따른다 (ADR-0167)
 * @param stat 그 스테이지의 계열 라벨 `{ko, en}` — 없으면(챕터보스 단독 5스테이지) 보정 칸이 `—` 다 (§9 · GAME_DESIGN §10)
 * @returns `[후보 카드 장, 이야기 · 단계 장]` — 툴팁 창이 가로로 나란히 세운다
 */
export function codexMonsterTipCard(m, grade, stat) {
    // 이름은 자리표시자다(`{m:1900|이/가}` — 이름의 SSOT 는 monster.csv · 스테이지 이야기와 같은 규칙). 몬스터 이야기는 `{leader}` 를 안 쓴다
    const story = fillStory(L(monsterStory(m.id)), lang());
    const lv = SYS.game.codexLevel(m.kills);
    // 단계는 **늘 전부 선다** — 닿지 않은 단계도 보여야 「다음에 무엇을 받나」가 읽힌다 · 닿은 단계만 켜진다.
    //   **레벨만 든다** — 「몇 마리 잡아야 열린다」는 적지 않는다(다음 문턱은 카드가 든다 · ADR-0209)
    const steps = D.codexBonus.map((bonus, i) => `
        <div class="cx-step${i < lv ? ' on' : ''}">
            <span class="cx-step-lv">${t('cx.tip.lv', { lv: i + 1 })}</span>
            <span class="cx-step-b">${stat ? `${L(stat)} +${M.pctNum(bonus ?? 0)}%` : '—'}</span>
        </div>`).join('');
    const card = el('div', 'tip-card cx-tip', `
        <div class="cx-tip-h">${t('cx.tip.story')}</div>
        <div class="cx-tip-story${story ? '' : ' muted'}"></div>
        <div class="cx-tip-h">${t('cx.tip.effects')}</div>
        <div class="cx-steps">${steps}</div>`);
    // 글은 **텍스트로** 넣는다 — 데이터 문장이 마크업으로 읽히지 않게. 셀의 줄바꿈 하나가 **문단 하나**다(문단 사이는 CSS 가 띄운다) ·
    //   길이는 원고가 지킨다 — 이야기 칸 안 · 최대 여섯 줄(ADR-0244 · 단정이 잡는다)
    const box = card.querySelector('.cx-tip-story');
    for (const para of (story || '—').split('\n')) box.appendChild(el('p')).textContent = para;
    // 윗변 = 왼쪽 장과 같은 등급 색 — 두 장이 한 몬스터의 카드로 읽힌다 (ADR-0244)
    const cand = codexCandCard(m, grade);
    card.style.borderTopColor = cand.style.borderTopColor;
    return [cand, card];
}

/**
 * 도감 툴팁 왼쪽 장 = **선술집 후보 카드 그대로** (ADR-0233 · SCREEN_DESIGN §3 후보 카드 · §8) — `app.js:candidateCard` 와 같은 `.ng-card` 칸 · 같은 줄 순서다:
 * 초상 옆에 칩 줄(등급 + 죄종) · 이름 · 직업 · 역할 · 무기군 · 고유 스킬, 아래에 능력치 7 막대 · 능력치 합.
 * 값은 `monster.csv` 의 기본 능력치 7 — 레벨과 무관하고 `battle.makeEnemy` 가 읽는 것과 같다. 막대 줄은 **같은 함수**다(`attrRowsHtml` · ADR-0114).
 * 후보 카드의 `Lv.1` · 최대 HP 줄은 없다 — 몬스터의 레벨 · HP 는 스테이지 레벨 · 등급이 정해 한 값이 없다
 */
function codexCandCard(m, grade) {
    const row = D.monsters?.[m.id];
    const sin = monsterSin(m.id);
    const sinColor = M.SINS[sin]?.color ?? 'var(--text-muted)';
    // 등급 = 영웅의 티어 칩 자리 — 보스는 보스, 아니면 일반 / 정예 고르개 (`kind.*` — 관전 카드 · 도감 고르개와 같은 말).
    //   윗변 · 막대 · 칩 색 = 관전 몬스터 툴팁의 등급 색. 어두운 색은 막대만 밝힌다(`bar-lift` · monsterTipCard 와 같다)
    const kind = m.boss ? 'boss' : grade;
    const line = GRADE_LINE[m.boss ? 'stage_boss' : grade] ?? GRADE_LINE.normal;
    const stats = row ? Object.fromEntries(D.heroAttributes.map(s => [s.id, row[s.id]])) : null;
    const total = stats ? D.heroAttributes.reduce((a, s) => a + (stats[s.id] ?? 0), 0) : '—';
    // 역할 줄 = 직업의 역할 + **그 몬스터의 무기군** — 영웅은 직업이 드는 무기군 전부를 적지만 몬스터는 제 무기군이 하나다
    const cls = D.classes.find(c => c.id === row?.cls);
    const wg = D.weaponGroups?.[row?.weapon_group];
    const role = [cls ? L(cls.role) : '', wg ? L(wg) : ''].filter(Boolean).join(' · ');
    // 스킬은 지금 **고유 하나만** — 정예의 무기 칸 · 보스의 셋째 칸은 판마다 굴려 정해진다(보스는 나중에 전직 칸까지 · ADR-0233)
    const innate = row?.innate_skill && row.innate_skill !== '-' ? { id: row.innate_skill } : null;
    const skName = innate ? L(SYS.skill?.defs?.[innate.id]?.name ?? { ko: innate.id, en: innate.id }) : '';
    // 초상은 **영웅과 같은 네모 칸**(`.hero-face` — `app.js:heroFace` 와 같은 꼴) — 이 장은 선술집 영웅 카드 그대로라
    //   도감 카드 · 관전의 원형(몬스터) 구분을 여기서만 푼다 (ADR-0237). 아트가 없으면 영웅처럼 **빈 칸**이다
    const src = monsterFace(m.id, grade);
    const face = `<span class="hero-face">${src ? `<img src="${src}" alt="${L(monsterName(m.id))}" loading="lazy" onerror="this.remove()">` : ''}</span>`;
    const c = el('div', `ng-card cx-cand${m.boss || grade !== 'elite' ? ' bar-lift' : ''}`, `
        <div class="ng-head">
            ${face}
            <div class="ng-id">
                <div class="ng-chips"><span class="tier-chip" style="color:${line}">${t(`kind.${kind}`)}</span><span class="sin-chip" style="color:${sinColor}">${L(M.SINS[sin]) || sin}</span></div>
                <div class="ng-name"><b>${L(monsterName(m.id))}</b></div>
                <div class="ng-cls">${cls ? L(cls) : ''}</div>
                <div class="ng-role muted">${role}</div>
                ${innate ? `<div class="ng-skill"><span class="ico">${skillImg(innate)}</span><span class="txt"><b>${skName}</b></span></div>` : ''}
            </div>
        </div>
        <div class="attr-list">${attrRowsHtml(stats, line)}</div>
        <div class="ng-line sep"><span>${t('ng.total')}</span><b>${total}</b></div>`);
    c.style.borderTopColor = line;
    return c;
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

/** 숫자 자리의 단위 — 틀이 아니라 **자리 안에** 든다. 틀이 `{s}초간` 처럼 단위를 들면 Alt 의 식이 값과 단위 사이에 끼인다.
 *  `pct` 자리의 숫자(원값 · 실효값 · 계수)는 **비율**로 온다 — `slot` 이 찍기 전에 100 을 곱한다(`M.pctNum` · R111) */
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
 * @param o.term 식의 뒤 항 `(term, wrap) => html` — 기본은 더하는 슬롯의 ` + 약어 × 계수`. 피해 · 회복 · 벽은 ` × 약어`(능력치 계수를 곱한다 · ADR-0164)
 * @param R      렌더 상태 `{alt, fx}` — 괄호를 붙일 수 있는 자리를 만나면 `fx = true`(각주를 세울지 카드가 본다)
 */
function slot({ raw, part, unit = UNIT.none, head, show = num, term }, R) {
    // 퍼센트 자리는 비율로 온다 — 숫자만 100 을 곱해 찍는다(범위 객체는 퍼센트 자리에 오지 않는다 · R111)
    const k = unit === UNIT.pct ? M.pctNum : v => v;
    if (!part) return unit(hl(show(k(raw))));
    const back = term ?? ((x, wrap) => ` + ${abbrOf(x.attr)} × ${wrap(String(k(x.coef)))}`);
    // 계수 0 인 슬롯은 값에 아무것도 안 더한다 — 식에서 뺀다(`+ VIT × 0` 은 잡음이다 · 밸런스가 채우면 다시 선다).
    //   뒤 항을 넘겨받은 자리(피해 · 회복 · 벽)는 계수 칸을 안 읽으므로 거르지 않는다 (ADR-0164)
    const terms = term ? part.terms : part.terms.filter(x => x.coef !== 0);
    const fx = wrap => `(${head ? head(wrap) : wrap(num(k(Math.abs(part.raw))))}`
        + terms.map(x => back(x, wrap)).join('') + ')';
    // 항이 다 빠지면 괄호 안이 원값 하나라 식이 아니다 — 슬롯이 없는 자리와 같이 찍는다(첫 항이 따로 있는 자리는 제외)
    if (!head && !terms.length) return unit(hl(show(k(Math.abs(part.value ?? part.raw)))));
    // 값 없음 — 식이 숫자 자리를 **대신**한다. 흐리게 두지 않고 식 속 숫자를 강조한다(흐리면 문장의 강조가 쿨 하나만 남는다)
    if (part.value == null) return unit(fx(hl));
    // 피해 · 회복량은 범위 객체 `{min, max}` 로 온다(R90) — 절댓값을 안 씌우고 `show` 가 범위를 푼다
    const v = unit(hl(show(typeof part.value === 'object' ? part.value : k(Math.abs(part.value)))));
    if (!terms.length) return v;
    R.fx = true;
    return R.alt ? `${v} <span class="tip-fx">${fx(x => x)}</span>` : v;
}

/** 피해 · 회복량 · 벽 HP 자리 — 식의 첫 항이 `밑수 이름 × 배율%` 다 · 값은 범위 `{min, max}`(벽은 양끝이 같아 한 수 · R90) */
const amountSlot = (part, R) => slot({
    part,
    show: rangeText,
    head: wrap => `${BASIS_NAME[part.basis]?.() ?? part.basis} × ${wrap(num(M.pctNum(part.pct)))}%`,   // 배율은 비율로 온다 (R111)
    term: x => ` × ${abbrOf(x.attr)}`,   // 능력치 계수는 곱이다 — 계수 모양이 전역 하나라 숫자를 안 찍는다 (ADR-0164 · battle_design §9-2)
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
    if (heal) return t('sk.amt.heal', { v: d });
    // 피해 종류 = 그 타격이 상대하는 방어 — **스킬의 원소 태그가 먼저**고 없으면 쓰는 이의 공격 타입이다 (전투 `strikeOnce` 와 같은 순서 · battle_design §2-1).
    //   원소는 이름으로 말한다 — 「마법 피해」는 없다. 공격 타입만 보면 09-11 뒤 원소 스킬까지 「물리 피해」로 찍힌다 (2026-09-15)
    const type = def.element ?? atkType;
    return type && type !== 'physical' ? t('sk.amt.elem', { v: d, e: t(`st.atkType.${type}`) }) : t('sk.amt.physical', { v: d });
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
    // 불러내기 — 몬스터 전용 (skill_design §12-9 · 2026-09-18). 세기가 없다 — 누구를 부르나는 편성이 정한다
    if (def.kind === 'call') return [t('sk.line.call', { n })];
    // 자폭 — 몬스터 전용 비직격 (skill_design §12-9 · battle_design §9-6 · 2026-09-21). **쿨이 없다**(차례가 아니라 죽음이 부른다)
    //   → 오오라처럼 `{n}` 을 안 든다. 방어 · 저항을 안 받는 고정 피해지만 그 규칙은 문장에 안 적는다(스킬 설명만 — 2026-09-21)
    if (def.kind === 'indirect') {
        const d = amountPhrase(def, P.amount, atkType, R);
        return d === null ? null : [t('sk.line.selfDestruct', { d })];
    }
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
   (마우스를 다시 올리게 하면 보려던 순간을 놓친다). 바꾸는 것은 **`data-alt` 를 단 것** — 스킬 카드(식) · 유닛 카드(세부 옵션 열 · 2026-09-14) · 아이템 카드의 스킬 칸(식 · 2026-09-15 ADR-0139). 아이템 카드의 나머지는 그대로다.
   스킬 창의 줄 문장(`skillLineHtml`)은 이 상태를 **안 본다** — 판 안에 셋이 나란히 서서 식이 붙으면 세 줄이 같이 부푼다 */
let altHeld = false;
/** 마지막 마우스 위치 — 다시 그린 카드의 높이가 달라져도 넘침 보정이 맞게 `moveTip` 을 한 번 더 부른다 */
let lastMove = null;

/** 전역 툴팁은 드래그를 막지 않게 기본 `pointer-events:none`; Alt 로 붙드는 영웅 툴팁만 장비 hover를 위해 연다 (ADR-0176). */
function syncTipInteraction() {
    $tip()?.classList.toggle('interactive', !!(altHeld && anchorNode?._tipHoldOnAlt));
}

function setAlt(on) {
    if (altHeld === on) return;
    altHeld = on;
    if (!on) hideEquipmentItemTip();
    const tip = $tip();
    if (!tip?.classList.contains('show')) return;
    // 다시 그리는 것 = `data-alt` 를 단 것 — 스킬 설명창 · 유닛 카드(ADR-0114) · 아이템 툴팁의 스킬 칸(ADR-0139 — 카드가 아니라 칸이다).
    //   제 인자를 쥔 `_rebuild` 로 같은 것을 새로 만든다
    const cards = tip.querySelectorAll('[data-alt]');
    for (const c of cards) c.replaceWith(c._rebuild());
    syncTipInteraction();
    // 카드 옆에 붙은 툴팁(ADR-0120)은 마우스 위치 없이도 다시 놓인다 — 넓어진 카드가 넘치면 왼쪽 · 위로 옮긴다
    if (cards.length && (anchorNode || lastMove)) moveTip(lastMove);
    // Alt 로 영웅 밖에서도 붙들었던 툴팁은 키를 떼는 순간 커서가 영웅 위인지 다시 본다. 밖이면 그때 닫는다 (ADR-0171).
    if (!on && anchorNode?._tipHoldOnAlt && !anchorNode.matches(':hover')) hideTip();
}

// Alt 만 기본 동작을 막는다 — 막지 않으면 떼는 순간 브라우저 메뉴로 포커스가 넘어간다.
// 창이 포커스를 잃으면(Alt+Tab) keyup 이 안 오므로 떼는 것으로 친다
window.addEventListener('keydown', ev => { if (ev.key === 'Alt') { ev.preventDefault(); setAlt(true); } });
window.addEventListener('keyup', ev => { if (ev.key === 'Alt') { ev.preventDefault(); setAlt(false); } });
window.addEventListener('blur', () => setAlt(false));
window.addEventListener('mousemove', ev => { lastMove = ev; }, { passive: true });

/**
 * 툴팁이 내는 **문장**을 그대로 낸다 — 스킬 창의 액티브 줄이 hover 와 같은 말을 하게 하는 창이다(아이템 툴팁의 스킬 칸은 2026-09-15 부터 몸통째 `skillTipSection` 을 부른다 · ADR-0139)
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
 * 스킬 카드 — 머리글 「스킬」 + **몸통**(`skillBodyHtml`) (SCREEN_DESIGN §2 「스킬 설명창 규격」).
 * Alt 가 바뀌면 `setAlt` 가 떠 있는 카드를 **같은 인자로** 다시 만든다 — 그래서 카드가 제 인자를 쥔 `_rebuild` 를 든다(유닛 카드와 같은 장치).
 * @param s   `.id` 만 있으면 된다 — 정의는 `SYS.skill.defs` 에서 집는다(호출처마다 다른 모양을 받아 왔다)
 * @param ctx {period, atkMin, atkMax, matkMin, matkMax, hpMax, atkType, stats, source} — 모르는 값은 생략한다. 그 숫자 자리가 식으로 접힌다
 */
export function skillTipCard(s, ctx = {}) {
    if (!s) return null;
    const c = el('div', 'tip-card');
    c.dataset.alt = '1';
    c._rebuild = () => skillTipCard(s, ctx);
    c.innerHTML = `<div class="tip-head">${t('tip.skill.h')}</div>${skillBodyHtml(s, ctx)}`;
    return c;
}

/**
 * 아이템 툴팁의 스킬 칸 — 스킬 카드의 **몸통 그대로**이고 머리글만 없다 [2026-09-15 사용자 지시 · SCREEN_DESIGN §6 · ADR-0139].
 * 칸도 `data-alt` 를 들어 Alt 를 누르면 **이 칸만** 다시 선다 — 밑수 · 옵션에는 괄호 식이 없다.
 * 출처 칩은 부르는 쪽이 `ctx.source` 를 안 넘겨 안 선다 — 무기 카드 안이라 출처가 이미 섰다
 */
export function skillTipSection(s, ctx = {}) {
    const n = el('div', 'tip-skill');
    n.dataset.alt = '1';
    n._rebuild = () => skillTipSection(s, ctx);
    n.innerHTML = skillBodyHtml(s, ctx);
    return n;
}

/**
 * 스킬 설명창의 **몸통** — 아이콘 + 이름 / 칩 / **문장**(추가 피해가 있으면 둘째 문장) / 「Alt 계산식」 각주.
 * 스킬 카드와 아이템 툴팁의 스킬 칸이 **같이 부른다** — 한쪽만 고쳐지지 않게 몸통은 여기 하나다 (ADR-0139).
 * 칩은 **출처 칩**(영웅·무기·전직 — 부르는 자리가 `ctx.source` 를 줄 때만. 출처가 글자로 이미 선 자리는 안 준다 · ADR-0121) · **태그 칩**(파생 포함 — `skill_tag.csv` 가 이름의 SSOT) · **능력치 칩**이다.
 * 능력치 칩은 스케일링 슬롯(`def.scales`)이 가리키는 능력치의 약어다 — 슬롯 순서 · 같은 능력치는 한 번 · 계수 0 이어도 찍는다 (ADR-0118).
 * 고정 설명(`def.desc`)은 **안 낸다** — 문장이 같은 말을 값까지 넣어 한다(같은 ADR).
 */
function skillBodyHtml(s, ctx) {
    const def = SYS.skill?.defs?.[s.id] ?? null;
    const name = L(def?.name ?? s.name ?? { ko: s.id, en: s.id });
    const chips = [];
    if (ctx.source) chips.push(`<i class="tip-chip src">${t(ctx.source === 'innate' ? 'sk.innate' : `sk.src.${ctx.source}`)}</i>`);
    for (const tg of (def ? SYS.skill.tagsOf(def) : [])) chips.push(`<i class="tip-chip">${L(skillTagName(tg))}</i>`);
    for (const at of new Set((def?.scales ?? []).map(x => x.attr))) chips.push(`<i class="tip-chip attr">${abbrOf(at)}</i>`);
    // 정의를 못 찾으면(행이 지워진 옛 세이브) 이름만 낸다 — 던지지 않는다
    const R = { alt: altHeld, fx: false };
    const lines = def ? skillLines(def, SYS.skill.previewOf(def, ctx), ctx.atkType, R) : null;
    return `
        <div class="tip-name"><span class="tip-sk-ico">${skillImg(s)}</span>${name}</div>
        ${chips.length ? `<div class="tip-chips">${chips.join('')}</div>` : ''}
        ${(lines ?? []).map(l => `<div class="tip-line">${l}</div>`).join('')}
        ${R.fx && !R.alt ? `<div class="tip-foot">${t('sk.altHint')}</div>` : ''}`;
}
