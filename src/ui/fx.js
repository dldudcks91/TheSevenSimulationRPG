/**
 * fx.js — 관전 연출 = **스킬 이펙트** (2026-09-28 사용자 지시 · SCREEN_DESIGN §4-2 「연출」 · ADR-0409)
 *
 * **스킬에만** 선다 — 스킬로 난 피해 · 회복 · 창 · 방벽 · 불러내기. 반사 · 물약은 연출이 없다(숫자만 뜬다).
 *   전사 기본 스킬은 스킬별 투명 이미지(ADR-0515), 나머지는 코드로 그린 빛과 조각이다. 기본 켜짐 · `⚙` 설정 탭에서 끈다(ADR-0413 · ADR-0414).
 * **기본 공격 이펙트**(기본 공격 · 반격)는 스킬 이펙트와 따로 켠다(기본 켜짐) — **무기와 상관없이** 스킬 물리 베기와 같은 대각선 한 줄이고 색은 무채색이다.
 *   스킬 이펙트(피해 종류 색)와는 **색으로** 갈린다 (2026-10-03 · ADR-0501 · 굵기 ADR-0504 · 모양 ADR-0505).
 *   종류 공통 그림은 **꺼 둔다**(`ART_ON` · ADR-0412). 기본 직업 스킬 이미지는 `SKILL_ART`의 별도 장치로 표시한다.
 * 재생기(battle.js)가 사건을 적용한 **뒤에** 여기를 부른다 — 연출은 이미 실려 온 사건만 읽는다(피해 종류 `ty` · 치명 · 창의 좋음/나쁨 · 방벽 `stat`).
 *   계산 · 난수 없음 — 흩어짐은 사건 번호(`state.idx`)와 유닛 키에서 정해진 값이라 같은 런은 같은 그림이다.
 *   되감기(`state.catchUp`) · 카드가 없는 유닛은 그냥 지나간다.
 *
 * **피격 반응**(옛 1단계 — 모든 타격에 카드 번쩍임 · 흔들림, 빗나감 비킴, 쓰러짐 붉은 막)은 같은 설정 탭에서 따로 켠다
 *   (기본 켜짐 · ADR-0410 · ADR-0413). **공격 시 흔들림**(때린 카드 튀어나감)은 피격 반응에서 떼어 또 따로 켠다(기본 켜짐 · ADR-0468).
 *
 * 넷의 켜고 끄기는 **`⚙` 판의 설정 탭**(app.js · devpalette.js · SCREEN_DESIGN §2-2)이 `setFxOn` 으로 건다 — 이 브라우저에만 남는다(아래 「켜고 끄기」).
 * 스킬 이펙트의 **그림체**(초상 그림체 · 수묵 · 고딕 펜화 · 목탄 · 유화 · 코드 모양 — `skill_art.js:ART_STYLES`)도 같은 탭이 `setFxArtStyle` 로 고른다(ADR-0561 · ADR-0584).
 *
 * 모양 · 색 · 길이는 style.css 「관전 연출」 규칙이 든다 — 여기는 **어느 카드에 무엇을 붙이나**와 조각마다 다른 값(방향 · 크기 · 늦춤)만 정한다.
 * **스킬마다 생김새가 다르다** — 이미지 표는 skill_art.js, 코드 조각(`PIECES`)의 표는 skill_looks.js다(ADR-0511 · ADR-0515).
 */
import { SKILL_LOOKS } from './skill_looks.js';
import { SKILL_ART, ART_STYLES, ART_DEFAULT, artFile } from './skill_art.js';

/* ═══ 켜고 끄기 — `⚙` 판의 설정 탭이 건다 (SCREEN_DESIGN §2-2 · ADR-0413 · ADR-0414) ═══ */

/** 기본값 — 이 브라우저에서 한 번도 안 고른 사람이 보는 화면 */
export const SKILL_FX_DEFAULT = true;
export const BASIC_FX_DEFAULT = true;
export const HIT_FX_DEFAULT = true;
export const LUNGE_FX_DEFAULT = true;
/* 고른 값은 이 브라우저에만 남는다 — localStorage 는 UI 환경설정이라 세이브 어댑터 규칙과 무관(i18n.js 의 언어와 같다) · 접근은 이 파일 안에서만 */
const PREF_KEY = { skill: 'thesevensim.fxSkill', basic: 'thesevensim.fxBasic', hit: 'thesevensim.fxHit', lunge: 'thesevensim.fxLunge' };
function readPref(k, def) {
    try {
        const v = localStorage.getItem(PREF_KEY[k]);
        return v === 'on' ? true : v === 'off' ? false : def;
    } catch { return def; }   // 프라이빗 모드 등 — 기본값으로
}
const fxOn = { skill: readPref('skill', SKILL_FX_DEFAULT), basic: readPref('basic', BASIC_FX_DEFAULT), hit: readPref('hit', HIT_FX_DEFAULT), lunge: readPref('lunge', LUNGE_FX_DEFAULT) };
/** 스킬 이펙트가 켜져 있나 — 사건마다 읽는다(바꿔도 다시 그리지 않는다) */
export const skillFxOn = () => fxOn.skill;
/** 기본 공격 이펙트(무기 모양)가 켜져 있나 — 스킬 이펙트와 따로 · 타격마다 읽는다 (ADR-0501) */
export const basicFxOn = () => fxOn.basic;
/** 피격 반응이 켜져 있나 — 타격마다 읽는다 */
export const hitFxOn = () => fxOn.hit;
/** 공격 시 흔들림(때린 카드 튀어나감)이 켜져 있나 — 피격 반응과 따로 · 타격마다 읽는다 (ADR-0468) */
export const lungeFxOn = () => fxOn.lunge;
/** 켜고 끈다 — `k` = 'skill' | 'basic' | 'hit' | 'lunge'. 누른 순간부터 다음 사건에 먹는다 · 이미 떠 있는 조각은 제 길이를 마저 돈다 */
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

