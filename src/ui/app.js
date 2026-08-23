/**
 * 화면 목업 렌더러 — DOM만 그린다. 게임 로직은 여기에 들어오지 않는다.
 *
 * CLAUDE.md 이식성 규칙: game_logic/ 은 DOM을 모르고, ui/ 는 규칙을 모른다.
 * 지금은 game_logic/ 이 비어 있으므로 mock.js 의 고정 데이터를 그대로 그린다.
 *
 * i18n 규약 (2026-08-23): **이 파일에 한국어 리터럴을 쓰지 않는다** (주석 제외).
 *   UI 문구 → i18n.js 의 t(key) / 데이터 문자열 → mock.js 의 {ko, en} 쌍을 L() 로 푼다.
 *   언어 전환은 우측 상단 토글 — setLang() 후 render() 한 번이면 전 화면이 갈아입는다.
 *
 * 탭 구성: 원정 / 캐릭터 / 스킬 / 선술집 / 도감 (2026-08-23 — '장비' 탭을 '캐릭터'로 확장)
 *   장비만 따로 보는 화면이 아니다 — 영웅 하나에 대해 장비·능력치·스킬을 한 번에 읽는다
 *   전투 파티는 **한 팀만** 운용하므로 원정과 전투를 분리하지 않는다.
 *   원정 탭 하나가 [편성·지역선택] → [전투 관전] → [리포트] 세 상태를 갖는다.
 */

import * as M from './mock.js';
import { t, L, lang, setLang, applyDocumentLang } from './i18n.js';
import { mountBattle } from './battle.js';

const $ = sel => document.querySelector(sel);
const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
};
const heroById = uid => M.HEROES.find(h => h.uid === uid);
const sinColor = id => M.SINS[id]?.color ?? 'var(--text-muted)';
const sinName = id => L(M.SINS[id]) || id;
const rarity = r => M.RARITY[r] ?? M.RARITY.magic;

/* 영웅 2층 구조 (hero_design §2) — 유니크/레어를 아이템과 같은 계단으로 읽히게 */
const tierOf = h => M.HERO_TIER[h.tier] ?? M.HERO_TIER.rare;
const tierChip = h => `<span class="tier-chip" style="color:${tierOf(h).color}" title="${L(tierOf(h).desc)}">${L(tierOf(h))}</span>`;
/* 부상/치료 (base_expedition_design §1-1) — HP는 무료 회복, 부상만 타이머 */
const injured = h => h.injury?.downed === true;
const injuryChip = h => injured(h) ? `<span class="injury-chip">${t('injury.chip', { t: L(h.injury.healText) })}</span>` : '';

/**
 * 몬스터 얼굴 (src/assets/inherited/faces/).
 * CH1 16종 중 5종만 아트가 있다 — 나머지는 원작에도 없다.
 * 폴백은 **죄종 색 원판 + 이름 이니셜** (faces/README 규격). 원형 마스크는 CSS가 한다.
 */
const faceChip = (id, extraCls = '') => {
    const src = M.monsterFace(id);
    const name = L(M.monsterName(id));
    if (src) return `<span class="face ${extraCls}" title="${name}"><img src="${src}" alt="${name}" loading="lazy"></span>`;
    const c = sinColor(M.monsterSin(id));
    return `<span class="face none ${extraCls}" title="${t('face.noArt', { name })}"
        style="color:${c};background:${c}22;border-color:${c}66">${name.charAt(0)}</span>`;
};

/**
 * 접이식 설명 — 기본은 접혀 있고 누르면 펼쳐진다.
 * 화면에 상시로 깔려 있던 설계 근거 문구들이 정보를 밀어내서, 원할 때만 꺼내 보게 바꿨다.
 * <details> 라 상태를 JS로 들고 있지 않아도 된다 (render() 로 다시 그려도 부작용 없음).
 */
const note = (html, label) => {
    const d = el('details', 'note');
    d.innerHTML = `<summary>${label ?? t('ui.note')}</summary><div class="note-body">${html}</div>`;
    return d;
};

/* 직업 7종 — id 로 참조, 표시는 L() (hero_design §5) */
const classDef = id => M.CLASSES.find(c => c.id === id);
const className = id => L(classDef(id)) || id;
const classLine = id => {
    const c = classDef(id);
    return c ? `${L(c.role)} · ${L(c.weapons)}` : t('class.unassigned');
};

/* 행동 주기 = 1 / 공격속도 (battle_design §2 — 물리·마법 단일 축) */
const cycleOf = h => 1 / Number(h.derived.aspd);
/* 실효 쿨 = ceil(표기 쿨 ÷ 행동 주기) × 행동 주기 (battle_design §6) */
const effectiveCd = (cd, cycle) => Math.ceil(cd / cycle) * cycle;

const TABS = ['expedition', 'character', 'skill', 'tavern', 'codex'];

const state = {
    tab: 'expedition',
    exp: 'battle',          // idle | battle | report
    heroUid: 'h1',
    codexChapter: 1,
    slotFilter: null,
};
let stopBattle = null;      // 화면을 떠나면 관전 타이머를 끈다

/* ═══════════ 셸 ═══════════ */

function renderShell() {
    const nav = $('.nav');
    nav.innerHTML = '';
    for (const id of TABS) {
        const b = el('button', id === state.tab ? 'on' : '', t(`nav.${id}`));
        b.onclick = () => { state.tab = id; render(); };
        nav.appendChild(b);
    }

    const r = M.RESOURCES;
    $('.resources').innerHTML = `
        <span>${t('res.gold')}<b>${r.gold.toLocaleString()}</b></span>
        <span>${t('res.dust')}<b>${r.dust}</b></span>
        <span>${t('res.stigma')}<b>${r.stigma}</b></span>`;

    // 언어 토글 — 버튼에는 "다른 쪽" 언어를 적는다. 누르면 전 화면이 다시 그려진다
    const langBtn = el('button', 'btn sm lang-btn', t('ui.langBtn'));
    langBtn.onclick = () => { setLang(lang() === 'ko' ? 'en' : 'ko'); render(); };
    $('.resources').appendChild(langBtn);

    $('.crumb').textContent = t(`nav.${state.tab}`);
}

function render() {
    if (stopBattle) { stopBattle(); stopBattle = null; }
    applyDocumentLang();
    renderShell();
    const main = $('.main');
    main.innerHTML = '';
    ({
        expedition: renderExpedition,
        character: renderCharacter,
        skill: renderSkill,
        tavern: renderTavern,
        codex: renderCodex,
    })[state.tab](main);
    hideTip();
}

