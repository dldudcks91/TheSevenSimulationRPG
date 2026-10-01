/**
 * fx.js — 관전 연출 = **스킬 이펙트** (2026-09-28 사용자 지시 · SCREEN_DESIGN §4-2 「연출」 · ADR-0409)
 *
 * **스킬에만** 선다 — 스킬로 난 피해 · 회복 · 창 · 방벽 · 불러내기. 기본 공격 · 반격 · 반사 · 물약은 연출이 없다(숫자만 뜬다).
 *   **모양은 코드로 그린 빛과 조각**이다 — 타격은 피해 종류(`ty`)가 모양을 정한다. 기본 켜짐 · `⚙` 판의 설정 탭에서 끈다(ADR-0413 · ADR-0414).
 *   그림 한 장을 띄우는 장치(아래 「그림 한 장」)는 **꺼 둔다**(`ART_ON` · 2026-09-28 · ADR-0412) — 그림은 나중에 **전직 스킬에만** 넣는다.
 * 재생기(battle.js)가 사건을 적용한 **뒤에** 여기를 부른다 — 연출은 이미 실려 온 사건만 읽는다(피해 종류 `ty` · 치명 · 창의 좋음/나쁨 · 방벽 `stat`).
 *   계산 · 난수 없음 — 흩어짐은 사건 번호(`state.idx`)와 유닛 키에서 정해진 값이라 같은 런은 같은 그림이다.
 *   되감기(`state.catchUp`) · 카드가 없는 유닛은 그냥 지나간다.
 *
 * **피격 반응**(옛 1단계 — 모든 타격에 카드 번쩍임 · 흔들림, 빗나감 비킴, 쓰러짐 붉은 막)은 같은 설정 탭에서 따로 켠다
 *   (기본 켜짐 · ADR-0410 · ADR-0413). **공격 시 흔들림**(때린 카드 튀어나감)은 피격 반응에서 떼어 또 따로 켠다(기본 켜짐 · ADR-0468).
 *
 * 셋의 켜고 끄기는 **`⚙` 판의 설정 탭**(app.js · devpalette.js · SCREEN_DESIGN §2-2)이 `setFxOn` 으로 건다 — 이 브라우저에만 남는다(아래 「켜고 끄기」).
 *
 * 모양 · 색 · 길이는 style.css 「관전 연출」 규칙이 든다 — 여기는 **어느 카드에 무엇을 붙이나**와 조각마다 다른 값(방향 · 크기 · 늦춤)만 정한다.
 */

/* ═══ 켜고 끄기 — `⚙` 판의 설정 탭이 건다 (SCREEN_DESIGN §2-2 · ADR-0413 · ADR-0414) ═══ */

/** 기본값 — 이 브라우저에서 한 번도 안 고른 사람이 보는 화면 */
export const SKILL_FX_DEFAULT = true;
export const HIT_FX_DEFAULT = true;
export const LUNGE_FX_DEFAULT = true;
/* 고른 값은 이 브라우저에만 남는다 — localStorage 는 UI 환경설정이라 세이브 어댑터 규칙과 무관(i18n.js 의 언어와 같다) · 접근은 이 파일 안에서만 */
const PREF_KEY = { skill: 'thesevensim.fxSkill', hit: 'thesevensim.fxHit', lunge: 'thesevensim.fxLunge' };
function readPref(k, def) {
    try {
        const v = localStorage.getItem(PREF_KEY[k]);
        return v === 'on' ? true : v === 'off' ? false : def;
    } catch { return def; }   // 프라이빗 모드 등 — 기본값으로
}
const fxOn = { skill: readPref('skill', SKILL_FX_DEFAULT), hit: readPref('hit', HIT_FX_DEFAULT), lunge: readPref('lunge', LUNGE_FX_DEFAULT) };
/** 스킬 이펙트가 켜져 있나 — 사건마다 읽는다(바꿔도 다시 그리지 않는다) */
export const skillFxOn = () => fxOn.skill;
/** 피격 반응이 켜져 있나 — 타격마다 읽는다 */
export const hitFxOn = () => fxOn.hit;
/** 공격 시 흔들림(때린 카드 튀어나감)이 켜져 있나 — 피격 반응과 따로 · 타격마다 읽는다 (ADR-0468) */
export const lungeFxOn = () => fxOn.lunge;
/** 켜고 끈다 — `k` = 'skill' | 'hit' | 'lunge'. 누른 순간부터 다음 사건에 먹는다 · 이미 떠 있는 조각은 제 길이를 마저 돈다 */
export function setFxOn(k, on) {
    if (!(k in fxOn)) return;
    fxOn[k] = !!on;
    try { localStorage.setItem(PREF_KEY[k], on ? 'on' : 'off'); } catch { /* 저장 실패는 무해 — 이번 창에서만 먹는다 */ }
}

