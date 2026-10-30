/**
 * 툴팁 — **기계장치를 한 곳에** (2026-08-28).
 *
 * 화면 렌더러(`app.js`)와 관전 재생기(`battle.js`)가 같은 `#tooltip` 한 자리를 쓴다. 표시·따라다니기·넘침 보정을
 * 두 번 짜면 한쪽만 고쳐지므로 여기 하나만 둔다. **내용은 부르는 쪽이 만든다** — `bindTipNode(node, build)` 의
 * `build()` 가 붙일 노드를 돌려준다.
 *
 * 다만 **영웅 카드 · 스킬 카드는 여기 둔다**: 두 렌더러가 같은 카드를 띄우기 때문이다(영웅 띠 ↔ 관전 유닛 카드).
 * 관전 영웅 · 몬스터는 **기본 옵션 + 그 아래 착용 장비 3×3 + Alt 세부 옵션 두 열**을 같은 함수로 조립한다(ADR-0486). 영웅은 장비 오른쪽에 액티브 스킬 셋을 세로로 붙인다.
 * 한 벌의 출처는 영웅 `equipped`(위치 → uid) · 몬스터 `gear`(부위 배열)다.
 * 그 몸통의 줄 조립(`attrRowsHtml` · `sheetRowsHtml`)은 **캐릭터 탭의 기본 옵션 · 세부 옵션도 부른다** — 두 자리가 한 표기다.
 * 아이템 비교 카드는 `app.js` 에 남는다 — 희귀도 · 접사 · 무기군처럼 app 쪽 헬퍼를 많이 타서 옮기면 그게 따라온다.
 *
 * **Alt 상태도 여기 든다** (2026-09-10 · SCREEN_DESIGN §2 · ADR-0089 · ADR-0114) — 누르는 동안만 켜지고,
 * 떠 있는 **`data-alt` 를 단 것**(스킬 카드 · 유닛 카드 · 아이템 카드의 스킬 칸 — ADR-0139)만 그 자리에서 다시 그린다. 스킬 창의 줄 문장(`skillLineHtml`)은 이 상태를 안 본다.
 * **Shift 상태도 여기 든다** (2026-10-14 · SCREEN_DESIGN §2 · §6 · ADR-0617) — 같은 장치로 **`data-shift` 를 단 것**(아이템 카드 — 옵션 줄 범위)만 다시 그린다.
 *
 * **겹쳐 붙은 툴팁** — 관전 유닛 카드(영웅) 안에 스킬 칸이 들어 있다. 칸에서 나가 카드로 돌아올 때
 * `mouseenter` 는 다시 안 뜨므로(자식에서 부모로 돌아오는 건 진입이 아니다) 여기서 조상의 툴팁을 되살린다.
 *
 * i18n 규약: **이 파일에 한국어 리터럴을 쓰지 않는다** (주석 제외) — app.js · battle.js 와 같다.
 */

import * as M from './mock.js';
import { t, L, lang } from './i18n.js';
import { D, SYS, skillTagName, monsterFace, monsterName, monsterSin, monsterStory, fillStory, potionInfo } from './data.js';

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

/**
 * 도감 몬스터의 스킬 아이콘 줄 — 정해진 칸(고유 → 나이트메어 2칸)의 **그림만 가로로** · 이름은 안 적는다 (SCREEN_DESIGN §9 · ADR-0666).
 *   칸 규칙은 로직의 것 — 단마다 `battle.monsterSkillSlots` 를 물어 처음 선 단을 붙인다 · 고유 칸과 나이트메어 칸은 같은 모양이다(모서리 표시 없음 · ADR-0990) ·
 *   아이콘의 `title` = 이름(· 여는 단) — 목록 카드는 그린 뒤 그것을 걷고 스킬 설명창을 건다(ADR-0709). 목록 카드(`app.js:monsterCard`)와 툴팁 왼쪽 장(`codexCandCard`)이 같이 부른다
 * @param cls  줄 클래스 — 목록 카드 `mon-sk` · 툴팁 `ng-skill`
 * @param cell 칸 클래스 — 목록 카드 `sk-ico` · 툴팁 `ico sk-ico`
 */
export function monsterSkillIcons(id, cls, cell) {
    const first = D.difficultyList[0]?.id;
    const seen = new Map();
    for (const d of D.difficultyList)
        for (const a of SYS.battle.monsterSkillSlots(id, 'normal', d.id)?.fixed ?? [])
            if (!seen.has(`${a.source}|${a.id}`)) seen.set(`${a.source}|${a.id}`, { a, d });
    if (!seen.size) return '';
    return `<span class="${cls}">${[...seen.values()].map(({ a, d }) => {
        const late = d.id !== first;
        const title = L(SYS.skill.defs[a.id]?.name ?? { ko: a.id, en: a.id }) + (late ? ` · ${L(d.name)}` : '');
        // 칸마다 바탕 레벨 `Lv.n` — 오른쪽 아래(늦은 칸 표시는 오른쪽 위) · 장비 몫은 스폰 때 굴려져 도감은 모른다 (ADR-0705)
        // `data-sk` · `data-up` — 목록 카드가 그린 뒤 칸마다 스킬 설명창을 거는 손잡이 (`app.js:bindMonSkillTips` · ADR-0709)
        return `<span class="${cell}" title="${title}" data-sk="${a.id}" data-up="${a.up ?? 0}">${skillImg(a)}<span class="sk-lv">${t('sk.lvTag', { n: 1 + (a.up ?? 0) })}</span></span>`;
    }).join('')}</span>`;
}

/* ───────── 기계장치 ───────── */

/**
 * node 위에 올리면 build() 가 만든 카드를 띄운다.
 * @param build () => Node | Node[]
 * @param anchor true 면 커서가 아니라 **node 옆**에 선다 — 유닛 카드(관전 · 출정 창 띠)만 준다.
 *   크고 오래 읽는 카드라 커서를 따라가면 읽는 동안 흔들린다 (SCREEN_DESIGN §2 「유닛 툴팁 규격」 · ADR-0120)
 * @param holdOnAlt true 면 Alt 를 누르는 동안 node 밖으로 나가도 닫지 않고 툴팁이 포인터를 받는다 — 영웅 장비 · 세부 옵션 카드만 준다 (ADR-0171 · ADR-0176)
 * @param actions () => {label, run}[] — **손가락으로 연 툴팁**의 버튼 줄에 설 그 칸만의 행동 (마우스의 우클릭 같은 것 · ADR-0374). 마우스 툴팁엔 안 선다
 * @param side 'left' 면 커서 **왼쪽이 먼저** — 왼쪽에 다 안 들어갈 때만 오른쪽으로 접는다. 인벤토리 칸만 준다 (2026-10-21 · SCREEN_DESIGN §6 · ADR-0693)
 * @param keyboard true 면 키보드 포커스로도 열고 Escape 로 닫는다.
 */
export function bindTipNode(node, build, { anchor = false, holdOnAlt = false, actions = null, side = null, keyboard = false } = {}) {
    node.dataset.tip = '1';
    node._tipBuild = build;
    node._tipAnchor = anchor;
    node._tipSide = side;
    node._tipHoldOnAlt = holdOnAlt;
    node._tipActions = actions;
    // 손가락이 낸 가짜 마우스 이벤트(탭마다 브라우저가 흉내 낸다)는 안 본다 — 손가락 툴팁은 길게 누르기가 연다 (ADR-0374)
    node.onmouseenter = ev => { if (!touchInput) openTip(node, ev); };
    node.onmousemove = ev => { if (!touchInput) moveTip(ev); };
    node.onmouseleave = ev => {
        if (touchInput) return;
        const up = node.parentElement?.closest('[data-tip]');
        // 카드 속 칸(스킬)에서 카드로 돌아오면 카드의 툴팁이 **카드의 자리 규칙**으로 다시 선다
        if (up?._tipBuild && ev.relatedTarget && up.contains(ev.relatedTarget)) openTip(up, ev);
        else if (altHeld && node._tipHoldOnAlt && anchorNode === node) return;
        else hideTip();
    };
    if (keyboard) {
        node.tabIndex = 0;
        node.onfocus = () => {
            if (!node.matches(':focus-visible')) return;
            const rect = node.getBoundingClientRect();
            openTip(node, { clientX: rect.right, clientY: rect.bottom });
        };
        node.onblur = () => hideTip();
        node.onkeydown = ev => {
            if (ev.key !== 'Escape' || !$tip()?.classList.contains('show')) return;
            hideTip();
            ev.preventDefault();
            ev.stopPropagation();
        };
    }
}

/** 제목 옆 공통 도움말 — 기존 카드·마우스·터치 동작을 쓰고 키보드 포커스로도 읽는다. */
export function helpMark(key, text) {
    const title = () => typeof key === 'function' ? key() : t(key);
    const q = el('span', 'q-btn', '?');
    q.tabIndex = 0;
    q.setAttribute('aria-label', t('ui.helpFor', { name: title() }));
    bindTipNode(q, () => {
        const card = el('div', 'tip-card q-tip');
        const head = el('div', 'tip-effect-head');
        const name = el('div', 'tip-name');
        name.textContent = title();
        head.appendChild(name);
        card.append(head, el('div', 'tip-effect-summary', typeof text === 'function' ? text() : text));
        // 편성 탭의 왼쪽 칸은 전술 구분선까지 기존 설명 카드 폭을 유지한다.
        const line = q.closest('.pt-mid')?.querySelector(':scope > .pt-tactics');
        const width = line ? stageRect(line).left - stageRect(q).right - 16 : 0;
        if (width > 300) { card.style.width = `${Math.floor(width)}px`; card.style.maxWidth = 'none'; }
        return card;
    });
    q.onfocus = () => {
        // 터치가 낸 포커스는 기존 길게 누르기를 따른다. 키보드 포커스는 입력 종류와 무관하게 연다.
        if (!q.matches(':focus-visible')) return;
        const rect = q.getBoundingClientRect();
        openTip(q, { clientX: rect.right, clientY: rect.bottom });
    };
    q.onblur = () => hideTip();
    q.onkeydown = ev => {
        if (ev.key !== 'Escape' || !$tip()?.classList.contains('show')) return;
        hideTip();
        ev.preventDefault();
        ev.stopPropagation();
    };
    return q;
}

/** 제목과 물음표를 같은 덩어리로 묶고 보조 수치·버튼은 원래 자리에 둔다. */
export function headingHelp(node, text, label = null) {
    if (node.querySelector('.q-btn')) return node;
    if (!label) {
        const first = [...node.childNodes].find(child => child.nodeType !== 3 || child.textContent.trim());
        if (first?.nodeType === 1 && first.tagName === 'SPAN') label = first;
        else {
            label = el('span', 'heading-label');
            const leading = [...node.childNodes];
            node.prepend(label);
            for (const child of leading) {
                if (child.nodeType === 1 && child.matches('small, button')) break;
                label.appendChild(child);
            }
        }
    }
    const title = label.cloneNode(true);
    title.querySelectorAll('small').forEach(meta => meta.remove());
    const name = title.textContent.trim();
    label.insertBefore(helpMark(() => name, text), label.querySelector(':scope > small'));
    return node;
}

/** 지금 뜬 툴팁이 붙은 노드 — `null` 이면 커서를 따른다 (ADR-0120) */
let anchorNode = null;
/**
 * 붙은 쪽 — 카드 옆 중 화면이 더 넓게 남은 쪽. **카드를 짓기 전에** 정한다: 유닛 카드가 이 쪽을 보고 세부 옵션 열을
 * 기본 옵션의 **바깥**에 세운다(왼쪽에 섰으면 왼쪽 · ADR-0126). 쪽은 **카드 자리만** 본다 — 툴팁 폭으로 정하면 Alt 로 넓어지는 순간 튄다(실측)
 */
let anchorSide = 'right';
/** 커서를 따르는 툴팁의 먼저 쪽 — 띄운 노드의 `side`(`bindTipNode`) · 기본 오른쪽 · 인벤토리 칸은 왼쪽 (ADR-0693) */
let cursorSide = 'right';