/** 세그먼트 버튼 묶음 — items: {id, label, disabled?} */
function segmented(items, current, onPick) {
    const box = el('div', 'segmented');
    for (const it of items) {
        const b = el('button', `btn sm${it.id === current ? ' on' : ''}`, it.label);
        if (it.disabled) b.disabled = true;
        b.onclick = () => onPick(it.id);
        box.appendChild(b);
    }
    return box;
}

/* ═══════════ 원정 (편성 · 전투 · 리포트) ═══════════ */

function renderExpedition(main) {
    const bar = el('div', 'sub-bar');
    bar.appendChild(segmented([
        { id: 'idle', label: t('exp.seg.idle') },
        { id: 'battle', label: t('exp.seg.battle') },
        { id: 'report', label: t('exp.seg.report') },
    ], state.exp, id => { state.exp = id; render(); }));
    bar.appendChild(el('div', 'muted', `<span style="font-size:var(--fs-xs)">${t('exp.oneParty')}</span>`));
    main.appendChild(bar);

    if (state.exp === 'idle') return renderExpIdle(main);
    if (state.exp === 'battle') { stopBattle = mountBattle(main); return; }
    return renderExpReport(main);
}

function renderExpIdle(main) {
    const wrap = el('div', 'cols c-side');

    const left = el('div');
    const p = el('div', 'panel');
    p.appendChild(el('h2', '', `${t('exp.party.h')} <small>${t('exp.party.sub', { n: M.BALANCE.party_size_max, m: M.BALANCE.concurrent_expedition_parties })}</small>`));
    for (let i = 0; i < M.BALANCE.party_size_max; i++) {
        const h = heroById(M.PARTY[i]);
        if (!h) { p.appendChild(el('div', 'party-slot empty', t('exp.emptySlot'))); continue; }
        const row = el('div', `party-slot${injured(h) ? ' downed' : ''}`);
        row.innerHTML = `
            <span class="sin-chip" style="color:${sinColor(h.sin)}">${sinName(h.sin)}</span>
            <div style="flex:1">
                ${L(h.name)} ${tierChip(h)} <span class="lv">${className(h.cls)} · Lv.${h.level}</span>
                ${injured(h) ? `<div>${injuryChip(h)}</div>` : ''}
                <div class="bar hp" style="margin-top:4px"><i style="width:${h.hp / h.hpMax * 100}%"></i></div>
            </div>
            ${i === 0 ? `<span class="muted" style="font-size:var(--fs-xs)">${t('exp.leader')}</span>` : ''}`;
        p.appendChild(row);
    }
    const anyDown = M.PARTY.map(heroById).some(h => h && injured(h));
    if (anyDown) {
        p.appendChild(el('div', 'down', `<div style="font-size:var(--fs-xs);margin-top:8px">${t('exp.cantDepart')}</div>`));
    }
    p.appendChild(note(t('exp.party.note')));
    left.appendChild(p);

    const bench = el('div', 'panel');
    bench.appendChild(el('h2', '', `${t('exp.bench.h')} <small>${t('exp.bench.sub', { n: M.HEROES.length, cap: M.BALANCE.roster_cap })}</small>`));
    for (const h of M.HEROES.filter(h => !M.PARTY.includes(h.uid))) {
        const row = el('div', `party-slot${injured(h) ? ' downed' : ''}`);
        row.innerHTML = `
            <span class="sin-chip" style="color:${sinColor(h.sin)}">${sinName(h.sin)}</span>
            <div style="flex:1">${L(h.name)} ${tierChip(h)} <span class="lv">${className(h.cls)} · Lv.${h.level}</span>
                ${injured(h) ? `<div>${injuryChip(h)}</div>` : ''}</div>
            <button class="btn sm" ${injured(h) ? 'disabled' : ''}>${t('exp.dispatch')}</button>`;
        bench.appendChild(row);
    }
    bench.appendChild(note(t('exp.bench.note')));
    left.appendChild(bench);
    wrap.appendChild(left);

    const right = el('div');
    const zp = el('div', 'panel');
    zp.appendChild(el('h2', '', `${t('exp.zones.h')} <small>${t('exp.zones.sub', { r: M.BALANCE.rounds_per_stage })}</small>`));
    for (const z of M.ZONES) {
        const chapterBoss = z.bossKind === 'chapter';
        const row = el('div', `zone ${z.state === 'locked' ? 'locked' : ''} ${chapterBoss ? 'boss' : ''}`);
        row.style.borderLeftColor = z.state === 'locked' ? '' : sinColor(z.sin);
        // 계승 스테이지 배경을 오른쪽에서 흘려넣는다 — 지역 선택이 곧 타겟 파밍 결정이라 눈에 남아야 한다
        if (z.bg) {
            row.style.backgroundImage =
                `linear-gradient(90deg, var(--bg-tertiary) 34%, rgba(26,26,42,.55) 68%, rgba(26,26,42,.30)), url('${z.bg}')`;
            row.classList.add('has-bg');
        }
        const btn = z.state === 'locked'
            ? `<span class="muted" style="font-size:var(--fs-sm)">${L(z.lockText)}</span>`
            : `<button class="btn ${chapterBoss ? 'primary' : ''} b-go">${t('exp.deploy')}</button>`;
        // 행에는 고를 때 필요한 것만 — 몬스터 구성·라운드 배치는 <details> 안으로 내렸다.
        // 라운드 배치(정예 3·6 / 보스 9)는 전 스테이지가 똑같아서 매 행에 적으면 잡음이 된다.
        const bossLabel = chapterBoss ? t('kind.chapterBoss') : t('kind.boss');
        const bossTail = chapterBoss ? t('exp.solo') : t('exp.escorts');
        row.innerHTML = `
            <div>
                <div class="title">
                    <span class="sin-chip" style="color:${sinColor(z.sin)}">${sinName(z.sin)}</span>
                    <span>Ch${z.chapter}-${z.stage} ${L(z.name)}</span>
                    ${z.state === 'cleared' ? `<span class="muted" style="font-size:var(--fs-xs)">${t('exp.cleared')}</span>` : ''}
                </div>
                <div class="meta">${t('exp.zoneMeta', { lv: z.mlvl, m: z.minutes })}</div>
            </div>
            <div>${btn}</div>
            <details class="zone-more">
                <summary>${t('exp.viewComp')}</summary>
                <div class="note-body">
                    <div class="face-row">
                        ${z.monsterIds.map(id => faceChip(id)).join('')}
                        ${z.bossId ? `<span class="face-sep">·</span>${faceChip(z.bossId, 'boss')}` : ''}
                        <span class="muted">${z.monsterIds.map(id => L(M.monsterName(id))).join(', ') || '???'}</span>
                    </div>
                    <div class="round-plan">
                        ${M.ELITE_ROUNDS.map(n => `<span class="rk elite">${t('exp.eliteR', { n })}</span>`).join('')}
                        <span class="rk boss">R${M.BOSS_ROUND} ${bossLabel} · ${z.bossId ? L(M.monsterName(z.bossId)) : '???'}${bossTail}</span>
                    </div>
                </div>
            </details>`;
        const go = row.querySelector('.b-go');
        if (go) go.onclick = () => { state.exp = 'battle'; render(); };
        zp.appendChild(row);
    }
    zp.appendChild(note(t('exp.zones.note', { e: M.ELITE_ROUNDS.join('·'), b: M.BOSS_ROUND })));
    right.appendChild(zp);
    wrap.appendChild(right);
    main.appendChild(wrap);
}

