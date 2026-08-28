/**
 * 전투 관전 화면 — **재생기**. 전투는 game_logic/battle.js 가 이미 끝까지 계산했고,
 * 여기서는 그 타임라인을 시간에 맞춰 화면에 옮길 뿐이다.
 *   · 관전으로 본 전투와 즉시 정산(건너뛰기·부재 정산)이 갈릴 수 없다 — 같은 결과를 보는 두 창구다
 *   · 배속·일시정지·건너뛰기는 재생 속도의 문제지 결과의 문제가 아니다
 *   · 언어를 바꿔도 같은 타임라인을 다시 재생한다
 *
 * 배치: 적(위) / 파티(아래) 상하 대치 — 가로형 카드가 진영마다 한 줄로 나란히 + 우측 탭(전투 로그 / 누적 데미지) + 아레나 아래 가방(app.js 가 붙인다) (2026-08-27).
 * 로그는 모든 타격을 적는다(누가 → 누구 · 피해 · 쓴 스킬). 누적 데미지는 이벤트의 dmg 를 더한 표시값이다 — 정산이 아니다.
 * 재렌더에도 재생이 이어진다 — 정리 함수가 재생 위치 {t, speed, running, tab} 를 돌려주고, 다음 mount 가 opts.resume 으로 받아
 *   그 시각까지 팝업 없이 되감는다 (catchUp).
 * 유닛 카드는 위칸 + 가로형 본문 — 위칸은 영웅 띠와 같은 배치(왼쪽 태그 / **오른쪽 이름**), 본문은 왼쪽 초상(영웅 띠와 같은 얼굴 그림)과
 *   오른쪽 HP(수치는 바 가운데) / 행동 게이지 / 스킬 쿨 3줄. **카드 크기는 몬스터·영웅·보스가 전부 같은 고정값**이다 (2026-08-27, SCREEN_DESIGN §4-2).
 * 스킬 쿨은 **가로 3칸 아이콘**이다 — 이름도 % 도 찍지 않고 툴팁이 든다. 남은 쿨은 아이콘을 덮은 판이 걷히며 보여주고,
 *   **발동한 칸은 튀면서 스킬 이름이 초상 위로 떠오른다** (2026-08-27 — 「방금 뭘 썼나」는 게이지가 아니라 팝업이 답한다).
 * 올려놓으면 툴팁 — 카드는 영웅 기본 능력치, 스킬 칸은 그 스킬의 이름 · 표기/실효 쿨 · 설명 (2026-08-28, ui/tip.js).
 * 스킬 쿨 게이지는 **목업** — 스킬 미작성이라 타임라인에 스킬 이벤트가 없다. 영웅의 실제 행동 이벤트마다 슬롯 순으로 준비된 것 하나를
 *   "쓴" 것처럼 리셋만 한다 (mockUseSkill · DEV_PLAN 부채 #13). 결과에는 아무 영향이 없다.
 * 행동 게이지 = 마지막 행동 이후 경과 ÷ 행동 주기. 스킬 쿨 게이지 자리는 남겨 두되 아직 비어 있다(스킬 미작성).
 *
 * i18n: 표시 문자열은 전부 t()/L() — 이 파일에 한국어 리터럴은 없다 (주석 제외).
 */

import * as M from './mock.js';
import { D, monsterName, monsterFace, monsterSin, stageName, stageBgOf, chapterOf, eliteName } from './data.js';
import { t, L } from './i18n.js';
import { bindTipNode, heroTipCard, skillTipCard } from './tip.js';

const SPEEDS = [1, 2, 4];
const TICK = 0.1;

const kindLabel = k => t(`kind.${k}`);
const clamp01 = v => Math.max(0, Math.min(1, v));
const clock = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * @param container  붙일 곳
 * @param opts { result, stageId, heroes: [hero...], repeat: bool, onEnd(auto) }
 *   result = game_logic 전투 결과 (timeline 포함). onEnd 는 재생이 끝나고 사용자가 넘어갈 때 / 반복 자동 진행 시.
 * @returns 정리 함수
 */
