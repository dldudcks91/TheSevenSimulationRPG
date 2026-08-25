/**
 * 화면 렌더러 — DOM만 그린다. 규칙은 game_logic/ 에 있다.
 *
 * 2026-08-25 — 목업에서 **실동작**으로. 이 파일은 상태(G)를 읽고 시스템(SYS)을 부르고 저장(save)할 뿐,
 * 수치를 계산하거나 난수를 굴리지 않는다. 시계(Date.now)는 여기서만 읽어 로직에 `now` 로 넘긴다.
 *
 * i18n 규약 (2026-08-23): **이 파일에 한국어 리터럴을 쓰지 않는다** (주석 제외).
 *   UI 문구 → i18n.js 의 t(key) / 데이터 문자열 → mock.js 의 {ko, en} 쌍을 L() 로 푼다.
 *
 * 화면 흐름: 시작(새 게임 / 이어하기) → 원정(편성 → 관전 → 리포트) ⇄ 캐릭터 / 스킬 / 선술집 / 도감
 *   전투 파티는 한 팀만 운용하므로 원정 탭 하나가 세 상태를 갖는다.
 *
 * 개발용 URL: ?dev=newgame (현재 후보로 즉시 시작) / ?dev=battle (첫 스테이지 1회 즉시 정산 → 리포트) / ?dev=play (첫 스테이지 관전 재생) / ?tab=character 등 (탭 바로 열기) / ?dev=offline (부재 정산 배너)
 */

import * as M from './mock.js';
import { t, L, lang, setLang, applyDocumentLang } from './i18n.js';
import { mountBattle } from './battle.js';
import { D, SYS, loadData } from './data.js';
import { loadSave, writeSave, clearSave } from './storage.js';
import { makeRng } from '../game_logic/rng.js';

const $ = sel => document.querySelector(sel);
const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
};

/* ═══════════ 게임 상태 · 저장 ═══════════ */

let G = null;                          // 세이브의 실체. null 이면 시작 화면
const now = () => Date.now();          // 시계는 UI 층에서만 읽는다
function save() { if (G) writeSave(SYS.game.serialize(G, now())); }

const heroById = uid => G?.heroes.find(h => h.uid === uid);
const itemOf = uid => (uid ? G.items[uid] : null) ?? null;
const wornItems = h => SYS.game.heroItems(G, h);
const combatOf = h => SYS.game.heroCombat(G, h);
const cycleOf = h => combatOf(h).action_period;
const xpNext = h => SYS.hero.xpNeeded(h.level);
const injured = h => G != null && SYS.game.isInjured(h, now());
/* 실효 쿨 = ceil(표기 쿨 ÷ 행동 주기) × 행동 주기 (battle_design §6) */
const effectiveCd = (cd, cycle) => Math.ceil(cd / cycle) * cycle;

const sinColor = id => M.SINS[id]?.color ?? 'var(--text-muted)';
const sinName = id => L(M.SINS[id]) || id;
const rarity = r => M.RARITY[r] ?? M.RARITY.magic;
const tierOf = h => M.HERO_TIER[h.tier] ?? M.HERO_TIER.rare;
const tierChip = h => `<span class="tier-chip" style="color:${tierOf(h).color}" title="${L(tierOf(h).desc)}">${L(tierOf(h))}</span>`;

/** 남은 시간 표기 — 시/분/초 */
function fmtDuration(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return t('time.hm', { h, m });
    if (m > 0) return sec > 0 && m < 10 ? t('time.ms', { m, s: sec }) : t('time.m', { m });
    return t('time.s', { s: sec });
}
const injuryText = h => t('injury.left', { t: fmtDuration(h.injuredUntil - now()) });
const injuryChip = h => injured(h) ? `<span class="injury-chip">${injuryText(h)}</span>` : '';

/* 직업 7종 — id 로 참조, 표시는 L() (hero_design §5) */
const classDef = id => M.CLASSES.find(c => c.id === id);
const className = id => L(classDef(id)) || id;
const classLine = id => { const c = classDef(id); return c ? `${L(c.role)} · ${L(c.weapons)}` : t('class.unassigned'); };
const slotDef = id => M.SLOTS.find(s => s.id === id);
const affixText = a => L(M.affixText(a.stat, a.v));

/* 스테이지 표시 — 수치는 D.stages(stage.csv), 이름은 M.stageName */
const stageTitle = row => `${L(M.chapterOf(row.chapter)?.name)} — ${L(M.stageName(row))}`;
/** 예상 소요 = 라운드별 목표 전투시간 합 (round_budget.csv) */
function stageMinutes(stage) {
    const sec = D.roundTypes.reduce((a, r) => {
        const key = r.round_type === 'boss' ? stage.boss_grade : r.round_type;
        return a + (D.budgets[key]?.time_target_sec ?? 0);
    }, 0);
    return Math.max(1, Math.round(sec / 60));
}

/**
 * 몬스터 얼굴 (src/assets/inherited/faces/). 폴백은 죄종 색 원판 + 이름 이니셜 (faces/README 규격).
 */
const faceChip = (id, extraCls = '') => {
    const src = M.monsterFace(id);
    const name = L(M.monsterName(id));
    if (src) return `<span class="face ${extraCls}" title="${name}"><img src="${src}" alt="${name}" loading="lazy"></span>`;
    const c = sinColor(M.monsterSin(id));
    return `<span class="face none ${extraCls}" title="${t('face.noArt', { name })}"
        style="color:${c};background:${c}22;border-color:${c}66">${name.charAt(0)}</span>`;
};
/** 영웅 초상 — 아직 아트가 없다(M.heroFace 는 전부 null). 폴백 규격은 몬스터와 동일 */
const heroFace = (h, extraCls = '') => {
    const src = M.heroFace(h.uid);
    const name = L(h.name);
    if (src) return `<span class="face ${extraCls}" title="${name}"><img src="${src}" alt="${name}"></span>`;
    const c = sinColor(h.sin);
    return `<span class="face none ${extraCls}" style="color:${c};background:${c}22;border-color:${c}66">${name.charAt(0)}</span>`;
};

/** 접이식 설명 — 기본은 접혀 있고 누르면 펼쳐진다 */
const note = (html, label) => {
    const d = el('details', 'note');
    d.innerHTML = `<summary>${label ?? t('ui.note')}</summary><div class="note-body">${html}</div>`;
    return d;
};

/* ═══════════ 화면 상태 ═══════════ */

const TABS = ['expedition', 'character', 'skill', 'tavern', 'codex'];

/* 시작 파티 후보의 기준 시드 — 고정값이라 같은 리롤 횟수면 언제나 같은 3명 (결정론 확인용).
   마스터 시드(전투·드롭)는 확정 시각으로 찍는다 — 플레이마다 다른 전투, 같은 세이브 안에선 같은 전투. */