function renderExpReport(main) {
    const R = M.REPORT;
    const p = el('div', 'panel');
    p.innerHTML = `
        <div class="report-head">
            <span class="verdict clear">${t('rep.clear')}</span>
            <span>${L(R.zoneName)}</span>
            <span class="muted">${L(R.elapsedText)}</span>
        </div>
        <div class="gain-row">
            <div><span>${t('res.gold')}</span>${R.gold.toLocaleString()}</div>
            <div><span>${t('res.dust')}</span>${R.dust}</div>
            <div><span>${t('rep.xp')}</span>${t('rep.xpEach', { n: R.xpEach })}</div>
            <div><span>${t('rep.rounds')}</span>${R.rounds.length} / ${M.BALANCE.rounds_per_stage}</div>
            <div><span>${t('rep.downed')}</span>${R.downed.length ? `<span class="down">${t('rep.downedN', { n: R.downed.length })}</span>` : t('rep.none')}</div>
        </div>`;
    for (const lu of R.levelUps) {
        p.appendChild(el('div', '', `<div class="up" style="font-size:var(--fs-sm);margin-bottom:12px">
            ${t('rep.levelUp', { name: L(lu.name), a: lu.from, b: lu.to })} &nbsp;<span class="muted">${L(lu.gains)}</span></div>`));
    }
    // 부상/치료 — 귀환 시 HP는 무료 회복, 전투불능자만 타이머 (base_expedition_design §1-1)
    if (R.downed.length) {
        const inj = el('div', 'injury-box');
        inj.innerHTML = `
            <div class="t">${t('rep.injuryHead')}</div>
            ${R.downed.map(d => `<div class="r"><span>${L(d.name)}</span><span class="down">${L(d.healText)}</span></div>`).join('')}
            <div class="muted" style="font-size:var(--fs-xs);margin-top:6px">${t('rep.injuryNote')}</div>`;
        p.appendChild(inj);
    }
    main.appendChild(p);

    const cols = el('div', 'cols c2');

    const dp = el('div', 'panel');
    dp.appendChild(el('h2', '', `${t('rep.drops.h')} <small>${t('rep.drops.sub', { n: R.drops.length })}</small>`));
    for (const d of R.drops) {
        const row = el('div', 'drop-row');
        // TODO: '업그레이드/검토/분해' 자동 판정은 기획서에 없는 축 — 채택 여부 미결
        row.innerHTML = `
            <div>
                <div style="color:${rarity(d.rarity).color};font-size:var(--fs-sm)">${L(d.name)}</div>
                <div class="muted" style="font-size:var(--fs-xs)">${L(rarity(d.rarity))} · ilvl ${d.ilvl}</div>
            </div>
            <span class="verdict-tag verdict-${d.verdict}">${t(`verdict.${d.verdict}`)}</span>
            <button class="btn sm">${d.verdict === 'junk' ? t('rep.salvage') : t('rep.equip')}</button>`;
        dp.appendChild(row);
    }
    cols.appendChild(dp);

    const wp = el('div', 'panel');
    wp.appendChild(el('h2', '', `${t('rep.log.h')} <small>${t('rep.log.sub', { e: M.ELITE_ROUNDS.join('·'), b: M.BOSS_ROUND })}</small>`));
    const ul = el('ul', 'wave-log');
    for (const w of R.rounds) {
        const kindTag = w.kind !== 'normal' ? ` <b class="rk ${w.kind}">${t(`kind.${w.kind}`)}</b>` : '';
        ul.appendChild(el('li', `r-${w.kind}`, `
            <span>R${w.n}${kindTag}</span>
            <span>${L(w.text)}</span><span>${L(w.detail)}</span>`));
    }
    wp.appendChild(ul);
    wp.appendChild(note(t('rep.contract')));
    cols.appendChild(wp);
    main.appendChild(cols);
}

/* ═══════════ 공통: 영웅 선택 열 ═══════════ */

function heroPicker() {
    const hp = el('div', 'panel');
    hp.appendChild(el('h2', '', t('hp.h')));
    for (const x of M.HEROES) {
        const b = el('div', `slot-row ${x.uid === state.heroUid ? 'on' : ''}`);
        b.style.cursor = 'pointer';
        b.innerHTML = `<span class="sin-chip" style="color:${sinColor(x.sin)};font-size:9px">${sinName(x.sin)}</span>
            <span class="item-name">${L(x.name)} ${tierChip(x)}
                <span class="muted">${className(x.cls)} Lv.${x.level}</span>
                ${injured(x) ? `<span class="down" style="font-size:var(--fs-xs)">${t('injury.short')}</span>` : ''}</span>`;
        b.onclick = () => { state.heroUid = x.uid; render(); };
        hp.appendChild(b);
    }
    return hp;
}

/* ═══════════ 캐릭터 ═══════════
   2026-08-23 개편 — 세로 3단 구성.
     ① 영웅 띠 (가로 전폭)  ② 장비 / 전체 능력치 / 세부 능력치 / 현재 스킬 4칸  ③ 아이템 (가로 전폭)
   이전 3열(영웅목록 | 장비+스탯 | 인벤토리) 구성은 "누구를 고르는가"가 세로 목록에 갇혀 있었다.
   영웅을 맨 위 가로 띠로 올리면 로스터 전원이 한눈에 들어오고, 아래 네 칸이 그 선택의 결과가 된다. */

const slotDef = id => M.SLOTS.find(s => s.id === id);

/**
 * 영웅 초상 — 아직 아트가 없다 (M.heroFace 는 전부 null).
 * 폴백 규격은 몬스터와 동일: **죄종 색 원판 + 이름 이니셜** (faces/README).
 */
