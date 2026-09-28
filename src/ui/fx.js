/**
 * fx.js — 관전 연출 (2026-09-28 사용자 지시 · SCREEN_DESIGN §4-2 「연출」 · ADR-0406)
 *
 * 세 단계가 따로 켜지고 꺼진다.
 *   · **1 피격 반응** — 모든 타격 · 그림 없이 움직임만(맞은 카드 번쩍임 · 흔들림, 때린 카드 튀어나감, 빗나감 비킴, 쓰러짐 붉은 번쩍임)
 *   · **2 스킬 이펙트** — 스킬에만 · 코드로 그린 빛과 조각(피해 종류마다 타격 모양 · 회복 · 좋은 창 · 나쁜 창 · 방벽 · 불러내기)
 *   · **3 타격 그림** — 스킬에만 · 피해 종류 다섯의 그림 한 장 + 움직임. 켜면 2 의 타격 모양을 대신하고, 그림이 없는 종류는 2 모양이 선다
 * 재생기(battle.js)가 사건을 적용한 **뒤에** 여기를 부른다 — 연출은 이미 실려 온 사건만 읽는다(피해 종류 `ty` · 치명 · 창의 좋음/나쁨 · 방벽 `stat`).
 *   계산 · 난수 없음 — 흩어짐은 사건 번호(`state.idx`)와 유닛 키에서 정해진 값이라 같은 런은 같은 그림이다.
 *   되감기(`state.catchUp`) · 카드가 없는 유닛은 그냥 지나간다.
 *
 * 켜짐 상태는 `<html data-fx="123">` 하나다 — JS 는 `fxOn(n)`, CSS 는 `[data-fx]` 선택자로 읽는다.
 *   **기본값은 `FX_DEFAULT` 한 줄** — 넣을 단계가 정해지면 여기를 고친다(`'1'` 이면 피격 반응만 · `''` 이면 전부 끔).
 *   개발용 버튼(devfx.js · 상단바 · 임시)이 이 브라우저에서만 덮어쓴다.
 *
 * 모양 · 색 · 길이는 style.css 「관전 연출」 규칙이 든다 — 여기는 **어느 카드에 무엇을 붙이나**와 조각마다 다른 값(방향 · 크기 · 늦춤)만 정한다.
 * ⚠ 단계를 빼면 이 파일의 그 단계 부분과 style.css 의 그 단계 규칙을 지운다.
 */

/** 넣을 단계 — 숫자 하나가 단계 하나다 */
export const FX_DEFAULT = '123';

const html = document.documentElement;
if (html.dataset.fx === undefined) html.dataset.fx = FX_DEFAULT;
/** n 단계가 켜져 있나 */
export const fxOn = n => (html.dataset.fx ?? FX_DEFAULT).includes(String(n));
/** 켜진 단계를 통째로 건다 — 개발용 버튼이 부른다. 다시 그리지 않는다: 다음 사건부터 먹는다 */
export const setFx = v => { html.dataset.fx = v; };

/* ═══ 타격 그림 (3단계) ═══ */

/* `src/assets/art/fx/<피해 종류>.webp` — 처음 쓰려는 순간 한 번 읽어 본다. 읽히기 전 · 없는 종류는 null 이라 2단계 모양이 선다.
   (그림 폴더가 이 기능과 같이 들고 나가도록 경로를 여기 둔다 — 다른 그림 경로는 mock.js 가 든다) */
const ART_DIR = './assets/art/fx/';
const ART_TYPES = ['physical', 'fire', 'cold', 'lightning', 'poison'];
const art = new Map();   // 종류 → 읽힌 주소 | null
function artOf(ty) {
    if (!ART_TYPES.includes(ty)) return null;
    if (!art.has(ty)) {
        art.set(ty, null);
        const im = new Image();
        im.onload = () => art.set(ty, im.src);
        im.src = `${ART_DIR}${ty}.webp`;
    }
    return art.get(ty);
}

/* ═══ 공통 조각 ═══ */