const ROLL_SEED = 20260824;

const state = {
    screen: 'start',        // start | game
    tab: 'expedition',
    exp: 'idle',            // idle | battle | report
    heroUid: null,
    codexChapter: 1,
    slotFilter: null,
    roll: 1, candidates: [], confirmOverwrite: false,
    salvageMode: false,
    flash: null,            // {key, params} — 다음 render 한 번만 보인다
    battle: null,           // {result, stageId} — 관전 재생 중인 전투
};
let stopBattle = null;

const rollCandidates = () => SYS.hero.rollStartParty(makeRng(ROLL_SEED + state.roll), D.balance.party_size_max);
const flash = (key, params) => { state.flash = { key, params }; };

/* ═══════════ 셸 ═══════════ */

function renderShell() {
    const pre = state.screen === 'start';
    $('#app').classList.toggle('pregame', pre);

    const nav = $('.nav');
    nav.innerHTML = '';
    if (!pre) for (const id of TABS) {
        const b = el('button', id === state.tab ? 'on' : '', t(`nav.${id}`));
        b.onclick = () => { state.tab = id; render(); };
        nav.appendChild(b);
    }
    if (!pre) {
        // 세이브가 있으면 부팅이 곷장 게임으로 들어오므로, 시작 화면(새 게임·덮어쓰기)으로 돌아가는 문은 여기 하나다
        const nb = el('button', 'b-newgame', t('ng.h'));
        nb.onclick = () => { state.screen = 'start'; state.confirmOverwrite = false; render(); };
        nav.appendChild(nb);
    }

    const r = G?.resources;
    $('.resources').innerHTML = pre || !r ? '' : `
        <span>${t('res.gold')}<b>${r.gold.toLocaleString()}</b></span>
        <span>${t('res.dust')}<b>${r.dust}</b></span>
        <span>${t('res.stigma')}<b>${r.stigma}</b></span>`;

    const langBtn = el('button', 'btn sm lang-btn', t('ui.langBtn'));
    langBtn.onclick = () => { setLang(lang() === 'ko' ? 'en' : 'ko'); render(); };
    $('.resources').appendChild(langBtn);

    $('.crumb').textContent = pre ? t('ng.h') : t(`nav.${state.tab}`);
}