const heroFace = (h, extraCls = '') => {
    const src = M.heroFace(h.uid);
    const name = L(h.name);
    if (src) return `<span class="face ${extraCls}" title="${name}"><img src="${src}" alt="${name}"></span>`;
    const c = sinColor(h.sin);
    return `<span class="face none ${extraCls}"
        style="color:${c};background:${c}22;border-color:${c}66">${name.charAt(0)}</span>`;
};

/**
 * ① 영웅 띠 — 로스터 전원을 가로로 편다. 클릭하면 아래 네 칸이 통째로 갈아입는다.
 * 상한까지 빈 자리를 함께 그린다 — "몇 자리 남았나"가 선술집으로 갈 이유가 된다.
 */
function heroStrip() {
    const p = el('div', 'panel');
    p.appendChild(el('h2', '', `${t('ch.roster.h')}
        <small>${t('ch.roster.sub', { n: M.HEROES.length, cap: M.BALANCE.roster_cap })}</small>`));

    const strip = el('div', 'hero-strip');
    for (const h of M.HEROES) {
        const c = el('div', `hs-card${h.uid === state.heroUid ? ' on' : ''}`
            + `${h.tier === 'unique' ? ' unique' : ''}${injured(h) ? ' downed' : ''}`);
        c.style.borderTopColor = sinColor(h.sin);
        c.innerHTML = `
            <div class="hs-top">
                ${heroFace(h, 'lg')}
                <span class="sin-chip" style="color:${sinColor(h.sin)}">${sinName(h.sin)}</span>
            </div>
            <div class="hs-name"><b>${L(h.name)}</b>${tierChip(h)}</div>
            <div class="hs-cls">${className(h.cls)} · Lv.${h.level}</div>
            <div class="bar xp"><i style="width:${h.xp / h.xpNext * 100}%"></i></div>
            <div class="hs-foot">
                ${M.PARTY.includes(h.uid) ? `<span class="in-party">${t('tv.inParty')}</span>` : ''}
                ${injured(h) ? injuryChip(h) : ''}
            </div>`;
        c.onclick = () => { state.heroUid = h.uid; render(); };
        strip.appendChild(c);
    }
    // 남은 자리 — 로스터 상한 [balance.csv:roster_cap]
    for (let i = M.HEROES.length; i < M.BALANCE.roster_cap; i++)
        strip.appendChild(el('div', 'hs-card empty', '<span>+</span>'));

    p.appendChild(strip);
    return p;
}

/** 페이퍼돌 — 신체 위치대로 8부위 배치 */
function paperdoll(h) {
    const box = el('div', 'paperdoll');
    const twoHanded = h.equipped.weapon?.twoHanded === true;

    for (const row of M.PAPERDOLL) {
        for (const slotId of row) {
            if (!slotId) { box.appendChild(el('div', 'pd-gap')); continue; }
            const def = slotDef(slotId);
            const it = h.equipped[slotId];
            const locked = slotId === 'offhand' && twoHanded;

            const cell = el('div', `pd-cell${it ? ' filled' : ''}${locked ? ' locked' : ''}`);
            if (it) cell.style.borderColor = rarity(it.rarity).color;
            cell.innerHTML = `
                <div class="pd-icon">${def.icon}</div>
                <div class="pd-label">${locked ? t('pd.twoHand') : L(def)}</div>`;
            if (it) bindTip(cell, it);   // 착용 슬롯은 비교 대상 없음 → 단일 카드
            box.appendChild(cell);
        }
    }
    return box;
}

/**
 * ②-1 장비 — 페이퍼돌 + 세트포인트.
 * 세트포인트는 **착용의 직접 결과**라 능력치 칸이 아니라 장비 칸에 붙는다.
 * 브레이크포인트 전문은 접어 둔다 — 칩(도달 현황)이 정보고, 효과 문구는 필요할 때 편다.
 */
function gearPanel(h) {
    const p = el('div', 'panel');
    const equippedCount = Object.values(h.equipped).filter(Boolean).length;
    p.appendChild(el('h2', '', `${t('ch.gear.h')} <small>${t('eq.equipped', { n: equippedCount })}</small>`));
    p.appendChild(paperdoll(h));
    if (h.equipped.weapon?.twoHanded)
        p.appendChild(el('div', 'muted pd-foot', t('eq.twoHand')));

    const bpMax = M.BREAKPOINTS[M.BREAKPOINTS.length - 1];
    p.appendChild(el('div', 'sub-h', `${t('eq.set.h')}
        <span class="muted">${t('eq.set.sub', { list: M.BREAKPOINTS.join(' / '), max: bpMax })}</span>`));

    const entries = Object.entries(h.setPoints).sort((a, b) => b[1] - a[1]);
    const chips = el('div', 'setpoints');
    if (entries.length === 0) chips.appendChild(el('span', 'muted', t('eq.noEquip')));
    for (const [sin, pts] of entries) {
        const chip = el('span', `setpoint ${pts >= M.BREAKPOINTS[0] ? 'reached' : ''}`);
        chip.style.color = sinColor(sin);
        chip.innerHTML = `${sinName(sin)} <b>${pts}</b>`
            + `${sin === h.sin ? `<i class="main-sin" title="${t('eq.mainSin')}">★</i>` : ''}`;
        chips.appendChild(chip);
    }
    p.appendChild(chips);

    const detail = entries.map(([sin, pts]) => `<div class="bp-block">${M.BREAKPOINTS.map(b => {
        const on = pts >= b;
        return `<div style="color:${on ? sinColor(sin) : 'var(--text-muted)'}">
            ${on ? '●' : '○'} ${sinName(sin)} ${b} — ${L(M.SET_BONUSES[sin]?.[b]) ?? ''}</div>`;
    }).join('')}</div>`).join('');
    p.appendChild(note(detail + t('eq.set.note', { max: bpMax }), t('eq.set.h')));
    return p;
}

/**
 * ②-2 전체 능력치 — 기본 능력치 7종 + 머리 숫자 네 줄.
 * 이 층은 **장비로 변하지 않는다** ([balance.csv:attr_equip_bonus] = 0). "이 영웅이 무엇인가"를 여기서 읽는다.
 * 막대의 기준 폭은 [balance.csv:hero_attr_min ~ hero_attr_max].
 */