/* 몬스터 흔들림 단계 — 피격 반응이 켜져 있을 때 **몬스터 카드만** 따른다(영웅 카드는 2 단계 폭) · 폭은 style.css 가 단계로 든다 (SCREEN_DESIGN §2-2 · ADR-0454) */
export const SHAKE_LEVELS = [0, 1, 2, 3];   // 0 = 흔들림 없이 번쩍임만
export const SHAKE_DEFAULT = 1;
const SHAKE_KEY = 'thesevensim.fxShake';
let shake = (() => {
    try {
        const s = localStorage.getItem(SHAKE_KEY);   // 없으면 null — Number(null) 이 0 이라 먼저 거른다
        const v = s === null ? NaN : Number(s);
        return SHAKE_LEVELS.includes(v) ? v : SHAKE_DEFAULT;
    } catch { return SHAKE_DEFAULT; }
})();
/** 고른 단계 — 타격마다 읽는다 */
export const shakeLevel = () => shake;
/** 단계를 고른다 — 누른 순간부터 다음 타격에 먹는다 */
export function setShakeLevel(n) {
    if (!SHAKE_LEVELS.includes(n)) return;
    shake = n;
    try { localStorage.setItem(SHAKE_KEY, String(n)); } catch { /* 저장 실패는 무해 */ }
}

/* 배속이 오르면 연출이 짧아진다 — ×4 에서 원래 길이면 사건이 겹겹이 쌓인다. 배수는 칸(`.unit-slot`)에 걸어 카드 · 조각이 물려받는다 */
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
    끝나면 클래스를 걷는다 — 카드 안 팝업 · 조각 · 스킬 칸의 애니메이션 끝도 올라오므로 **그 요소 자신의 끝만** 본다 */
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
        el.style.setProperty('--sw', px(sp.offsetWidth));   // 초상 크기 — 초상을 덮는 막(피격 반응의 쓰러짐)이 쓴다
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

/* ═══ 피격 반응 — 설정 탭에서 켜고 끈다 · 기본 켜짐 (ADR-0410 · ADR-0413 · 2026-09-30 기본 On) ═══ */

/** 맞은 카드 — 흔들림 + 초상 번쩍임. 치명은 크게 · 두 번 */
function struck(state, d, crit) {
    if (!hitFxOn() || !live(state, d)) return;
    prep(state, d);
    if (d.side === 'enemy') d.node.dataset.shake = shake;   // 몬스터 카드만 단계를 따른다 (ADR-0454)
    play(d.node, crit ? 'fx-shake-crit' : 'fx-shake', CARD);
    play(d.node.querySelector('.sprite'), crit ? 'fx-flash-crit' : 'fx-flash', FACE);
}
/** 때린 카드 — 상대 진영 쪽으로 튀어나갔다 돌아온다(방향은 CSS 가 진영으로 가른다) · 피격 반응이 아니라 「공격 시 흔들림」을 따른다 (ADR-0468) */
function lunge(state, a) {
    if (!lungeFxOn() || !live(state, a)) return;
    prep(state, a);
    play(a.node.parentElement, 'fx-lunge', SLOT);
}

/* ═══ 스킬 이펙트의 타격 — 피해 종류가 모양을 정한다 ═══ */

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

/* ═══ 그림 한 장 — **꺼 둔다** (ADR-0411 → ADR-0412) ═══ */

/* 스킬 이펙트는 코드 모양이다 — 그림은 나중에 **전직 스킬에만** 넣는다(「전직 스킬만 화려하게」 · 사용자 지시 2026-09-28).
   그때 이 값을 켜고, `stamp` 를 부르는 자리(`impact` · `fxHeal` · `fxBuff`)에 「전직 스킬인가」 조건을 붙인다.
   **꺼진 동안은 아무것도 읽지 않는다**(`fxPreload` 가 그냥 지나간다 — 404 · 메모리 없음) → `art` 가 비어 `stamp` 가 늘 false 다 */
const ART_ON = false;
/* `src/assets/art/fx/<종류>.webp` — 켜면 관전이 설 때 한 번 읽어 둔다(`fxPreload`). 읽힌 종류만 그림이고 나머지는 위의 코드 모양이 선다
   (경로는 연출과 같이 들고 나가도록 여기 둔다 — 다른 그림 경로는 mock.js 가 든다) */
const ART_DIR = './assets/art/fx/';
const ART_KINDS = ['physical', 'fire', 'cold', 'lightning', 'poison', 'blast', 'heal', 'buff', 'debuff', 'barrier'];
const art = new Map();   // 종류 → 읽힌 주소 (읽히기 전 · 파일이 없는 종류는 비어 있다)
let preloaded = false;
/** 관전이 설 때 부른다 — 처음 한 번만 읽는다(그 뒤로는 브라우저가 들고 있다) · 그림이 꺼져 있으면 아무것도 안 한다 */
export function fxPreload() {
    if (preloaded || !ART_ON) return;
    preloaded = true;
    for (const k of ART_KINDS) {
        const im = new Image();
        im.onload = () => art.set(k, im.src);
        im.src = `${ART_DIR}${k}.webp`;
    }
}
/* 움직임은 종류가 정한다 — 좋은 것은 오르고 나쁜 것은 내려앉는다 · 방벽은 부푼다 · 나머지(타격 · 자폭)는 커지며 돌고 터진다 */
const MOTION = { heal: 'rise', buff: 'rise', debuff: 'sink', barrier: 'pulse' };
/** 그 종류의 그림 한 장을 띄운다 — 그림이 없으면 false(부른 쪽이 코드 모양을 띄운다) */
function stamp(L, kind, sd, crit) {
    const src = art.get(kind);
    if (!src) return false;
    const im = spawn(L, `fx-stamp fx-m-${MOTION[kind] ?? 'burst'}${crit ? ' crit' : ''}`, { r: deg(-18 + 36 * rnd(sd, 0)) }, 'img');
    im.alt = '';
    im.src = src;
    return true;
}