export function mountBattle(container, opts) {
    const { result, stageId, heroes, resume } = opts;
    const stage = D.stages[stageId];
    const state = {
        t: 0, idx: 0, speed: resume?.speed ?? 1, running: resume?.running ?? true, ended: false,
        round: 0, timer: null, timeouts: [],
        units: new Map(), party: [], enemies: [],
        dmg: new Map(),          // 누적 데미지 — 이벤트의 dmg 를 더할 뿐 (표시값)
        catchUp: false,          // 재개 되감기 중 — 팝업을 띄우지 않는다
        tab: resume?.tab ?? 'log',
    };

    // 파티 유닛 — 결과의 party 정보 + 로스터의 표시 정보(이름·죄종·직업)
    state.party = result.party.map(p => {
        const h = heroes.find(x => x.uid === p.uid);
        return {
            key: p.key, side: 'party', name: h?.name, sin: h?.sin, cls: h?.cls, hero: h,   // hero — 툴팁이 기본 능력치를 읽는다 (2026-08-28)
            hp: p.hpMax, hpMax: p.hpMax, period: p.period, lastAct: -p.period, node: null,
            glyph: M.classGlyph(h?.cls),   // 글리프 표는 mock.js 한 곳 — 영웅 띠·후보 카드와 같은 얼굴
            skills: M.mockActives(h?.cls).map(s => ({ ...s, readyAt: 0 })),   // 쿨 게이지 목업 (부채 #13)
        };
    });
    for (const u of state.party) { state.units.set(u.key, u); dmgEntry(state, u); }   // 파티는 0 이어도 누적 표에 찍는다

    container.appendChild(buildDom(state, stage, stageId));
    bindControls(state, container, opts);
    // t=0 의 이벤트(첫 라운드 편성)를 먼저 적용해서 첫 프레임부터 적이 서 있게 한다.
    // 재개(resume)면 그 시각까지 조용히 되감는다 — 팝업 없이. 로그·게이지·누적은 다시 쌓인다 (2026-08-27)
    if (resume) { state.t = resume.t; state.catchUp = true; }
    drain(state, container, opts);
    state.catchUp = false;
    if (!state.ended) start(state, container, opts);
    renderDmg(state, container);

    // 정리 함수 — 재생 위치를 돌려준다. 렌더러가 state.battle.resume 에 담아 다음 mount 에 넘기면 이어서 재생된다
    return () => {
        clearInterval(state.timer); state.timer = null;
        for (const id of state.timeouts) clearTimeout(id);
        return { t: state.t, speed: state.speed, running: state.running, tab: state.tab };
    };
}

/* ───────── 구성 ───────── */

