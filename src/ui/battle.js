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
 * 스킬 쿨은 **가로 아이콘 칸**이다 — 이름도 % 도 찍지 않고 툴팁이 든다. 남은 쿨은 아이콘을 덮은 판이 걷히며 보여주고,
 *   **발동한 칸은 튀면서 스킬 이름이 초상 위로 떠오른다** (2026-08-27 — 「방금 뭘 썼나」는 게이지가 아니라 팝업이 답한다).
 * 올려놓으면 툴팁 — 카드는 영웅 기본 능력치, 스킬 칸은 그 스킬의 이름 · 표기/실효 쿨 · 설명 (2026-08-28, ui/tip.js).
 * 스킬 칸은 **실제 시전을 그린다** (2026-08-30 — 목업 폐기): 켜고 끄는 것은 타임라인의 `skill` 이벤트이고, 남은 쿨은 그 이벤트가
 *   실어 온 `ready`(시뮬이 쓴 실제 쿨)로 걷힌다. 재생기는 쿨을 **계산하지 않는다**. 회복 · 창 · 재생(`heal`·`buff`·`buffEnd`·`regen`)도
 *   같이 그린다 — 무시하면 화면 HP 가 시뮬과 어긋난다. 아이콘 · 설명만 `mock.js` 표시 사전에서 온다.
 * 행동 게이지 = 마지막 행동 이후 경과 ÷ 행동 주기.
 *
 * i18n: 표시 문자열은 전부 t()/L() — 이 파일에 한국어 리터럴은 없다 (주석 제외).
 */

import * as M from './mock.js';
import { D, monsterName, monsterFace, monsterSin, stageName, stageBgOf, chapterOf, eliteName, skillInfo } from './data.js';
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
            // 액티브 = 시뮬이 들려 보낸 그 목록(result.party[].actives). 전투 시작엔 전부 준비 상태다
            skills: (p.actives ?? []).map(id => ({ ...skillInfo(id), readyAt: 0, firedAt: 0 })),
            buffs: new Map(),   // 켜져 있는 창 {skillId: {until, stat, v}} — buff/buffEnd 이벤트가 켜고 끈다
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
            const face = u.side === 'enemy' ? monsterFace(u.monsterId) : M.heroFace(u);
            // 아트가 있으면 그 밑에 **이니셜/글리프를 깔아 둔다** — 고른 얼굴 스타일에 그 몬스터 그림이 없으면
            // `onerror` 로 img 만 빠지고 밑에 있던 것이 드러난다 (mock.js FACE_STYLES).
            // ⚠ 밑에 까는 것은 글자뿐이다 — `.sprite.disc`(원형)를 같이 얹으면 아트 있는 유닛이 원형이 된다(관전은 네모다)
            const underMark = dc ? L(monsterName(u.monsterId)).charAt(0) : u.glyph;
            const sprite = face
                ? `<div class="sprite has-face"${dc ? ` style="color:${dc}"` : ''}>${underMark}<img src="${face}" alt="${name}" loading="lazy" onerror="this.remove()"></div>`
                : dc
                    ? `<div class="sprite disc" style="color:${dc};background:${dc}22;border-color:${dc}66">${L(monsterName(u.monsterId)).charAt(0)}</div>`
                    : `<div class="sprite">${u.glyph}</div>`;
            // 위칸(이름·태그) + 가로형 본문(왼쪽 초상 / 오른쪽 HP · 행동 게이지 · 스킬 쿨 3줄) — SCREEN_DESIGN §4-2
            // 쿨 칸은 아이콘뿐이다 — 이름 · 표기/실효 쿨 · 설명은 툴팁이 든다. 남은 쿨은 아이콘을 덮은 판(.cd-mask)이 위에서부터 걷히며 보여준다
            // 칸 수는 언제나 active_slots — 스킬이 둘인 영웅도 셋째 칸이 **빈 채로** 남는다 (SCREEN_DESIGN §4-2 개정 2026-08-31).
            // 칸이 사라지면 카드마다 줄 길이가 달라져 같은 격자로 안 읽히고, 「스킬이 둘」과 「셋째가 미정」이 구분되지 않는다
            const slots = u.skills ? Array.from({ length: Math.max(D.balance.active_slots, u.skills.length) }, (_, i) => u.skills[i] ?? null) : [];
            const skills = slots.length ? `<div class="cd-list">${slots.map(s => s
                ? `<div class="cd-slot"><span class="cd-g">${s.icon ?? ''}</span><i class="cd-mask"></i></div>`
                : `<div class="cd-slot empty"></div>`).join('')}</div>` : '';
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
            if (u.skills) n.querySelectorAll('.cd-slot').forEach((slot, i) => {
                if (u.skills[i]) bindTipNode(slot, () => skillTipCard(u.skills[i], u.period));   // 빈 칸은 띄울 것이 없다
            });
            u.node = n;
            // 창 뱃지 줄은 **카드 밖**이다 (2026-08-31 사용자 지시) — 카드 안에 두면 그만큼 박스가 커져서
            // 「몬스터·영웅·보스가 전부 같은 고정 크기」의 그 크기가 달라진다. 칸(.unit-slot)이 카드와 줄을 세로로 물고,
            // 카드는 창이 걸리든 말든 옛 크기 그대로다 (SCREEN_DESIGN §4-2)
            const cell = document.createElement('div');
            cell.className = 'unit-slot';
            cell.appendChild(n);
            cell.insertAdjacentHTML('beforeend', '<div class="buff-row"></div>');
            u.buffRow = cell.lastElementChild;
            side.appendChild(cell);
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
    // 스킬 쿨 게이지 — 시뮬이 실제로 쓴 쿨(`skill` 이벤트의 firedAt → ready)로 걷는다. 재생기는 쿨을 계산하지 않는다
    if (u.skills?.length) u.node.querySelectorAll('.cd-slot').forEach((slot, i) => {
        const s = u.skills[i];
        if (!s) return;                 // 빈 칸 — 걷을 쿨이 없다 (SCREEN_DESIGN §4-2)
        const span = Math.max(1e-6, s.readyAt - s.firedAt);
        const pct = u.hp <= 0 ? 0 : clamp01(1 - (s.readyAt - state.t) / span);
        slot.querySelector('.cd-mask').style.height = (1 - pct) * 100 + '%';   // 남은 쿨만큼 위에서 덮는다
        slot.classList.toggle('ready', pct >= 1);
    });
    // 켜져 있는 창 — 카드 전체가 「무언가 걸려 있다」를, 카드 밖 아래 뱃지 줄이 「무엇이 걸려 있나」를 든다 (SCREEN_DESIGN §4-2)
    u.node.classList.toggle('buffed', u.hp > 0 && u.buffs?.size > 0);
    refreshBuffs(u);
}