function attrPanel(h) {
    const p = el('div', 'panel');
    p.appendChild(el('h2', '', `${t('ch.attr.h')} <small>${t('ch.attr.sub')}</small>`));

    const min = M.BALANCE.hero_attr_min, max = M.BALANCE.hero_attr_max;
    const box = el('div', 'attr-list');
    box.innerHTML = M.STATS.map(s => {
        const v = h.stats[s.id];
        const pct = Math.max(0, Math.min(100, (v - min) / (max - min) * 100));
        return `<div class="attr-row">
            <span class="attr-n">${L(s)}<i class="cs-a">${s.abbr}</i></span>
            <span class="attr-bar"><i style="width:${pct}%;background:${sinColor(h.sin)}"></i></span>
            <span class="attr-v">${v}</span>
        </div>`;
    }).join('') + `<div class="attr-range muted">${t('ch.attr.range', { min, max })}</div>`;
    p.appendChild(box);

    // 머리 숫자 — 플레이어가 제일 먼저 보는 네 줄. 나머지는 오른쪽 칸이 받는다
    const c = h.combat ?? {};
    const magic = (c.atk_magic ?? 0) > (c.atk_physical ?? 0);
    const tbl = el('table', 'stat-table');
    tbl.innerHTML = `
        <tr class="sep"><td>${t('st.atk')}</td><td>${(magic ? c.atk_magic : c.atk_physical) ?? '—'}</td></tr>
        <tr><td>${t('st.def')}</td><td>${c.defense ?? '—'}</td></tr>
        <tr><td>${t('st.maxhp')}</td><td>${c.hp_max ?? h.hpMax}</td></tr>
        <tr><td>${t('sk.cycle')}</td><td>${t('sk.cycleSec', { s: cycleOf(h).toFixed(2) })}</td></tr>`;
    p.appendChild(tbl);

    p.appendChild(note(t('ch.attr.note')));
    return p;
}

/** 전투 능력치 표기 — 단위 붙이기는 여기 한 곳에서만 한다 (데이터는 숫자로 둔다) */
const fmtCombat = (def, v) => v === undefined ? '—'
    : def.fmt === 'pct' ? `${v}%`
    : def.fmt === 'sec' ? t('sk.cycleSec', { s: v.toFixed(2) })
    : String(v);

/**
 * ②-3 세부 능력치 — 전투 능력치 27종(src/data/combat_stat.csv)을 카테고리별로 전부 편다.
 * **값이 없는 축도 지우지 않는다** — '—' 는 0이 아니라 "아직 아무 장비도 이 축을 건드리지 않았다"는 뜻이고,
 * 비어 있는 축이 곧 다음에 낄 장비의 자리다. 이걸 숨기면 파밍 목표가 안 보인다.
 */
function detailPanel(h) {
    const c = h.combat ?? {};
    const filled = M.COMBAT_STATS.filter(s => c[s.id] !== undefined).length;

    const p = el('div', 'panel');
    p.appendChild(el('h2', '', `${t('ch.detail.h')}
        <small>${t('ch.detail.sub', { n: filled, total: M.COMBAT_STATS.length })}</small>`));

    const scroll = el('div', 'cs-scroll');
    scroll.innerHTML = M.COMBAT_CATS.map(cat => {
        const rows = M.COMBAT_STATS.filter(s => s.cat === cat.id);
        if (!rows.length) return '';
        return `<div class="cs-cat">${L(cat)}</div>` + rows.map(s => {
            const has = c[s.id] !== undefined;
            const a = s.attr ? M.STATS.find(x => x.id === s.attr) : null;
            return `<div class="cs-row${has ? '' : ' off'}">
                <span class="cs-n">${L(s)}${a ? `<i class="cs-a" title="${L(a)}">${a.abbr}</i>` : ''}</span>
                <span class="cs-v">${fmtCombat(s, c[s.id])}</span>
            </div>`;
        }).join('');
    }).join('');
    p.appendChild(scroll);

    p.appendChild(note(t('ch.detail.note')));
    return p;
}

/**
 * ②-4 현재 스킬 — 지금 이 영웅이 **들고 나가는 것**만 보여준다.
 * 고유 패시브(영웅 Implicit)를 장비 칸에서 이리로 옮겼다 — 슬롯 밖이지만 성격은 스킬이다.
 * 트리에서 무엇을 찍을지는 스킬 탭의 일이라 버튼 하나로 넘긴다.
 */
function currentSkillPanel(h) {
    const p = activeSlots(h, t('ch.skill.h'));
    if (h.passive) {
        p.insertBefore(el('div', 'passive-box', `
            <div class="t">${t('eq.passive.h')} <span class="muted">${t('eq.passive.sub')}</span></div>
            <div class="n">${L(h.passive.name)}</div>
            <div class="muted" style="font-size:var(--fs-xs)">${L(h.passive.desc)}</div>`),
            p.querySelector('h2').nextSibling);
    }
    const go = el('button', 'btn sm go-tree', t('ch.skill.go'));
    go.onclick = () => { state.tab = 'skill'; render(); };
    p.appendChild(go);
    return p;
}

/**
 * ③ 아이템 — 가로 전폭. 열 수는 창 폭이 정하고(CSS auto-fill) 데이터는 용량만 지킨다.
 * 세로로 길던 7×10 격자를 눕히면 같은 70칸이 세 줄로 접혀 세로 예산을 돌려준다.
 */
function itemsPanel(h) {
    const p = el('div', 'panel');
    const items = M.INVENTORY.filter(i => !state.slotFilter || i.slot === state.slotFilter);
    p.appendChild(el('h2', '', `${t('ch.items.h')}
        <small>${t('ch.items.sub', { n: M.INVENTORY.length, cap: M.INV_GRID.cap })}</small>`));

    const filter = el('div', 'segmented inv-filter');
    for (const f of [{ id: null, label: t('eq.filter.all') }, ...M.SLOTS.map(s => ({ id: s.id, label: s.icon, title: L(s) }))]) {
        const b = el('button', `btn sm${state.slotFilter === f.id ? ' on' : ''}`, f.label);
        if (f.title) b.title = f.title;
        b.onclick = () => { state.slotFilter = f.id; render(); };
        filter.appendChild(b);
    }
    p.appendChild(filter);

    const grid = el('div', 'inv-cells wide');
    for (let i = 0; i < M.INV_GRID.cap; i++) {
        const it = items[i];
        const cell = el('div', `inv-cell${it ? ' filled' : ''}`);
        if (it) {
            cell.style.borderColor = rarity(it.rarity).color;
            cell.innerHTML = `<span class="inv-icon">${slotDef(it.slot).icon}</span>`;
            if (it.rarity === 'unique') cell.classList.add('shine');
            bindTip(cell, it, h.equipped[it.slot]);
        }
        grid.appendChild(cell);
    }
    p.appendChild(grid);
    p.appendChild(note(t('eq.inv.note')));
    return p;
}