function buildDom(state, stage, stageId) {
    const wrap = document.createElement('div');
    wrap.className = 'panel battle-panel';
    const bg = stageBgOf(stageId);
    const rounds = D.balance.rounds_per_stage;
    const kindOf = n => D.roundTypes.find(r => r.round_num === n)?.round_type ?? 'normal';
    wrap.innerHTML = `
        <div class="battle-head">
            <div>
                <div>${L(chapterOf(stage.chapter)?.name)} — ${L(stageName(stage))}</div>
                <div class="muted" style="font-size:var(--fs-sm)">
                    ${t('bt.round')} <b class="b-round">1</b> / ${rounds}
                    <span class="rk b-kind"></span>
                    &nbsp;·&nbsp; <span class="b-clock">00:00</span>
                </div>
                <div class="round-track">${
                    Array.from({ length: rounds }, (_, i) => {
                        const n = i + 1, k = kindOf(n);
                        return `<span class="rt ${k}" data-n="${n}" title="${t('bt.rTitle', { n, kind: kindLabel(k) })}">${n}</span>`;
                    }).join('')
                }</div>
            </div>
            <div class="battle-ctrl">
                ${SPEEDS.map(s => `<button class="btn sm b-speed" data-s="${s}">${t('bt.speed', { n: s })}</button>`).join('')}
                <button class="btn sm b-pause">${t('bt.pause')}</button>
                <button class="btn sm b-skip">${t('bt.skip')}</button>
            </div>
        </div>
        <div class="battle-body">
            <div class="arena${bg ? ' has-bg' : ''}"${bg
                ? ` style="background-image:linear-gradient(rgba(10,10,18,.42),rgba(10,10,18,.78)),url('${bg}')"`
                : ''}>
                <div class="side side-enemy"></div>
                <div class="divider"><span class="muted">VS</span></div>
                <div class="side side-party"></div>
                <div class="battle-result"></div>
            </div>
            <div class="battle-side">
                <div class="segmented side-tabs">
                    <button class="btn sm b-tab" data-tab="log">${t('bt.log.h')}</button>
                    <button class="btn sm b-tab" data-tab="dmg">${t('bt.tab.dmg')}</button>
                </div>
                <div class="battle-log-wrap pane"><ul class="battle-log"></ul></div>
                <div class="battle-dmg-wrap pane" hidden></div>
            </div>
        </div>`;
    return wrap;
}

function bindControls(state, root, opts) {
    root.querySelectorAll('.b-speed').forEach(b => {
        b.onclick = () => {
            state.speed = Number(b.dataset.s);
            root.querySelectorAll('.b-speed').forEach(x => x.classList.toggle('on', x === b));
            if (!state.ended) start(state, root, opts);
        };
    });
    root.querySelector(`.b-speed[data-s="${state.speed}"]`)?.classList.add('on');
    const pause = root.querySelector('.b-pause');
    pause.textContent = state.running ? t('bt.pause') : t('bt.resume');
    pause.onclick = () => {
        state.running = !state.running;
        pause.textContent = state.running ? t('bt.pause') : t('bt.resume');
    };
    // 우측 탭 — 로그 / 누적 데미지
    root.querySelectorAll('.b-tab').forEach(b => {
        b.onclick = () => { state.tab = b.dataset.tab; paintTab(state, root); };
    });
    paintTab(state, root);
    // 건너뛰기 — 결과는 이미 정산돼 있다. 재생만 멈추고 리포트로 간다
    root.querySelector('.b-skip').onclick = () => { clearInterval(state.timer); opts.onEnd(false); };
}