/* 배속이 오르면 연출이 짧아진다 — ×4 에서 원래 길이면 사건이 겹겹이 쌓인다. 배수는 칸(`.unit-slot`)에 걸어 카드 · 초상 · 조각이 물려받는다 */
const SPEED_K = { 1: 1, 2: 0.75, 4: 0.55 };
/* 한 카드에 조각이 이만큼 떠 있으면 새 조각을 안 띄운다 — 광역 다단히트가 ×4 로 몰려도 화면이 조각으로 덮이지 않게 */
const FX_CAP = 60;
/* 되돌려 다시 거는 클래스 무리 — 같은 요소의 연출은 하나씩만 돈다 */
const CARD = ['fx-shake', 'fx-shake-crit', 'fx-dodge', 'fx-down'];
const FACE = ['fx-flash', 'fx-flash-crit'];
const SLOT = ['fx-lunge', 'fx-appear'];

const live = (state, u) => !state.catchUp && !!u?.node?.isConnected;
const px = v => `${v.toFixed(1)}px`;
const deg = v => `${v.toFixed(1)}deg`;
const ms = v => `${Math.round(v)}ms`;

/** 사건마다 정해진 씨앗 — 사건 번호 · 유닛 키가 같으면 같다 */
function seedOf(state, u) {
    let h = Math.imul(state.idx + 1, 0x9e3779b1);
    for (const c of String(u.key)) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193);
    return h >>> 0;
}
/** 씨앗의 i 번째 값 — 0 이상 1 미만 */
function rnd(seed, i) {
    let x = Math.imul(seed ^ Math.imul(i + 1, 0x85ebca6b), 0xc2b2ae35);
    x ^= x >>> 15; x = Math.imul(x, 0x2c1b3c6d); x ^= x >>> 12;
    return (x >>> 0) / 4294967296;
}
/** 방사 — n 개 중 i 번째 조각의 방향(고르게 돌되 조금씩 비튼다)과 거리 → [x, y, 각] */
function ray(sd, i, n, r0, r1) {
    const a = (i + rnd(sd, i) * 0.6) / n * Math.PI * 2;
    const r = r0 + (r1 - r0) * rnd(sd, i + 40);
    return [Math.cos(a) * r, Math.sin(a) * r, a];
}

/** 배속 배수를 그 유닛의 칸에 건다 */
function prep(state, u) { u.node.parentElement?.style.setProperty('--fx-k', SPEED_K[state.speed] ?? 1); }

/** 그 요소의 연출 한 번 — 같은 무리의 클래스를 걷고 한 프레임 밀어 다시 건다(연달아 맞아도 처음부터 다시 돈다 · 스킬 칸 튀김과 같은 수).
    끝나면 클래스를 걷는다 — 카드 안 팝업 · 스킬 칸의 애니메이션 끝도 올라오므로 **그 요소 자신의 끝만** 본다 */
function play(node, cls, group) {
    if (!node) return;
    node.classList.remove(...group);
    void node.offsetWidth;
    node.classList.add(cls);
    node.addEventListener('animationend', function done(e) {
        if (e.target !== node) return;
        node.classList.remove(cls);
        node.removeEventListener('animationend', done);
    });
}

/** 카드의 조각 층 — **팝업 층 앞**에 끼워 피해 숫자가 늘 위에 선다. 초상 한가운데(`--cx` · `--cy`)는 처음 만들 때 잰다(카드 모양 개편 전/후마다 자리가 다르다) */
function layerOf(u) {
    let el = u.node.querySelector(':scope > .fx-layer');
    if (el) return el;
    el = document.createElement('div');
    el.className = 'fx-layer';
    const sp = u.node.querySelector('.sprite');
    if (sp) {
        el.style.setProperty('--cx', px(sp.offsetLeft + sp.offsetWidth / 2));
        el.style.setProperty('--cy', px(sp.offsetTop + sp.offsetHeight / 2));
        el.style.setProperty('--sw', px(sp.offsetWidth));   // 초상 크기 — 초상을 덮는 막(쓰러짐)이 쓴다
        el.style.setProperty('--sh', px(sp.offsetHeight));
    }
    u.node.insertBefore(el, u.node.querySelector(':scope > .pop-layer'));
    return el;
}