/** 노드의 툴팁을 연다 — 앵커 · 쪽을 먼저 정하고 그다음에 카드를 짓는다. `touch` = 손가락이 길게 눌러 열었다 (버튼 줄이 선다 · ADR-0374) */
function openTip(node, ev, touch = false) {
    cursorSide = node._tipSide === 'left' ? 'left' : 'right';
    anchorNode = node._tipAnchor ? node : null;
    if (anchorNode) {
        const r = stageRect(anchorNode);
        anchorSide = r.w - r.right >= r.left ? 'right' : 'left';
    } else anchorSide = 'right';
    touchOpen = touch;
    showTip(node._tipBuild(), ev);
    if (touch) addTouchBar(node, ev);
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
 * 창 좌표 → **한 장 좌표** (SCREEN_DESIGN §2 · ADR-0087). 화면은 `#stage` 한 장이 `transform` 으로 통째로 줄고 늘고
 * (눕히던 ADR-0109 는 ADR-0371 이 대체했다 — 역행렬이라 회전이 없어도 그대로다), 마우스의 `clientX/Y` 를 그대로 `left/top` 에 넣으면 그만큼 어긋난다 —
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
 * 옛 `zoom` 보정 [2026-09-24 버그 수정] — **Chrome 127 이하**는 `zoom` 아래 요소의 `getBoundingClientRect` 를 **배율을 뺀 값**으로 줬다
 * (창 원점 기준으로 ÷ 누적 zoom · Chrome 128 에서 표준화). 메인(`.main { zoom: .9 }`) 안의 카드가 그만큼 원점에서 멀게 재여
 * **카드 옆 툴팁이 오른쪽 아래로 밀렸다**(Chrome 126 실측 — 왼쪽에 서야 할 툴팁이 올린 카드를 덮었다). 표준 브라우저는 1 이다.
 * 방식은 처음 한 번 재서 기억한다 — `zoom: .5` 인 100px 탐침이 100 으로 재이면 옛 방식이다
 */
let legacyZoom = null;
function rectZoom(node) {
    if (legacyZoom === null) {
        const probe = document.createElement('div');
        probe.style.cssText = 'position:absolute;visibility:hidden;width:100px;height:1px;zoom:.5';
        document.body.appendChild(probe);
        legacyZoom = probe.getBoundingClientRect().width > 75;
        probe.remove();
    }
    if (!legacyZoom) return 1;
    // `zoom` 은 상속이 아니라 곱이다 — 노드 자신부터 조상까지 곱한다(카드 속 칸은 `.main` × 툴팁 카드 배율)
    let z = 1;
    for (let n = node; n; n = n.parentElement) z *= parseFloat(getComputedStyle(n).zoom) || 1;
    return z;
}

/**
 * 노드의 창 사각형 → **한 장 좌표** 사각형. 모서리 둘을 각각 옮겨 작은 쪽 · 큰 쪽을 고른다 — 눕힌 한 장(ADR-0109)에서는
 * 창의 왼쪽 위가 한 장의 왼쪽 위가 아니다 (위 `stagePoint` 의 ⚠). 옛 `zoom` 방식이면 사각형을 먼저 되곱한다(`rectZoom`)
 */
export function stageRect(node) {
    const b = node.getBoundingClientRect(), k = rectZoom(node);
    const a = stagePoint({ clientX: b.left * k, clientY: b.top * k }), z = stagePoint({ clientX: b.right * k, clientY: b.bottom * k });
    return { left: Math.min(a.x, z.x), right: Math.max(a.x, z.x), top: Math.min(a.y, z.y), bottom: Math.max(a.y, z.y), w: a.w, h: a.h };
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
    // 손가락 툴팁의 버튼 줄은 툴팁 **아래 바깥**에 매달린다(`.tip-touch` · ADR-0374) — 아래 넘침 보정에 그 높이도 든다
    const bar = tip.querySelector(':scope > .tip-touch');
    // 아이템 비교 툴팁의 숨은 사본(Alt 때 모양의 「이 아이템」 카드 · `.tip-ghost`)이 더 길면 그 키로 잰다 — Alt 로 델타가 서도 위로 안 뛴다 (ADR-0658).
    //   사본은 툴팁의 안쪽 위에 붙어 툴팁 테두리를 안 든다 — 테두리 몫(offset − client)을 더한다
    const ghost = tip.querySelector('.tip-ghost');
    const boxH = Math.max(tip.offsetHeight, ghost ? ghost.offsetHeight + tip.offsetHeight - tip.clientHeight : 0);
    const tw = tip.offsetWidth, th = boxH + (bar ? bar.offsetHeight + 6 : 0);   // 배율 전 크기 = 한 장 단위
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
        y = p.y + 16;
        // 먼저 쪽에 놓고 한 장 밖으로 넘치면 반대쪽으로 접는다 — 기본은 커서 오른쪽 · 인벤토리 칸은 커서 왼쪽(2026-10-21 · ADR-0693).
        //   접혀도 아이템 비교 두 장의 순서는 그대로다 — 「착용 중」이 언제나 왼쪽 (2026-10-21 · SCREEN_DESIGN §6 · ADR-0690 — ~~`at-left` 로 뒤집기~~ ADR-0337)
        if (cursorSide === 'left') {
            x = p.x - tw - 16;
            if (x < 8) x = p.x + 16;
        } else {
            x = p.x + 16;
            if (x + tw > w - 8) x = p.x - tw - 16;
        }
    }
    if (y + th > h - 8) y = h - th - 8;
    if (x !== null) tip.style.left = Math.max(8, x) + 'px';
    tip.style.top = Math.max(8, y) + 'px';
}