/* 이펙트 그림체 — 관전의 스킬 이펙트를 어느 그림체 파일로 그리나(`skill_art.js:ART_STYLES` · SCREEN_DESIGN §2-2 · ADR-0561) */
const ART_KEY = 'thesevensim.fxArt';
let artPref = (() => {
    try {
        const v = localStorage.getItem(ART_KEY);
        return ART_STYLES.includes(v) ? v : ART_DEFAULT;
    } catch { return ART_DEFAULT; }
})();
/** 고른 그림체 — 스킬 그림을 띄울 때마다 읽는다 */
export const fxArtStyle = () => artPref;
/** 그림체를 고른다 — 누른 순간부터 다음 사건에 먹는다(그 그림체 그림을 바로 읽기 시작한다 · 덜 읽힌 칸은 그동안 코드 조합으로 선다) */
export function setFxArtStyle(s) {
    if (!ART_STYLES.includes(s)) return;
    artPref = artStyle = s;
    fxPreload(s);
    try { localStorage.setItem(ART_KEY, s); } catch { /* 저장 실패는 무해 */ }
}

/* 스킬 이펙트 투명도(%) — 스킬 조각(그림 · 코드 조각 · 카드 훑음)만 옅게 한다 · 기본 공격 · 피격 반응은 그대로 · 도감 미리보기에도 먹는다 (SCREEN_DESIGN §2-2 · ADR-0562) */
export const FX_ALPHA_STEPS = [0, 25, 50, 75];   // 0 = 그대로 · 100 은 끈 것과 같아 없다
export const FX_ALPHA_DEFAULT = 0;
const ALPHA_KEY = 'thesevensim.fxAlpha';
let fxAlpha = (() => {
    try {
        const s = localStorage.getItem(ALPHA_KEY);   // 없으면 null — Number(null) 이 0 이라 먼저 거른다
        const v = s === null ? NaN : Number(s);
        return FX_ALPHA_STEPS.includes(v) ? v : FX_ALPHA_DEFAULT;
    } catch { return FX_ALPHA_DEFAULT; }
})();
/** 고른 투명도 — 스킬 조각을 붙일 때마다 읽는다 */
export const fxTransparency = () => fxAlpha;
/** 투명도를 고른다 — 누른 순간부터 다음 사건에 먹는다 · 이미 떠 있는 조각은 제 진하기로 마저 돈다 */
export function setFxTransparency(n) {
    if (!FX_ALPHA_STEPS.includes(n)) return;
    fxAlpha = n;
    try { localStorage.setItem(ALPHA_KEY, String(n)); } catch { /* 저장 실패는 무해 */ }
}

/* 배속이 오르면 연출이 짧아진다 — ×4 에서 원래 길이면 사건이 겹겹이 쌓인다. 배수는 칸(`.unit-slot`)에 걸어 카드 · 조각이 물려받는다.
   관전의 공격자 포커스(battle.js:waitFocus · 개발용 비교)도 세우는 길이에 같은 배수를 쓴다 */
export const SPEED_K = { 1: 1, 2: 0.75, 4: 0.55, 16: 0.3 };
/* 한 카드에 조각이 이만큼 떠 있으면 새 조각을 안 띄운다 — 광역 다단히트가 ×4 로 몰려도 화면이 조각으로 덮이지 않게 */
const FX_CAP = 60;
/* 되돌려 다시 거는 클래스 무리 — 같은 요소의 연출은 하나씩만 돈다 */
const CARD = ['fx-shake', 'fx-shake-crit', 'fx-dodge', 'fx-down'];
const FACE = ['fx-flash', 'fx-flash-crit'];
const SLOT = ['fx-lunge', 'fx-appear', 'fp-quake'];

const live = (state, u) => !state.catchUp && !!u?.node?.isConnected;
/** 스킬 이펙트 · 기본 공격 이펙트가 서나 — 도감의 이펙트 탭(`state.preview`)은 설정과 상관없이 선다 (ADR-0513) */
const fxShown = (state, k) => !!state.preview || fxOn[k];
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

/** 스킬이 그리는 동안 이 층에 붙은 조각에 표시(`.fx-sk`)와 진하기(`--fx-skill-a`)를 단다 — 투명도는 표시 단 조각에만 먹는다(style.css · ADR-0562).
 *  조각은 늘 끝에 붙고(`spawn`) 그리는 동안에는 걷히지 않는다(걷힘은 애니메이션 끝) — 그래서 그리기 전 개수 뒤가 전부 이 스킬의 조각이다 */
function asSkill(L, draw) {
    const n0 = L.childElementCount;
    draw();
    const a = String(1 - fxAlpha / 100);
    for (let i = n0; i < L.children.length; i++) {
        L.children[i].classList.add('fx-sk');
        L.children[i].style.setProperty('--fx-skill-a', a);
    }
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
    // 공격자 포커스(개발용 비교)가 이미 내보낸 카드 — 튀김 키프레임이 돌면 나간 자리에서 제자리로 끌려왔다 다시 나간다 (battle.js:openFocus)
    if (a.node.parentElement?.classList.contains('fx-advance')) return;
    prep(state, a);
    play(a.node.parentElement, 'fx-lunge', SLOT);
}

/* ═══ 스킬 이펙트의 타격 — 피해 종류가 모양을 정한다 ═══ */

/* 스킬 타격은 모두 맞은 자리에서 **피해 종류 색의 섬광 원판**이 먼저 터진다(`fx-flare <종류>` — 가장자리를 끊은 원판 · 번짐 빛이 아니다).
   조각의 수 · 크기 · 퍼지는 거리는 「조금 더 강력하게」로 한 단 올렸다 (2026-10-04 사용자 지시 · ADR-0506) */