/** 조각 하나 — 끝나면 스스로 걷힌다. 조각마다 다른 값은 인라인 변수다(유닛마다 다른 `order` 와 같은 이유) */
function spawn(layer, cls, vars = {}, tag = 'i') {
    const el = document.createElement(tag);
    el.className = cls;
    for (const [k, v] of Object.entries(vars)) el.style.setProperty(`--${k}`, v);
    el.addEventListener('animationend', () => el.remove());
    layer.appendChild(el);
    return el;
}

/* ═══ 1 · 피격 반응 ═══ */

/** 맞은 카드 — 흔들림 + 초상 번쩍임. 치명은 크게 · 두 번 */
function struck(state, d, crit) {
    if (!fxOn(1) || !live(state, d)) return;
    prep(state, d);
    play(d.node, crit ? 'fx-shake-crit' : 'fx-shake', CARD);
    play(d.node.querySelector('.sprite'), crit ? 'fx-flash-crit' : 'fx-flash', FACE);
}
/** 때린 카드 — 상대 진영 쪽으로 튀어나갔다 돌아온다(방향은 CSS 가 진영으로 가른다) */
function lunge(state, a) {
    if (!fxOn(1) || !live(state, a)) return;
    prep(state, a);
    play(a.node.parentElement, 'fx-lunge', SLOT);
}

/* ═══ 2 · 스킬 이펙트 — 피해 종류가 타격 모양을 정한다 ═══ */

const SHAPES = {
    /** 물리 — 베기 궤적 하나 · 치명은 엇갈린 둘 */
    physical(L, sd, crit) {
        const r = -28 - 24 * rnd(sd, 0);
        spawn(L, 'fx-slash', { r: deg(r) });
        if (crit) spawn(L, 'fx-slash', { r: deg(r + 64), dl: '70ms' });
    },
    /** 화염 — 한가운데가 확 터지고 불똥이 위로 치우쳐 흩어진다 */
    fire(L, sd, crit) {
        spawn(L, 'fx-flare fire');
        const n = crit ? 12 : 9;
        for (let i = 0; i < n; i++) {
            const [x, y] = ray(sd, i, n, 28, 58);
            spawn(L, 'fx-ember', { dx: px(x), dy: px(y * 0.75 - 18), sz: px(7 + 5 * rnd(sd, i + 60)) });
        }
    },
    /** 냉기 — 날아가는 쪽으로 누운 얼음 조각 */
    cold(L, sd, crit) {
        const n = crit ? 10 : 8;
        for (let i = 0; i < n; i++) {
            const [x, y, a] = ray(sd, i, n, 30, 58);
            spawn(L, 'fx-shard', { dx: px(x), dy: px(y), r: deg(a * 180 / Math.PI + 90), sc: String((0.8 + 0.5 * rnd(sd, i + 70)).toFixed(2)) });
        }
    },
    /** 전기 — 위에서 꺾여 내려와 초상 한가운데에 닿는 갈래 · 치명은 셋 */
    lightning(L, sd, crit) {
        for (let b = 0; b < (crit ? 3 : 2); b++) {
            const pts = [];
            let x = -24 + 48 * rnd(sd, b * 10);
            for (let k = 0; k <= 6; k++) {
                pts.push(`${(k === 6 ? 0 : x).toFixed(1)},${(-58 + k * 58 / 6).toFixed(1)}`);
                x = x * 0.55 - 12 + 24 * rnd(sd, b * 10 + k + 1);
            }
            const p = pts.join(' ');
            spawn(L, 'fx-bolt', { dl: ms(b * 50) }, 'span').innerHTML =
                `<svg viewBox="-50 -60 100 120" width="100" height="120"><polyline points="${p}"/><polyline class="core" points="${p}"/></svg>`;
        }
    },
    /** 독 — 한가운데가 철퍽 튀고 방울이 튀어 올랐다 떨어진다 */
    poison(L, sd, crit) {
        spawn(L, 'fx-flare poison');
        const n = crit ? 10 : 8;
        for (let i = 0; i < n; i++) {
            spawn(L, 'fx-drop', { dx: px(-56 + 112 * (i + rnd(sd, i)) / n), dy: px(-26 - 26 * rnd(sd, i + 20)), sz: px(8 + 4 * rnd(sd, i + 50)) });
        }
    },
};
/** 종류가 없는 피해(자폭) — 충격 고리 */
const ring = L => spawn(L, 'fx-ring');

