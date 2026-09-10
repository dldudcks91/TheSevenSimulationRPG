/**
 * 툴팁 — **기계장치를 한 곳에** (2026-08-28).
 *
 * 화면 렌더러(`app.js`)와 관전 재생기(`battle.js`)가 같은 `#tooltip` 한 자리를 쓴다. 표시·따라다니기·넘침 보정을
 * 두 번 짜면 한쪽만 고쳐지므로 여기 하나만 둔다. **내용은 부르는 쪽이 만든다** — `bindTipNode(node, build)` 의
 * `build()` 가 붙일 노드를 돌려준다.
 *
 * 다만 **영웅 카드 · 스킬 카드는 여기 둔다**: 두 렌더러가 같은 카드를 띄우기 때문이다(영웅 띠 ↔ 관전 유닛 카드).
 * 아이템 비교 카드는 `app.js` 에 남는다 — 희귀도 · 접사 · 무기군처럼 app 쪽 헬퍼를 많이 타서 옮기면 그게 따라온다.
 *
 * **Alt 계산식 상태도 여기 든다** (2026-09-10 · SCREEN_DESIGN §2 「스킬 설명창 규격」 · ADR-0089) — 누르는 동안만 켜지고,
 * 떠 있는 **스킬 카드만** 그 자리에서 다시 그린다. 스킬 창의 줄 문장(`skillLineHtml`)은 이 상태를 안 본다.
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
 */