function render() {
    if (stopBattle) { stopBattle(); stopBattle = null; }
    applyDocumentLang();
    if (G) {
        SYS.game.tickInjuries(G, now());
        if (!heroById(state.heroUid)) state.heroUid = G.heroes[0]?.uid ?? null;
    }
    renderShell();
    const main = $('.main');
    main.innerHTML = '';
    if (state.screen === 'start' || !G) renderStart(main);
    else ({
        expedition: renderExpedition,
        character: renderCharacter,
        skill: renderSkill,
        tavern: renderTavern,
        codex: renderCodex,
    })[state.tab](main);
    if (state.flash) {
        main.prepend(el('div', 'flash', t(state.flash.key, state.flash.params)));
        state.flash = null;
    }
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

/* ═══════════ 새 게임 · 이어하기 ═══════════
   랜덤 영웅 3명 + 무제한 리롤 → 확정하면 그 셋이 곧 로스터·파티. 세이브가 있으면 이어하기가 먼저 보인다. */

function startGame() {
    clearSave();
    G = SYS.game.newGame(now() >>> 0, state.candidates, now());
    save();
    state.screen = 'game'; state.tab = 'expedition'; state.exp = 'idle'; state.confirmOverwrite = false;
    render();
}

function continueGame() {
    const saved = loadSave();
    if (!saved) return false;
    try { G = SYS.game.deserialize(saved); }
    catch (e) { console.warn(e); G = null; return false; }
    SYS.game.tickInjuries(G, now());
    if (SYS.game.offlineCatchup(G, now())) save();
    state.screen = 'game'; state.tab = 'expedition'; state.exp = 'idle';
    return true;
}

/** 후보 한 장 — 이 카드가 곧 선택의 전부라 능력치 7종까지 다 편다 */
function candidateCard(h, extra = '') {
    const c = el('div', 'ng-card');
    c.style.borderTopColor = sinColor(h.sin);
    const min = D.balance.hero_attr_min, max = D.balance.hero_attr_max;
    const total = M.STATS.reduce((a, s) => a + h.stats[s.id], 0);
    const bars = M.STATS.map(s => {
        const v = h.stats[s.id];
        const pct = Math.max(0, Math.min(100, (v - min) / (max - min) * 100));
        return `<div class="attr-row">
            <span class="attr-n">${L(s)}<i class="cs-a">${s.abbr}</i></span>
            <span class="attr-bar"><i style="width:${pct}%;background:${sinColor(h.sin)}"></i></span>
            <span class="attr-v">${v}</span>
        </div>`;
    }).join('');
    c.innerHTML = `
        <div class="ng-head">
            ${heroFace(h, 'lg')}
            <div class="ng-id">
                <div class="ng-name"><b>${L(h.name)}</b>${tierChip(h)}</div>
                <div class="ng-cls">${className(h.cls)} · Lv.${h.level}</div>
                <div class="ng-role muted">${classLine(h.cls)}</div>
            </div>
        </div>
        <div class="ng-chips">
            <span class="sin-chip" style="color:${sinColor(h.sin)}">${sinName(h.sin)}</span>
            <span class="setpoint reached" style="color:${sinColor(h.sin)}">
                ${t('eq.set.h')} <b>+1</b><i class="main-sin" title="${t('eq.mainSin')}">★</i></span>
        </div>
        <div class="ng-line"><span>${t('ng.trait')}</span><b>${L(h.trait)}</b></div>
        <div class="attr-list">${bars}</div>
        <div class="ng-line sep"><span>${t('st.maxhp')}</span><b>${D.balance.hero_hp_base}</b></div>
        <div class="ng-line"><span>${t('ng.total')}</span><b>${total}</b></div>
        ${extra}`;
    return c;
}

function renderStart(main) {
    const wrap = el('div', 'ng-wrap');
    const saved = loadSave();

    const head = el('div', 'ng-title');
    head.innerHTML = `<h1>${t('ng.title')}</h1><p class="muted">${t('ng.sub', { n: D.balance.party_size_max })}</p>`;
    wrap.appendChild(head);

    if (saved) {
        const box = el('div', 'ng-continue');
        box.innerHTML = `
            <div class="l">${t('ng.hasSave', { t: new Date(saved.savedAt).toLocaleString() })}
                <small>${t('ng.saveLine', { h: saved.heroes.length, c: saved.progress.cleared.length, g: saved.resources.gold.toLocaleString() })}</small></div>
            <button class="btn primary b-continue">${t('ng.continue')}</button>`;
        box.querySelector('.b-continue').onclick = () => { if (continueGame()) render(); };
        wrap.appendChild(box);
    }

    const row = el('div', 'ng-row');
    for (const h of state.candidates) row.appendChild(candidateCard(h));
    wrap.appendChild(row);

    const actions = el('div', 'ng-actions');
    const reroll = el('button', 'btn', t('ng.reroll'));
    reroll.onclick = () => { state.roll++; state.candidates = rollCandidates(); state.confirmOverwrite = false; render(); };
    // 세이브가 있으면 두 번 눌러야 지운다 — 되돌릴 수 없는 행동은 한 번의 오클릭으로 일어나면 안 된다
    const start = el('button', `btn lg ${saved ? 'danger' : 'primary'}`,
        saved ? t(state.confirmOverwrite ? 'ng.overwriteConfirm' : 'ng.overwrite') : t('ng.start'));
    start.onclick = () => {
        if (saved && !state.confirmOverwrite) { state.confirmOverwrite = true; render(); return; }
        startGame();
    };
    actions.appendChild(el('span', 'ng-count muted', t('ng.roll', { n: state.roll })));
    actions.appendChild(reroll);
    actions.appendChild(start);
    wrap.appendChild(actions);
    wrap.appendChild(el('div', 'muted center', `<div style="font-size:var(--fs-xs);margin-top:8px">${t('ng.startWeapon')}</div>`));

    wrap.appendChild(note(t('ng.note')));
    main.appendChild(wrap);
}

/* ═══════════ 원정 (편성 · 전투 · 리포트) ═══════════ */

/** 원정 1회 — 정산은 즉시, 관전은 재생. instant 면 재생을 건너뛰고 리포트로 */
function runBattle(stageId, { instant = false } = {}) {
    const r = SYS.game.resolveBattle(G, stageId, now());
    if (!r.ok) {
        flash({ locked: 'exp.locked', noParty: 'exp.noParty', injured: 'exp.cantDepart' }[r.err] ?? 'exp.cantDepart');
        state.exp = 'idle'; render(); return;
    }
    save();
    if (instant) { state.battle = null; state.exp = 'report'; render(); return; }
    state.battle = { result: r.result, stageId };
    state.exp = 'battle';
    render();
}

function renderExpedition(main) {
    const bar = el('div', 'sub-bar');
    bar.appendChild(segmented([
        { id: 'idle', label: t('exp.seg.idle') },
        { id: 'battle', label: t('exp.seg.battle'), disabled: !state.battle },
        { id: 'report', label: t('exp.seg.report'), disabled: !G.lastReport },
    ], state.exp, id => { state.exp = id; render(); }));
    bar.appendChild(el('div', 'muted', `<span style="font-size:var(--fs-xs)">${t('exp.oneParty')}</span>`));
    main.appendChild(bar);

    if (state.exp === 'battle' && state.battle) {
        const { result, stageId } = state.battle;
        stopBattle = mountBattle(main, {
            result, stageId, heroes: G.heroes, repeat: G.run?.repeat === true,
            onEnd: auto => {
                if (auto && G.run?.repeat && result.won) runBattle(stageId);
                else { state.exp = 'report'; render(); }
            },
        });
        return;
    }
    if (state.exp === 'report' && G.lastReport) return renderExpReport(main);
    state.exp = 'idle';
    renderExpIdle(main);
}

function heroRow(h, i, inParty) {
    const row = el('div', `party-slot click${injured(h) ? ' downed' : ''}`);
    // 영어는 같은 내용이 1.5배 길다 — 이름 줄 / 죄종·부상 줄로 나눠 300px 열에서도 안 접히게 한다
    row.innerHTML = `
        <div class="ps-main">
            <div class="ps-name">${L(h.name)} ${tierChip(h)} <span class="lv">${className(h.cls)} · Lv.${h.level}</span>
                ${inParty && i === 0 ? `<span class="muted ps-leader">${t('exp.leader')}</span>` : ''}</div>
            <div class="ps-sub"><span class="sin-chip" style="color:${sinColor(h.sin)}">${sinName(h.sin)}</span>${injuryChip(h)}</div>
        </div>
        <button class="btn sm b-toggle" ${!inParty && injured(h) ? 'disabled' : ''}>${t(inParty ? 'exp.fromParty' : 'exp.toParty')}</button>`;
    const toggle = () => {
        const r = SYS.game.toggleParty(G, h.uid, now());
        if (!r.ok) flash({ injured: 'exp.cantDepart', full: 'exp.partyFull' }[r.err] ?? 'exp.partyFull');
        else save();
        render();
    };
    row.onclick = toggle;
    return row;
}

function offlineBanner() {
    const o = G.offline;
    if (!o) return null;
    const box = el('div', 'offline-box');
    const stop = o.stopped === 'limit' || (o.stopped == null)
        ? (o.stopped ? t('exp.offline.stop.limit', { h: D.balance.offline_cap_hours }) : '')
        : t(`exp.offline.stop.${o.stopped}`);
    box.innerHTML = `
        <span class="t">${t('exp.offline.h')}</span>
        <span class="b">${t('exp.offline.body', { n: o.battles, w: o.wins, g: o.gold.toLocaleString(), d: o.dust, x: o.xpEach.toLocaleString(), i: o.drops })}
            ${stop ? `<span class="stop"> · ${stop}</span>` : ''}</span>
        <button class="btn sm b-ok">${t('exp.offline.dismiss')}</button>`;
    box.querySelector('.b-ok').onclick = () => { G.offline = null; save(); render(); };
    return box;
}

function renderExpIdle(main) {
    const ob = offlineBanner();
    if (ob) main.appendChild(ob);

    const wrap = el('div', 'cols c-side');
    const left = el('div');

    /* 파티 — 클릭으로 넣고 뺀다. 부상자는 못 넣는다 */
    const p = el('div', 'panel');
    p.appendChild(el('h2', '', `${t('exp.party.h')} <small>${t('exp.party.sub', { n: D.balance.party_size_max, m: D.balance.concurrent_expedition_parties })}</small>`));
    for (let i = 0; i < D.balance.party_size_max; i++) {
        const h = heroById(G.party[i]);
        if (!h) { p.appendChild(el('div', 'party-slot empty', t('exp.emptySlot'))); continue; }
        p.appendChild(heroRow(h, i, true));
    }
    if (G.party.length === 0) p.appendChild(el('div', 'down', `<div style="font-size:var(--fs-xs);margin-top:8px">${t('exp.noParty')}</div>`));
    else if (G.party.map(heroById).some(injured)) p.appendChild(el('div', 'down', `<div style="font-size:var(--fs-xs);margin-top:8px">${t('exp.cantDepart')}</div>`));
    if (G.run) p.appendChild(repeatRow());
    p.appendChild(note(t('exp.party.note')));
    left.appendChild(p);

    const bench = el('div', 'panel');
    bench.appendChild(el('h2', '', `${t('exp.bench.h')} <small>${t('exp.bench.sub', { n: G.heroes.length, cap: D.balance.roster_cap })}</small>`));
    const benched = G.heroes.filter(h => !G.party.includes(h.uid));
    if (benched.length === 0) bench.appendChild(el('div', 'muted', `<div style="font-size:var(--fs-xs)">${t('exp.emptySlot')}</div>`));
    for (const h of benched) bench.appendChild(heroRow(h, -1, false));
    bench.appendChild(note(t('exp.bench.note')));
    left.appendChild(bench);
    wrap.appendChild(left);

    /* 스테이지 — 해금된 챕터까지 보여주고, 다음 챕터 첫 스테이지는 잠긴 채로 예고 */
    const right = el('div');
    const zp = el('div', 'panel');
    zp.appendChild(el('h2', '', `${t('exp.zones.h')} <small>${t('exp.zones.sub', { r: D.balance.rounds_per_stage })}</small>`));
    const firstLocked = D.stageList.find(s => !SYS.game.stageUnlocked(G, s.stage_id));
    const maxCh = firstLocked ? firstLocked.chapter : D.stageList[D.stageList.length - 1].chapter;
    const rows = D.stageList.filter(s => s.chapter <= maxCh);   // 해금된 챕터는 잠긴 스테이지까지 다 보인다 — 어디까지 가야 하는지가 보여야 한다
    for (const z of rows) {
        const unlocked = SYS.game.stageUnlocked(G, z.stage_id);
        const cleared = G.progress.cleared.includes(z.stage_id);
        const chapterBoss = z.boss_grade === 'chapter_boss';
        const sin = M.chapterOf(z.chapter)?.sin ?? 'wrath';
        const bg = M.stageBgOf(z.stage_id);
        const row = el('div', `zone${unlocked ? '' : ' locked'}${chapterBoss ? ' boss' : ''}`);
        row.style.borderLeftColor = unlocked ? sinColor(sin) : '';
        if (bg) {
            row.style.backgroundImage = `linear-gradient(90deg, var(--bg-tertiary) 34%, rgba(26,26,42,.55) 68%, rgba(26,26,42,.30)), url('${bg}')`;
            row.classList.add('has-bg');
        }
        const pool = SYS.battle.stagePool(z);
        const bossLabel = chapterBoss ? t('kind.chapterBoss') : t('kind.boss');
        const bossTail = chapterBoss ? t('exp.solo') : t('exp.escorts');
        row.innerHTML = `
            <div>
                <div class="title">
                    <span class="sin-chip" style="color:${sinColor(sin)}">${sinName(sin)}</span>
                    <span>Ch${z.chapter}-${z.stage_num} ${L(M.stageName(z))}</span>
                    ${cleared ? `<span class="muted" style="font-size:var(--fs-xs)">${t('exp.cleared')}</span>` : ''}
                </div>
                <div class="meta">${t('exp.stageMeta', { lv: z.dlvl, m: stageMinutes(z) })}</div>
            </div>
            <div>${unlocked
                ? `<button class="btn ${chapterBoss ? 'primary' : ''} b-go">${t('exp.deploy')}</button>`
                : `<span class="muted" style="font-size:var(--fs-sm)">${t('exp.locked')}</span>`}</div>
            <details class="zone-more">
                <summary>${t('exp.viewComp')}</summary>
                <div class="note-body">
                    <div class="face-row">
                        ${pool.map(id => faceChip(id)).join('')}
                        <span class="face-sep">·</span>${faceChip(z.boss_monster_idx, 'boss')}
                        <span class="muted">${pool.map(id => L(M.monsterName(id))).join(', ')}</span>
                    </div>
                    <div class="round-plan">
                        ${D.eliteRounds.map(n => `<span class="rk elite">${t('exp.eliteR', { n })}</span>`).join('')}
                        <span class="rk boss">R${D.bossRound} ${bossLabel} · ${L(M.monsterName(z.boss_monster_idx))}${bossTail}</span>
                    </div>
                </div>
            </details>`;
        const go = row.querySelector('.b-go');
        if (go) go.onclick = () => runBattle(z.stage_id);
        zp.appendChild(row);
    }
    zp.appendChild(note(t('exp.zones.note', { e: D.eliteRounds.join('·'), b: D.bossRound })));
    right.appendChild(zp);
    wrap.appendChild(right);
    main.appendChild(wrap);
}

/** 반복 원정 토글 — 마지막으로 간 스테이지에 붙는다 */
function repeatRow() {
    const row = el('div', 'repeat-row');
    const on = G.run?.repeat === true;
    const stage = D.stages[G.run.stageId];
    row.innerHTML = `
        <button class="btn sm toggle${on ? ' on' : ''}">${t('exp.repeat')}</button>
        <span class="sub">${stage ? `Ch${stage.chapter}-${stage.stage_num} ${L(M.stageName(stage))} · ` : ''}${t('exp.repeat.sub')}</span>`;
    row.querySelector('button').onclick = ev => {
        ev.stopPropagation();
        G.run.repeat = !on; save(); render();
    };
    return row;
}

function renderExpReport(main) {
    const R = G.lastReport;
    const stage = D.stages[R.stageId];
    const verdictCls = R.won ? 'clear' : R.reason === 'timeout' ? 'retreat' : 'lose';
    const verdictText = R.won ? t('rep.clear') : R.reason === 'timeout' ? t('rep.retreat') : t('rep.defeat');
    const roundsDone = R.won ? R.rounds.length : Math.max(0, R.rounds.length - 1);

    const p = el('div', 'panel');
    p.innerHTML = `
        <div class="report-head">
            <span class="verdict ${verdictCls}">${verdictText}</span>
            <span>${stageTitle(stage)}</span>
            <span class="muted">${fmtDuration(R.durationSec * 1000)}${R.won ? '' : ` · ${t(`rep.reason.${R.reason}`)}`}</span>
        </div>
        <div class="gain-row">
            <div><span>${t('res.gold')}</span>${R.gold.toLocaleString()}</div>
            <div><span>${t('res.dust')}</span>${R.dust}</div>
            <div><span>${t('rep.xp')}</span>${t('rep.xpEach', { n: R.xpEach.toLocaleString() })}</div>
            <div><span>${t('rep.rounds')}</span>${t('rep.roundsCleared', { n: roundsDone, total: D.balance.rounds_per_stage })}</div>
            <div><span>${t('rep.downed')}</span>${R.downed.length ? `<span class="down">${t('rep.downedN', { n: R.downed.length })}</span>` : t('rep.none')}</div>
        </div>`;
    for (const lu of R.levelUps) {
        const h = heroById(lu.uid);
        const gains = Object.entries(lu.gains).map(([id, n]) => `${L(M.STATS.find(s => s.id === id))} +${n}`).join(', ') || t('rep.gainsNone');
        p.appendChild(el('div', '', `<div class="up" style="font-size:var(--fs-sm);margin-bottom:8px">
            ${t('rep.levelUp', { name: L(h?.name), a: lu.from, b: lu.to })} &nbsp;<span class="muted">${gains}</span></div>`));
    }
    if (R.downed.length) {
        const inj = el('div', 'injury-box');
        inj.innerHTML = `
            <div class="t">${t('rep.injuryHead')}</div>
            ${R.downed.map(uid => { const h = heroById(uid); return `<div class="r"><span>${L(h?.name)}</span><span class="down">${h && injured(h) ? injuryText(h) : t('rep.none')}</span></div>`; }).join('')}
            <div class="muted" style="font-size:var(--fs-xs);margin-top:6px">${t('rep.injuryNote')}</div>`;
        p.appendChild(inj);
    }
    const actions = el('div', 'report-actions');
    const again = el('button', 'btn primary', t('rep.again'));
    again.onclick = () => runBattle(R.stageId);
    const back = el('button', 'btn', t('rep.toIdle'));
    back.onclick = () => { state.exp = 'idle'; render(); };
    actions.appendChild(again); actions.appendChild(back);
    p.appendChild(actions);
    if (G.run) p.appendChild(repeatRow());
    main.appendChild(p);

    const cols = el('div', 'cols c2');

    const dp = el('div', 'panel');
    dp.appendChild(el('h2', '', `${t('rep.drops.h')} <small>${t('rep.drops.sub', { n: R.drops.length })}</small>`));
    if (R.discarded) dp.appendChild(el('div', 'down', `<div style="font-size:var(--fs-xs);margin-bottom:8px">${t('rep.discarded', { n: R.discarded })}</div>`));
    for (const uid of R.drops) {
        const d = itemOf(uid);
        if (!d) continue;                          // 이미 분해했거나 착용했다
        const row = el('div', 'drop-row');
        row.innerHTML = `
            <div>
                <div style="color:${rarity(d.rarity).color};font-size:var(--fs-sm)">${L(d.name)}</div>
                <div class="muted" style="font-size:var(--fs-xs)">${L(rarity(d.rarity))} · ${L(slotDef(d.slot))} · ilvl ${d.ilvl}</div>
            </div>
            ${G.bag.includes(uid) ? `<button class="btn sm b-salvage">${t('rep.salvage')}</button>` : ''}`;
        bindTip(row, d);
        const sv = row.querySelector('.b-salvage');
        if (sv) sv.onclick = ev => { ev.stopPropagation(); const r = SYS.game.salvage(G, uid); if (r.ok) { flash('ch.salvaged', { n: r.dust }); save(); } render(); };
        dp.appendChild(row);
    }
    cols.appendChild(dp);

    const wp = el('div', 'panel');
    wp.appendChild(el('h2', '', `${t('rep.log.h')} <small>${t('rep.log.sub', { e: D.eliteRounds.join('·'), b: D.bossRound })}</small>`));
    const ul = el('ul', 'wave-log');
    for (const w of R.rounds) {
        const kindTag = w.kind !== 'normal' ? ` <b class="rk ${w.kind === 'normal' ? '' : (w.kind.includes('boss') ? 'boss' : w.kind)}">${t(`kind.${w.kind === 'stage_boss' || w.kind === 'chapter_boss' ? 'boss' : w.kind}`)}</b>` : '';
        const counts = {};
        for (const id of w.killed) counts[id] = (counts[id] ?? 0) + 1;
        const list = Object.entries(counts).map(([id, n]) => `${L(M.monsterName(Number(id)))}${n > 1 ? ` ×${n}` : ''}`).join(', ');
        ul.appendChild(el('li', `r-${w.kind.includes('boss') ? 'boss' : w.kind}`, `
            <span>R${w.n}${kindTag}</span>
            <span>${list ? t('rep.roundLine', { list }) : t('rep.roundNone')}</span>
            <span>${w.eliteSin ? `<span class="sin-chip" style="color:${sinColor(w.eliteSin)}">${sinName(w.eliteSin)}</span>` : ''}</span>`));
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
    for (const x of G.heroes) {
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
   세로 3단: ① 영웅 띠 ② 장비 / 전체 능력치 / 세부 능력치 / 현재 스킬 ③ 아이템(가로 전폭).
   장착·해제·분해가 여기서 실제로 일어난다. */

function heroStrip() {
    const p = el('div', 'panel');
    p.appendChild(el('h2', '', `${t('ch.roster.h')} <small>${t('ch.roster.sub', { n: G.heroes.length, cap: D.balance.roster_cap })}</small>`));
    const strip = el('div', 'hero-strip');
    for (const h of G.heroes) {
        const c = el('div', `hs-card${h.uid === state.heroUid ? ' on' : ''}${h.tier === 'unique' ? ' unique' : ''}${injured(h) ? ' downed' : ''}`);
        c.style.borderTopColor = sinColor(h.sin);
        c.innerHTML = `
            <div class="hs-top">
                ${heroFace(h, 'lg')}
                <span class="sin-chip" style="color:${sinColor(h.sin)}">${sinName(h.sin)}</span>
            </div>
            <div class="hs-name"><b>${L(h.name)}</b>${tierChip(h)}</div>
            <div class="hs-cls">${className(h.cls)} · Lv.${h.level}</div>
            <div class="bar xp"><i style="width:${h.xp / xpNext(h) * 100}%"></i></div>
            <div class="hs-foot">
                ${G.party.includes(h.uid) ? `<span class="in-party">${t('tv.inParty')}</span>` : ''}
                ${injured(h) ? injuryChip(h) : ''}
            </div>`;
        c.onclick = () => { state.heroUid = h.uid; render(); };
        strip.appendChild(c);
    }
    for (let i = G.heroes.length; i < D.balance.roster_cap; i++) strip.appendChild(el('div', 'hs-card empty', '<span>+</span>'));
    p.appendChild(strip);
    return p;
}

/** 페이퍼돌 — 신체 위치대로 8부위. 착용 칸을 누르면 벗는다 */
function paperdoll(h) {
    const box = el('div', 'paperdoll');
    const twoHanded = itemOf(h.equipped.weapon)?.twoHanded === true;
    for (const row of M.PAPERDOLL) {
        for (const slotId of row) {
            if (!slotId) { box.appendChild(el('div', 'pd-gap')); continue; }
            const def = slotDef(slotId);
            const it = itemOf(h.equipped[slotId]);
            const locked = slotId === 'offhand' && twoHanded;
            const cell = el('div', `pd-cell${it ? ' filled' : ''}${locked ? ' locked' : ''}`);
            if (it) cell.style.borderColor = rarity(it.rarity).color;
            cell.innerHTML = `<div class="pd-icon">${def.icon}</div><div class="pd-label">${locked ? t('pd.twoHand') : L(def)}</div>`;
            if (it) {
                bindTip(cell, it);
                cell.onclick = () => {
                    const r = SYS.game.unequip(G, h.uid, slotId);
                    if (!r.ok) flash(`ch.err.${r.err}`); else save();
                    render();
                };
            }
            box.appendChild(cell);
        }
    }
    return box;
}

function gearPanel(h) {
    const p = el('div', 'panel');
    const worn = wornItems(h);
    p.appendChild(el('h2', '', `${t('ch.gear.h')} <small>${t('eq.equipped', { n: worn.length })}</small>`));
    p.appendChild(paperdoll(h));
    if (itemOf(h.equipped.weapon)?.twoHanded) p.appendChild(el('div', 'muted pd-foot', t('eq.twoHand')));

    const bpMax = M.BREAKPOINTS[M.BREAKPOINTS.length - 1];
    p.appendChild(el('div', 'sub-h', `${t('eq.set.h')} <span class="muted">${t('eq.set.sub', { list: M.BREAKPOINTS.join(' / '), max: bpMax })}</span>`));
    const entries = Object.entries(SYS.game.setPoints(G, h)).sort((a, b) => b[1] - a[1]);
    const chips = el('div', 'setpoints');
    for (const [sin, pts] of entries) {
        const chip = el('span', `setpoint ${pts >= M.BREAKPOINTS[0] ? 'reached' : ''}`);
        chip.style.color = sinColor(sin);
        chip.innerHTML = `${sinName(sin)} <b>${pts}</b>${sin === h.sin ? `<i class="main-sin" title="${t('eq.mainSin')}">★</i>` : ''}`;
        chips.appendChild(chip);
    }
    p.appendChild(chips);
    const detail = entries.map(([sin, pts]) => `<div class="bp-block">${M.BREAKPOINTS.map(b => {
        const on = pts >= b;
        return `<div style="color:${on ? sinColor(sin) : 'var(--text-muted)'}">${on ? '●' : '○'} ${sinName(sin)} ${b} — ${L(M.SET_BONUSES[sin]?.[b]) ?? ''}</div>`;
    }).join('')}</div>`).join('');
    p.appendChild(note(detail + t('eq.set.note', { max: bpMax }), t('eq.set.h')));
    return p;
}

function attrPanel(h) {
    const p = el('div', 'panel');
    p.appendChild(el('h2', '', `${t('ch.attr.h')} <small>${t('ch.attr.sub')}</small>`));
    const min = D.balance.hero_attr_min, max = D.balance.hero_attr_max;
    const box = el('div', 'attr-list');
    box.innerHTML = M.STATS.map(s => {
        const v = h.stats[s.id];
        const pct = Math.max(0, Math.min(100, (v - min) / (max - min) * 100));
        return `<div class="attr-row">
            <span class="attr-n">${L(s)}<i class="cs-a">${s.abbr}</i></span>
            <span class="attr-bar"><i style="width:${pct}%;background:${sinColor(h.sin)}"></i></span>
            <span class="attr-v">${v}</span></div>`;
    }).join('') + `<div class="attr-range muted">${t('ch.attr.range', { min, max })}</div>`;
    p.appendChild(box);

    const c = combatOf(h);
    const tbl = el('table', 'stat-table');
    tbl.innerHTML = `
        <tr class="sep"><td>${t('st.atk')}</td><td>${c.attack_type === 'magic' ? c.atk_magic : c.atk_physical}</td></tr>
        <tr><td>${t('st.def')}</td><td>${c.defense}</td></tr>
        <tr><td>${t('st.maxhp')}</td><td>${c.hp_max}</td></tr>
        <tr><td>${t('sk.cycle')}</td><td>${t('sk.cycleSec', { s: c.action_period.toFixed(2) })}</td></tr>`;
    p.appendChild(tbl);
    p.appendChild(note(t('ch.attr.note')));
    return p;
}

/** 전투 능력치 표기 — 단위 붙이기는 여기 한 곳에서만 */
const fmtCombat = (def, v) => v === undefined ? '—'
    : def.fmt === 'pct' ? `${Math.round(v * 10) / 10}%`
    : def.fmt === 'sec' ? t('sk.cycleSec', { s: v.toFixed(2) })
    : String(v);

function detailPanel(h) {
    const c = combatOf(h);
    const filled = M.COMBAT_STATS.filter(s => c[s.id] !== undefined).length;
    const p = el('div', 'panel');
    p.appendChild(el('h2', '', `${t('ch.detail.h')} <small>${t('ch.detail.sub', { n: filled, total: M.COMBAT_STATS.length })}</small>`));
    const scroll = el('div', 'cs-scroll');
    scroll.innerHTML = M.COMBAT_CATS.map(cat => {
        const rows = M.COMBAT_STATS.filter(s => s.cat === cat.id);
        if (!rows.length) return '';
        return `<div class="cs-cat">${L(cat)}</div>` + rows.map(s => {
            const has = c[s.id] !== undefined;
            const a = s.attr ? M.STATS.find(x => x.id === s.attr) : null;
            return `<div class="cs-row${has ? '' : ' off'}">
                <span class="cs-n">${L(s)}${a ? `<i class="cs-a" title="${L(a)}">${a.abbr}</i>` : ''}</span>
                <span class="cs-v">${fmtCombat(s, c[s.id])}</span></div>`;
        }).join('');
    }).join('');
    p.appendChild(scroll);
    p.appendChild(note(t('ch.detail.note')));
    return p;
}

function currentSkillPanel(h) {
    const p = activeSlots(h, t('ch.skill.h'));
    const go = el('button', 'btn sm go-tree', t('ch.skill.go'));
    go.onclick = () => { state.tab = 'skill'; render(); };
    p.appendChild(go);
    return p;
}

/** ③ 아이템 — 가방. 클릭 = 착용(분해 모드면 분해). 열 수는 창 폭이 정한다 */
function itemsPanel(h) {
    const p = el('div', 'panel');
    const bagItems = G.bag.map(itemOf).filter(Boolean);
    const items = bagItems.filter(i => !state.slotFilter || i.slot === state.slotFilter);
    p.appendChild(el('h2', '', `${t('ch.items.h')} <small>${t('ch.items.sub', { n: G.bag.length, cap: D.balance.inventory_cap })}</small>`));

    const tools = el('div', 'items-tools');
    const filter = el('div', 'segmented');
    for (const f of [{ id: null, label: t('eq.filter.all') }, ...M.SLOTS.map(s => ({ id: s.id, label: s.icon, title: L(s) }))]) {
        const b = el('button', `btn sm${state.slotFilter === f.id ? ' on' : ''}`, f.label);
        if (f.title) b.title = f.title;
        b.onclick = () => { state.slotFilter = f.id; render(); };
        filter.appendChild(b);
    }
    tools.appendChild(filter);
    const sv = el('button', `btn sm toggle${state.salvageMode ? ' on' : ''}`, t('ch.salvageMode'));
    sv.onclick = () => { state.salvageMode = !state.salvageMode; render(); };
    tools.appendChild(sv);
    tools.appendChild(el('span', 'hint', t(state.salvageMode ? 'ch.salvageHint' : 'ch.equip.hint')));
    p.appendChild(tools);

    const grid = el('div', `inv-cells wide${state.salvageMode ? ' salvage' : ''}`);
    for (let i = 0; i < D.balance.inventory_cap; i++) {
        const it = items[i];
        const cell = el('div', `inv-cell${it ? ' filled' : ''}`);
        if (it) {
            cell.style.borderColor = rarity(it.rarity).color;
            cell.innerHTML = `<span class="inv-icon">${slotDef(it.slot).icon}</span>`;
            if (it.rarity === 'unique') cell.classList.add('shine');
            bindTip(cell, it, itemOf(h.equipped[it.slot]));
            cell.onclick = () => {
                if (state.salvageMode) {
                    const r = SYS.game.salvage(G, it.uid);
                    if (r.ok) { flash('ch.salvaged', { n: r.dust }); save(); }
                } else {
                    const r = SYS.game.equip(G, h.uid, it.uid);
                    if (!r.ok) flash(`ch.err.${r.err}`); else save();
                }
                render();
            };
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
    const sub = [L(rarity(item.rarity)), L(slotDef(item.slot)), `ilvl ${item.ilvl}`];
    if (item.cls) sub.push(t('ch.weaponOf', { cls: className(item.cls) }));
    if (item.twoHanded) sub.push(t('pd.twoHand'));
    c.innerHTML = `
        <div class="tip-head">${headText}</div>
        <div class="tip-name" style="color:${rarity(item.rarity).color}">${L(item.name)}</div>
        <div class="tip-sub">${sub.join(' · ')}</div>
        ${item.watk ? `<div class="tip-implicit">${t('st.atk')} ${item.watk} · ${t('sk.cycleSec', { s: item.period.toFixed(2) })}</div>` : ''}
        ${item.implicit ? `<div class="tip-implicit">${affixText(item.implicit)}</div>` : ''}
        <ul>${(item.affixes ?? []).map(a => `<li>${affixText(a)}</li>`).join('') || `<li class="tip-empty">${t('tip.noAffix')}</li>`}</ul>
        <div class="tip-sins">${sins.length
            ? sins.map(([s, n]) => `<span class="setpoint" style="color:${sinColor(s)};margin-right:4px">${sinName(s)} <b>+${n}</b></span>`).join('')
            : `<span class="tip-empty">${t('tip.zeroSet')}</span>`}</div>`;
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
 * 액티브 슬롯 3개 (skill_design §3 / battle_design §5). 아직 스킬이 없어 전부 빈 슬롯이다 — 구조만 보인다.
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
        if (!a) row.innerHTML = `<span class="no">${i + 1}</span><span class="muted">${t('sk.emptySlot')}</span>`;
        else {
            const eff = effectiveCd(a.cd, cycle);
            const loss = (eff - a.cd) / a.cd * 100;
            row.innerHTML = `
                <span class="no">${i + 1}</span><span class="ico">${a.icon}</span>
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

function skillBox({ tag, title, sub, grid, accent, locked, emptyNote }) {
    const box = el('div', `sk-box${locked ? ' locked' : ''}`);
    const { rows, cols } = M.SKILL_GRID;
    const safe = grid ?? Array.from({ length: rows }, () => Array(cols).fill(null));
    const lines = safe.map(row => {
        const cells = [];
        for (let c = 0; c < cols; c++) {
            cells.push(skillCell(row[c], accent));
            if (c < cols - 1) {
                const linked = row[c] && row[c + 1]?.link;
                const on = linked && row[c].r > 0;
                cells.push(`<div class="sk-conn${linked ? ' has' : ''}${on ? ' on' : ''}" ${on && accent ? `style="background:${accent}"` : ''}></div>`);
            }
        }
        return `<div class="sk-line">${cells.join('')}</div>`;
    }).join('');
    box.innerHTML = `
        <div class="sk-box-head">
            <span class="sk-tag">${tag}</span><span class="sk-title">${title}</span>
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
    const points = h.level - 1;     // 레벨당 1 — 트리가 목업이라 아직 쓸 곳이 없다
    pp.appendChild(el('h2', '', t('sk.points.h')));
    pp.appendChild(el('div', '', `
        <div style="font-size:var(--fs-xl);text-align:center;padding:4px 0">${points}
            <span class="muted" style="font-size:var(--fs-sm)">/ ${points}</span></div>
        <div class="muted" style="font-size:var(--fs-xs);line-height:1.6">${t('sk.points.note')}<br>${t('ch.noTrees')}</div>`));
    c1.appendChild(pp);
    c1.appendChild(activeSlots(h));
    wrap.appendChild(c1);

    const c2 = el('div');
    const accent = sinColor(h.sin);
    const advLocked = h.level < D.balance.advance_unlock_level;
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
        sub: advLocked ? t('sk.advLocked', { lv: D.balance.advance_unlock_level, cur: h.level }) : t('sk.advOpen'),
        grid: null, locked: true,
        emptyNote: L(M.SKILL_TREES.advance.note),
    }));
    c2.appendChild(note(t('sk.grid.note')));
    wrap.appendChild(c2);
    main.appendChild(wrap);
}

/* ═══════════ 선술집 ═══════════ */

function renderTavern(main) {
    const B = D.balance;
    const full = G.heroes.length >= B.roster_cap;
    const p = el('div', 'panel town-bg');
    p.appendChild(el('h2', '', `${t('tv.h')} <small>${t('tv.sub')}</small>`));

    const grid = el('div', 'tv-cands');
    SYS.game.tavernCandidates(G).forEach((c, i) => {
        const card = candidateCard(c, `<button class="btn primary sm b-hire" ${full || G.resources.gold < B.tavern_hire_cost ? 'disabled' : ''}>${t('tv.hire', { g: B.tavern_hire_cost.toLocaleString() })}</button>`);
        card.querySelector('.b-hire').onclick = () => {
            const r = SYS.game.hire(G, i);
            if (r.ok) { flash('tv.hired', { name: L(r.hero.name) }); save(); }
            else flash(r.err === 'roster' ? 'tv.err.roster' : 'tv.err.gold', { cap: B.roster_cap });
            render();
        };
        grid.appendChild(card);
    });
    p.appendChild(grid);

    const tools = el('div', 'tv-tools');
    const rr = el('button', 'btn', t('tv.reroll', { g: B.tavern_reroll_cost.toLocaleString() }));
    rr.disabled = G.resources.gold < B.tavern_reroll_cost;
    rr.onclick = () => { const r = SYS.game.tavernReroll(G); if (!r.ok) flash('tv.err.gold'); else save(); render(); };
    tools.appendChild(rr);
    tools.appendChild(el('span', 'muted', `<span style="font-size:var(--fs-xs)">${t('tv.reroll.note')}</span>`));
    p.appendChild(tools);
    p.appendChild(el('div', 'todo', `<b>${t('tv.uniqueTodo.h')}</b>${t('tv.uniqueTodo.b')}`));
    main.appendChild(p);

    const rp = el('div', 'panel');
    const uniqueCount = G.heroes.filter(h => h.tier === 'unique').length;
    rp.appendChild(el('h2', '', `${t('tv.roster.h')} <small>${t('tv.roster.sub', { n: G.heroes.length, cap: B.roster_cap, u: uniqueCount })}</small>`));
    const hg = el('div', 'hero-grid');
    for (const h of G.heroes) {
        const c = el('div', `hero-card${h.tier === 'unique' ? ' unique' : ''}`);
        c.style.borderTopColor = sinColor(h.sin);
        const statline = M.STATS.map(s => `${lang() === 'ko' ? s.ko : s.abbr} ${h.stats[s.id]}`).join(' · ');
        c.innerHTML = `
            <div class="name">
                <b>${L(h.name)}</b>${tierChip(h)}
                <span class="sin-chip" style="color:${sinColor(h.sin)}">${sinName(h.sin)}</span>
                <span class="muted" style="font-size:var(--fs-sm)">${className(h.cls)}</span>
                ${G.party.includes(h.uid) ? `<span class="in-party" style="margin-left:auto">${t('tv.inParty')}</span>` : ''}
            </div>
            <div class="line"><span>Lv.${h.level}</span><span>${h.xp} / ${xpNext(h)} XP</span></div>
            <div class="bar xp" style="margin:5px 0 7px"><i style="width:${h.xp / xpNext(h) * 100}%"></i></div>
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

const milestoneLevel = kills => M.CODEX_MILESTONES.filter(v => kills >= v).length;
const monsterBonus = kills => M.CODEX_MILESTONE_BONUS.slice(0, milestoneLevel(kills)).reduce((a, b) => a + b, 0);
function stageBonus(stage) {
    const total = stage.monsters.reduce((a, m) => a + monsterBonus(m.kills), 0);
    const complete = stage.monsters.every(m => milestoneLevel(m.kills) === M.CODEX_MILESTONES.length);
    return { total, complete };
}

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
            : `<span class="face none${m.boss ? ' boss' : ''}" style="color:${c};background:${c}22;border-color:${c}66">${name.charAt(0)}</span>`;
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
    // 처치 수는 실집계(G.codexKills), 잠금은 스테이지 해금 상태에서 온다
    const stages = M.CODEX_STAGES.filter(st => st.chapter === ch.id).map(st => ({
        ...st, locked: !SYS.game.stageUnlocked(G, st.id),
        monsters: st.monsters.map(m => ({ ...m, kills: G.codexKills[m.id] ?? 0 })),
    }));
    const chLocked = stages.every(st => st.locked);

    const p = el('div', 'panel');
    p.appendChild(el('h2', '', `${t('cx.h')} <small>${t('cx.sub', { list: M.CODEX_MILESTONES.map(n => n.toLocaleString()).join(' · ') })}</small>`));
    const bar = el('div', 'sub-bar');
    bar.appendChild(segmented(M.CODEX_CHAPTERS.map(c => ({ id: c.id, label: `Ch${c.id} ${L(c.name)}` })), ch.id,
        id => { state.codexChapter = id; render(); }));
    bar.appendChild(el('div', 'muted', `<span style="font-size:var(--fs-xs)">
        ${chLocked
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
                       <span class="muted"> · ${t('cx.completion')} ${complete ? `<span class="up">${L(stage.completion)}</span>` : L(stage.completion)}</span>`}</div>
            </div>
            <div class="mon-strip">${stage.monsters.map(m => monsterCard(m, stage)).join('')}</div>`;
        p.appendChild(row);
    }
    p.appendChild(note(t('cx.note')));
    main.appendChild(p);
}

/* ═══════════ 부팅 ═══════════ */

async function boot() {
    await loadData();
    state.candidates = rollCandidates();
    if (loadSave()) continueGame();

    // 개발용 — 헤드리스 검증에서 클릭 없이 흐름을 태운다
    const dev = new URLSearchParams(location.search).get('dev');
    const tab = new URLSearchParams(location.search).get('tab');
    if (TABS.includes(tab)) state.tab = tab;
    if (new URLSearchParams(location.search).get('screen') === 'start') state.screen = 'start';
    if (dev === 'newgame' || (dev === 'battle' && !G)) startGame();
    if (dev === 'battle') runBattle(D.stageOrder[0], { instant: true });
    if (dev === 'play') { if (!G) startGame(); runBattle(D.stageOrder[0]); return; }
    if (dev === 'offline') {   // 반복을 켜고 30분 전에 떠난 것처럼 — 부재 정산 배너 확인용
        if (!G) startGame();
        if (!G.run) SYS.game.resolveBattle(G, D.stageOrder[0], now() - 31 * 60000);
        for (const h of G.heroes) h.injuredUntil = null;
        G.run.repeat = true; G.run.lastAt = now() - 30 * 60000;
        SYS.game.offlineCatchup(G, now()); save();
    }
    render();
}

boot().catch(e => {
    console.error(e);
    $('.main').innerHTML = `<div class="panel"><div class="down">${String(e)}</div></div>`;
});