/**
 * 창 뱃지 줄 — 걸려 있는 창 하나 = 칩 하나. 칩은 그 창을 만든 스킬의 아이콘이고 이름은 `title` 이 든다.
 * **이로운 창은 초록 · 해로운 창은 빨강** 테두리 — 가르는 것은 창의 값 부호다(`buff` 이벤트의 `v`).
 * ⚠ 지금 도는 창 4종은 전부 이로워서 빨강은 아직 안 켜진다 (skill.csv · SCREEN_DESIGN §4-2).
 * 자리는 **카드 밖 · 카드 바로 아래**(`.unit-slot` 의 둘째 줄) — 카드 크기를 건드리지 않는다 (2026-08-31 사용자 지시).
 * 줄은 창이 없어도 **자리를 지킨다** — 높이가 창 개수를 따라 흔들리면 카드가 위아래로 흔들린다.
 */
function refreshBuffs(u) {
    const row = u.buffRow;   // 카드 밖(.unit-slot 의 둘째 줄)이라 u.node 아래서는 못 찾는다
    if (!row) return;
    const live = u.hp > 0 ? [...(u.buffs ?? new Map())] : [];
    const sig = live.map(([id, b]) => `${id}:${b?.v ?? 0}`).join('|');
    if (row.dataset.sig === sig) return;      // 안 바뀌었으면 손대지 않는다 — 매 틱 다시 그리는 자리다
    row.dataset.sig = sig;
    row.innerHTML = live.map(([id, b]) => {
        const info = skillInfo(id);
        return `<span class="buff-chip ${(b?.v ?? 0) < 0 ? 'bad' : 'good'}" title="${L(info.name)}">${info.icon ?? '+'}</span>`;
    }).join('');
}