function renderCharacter(main) {
    const h = heroById(state.heroUid);
    const stack = el('div', 'char-stack');

    stack.appendChild(heroStrip());

    const band = el('div', 'cols c-char');
    band.appendChild(gearPanel(h));
    band.appendChild(attrPanel(h));
    band.appendChild(detailPanel(h));
    band.appendChild(currentSkillPanel(h));
    stack.appendChild(band);

    stack.appendChild(itemsPanel(h));
    main.appendChild(stack);
}


/* ── 비교 툴팁 ── */

function tipCard(item, headText) {
    const c = el('div', 'tip-card');
    if (!item) {
        c.innerHTML = `<div class="tip-head">${headText}</div><div class="tip-empty">${t('tip.empty')}</div>`;
        return c;
    }
    const sins = Object.entries(item.sins ?? {});
    c.innerHTML = `
        <div class="tip-head">${headText}</div>
        <div class="tip-name" style="color:${rarity(item.rarity).color}">${L(item.name)}</div>
        <div class="tip-sub">${L(rarity(item.rarity))} · ilvl ${item.ilvl}</div>
        ${item.implicit ? `<div class="tip-implicit">${L(item.implicit)}</div>` : ''}
        ${item.fixed ? `<div class="tip-head" style="margin-bottom:4px">${t('tip.fixed')}</div>` : ''}
        <ul>${(item.affixes ?? []).map(a => `<li>${L(a)}</li>`).join('') || `<li class="tip-empty">${t('tip.noAffix')}</li>`}</ul>
        <div class="tip-sins">${sins.length
            ? sins.map(([s, n]) => `<span class="setpoint" style="color:${sinColor(s)};margin-right:4px">${sinName(s)} <b>+${n}</b></span>`).join('')
            : `<span class="tip-empty">${t('tip.zeroSet')}${item.fixed ? t('tip.uniqueTrade') : ''}</span>`}</div>`;
    return c;
}

function bindTip(node, item, equipped) {
    node.onmouseenter = ev => {
        const tip = $('#tooltip');
        tip.innerHTML = '';
        tip.appendChild(tipCard(item, equipped === undefined ? t('tip.equipped') : t('tip.this')));
        if (equipped !== undefined) tip.appendChild(tipCard(equipped, t('tip.equipped')));
        tip.classList.add('show');
        moveTip(ev);
    };
    node.onmousemove = moveTip;
    node.onmouseleave = hideTip;
}

function moveTip(ev) {
    const tip = $('#tooltip');
    const r = tip.getBoundingClientRect();
    let x = ev.clientX + 16, y = ev.clientY + 16;
    if (x + r.width > window.innerWidth - 8) x = ev.clientX - r.width - 16;
    if (y + r.height > window.innerHeight - 8) y = window.innerHeight - r.height - 8;
    tip.style.left = Math.max(8, x) + 'px';
    tip.style.top = Math.max(8, y) + 'px';
}

function hideTip() { $('#tooltip').classList.remove('show'); }

/* ═══════════ 스킬 ═══════════ */

/**
 * 액티브 슬롯 3개 (skill_design §3 / battle_design §5).
 * 슬롯 순서 = 동시 준비 시 우선순위. 순서 변경은 무료.
 * 표기 쿨 옆에 **실효 쿨**을 병기한다 — 안 보이면 재미가 아니라 함정이 된다 (battle_design §6)
 */
function activeSlots(h, title) {
    const cycle = cycleOf(h);
    const p = el('div', 'panel');
    p.appendChild(el('h2', '', `${title ?? t('sk.slots.h')} <small>${t('sk.slots.sub')}</small>`));
    p.appendChild(el('div', 'cycle-line', `
        ${t('sk.cycle')} <b>${t('sk.cycleSec', { s: cycle.toFixed(2) })}</b>
        <span class="muted">${t('sk.cycle.sub')}</span>`));

    const box = el('div', 'slot-list');
    (h.actives ?? [null, null, null]).forEach((a, i) => {
        const row = el('div', `act-slot${a ? '' : ' empty'}`);
        if (!a) {
            row.innerHTML = `<span class="no">${i + 1}</span><span class="muted">${t('sk.emptySlot')}</span>`;
        } else {
            const eff = effectiveCd(a.cd, cycle);
            const loss = (eff - a.cd) / a.cd * 100;
            row.innerHTML = `
                <span class="no">${i + 1}</span>
                <span class="ico">${a.icon}</span>
                <span class="nm">${L(a.name)}
                    <span class="cd">${t('sk.base', { s: a.cd })} · <b class="${loss > 0.5 ? 'down' : 'up'}">${t('sk.eff', { s: eff.toFixed(1) })}</b>
                        ${loss > 0.5 ? `<span class="muted">(+${loss.toFixed(0)}%)</span>` : `<span class="muted">${t('sk.aligned')}</span>`}</span>
                </span>`;
        }
        box.appendChild(row);
    });
    p.appendChild(box);
    p.appendChild(note(t('sk.slots.note')));
    return p;
}

/**
 * 스킬 트리 한 칸 — **정사각형 노드**. 왼쪽 칸이 선행이면 그 사이에 선을 긋는다.
 * 빈 칸은 프레임만 남기고 비워둔다 (기획 미작성 자리).
 */
function skillCell(node, accent) {
    if (!node) return `<div class="sk-cell empty"></div>`;
    const taken = node.r > 0;
    const full = node.r >= node.max;
    const style = taken && accent ? ` style="border-color:${accent}"` : '';
    return `
        <div class="sk-cell${taken ? ' taken' : ''}${full ? ' full' : ''}${node.locked ? ' locked' : ''}"${style}
             title="${L(node.n)} — ${node.r} / ${node.max}${node.locked ? t('sk.lockedSuffix') : ''}">
            <div class="sk-n">${L(node.n)}</div>
            <div class="sk-r">${node.r} / ${node.max}</div>
        </div>`;
}

/** 트리 박스 하나 — 좌상단 라벨 + 3행 × 5열 그리드 */
function skillBox({ tag, title, sub, grid, accent, locked, emptyNote }) {
    const box = el('div', `sk-box${locked ? ' locked' : ''}`);
    const { rows, cols } = M.SKILL_GRID;
    const safe = grid ?? Array.from({ length: rows }, () => Array(cols).fill(null));

    const lines = safe.map(row => {
        const cells = [];
        for (let c = 0; c < cols; c++) {
            cells.push(skillCell(row[c], accent));
            if (c < cols - 1) {
                // 오른쪽 칸이 왼쪽을 선행으로 삼을 때만 선을 긋는다
                const linked = row[c] && row[c + 1]?.link;
                const on = linked && row[c].r > 0;
                cells.push(`<div class="sk-conn${linked ? ' has' : ''}${on ? ' on' : ''}"
                    ${on && accent ? `style="background:${accent}"` : ''}></div>`);
            }
        }
        return `<div class="sk-line">${cells.join('')}</div>`;
    }).join('');

    box.innerHTML = `
        <div class="sk-box-head">
            <span class="sk-tag">${tag}</span>
            <span class="sk-title">${title}</span>
            ${sub ? `<span class="muted sk-sub">${sub}</span>` : ''}
        </div>
        <div class="sk-grid">${lines}</div>
        ${emptyNote ? `<div class="muted sk-note">${emptyNote}</div>` : ''}`;
    return box;
}