export function hideTip() {
    anchorNode = null;
    // 손가락이 켠 [세부]는 그 툴팁 한 장의 것이다 — 닫히면 꺼진다 (ADR-0374). 툴팁이 이미 닫히니 다시 그릴 것이 없다
    if (altByTouch) { altByTouch = false; altHeld = false; }
    if (shiftByTouch) { shiftByTouch = false; shiftHeld = false; }
    touchOpen = false;
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
 * 몬스터의 한 벌 — `round` 이벤트의 `gear` 는 **부위**(등급이 정한 입은 부위 — R245) 배열이라 위치가 없다 (INTERFACE §2-6 · ADR-0183).
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

/** 상한이 걸리는 저항 4행 — 값만으로는 "몇 %까지 의미가 있나"를 못 읽는다 (battle_design §9-5) */
const RES_ROWS = ['res_fire', 'res_cold', 'res_lightning', 'res_poison'];

/** 전투 능력치 표기 — 단위 붙이기는 여기 한 곳에서만 · `pct` 는 비율로 와서 찍을 때만 100 을 곱한다(소수 1자리 · R111)
 *  `n` 은 자릿수를 안 깎고 **부동소수 찌꺼기만** 걷는다(유효숫자 12자리) — 소수 1자리 implicit 을 여러 부위 더하면 `30.799999999999997` 이 떴다 · `hp_regen` 0.096 은 그대로 (부채 #38) */
const fmtCombat = (def, v) => v === undefined ? '—'
    : typeof v === 'object' ? rangeText(v)          // 공격력 두 줄은 범위 {min, max} (R90 · ADR-0108)
    : def.fmt === 'pct' ? `${Math.round(M.pctNum(v) * 10) / 10}%`
    : def.fmt === 'sec' ? t('sk.cycleSec', { s: v.toFixed(2) })
    : String(+v.toPrecision(12));

/** 묶은 줄의 한 조각 이름 — 값이 있는 것만 이름을 붙여 찍는다 (`일반 10% · 데몬 5%`) */
const typeParts = o => ['normal', 'demon', 'undead'].map(k => [t(`st.fx.${k}`), o?.[k] ?? 0]);
/** 원소 넷 — 순서는 저항 4행과 같다(화염 · 냉기 · 전기 · 독 — `RES_ROWS`) */
const eleParts = o => RES_ROWS.map(id => id.slice(4)).map(e => [t(`st.fx.${e}`), o?.[e] ?? 0]);
const one = v => [[null, v ?? 0]];

/**
 * 옵션이 여는 축 — 세부 옵션의 줄이지만 **combat_stat 행이 아니다** [2026-09-22 · SCREEN_DESIGN §6 · ADR-0291].
 * 값은 대개 `computeCombat` 의 `option_fx` 묶음(hero.js)이 들고, 전부 0 이면 묶음째 `null` 이라 모든 값이 0 이다.
 * `parts(x, c)` = `[[조각 이름, 값]]` (`x` = `option_fx` · `c` = 시트 전체) — 조각이 **둘 이상이면 묶은 줄**이다(값이 있는 것만 이름을 붙이고 전부 0이면 `—`).
 * 하나면 이름 없이 값만 찍는다. 어느 칸 · 어느 묶음에 서는지는 `DETAIL_LAYOUT` 이 정한다.
 * 줄 이름은 아이템 옵션 줄(`M.AFFIX_LABELS`) · combat_stat 이름을 먼저 쓴다 — 같은 축이 두 화면에서 다른 이름이면 안 된다.
 * **전투가 안 읽는 축은 없다** — 상태이상 시간 감소 중 중독 · 화상 · 스턴은 아이템 툴팁의 「(미적용)」 줄이 든다 (ADR-0213).
 *   ⚠ 빙결 시간 감소는 2026-09-28 부터 전투가 읽는다(결빙 · R177) — 이 판의 줄은 아직 없다(세부 옵션 배치는 SCREEN_DESIGN 먼저 · `/ui`).
 * 타격 시 방어 · 저항 약화 · 타격 시 대상 데미지 감소는 **전투가 읽지만 세우지 않는다** [2026-09-22 사용자 지시 · ADR-0294 — 원소 피해 · 저항 감소는 2026-09-27 에 다시 섰다]
 */
const FX_ROWS = [
    // 원소 두 줄은 **네 값을 늘 `/` 로 잇는다**(화염 / 냉기 / 전기 / 독 — 저항 4행과 같은 순서 · 0 도 찍는다) [2026-09-28 사용자 지시]
    { id: 'fx_ele', fmt: 'pct', slash: true, name: () => t('st.fx.ele'), parts: x => eleParts(x?.ele) },
    // 저항 감소 — 모든 원소 타격(`res_reduction` · combat_stat 행)과 그 원소의 타격에만(`res_reduction_el` · 반지 시기 칸) 을 한 줄로 묶는다 [2026-09-27]
    //   적 원소 저항 감소 = 원소마다 **모든 원소(`res_reduction`) + 그 원소(`res_reduction_el`)** — 그 원소 타격에 실제로 먹는 값(formula.strike)
    { id: 'fx_res_red', fmt: 'pct', slash: true, name: () => t('st.fx.resRed'),
        parts: (x, c) => eleParts(c?.res_reduction_el).map(([n, v]) => [n, v + (c?.res_reduction ?? 0)]) },
    { id: 'fx_vs_type', fmt: 'pct', name: () => L(D.combatStats.find(s => s.id === 'vs_type_damage')),
        parts: x => typeParts(x?.vs) },
    { id: 'fx_vs_target', fmt: 'pct', name: () => t('st.fx.vsTarget'),
        parts: x => [[t('kind.elite'), x?.vsElite ?? 0], [t('exp.form.front'), x?.vsFront ?? 0], [t('exp.form.back'), x?.vsBack ?? 0]] },
    { id: 'fx_crush', fmt: 'pct', name: () => L(M.AFFIX_LABELS.crushing_blow_pct), parts: x => one(x?.crush) },
    { id: 'fx_hit', fmt: 'pct', name: () => L(M.AFFIX_LABELS.hit_bonus), parts: x => one(x?.hitBonus) },   // 궁수 T1-3 (2026-09-22 R138)
    { id: 'fx_dr_type', fmt: 'pct', name: () => t('st.fx.drType'), parts: x => typeParts(x?.vsDr) },
    { id: 'fx_dr_target', fmt: 'pct', name: () => t('st.fx.drTarget'),
        parts: x => [[t('kind.elite'), x?.vsEliteDr ?? 0], [t('exp.form.front'), x?.vsFrontDr ?? 0], [t('exp.form.back'), x?.vsBackDr ?? 0]] },
    { id: 'fx_counter', fmt: 'pct', name: () => L(M.AFFIX_LABELS.counter_chance), parts: x => one(x?.counter) },
    { id: 'fx_recv', fmt: 'pct', name: () => L(M.AFFIX_LABELS.hp_recovery_pct), parts: x => one(x?.recv) },
    { id: 'fx_buff_dur', fmt: 'pct', name: () => L(M.AFFIX_LABELS.buff_dur_pct), parts: x => one(x?.buffDur) },
    { id: 'fx_magic_find', fmt: 'pct', name: () => L(M.AFFIX_LABELS.magic_find), parts: x => one(x?.magicFind) },
    { id: 'fx_xp', fmt: 'pct', name: () => L(M.AFFIX_LABELS.xp_gain_pct), parts: x => one(x?.xpGain) },
];
const fxParts = (s, c) => s.parts(c?.option_fx ?? null, c);

/**
 * 세부 옵션의 자리 — `[세부 옵션 1, 세부 옵션 2]` · 칸마다 **묶음**의 배열 · 묶음마다 줄 id [2026-09-27 사용자 지시 · SCREEN_DESIGN §6 · ADR-0381].
 * 1 = **늘 먹는 것**(모든 타격 · 모든 피격) — 대표 · 공격 · 방어 · 회복 · 저항 / 2 = **조건부**(대상 · 상황 · 발동이 붙는 것) — 원소 · 대상 · 확률 · 맞을 때 · 효과 증폭 · 파밍.
 * 묶음 사이는 제목 없이 **살짝 띄운다** — 간격은 묶음 경계가 정한다(`sheetPages` · ADR-0396). 2 의 「대상」 묶음은 주는 것 ↔ 막는 것을 한 쌍씩 붙인다.
 * combat_stat 행끼리의 순서는 `sheet_order` 와 같아야 한다(dev/test.js 가 대조한다) · `fx_` 는 `FX_ROWS`.
 * 캐릭터 탭의 두 패널과 유닛 툴팁의 두 열이 **같은 자리에서** 끊는다 (ADR-0115)
 */
const DETAIL_LAYOUT = [
    [
        ['atk_physical', 'atk_magic', 'action_period', 'hp_max'],
        ['crit_rate', 'crit_damage', 'def_ignore', 'cooldown_reduction'],
        // 피해 감소 줄이 고정 피해 감소를 함께 든다(`고정 / %`) [2026-09-27 사용자 지시]
        ['defense', 'damage_reduction', 'fhr'],
        // 저항 넷 아래에 원소 두 줄(화염/냉기/전기/독 네 값) · 타격 회복과 화염 저항 사이를 띄운다 [2026-09-28 사용자 지시]
        ['res_fire', 'res_cold', 'res_lightning', 'res_poison', 'fx_ele', 'fx_res_red'],
    ],
    [
        // ~~최대 저항 증가~~ 줄은 걷었다 — 그 값은 저항 4행의 「상한」이 든다 [2026-09-28 사용자 지시]
        ['fx_vs_type', 'fx_dr_type', 'fx_vs_target', 'fx_dr_target'],   // 대상
        ['fx_crush', 'fx_hit', 'fx_counter', 'reflect_damage'],         // 발동 · 반응 — 강타 · 명중률을 반격 · 반사와 붙였다 [2026-09-28 사용자 지시]
        ['life_steal', 'hp_regen', 'fx_recv', 'fx_buff_dur', 'debuff_dur_reduction'], // 회복 · 지속 — 상태이상 · 디버프 시간 감소는 2에 둔다 (ADR-1009)
        ['fx_magic_find', 'gold_find', 'fx_xp'],                       // 파밍 — 드랍률 줄은 걷는다 (ADR-1009)
    ],
];
/**
 * 대표값 = 세부 옵션 1 의 첫 묶음 — 값을 굵게 찍고 아래를 살짝 띄운다 (구분선은 2026-09-15 걷음 · 간격 ADR-0396) · 몬스터 첫 장에도 선다.
 * 물리·마법 공격력 중 **하나는 늘 꺼져 있다**(무기 종류가 정한다) — 지우지 않는 것이 결정이다: 회색으로 남은
 * 그 자리가 「내 빌드가 어느 쪽인가」를 말한다 (SCREEN_DESIGN §6, 2026-09-01).
 */
const LEAD_IDS = DETAIL_LAYOUT[0][0];
const rowOf = id => id.startsWith('fx_') ? { ...FX_ROWS.find(r => r.id === id), fx: true }
    : { ...D.combatStats.find(s => s.id === id), lead: LEAD_IDS.includes(id) };
/** 세부 옵션의 줄 id 전부(자리 순) — 단정이 combat_stat · FX_ROWS 와 대조한다 */
export const detailLayoutIds = () => DETAIL_LAYOUT.map(page => page.flat());
/** 대표값 줄 (몬스터 첫 장 · SCREEN_DESIGN §2) */
export const leadStats = () => LEAD_IDS.map(rowOf);

/**
 * 세부 옵션 행 — 캐릭터 탭 세부 옵션 1·2 와 유닛 툴팁 오른쪽 열이 같이 쓴다.
 * 방어 소재값 → 감쇠율 · 저항 → 현재 상한은 `formula` 가 낸다 — 같은 곡선을 두 번 구현하지 않는다 (battle_design §9-8).
 * @param rows `sheetPages()` 의 한 쪽 또는 `leadStats()`
 * @param c    computeCombat 모양 — 영웅 `game.heroCombat` · 몬스터 `round` 이벤트의 `sheet`. 없으면 전 행이 흐린 `—`
 * @param base 견줄 시트 — 주면 표기가 바뀐 줄에 방향 클래스(`up` · `down` · `mixed`)가 붙는다. 캐릭터 탭 보관 칸 미리보기만 준다 (SCREEN_DESIGN §6 · ADR-0619)
 */
export function sheetRowsHtml(rows, c, base = null) {
    return rows.map(s => {
        const [text, extra] = rowCells(s, c);
        const has = s.fx ? !!c : c?.[s.id] !== undefined;
        const mark = base && rowCells(s, base).join('|') !== [text, extra].join('|') ? ` ${DIR_CLS[rowDir(s, base, c)]}` : '';
        return `<div class="cs-row${has ? '' : ' off'}${s.lead ? ' lead' : ''}${s.gap ? ' gap' : ''}${mark}" data-stat="${s.id}">
            <span class="cs-n">${rowName(s, c)}</span>
            <span class="cs-v">${text}${extra ? ` <span class="muted">${extra}</span>` : ''}</span></div>`;
    }).join('');
}

/** 저항 행의 상한 = 기본 + 최대 저항 증가 + **그 원소의** 최대 저항 증가(투구 시기 칸 · `res_max_el` · 2026-09-18) — 곡선은 `formula.resCap` 하나다 */
const resCapOf = (c, id) => SYS.formula.resCap(c?.res_max_bonus ?? 0, c?.res_max_el?.[id.slice(4)] ?? 0);   // `res_fire` → `fire`
/** 저항 행의 값 = **상한에서 자른 값** — 장비 · 스킬로 상한을 넘겨도 상한을 찍는다 [2026-10-23 사용자 지시 · ADR-0736]. 자르는 식은 전투와 같은 `formula.appliedResist` */
const resShownOf = (c, id) => SYS.formula.appliedResist(c?.[id], c?.res_max_bonus ?? 0, c?.res_max_el?.[id.slice(4)] ?? 0);

/** 줄 이름 — 속도 행은 마법 무기(평타 없음)를 든 유닛이면 「캐스팅 속도」 [2026-10-03 · R202 · ADR-0492] — 값은 같은 주기다 */
const rowName = (s, c) => (s.fx ? s.name() : s.id === 'action_period' && c?.basic_attack === false ? t('sk.castSpeed') : L(s));

/**
 * 한 줄의 표기 `[값, 덧붙임]` — 덧붙임 = 저항 상한 · 물리 방어 감쇠율(없으면 `''` · 흐린 글씨는 부르는 쪽이 싼다).
 * 세부 옵션 줄(`sheetRowsHtml`)과 착용 델타(`sheetDeltaRows`)가 **같은 글자**를 쓴다 — 두 자리의 표기가 갈리면 안 된다 (2026-10-14 · ADR-0618)
 */
function rowCells(s, c) {
    if (s.fx) return [fxText(s, c), ''];
    const v = c?.[s.id];
    const has = v !== undefined;
    const extra = RES_ROWS.includes(s.id) ? t('st.resCap', { cap: M.pctNum(resCapOf(c, s.id)) })
        : s.id === 'defense' && has ? t('st.mitigation', { p: Math.round(SYS.formula.mitigation(v) * 100) }) : '';
    // 물리 방어는 정수로 반올림해 찍는다 (2026-09-15 사용자 지시 · SCREEN_DESIGN §6) — 감쇠율은 위에서 반올림 전 값으로 냈다.
    //   fmt 로 가르지 않는다: 같은 `n` 인 HP 재생(0.05)까지 0 이 된다
    const shown = !has ? v : s.id === 'defense' ? Math.round(v) : RES_ROWS.includes(s.id) ? resShownOf(c, s.id) : v;
    // 피해 감소 = **고정 / %** 한 줄 [2026-09-27 사용자 지시 · SCREEN_DESIGN §6] — 고정 피해 감소(`option_fx.drFlat` · 모든 감소 뒤에 뺀다)는 제 줄을 잃었다
    return [s.id === 'damage_reduction' && has ? `${c.option_fx?.drFlat ?? 0} / ${fmtCombat(s, v)}` : fmtCombat(s, shown), extra];
}

/** 옵션이 여는 축 한 줄의 값 — 묶은 줄은 값이 있는 조각만 이름을 붙이고 전부 0이면 `—` · 세부 옵션이 없는 카드(`c` 없음)는 흐린 `—` (ADR-0291) */
function fxText(s, c) {
    const parts = fxParts(s, c);
    const on = parts.filter(([, v]) => v);
    return !c ? '—'
        : s.slash ? parts.map(([, v]) => fmtCombat(s, v)).join('/')
        : parts.length === 1 ? fmtCombat(s, parts[0][1])
        : on.length ? on.map(([n, v]) => t('st.fx.part', { n, v: fmtCombat(s, v) })).join(' · ') : '—';
}

/** 줄을 이루는 값 — 방향을 묻는 단위다(착용 델타 · 미리보기). 묶은 줄은 조각마다 · 피해 감소는 고정 + % · 저항은 상한에서 자른 값 + 상한 (ADR-0736) */
const rowVals = (s, c) => (s.fx ? fxParts(s, c).map(([, v]) => v)
    : s.id === 'damage_reduction' ? [c?.option_fx?.drFlat ?? 0, c?.[s.id]]
        : RES_ROWS.includes(s.id) ? [c?.[s.id] === undefined ? undefined : resShownOf(c, s.id), resCapOf(c, s.id)] : [c?.[s.id]]);
/**
 * 줄의 방향 — 값마다 `formula.statBetter` 를 묻고 모은다: 전부 같거나 좋아짐 → `1` · 전부 같거나 나빠짐 → `-1` · 섞임 → `0`.
 * 좋고 나쁨은 로직이 답한다(공격 속도는 초라 줄어야 좋다) — 렌더러는 크기를 견주지 않는다 (ADR-0618)
 */
function rowDir(s, a, b) {
    const x = rowVals(s, a), y = rowVals(s, b);
    const d = x.map((v, i) => SYS.formula.statBetter(s.id, v, y[i]));
    return d.every(v => v >= 0) && d.some(v => v > 0) ? 1 : d.every(v => v <= 0) && d.some(v => v < 0) ? -1 : 0;
}
/** 방향 → 줄 클래스 (style.css `.cs-row.up` · `.down` · `.mixed`) */
const DIR_CLS = { 1: 'up', '-1': 'down', 0: 'mixed' };

/**
 * 착용 델타 — 세부 옵션 줄 가운데 **표기가 바뀌는 줄만** `[{id, name, from, to, dir}]` [2026-10-14 · SCREEN_DESIGN §6 「비교 툴팁 규격」 · ADR-0618].
 * 줄 · 순서 · 값 꼴은 세부 옵션 1 · 2 그대로(`sheetPages` · `rowCells`) — 바뀌었나는 **찍힌 글자**로 가른다(표기가 같으면 바뀐 것이 아니다).
 * 값이 같고 덧붙임만 바뀐 줄(최대 저항 증가가 올린 저항 상한)은 덧붙임을 `from → to` 로 낸다 · `dir` 은 `rowDir`
 */
export function sheetDeltaRows(before, after) {
    return sheetPages().flat().map(s => {
        const [ft, fe] = rowCells(s, before), [tt, te] = rowCells(s, after);
        if (ft === tt && fe === te) return null;
        const [from, to] = ft !== tt ? [ft, tt] : [fe, te];
        return { id: s.id, name: rowName(s, after), from, to, dir: rowDir(s, before, after) };
    }).filter(Boolean);
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
        // 설명 카드는 세 칸에 각각 단다 — 줄(`.attr-row`)이 `display: contents` 라 상자가 없다 (`bindStatTips`)
        return `<div class="attr-row">
            <span class="attr-n" data-stat="${s.id}">${L(s)}<i class="cs-a">${s.abbr}</i></span>
            <span class="attr-bar" data-stat="${s.id}"><i style="width:${pct}%;background:${color}"></i></span>
            <span class="attr-v" data-stat="${s.id}">${v ?? '—'}</span></div>`;
    }).join('');
}

/**
 * 능력치 설명 카드 [2026-10-10 사용자 지시 · SCREEN_DESIGN §2 「능력치 설명 툴팁 규격」 · ADR-0581] — `root` 안의 `data-stat` 줄마다
 * 올리면 **이름 / 선 아래 효과**(`st.desc.<줄 id>` — 효과가 여럿이면 한 줄에 하나). 물약 카드 · 창 뱃지와 같은 모양이다. 값은 안 든다 — 올린 줄이 이미 든다.
 * 캐릭터 탭 기본 옵션 · 세부 옵션 · 후보 카드만 부른다 — 툴팁 속 같은 줄(유닛 툴팁)은 툴팁 위에 툴팁을 겹치지 않아 안 부른다.
 * 이름은 **그 줄이 찍은 이름**(줄의 첫 칸)이다 — 마법 무기의 「캐스팅 속도」 · 옵션 줄 이름이 줄 조립과 갈리지 않게. 기본 능력치는 약어 배지를 뺀 이름
 */
export function bindStatTips(root) {
    root.querySelectorAll('[data-stat]').forEach(n => {
        const id = n.dataset.stat;
        const attr = D.heroAttributes.find(a => a.id === id);
        const name = attr ? L(attr) : n.firstElementChild?.textContent ?? '';
        bindTipNode(n, () => el('div', 'tip-card stat-tip',
            `<div class="tip-effect-head"><div class="tip-name">${name}</div></div><div class="tip-effect-summary">${t(`st.desc.${id}`)}</div>`));
    });
}

/** 대표값을 뺀 쪽 — 몬스터 카드는 첫 장이 대표값을 이미 든다 */
const dropLead = rows => rows.filter(s => !s.lead).map((s, i) => (i || !s.gap ? s : { ...s, gap: false }));
/** 줄에 값이 있나 — 묶은 줄은 조각 하나라도 · 전투 능력치는 0 이 아닌 값 */
const rowOn = (s, c) => s.fx ? fxParts(s, c).some(([, v]) => v) : !!c?.[s.id];
/**
 * 세부 옵션 두 쪽 — `[1쪽 행, 2쪽 행]` (캐릭터 탭 세부 옵션 1 · 2 · 유닛 툴팁 오른쪽 두 열) · 자리는 `DETAIL_LAYOUT`.
 * @param sparse 유닛 툴팁 [ADR-0381] — 세부 옵션 1 은 옵션이 여는 축만 **값이 있는 줄만**(ADR-0291) · 세부 옵션 2 는 **전 줄이 값이 있을 때만** 선다
 *               (조건부 칸이라 0 은 「그 조건이 없다」다 — 옵션이 없는 영웅 · 몬스터는 2 가 빈다). 끊는 자리는 그대로다
 */
