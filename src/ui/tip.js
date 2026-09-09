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

/** 커서를 따라다니되 화면 밖으로 나가면 반대쪽으로 접는다 */
export function moveTip(ev) {
    const tip = $tip();
    if (!tip) return;
    const r = tip.getBoundingClientRect();
    let x = ev.clientX + 16, y = ev.clientY + 16;
    if (x + r.width > window.innerWidth - 8) x = ev.clientX - r.width - 16;
    if (y + r.height > window.innerHeight - 8) y = window.innerHeight - r.height - 8;
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

/* ───────── 스킬 문장 (SCREEN_DESIGN §4-2 · 전면 개정 2026-09-08) ─────────
   ~~표기/실효 쿨 두 줄~~ 대신 **데이터로 조립한 한 문장**을 낸다. 파생값(실효 쿨 · 피해)은
   `game_logic/skill.js:previewOf` 가 내고 여기서는 **문장만** 만든다 — 렌더러는 계산하지 않는다. */

/** 숫자 강조 — 문장에서 눈에 걸려야 하는 값만 감싼다 */
const hl = v => `<b class="tip-hl">${v}</b>`;
/** 초 표기 — 7.2 는 그대로, 12.0 은 12 로 (소수점이 붙으면 정밀해 보여 오해를 준다) */
const sec = v => hl(String(Number(Number(v).toFixed(1))));

/**
 * 수량 구절 — 공격력을 아는 자리는 **실제 수치**, 모르는 자리(후보 카드 — 무기가 없다)는 **배율**로 접는다.
 * ⚠ 감소·치명 **전**의 값이다 (previewOf 주석) — 툴팁이 약속하는 건 「내가 때리는 세기」다.
 */
function amountPhrase(def, pv, atkType) {
    const heal = def.kind === 'heal';
    if (pv?.amount == null) return t(heal ? 'sk.amt.healMult' : 'sk.amt.mult', { m: hl(def.mult) });
    const v = hl(pv.amount.toLocaleString());
    return t(heal ? 'sk.amt.heal' : (atkType && atkType !== 'physical' ? 'sk.amt.magic' : 'sk.amt.physical'), { v });
}

/**
 * 버프 효과 구절 — 이름 + 값만. 어휘에 없는 stat 이면 null(그 문장을 안 만든다).
 * **음수 값은 디버프**다 (참회 · 속박 — 같은 창을 반대로 쓴다). 부호를 문장에 그대로 흘리면
 *   「공격력 +-25%」가 되므로 절댓값을 넘기고 **`.neg` 틀이 방향을 든다**.
 */
const effectPhrase = def => {
    const key = `sk.eff.${def.stat}${def.value < 0 ? '.neg' : ''}`;
    return STRINGS_HAS(key) ? t(key, { v: hl(Math.abs(def.value)) }) : null;
};

/** 문장 한 줄 — `kind` × `target` 이 틀을 정한다. 틀이 없으면 `null`(설명만 뜬다) */
function skillLine(def, pv, atkType) {
    // 표기 쿨 — 실효 쿨은 폐기됐다 (개정 2026-09-08 2차 · SCREEN_DESIGN §4-2). 어느 영웅이 들든 같은 수다
    const n = sec(pv?.baseSec ?? def.cool);
    if (def.kind === 'attack') {
        const d = amountPhrase(def, pv, atkType);
        if (def.target === 'enemy_all') return t('sk.line.all', { n, d });
        if (def.target === 'enemy_chain') return t('sk.line.chain', { n, d, k: hl(def.decay) });
        if (def.target === 'enemy_rotate') return t('sk.line.rotate', { n, d, h: hl(def.hits) });
        if (def.target === 'enemy_highest_def') return t('sk.line.guided', { n, d, h: hl(def.hits) });
        return t(def.hits > 1 ? 'sk.line.singleN' : 'sk.line.single', { n, d, h: hl(def.hits) });
    }
    if (def.kind === 'heal') {
        const d = amountPhrase(def, pv, atkType);
        return t(def.target === 'ally_single' ? 'sk.line.healOne' : 'sk.line.heal', { n, d });
    }
    // 소환 — 세기가 배율이 아니라 **시전자 최대 HP 의 %** 라 수량 구절을 안 쓴다 (skill_design §12-6)
    if (def.kind === 'summon') return t('sk.line.summon', { n, h: hl(def.mult) });
    // 오오라 — **쿨이 없다.** 그래서 이 문장만 `{n}` 을 안 든다 (skill_design §1-5)
    if (def.kind === 'aura') {
        const e = effectPhrase(def);
        return e === null ? null : t('sk.line.aura', { e });
    }
    if (def.kind === 'buff') {
        const s = sec(def.dur);
        if (def.stat === 'taunt') return t('sk.line.taunt', { n, s });
        // 지목은 창의 길이를 안 말한다 — 「라운드가 끝날 때까지」라 초로 셀 것이 아니다
        if (def.stat === 'duel') return t('sk.line.duel', { n });
        const e = effectPhrase(def);
        if (e === null) return null;
        const key = def.target === 'party' ? 'sk.line.buffParty'
            : def.target === 'party_adjacent' ? 'sk.line.buffAdjacent'
            : (def.target === 'enemy_all' || def.target === 'enemy_single') ? 'sk.line.debuffAll'
            : 'sk.line.buffSelf';
        return t(key, { n, s, e });
    }
    return null;
}

/**
 * 스킬 카드 — 아이콘 + 이름 / **한 문장** / 설명 (SCREEN_DESIGN §4-2).
 * 머리에는 **출처 칩**(고유·무기·전직)과 **태그 칩**(파생 포함 — `skill_tag.csv` 가 이름의 SSOT)이 선다.
 * @param s   `.id` 만 있으면 된다 — 정의는 `SYS.skill.defs` 에서 집는다(호출처마다 다른 모양을 받아 왔다)
 * @param ctx {period, atk, atkType, source} — 모르는 값은 생략한다. 문장이 그 조각을 접는다
 */
/**
 * 툴팁이 내는 **문장 한 줄**을 그대로 낸다 — 스킬 창의 액티브 줄이 hover 와 같은 말을 하게 하는 창이다
 * [2026-09-08 사용자 지시 · SCREEN_DESIGN §7]. 카드와 **같은 함수**(`skillLine`)를 쓰므로 둘이 갈릴 길이 없다.
 * ⚠ `desc`(고정 설명)는 **안 낸다** — 줄에서 뺐다(같은 지시). 그건 툴팁만 든다.
 * @returns {string} 틀이 없는 스킬이면 빈 문자열
 */
export function skillLineHtml(s, ctx = {}) {
    const def = SYS.skill?.defs?.[s?.id] ?? null;
    if (!def) return '';
    return skillLine(def, SYS.skill.previewOf(def, ctx), ctx.atkType) ?? '';
}

export function skillTipCard(s, ctx = {}) {
    if (!s) return null;
    const def = SYS.skill?.defs?.[s.id] ?? null;
    const c = el('div', 'tip-card');
    const name = L(def?.name ?? s.name ?? { ko: s.id, en: s.id });
    const chips = [];
    if (ctx.source) chips.push(`<i class="tip-chip src">${t(ctx.source === 'innate' ? 'sk.innate' : `sk.src.${ctx.source}`)}</i>`);
    for (const tg of (def ? SYS.skill.tagsOf(def) : [])) chips.push(`<i class="tip-chip">${L(skillTagName(tg))}</i>`);
    // 정의를 못 찾으면(행이 지워진 옛 세이브) 이름만 낸다 — 던지지 않는다
    const line = def ? skillLine(def, SYS.skill.previewOf(def, ctx), ctx.atkType) : null;
    c.innerHTML = `
        <div class="tip-head">${t('tip.skill.h')}</div>
        <div class="tip-name"><span class="tip-sk-ico">${skillImg(s)}</span>${name}</div>
        ${chips.length ? `<div class="tip-chips">${chips.join('')}</div>` : ''}
        ${line ? `<div class="tip-line">${line}</div>` : ''}
        ${def?.desc ? `<div class="tip-desc">${L(def.desc)}</div>` : ''}`;
    return c;
}