function renderSkill(main) {
    const h = heroById(state.heroUid);
    const wrap = el('div', 'cols c-skill');

    const c1 = el('div');
    c1.appendChild(heroPicker());
    const pp = el('div', 'panel');
    pp.appendChild(el('h2', '', t('sk.points.h')));
    pp.appendChild(el('div', '', `
        <div style="font-size:var(--fs-xl);text-align:center;padding:4px 0">
            ${M.SKILL_POINTS.total - M.SKILL_POINTS.spent}
            <span class="muted" style="font-size:var(--fs-sm)">/ ${M.SKILL_POINTS.total}</span>
        </div>
        <div class="muted" style="font-size:var(--fs-xs);line-height:1.6">${t('sk.points.note')}</div>`));
    c1.appendChild(pp);
    c1.appendChild(activeSlots(h));
    wrap.appendChild(c1);

    /* 오른쪽 — 탭을 없애고 세 트리를 **세로로 쌓아 전부 보이게** 한다 (2026-08-22) */
    const c2 = el('div');
    const accent = sinColor(h.sin);
    const advLocked = h.level < M.BALANCE.advance_unlock_level;
    const sin = sinName(h.sin);
    const cls = className(h.cls);

    c2.appendChild(skillBox({
        tag: t('sk.tab1'), title: t('sk.sinTree', { sin }), sub: t('sk.sinTree.sub', { sin }),
        grid: M.SKILL_TREES.sin[h.sin], accent,
        emptyNote: M.SKILL_TREES.sin[h.sin] ? null : t('sk.sinTree.missing', { sin }),
    }));

    c2.appendChild(skillBox({
        tag: t('sk.tab2'), title: t('sk.mastery', { cls }), sub: classLine(h.cls),
        grid: M.SKILL_TREES.mastery[h.cls],
        emptyNote: M.SKILL_TREES.mastery[h.cls] ? null : t('sk.mastery.missing', { cls }),
    }));

    c2.appendChild(skillBox({
        tag: t('sk.tab3'), title: t('sk.advTree'),
        sub: advLocked ? t('sk.advLocked', { lv: M.BALANCE.advance_unlock_level, cur: h.level }) : t('sk.advOpen'),
        grid: null, locked: true,
        emptyNote: L(M.SKILL_TREES.advance.note),
    }));

    c2.appendChild(note(t('sk.grid.note')));

    wrap.appendChild(c2);
    main.appendChild(wrap);
}

/* ═══════════ 선술집 ═══════════ */

function renderTavern(main) {
    const T = M.TAVERN;
    const full = M.HEROES.length >= M.BALANCE.roster_cap;
    const p = el('div', 'panel town-bg');
    p.appendChild(el('h2', '', `${t('tv.h')} <small>${t('tv.sub')}</small>`));

    const grid = el('div', 'cand-grid');
    for (const c of T.candidates) {
        const card = el('div', 'cand-card');
        card.style.borderTopColor = sinColor(c.sin);
        card.innerHTML = `
            <div class="cand-head">
                <b>${L(c.name)}</b>
                ${tierChip(c)}
                <span class="sin-chip" style="color:${sinColor(c.sin)}">${sinName(c.sin)}</span>
                <span class="muted" style="font-size:var(--fs-sm)">${className(c.cls)}</span>
            </div>
            <div class="cand-trait">${t('tv.trait')} · ${L(c.trait)}
                <div class="muted" style="font-size:var(--fs-xs)">${classLine(c.cls)}</div></div>
            <table class="stat-table">
                ${M.STATS.map(s => `<tr><td>${L(s)}</td><td>${c.stats[s.id]}</td></tr>`).join('')}
            </table>
            <div class="cand-cost">
                <span class="muted">${t('tv.hire')}</span>
                <b>${c.cost.toLocaleString()}</b>
                <span class="up" style="font-size:var(--fs-xs)">${t('tv.chaDiscount', { n: c.discount })}</span>
            </div>
            <button class="btn primary" style="width:100%" ${full ? 'disabled' : ''}>${t('tv.recruit')}</button>`;
        grid.appendChild(card);
    }
    p.appendChild(grid);

    p.appendChild(el('div', 'reroll', `
        <button class="btn">${t('tv.reroll')} <span class="muted">${t('tv.goldCost', { n: T.rerollCost.toLocaleString() })}</span></button>
        <span class="muted" style="font-size:var(--fs-xs)">${t('tv.reroll.note')}</span>`));
    p.appendChild(el('div', 'todo', `<b>${t('tv.uniqueTodo.h')}</b>${t('tv.uniqueTodo.b')}`));
    main.appendChild(p);

    const rp = el('div', 'panel');
    const uniqueCount = M.HEROES.filter(h => h.tier === 'unique').length;
    rp.appendChild(el('h2', '', `${t('tv.roster.h')} <small>${t('tv.roster.sub', { n: M.HEROES.length, cap: M.BALANCE.roster_cap, u: uniqueCount })}</small>`));
    const hg = el('div', 'hero-grid');
    for (const h of M.HEROES) {
        const c = el('div', `hero-card${h.tier === 'unique' ? ' unique' : ''}`);
        c.style.borderTopColor = sinColor(h.sin);
        // 로스터 카드의 스탯 한 줄 — 한국어는 짧은 이름, 영어는 약어(STR/AGI…)를 쓴다
        const statline = M.STATS.map(s => `${lang() === 'ko' ? s.ko : s.abbr} ${h.stats[s.id]}`).join(' · ');
        c.innerHTML = `
            <div class="name">
                <b>${L(h.name)}</b>
                ${tierChip(h)}
                <span class="sin-chip" style="color:${sinColor(h.sin)}">${sinName(h.sin)}</span>
                <span class="muted" style="font-size:var(--fs-sm)">${className(h.cls)}</span>
                ${M.PARTY.includes(h.uid) ? `<span class="in-party" style="margin-left:auto">${t('tv.inParty')}</span>` : ''}
            </div>
            <div class="line"><span>Lv.${h.level}</span><span>${h.xp} / ${h.xpNext} XP</span></div>
            <div class="bar xp" style="margin:5px 0 7px"><i style="width:${h.xp / h.xpNext * 100}%"></i></div>
            <div class="line"><span>${t('tv.trait')}</span><span>${L(h.trait)}</span></div>
            <div class="line"><span>${t('eq.passive.h')}</span><span>${h.passive ? L(h.passive.name) : `<span class="muted">${t('tv.noPassive')}</span>`}</span></div>
            ${injured(h) ? `<div style="margin-top:5px">${injuryChip(h)}</div>` : ''}
            <div class="statline">${statline}</div>`;
        c.onclick = () => { state.heroUid = h.uid; state.tab = 'character'; render(); };
        hg.appendChild(c);
    }
    rp.appendChild(hg);
    rp.appendChild(note(t('tv.tiers.note')));
    main.appendChild(rp);
}