/** 스킬 타격의 모양 — 3단계 그림이 있으면 그림, 없으면 2단계의 피해 종류 모양 */
function impact(state, d, ty, crit) {
    if (!live(state, d)) return;
    const src = fxOn(3) ? artOf(ty) : null;
    if (!src && !fxOn(2)) return;
    prep(state, d);
    const L = layerOf(d);
    if (L.childElementCount > FX_CAP) return;
    const sd = seedOf(state, d);
    if (src) {
        const im = spawn(L, `fx-stamp${crit ? ' crit' : ''}`, { r: deg(-18 + 36 * rnd(sd, 0)) }, 'img');
        im.alt = '';
        im.src = src;
        return;
    }
    (SHAPES[ty] ?? ring)(L, sd, crit);
}

/* ═══ 재생기가 부르는 자리 — 사건 하나에 하나 ═══ */

/** 타격(`hit`) — 1 은 모든 타격, 2 · 3 은 스킬(`s`)만 */
export function fxHit(state, a, d, ev) {
    lunge(state, a);
    struck(state, d, ev.crit);
    if (ev.s) impact(state, d, ev.ty, ev.crit);
}
/** 비직격 피해(반사 · 자폭) — 맞은 카드만 흔들린다(친 쪽이 튀어나가지 않는다). `ev` 는 스킬일 때만 넘긴다(자폭) */
export function fxStrike(state, d, ev = null) {
    struck(state, d, false);
    if (ev?.s) impact(state, d, ev.ty, false);
}
/** 빗나감(`dodge`) — 때린 카드가 튀어나가고 맞을 카드가 옆으로 비킨다(비키는 쪽은 사건마다 정해진다) */
export function fxMiss(state, a, d) {
    lunge(state, a);
    if (!fxOn(1) || !live(state, d)) return;
    prep(state, d);
    d.node.style.setProperty('--fx-sx', rnd(seedOf(state, d), 0) < 0.5 ? '-1' : '1');
    play(d.node, 'fx-dodge', CARD);
}
/** 쓰러짐(`down`) — 초상에 붉은 막이 덮였다 걷히고 카드가 가라앉는다. 흐려짐은 CSS 가 한 박자 늦춘다 */
export function fxDown(state, u) {
    if (!fxOn(1) || !live(state, u)) return;
    prep(state, u);
    play(u.node, 'fx-down', CARD);
    spawn(layerOf(u), 'fx-bleed');
}
/** 회복(`heal`) — 스킬만 · 초록 빛 알갱이가 오른다(물약은 스킬이 아니다) */
export function fxHeal(state, d, ev) {
    if (!ev.s || !fxOn(2) || !live(state, d)) return;
    prep(state, d);
    const L = layerOf(d), sd = seedOf(state, d);
    if (L.childElementCount > FX_CAP) return;
    for (let i = 0; i < 8; i++) {
        spawn(L, 'fx-mote', { dx: px(-38 + 76 * (i + rnd(sd, i)) / 8), y0: px(26 + 20 * rnd(sd, i + 9)), y1: px(-34 - 28 * rnd(sd, i + 19)), dl: ms(200 * rnd(sd, i + 29)), sz: px(6 + 3 * rnd(sd, i + 39)) });
    }
}
/** 창(`buff`) — 스킬만 · 오오라(`until: null`)는 없다. 좋음/나쁨은 **창 뱃지 칩과 같은 규칙**(상태이상 `k` 이거나 값이 음수면 나쁨) */
export function fxBuff(state, u, ev) {
    if (!ev.s || ev.until === null || !fxOn(2) || !live(state, u)) return;
    prep(state, u);
    const cls = ev.stat === 'barrier_pct' ? 'fx-shell' : (ev.k || (ev.v ?? 0) < 0) ? 'fx-card fx-haze' : 'fx-card fx-sweep';
    spawn(layerOf(u), cls);
}
/** 불러낸 무리(`call`) — 떠오르며 선다. 카드를 새로 지은 뒤에 부른다 */
export function fxAppear(state, u) {
    if (!fxOn(2) || !live(state, u)) return;
    prep(state, u);
    play(u.node.parentElement, 'fx-appear', SLOT);
}