const SHAPES = {
    /** 물리 — 굵은 베기 한 줄 + 뒤따르는 가는 줄(평타의 한 줄과 갈린다) · 치명은 엇갈린 굵은 줄이 하나 더 */
    physical(L, sd, crit) {
        const r = -28 - 24 * rnd(sd, 0);
        spawn(L, 'fx-flare physical');
        spawn(L, 'fx-slash', { r: deg(r) });
        spawn(L, 'fx-slash echo', { r: deg(r), dl: '60ms' });
        if (crit) spawn(L, 'fx-slash', { r: deg(r + 64), dl: '70ms' });
    },
    /** 화염 — 한가운데가 확 터지고 불똥이 위로 치우쳐 흩어진다 */
    fire(L, sd, crit) {
        spawn(L, 'fx-flare fire');
        const n = crit ? 16 : 12;
        for (let i = 0; i < n; i++) {
            const [x, y] = ray(sd, i, n, 34, 72);
            spawn(L, 'fx-ember', { dx: px(x), dy: px(y * 0.75 - 20), sz: px(9 + 6 * rnd(sd, i + 60)) });
        }
    },
    /** 냉기 — 한가운데가 터지고 날아가는 쪽으로 누운 얼음 조각이 흩어진다 */
    cold(L, sd, crit) {
        spawn(L, 'fx-flare cold');
        const n = crit ? 14 : 11;
        for (let i = 0; i < n; i++) {
            const [x, y, a] = ray(sd, i, n, 36, 72);
            spawn(L, 'fx-shard', { dx: px(x), dy: px(y), r: deg(a * 180 / Math.PI + 90), sc: String((0.8 + 0.5 * rnd(sd, i + 70)).toFixed(2)) });
        }
    },
    /** 전기 — 위에서 꺾여 내려와 초상 한가운데에 닿는 갈래 셋 · 닿는 자리가 터진다 · 치명은 넷 */
    lightning(L, sd, crit) {
        spawn(L, 'fx-flare lightning');
        for (let b = 0; b < (crit ? 4 : 3); b++) {
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
        const n = crit ? 13 : 10;
        for (let i = 0; i < n; i++) {
            spawn(L, 'fx-drop', { dx: px(-64 + 128 * (i + rnd(sd, i)) / n), dy: px(-30 - 30 * rnd(sd, i + 20)), sz: px(10 + 5 * rnd(sd, i + 50)) });
        }
    },
};
/** 종류가 없는 피해(자폭) — 한가운데가 터지고 충격 고리가 퍼진다 */
const ring = L => { spawn(L, 'fx-flare blast'); spawn(L, 'fx-ring'); };

/* ═══ 스킬마다 다른 생김새 — 조각 + 스킬 표 (2026-10-04 사용자 지시 「모든 스킬이 스킬별로 생김새가 달라야」 · ADR-0511) ═══
   스킬 하나의 이펙트 = 조각 몇 개의 조합이다(표: skill_looks.js:SKILL_LOOKS — 타격 · 창 · 회복 · 불러내기마다).
   조각의 모양 · 길이는 style.css 「조각」 규칙, 여기는 조각마다 다른 값(각도 · 개수 · 자리 · 늦춤 · 색)만 정한다.
   표에 없는 스킬(새 스킬)은 피해 종류 모양(`SHAPES`) · 일반 창 · 일반 회복으로 선다 */

/** 색 이름 → [바탕, 밝은 속] — 값은 style.css :root 의 `--fx-*` 가 SSOT (채도를 낮춘 색 · ADR-0406) */
const PALETTE = {
    physical: ['--fx-physical', '--fx-physical-core'], fire: ['--fx-fire', '--fx-fire-core'], cold: ['--fx-cold', '--fx-cold-core'],
    lightning: ['--fx-lightning', '--fx-lightning-core'], poison: ['--fx-poison', '--fx-poison-core'], heal: ['--fx-heal', '--fx-heal-core'],
    holy: ['--fx-holy', '--fx-holy-core'], blood: ['--fx-blood', '--fx-blood-core'], earth: ['--fx-earth', '--fx-earth-core'],
    shadow: ['--fx-shadow', '--fx-shadow-core'], steel: ['--fx-steel', '--fx-steel-core'], wind: ['--fx-wind', '--fx-wind-core'],
    tiger: ['--fx-tiger', '--fx-tiger-core'], gold: ['--fx-gold', '--fx-gold-core'],
};
const ink = c => { const [m, k] = PALETTE[c] ?? PALETTE.physical; return { c: `var(${m})`, cc: `var(${k})` }; };
/** 조각 x 의 i 번째 흩어짐 — 조각마다 갈래(`j`)가 달라 한 사건의 조각끼리 같은 값을 안 쓴다 */
const R = (x, i) => rnd(x.sd, x.j * 97 + i);
/** 조각의 각(도) — 'in' 이면 때린 쪽에서 날아드는 방향(맞은 쪽의 반대 진영에서) · 아니면 표의 값 ± jit/2 */
const dirOf = (o, x) => o.a === 'in'
    ? (x.d.side === 'enemy' ? -90 : 90) + (R(x, 90) - 0.5) * 16
    : (o.a ?? -40) + (R(x, 91) - 0.5) * (o.jit ?? 10);
/** 조각 요소 하나 — 공통 변수(색 `--c` · `--cc` · 길이 `--t` · 늦춤 `--dl`)를 달아 띄운다 · halo = 흰 심 + 둘레 띠 */
function piece(L, name, o, x, vars = {}, tag = 'i') {
    return spawn(L, `fp ${name}${x.crit ? ' crit' : ''}${o.halo ? ' halo' : ''}`, { ...ink(o.c), t: ms(o.t ?? 320), dl: ms(o.dl ?? 0), ...vars }, tag);
}
/** 꺾인 갈래의 점들 — (x0, y0)에서 (x1, y1)까지 n 마디 · 가운데 마디가 옆으로 amp 만큼 흔들린다 */
function zigzag(x, salt, x0, y0, x1, y1, n, amp) {
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, pts = [];
    for (let k = 0; k <= n; k++) {
        const w = k === 0 || k === n ? 0 : (R(x, salt + k) - 0.5) * 2 * amp;
        pts.push(`${(x0 + dx * k / n + nx * w).toFixed(1)},${(y0 + dy * k / n + ny * w).toFixed(1)}`);
    }
    return pts.join(' ');
}
/* 그림 틀(-60 -70 · 120 × 140)의 원점이 초상 한가운데다 — `.fp-bolt` · `.fp-crack` 의 크기와 같다 */
const svgLine = p => `<svg viewBox="-60 -70 120 140"><polyline points="${p}"/><polyline class="core" points="${p}"/></svg>`;

/* 조각 — (L, o, x) · o = 표의 값 · x = { sd 씨앗 · j 조각 번호 · crit · d 그 카드의 유닛 }.
   값의 공통 이름: c 색 · dl 늦춤(ms) · t 길이(ms) · a 각(도 · 'in') · jit 각 흔들림 · n 개수 · s 크기 · w 굵기 */
const PIECES = {
    /** 곧은 줄 — 베기 · 나란한 줄(n · gap 사이 · step 늦춤) · 바늘(a 'in' — 앞 끝이 한가운데를 조금 지난다) · halo 흰 심 + 둘레 띠 */
    streak(L, o, x) {
        const n = o.n ?? 1, many = n > 1, a = dirOf(o, x), len = o.len ?? 150;
        for (let i = 0; i < n; i++) {
            const l = len * (many ? 0.85 + 0.3 * R(x, i + 30) : 1);
            piece(L, 'fp-streak', o, x, {
                a: deg(a + (many ? (R(x, i + 20) - 0.5) * 3 : 0)), len: px(l), w: px(o.w ?? 7),
                off: px((i - (n - 1) / 2) * (o.gap ?? 16) + (many ? (R(x, i) - 0.5) * 5 : 0)),
                sh: px(o.a === 'in' ? -l / 2 + 12 : (o.sh ?? 0) + (many ? (R(x, i + 10) - 0.5) * 28 : 0)),
                dl: ms((o.dl ?? 0) + i * (o.step ?? 30)),
            });
        }
    },
    /** X — 엇갈린 두 줄(둘째는 step 늦게 · spread 만큼 돈다) */
    cross(L, o, x) {
        const a = dirOf(o, x);
        PIECES.streak(L, { ...o, a, jit: 0 }, x);
        PIECES.streak(L, { ...o, a: a + (o.spread ?? 90), jit: 0, dl: (o.dl ?? 0) + (o.step ?? 90) }, { ...x, j: x.j + 50 });
    },
    /** 백호 줄 — 흰 심 + 둘레 띠의 긴 줄 셋(백호참 · ADR-0509) */
    claws(L, o, x) { PIECES.streak(L, { a: 42, jit: 8, n: 3, len: 270, w: 13, gap: 18, step: 30, halo: true, t: 400, ...o }, x); },
    /** 휜 칼날 — 납작한 타원의 윗변이 그어진다 · s 폭 · h 높이 · n 번(turn 만큼 돌며 · step 늦춤) */
    arc(L, o, x) {
        for (let i = 0; i < (o.n ?? 1); i++)
            piece(L, 'fp-arc', o, x, { a: deg(dirOf(o, x) + i * (o.turn ?? 0)), s: px(o.s ?? 116), h: px(o.h ?? 50), w: px(o.w ?? 3), dl: ms((o.dl ?? 0) + i * (o.step ?? 60)) });
    },
    /** 섬광 원판 */
    flare(L, o, x) { piece(L, 'fp-flare', o, x, { s: px(o.s ?? 80) }); },
    /** 고리 — 퍼진다(r0 < r1) · 조여든다(r0 > r1) · fy 납작함(땅 고리) · oy 아래로 · n 겹(step 늦춤) */
    ring(L, o, x) {
        for (let i = 0; i < (o.n ?? 1); i++)
            piece(L, 'fp-ring', o, x, { s: px(o.s ?? 90), w: px(o.w ?? 4), r0: String(o.r0 ?? 0.3), r1: String(o.r1 ?? 1.3), fy: String(o.fy ?? 1), oy: px(o.oy ?? 0), dl: ms((o.dl ?? 0) + i * (o.step ?? 90)) });
    },
    /** 튐 — 한가운데에서 사방으로 · up 만큼 위로 치우친다 · shape dot | shard | drop | dash */
    spray(L, o, x) {
        const n = (o.n ?? 10) + (x.crit ? 3 : 0), r0 = o.r0 ?? 34, r1 = o.r1 ?? 70, sh = o.shape ?? 'dot';
        for (let i = 0; i < n; i++) {
            const ang = (i + R(x, i) * 0.6) / n * Math.PI * 2, r = r0 + (r1 - r0) * R(x, i + 40);
            piece(L, `fp-dot ${sh}`, o, x, {
                x0: '0px', y0: '0px', x1: px(Math.cos(ang) * r), y1: px(Math.sin(ang) * r - (o.up ?? 0)),
                a: deg(ang * 180 / Math.PI + (sh === 'dash' ? 0 : 90)), sz: px((o.sz ?? 8) * (0.8 + 0.5 * R(x, i + 60))), t: ms(o.t ?? 460),
            });
        }
    },
    /** 오름 — 초상 아래쪽에서 위로(회복 알갱이 · 불티 · 빛 조각) */
    rise(L, o, x) {
        const n = o.n ?? 8;
        for (let i = 0; i < n; i++) {
            const dx = -44 + 88 * (i + R(x, i)) / n;
            piece(L, `fp-dot ${o.shape ?? 'dot'}`, o, x, {
                x0: px(dx), y0: px(26 + 20 * R(x, i + 9)), x1: px(dx + (R(x, i + 49) - 0.5) * 10), y1: px(-38 - 30 * R(x, i + 19)),
                a: '0deg', sz: px((o.sz ?? 7) * (0.8 + 0.5 * R(x, i + 39))), t: ms(o.t ?? 720), dl: ms((o.dl ?? 0) + 220 * R(x, i + 29)),
            });
        }
    },
    /** 비 — 오른쪽 위에서 비스듬히(fall 도) far 남짓 떨어져 한가운데 둘레에 닿는다(화살 비 · 눈보라) · shape 'big' = 큰 덩어리 하나(운석) */
    rain(L, o, x) {
        const big = o.shape === 'big', n = big ? 1 : (o.n ?? 6), fall = o.fall ?? 62, fr = fall * Math.PI / 180;
        for (let i = 0; i < n; i++) {
            const tx = big ? 0 : -46 + 92 * (i + R(x, i)) / n, ty = big ? 0 : -10 + 40 * R(x, i + 5), dist = big ? (o.far ?? 140) : (o.far ?? 90) * (1 + 0.33 * R(x, i + 15));
            piece(L, `fp-dot ${big ? 'dot' : (o.shape ?? 'dash')}`, o, x, {
                x0: px(tx + Math.cos(fr) * dist), y0: px(ty - Math.sin(fr) * dist), x1: px(tx), y1: px(ty),
                a: deg(180 - fall), sz: px(big ? 30 : (o.sz ?? 8)), t: ms(big ? 220 : (o.t ?? 320)), dl: ms((o.dl ?? 0) + (big ? 0 : 260 * R(x, i + 25))),
            });
        }
    },
    /** 번개 — 위에서(h 높이) 꺾여 내려와 한가운데에 닿는 갈래 n · from 'side' 는 양옆에서 · short 는 한가운데 둘레의 짧은 불꽃 갈래 */
    bolt(L, o, x) {
        const n = o.n ?? 2;
        for (let b = 0; b < n; b++) {
            let p;
            if (o.short) {
                const a = b / n * Math.PI * 2 + R(x, b), r = 24 + 12 * R(x, b + 5);
                p = zigzag(x, b * 10, Math.cos(a) * r, Math.sin(a) * r, Math.cos(a) * (r + 26), Math.sin(a) * (r + 26), 3, 5);
            } else if (o.from === 'side') p = zigzag(x, b * 10, (b % 2 ? 1 : -1) * 60, -24 + 34 * R(x, b + 3), 0, 0, 6, 9);
            else p = zigzag(x, b * 10, -26 + 52 * R(x, b), -(o.h ?? 68), 0, 0, 6, 12);
            piece(L, 'fp-bolt', o, x, { dl: ms((o.dl ?? 0) + b * 50) }, 'span').innerHTML = svgLine(p);
        }
    },
    /** 갈라짐 — 한가운데에서 아래로(h 깊이) 들쭉날쭉 벌어지는 금 둘 */
    crack(L, o, x) {
        for (let b = 0; b < 2; b++) {
            const p = zigzag(x, b * 20, (R(x, b) - 0.5) * 12, -24, (b ? 1 : -1) * (14 + 20 * R(x, b + 3)), o.h ?? 64, 7, 8);
            piece(L, 'fp-crack', o, x, { dl: ms((o.dl ?? 0) + b * 40), t: ms(o.t ?? 520) }, 'span').innerHTML = svgLine(p);
        }
    },
    /** 빛기둥 — 위에서 내리꽂힌다 · h 높이(아랫변은 늘 한가운데 30px 아래) */
    pillar(L, o, x) { piece(L, 'fp-pillar', o, x, { w: px(o.w ?? 36), ph: px(o.h ?? 150), t: ms(o.t ?? 440) }); },
    /** 땅 가시 — 초상 아랫변에서 솟는다 · n 개 · h 높이 */
    spikes(L, o, x) {
        const n = o.n ?? 5;
        for (let i = 0; i < n; i++)
            piece(L, 'fp-spike', o, x, { sx: px(-48 + 96 * (i + 0.5 + (R(x, i) - 0.5) * 0.6) / n), sw: px(12 + 6 * R(x, i + 10)), sh: px((o.h ?? 40) * (0.7 + 0.5 * R(x, i + 20))), dl: ms((o.dl ?? 0) + 50 * R(x, i + 30)), t: ms(o.t ?? 480) });
    },
    /** 문양 — 점선 고리가 돌며 조여든다(표식 · 저주 · 집중) */
    sigil(L, o, x) { piece(L, 'fp-sigil', o, x, { s: px(o.s ?? 90), t: ms(o.t ?? 580) }); },
    /** 꺾쇠 — 위로 오르는 ^ n 개(가속 · 강화) */
    chevron(L, o, x) {
        const n = o.n ?? 3;
        for (let i = 0; i < n; i++) piece(L, 'fp-chev', o, x, { sx: px(n === 1 ? 0 : -30 + 60 * i / (n - 1)), dl: ms((o.dl ?? 0) + i * 70), t: ms(o.t ?? 540) });
    },
    /** 회전 칼날 — 고리의 위아래 칼날이 돌며 커진다 */
    spin(L, o, x) { piece(L, 'fp-spin', o, x, { s: px(o.s ?? 100), t: ms(o.t ?? 440) }); },
    /** × 표 — 자리는 사건마다 조금 어긋난다 */
    xmark(L, o, x) { piece(L, 'fp-x', o, x, { s: px(o.s ?? 28), w: px(o.w ?? 5), ox: px((R(x, 0) - 0.5) * 16), oy: px((R(x, 1) - 0.5) * 16), t: ms(o.t ?? 440) }); },
    /** 카드 — 빛 띠가 아래에서 위로 훑는다 */
    sweep(L, o, x) { piece(L, 'fx-card fp-sweep', o, x, { t: ms(o.t ?? 560) }); },
    /** 카드 — 어두운 기운이 위에서 내려앉는다 */
    haze(L, o, x) { piece(L, 'fx-card fp-haze', o, x, { t: ms(o.t ?? 640) }); },
    /** 카드 — 둘레에 막이 한 번 퍼진다 */
    shell(L, o, x) { piece(L, 'fp-shell', o, x, { t: ms(o.t ?? 540) }); },
    /** 카드 — 한 번 번쩍인다 */
    flash(L, o, x) { piece(L, 'fx-card fp-flash', o, x, { t: ms(o.t ?? 360) }); },
    /** 맞은 카드가 쿵 내려앉는다 — 공격자 포커스(개발용)가 내보낸 칸은 건너뛴다(`lunge` 와 같은 이유) · `o.dl` = 늦춤(배속을 탄다) */
    quake(L, o, x) {
        const slot = x.d.node.parentElement;
        if (!slot || slot.classList.contains('fx-advance')) return;
        slot.style.setProperty('--qdl', ms(o.dl ?? 0));
        play(slot, 'fp-quake', SLOT);
    },
};
/** 표의 조각 목록 하나를 그 카드에 띄운다 */
const playLook = (L, list, x) => list.forEach(([name, o = {}], j) => PIECES[name]?.(L, o, { ...x, j }));

/* ═══ 기본 공격 이펙트 — 무기와 상관없이 대각선 베기 한 줄 · 무채색 (2026-10-04 · ADR-0505) ═══ */

/** 기본 공격 타격 — 맞은 카드 초상 위에 **스킬 물리 베기와 같은 대각선 한 줄**이 그어진다(각도도 같은 범위). 색만 무채색이다 · 치명은 한 단 굵다(CSS `--th`) */
function swing(state, d, crit) {
    if (!fxShown(state, 'basic') || !live(state, d)) return;
    prep(state, d);
    const L = layerOf(d);
    if (L.childElementCount > FX_CAP) return;
    spawn(L, `fx-b fx-b-slash${crit ? ' crit' : ''}`, { r: deg(-28 - 24 * rnd(seedOf(state, d), 0)) });
}

/* ═══ 종류 공통 그림 — 꺼 둔다(ADR-0412) · 기본 직업 스킬 그림은 별도(ADR-0515 · ADR-0520) ═══ */

/* 종류 공통 그림은 꺼 둔다(ADR-0412). 기본 직업 스킬 그림(ADR-0515 · ADR-0520)은 이 값과 별개다.
   꺼진 동안 ART_KINDS 그림은 읽지 않고 `art`가 비어 종류 공통 `stamp`가 false다. */
const ART_ON = false;
/* `src/assets/art/fx/<종류>.webp` — 켜면 관전이 설 때 한 번 읽어 둔다(`fxPreload`). 읽힌 종류만 그림이고 나머지는 위의 코드 모양이 선다
   (경로는 연출과 같이 들고 나가도록 여기 둔다 — 다른 그림 경로는 mock.js 가 든다) */
const ART_DIR = './assets/art/fx/';
const ART_KINDS = ['physical', 'fire', 'cold', 'lightning', 'poison', 'blast', 'heal', 'buff', 'debuff', 'barrier'];
const art = new Map();   // 종류 → 읽힌 주소 (읽히기 전 · 파일이 없는 종류는 비어 있다)
let preloaded = false;
const skillArt = new Map();   // 스킬 그림 파일 → 준비된 주소 · 실패한 그림은 코드 조합으로 표시한다
const skillReady = new Map();   // 그림체 → 그 그림체 그림을 다 읽었나(Promise)
/* 지금 그림을 띄우는 그림체 — 관전은 설정이 고른 것(`artPref`) · 도감 이펙트 세그먼트의 미리보기(`fxPreview`)가 부르는 동안만 그 탭의 것 (ADR-0559 · ADR-0561) */
let artStyle = artPref;
/** 그 그림체로 바꾼 그림 정의 — 이어 서는 그림(`then`)도 같이. 코드 모양이면 파일이 없다(null) */
const styled = (def, style) => def && { ...def, file: artFile(def.file, style), ...(def.then && { then: styled(def.then, style) }) };
/** 관전 · 도감 이펙트 세그먼트가 설 때 부른다 — 스킬 그림은 그림체마다 한 번만 읽는다(관전은 설정이 고른 그림체). 종류 공통 그림은 ART_ON을 따른다 */
export function fxPreload(style = artPref) {
    if (!skillReady.has(style)) {
        const files = new Set(Object.values(SKILL_ART).flatMap(events => Object.values(events).flatMap(x => {
            const d = styled(x, style);
            return [d.file, d.then?.file];
        })).filter(Boolean));
        skillReady.set(style, Promise.all([...files].map(file => new Promise(resolve => {
            const im = new Image();
            im.onload = () => { skillArt.set(file, im.src); resolve(); };
            im.onerror = () => resolve();   // 읽기 실패가 관전 부팅을 막지 않는다 — 그 칸은 코드 조합으로 선다
            im.src = `${ART_DIR}skills/${file}.webp`;
        }))));
    }
    if (!preloaded && ART_ON) {
        preloaded = true;
        for (const k of ART_KINDS) {
            const im = new Image();
            im.onload = () => art.set(k, im.src);
            im.src = `${ART_DIR}${k}.webp`;
        }
    }
    return skillReady.get(style);
}
/** 준비된 스킬 그림을 초상 위에 띄운다 — 없으면 기존 조각을 부르는 쪽으로 돌아간다(코드 모양 그림체도 이쪽이다) */
function skillStamp(L, s, kind, x) {
    const def = styled(SKILL_ART[s]?.[kind], artStyle);
    if (!def?.file || !skillArt.has(def.file)) return false;
    // 이어 서는 그림(`then`)은 앞 그림이 끝나는 때에 선다 — 아이스 블라스트의 떨어짐 → 깨짐 (ADR-0541)
    for (let d = def, dl = 0; d && skillArt.has(d.file); dl += d.duration, d = d.then) stampArt(L, s, d, x.crit, dl);
    // 강화 · 회복 그림엔 코드의 훑어 오름(그 스킬 색의 띠가 카드를 아래에서 위로)이 늘 같이 선다 — 색은 그 스킬 코드 조합의 훑음 색 · 없으면 첫 조각 색 (ADR-0551)
    if (kind === 'buff' || kind === 'heal') {
        const look = SKILL_LOOKS[s]?.[kind] ?? SKILL_LOOKS[s]?.buff ?? [];
        PIECES.sweep(L, { c: (look.find(([name]) => name === 'sweep') ?? look[0])?.[1]?.c ?? 'gold' }, x);
    }
    // 두 장이면 흔들림은 둘째 그림(터짐)이 설 때 — 메테오 · 토르의 분노 (ADR-0550)
    if (def.quake) PIECES.quake(L, { dl: def.then && skillArt.has(def.then.file) ? def.duration : 0 }, x);
    return true;
}
/** 그림 한 장 — `ay` 는 그림에서 초상 가운데에 닿는 높이(0 = 위 끝 · 1 = 아래 끝 · 없으면 가운데) · `dl` 은 늦춤(배속을 탄다) */
function stampArt(L, s, def, crit, dl) {
    const size = def.fit === 'portrait' ? parseFloat(L.style.getPropertyValue('--sw')) || def.size : def.size;
    const im = spawn(L, `fx-skill-stamp fx-skill-${def.motion}${crit ? ' crit' : ''}`, {
        sz: px(size), t: ms(def.duration),
        ...(def.ay != null && { oy: px((.5 - def.ay) * size) }),
        ...(dl && { dl: ms(dl) }),
    }, 'img');
    im.alt = '';
    im.draggable = false;
    im.dataset.skill = s;
    im.src = skillArt.get(def.file);
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

/** 스킬 타격 — 준비된 스킬 이미지 → 스킬 코드 조합 → 피해 종류 모양. 종류 없는 피해(자폭)는 `blast` */
function impact(state, d, ty, crit, s) {
    if (!fxShown(state, 'skill') || !live(state, d)) return;
    prep(state, d);
    const L = layerOf(d);
    if (L.childElementCount > FX_CAP) return;
    const sd = seedOf(state, d), look = SKILL_LOOKS[s]?.hit;
    asSkill(L, () => {
        if (skillStamp(L, s, 'hit', { sd, crit, d })) return;
        if (look) return playLook(L, look, { sd, crit, d });
        if (!stamp(L, ty ?? 'blast', sd, crit)) (SHAPES[ty] ?? ring)(L, sd, crit);
    });
}

/* ═══ 재생기가 부르는 자리 — 사건 하나에 하나 ═══ */

/** 타격(`hit`) — 피격 반응은 모든 타격(켜져 있을 때) · 스킬 이펙트는 스킬(`s`)만 — 그 스킬의 생김새(ADR-0511) · 그 밖(기본 공격 · 반격)은 대각선 베기 한 줄(ADR-0505).
 *  afterSkill = 스킬을 쓴 차례에 이어진 기본 공격이다(재생기가 같은 시각을 본다) — 베기를 안 띄운다(스킬 이펙트와 겹치지 않게 · ADR-0564) */
export function fxHit(state, a, d, ev, afterSkill = false) {
    lunge(state, a);
    struck(state, d, ev.crit);
    if (ev.s) impact(state, d, ev.ty, ev.crit, ev.s);
    else if (!afterSkill) swing(state, d, ev.crit);
}
/** 반사(`reflect`) — 비직격 · 스킬이 아니다. 맞은 카드만 흔들린다(친 쪽이 튀어나가지 않는다 — 되받아 친 것이다) */
export function fxReflect(state, d) {
    struck(state, d, false);
}
/** 자폭(`blast`) — 맞은 카드가 흔들리고(피격 반응) · 스킬이라 이펙트가 선다 · 종류가 없는 고정 피해라 충격 고리 */
export function fxBlast(state, d, ev) {
    struck(state, d, false);
    if (ev.s) impact(state, d, null, false, ev.s);
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
/** 회복(`heal`) — 스킬만 · 그 스킬의 생김새(`SKILL_LOOKS[s].heal`), 없으면 초록 빛 알갱이가 오른다(물약은 스킬이 아니다) */
export function fxHeal(state, d, ev) {
    if (!ev.s || !fxShown(state, 'skill') || !live(state, d)) return;
    prep(state, d);
    const L = layerOf(d), sd = seedOf(state, d), look = SKILL_LOOKS[ev.s]?.heal;
    if (L.childElementCount > FX_CAP) return;
    asSkill(L, () => {
        if (skillStamp(L, ev.s, 'heal', { sd, crit: false, d })) return;
        if (look) return playLook(L, look, { sd, crit: false, d });
        if (stamp(L, 'heal', sd, false)) return;   // 그림이 있으면 그림 한 장 (ADR-0411)
        for (let i = 0; i < 12; i++) {   // 조금 더 강력하게 — 8 → 12 · 크기 한 단 (ADR-0506)
            spawn(L, 'fx-mote', { dx: px(-44 + 88 * (i + rnd(sd, i)) / 12), y0: px(26 + 20 * rnd(sd, i + 9)), y1: px(-38 - 30 * rnd(sd, i + 19)), dl: ms(220 * rnd(sd, i + 29)), sz: px(7 + 4 * rnd(sd, i + 39)) });
        }
    });
}
/** 창(`buff`) — 스킬만 · 오오라(`until: null`)는 없다. 좋음/나쁨은 **창 뱃지 칩과 같은 규칙**(상태이상 `k` 이거나 값이 음수면 나쁨).
 *  결투의 지목(`stat: duel`)은 값이 양수여도 적에게 건 표식이다. 나쁜 창은 `bad`(없으면 `buff`) · 좋은 창 · 방벽은 `buff` (ADR-0511 · ADR-0520). 타격 스킬이 건 상태이상은 표에 창이 없어 아래 일반 모양이다 */
export function fxBuff(state, u, ev) {
    if (!ev.s || ev.until === null || !fxShown(state, 'skill') || !live(state, u)) return;
    prep(state, u);
    const kind = ev.stat === 'barrier_pct' ? 'barrier' : (ev.stat === 'duel' || ev.k || (ev.v ?? 0) < 0) ? 'debuff' : 'buff';
    const L = layerOf(u), look = SKILL_LOOKS[ev.s], list = kind === 'debuff' ? (look?.bad ?? look?.buff) : look?.buff;
    if (L.childElementCount > FX_CAP) return;
    asSkill(L, () => {
        if (skillStamp(L, ev.s, kind === 'debuff' ? 'bad' : 'buff', { sd: seedOf(state, u), crit: false, d: u })) return;
        if (list) return playLook(L, list, { sd: seedOf(state, u), crit: false, d: u });
        if (stamp(L, kind, seedOf(state, u), false)) return;   // 그림이 있으면 그림 한 장 — 초상 위 (ADR-0411)
        spawn(L, { barrier: 'fx-shell', debuff: 'fx-card fx-haze', buff: 'fx-card fx-sweep' }[kind]);
    });
}
/** 불러낸 무리(`call`) — 떠오르며 선다 · 부른 스킬(`s`)의 생김새(`SKILL_LOOKS[s].call`)가 있으면 불린 카드에 같이 선다. 카드를 새로 지은 뒤에 부른다 */
export function fxAppear(state, u, s = null) {
    if (!fxShown(state, 'skill') || !live(state, u)) return;
    prep(state, u);
    play(u.node.parentElement, 'fx-appear', SLOT);
    const L = layerOf(u);
    if (L.childElementCount > FX_CAP) return;
    asSkill(L, () => {
        if (skillStamp(L, s, 'call', { sd: seedOf(state, u), crit: false, d: u })) return;
        const look = SKILL_LOOKS[s]?.call;
        if (look) playLook(L, look, { sd: seedOf(state, u), crit: false, d: u });
    });
}

/* ═══ 도감의 이펙트 탭 — 스킬 하나의 이펙트를 그 카드에 띄운다 (2026-10-05 사용자 지시 · SCREEN_DESIGN §9-1 · ADR-0513) ═══
   관전과 같은 자리(위의 fxHit · fxBuff …)를 부른다 — 생김새 · 크기 · 색이 관전 그대로다. 설정의 켜고 끄기와 상관없이 선다(`preview`) · 피격 반응은 설정을 따른다 */

const PREVIEW_KINDS = ['hit', 'bad', 'buff', 'heal', 'call'];
/** 그 스킬이 띄우는 사건들 + 타격의 피해 종류 — 표에 있으면 표의 사건, 없으면 `skill_effect.csv` 첫 줄로 짐작한다(표에 없는 스킬은 기본 모양으로 선다).
 *  effRows = 그 스킬의 `skill_effect.csv` 행 · target = `skill.csv:target` */
export function previewOf(s, effRows = [], target = '') {
    const look = SKILL_ART[s] ?? SKILL_LOOKS[s], hit = effRows.find(r => r.effect === 'hit' || r.effect === 'fixed');
    const ty = !hit ? 'physical' : hit.effect === 'fixed' ? null : (hit.element && hit.element !== '-' ? hit.element : 'physical');
    if (look) return { kinds: PREVIEW_KINDS.filter(k => look[k]), ty };
    const e = effRows[0], ef = e?.effect, tg = e?.target && e.target !== '-' ? e.target : target;
    const kind = ef === 'hit' || ef === 'fixed' ? 'hit' : ef === 'heal' ? 'heal' : ef === 'summon' || ef === 'call' ? 'call' : /enemy/.test(tg ?? '') ? 'bad' : 'buff';
    return { kinds: [kind], ty };
}
/** 사건 하나를 띄운다 — kind = 'basic'(기본 공격) | 'hit' | 'bad' | 'buff' | 'heal' | 'call' · n = 몇 번째 재생인가(흩어짐이 매번 달라진다) · 때린 카드는 없다(공격 시 흔들림이 안 선다).
 *  style = 그림체(`ART_STYLES` — 이 호출 동안만 · 그림은 아래 fxHit … 안에서 같은 호출로 선다 · ADR-0559) */
export function fxPreview(n, u, s, kind, ty = 'physical', style = artPref) {
    const st = { idx: n, speed: 1, catchUp: false, preview: true }, none = { key: '', node: null };
    artStyle = style;
    try {
        if (kind === 'basic') fxHit(st, none, u, { crit: false });
        else if (kind === 'hit') fxHit(st, none, u, { s, ty, crit: false });
        else if (kind === 'heal') fxHeal(st, u, { s });
        else if (kind === 'call') fxAppear(st, u, s);
        else fxBuff(st, u, { s, until: 1, v: kind === 'bad' ? -1 : 1 });
    } finally {
        artStyle = artPref;
    }
}