export const sheetPages = (c = null, sparse = false) => DETAIL_LAYOUT.map((page, pi) => {
    const keep = s => !sparse || ((pi === 0 && !s.fx) || rowOn(s, c));
    // 묶음 경계마다 첫 줄 위를 살짝 띄운다 — 거른 뒤에 달아서 통째로 빠진 묶음은 간격도 안 남는다 (ADR-0396)
    return page.map(g => g.map(rowOf).filter(keep)).filter(g => g.length)
        .flatMap((g, gi) => g.map((s, i) => (gi && !i ? { ...s, gap: true } : s)));
});

/**
 * 유닛 카드 뼈대 — 영웅은 착용 장비, 몬스터는 기본 옵션 막대 + 대표값(`leadStats`)을 첫 장으로 쓴다.
 * **이름 · 소속 줄은 없다** — 툴팁은 올린 카드 바로 옆에 붙어 뜨고(ADR-0120) 그 카드의 이름 줄 · 위칸이 이미 든다 (ADR-0134).
 * 무엇의 툴팁인지는 윗변 색과 붙은 자리가 말한다.
 * **Alt 를 누르는 동안만** 세부 옵션 두 열이 선다 · 각주는 두 상태 모두 선다(ADR-0456) — 두 열은 캐릭터 탭 세부 옵션 1 · 2 와 같은 자리에서 끊고 열 이름도 같되,
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
    const detailPages = sheetPages(sheet, true);
    const pages = altHeld ? detailPages.map((rows, i) => `
            <div class="tip-unit-col d${i + 1}">
                <div class="tip-col-h">${t('ch.detail.hn', { n: i + 1 })}</div>
                <div class="tip-sheet">${sheetRowsHtml(equipment ? rows : dropLead(rows), sheet)}</div>
            </div>`).join('') : '';
    // 영웅은 장비 첫 장만 쓴다. 아래 Basic Stats 몸통은 몬스터와 향후 영웅 복원용으로 그대로 살려 둔다 (ADR-0171).
    // 기본 상태의 숨은 세부 옵션 1은 **높이 기준**일 뿐 화면·접근성 트리에는 보이지 않는다. 언어와 값이 바뀌어도 실제 세부 옵션 1과 정확히 같은 높이다 (ADR-0176).
    const foot = `<div class="tip-foot">${t('tip.unit.altHint')}</div>`;
    const base = equipment ? `
                <div class="tip-equipment-face">
                    ${equipment.html}
                    ${foot}
                </div>
                ${altHeld ? '' : `<div class="tip-equipment-probe" aria-hidden="true">
                    <div class="tip-col-h">${t('ch.detail.hn', { n: 1 })}</div>
                    <div class="tip-sheet">${sheetRowsHtml(detailPages[0], sheet)}</div>
                </div>`}` : `
                <div class="tip-col-h">${t('ch.attr.h')}</div>
                <div class="attr-list">${attrRowsHtml(stats, color)}</div>
                <div class="tip-sheet tip-lead">${sheetRowsHtml(leadStats(), sheet)}</div>`;
    c.innerHTML = `
        <div class="tip-unit">
            <div class="tip-unit-col base">
                ${base}
            </div>${pages}
        </div>
        ${equipment ? '' : foot}`;
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
 * 기본 옵션 첫 장 카드 — 능력치 7 막대 + 그 아래 장비 3×3. 영웅은 장비 오른쪽에 액티브 스킬 그림 셋을 세로로 붙인다.
 * Alt 동안 그 바깥쪽에 세부 옵션 1 · 2를 붙인다. 편성 카드는 장비도 Alt 동안 별도 열에 선다.
 * [2026-09-21 사용자 지시 · ADR-0284 · ADR-0287]. 기본 옵션 열은 Alt 에도 **안 사라진다** — 폭을 못박아 제자리에 선다(style.css `.stats-first`).
 * 대표값은 안 싣는다 — 세부 옵션 1 머리에 있다. 스킬 칸은 그림만이다(캐릭터 탭 스킬 칸과 같은 규칙) — 툴팁 속에 설명창을 걸면 한 자리를 두 카드가 다툰다.
 * 붙는 쪽은 유닛 카드와 같다 — 카드 왼쪽에 선 툴팁은 열이 왼쪽으로 자란다(ADR-0126 · 격자가 자리를 정하고 DOM 순서는 그대로다)
 * @param skills 액티브 칸 셋 — 스킬 개체 또는 `null`(빈 칸). 영웅은 고유 · 책 · 전직 순서다.
 * @param lockedSkills 빈 칸에 잠금 그림을 표시할지 — 배운 스킬은 그대로 표시한다.
 */
function statsFirstCard(stats, color, combat, equipment, itemCardOf, rebuild, { skills = null, lockedSkills = [], gearBelow = false, cls = '', chips = '' } = {}) {
    const side = anchorSide === 'left' ? ' grow-left' : '';
    const open = altHeld;
    // 관전 양 진영의 `gearBelow` — 장비가 기본 옵션 아래에 늘 서고 Alt는 세부 옵션 1 · 2만 연다 (ADR-0486).
    const c = el('div', `tip-card unit stats-first${open ? ' alt' : ''}${gearBelow ? ' gear-below' : ''}${side}${cls ? ` ${cls}` : ''}`);
    c.dataset.alt = '1';
    c._rebuild = rebuild;
    c.style.setProperty('--unit-line', color);
    // 영웅 스킬은 그림 오른쪽 아래에 `Lv.n` — `activeCells` 가 `lv` 를 싣는다 (ADR-0701)
    const lvTag = s => (Number.isFinite(s.lv) ? `<span class="sk-lv">${t('sk.lvTag', { n: s.lv })}</span>` : '');
    const icons = (skills ?? []).map((s, i) => {
        const locked = !s && lockedSkills[i];
        return `<span class="tip-skill${s ? '' : ' vacant'}${locked ? ' locked' : ''}">${s ? skillImg(s) + lvTag(s) : locked ? `<span class="sk-lock">${M.lockIcon(true)}</span>` : ''}</span>`;
    }).join('');
    const more = open ? (gearBelow ? '' : `
            <div class="tip-unit-col gear">${equipment.html}</div>`) + sheetPages(combat, !gearBelow).map((rows, i) => `
            <div class="tip-unit-col d${i + 1}">
                <div class="tip-col-h">${t('ch.detail.hn', { n: i + 1 })}</div>
                <div class="tip-sheet">${sheetRowsHtml(rows, combat)}</div>
            </div>`).join('') : '';
    c.innerHTML = `
        <div class="tip-unit">
            <div class="tip-unit-col base">
                ${chips ? `<div class="tip-col-h with-chips"><span>${t('ch.attr.h')}</span><span class="tip-chips">${chips}</span></div>` : `<div class="tip-col-h">${t('ch.attr.h')}</div>`}
                <div class="attr-list">${attrRowsHtml(stats, color)}</div>
                ${!gearBelow && skills ? `<div class="tip-skills">${icons}</div>` : ''}
                ${gearBelow ? `<div class="tip-gear-below${skills ? ' with-skills' : ''}">${equipment.html}${skills ? `<div class="tip-skills">${icons}</div>` : ''}</div>` : ''}
                <div class="tip-foot">${t(gearBelow ? 'tip.unit.altHint' : 'tip.unit.altHintGear')}</div>
            </div>${more}
        </div>`;
    bindEquipmentCells(c, equipment, itemCardOf);
    return c;
}

/** 유닛 툴팁 전부: 기본 옵션 + 그 아래 장비 · Alt로 세부 옵션 1 · 2. false면 영웅 · 몬스터 모두 장비 첫 장으로 돌아간다 (ADR-0486 · 관전 밖 영웅도 ADR-0498). */
const UNIT_TIP_ALL = true;

/* 「기본 옵션」 머리 오른쪽 칩 셋 [2026-10-24 사용자 지시 · SCREEN_DESIGN §2 「유닛 툴팁 규격」 · ADR-0773] — 후보 카드 · 도감 몬스터 카드 칩 줄과
   같은 칩 · 같은 순서 · 같은 색이다(ADR-0724). 이름이 없는 조각은 칩째 빠진다 — 지어내지 않는다 */
const chipHtml = (cls, color, text) => (text ? `<span class="${cls}"${color ? ` style="color:${color}"` : ''}>${text}</span>` : '');
const sinChipHtml = id => chipHtml('sin-chip', M.SINS[id]?.color, M.SINS[id] ? L(M.SINS[id]) : '');
const clsChipHtml = id => {
    const c = D.classes.find(x => x.id === id);
    return c ? chipHtml('cls-chip', c.color, L(c)) : '';
};
/** 영웅 = `등급 → 죄종 → 직업` (`app.js:candidateCard` 와 같은 셋) */
const heroChipsHtml = h => chipHtml('tier-chip', tierOf(h).color, L(tierOf(h))) + sinChipHtml(h.sin) + clsChipHtml(h.cls);
/** 몬스터 = `종족 → 죄종 → 직업` (`codexCandCard` 와 같은 셋) — 종족 칩 색 = 등급 색(윗변 · 막대와 같다) ·
 *  죄종 = 정예가 그 판에서 굴린 죄종(`round` 이벤트 적 항목의 `sin`), 없으면 장 죄종(도감과 같다) */
const monsterChipsHtml = (u, color) => {
    const row = D.monsters?.[u.monsterId];
    const race = SYS.commission?.races?.find(x => x.id === row?.monster_type);
    return chipHtml('tier-chip', color, race ? L(race.name) : '') + sinChipHtml(u.sin ?? monsterSin(u.monsterId)) + clsChipHtml(row?.cls);
};

/**
 * 영웅 카드 — 기본 옵션 + 그 아래 착용 장비 · (Alt) 세부 옵션 (SCREEN_DESIGN §2 「유닛 툴팁 규격」 · §4-2 · §5 · ADR-0486 · ADR-0498).
 * 관전 · 편성 · 출정 창 · 상점 · 대장간 · 도서관 — 서는 자리 전부 같은 카드다 [2026-10-03 사용자 지시 · ADR-0498].
 * 능력치는 `h.stats` 에서 그대로 읽는다. 세부 옵션은 **부르는 쪽이 넘긴다** — `game.heroCombat` 은 상태 `G` 가 있어야 하는데 이 파일은 `G` 를 모른다.
 * 이름 · 레벨 줄은 없다 — 올린 카드가 이미 든다 (ADR-0134) · 등급 · 죄종 · 직업은 「기본 옵션」 머리 오른쪽 칩 셋이다 (ADR-0773)
 * @param combat computeCombat 결과 — 없으면 세부 옵션이 전부 `—`. **함수면 지을 때마다 부른다** — 관전이 지금 값(`withLive`)을 넘긴다:
 *               Alt 로 다시 지을 때(`_rebuild`)도 · 떠 있는 동안 바뀔 때(`refreshTip`)도 그 순간의 값이다 (R305 · ADR-0707)
 * @param itemOf uid 로 현재 세이브의 아이템을 찾는 함수 — tip.js 는 G 를 모른다
 * @param itemCardOf **아이템 개체**로 기존 「착용 중」 아이템 카드를 만드는 함수 — 아이템 옵션 표기는 앱이 든다 (ADR-0183 으로 uid → 개체)
 * @param statsFirst 첫 장이 **기본 옵션**인 편성 탭 카드(`statsFirstCard`) — 편성 탭(띠 · 진형 칸)이 **스위치가 켜져 있을 때만** 준다(`app.js:PARTY_TIP_STATS` · 꺼 둠 · ADR-0318) [2026-09-21 사용자 지시 · ADR-0284 · ADR-0287]
 * @param skills     액티브 칸 셋(스킬 개체 또는 `null`) — 생략하면 영웅과 착용 장비에서 읽는다.
 */
export function heroTipCard(h, combat = null, itemOf = null, itemCardOf = null, { statsFirst = false, skills = null } = {}) {
    if (!h) return null;
    const sheet = typeof combat === 'function' ? combat() : combat;
    const worn = wornOfHero(h, itemOf);
    const actives = SYS.skill.activesFor(h, { skillPlus: SYS.item.skillPlusOf(Object.values(worn).filter(Boolean)) });
    const cells = skills ?? ['innate', 'book', 'advance'].map(source => {
        const a = actives.find(s => s.source === source);
        return a ? { ...a, lv: 1 + (a.up ?? 0) } : null;
    });
    if (statsFirst || UNIT_TIP_ALL) return statsFirstCard(h.stats, tierOf(h).color, sheet,
        equipmentHtml(worn), itemCardOf,
        () => heroTipCard(h, combat, itemOf, itemCardOf, { statsFirst, skills }),
        { skills: cells, lockedSkills: [false, false, h.level < D.balance.advance_unlock_level], gearBelow: !statsFirst, chips: heroChipsHtml(h) });
    return unitCard(h.stats, tierOf(h).color, sheet, () => heroTipCard(h, combat, itemOf, itemCardOf), '',
        equipmentHtml(worn), itemCardOf);
}