/* ═══════════ 도감 ═══════════ */

/** 처치 수 → 넘긴 문턱 개수 */
const milestoneLevel = kills => M.CODEX_MILESTONES.filter(v => kills >= v).length;

/** 몬스터 1종이 지금까지 준 보너스 % (넘긴 문턱들의 합) */
const monsterBonus = kills =>
    M.CODEX_MILESTONE_BONUS.slice(0, milestoneLevel(kills)).reduce((a, b) => a + b, 0);

/** 스테이지 합계 + 완주 여부 (전 몬스터가 마지막 문턱 도달) */
function stageBonus(stage) {
    const total = stage.monsters.reduce((a, m) => a + monsterBonus(m.kills), 0);
    const complete = stage.monsters.every(m => milestoneLevel(m.kills) === M.CODEX_MILESTONES.length);
    return { total, complete };
}

/**
 * 몬스터 카드 — **가로형**. 4스테이지가 한 화면에 들어와야 해서 세로 높이를 줄였다.
 * 얼굴 왼쪽 / 이름·처치 수·문턱을 오른쪽에 쌓는다.
 */
function monsterCard(m, stage) {
    const lv = milestoneLevel(m.kills);
    const maxLv = M.CODEX_MILESTONES.length;
    const next = M.CODEX_MILESTONES[lv];
    const prev = lv > 0 ? M.CODEX_MILESTONES[lv - 1] : 0;
    const pct = next ? Math.min(100, (m.kills - prev) / (next - prev) * 100) : 100;
    const src = M.monsterFace(m.id);
    const name = stage.locked ? '???' : L(M.monsterName(m.id));
    const c = sinColor(M.monsterSin(m.id));

    const faceHtml = stage.locked
        ? `<span class="face unfound">·</span>`
        : src
            ? `<span class="face${m.boss ? ' boss' : ''}"><img src="${src}" alt="${name}" loading="lazy"></span>`
            : `<span class="face none${m.boss ? ' boss' : ''}"
                 style="color:${c};background:${c}22;border-color:${c}66">${name.charAt(0)}</span>`;

    const pips = Array.from({ length: maxLv }, (_, i) =>
        `<span class="pip${i < lv ? ' on' : ''}" title="${t('cx.killsTitle', { n: M.CODEX_MILESTONES[i].toLocaleString() })}"></span>`).join('');

    return `
        <div class="mon-card${m.boss ? ' boss' : ''}${lv === maxLv ? ' maxed' : ''}${stage.locked ? ' locked' : ''}">
            ${faceHtml}
            <div class="mon-body">
                <div class="mon-top">
                    <span class="mon-name">${name}${m.boss ? `<span class="b-tag">${t('kind.boss')}</span>` : ''}</span>
                    <span class="mon-kills"><b>${m.kills.toLocaleString()}</b></span>
                </div>
                <div class="mon-mid">
                    <span class="pips">${pips}</span>
                    <span class="mon-next muted">${stage.locked ? '' : (next
                        ? `${t('cx.next', { n: next.toLocaleString() })} <span class="up">+${M.CODEX_MILESTONE_BONUS[lv]}%</span>`
                        : `<span class="up">${t('cx.max')}</span>`)}</span>
                </div>
                <div class="bar"><i style="width:${pct}%"></i></div>
            </div>
        </div>`;
}

function renderCodex(main) {
    const ch = M.CODEX_CHAPTERS.find(c => c.id === state.codexChapter) ?? M.CODEX_CHAPTERS[0];
    const stages = M.CODEX_STAGES.filter(st => st.chapter === ch.id);

    const p = el('div', 'panel');
    p.appendChild(el('h2', '', `${t('cx.h')} <small>${t('cx.sub', { list: M.CODEX_MILESTONES.map(n => n.toLocaleString()).join(' · ') })}</small>`));

    /* 챕터 탭 — 7챕터 × 4스테이지라 챕터로 끊고, 한 챕터가 한 화면에 들어오게 한다 */
    const bar = el('div', 'sub-bar');
    bar.appendChild(segmented(
        M.CODEX_CHAPTERS.map(c => ({ id: c.id, label: `Ch${c.id} ${L(c.name)}` })),
        ch.id,
        id => { state.codexChapter = id; render(); },
    ));
    bar.appendChild(el('div', 'muted', `<span style="font-size:var(--fs-xs)">
        ${ch.locked
            ? `<span class="down">${t('cx.chLocked')}</span>${t('cx.chLockedTail')}`
            : `${t('cx.sinLabel')} <b style="color:${sinColor(ch.sin)}">${sinName(ch.sin)}</b>`}</span>`));
    p.appendChild(bar);

    for (const stage of stages) {
        const { total, complete } = stageBonus(stage);
        const row = el('div', `codex-stage${stage.locked ? ' locked' : ''}`);
        row.innerHTML = `
            <div class="cs-head">
                <div class="cs-title"><span class="muted">${stage.num}</span> ${L(stage.name)}</div>
                <div class="cs-gain">${stage.locked
                    ? `<span class="muted">${t('cx.locked')}</span>`
                    : `<span class="up">${L(stage.stat)} +${total.toFixed(1)}%</span>
                       <span class="muted"> · ${t('cx.completion')} ${complete
                            ? `<span class="up">${L(stage.completion)}</span>`
                            : L(stage.completion)}</span>`}</div>
            </div>
            <div class="mon-strip">${stage.monsters.map(m => monsterCard(m, stage)).join('')}</div>`;
        p.appendChild(row);
    }

    p.appendChild(note(t('cx.note')));

    main.appendChild(p);
}

render();