export function bindTipNode(node, build) {
    node.dataset.tip = '1';
    node._tipBuild = build;
    node.onmouseenter = ev => showTip(build(), ev);
    node.onmousemove = moveTip;
    node.onmouseleave = ev => {
        const up = node.parentElement?.closest('[data-tip]');
        if (up?._tipBuild && ev.relatedTarget && up.contains(ev.relatedTarget)) showTip(up._tipBuild(), ev);
        else hideTip();
    };
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
 * 창 좌표 → **한 장 좌표** (SCREEN_DESIGN §2 · ADR-0087). 화면은 `#stage` 한 장이 `transform` 으로 통째로 줄고 늘므로,
 * 마우스의 `clientX/Y` 를 그대로 `left/top` 에 넣으면 배율만큼 어긋난다 — 한 장의 실제 사각형으로 되돌린다.
 * `#stage` 가 없으면(dev/test.html 이 이 파일을 import 한다) 창 좌표 그대로다. **부를 때만** DOM 을 읽는다.
 * @returns {{x:number, y:number, s:number, w:number, h:number}} x·y = 한 장 안의 점 · s = 배율 · w·h = 한 장 크기
 */
export function stagePoint(ev) {
    const st = document.getElementById('stage');
    if (!st) return { x: ev.clientX, y: ev.clientY, s: 1, w: window.innerWidth, h: window.innerHeight };
    const r = st.getBoundingClientRect();
    const s = r.width / st.offsetWidth;
    return { x: (ev.clientX - r.left) / s, y: (ev.clientY - r.top) / s, s, w: st.offsetWidth, h: st.offsetHeight };
}

/** 커서를 따라다니되 **한 장** 밖으로 나가면 반대쪽으로 접는다 — 좌표 · 크기는 전부 한 장 단위다(`stagePoint`) */
export function moveTip(ev) {
    const tip = $tip();
    if (!tip) return;
    const p = stagePoint(ev);
    const tw = tip.offsetWidth, th = tip.offsetHeight;   // 배율 전 크기 = 한 장 단위
    let x = p.x + 16, y = p.y + 16;
    if (x + tw > p.w - 8) x = p.x - tw - 16;
    if (y + th > p.h - 8) y = p.h - th - 8;
    tip.style.left = Math.max(8, x) + 'px';
    tip.style.top = Math.max(8, y) + 'px';
}

export function hideTip() { $tip()?.classList.remove('show'); }

/* ───────── 카드 — 두 렌더러가 함께 쓴다 ───────── */

const classOf = id => D.classes.find(c => c.id === id);
// 등급 표기 — SSOT 는 `hero_tier.csv` 다 (2026-09-08 R48 · ~~mock.js:HERO_TIER~~ 대체 · app.js 와 같은 규칙)
const tierOf = h => D.heroTiers.find(t => t.id === h.tier) ?? D.heroTiers.find(t => t.id === 'rare') ?? D.heroTiers[0];

/**
 * 영웅 카드 — 이름 / 직업 · 레벨 · 죄종 · 등급 / **기본 능력치 7** (SCREEN_DESIGN §5).
 * 옛 `title` 속성(직업·Lv·죄종·등급)이 들던 것에 능력치를 더한 것이다 — 값이 늘어 한 줄에 안 들어간다.
 * 능력치는 `h.stats` 에서 그대로 읽는다. 파생 전투치(HP·공격력 등)는 여기서 계산하지 않는다 — 캐릭터 탭의 몫이다.
 */
export function heroTipCard(h) {
    if (!h) return null;
    const tier = tierOf(h);
    const sin = M.SINS[h.sin];
    const cls = classOf(h.cls);
    const sub = [cls ? L(cls) : h.cls, t('tip.hero.lv', { n: h.level }), sin ? L(sin) : h.sin, L(tier)];
    const c = el('div', 'tip-card');
    c.innerHTML = `
        <div class="tip-head">${t('tip.hero.h')}</div>
        <div class="tip-name" style="color:${tier.color}">${L(h.name)}</div>
        <div class="tip-sub">${sub.join(' · ')}</div>
        <div class="tip-stats">${D.heroAttributes.map(s => `
            <div class="tip-stat"><span class="n">${L(s)}<i>${s.abbr}</i></span><b>${h.stats?.[s.id] ?? '—'}</b></div>`).join('')}</div>`;
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
    const v = unit(hl(show(Math.abs(part.value))));
    if (!part.terms.length) return v;
    R.fx = true;
    return R.alt ? `${v} <span class="tip-fx">${fx(x => x)}</span>` : v;
}

/** 피해 · 회복량 · 벽 HP 자리 — 식의 첫 항이 `밑수 이름 × 배율%` 다 */
const amountSlot = (part, R) => slot({
    part,
    show: v => v.toLocaleString(),
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
   (마우스를 다시 올리게 하면 보려던 순간을 놓친다). 바꾸는 것은 **스킬 카드뿐** — 영웅 · 아이템 카드는 그대로다.
   스킬 창의 줄 문장(`skillLineHtml`)은 이 상태를 **안 본다** — 판 안에 셋이 나란히 서서 식이 붙으면 세 줄이 같이 부푼다 */
let altHeld = false;
/** 마지막 마우스 위치 — 다시 그린 카드의 높이가 달라져도 넘침 보정이 맞게 `moveTip` 을 한 번 더 부른다 */
let lastMove = null;

function setAlt(on) {
    if (altHeld === on) return;
    altHeld = on;
    const tip = $tip();
    if (!tip?.classList.contains('show')) return;
    const cards = tip.querySelectorAll('.tip-card[data-sk-card]');
    for (const c of cards) c.replaceWith(skillTipCard(c._skill.s, c._skill.ctx));
    if (cards.length && lastMove) moveTip(lastMove);
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
 * ⚠ `desc`(고정 설명)는 **안 낸다** — 줄에서 뺐다(같은 지시). 그건 툴팁만 든다.
 * @returns {string} 틀이 없는 스킬이면 빈 문자열
 */
export function skillLineHtml(s, ctx = {}) {
    const def = SYS.skill?.defs?.[s?.id] ?? null;
    if (!def) return '';
    return (skillLines(def, SYS.skill.previewOf(def, ctx), ctx.atkType, { alt: false, fx: false }) ?? []).join('<br>');
}

/**
 * 스킬 카드 — 아이콘 + 이름 / 칩 / **문장**(추가 피해가 있으면 둘째 문장) / 설명 / 「Alt 계산식」 각주 (SCREEN_DESIGN §2 「스킬 설명창 규격」).
 * 머리에는 **출처 칩**(고유·무기·전직)과 **태그 칩**(파생 포함 — `skill_tag.csv` 가 이름의 SSOT)이 선다.
 * Alt 가 바뀌면 `setAlt` 가 떠 있는 카드를 **같은 인자로** 다시 만든다 — 그래서 카드가 제 인자를 든다(`_skill`).
 * @param s   `.id` 만 있으면 된다 — 정의는 `SYS.skill.defs` 에서 집는다(호출처마다 다른 모양을 받아 왔다)
 * @param ctx {period, atk, matk, hpMax, atkType, stats, source} — 모르는 값은 생략한다. 그 숫자 자리가 식으로 접힌다
 */
export function skillTipCard(s, ctx = {}) {
    if (!s) return null;
    const def = SYS.skill?.defs?.[s.id] ?? null;
    const c = el('div', 'tip-card');
    c.dataset.skCard = '1';
    c._skill = { s, ctx };
    const name = L(def?.name ?? s.name ?? { ko: s.id, en: s.id });
    const chips = [];
    if (ctx.source) chips.push(`<i class="tip-chip src">${t(ctx.source === 'innate' ? 'sk.innate' : `sk.src.${ctx.source}`)}</i>`);
    for (const tg of (def ? SYS.skill.tagsOf(def) : [])) chips.push(`<i class="tip-chip">${L(skillTagName(tg))}</i>`);
    // 정의를 못 찾으면(행이 지워진 옛 세이브) 이름만 낸다 — 던지지 않는다
    const R = { alt: altHeld, fx: false };
    const lines = def ? skillLines(def, SYS.skill.previewOf(def, ctx), ctx.atkType, R) : null;
    c.innerHTML = `
        <div class="tip-head">${t('tip.skill.h')}</div>
        <div class="tip-name"><span class="tip-sk-ico">${skillImg(s)}</span>${name}</div>
        ${chips.length ? `<div class="tip-chips">${chips.join('')}</div>` : ''}
        ${(lines ?? []).map(l => `<div class="tip-line">${l}</div>`).join('')}
        ${def?.desc ? `<div class="tip-desc">${L(def.desc)}</div>` : ''}
        ${R.fx && !R.alt ? `<div class="tip-foot">${t('sk.altHint')}</div>` : ''}`;
    return c;
}