/**
 * 시트 위에 지금 값을 덮는다 [2026-10-21 · R305 · SCREEN_DESIGN §2 「유닛 툴팁 규격」 · ADR-0707] — `live` = 관전 재생기가 `stat` 이벤트로 쌓은 줄(INTERFACE §2-6).
 *   계산하지 않는다 — 줄을 갈아 끼울 뿐이다. `null` 줄은 시트에서 뺀다(갈아입어 무기 종류가 바뀐 공격력 줄) · 받는 회복(`recv`)은 `option_fx.recv` 자리다
 */
export function withLive(sheet, live) {
    if (!sheet || !live) return sheet;
    const out = { ...sheet };
    for (const [k, v] of Object.entries(live)) {
        if (k === 'recv') out.option_fx = { ...out.option_fx, recv: v };
        else if (v === null) delete out[k];
        else out[k] = v;
    }
    return out;
}

/** 몬스터 막대 색 = **카드 윗변 색** — 관전 카드가 등급으로 칠하는 토큰 그대로다(style.css `.unit.enemy` · `.unit.elite` · `.unit.boss`) */
const GRADE_LINE = { normal: 'var(--enemy-line)', elite: 'var(--color-warning)', stage_boss: 'var(--boss-line)', chapter_boss: 'var(--boss-line)' };

/**
 * 몬스터 카드 — 기본 옵션 + 그 아래 착용 장비 · (Alt) 세부 옵션. 관전 영웅과 같은 조립 함수 · 배치 · 전 행이다 (ADR-0486).
 * 한 벌은 `round` 이벤트의 `gear`(그 몬스터가 입고 있는 장비 — 처치 드롭이 이 중 하나로 나간다 · INTERFACE §2-6),
 * 세부 옵션은 같은 이벤트의 `sheet`(R94)에 재생기가 쌓은 지금 값(`u.live` · `stat` 이벤트 · R305)을 덮은 것이다 — 렌더러는 계산하지 않는다.
 * 이름 줄은 없다 — 올린 카드의 이름 줄 · 테두리 색이 이미 든다 (ADR-0134) · 종족 · 죄종 · 직업은 「기본 옵션」 머리 오른쪽 칩 셋이다 (ADR-0773)
 * @param u 재생기의 적 유닛 `{monsterId, grade, sin, stats, sheet, live, gear}`
 * @param itemCardOf 장비 아이템 개체 → 「착용 중」 아이템 카드 — 영웅 · 캐릭터 탭과 같은 카드다 (ui/battle.js · ADR-0312)
 */
export function monsterTipCard(u, itemCardOf = null) {
    if (!u) return null;
    // 어두운 등급 색(일반 `--enemy-line` · 보스 `--boss-line`)은 막대만 밝힌다 — 검은 막대 바탕에 묻힌다. 정예(노랑)는 그대로 (2026-09-15 · SCREEN_DESIGN §2).
    const lift = u.grade === 'elite' ? '' : 'bar-lift';
    const color = GRADE_LINE[u.grade] ?? GRADE_LINE.normal;
    const equipment = equipmentHtml(wornOfMonster(u.gear));
    const rebuild = () => monsterTipCard(u, itemCardOf);
    // 시트는 평타 여부를 안 싣는다(battle.js 가 뺀다) — 속도 행 이름은 재생기 유닛의 `noBasic` 으로 고른다 (ADR-0492)
    const sheet = u.sheet ? { ...withLive(u.sheet, u.live), basic_attack: !u.noBasic } : null;
    if (UNIT_TIP_ALL) return statsFirstCard(u.stats, color, sheet, equipment, itemCardOf, rebuild,
        { gearBelow: true, cls: lift, chips: monsterChipsHtml(u, color) });
    return unitCard(u.stats, color, sheet, rebuild, lift, equipment, itemCardOf);
}

/** 도감 Lv1 파밍 줄의 값 표기 — 비율이다(`codex_option.csv:farm_value`) · 옵션 줄 사전에 없는 축이라 `statValue` 에 표기만 넘긴다 */
const CX_PCT = { fmt: 'pct' };

/**
 * 도감 몬스터 툴팁 — **두 장**: 왼쪽 선술집 후보 카드 · 오른쪽 이야기 · 단계 (SCREEN_DESIGN §9 · ADR-0206 · ADR-0233).
 * 오른쪽 장 = 「스토리」 머리글 + 이야기 · 아래 「보너스 효과」 머리글 + 단계(초상 · 이름 · 직업은 왼쪽 장이 든다). 도감 경험치는 **부르는 쪽이 넘긴다** — 이 파일은 `G` 를 모른다.
 * 단계 줄은 **그 단계가 여는 효과**다(ADR-0667 · ADR-0715 · monster_design §8) — 종류 · 순서는 `game.codexSteps`, Lv1 · Lv2 줄은 `game.codexLineOf`(종족 이름 + 한 마리 몫) ·
 *   옵션 단계의 줄은 `game.codexOptionOf`(장비 옵션 줄과 같은 표기 · 행이 없으면 `—`)
 * @param m `{id, exp, boss, lv?, lockHtml?}` — 도감 카드 한 장의 집계(exp = 누적 도감 경험치 · ADR-0587) · `lv` = 먹는 레벨(도서관이 연 단계에서 자른다 · 없으면 경험치 레벨) ·
 *   `lockHtml` = 도서관이 안 연 단계의 잠금 줄 `{레벨: 자물쇠 + 「도서관 n랭크」}` — 그 줄 효과 아래에 선다 (ADR-0762 · 부르는 쪽이 `lockLine` 으로 만든다)
 * @param grade 초상 등급 — 일반 / 정예 고르개를 그대로 따른다 (ADR-0167)
 * @returns `[후보 카드 장, 이야기 · 단계 장]` — 툴팁 창이 가로로 나란히 세운다
 */