/**
 * 시전 연출 — `skill` 이벤트가 왔을 때만 돈다 (2026-08-30 — 재생기가 스스로 쿨을 리셋하던 목업 폐기).
 * 쓴 칸이 한 번 튀고 스킬 이름이 초상 위로 떠오른다: 「무엇이 준비됐나」는 상태라 게이지가 답하지만
 * 「방금 뭘 썼나」는 사건이라 게이지로는 안 보인다 — 피해 숫자와 같은 팝업 층이 답한다.
 */
function castSkill(state, u, ev) {
    const i = u.skills?.findIndex(x => x.id === ev.s) ?? -1;
    if (i < 0) return;
    const s = u.skills[i];
    s.firedAt = ev.t;
    s.readyAt = ev.ready ?? ev.t;   // 준비 시각은 시뮬이 실어 보낸다 (INTERFACE §2-6)
    if (!state.catchUp && u.node) {   // 되감기 중에는 연출을 태우지 않는다
        const slot = u.node.querySelectorAll('.cd-slot')[i];
        if (slot) {
            slot.classList.remove('fire');
            void slot.offsetWidth;    // 연속 발동에도 애니메이션이 다시 돈다
            slot.classList.add('fire');
            state.timeouts.push(setTimeout(() => slot.classList.remove('fire'), 520));
        }
    }
    popup(state, u, L(s.name), 'skill-tag');
}
/** 타격 라벨 — 이벤트가 들고 온 스킬 id(`s`) 의 이름, 없으면 기본 공격. 로그와 누적 데미지가 같은 라벨을 쓴다 */
const strikeLabel = id => id ? L(skillInfo(id).name) : t('bt.basicAttack');

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
        case 'skill': {   // 시전 — 그 차례의 사건. 뒤따르는 hit/dodge/heal/buff 가 같은 s 를 단다
            const u = U(ev.u);
            if (u) { u.lastAct = ev.t; castSkill(state, u, ev); }
            break;
        }
        case 'hit': {
            const a = U(ev.a), d = U(ev.d);
            const skill = strikeLabel(ev.s);
            if (a) { a.lastAct = ev.t; if (ev.ahp !== undefined) { a.hp = ev.ahp; refreshUnit(state, a); } }
            if (d) {
                d.hp = ev.dhp;
                popup(state, d, `-${ev.dmg}`, ev.crit ? 'crit' : (a?.side === 'party' ? 'dmg' : 'dmg-in'));
                refreshUnit(state, d);
            }
            if (a && d) {
                // 모든 타격을 적는다 — 누가 → 누구 · 피해 · 쓴 스킬
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
            const skill = strikeLabel(ev.s);
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
        case 'heal': {   // 회복 — 시전자(a)가 대상(d)의 HP 를 올린다. 부호가 반대일 뿐 타격과 같은 자리에 뜬다
            const a = U(ev.a), d = U(ev.d);
            if (d) { d.hp = ev.dhp; popup(state, d, `+${ev.amt}`, 'heal'); refreshUnit(state, d); }
            if (a && d) pushLog(state, root, t('log.heal', { name: L(a.name), target: L(d.name), amt: ev.amt, skill: strikeLabel(ev.s) }));
            break;
        }
        case 'regen': {   // HP 재생 — 조용히 오른다(팝업 없음). 정수 1 이상 쌓인 틱에만 온다
            const u = U(ev.u);
            if (u) { u.hp = ev.dhp; refreshUnit(state, u); }
            break;
        }
        case 'buff': {   // 창 적용 · 갱신. 배리어면 총량(amt)도 온다
            const u = U(ev.u);
            if (!u) break;
            u.buffs?.set(ev.s, { until: ev.until, stat: ev.stat, v: ev.v });
            refreshUnit(state, u);
            // 팝업은 띄우지 않는다 — 시전은 `skill` 이벤트가 이미 알렸고, 파티 창이면 대상마다 같은 이름이 세 번 뜬다.
            // 「지금 걸려 있다」는 상태라 카드 테두리가 든다 (SCREEN_DESIGN §4-2)
            pushLog(state, root, t(ev.amt != null ? 'log.barrier' : 'log.buff', { name: L(u.name), skill: strikeLabel(ev.s), amt: ev.amt }));
            break;
        }
        case 'buffEnd': {
            const u = U(ev.u);
            if (!u) break;
            u.buffs?.delete(ev.s);
            refreshUnit(state, u);
            pushLog(state, root, t('log.buffEnd', { name: L(u.name), skill: strikeLabel(ev.s) }));
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