/** 스킬 타격의 모양 — 그 피해 종류의 그림, 없으면 코드 모양. 종류가 없는 피해(자폭)는 `blast` */
function impact(state, d, ty, crit) {
    if (!skillFxOn() || !live(state, d)) return;
    prep(state, d);
    const L = layerOf(d);
    if (L.childElementCount > FX_CAP) return;
    const sd = seedOf(state, d);
    if (!stamp(L, ty ?? 'blast', sd, crit)) (SHAPES[ty] ?? ring)(L, sd, crit);
}

/* ═══ 재생기가 부르는 자리 — 사건 하나에 하나 ═══ */

/** 타격(`hit`) — 피격 반응은 모든 타격(켜져 있을 때) · 스킬 이펙트는 스킬(`s`)만 */
export function fxHit(state, a, d, ev) {
    lunge(state, a);
    struck(state, d, ev.crit);
    if (ev.s) impact(state, d, ev.ty, ev.crit);
}
/** 반사(`reflect`) — 비직격 · 스킬이 아니다. 맞은 카드만 흔들린다(친 쪽이 튀어나가지 않는다 — 되받아 친 것이다) */
export function fxReflect(state, d) {
    struck(state, d, false);
}
/** 자폭(`blast`) — 맞은 카드가 흔들리고(피격 반응) · 스킬이라 이펙트가 선다 · 종류가 없는 고정 피해라 충격 고리 */
export function fxBlast(state, d, ev) {
    struck(state, d, false);
    if (ev.s) impact(state, d, null, false);
}
/** 빗나감(`dodge`) — 때린 카드가 튀어나가고(공격 시 흔들림) 맞을 카드가 옆으로 비킨다(피격 반응 · 비키는 쪽은 사건마다 정해진다) */
export function fxMiss(state, a, d) {
    lunge(state, a);
    if (!hitFxOn() || !live(state, d)) return;
    prep(state, d);
    d.node.style.setProperty('--fx-sx', rnd(seedOf(state, d), 0) < 0.5 ? '-1' : '1');
    play(d.node, 'fx-dodge', CARD);
}
/** 쓰러짐(`down`) — 피격 반응 · 초상에 붉은 막이 덮였다 걷히고 카드가 가라앉는다. 흐려짐은 CSS 가 한 박자 늦춘다(늘) */
export function fxDown(state, u) {
    if (!hitFxOn() || !live(state, u)) return;
    prep(state, u);
    play(u.node, 'fx-down', CARD);
    spawn(layerOf(u), 'fx-bleed');
}
/** 회복(`heal`) — 스킬만 · 초록 빛 알갱이가 오른다(물약은 스킬이 아니다) */
export function fxHeal(state, d, ev) {
    if (!ev.s || !skillFxOn() || !live(state, d)) return;
    prep(state, d);
    const L = layerOf(d), sd = seedOf(state, d);
    if (L.childElementCount > FX_CAP || stamp(L, 'heal', sd, false)) return;   // 그림이 있으면 그림 한 장 (ADR-0411)
    for (let i = 0; i < 8; i++) {
        spawn(L, 'fx-mote', { dx: px(-38 + 76 * (i + rnd(sd, i)) / 8), y0: px(26 + 20 * rnd(sd, i + 9)), y1: px(-34 - 28 * rnd(sd, i + 19)), dl: ms(200 * rnd(sd, i + 29)), sz: px(6 + 3 * rnd(sd, i + 39)) });
    }
}
/** 창(`buff`) — 스킬만 · 오오라(`until: null`)는 없다. 좋음/나쁨은 **창 뱃지 칩과 같은 규칙**(상태이상 `k` 이거나 값이 음수면 나쁨) */
export function fxBuff(state, u, ev) {
    if (!ev.s || ev.until === null || !skillFxOn() || !live(state, u)) return;
    prep(state, u);
    const kind = ev.stat === 'barrier_pct' ? 'barrier' : (ev.k || (ev.v ?? 0) < 0) ? 'debuff' : 'buff';
    const L = layerOf(u);
    if (stamp(L, kind, seedOf(state, u), false)) return;   // 그림이 있으면 그림 한 장 — 초상 위 (ADR-0411)
    spawn(L, { barrier: 'fx-shell', debuff: 'fx-card fx-haze', buff: 'fx-card fx-sweep' }[kind]);
}
/** 불러낸 무리(`call`) — 떠오르며 선다. 카드를 새로 지은 뒤에 부른다 */
export function fxAppear(state, u) {
    if (!skillFxOn() || !live(state, u)) return;
    prep(state, u);
    play(u.node.parentElement, 'fx-appear', SLOT);
}