function paintTab(state, root) {
    root.querySelectorAll('.b-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === state.tab));
    root.querySelector('.battle-log-wrap').hidden = state.tab !== 'log';
    root.querySelector('.battle-dmg-wrap').hidden = state.tab !== 'dmg';
    if (state.tab === 'dmg') renderDmg(state, root);
}

function paintRound(state, root) {
    const k = D.roundTypes.find(r => r.round_num === state.round)?.round_type ?? 'normal';
    root.querySelector('.b-round').textContent = state.round;
    const kind = root.querySelector('.b-kind');
    kind.className = `rk b-kind ${k}`;
    kind.textContent = kindLabel(k);
    root.querySelectorAll('.rt').forEach(n => {
        const v = Number(n.dataset.n);
        n.classList.toggle('done', v < state.round);
        n.classList.toggle('now', v === state.round);
    });
}

/* ───────── 렌더 ───────── */

const enemyName = e => e.grade === 'elite' && e.sin ? eliteName(e.sin, e.monsterId) : monsterName(e.monsterId);
const enemyList = state => state.enemies.map(e => L(e.name)).join(', ');

function renderUnits(state, root) {
    for (const [sel, list] of [['.side-enemy', state.enemies], ['.side-party', state.party]]) {
        const side = root.querySelector(sel);
        side.innerHTML = '';
        for (const u of list) {
            const n = document.createElement('div');
            const boss = u.grade === 'stage_boss' || u.grade === 'chapter_boss';
            n.className = `unit ${u.side}${u.grade === 'elite' ? ' elite' : ''}${boss ? ' boss' : ''}${u.hp <= 0 ? ' dead' : ''}`;
            // 죄종은 상단 테두리 색으로만. 적의 죄종 칩은 남긴다 — 정예의 죄종은 이 판에서 굴려진 정보다
            if (u.sin) n.style.borderTopColor = M.SINS[u.sin]?.color;
            const name = L(u.name);
            const discSin = u.side === 'enemy' ? (u.sin ?? monsterSin(u.monsterId)) : null;
            const dc = discSin ? M.SINS[discSin]?.color : null;
            const face = u.side === 'enemy' ? monsterFace(u.monsterId) : M.heroFace(u.uid);
            const sprite = face
                ? `<div class="sprite has-face"><img src="${face}" alt="${name}" loading="lazy"></div>`
                : dc
                    ? `<div class="sprite disc" style="color:${dc};background:${dc}22;border-color:${dc}66">${L(monsterName(u.monsterId)).charAt(0)}</div>`
                    : `<div class="sprite">${u.glyph}</div>`;
            // 위칸(이름·태그) + 가로형 본문(왼쪽 초상 / 오른쪽 HP · 행동 게이지 · 스킬 쿨 3줄) — SCREEN_DESIGN §4-2
            // 쿨 칸은 아이콘뿐이다 — 이름 · 표기/실효 쿨 · 설명은 툴팁이 든다. 남은 쿨은 아이콘을 덮은 판(.cd-mask)이 위에서부터 걷히며 보여준다
            const skills = u.skills ? `<div class="cd-list">${u.skills.map(s => `
                <div class="cd-slot"><span class="cd-g">${s.i ?? ''}</span><i class="cd-mask"></i></div>`).join('')}</div>` : '';
            n.innerHTML = `
                <div class="unit-band">
                    ${u.side === 'enemy' ? `<span class="tags">
                        ${u.sin ? `<span class="sin-chip" style="color:${M.SINS[u.sin]?.color}">${L(M.SINS[u.sin])}</span>` : ''}
                        ${u.grade === 'elite' ? `<span class="elite-tag">${t('kind.elite')}</span>` : ''}
                        ${boss ? `<span class="elite-tag boss-tag">${t(u.grade === 'chapter_boss' ? 'kind.chapterBoss' : 'kind.boss')}</span>` : ''}
                    </span>` : '<span></span>'}
                    <b class="unit-name">${name}</b>
                </div>
                <div class="unit-body">
                    ${sprite}
                    <div class="unit-info">
                        ${u.traits ? `<div class="trait-line" title="${t('bt.traitsTitle')}">${u.traits.map(x => L(x)).join(' · ')}</div>` : ''}
                        <div class="hp-row">
                            <div class="bar hp"><i style="width:${u.hp / u.hpMax * 100}%"></i></div>
                            <span class="hp-text">${Math.max(0, Math.round(u.hp))} / ${u.hpMax}</span>
                        </div>
                        <div class="act-row" title="${t('bt.actTitle', { s: u.period.toFixed(2) })}">
                            <i class="act-fill"></i>
                        </div>
                        ${skills}
                    </div>
                </div>
                <div class="pop-layer"></div>`;
            // 올려놓으면 뜬다 — 카드는 기본 능력치(영웅만), 스킬 칸은 그 스킬 (2026-08-28, ui/tip.js).
            // 옛 title 속성은 걷었다: 같은 자리에 브라우저 기본 툴팁이 겹쳐 뜬다
            if (u.hero) bindTipNode(n, () => heroTipCard(u.hero));
            if (u.skills) n.querySelectorAll('.cd-slot').forEach((slot, i) => bindTipNode(slot, () => skillTipCard(u.skills[i], u.period)));
            u.node = n;
            side.appendChild(n);
        }
    }
}

function refreshUnit(state, u) {
    if (!u.node) return;
    const pct = Math.max(0, u.hp / u.hpMax * 100);
    u.node.querySelector('.bar.hp > i').style.width = pct + '%';
    u.node.querySelector('.hp-text').textContent = `${Math.max(0, Math.round(u.hp))} / ${u.hpMax}`;
    u.node.classList.toggle('dead', u.hp <= 0);
    // 행동 게이지 — 마지막 행동 이후 경과가 주기에 닿으면 가득 찬다
    const act = u.node.querySelector('.act-fill');
    if (act) act.style.width = (u.hp <= 0 ? 0 : clamp01((state.t - u.lastAct) / u.period) * 100) + '%';
    // 스킬 쿨 게이지 (목업 — 부채 #13). 다 찬 줄 = 다음 행동에 나갈 후보
    if (u.skills) u.node.querySelectorAll('.cd-slot').forEach((slot, i) => {
        const s = u.skills[i];
        const pct = u.hp <= 0 ? 0 : clamp01(1 - (s.readyAt - state.t) / s.cd);
        slot.querySelector('.cd-mask').style.height = (1 - pct) * 100 + '%';   // 남은 쿨만큼 위에서 덮는다
        slot.classList.toggle('ready', pct >= 1);
    });
}

/**
 * 쿨 게이지 목업 — 영웅이 행동할 때 슬롯 순으로 준비된 스킬 하나를 "쓴" 것처럼 리셋하고 그 스킬을 돌려준다. 결과에 영향 없음 (DEV_PLAN 부채 #13).
 * **발동을 보여준다** (2026-08-27) — 쓴 칸이 한 번 튀고 스킬 이름이 초상 위로 떠오른다.
 * 「무엇이 준비됐나」는 상태라 게이지가 답하지만 「방금 뭘 썼나」는 사건이라 게이지로는 안 보인다 — 피해 숫자와 같은 팝업 층이 답한다.
 */
function mockUseSkill(state, u, tSec) {
    const i = u.skills?.findIndex(x => tSec >= x.readyAt - 1e-9) ?? -1;
    if (i < 0) return null;
    const s = u.skills[i];
    s.readyAt = tSec + s.cd;
    if (!state.catchUp && u.node) {   // 되감기 중에는 연출을 태우지 않는다
        const slot = u.node.querySelectorAll('.cd-slot')[i];
        if (slot) {
            slot.classList.remove('fire');
            void slot.offsetWidth;    // 연속 발동에도 애니메이션이 다시 돈다
            slot.classList.add('fire');
            state.timeouts.push(setTimeout(() => slot.classList.remove('fire'), 520));
        }
    }
    popup(state, u, L(s.n), 'skill-tag');
    return s;
}
/** 타격 라벨 — 쓴 스킬 이름(목업) 또는 기본 공격. 로그와 누적 데미지가 같은 라벨을 쓴다 */
const strikeLabel = s => s ? L(s.n) : t('bt.basicAttack');

/* ───────── 누적 데미지 — 이벤트의 dmg 를 더할 뿐이다. 재생기는 계산하지 않는다 (정산은 game_logic) ───────── */

/** 파티는 유닛 키, 적은 종류(몬스터 id + 죄종)로 묶는다 — 라운드마다 새로 서는 같은 몬스터가 한 줄에 쌓인다 */
const dmgKey = u => u.side === 'party' ? u.key : `e:${u.monsterId}:${u.sin ?? ''}`;
function dmgEntry(state, u) {
    const k = dmgKey(u);
    if (!state.dmg.has(k)) state.dmg.set(k, { name: u.name, side: u.side, total: 0, by: new Map() });
    return state.dmg.get(k);
}
function addDmg(state, u, label, dmg) {
    const e = dmgEntry(state, u);
    e.total += dmg;
    e.by.set(label, (e.by.get(label) ?? 0) + dmg);
}
/** 누적 데미지 탭 — 파티 / 적 두 묶음. 막대는 묶음 안 최대 기준, % 는 묶음 합 기준. 보이는 동안만 그린다 */
function renderDmg(state, root) {
    const box = root.querySelector('.battle-dmg-wrap');
    if (!box || box.hidden) return;
    const groups = [['party', t('bt.dmg.party')], ['enemy', t('bt.dmg.enemy')]];
    box.innerHTML = groups.map(([side, title]) => {
        const rows = [...state.dmg.values()].filter(e => e.side === side).sort((a, b) => b.total - a.total);
        const sum = rows.reduce((a, e) => a + e.total, 0);
        const max = rows[0]?.total || 1;
        return `<div class="dmg-group">${title}</div>` + (rows.length ? rows.map(e => `
            <div class="dmg-row ${side}">
                <div class="dmg-head"><span class="dmg-n">${L(e.name)}</span>
                    <span class="dmg-v">${e.total.toLocaleString()} <span class="muted">${sum ? Math.round(e.total / sum * 100) : 0}%</span></span></div>
                <div class="bar dmg"><i style="width:${e.total / max * 100}%"></i></div>
                ${e.by.size ? `<div class="dmg-by">${[...e.by.entries()].sort((a, b) => b[1] - a[1]).map(([l, v]) => `${l} <b>${v.toLocaleString()}</b>`).join(' · ')}</div>` : ''}
            </div>`).join('') : `<div class="dmg-row"><span class="muted">—</span></div>`);
    }).join('');
}

function popup(state, u, text, cls) {
    if (!u?.node || state.catchUp) return;   // 되감기 중에는 팝업을 띄우지 않는다
    const layer = u.node.querySelector('.pop-layer');
    const p = document.createElement('span');
    p.className = `pop ${cls}`;
    p.textContent = text;
    layer.appendChild(p);
    state.timeouts.push(setTimeout(() => p.remove(), 900));
}

function pushLog(state, root, text) {
    const ul = root.querySelector('.battle-log');
    const li = document.createElement('li');
    li.innerHTML = `<span class="t">${clock(state.t)}</span> ${text}`;
    ul.appendChild(li);
    while (ul.children.length > 60) ul.firstChild.remove();
    ul.parentElement.scrollTop = ul.parentElement.scrollHeight;
}

/* ───────── 재생 ───────── */

function start(state, root, opts) {
    clearInterval(state.timer);
    state.timer = setInterval(() => {
        if (!state.running || state.ended) return;
        state.t += TICK;
        root.querySelector('.b-clock').textContent = clock(state.t);
        drain(state, root, opts);
        for (const u of [...state.party, ...state.enemies]) if (u.hp > 0) refreshUnit(state, u);
    }, TICK * 1000 / state.speed);
}

/** 현재 시각까지의 이벤트를 전부 적용한다 */
function drain(state, root, opts) {
    const tl = opts.result.timeline;
    while (state.idx < tl.length && tl[state.idx].t <= state.t + 1e-9) {
        apply(state, root, opts, tl[state.idx]);
        state.idx += 1;
        if (state.ended) break;
    }
}

function apply(state, root, opts, ev) {
    const U = k => state.units.get(k);
    switch (ev.e) {
        case 'round': {
            state.round = ev.n;
            for (const e of state.enemies) state.units.delete(e.key);
            state.enemies = ev.enemies.map(e => ({
                key: e.key, side: 'enemy', monsterId: e.monsterId, grade: e.grade, sin: e.sin, traits: e.traits,
                name: enemyName(e), hp: e.hpMax, hpMax: e.hpMax, period: e.period, lastAct: ev.t, node: null,
            }));
            for (const e of state.enemies) state.units.set(e.key, e);
            renderUnits(state, root);
            paintRound(state, root);
            pushLog(state, root, t('log.roundStart', { n: ev.n, kind: kindLabel(ev.kind), list: enemyList(state) }));
            break;
        }
        case 'hit': {
            const a = U(ev.a), d = U(ev.d);
            const skill = a ? strikeLabel(mockUseSkill(state, a, ev.t)) : '';
            if (a) { a.lastAct = ev.t; if (ev.ahp !== undefined) { a.hp = ev.ahp; refreshUnit(state, a); } }
            if (d) {
                d.hp = ev.dhp;
                popup(state, d, `-${ev.dmg}`, ev.crit ? 'crit' : (a?.side === 'party' ? 'dmg' : 'dmg-in'));
                refreshUnit(state, d);
            }
            if (a && d) {
                // 모든 타격을 적는다 — 누가 → 누구 · 피해 · 쓴 스킬 (스킬명은 목업, 부채 #13)
                pushLog(state, root, t(ev.crit ? 'log.crit' : 'log.hit', { name: L(a.name), target: L(d.name), dmg: ev.dmg, skill }));
                addDmg(state, a, skill, ev.dmg);
                renderDmg(state, root);
            }
            break;
        }
        case 'reflect': {
            // 반사 — 비직격. 공격자 HP 만 줄고 아무것도 유발하지 않는다 (battle_design §9-6)
            const a = U(ev.a), d = U(ev.d);
            if (d) { d.hp = ev.ahp; popup(state, d, `-${ev.dmg}`, 'dmg-in'); refreshUnit(state, d); }
            if (a && d) {
                pushLog(state, root, t('log.reflect', { name: L(a.name), target: L(d.name), dmg: ev.dmg }));
                addDmg(state, a, t('bt.reflectLabel'), ev.dmg);
                renderDmg(state, root);
            }
            break;
        }
        case 'dodge': {
            const a = U(ev.a), d = U(ev.d);
            const skill = a ? strikeLabel(mockUseSkill(state, a, ev.t)) : '';
            if (a) a.lastAct = ev.t;
            if (d) popup(state, d, t('pop.dodge'), 'miss');
            if (a && d) pushLog(state, root, t('log.dodge', { name: L(a.name), target: L(d.name), skill }));
            break;
        }
        case 'down': {
            const u = U(ev.u);
            if (!u) break;
            u.hp = 0;
            refreshUnit(state, u);
            const enemy = u.side === 'enemy';
            pushLog(state, root, t(enemy ? 'log.slain' : 'log.downed', { name: L(u.name) }));
            popup(state, u, t(enemy ? 'pop.slain' : 'pop.downed'), 'dead-tag');
            break;
        }
        case 'card': {   // 도감 카드 — 처치와 별개 판정 (monster_design §8). 리포트에도 찍힌다
            const u = U(ev.u);
            pushLog(state, root, t('log.card', { name: L(monsterName(ev.monsterId)) }));
            if (u) popup(state, u, t('pop.card'), 'card-tag');
            break;
        }
        case 'end': {
            state.ended = true;
            clearInterval(state.timer);
            pushLog(state, root, t(ev.won ? 'log.end.win' : 'log.end.lose'));
            showResult(state, root, opts, ev.won);
            break;
        }
    }
}

/** 재생이 끝나면 아레나 위에 결과 띠 — 반복이 켜져 있으면 잠깐 세고 다음 원정으로 */
function showResult(state, root, opts, won) {
    const box = root.querySelector('.battle-result');
    const auto = won && opts.repeat === true;
    box.innerHTML = `
        <span class="${won ? 'up' : 'down'} verdict">${t(won ? 'bt.won' : 'bt.lost')}</span>
        ${auto ? `<span class="muted b-next"></span>` : ''}
        <button class="btn primary sm b-report">${t('bt.toReport')}</button>`;
    box.classList.add('show');
    box.querySelector('.b-report').onclick = () => opts.onEnd(false);
    if (auto) {
        let left = 3;
        const tick = () => {
            box.querySelector('.b-next').textContent = t('bt.nextRun', { s: left });
            if (left <= 0) { opts.onEnd(true); return; }
            left -= 1;
            state.timeouts.push(setTimeout(tick, 1000));
        };
        tick();
    }
}