export function codexMonsterTipCard(m, grade) {
    // 이름은 자리표시자다(`{m:1900|이/가}` — 이름의 SSOT 는 monster.csv · 스테이지 이야기와 같은 규칙). 몬스터 이야기는 `{leader}` 를 안 쓴다
    const story = fillStory(L(monsterStory(m.id)), lang());
    const lv = m.lv ?? SYS.game.codexLevel(m.exp);
    // 단계는 **늘 전부 선다** — 닿지 않은 단계도 보여야 「다음에 무엇을 받나」가 읽힌다 · 닿은 단계만 켜진다.
    //   **레벨만 든다** — 「경험치를 얼마 모아야 열린다」는 적지 않는다(다음 문턱은 카드가 든다 · ADR-0209)
    //   Lv1 · Lv2 = 그 몬스터 **한 마리의 몫** 앞에 종족 이름(Lv2 는 「상대」 · ADR-0715) · Lv3(none) = `—` · 옵션 단계는 그 몬스터의 전투 옵션 한 줄 (ADR-0667)
    //   칸이 없는 몬스터(보스)는 Lv1 · Lv2 도 `—`
    const opt = SYS.game.codexOptionOf(m.id);
    const line = SYS.game.codexLineOf(m.id);
    const race = line ? L(D.codexRaces[line.race]) : '';
    const stepText = s => {
        if (s.reward === 'option') return opt ? L(M.affixText(opt.stat, opt.value)) : '—';
        if (!line || s.reward === 'none') return '—';
        if (s.reward === 'farm') {
            const { kind, value } = line.farm;   // 다섯 다 비율 — 부호 · 단위는 옵션 줄과 같은 규칙(`statValue`)
            return t('cx.rw.farm', { race, line: t(`cx.rw.${kind}`, { v: M.statValue(kind, value, CX_PCT) }) });
        }
        const { stat, value } = line.fight;      // 장비 옵션 사전 · 사전에 없는 둘은 도감 전용 이름(`CODEX_FIGHT_LABELS`)
        return t('cx.rw.fight', { race, line: L(M.affixText(stat, value, M.CODEX_FIGHT_LABELS[stat])) });
    };
    //   도서관이 안 연 단계는 **자물쇠 줄만**(자물쇠 + 「도서관 n랭크」 · 회색) — 효과 글은 안 든다 (ADR-0922 · ADR-0762)
    const steps = SYS.game.codexSteps().map((s, i) => `
        <div class="cx-step${i < lv ? ' on' : ''}">
            <span class="cx-step-lv">${t('cx.tip.lv', { lv: s.level })}</span>
            <span class="cx-step-b">${m.lockHtml?.[s.level] ? `<span class="cx-step-need">${m.lockHtml[s.level]}</span>` : stepText(s)}</span>
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

/** 레벨 줄의 칸 이름 키 — `level_field` 하나에 하나(`cx.lv.*`). 피해 배율은 하는 일이, 감쇠는 대상이 가른다(가이디드 = 방어 깎기) · 모르는 칸은 「효과」 */
const LV_LABEL = {
    mult_pct: (d, e) => (e.effect === 'hit' ? 'cx.lv.mult' : 'cx.lv.heal'),
    hits: () => 'cx.lv.hits',
    decay_pct: d => (d.target === 'enemy_highest_def' ? 'cx.lv.strip' : 'cx.lv.decay'),
    duration_sec: () => 'cx.lv.dur',
    effect_value: () => 'cx.lv.value',
    cool_sec: () => 'cx.lv.cool',
    // 창이 거는 상태이상의 값 · 시간 — 이그나이트 화상 세기 · 딥 프리즈 스턴 시간 (2026-10-29 · R385)
    hit_value: () => 'cx.lv.value',
    hit_duration_sec: () => 'cx.lv.dur',
};
/** 레벨 줄이 둘인 스킬의 `effect_value` 줄 — 걸린 효과의 수치(`skill_status.csv:stat`) → 칸 이름 (2026-10-28 R367 · 워 오더스) */
const LV_STAT = { def_pct: 'cx.lv.def', res_pct: 'cx.lv.resAll' };
/** 레벨 줄의 값 — `level_step` **그대로**(레벨마다 더하는 양 · 부호를 단다). 시간 칸은 초 · 타수는 회 · 나머지는 비율(%) */
function lvStepText(field, step) {
    const sign = step < 0 ? '−' : '+';
    const v = Math.abs(step);
    if (field === 'duration_sec' || field === 'cool_sec' || field === 'hit_duration_sec') return sign + t('time.s', { s: num(v) });
    if (field === 'hits') return sign + t('sk.u.times', { v: num(v) });
    return `${sign}${M.pctNum(v)}%`;
}
/** 타수 레벨 칸 — 단계가 정수가 아니면 「+0.34회」 대신 **한 타가 느는 레벨**을 적는다(러시 Lv4 · 7 · 10 · 2026-10-28 R374). 정수 단계면 종전 그대로 */
function hitsStepText(hits, step) {
    if (Number.isInteger(step)) return lvStepText('hits', step);
    const at = [];
    for (let up = 1; up <= D.balance.skillbook_upgrade_max; up++) if (Math.floor(hits + up * step) > Math.floor(hits + (up - 1) * step)) at.push(up + 1);
    return at.length ? t('cx.lv.hitsAt', { l: at.join(' · ') }) : '—';
}

/**
 * 도감 스킬 툴팁 — **두 장**: 왼쪽 스킬 카드 그대로(설명) · 오른쪽 획득처 · 레벨이 오르면 (SCREEN_DESIGN §9-1 · ADR-0680 — ~~단계~~ ADR-0650).
 * 오른쪽 장은 몬스터 툴팁의 오른쪽 장과 같은 모양이다 — 「획득처」 머리글 + 작은 초상 · 아래 「레벨이 오르면」 머리글 + 한 줄(바닥에 붙는다).
 * 몬스터 툴팁의 능력치 자리에 스킬은 「어디서 얻나」가 선다. 스킬 도감은 레벨이 없는 목록이라(monster_design §8-1 · R293) 영웅 · 세이브를 안 읽는다.
 * 획득처는 `battle.skillCarriers` 가 답한다(칸 규칙은 로직의 것) — 고정 칸 몬스터가 먼저, 셋째 칸 굴림 보스는 작은 머리 아래 따로 ·
 *   상단이 그 도안을 팔면(`game.shopBlueprintPool`) 맨 아래 「상단」 머리 + 건물 그림
 * @param id  스킬 id — 책이 되는 스킬만 부른다(`skill.bookable`)
 * @returns `[스킬 카드, 획득처 · 레벨이 오르면 장]` — 툴팁 창이 가로로 나란히 세운다
 */
export function codexSkillTipCard(id) {
    const src = SYS.battle.skillCarriers(id);
    // 작은 원형 초상 — 보스는 보스 테두리 · 아트가 없으면 죄종 색 빈 원(도감 몬스터 카드와 같은 규칙) · 아래 장-장소
    const face = s => {
        const img = monsterFace(s.monsterId, 'normal');
        const c = M.SINS[monsterSin(s.monsterId)]?.color ?? 'var(--text-muted)';
        const pic = img
            ? `<span class="face${s.boss ? ' boss' : ''}"><img src="${img}" alt="${L(monsterName(s.monsterId))}" loading="lazy" onerror="this.remove()"></span>`
            : `<span class="face none${s.boss ? ' boss' : ''}" style="background:${c}22;border-color:${c}66"></span>`;
        return `<div class="cx-src-cell">${pic}<span class="cx-src-at muted">${t('cx.tip.at', { c: s.chapter, s: s.stageNum })}</span></div>`;
    };
    // 셋째 칸 굴림 보스(`roll`)는 한 단 작게 — 직업이 같은 보스가 전부 서서 고정 칸 몬스터보다 많다(주인공은 고정 칸이다)
    const grid = (list, cls = '') => `<div class="cx-src${cls}">${list.map(face).join('')}</div>`;
    // 고정 칸은 **그 칸이 처음 열리는 단**으로 묶는다 — 첫 단(고유)이 머리 없이 먼저 · 나머지 단(나이트메어 2칸)은 단 이름 작은 머리 아래 따로 (ADR-0664).
    //   단은 로직이 준다(`skillCarriers` 의 `difficulty`) · 머리글은 단 이름 데이터 그대로
    const firstDiff = D.difficultyList[0]?.id ?? null;
    const later = D.difficultyList.slice(1).map(d => [d, src.fixed.filter(s => s.difficulty === d.id)]).filter(([, list]) => list.length);
    const body = (src.fixed.some(s => s.difficulty === firstDiff || s.difficulty == null) ? grid(src.fixed.filter(s => s.difficulty === firstDiff || s.difficulty == null)) : '')
        + later.map(([d, list]) => `<div class="cx-src-h muted">${L(d.name)}</div>${grid(list)}`).join('')
        + (src.roll.length ? `<div class="cx-src-h muted">${t('cx.tip.roll')}</div>${grid(src.roll, ' roll')}` : '')
        + (SYS.game.shopBlueprintPool().includes(id) ? shopSource() : '');
    // 레벨이 오르면 — 그 스킬의 레벨 줄마다 한 줄(워 오더스는 둘 · 2026-10-28 R367) · 칸 이름 | `level_step` 그대로. 없으면 `—`
    const def = SYS.skill.defs[id];
    //   한 줄이 레벨 칸을 둘 들 수 있다(러시 — 타수 + 한 타 배율 · 2026-10-28 R374) — 칸마다 한 줄
    const lvRows = (def?.effects ?? []).flatMap(e => [[e, e.levelField, e.levelStep], [e, e.levelField2 ?? null, e.levelStep2 ?? null]]).filter(([, f]) => f !== null);
    //   줄이 둘이면 「효과」가 안 갈린다 — 걸린 효과의 수치 이름으로 (없는 수치는 「효과」 그대로)
    const lvKey = (e, f) => (lvRows.length > 1 && f === 'effect_value' && LV_STAT[SYS.skill.statuses[e.status]?.stat])
        || (LV_LABEL[f]?.(def, e) ?? 'cx.lv.value');
    const lvUp = lvRows.length
        ? lvRows.map(([e, f, s]) => `<div class="cx-lvup"><span>${t(lvKey(e, f))}</span><b>${f === 'hits' ? hitsStepText(e.hits, s) : lvStepText(f, s)}</b></div>`).join('')
        : '<span class="muted">—</span>';
    const card = el('div', 'tip-card cx-tip cx-sk-tip', `
        <div class="cx-tip-h">${t('cx.tip.source')}</div>
        <div class="cx-src-box">${body || '<span class="muted">—</span>'}</div>
        <div class="cx-tip-h">${t('cx.tip.lvUp')}</div>
        ${lvUp}`);
    return [skillTipCard({ id }), card];
}

/** 획득처의 상단 — 작은 머리 = 건물 이름(`building.csv`) · 그림 = 상단 건물 그림(몬스터 초상과 같은 크기 · 네모) · 상단을 지었는지와 상관없이 선다 (ADR-0680) */
function shopSource() {
    const b = SYS.construction.list.find(x => x.id === 'shop');
    const name = b ? L(b.name) : 'shop';
    const img = M.buildingImg('shop');
    return `<div class="cx-src-h muted">${name}</div><div class="cx-src"><div class="cx-src-cell">` +
        `<span class="face bld">${img ? `<img src="${img}" alt="${name}" loading="lazy" onerror="this.remove()">` : ''}</span></div></div>`;
}

/**
 * 도감 툴팁 왼쪽 장 = **선술집 후보 카드 그대로** (ADR-0233 · SCREEN_DESIGN §3 후보 카드 · §8) — `app.js:candidateCard` 와 같은 `.ng-card` 칸 · 같은 줄 순서다:
 * 초상 옆에 칩 줄(종족 + 부류 + 직업 · ADR-0724 · ADR-0922) · 이름 · 역할 · 무기군 · 고유 스킬, 아래에 능력치 7 막대 · 능력치 합.
 * 값은 `monster.csv` 의 기본 능력치 7 — 레벨과 무관하고 `battle.makeEnemy` 가 읽는 것과 같다. 막대 줄은 **같은 함수**다(`attrRowsHtml` · ADR-0114).
 * 후보 카드의 `Lv.1` · 최대 HP 줄은 없다 — 몬스터의 레벨 · HP 는 스테이지 레벨 · 등급이 정해 한 값이 없다
 */
function codexCandCard(m, grade) {
    const row = D.monsters?.[m.id];
    // 영웅의 티어 칩 자리 = **종족**(`monster.csv:monster_type` 의 이름 — 관전 신원과 같은 `SYS.commission.races` · ADR-0724).
    //   윗변 · 막대 · 칩 색 = 관전 몬스터 툴팁의 등급 색(보스는 보스, 아니면 일반 / 정예 고르개). 어두운 색은 막대만 밝힌다(`bar-lift` · monsterTipCard 와 같다)
    //   둘째 칩 = **부류**(`monster.csv:monster_base` 의 이름 · 무채색) — 죄종 칩이 섰던 자리 (ADR-0922)
    const race = SYS.commission?.races?.find(x => x.id === row?.monster_type);
    const base = D.codexRaces?.[row?.monster_base];
    const line = GRADE_LINE[m.boss ? 'stage_boss' : grade] ?? GRADE_LINE.normal;
    const stats = row ? Object.fromEntries(D.heroAttributes.map(s => [s.id, row[s.id]])) : null;
    const total = stats ? D.heroAttributes.reduce((a, s) => a + (stats[s.id] ?? 0), 0) : '—';
    // 역할 줄 = 직업의 역할 + **그 몬스터의 무기군** — 영웅은 직업이 드는 무기군 전부를 적지만 몬스터는 제 무기군이 하나다
    const cls = D.classes.find(c => c.id === row?.cls);
    //   무기군 `-` = 그 직업 본편 무기군 중 판마다 굴린다(2026-10-23 · R324) — 그때는 영웅처럼 그 직업 무기군을 잇는다
    const wgs = row?.weapon_group === '-'
        ? D.weaponGroupList.filter(g => g.release === 'main' && g.classes.includes(row.cls))
        : [D.weaponGroups?.[row?.weapon_group]].filter(Boolean);
    const role = [cls ? L(cls.role) : '', wgs.map(g => L(g)).join(' / ')].filter(Boolean).join(' · ');
    // 스킬은 **정해진 칸의 그림만 가로로** — 고유 → 나이트메어 2칸(모서리 표시) · 이름 없음 · 목록 카드와 같은 줄(ADR-0666) · 보스의 한 칸 더는 판마다 굴려 정해진다(ADR-0233)
    const skills = monsterSkillIcons(m.id, 'ng-skill', 'ico sk-ico');
    // 초상은 **영웅과 같은 네모 칸**(`.hero-face` — `app.js:heroFace` 와 같은 꼴) — 이 장은 선술집 영웅 카드 그대로라
    //   도감 카드 · 관전의 원형(몬스터) 구분을 여기서만 푼다 (ADR-0237). 아트가 없으면 영웅처럼 **빈 칸**이다
    const src = monsterFace(m.id, grade);
    const face = `<span class="hero-face">${src ? `<img src="${src}" alt="${L(monsterName(m.id))}" loading="lazy" onerror="this.remove()">` : ''}</span>`;
    const c = el('div', `ng-card cx-cand${m.boss || grade !== 'elite' ? ' bar-lift' : ''}`, `
        <div class="ng-head">
            ${face}
            <div class="ng-id">
                <div class="ng-chips">${race ? `<span class="tier-chip" style="color:${line}">${L(race.name)}</span>` : ''}${base ? `<span class="base-chip">${L(base)}</span>` : ''}${cls ? `<span class="cls-chip"${cls.color ? ` style="color:${cls.color}"` : ''}>${L(cls)}</span>` : ''}</div>
                <div class="ng-name"><b>${L(monsterName(m.id))}</b></div>
                <div class="ng-role muted">${role}</div>
                ${skills}
            </div>
        </div>
        <div class="attr-list">${attrRowsHtml(stats, line)}</div>
        <div class="ng-line sep"><span>${t('ng.total')}</span><b>${total}</b></div>`);
    c.style.borderTopColor = line;
    return c;
}

/**
 * 물약 카드 (SCREEN_DESIGN §2 「물약 툴팁 규격」 · ADR-0315 · 신설 2026-09-24) — **두 렌더러가 함께 쓴다**:
 * 편성 탭 칸 · 가진 물약 (§15) · 출정 창 칸 (§4-1) · 대장간 재고 · 제작 행 (§8-2) · 도감 타일 (§9-1) ↔ 관전 아레나 칸 (§4-2).
 * **관전 창 뱃지(버프) 툴팁과 같은 모양이다** [2026-09-24 사용자 지시 「스킬 버프 나올 때처럼 통일」] — 첫 줄 **이름**,
 *   가는 선 아래 **효과 한 줄**. 클래스도 그 카드(`battle.js:effectTipCard`)의 것을 그대로 쓴다(`.tip-effect-head` · `.tip-effect-summary`).
 *   **그림은 안 단다** [2026-09-24 사용자 지시] — 올린 칸이 이미 그 그림이다.
 *   효과만 적는다 (CLAUDE.md 규칙 7) — 언제 마시나 · 어느 칸부터 · 무엇이 소모되나는 안 쓴다.
 * @param id    물약 id — `null` 이면 **빈 칸 카드**다(「빈 칸」 — 칸도 카드를 세운다)
 * @param opts.heal  회복량 덮어쓰기 — 관전은 **그 런이 싣고 나간 값**을 쓴다(재생기는 CSV 를 다시 읽지 않는다)
 */
export function potionTipCard(id, { heal } = {}) {
    const info = id ? potionInfo(id) : null;
    const c = el('div', 'tip-card potion');
    c.innerHTML = `<div class="tip-effect-head"><div class="tip-name">${info ? L(info.name) : t('pt.potion.empty')}</div></div>`
        + (info ? `<div class="tip-effect-summary">${t('tip.potion.heal', { n: (heal ?? info.heal).toLocaleString() })}</div>` : '');
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
 * 무기 피해 · 스킬 피해 · 회복량이 쓴다 — 캐릭터 시트 · 아이템 툴팁 · 대장간도 같은 함수를 부른다(app.js)
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
 * 하는 일 줄 하나의 **피해 종류** — `physical` · 원소 id · `fixed`(고정 피해 — 사제 직격 · R221 · 문장은 원소와 같은 틀 「{v} 의 고정 피해」) · 피해를 안 내는 줄은 `null`. 문장(`amountPhrase`)과 종류 칩(`skillBodyHtml`)이 같이 쓴다 (ADR-0477 · ADR-0480).
 * 타격 · 고정 = 그 타격이 상대하는 방어 — **스킬의 원소 태그가 먼저**고 없으면 쓰는 이의 공격 타입이다 (전투 `strikeOnce` 와 같은 순서 · battle_design §2-1).
 *   원소는 이름으로 말한다 — 「마법 피해」는 없다. 공격 타입만 보면 09-11 뒤 원소 스킬까지 「물리 피해」로 찍힌다 (2026-09-15).
 *   공격 타입은 언제나 물리라(2026-10-02) 주인이 없는 자리(`atkType` 없음)도 같은 답을 낸다 — 그래서 식도 종류를 말한다.
 * 평타 부여(`onhit_element`) = 걸린 효과가 얹는 원소. 평타를 퍼뜨리기만 하는 `attack_splash` 는 제 피해가 없다
 */
function damageTypeOf(line, atkType) {
    if (line.effect === 'hit' || line.effect === 'fixed') return line.element ?? atkType ?? 'physical';
    const st = line.status ? SYS.skill.statuses[line.status] ?? null : null;
    return st?.stat === 'onhit_element' ? st.element : null;
}

/**
 * 수량 구절 — 값을 아는 자리는 **실제 수치**(`{v} 의 물리 피해`), 모르는 자리는 **식**(`{f} 의 물리 피해`)으로 접는다.
 * 피해는 두 자리 모두 **종류를 말한다** (ADR-0477).
 * ⚠ 감소·치명·추가 피해 **전**의 값이다 (previewOf 주석) — 설명창이 약속하는 건 「내가 때리는 세기」다.
 */
function amountPhrase(line, part, atkType, R) {
    if (!part) return null;
    const d = amountSlot(part, R);
    if (line.effect === 'heal' || line.effect === 'mend') return part.value == null ? t('sk.amt.healFx', { f: d }) : t('sk.amt.heal', { v: d });
    const type = damageTypeOf(line, atkType);
    const elem = type && type !== 'physical';
    if (part.value == null) return elem ? t('sk.amt.elemFx', { f: d, e: t(`st.atkType.${type}`) }) : t('sk.amt.physicalFx', { f: d });
    return elem ? t('sk.amt.elem', { v: d, e: t(`st.atkType.${type}`) }) : t('sk.amt.physical', { v: d });
}

/**
 * 문장의 숫자 자리 — 스킬마다 제 틀(`skill.csv:desc_*`)이 이 이름으로 부른다 [2026-10-21 · ADR-0679]. 어휘는 `skill.js:DESC_SLOTS` 가 로드 때 본다.
 * 자리는 **틀이 쓸 때만** 만든다(`() =>`) — 안 쓰는 자리가 `R.fx` 를 켜지 않게.
 *   n 쿨(단위 없음 — 틀이 「초마다」를 든다 · 설명창은 쿨감을 곱한 실제 쿨 · 줄 문장은 표기 쿨 — ADR-0703) · d 수량 구절(피해는 종류까지 — ADR-0477 · 벽은 HP 만) · h 타수 · k 감쇠
 *   s · v 거는 걸린 효과의 시간 · 값(`hit` 줄이면 맞은 대상에게 거는 것 — 결빙 · 음수는 절댓값이라 방향은 틀이 든다 · 이베이드는 횟수)
 *   v2 둘째 `apply` 줄의 값(퀵 드로우 · 오버드로우 — 슬롯 식 없이 원값 · 설명창 재료는 첫 줄 `skill.previewOf`) · m 프렌지 겹 상한 · t 오오라 피해 간격 · i 계속 닳기의 방 사이 간격
 *   c · x 확률로 터지는 추가 피해의 확률 · 배수(둘째 문장 `sk.line.proc` 가 쓴다) · p 쓸 때 내는 HP(지금 HP 의 비율 — 원값 · 2026-10-24 R355)
 */
function descSlots(def, pv, atkType, R) {
    const P = pv?.parts ?? {};
    const at = (raw, key, unit) => slot({ raw, part: P[key], unit }, R);
    const e = def.effects[0];
    const st = e.status ? SYS.skill.statuses[e.status] ?? null : null;
    const st2 = SYS.skill.statuses[def.effects.slice(1).find(x => x.effect === 'apply')?.status] ?? null;
    return {
        // 설명창(`R.realCool`)은 쓰는 이의 쿨감을 곱한 실제 쿨을 소수점 한 자리로 · 액티브 줄 문장은 표기 쿨 (2026-10-21 · ADR-0703 — ADR-0038 일부 대체)
        //   Alt 면 값 뒤에 회색 식 `(표기 쿨 − 쿨감 n%)` — 실제로 깎인 비율(`coolCut` · 바닥 반영 · ADR-0704) · 쿨감을 아는 자리면 0% 라도 · 모르면(`null`) 식 없음 (ADR-0706)
        n: () => {
            if (!R.realCool) return sec(pv?.baseSec ?? def.cool);
            const v = hl(Number(pv?.coolSec ?? def.cool).toFixed(1));
            if (pv?.coolCut == null) return v;
            R.fx = true;
            return R.alt ? `${v} <span class="tip-fx">(${num(pv.baseSec)} − ${t('sk.cdrShort')} ${M.pctNum(pv.coolCut)}%)</span>` : v;
        },
        // 소환 — 벽의 HP 는 피해가 아니라 구절 없이 자리만 (skill_design §12-6)
        d: () => e.effect === 'summon' ? (P.amount ? amountSlot(P.amount, R) : null) : amountPhrase(e, P.amount, atkType, R),
        h: () => at(e.hits, 'hits', UNIT.times),
        k: () => at(e.decay, 'decay', UNIT.pct),
        s: () => st ? at(st.dur, 'dur', UNIT.sec) : null,
        // 값의 단위 — 이베이드는 횟수 · 변신은 맞힐 때마다 늘어나는 초(골드 피버 · 2026-10-29 R380) · 그 밖은 %
        v: () => st ? at(Math.abs(st.value), 'value', st.stat === 'evade' ? UNIT.times : st.stat === 'transform' ? UNIT.sec : UNIT.pct) : null,
        v2: () => st2 ? slot({ raw: Math.abs(st2.value), unit: UNIT.pct }, R) : null,
        m: () => hl(num(D.balance.frenzy_stack_max)),
        f: () => hl(num(D.balance.swarm_fly_count)),   // 스웜의 파리 수 (2026-10-29 · R380)
        t: () => sec(D.balance.aura_pulse_sec),
        i: () => sec(D.balance.channel_tick_sec),
        c: () => at(e.procChance, 'procChance', UNIT.pct),
        x: () => at(e.procMult, 'procMult', UNIT.pct),
        p: () => slot({ raw: def.hpCost, unit: UNIT.pct }, R),
    };
}

/**
 * 문장 — **스킬마다 제 틀**이다(`skill.csv:desc_kr` · `desc_en` · 2026-10-21 사용자 지시 · ADR-0679 — ~~하는 일 × 나가는 방식 × `target` 이 고른 공용 틀~~).
 * 틀의 `{자리}` 를 `descSlots` 가 채운다. 모르는 자리는 그대로 남긴다 — 로드 검사(`skill.js`)가 막으니 화면에 `{` 가 보이면 그쪽이 샌 것이다.
 * @returns {string[]} 첫째가 본 문장 · 둘째는 확률로 터지는 추가 피해(있을 때만 — **완결된 둘째 문장**이라 틀에 잇지 않는다)
 */
function skillLines(def, pv, atkType, R) {
    const V = descSlots(def, pv, atkType, R);
    const line = L(def.desc).replace(/\{(\w+)\}/g, (m, k) => V[k]?.() ?? m);
    if (!(def.effects[0].procChance > 0)) return [line];
    return [line, t('sk.line.proc', { c: V.c(), x: V.x() })];
}

/* ───────── Alt 계산식 — 누르는 동안만 (SCREEN_DESIGN §2 「스킬 설명창 규격」 · ADR-0089) ─────────
   토글이 아니다 — 켜 둔 것을 잊으면 모든 설명창이 식으로 부푼다. 떠 있는 설명창도 **즉시** 바꾼다
   (마우스를 다시 올리게 하면 보려던 순간을 놓친다). 바꾸는 것은 **`data-alt` 를 단 것** — 스킬 카드(식) · 유닛 카드(세부 옵션 열 · 2026-09-14) · 아이템 비교 묶음(착용 델타 · 2026-10-18 ADR-0658).
   스킬 창의 줄 문장(`skillLineHtml`)은 이 상태를 **안 본다** — 판 안에 셋이 나란히 서서 식이 붙으면 세 줄이 같이 부푼다 */
let altHeld = false;
/** 지금 Alt 를 누르고 있나 — 카드를 `app.js` 가 짓는 아이템 비교 툴팁(착용 델타 · ADR-0658)이 짓는 순간 읽는다 */
export const isAltHeld = () => altHeld;
/** 마지막 마우스 위치 — 다시 그린 카드의 높이가 달라져도 넘침 보정이 맞게 `moveTip` 을 한 번 더 부른다 */
let lastMove = null;

/** 전역 툴팁은 드래그를 막지 않게 기본 `pointer-events:none`; Alt 로 붙드는 영웅 툴팁만 장비 hover를 위해 연다 (ADR-0176). */
function syncTipInteraction() {
    // 손가락으로 연 툴팁은 늘 받는다 — 버튼 줄을 눌러야 한다 (ADR-0374)
    $tip()?.classList.toggle('interactive', !!(touchOpen || (altHeld && anchorNode?._tipHoldOnAlt)));
}

function setAlt(on) {
    if (altHeld === on) return;
    altHeld = on;
    if (!on) hideEquipmentItemTip();
    const tip = $tip();
    if (!tip?.classList.contains('show')) return;
    // 다시 그리는 것 = `data-alt` 를 단 것 — 스킬 설명창 · 유닛 카드(ADR-0114) · 아이템 비교 묶음(ADR-0658 — 「이 아이템」 카드의 착용 델타).
    //   제 인자를 쥔 `_rebuild` 로 같은 것을 새로 만든다
    const cards = tip.querySelectorAll('[data-alt]');
    for (const c of cards) c.replaceWith(c._rebuild());
    syncTipInteraction();
    // 카드 옆에 붙은 툴팁(ADR-0120)은 마우스 위치 없이도 다시 놓인다 — 넓어진 카드가 넘치면 왼쪽 · 위로 옮긴다
    if (cards.length && (anchorNode || lastMove)) moveTip(lastMove);
    tip.querySelector('.tip-touch-alt')?.classList.toggle('on', on);
    // Alt 로 영웅 밖에서도 붙들었던 툴팁은 키를 떼는 순간 커서가 영웅 위인지 다시 본다. 밖이면 그때 닫는다 (ADR-0171).
    //   손가락 툴팁은 커서가 없다 — 바깥 탭이 닫는다
    if (!on && !touchOpen && anchorNode?._tipHoldOnAlt && !anchorNode.matches(':hover')) hideTip();
}

/**
 * 떠 있는 유닛 툴팁을 지금 값으로 [2026-10-21 · R305 · SCREEN_DESIGN §2 「유닛 툴팁 규격」 · ADR-0707] — `node` 에 붙어 떠 있으면
 *   **세부 옵션 열만** 카드의 `_rebuild`(지금 값을 다시 읽는다)로 새로 지어 갈아 끼운다. 첫 장 · 장비 칸 · Alt 로 연 아이템 카드는 그대로다 —
 *   카드를 통째로 갈면 아이템 카드가 붙은 칸이 사라진다. 세부 옵션 열이 없으면(Alt 를 안 눌렀다) 할 일이 없다. 관전 재생기가 `stat` 이벤트마다 부른다
 */
export function refreshTip(node) {
    const tip = $tip();
    if (!node || anchorNode !== node || !tip?.classList.contains('show')) return;
    const COLS = '.tip-unit-col.d1, .tip-unit-col.d2';
    let swapped = false;
    for (const c of tip.querySelectorAll('.tip-card.unit[data-alt]')) {
        const old = c.querySelectorAll(COLS);
        if (!old.length) continue;
        const fresh = c._rebuild().querySelectorAll(COLS);
        old.forEach((col, i) => { if (fresh[i]) { col.replaceWith(fresh[i]); swapped = true; } });
    }
    // 줄이 늘거나 줄면 카드 높이가 바뀐다 — 넘치면 위로 옮긴다(Alt 와 같은 자리 규칙)
    if (swapped) moveTip(lastMove);
}

/**
 * 다시 지은 카드로 툴팁을 옮겨 붙인다 [R305 · ADR-0707] — 관전은 라운드 · 갈아입기마다 카드를 새로 짓는다(`battle.js:renderUnits`).
 *   떠 있던 툴팁이 옛 카드에 붙어 있었으면 새 카드가 이어받는다 — 안 옮기면 지금 값(`refreshTip`)이 옛 카드를 찾다 멈춘다
 */
export function reanchorTip(was, node) {
    if (was && node && anchorNode === was) anchorNode = node;
}

// Alt 만 기본 동작을 막는다 — 막지 않으면 떼는 순간 브라우저 메뉴로 포커스가 넘어간다.
// 창이 포커스를 잃으면(Alt+Tab) keyup 이 안 오므로 떼는 것으로 친다
window.addEventListener('keydown', ev => { if (ev.key === 'Alt') { ev.preventDefault(); setAlt(true); } });
window.addEventListener('keyup', ev => { if (ev.key === 'Alt') { ev.preventDefault(); setAlt(false); } });
window.addEventListener('blur', () => setAlt(false));
window.addEventListener('mousemove', ev => { lastMove = ev; }, { passive: true });

/* ───────── Shift 범위 — 누르는 동안만 (SCREEN_DESIGN §2 · §6 「비교 툴팁 규격」 · ADR-0617) ─────────
   Alt 와 같은 장치다 — 토글이 아니고 떠 있는 툴팁도 **즉시** 바뀐다. 바꾸는 것은 **`data-shift` 를 단 것**(아이템 카드 · 비교 묶음)뿐이고
   제 인자를 쥔 `_rebuild` 로 같은 것을 새로 짓는다. 기본 동작은 막지 않는다(Shift 는 브라우저 메뉴로 포커스를 안 넘긴다) */
let shiftHeld = false;
/** 지금 Shift 를 누르고 있나 — 아이템 카드(`app.js:bindTip`)가 짓는 순간 읽는다 */
export const isShiftHeld = () => shiftHeld;
/** [범위]로 켠 Shift 인가 — 툴팁이 닫히면 끈다(`hideTip`) */
let shiftByTouch = false;

function setShift(on) {
    if (shiftHeld === on) return;
    shiftHeld = on;
    const tip = $tip();
    if (!tip?.classList.contains('show')) return;
    const cards = tip.querySelectorAll('[data-shift]');
    for (const c of cards) c.replaceWith(c._rebuild());
    // 줄 끝 괄호로 카드가 넓어질 수 있다 — 넘치면 왼쪽 · 위로 옮긴다
    if (cards.length && (anchorNode || lastMove)) moveTip(lastMove);
    tip.querySelector('.tip-touch-range')?.classList.toggle('on', on);
}

window.addEventListener('keydown', ev => { if (ev.key === 'Shift') setShift(true); });
window.addEventListener('keyup', ev => { if (ev.key === 'Shift') setShift(false); });
window.addEventListener('blur', () => setShift(false));

/* ───────── 손가락 — 길게 누르기 · 바깥 탭 · 버튼 줄 (SCREEN_DESIGN §2 「터치 조작」 · ADR-0374) ─────────
   **입력마다** 가른다 — 마지막 포인터가 손가락이면 손가락 방식이다. 기기(`pointer: coarse`)로 가르면 터치 노트북의 마우스가 죽는다.
   마우스 쪽 길(hover · Alt 키 · 우클릭)은 하나도 안 바뀐다 */
/** 마지막 포인터 입력이 손가락인가 — 손가락이 낸 가짜 마우스 이벤트를 `bindTipNode` 가 걸러 낸다 */
let touchInput = false;
/** 지금 뜬 툴팁을 손가락이 열었나 — 버튼 줄 · 포인터 받기 · 바깥 탭 닫기가 이걸 본다 */
let touchOpen = false;
/** [세부]로 켠 Alt 인가 — 툴팁이 닫히면 끈다(`hideTip`) */
let altByTouch = false;
/** 이만큼 누르고 있으면 길게 누르기다 (ms) */
const LONG_PRESS_MS = 450;
/** 이만큼 움직이면 누르기가 아니다 — 진형 드래그 임계(`app.js:bindCardDrag` 4px)와 같다 · 창 좌표 그대로(손이 움직인 거리다) */
const PRESS_SLOP = 4;
/** 누르는 중 — `{ x, y, fired, timer }` */
let press = null;
/** 길게 누른 손을 뗀 직후의 click 을 삼킨다 — 누르던 칸의 클릭(배우기 · 고르기)이 툴팁에 딸려 일어나지 않게 */
let swallowUntil = 0;

export const isTouchInput = () => touchInput;

function cancelPress() {
    if (press) clearTimeout(press.timer);
    press = null;
}

window.addEventListener('pointerdown', ev => {
    touchInput = ev.pointerType === 'touch';
    if (!touchInput) return;
    cancelPress();
    const inTip = ev.target.closest?.('#tooltip, #equipment-item-tooltip');
    // 툴팁 밖을 탭하면 닫힌다 — 그 탭은 삼키지 않는다(제 할 일도 한다)
    if (touchOpen && !inTip) hideTip();
    if (inTip) return;
    const node = ev.target.closest?.('[data-tip]');
    if (!node?._tipBuild) return;
    const at = { clientX: ev.clientX, clientY: ev.clientY };
    const p = { x: ev.clientX, y: ev.clientY, fired: false };
    p.timer = setTimeout(() => {
        p.fired = true;
        if (press !== p || !node.isConnected) return;
        lastMove = at;
        openTip(node, at, true);
    }, LONG_PRESS_MS);
    press = p;
}, true);
window.addEventListener('pointermove', ev => {
    touchInput = ev.pointerType === 'touch';
    if (press && !press.fired && Math.abs(ev.clientX - press.x) + Math.abs(ev.clientY - press.y) >= PRESS_SLOP) cancelPress();
}, true);
// 브라우저가 스크롤로 가져가면 `pointercancel` 이 온다 — 누르기가 아니다
for (const type of ['pointerup', 'pointercancel']) window.addEventListener(type, () => {
    if (press?.fired) swallowUntil = performance.now() + 400;
    cancelPress();
}, true);
window.addEventListener('click', ev => {
    if (performance.now() >= swallowUntil) return;
    swallowUntil = 0;
    ev.preventDefault();
    ev.stopPropagation();
}, true);

/** 손가락 툴팁 아래의 버튼 줄 — [세부](= Alt) · 칸이 준 행동(= 우클릭 같은 것). 설 버튼이 없으면 줄도 안 선다 */
function addTouchBar(node, ev) {
    const tip = $tip();
    if (!tip) return;
    const acts = node._tipActions?.() ?? [];
    const hasAlt = !!tip.querySelector('[data-alt]');
    const hasShift = !!tip.querySelector('[data-shift]');   // [범위] = Shift — 범위를 다는 줄이 있는 아이템 카드만 (ADR-0617)
    if (!hasAlt && !hasShift && !acts.length) return;
    const bar = el('div', 'tip-touch');
    if (hasAlt) {
        const b = el('button', `btn tip-touch-alt${altHeld ? ' on' : ''}`, t('tip.touch.alt'));
        b.onclick = () => { const on = !altHeld; altByTouch = on; setAlt(on); };
        bar.appendChild(b);
    }
    if (hasShift) {
        const b = el('button', `btn tip-touch-range${shiftHeld ? ' on' : ''}`, t('tip.touch.range'));
        b.onclick = () => { const on = !shiftHeld; shiftByTouch = on; setShift(on); };
        bar.appendChild(b);
    }
    for (const a of acts) {
        const b = el('button', 'btn', a.label);
        b.onclick = () => { hideTip(); a.run(); };
        bar.appendChild(b);
    }
    tip.appendChild(bar);
    // 줄이 붙어 키가 컸다 — 아래 넘침 보정을 다시 한다
    moveTip(ev);
}

/**
 * 툴팁이 내는 **문장**을 그대로 낸다 — 스킬 창의 액티브 줄이 hover 와 같은 말을 하게 하는 창이다
 * [2026-09-08 사용자 지시 · SCREEN_DESIGN §7]. 카드와 **같은 함수**(`skillLines`)를 쓰므로 둘이 갈릴 길이 없다.
 * ⚠ **Alt 를 안 본다** — 기본 · 값 없음 두 상태만 탄다 (ADR-0089). 추가 피해 문장은 줄바꿈으로 가른다 —
 *   `sep` 을 주면 그 글자로 잇는다(도서관 전직 줄은 ` · ` — 설명이 한 줄이다 · ADR-0852).
 * ⚠ `desc`(고정 설명)는 **안 낸다** — 줄에서 뺐다(같은 지시). 설명창도 2026-09-15 에 뗐다(ADR-0118).
 * @returns {string} 틀이 없는 스킬이면 빈 문자열
 */
/** 설명창 · 액티브 줄이 읽는 정의 — **스킬 레벨을 얹은 것**이다(`s.up` · `skill.resolve` · 2026-10-06 · R216 · ADR-0529). 행이 지워진 옛 세이브는 null */
const defOf = s => SYS.skill?.resolve?.({ id: s?.id, up: s?.up ?? 0 }) ?? null;
export function skillLineHtml(s, ctx = {}, sep = '<br>') {
    const def = defOf(s);
    if (!def) return '';
    return (skillLines(def, SYS.skill.previewOf(def, ctx), ctx.atkType, { alt: false, fx: false }) ?? []).join(sep);
}

/**
 * 스킬 카드 — **몸통**(`skillBodyHtml`) (SCREEN_DESIGN §2 「스킬 설명창 규격」).
 * Alt 가 바뀌면 `setAlt` 가 떠 있는 카드를 **같은 인자로** 다시 만든다 — 그래서 카드가 제 인자를 쥔 `_rebuild` 를 든다(유닛 카드와 같은 장치).
 * @param s   `.id` 만 있으면 된다 — 정의는 `SYS.skill.defs` 에서 집는다(호출처마다 다른 모양을 받아 왔다)
 * @param ctx {period, atkMin, atkMax, matkMin, matkMax, hpMax, atkType, stats, cdr, source, off} — 모르는 값은 생략한다. 그 숫자 자리가 식으로 접힌다 · `cdr`(쿨감)이 없으면 0 ·
 *            `off` = 무기가 안 맞아 꺼진 칸(캐릭터 탭) — 필요 무기 칩이 위험색이 된다 (ADR-0496)
 */
export function skillTipCard(s, ctx = {}) {
    if (!s) return null;
    const c = el('div', 'tip-card skill');
    c.dataset.alt = '1';
    c._rebuild = () => skillTipCard(s, ctx);
    c.innerHTML = skillBodyHtml(s, ctx);
    return c;
}

/* ~~`skillTipSection`(아이템 툴팁의 스킬 칸)~~ — 2026-09-29 걷었다(R179 · ADR-0421): 무기가 스킬을 안 담는다 */

/**
 * 스킬 이름 줄 — 아이콘 + 이름 + **이름 바로 뒤에 능력치 칩** · **맨 오른쪽 끝에 필요 무기** [2026-10-03 · ADR-0496]. 정의를 못 찾으면(행이 지워진 옛 세이브) id 를 이름으로 낸다
 * @param attrs 이름 뒤에 설 능력치 칩 html 목록 · @param need 필요 무기 칩 html(없으면 null)
 */
const skillNameHtml = (s, attrs = [], need = null) => {
    const def = defOf(s);
    // 영웅이 든 스킬이면 아이콘 오른쪽 아래에 `Lv.n` — 아이템 칸과 같은 글 (스킬 레벨 · R216 · ADR-0576) — 부르는 자리가 `s.lv` 를 줄 때만(몬스터 · 도감은 안 준다)
    const lv = Number.isFinite(s.lv) ? `<span class="sk-lv">${t('sk.lvTag', { n: s.lv })}</span>` : '';
    return `<div class="tip-name"><span class="tip-sk-ico">${skillImg(s)}${lv}</span><span class="tip-name-text">${L(def?.name ?? s.name ?? { ko: s.id, en: s.id })}</span>`
        + `${attrs.length ? `<span class="tip-name-attr">${attrs.join('')}</span>` : ''}${need ? `<span class="tip-name-side">${need}</span>` : ''}</div>`;
};
/** 필요 무기 칩 — 무기가 필요한 스킬(`def.needsWeapon` · skill_design §2-2)만. 그 스킬 직업(`def.classId`)의 무기군 이름을 `weapon_group.csv` 순서로 잇는다 */
const needWeaponChip = (def, off) => {
    if (!def?.needsWeapon) return null;
    const names = (D.weaponGroupList ?? []).filter(g => g.classes.includes(def.classId)).map(g => L(g));
    return names.length ? `<i class="tip-chip need${off ? ' off' : ''}">${names.join(' · ')}</i>` : null;
};

/**
 * 스킬 설명창의 **몸통** — 아이콘 + 이름 + 능력치 칩 · 맨 끝 필요 무기(한 줄 · ADR-0496) / 칩(출처 · 태그 · 종류) / **문장**(추가 피해가 있으면 둘째 문장). 각주는 없다(ADR-0499).
 * 스킬 카드가 부른다 (~~아이템 툴팁의 스킬 칸~~ 은 2026-09-29 걷혔다 · ADR-0421).
 * 칩은 **출처 칩**(영웅·책·전직 — 부르는 자리가 `ctx.source` 를 줄 때만. 출처가 글자로 이미 선 자리는 안 준다 · ADR-0121) · **태그 칩**(파생 포함 — `skill_tag.csv` 가 이름의 SSOT) · **종류 칩**(피해를 내는 스킬만 — 물리 · 원소 이름 `st.atkType.*` · 줄 순 · 같은 종류는 한 번 · ADR-0480) · **능력치 칩**이다.
 * 능력치 칩은 스케일링 슬롯(하는 일 줄의 `scales` — 줄 순 · 2026-09-22)이 가리키는 능력치의 약어다 — 슬롯 순서 · 같은 능력치는 한 번 · 계수 0 이어도 찍는다 (ADR-0118).
 * 고정 설명(`def.desc`)은 **안 낸다** — 문장이 같은 말을 값까지 넣어 한다(같은 ADR).
 */
function skillBodyHtml(s, ctx) {
    const def = defOf(s);
    // 이름 아래 칩 줄 — 출처 · 태그 · 종류 / 이름 바로 뒤 — 능력치 칩 / 이름 줄 맨 끝 — 필요 무기 (2026-10-03 · ADR-0496)
    const chips = [];
    if (ctx.source) chips.push(`<i class="tip-chip src">${t(ctx.source === 'innate' ? 'sk.innate' : `sk.src.${ctx.source}`)}</i>`);
    for (const tg of (def ? SYS.skill.tagsOf(def) : [])) chips.push(`<i class="tip-chip">${L(skillTagName(tg))}</i>`);
    for (const ty of new Set((def?.effects ?? []).map(e => damageTypeOf(e, ctx.atkType)).filter(Boolean))) chips.push(`<i class="tip-chip dmg">${t(`st.atkType.${ty}`)}</i>`);
    const attrs = [...new Set((def?.effects ?? []).flatMap(e => e.scales).map(x => x.attr))].map(at => `<i class="tip-chip attr">${abbrOf(at)}</i>`);
    const need = needWeaponChip(def, ctx.off);
    // 정의를 못 찾으면(행이 지워진 옛 세이브) 이름만 낸다 — 던지지 않는다
    const R = { alt: altHeld, fx: false, realCool: true };
    const lines = def ? skillLines(def, SYS.skill.previewOf(def, ctx), ctx.atkType, R) : null;
    return `
        ${skillNameHtml(s, attrs, need)}
        ${chips.length ? `<div class="tip-chips">${chips.join('')}</div>` : ''}
        ${(lines ?? []).map(l => `<div class="tip-line">${l}</div>`).join('')}`;
}
