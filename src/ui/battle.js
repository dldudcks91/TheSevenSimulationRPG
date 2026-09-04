/**
 * 전투 관전 화면 — **재생기**. 전투는 game_logic/battle.js 가 이미 끝까지 계산했고,
 * 여기서는 그 타임라인을 시간에 맞춰 화면에 옮길 뿐이다.
 *   · 관전으로 본 전투와 즉시 정산(건너뛰기·부재 정산)이 갈릴 수 없다 — 같은 결과를 보는 두 창구다
 *   · 배속·일시정지·건너뛰기는 재생 속도의 문제지 결과의 문제가 아니다
 *   · 언어를 바꿔도 같은 타임라인을 다시 재생한다
 *
 * 배치: 적(위) / 파티(아래) 상하 대치 — 가로형 카드가 진영마다 한 줄로 나란히 + 아레나 아래 가방(app.js 가 붙인다) (2026-08-27).
 * **배치가 둘이고 컨트롤의 버튼 하나가 오간다** (2026-09-03 사용자 지시, SCREEN_DESIGN §4-2):
 *   · **넓게**(기본) — 아레나가 메인 칸 전폭(높이 420 고정) · 로그/누적은 **창**이 든다
 *   · **나눔**(옛 구조) — 좌 아레나(옛 크기) / 우 딜미터 열 2단 격자 · 판이 그 열에 **상주**한다(창 안 뜸)
 *   판(로그·누적) DOM 은 **하나뿐이고 집만 옮긴다** — 새로 만들면 쌓아 둔 로그와 스크롤이 날아간다.
 *   창 규격은 셸의 창과 같되(.modal-layer/.modal-box · 정사각 X · 바깥 클릭 · Esc) **레이어는 재생기 자기 DOM 안**이다 — 두 판은 재생기가 살아 있는 동안 계속 쓰이므로 밖에 두면 mount 마다 넘겨줘야 한다.
 *   배치는 재생 위치(resume)가 아니라 **취향**이라 app.js 의 `state.btLayout` 이 들고 `opts.layout`/`opts.onLayout` 으로 오간다 — 런이 바뀌어도 남는다.
 * 로그는 모든 타격을 적는다(누가 → 누구 · 피해 · 쓴 스킬). 누적 데미지는 이벤트의 dmg 를 더한 표시값이다 — 정산이 아니다.
 * 재렌더에도 재생이 이어진다 — 정리 함수가 재생 위치 {t, speed, running, tab, win} 를 돌려주고(win = 창이 열려 있었나), 다음 mount 가 opts.resume 으로 받아
 *   그 시각까지 팝업 없이 되감는다 (catchUp).
 * 유닛 카드 = **왼쪽 초상 + 오른쪽 수치 열**뿐이다 [개정 2026-09-03 사용자 지시] — 이름·죄종 칩·정예/보스 태그를 들던 위칸을 통째로 걷었다.
 *   등급은 **테두리 색**이 든다(정예 = 노랑 · 보스 = 빨강). 오른쪽 열은 HP(수치는 바 가운데) / 행동 게이지 / 스킬 쿨 칸.
 *   **몬스터와 영웅의 카드는 이제 같은 물건이다** — 몬스터도 쿨 칸(지금은 전부 빈 칸)과 창 뱃지 줄을 갖는다.
 *   **카드 크기는 몬스터·영웅·보스가 전부 같은 고정값**이다 (2026-08-27, SCREEN_DESIGN §4-2).
 * 스킬 쿨은 **가로 아이콘 칸**이다 — 이름도 % 도 찍지 않고 툴팁이 든다. 남은 쿨은 아이콘을 덮은 판이 걷히며 보여주고,
 *   **발동한 칸은 튀면서 스킬 이름이 초상 위로 떠오른다** (2026-08-27 — 「방금 뭘 썼나」는 게이지가 아니라 팝업이 답한다).
 * 올려놓으면 툴팁 — 카드는 영웅 기본 능력치, 스킬 칸은 그 스킬의 이름 · 표기/실효 쿨 · 설명 (2026-08-28, ui/tip.js).
 * 스킬 칸은 **실제 시전을 그린다** (2026-08-30 — 목업 폐기): 켜고 끄는 것은 타임라인의 `skill` 이벤트이고, 남은 쿨은 그 이벤트가
 *   실어 온 `ready`(시뮬이 쓴 실제 쿨)로 걷힌다. 재생기는 쿨을 **계산하지 않는다**. 회복 · 창 · 재생(`heal`·`buff`·`buffEnd`·`regen`)도
 *   같이 그린다 — 무시하면 화면 HP 가 시뮬과 어긋난다. 아이콘 · 설명만 `mock.js` 표시 사전에서 온다.
 * 행동 게이지 = 마지막 행동 이후 경과 ÷ 행동 주기. 행동 이벤트가 온 틱은 **100% 를 먼저 그리고** 다음 틱에
 *   전환 없이(스냅) 비운다 (2026-09-04) — 이벤트가 게이지를 곧장 리셋하면 「꽉 참」 프레임이 화면에 안 나온다.
 *
 * i18n: 표시 문자열은 전부 t()/L() — 이 파일에 한국어 리터럴은 없다 (주석 제외).
 */

import * as M from './mock.js';
import { D, monsterName, monsterFace, stageName, stageBgOf, chapterOf, skillInfo } from './data.js';
import { t, L } from './i18n.js';
import { bindTipNode, heroTipCard, skillTipCard } from './tip.js';

const SPEEDS = [1, 2, 4];
const TICK = 0.1;

const kindLabel = k => t(`kind.${k}`);
/* 스킬 아이콘 그림 — `app.js:skillImg` 와 같은 규칙이다 (SCREEN_DESIGN §2). 두 파일이 서로를 import 하지
   않으므로 한 줄을 각자 든다 — 규칙은 `mock.skillIcon` 한 곳이라 갈릴 자리는 없다 */
const skillImg = s => {
    const src = M.skillIcon(s?.id);
    return src ? `<img src="${src}" alt="" loading="lazy" onerror="this.remove()">` : '';
};
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
        // 창 안에서 보고 있는 판 — 창이 닫혀 있어도 남는다. **둘 중 하나로 못박는다**:
        // ?dev=play&bt=<아무거나> 처럼 모르는 값이 들어오면 두 판이 다 숨어 빈 창이 뜬다 (2026-09-03)
        tab: resume?.tab === 'dmg' ? 'dmg' : 'log',
        win: resume?.win === true,   // 창이 열려 있나 (2026-09-03) — 기본은 닫힘
        // 배치 [2026-09-03 사용자 지시] — 'wide'(아레나 전폭 + 로그 창) / 'split'(옛 구조: 좁은 아레나 + 우측 딜미터 열).
        // 재생 위치가 아니라 **취향**이라 resume 이 아니라 app.js 의 화면 상태(state.btLayout)가 든다 — 다음 원정에도 남는다
        layout: opts.layout === 'split' ? 'split' : 'wide',
        onKey: null,                 // Esc 리스너 — 정리 함수가 뗀다
    };

    // 파티 유닛 — 결과의 party 정보 + 로스터의 표시 정보(이름·죄종·직업)
    state.party = result.party.map(p => {
        const h = heroes.find(x => x.uid === p.uid);
        return {
            key: p.key, side: 'party', name: h?.name, sin: h?.sin, cls: h?.cls, hero: h,   // hero — 툴팁이 기본 능력치를 읽는다 (2026-08-28)
            hp: p.hpMax, hpMax: p.hpMax, period: p.period, lastAct: -p.period, node: null,
            // 액티브 = 시뮬이 들려 보낸 그 목록(result.party[].actives). 전투 시작엔 전부 준비 상태다
            skills: (p.actives ?? []).map(id => ({ ...skillInfo(id), readyAt: 0, firedAt: 0 })),
            buffs: new Map(),   // 켜져 있는 창 {skillId: {until, stat, v}} — buff/buffEnd 이벤트가 켜고 끈다
        };
    });
    for (const u of state.party) { state.units.set(u.key, u); dmgEntry(state, u); }   // 파티는 0 이어도 누적 표에 찍는다

    const dom = buildDom(state, stage, stageId);
    // 원정 탭의 화면 전환(편성·지역 / 전투 관전 / 리포트) — 패널 **위**가 아니라 이 패널 **안** 왼쪽 위에 선다 (2026-09-03 사용자 지시).
    // 재생기는 그 버튼이 무엇인지 모른다 — app.js 가 만든 노드를 자리에 꽂아 줄 뿐이다
    if (opts.nav) dom.querySelector('.bh-nav').appendChild(opts.nav);
    container.appendChild(dom);
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
        if (state.onKey) document.removeEventListener('keydown', state.onKey);   // 창의 Esc — 재생기 밖에 남기면 mount 마다 쌓인다
        return { t: state.t, speed: state.speed, running: state.running, tab: state.tab, win: state.win };
    };
}

/* ───────── 구성 ───────── */

function buildDom(state, stage, stageId) {
    const wrap = document.createElement('div');
    wrap.className = 'panel battle-panel';
    const bg = stageBgOf(stageId);
    const rounds = D.balance.rounds_per_stage;
    const kindOf = n => D.roundTypes.find(r => r.round_num === n)?.round_type ?? 'normal';
    /* 헤드는 **한 줄** [재개정 2026-09-04 사용자 지시 · SCREEN_DESIGN §4-2]
         `.bh-top` — 전환 · 이름 · 라운드 트랙 ─── (밀어내기) ─── `.battle-ctrl`(배속 · 일시정지 · 건너뛰기 │ 배치 · 로그 · 누적)
       「라운드 n / 총 · 종류 · 경과 시계」(`.bh-meta`)는 삭제됐고, 컨트롤 줄이 그 자리로 올라와 헤드가 2줄 → 1줄이 됐다.
       아레나와 그 아래 가방이 줄 하나만큼 위로 올라온다(가방이 화면 아래로 잘리던 것) */
    wrap.innerHTML = `
        <div class="battle-head">
            <div class="bh-top">
                <div class="bh-nav"></div>
                <div class="bh-title">${L(chapterOf(stage.chapter)?.name)} — ${L(stageName(stage))}</div>
                <div class="round-track">${
                    Array.from({ length: rounds }, (_, i) => {
                        const n = i + 1, k = kindOf(n);
                        return `<span class="rt ${k}" data-n="${n}" title="${t('bt.rTitle', { n, kind: kindLabel(k) })}">${n}</span>`;
                    }).join('')
                }</div>
                <div class="battle-ctrl">
                    ${SPEEDS.map(s => `<button class="btn sm b-speed" data-s="${s}">${t('bt.speed', { n: s })}</button>`).join('')}
                    <button class="btn sm b-pause">${t('bt.pause')}</button>
                    <button class="btn sm b-skip">${t('bt.skip')}</button>
                    <span class="ctrl-div"></span>
                    <button class="btn sm b-layout"></button>
                    <button class="btn sm b-win" data-tab="log">${t('bt.log.h')}</button>
                    <button class="btn sm b-win" data-tab="dmg">${t('bt.tab.dmg')}</button>
                </div>
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
            <div class="battle-side" hidden></div>
        </div>
        <div class="modal-layer battle-win" hidden>
            <div class="modal-box bw-box">
                <div class="modal-head">
                    <h2 class="bw-title"></h2>
                    <button class="btn modal-x bw-x" title="${t('ui.close')}" aria-label="${t('ui.close')}">×</button>
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
    // 배치 토글 — 버튼 하나로 옛 구조(나눔)와 지금 구조(넓게)를 오간다 (2026-09-03 사용자 지시, SCREEN_DESIGN §4-2)
    root.querySelector('.b-layout').onclick = () => {
        state.layout = state.layout === 'split' ? 'wide' : 'split';
        opts.onLayout?.(state.layout);   // 취향이라 화면 상태에 남긴다 — 다음 원정에도 이어진다
        paintLayout(state, root);
    };
    // 판 고르기 — 컨트롤의 두 버튼. **배치마다 뜻이 다르다**:
    //   넓게: 창을 연다/닫는다(같은 판을 다시 누르면 닫힌다 — 여는 자리 = 닫는 자리)
    //   나눔: 우측 열이 늘 서 있으므로 **판만 고른다** (닫으면 빈 열이 남는다)
    root.querySelectorAll('.b-win').forEach(b => {
        b.onclick = () => {
            if (state.layout !== 'split') state.win = !(state.win && state.tab === b.dataset.tab);
            state.tab = b.dataset.tab;
            paintWin(state, root);
        };
    });
    // 닫는 길 넷 — 그 버튼 다시 · 정사각 X · 판 바깥 · Esc (셸의 창과 같은 규격, §2). 나눔 배치에는 창이 없어 전부 논다
    const close = () => { state.win = false; paintWin(state, root); };
    root.querySelector('.bw-x').onclick = close;
    const layer = root.querySelector('.battle-win');
    layer.onclick = e => { if (e.target === layer) close(); };
    state.onKey = e => { if (e.key === 'Escape' && state.win && state.layout !== 'split') close(); };
    document.addEventListener('keydown', state.onKey);
    paintLayout(state, root);
    // 건너뛰기 — 결과는 이미 정산돼 있다. 재생만 멈추고 리포트로 간다
    root.querySelector('.b-skip').onclick = () => { clearInterval(state.timer); opts.onEnd(false); };
}

/**
 * 배치를 다시 칠한다 (2026-09-03) — 넓게 / 나눔.
 * **판(로그·누적) DOM 은 하나뿐이고 집만 옮긴다** — 새로 만들면 쌓아 둔 로그 줄과 스크롤이 날아간다.
 *   넓게 → 창(.bw-box) 안 · 나눔 → 우측 열(.battle-side) 안
 */
function paintLayout(state, root) {
    const split = state.layout === 'split';
    root.querySelector('.battle-body').classList.toggle('split', split);
    root.querySelector('.battle-side').hidden = !split;
    const host = split ? root.querySelector('.battle-side') : root.querySelector('.bw-box');
    host.append(root.querySelector('.battle-log-wrap'), root.querySelector('.battle-dmg-wrap'));
    // 버튼은 **바꿀 배치의 이름**을 든다 — 지금 상태를 적으면 누르면 무엇이 되는지가 안 읽힌다
    root.querySelector('.b-layout').textContent = t(split ? 'bt.layout.toWide' : 'bt.layout.toSplit');
    paintWin(state, root);
}

/** 판을 다시 칠한다 — 어느 판 · 창의 열림 여부 · 버튼의 눌린 표시 · 창 머리 이름(판 이름을 그대로 쓴다, 새 문구 없음) */
function paintWin(state, root) {
    const split = state.layout === 'split';
    const shown = split || state.win;   // 나눔 배치에서는 판이 우측 열에 **상주**한다 — 창은 안 뜬다
    root.querySelector('.battle-win').hidden = split || !state.win;
    root.querySelectorAll('.b-win').forEach(b => b.classList.toggle('on', shown && b.dataset.tab === state.tab));
    root.querySelector('.bw-title').textContent = t(state.tab === 'dmg' ? 'bt.tab.dmg' : 'bt.log.h');
    const log = root.querySelector('.battle-log-wrap'), dmg = root.querySelector('.battle-dmg-wrap');
    log.hidden = !(shown && state.tab === 'log');
    dmg.hidden = !(shown && state.tab === 'dmg');
    if (!dmg.hidden) renderDmg(state, root);
    // 숨어 있는 동안에도 줄은 쌓인다 — display:none 에서는 scrollTop 이 안 잡히므로 보일 때 맨 아래로 맞춘다
    if (!log.hidden) log.scrollTop = log.scrollHeight;
}

/* 라운드 표시는 **트랙 하나**가 든다 [2026-09-04 사용자 지시] — 「라운드 n / 총 · 종류」 수치와 경과 시계는 삭제됐다.
   지금 몇 번째인가는 `.now` 강조가, 종류는 칸의 색(정예·보스)이 답한다 (SCREEN_DESIGN §4-2) */
function paintRound(state, root) {
    root.querySelectorAll('.rt').forEach(n => {
        const v = Number(n.dataset.n);
        n.classList.toggle('done', v < state.round);
        n.classList.toggle('now', v === state.round);
    });
}

/* ───────── 렌더 ───────── */

/* 정예의 죄종 접두 이름(「나태의 고블린 전사」)은 관전에서 안 쓴다 (2026-09-03 사용자 지시) —
   정예임은 라벨·노란 테두리가 이미 말하고, 접두가 붙으면 같은 몬스터가 다른 이름으로 로그·누적에 흩어진다.
   조립 규칙(`naming.js:eliteName`)은 살아 있다 — 화면이 안 부를 뿐이다 */
const enemyName = e => monsterName(e.monsterId);
const enemyList = state => state.enemies.map(e => L(e.name)).join(', ');
/* 띠 왼쪽의 신원 한 조각 (2026-09-03 사용자 지시 · SCREEN_DESIGN §4-2) — 영웅은 레벨·직업, 몬스터는 정예/보스 라벨.
   일반 몬스터는 빈 채다(테두리 색이 이미 말한다). 라벨은 라운드 종류와 같은 `kind.*` 키를 재사용한다 */
const clsName = id => { const c = D.classes.find(x => x.id === id); return c ? L(c) : (id ?? ''); };
const identOf = u => u.side === 'party'
    ? `Lv.${u.hero?.level ?? 1} · ${clsName(u.cls)}`
    : (u.grade === 'elite' ? t('kind.elite')
        : u.grade === 'stage_boss' ? t('kind.boss')
        : u.grade === 'chapter_boss' ? t('kind.chapterBoss') : '');

function renderUnits(state, root) {
    for (const [sel, list] of [['.side-enemy', state.enemies], ['.side-party', state.party]]) {
        const side = root.querySelector(sel);
        side.innerHTML = '';
        for (const u of list) {
            const n = document.createElement('div');
            const boss = u.grade === 'stage_boss' || u.grade === 'chapter_boss';
            // 등급이 카드의 색을 정한다 — 몬스터는 스폰 등급(정예·보스), 영웅은 **영웅 등급**(`tier-*`).
            // 죄종은 색을 갖지 않는다 (2026-09-03 사용자 지시 · SCREEN_DESIGN §5) — 색은 CSS 가 클래스로 든다(인라인 없음)
            const tier = u.side === 'party' ? ` tier-${u.hero?.tier ?? 'rare'}` : '';
            n.className = `unit ${u.side}${u.grade === 'elite' ? ' elite' : ''}${boss ? ' boss' : ''}${tier}${u.hp <= 0 ? ' dead' : ''}`;
            // ⚠ **죄종 테두리색은 걷었다** (2026-09-03 사용자 지시) — 정예의 윗변을 죄종 색으로 칠하던 인라인 스타일이다.
            // 「죄종인지 정예인지 안 보이게」와 정면으로 부딪히고, 인라인이라 정예의 노란 테두리(.unit.elite)를 **윗변에서만 이겨** 테두리가 두 색이 됐다.
            // 이제 카드의 테두리는 등급만 말한다: 일반 = 진영색 윗변 / 정예 = 노랑 / 보스 = 빨강
            const name = L(u.name);
            const face = u.side === 'enemy' ? monsterFace(u.monsterId) : M.heroFace(u);
            // 몬스터는 아트가 있어도 그 밑에 **이니셜을 깔아 둔다** — 고른 얼굴 스타일에 그 몬스터 그림이 없으면
            // `onerror` 로 img 만 빠지고 밑에 있던 글자가 드러난다 (mock.js FACE_STYLES).
            // ⚠ **영웅은 아무것도 안 깐다** (2026-09-03 사용자 지시) — 직업 글리프(이모지)를 깔던 자리이고,
            //   영웅 그림이 배경 투명 PNG 라 그림이 있어도 이모지가 비쳐 보였다. 아트가 없으면 빈 칸이다
            // ⚠ **폴백에서 죄종 색을 걷었다** (2026-09-03 사용자 지시) — 아트 없는 몬스터를 죄종 색 원판으로 칠하던 자리다.
            //   원판(원형)은 몬스터만 달랐고 색은 죄종을 말했다 — 「카드 형태를 똑같이」·「죄종 안 보이게」 둘 다에 걸린다.
            //   남긴 것은 **이니셜 글자 하나**뿐이고, 칸은 영웅과 같은 빈 네모다
            const mark = u.side === 'enemy' ? L(monsterName(u.monsterId)).charAt(0) : '';
            const sprite = face
                ? `<div class="sprite has-face">${mark}<img src="${face}" alt="${name}" loading="lazy" onerror="this.remove()"></div>`
                : `<div class="sprite">${mark}</div>`;
            // 가로형 본문 하나 — 왼쪽 초상 / 오른쪽 HP · 행동 게이지 · 스킬 쿨 칸 (2026-09-03 위칸 폐기) — SCREEN_DESIGN §4-2
            // 쿨 칸은 아이콘뿐이다 — 이름 · 표기/실효 쿨 · 설명은 툴팁이 든다. 남은 쿨은 아이콘을 덮은 판(.cd-mask)이 위에서부터 걷히며 보여준다
            // 칸 수는 언제나 active_slots — 스킬이 둘인 영웅도 셋째 칸이 **빈 채로** 남는다 (SCREEN_DESIGN §4-2 개정 2026-08-31).
            // 칸이 사라지면 카드마다 줄 길이가 달라져 같은 격자로 안 읽히고, 「스킬이 둘」과 「셋째가 미정」이 구분되지 않는다
            // [개정 2026-09-03 사용자 지시] **몬스터도 같은 줄을 그린다** — 옛 규칙(「몬스터는 액티브가 없어 쿨 칸도 없다」)을 폐기한다.
            // 진영마다 줄이 있고 없으면 카드가 다른 물건으로 읽힌다. 몬스터 칸은 지금 전부 빈 칸이다
            const slots = Array.from({ length: Math.max(D.balance.active_slots, u.skills?.length ?? 0) }, (_, i) => u.skills?.[i] ?? null);
            // 칸이 드는 것은 **그림**이다 (2026-09-03 · SCREEN_DESIGN §2) — 어느 그림인지는 `mock.skillIcon` 이 id 에서 정한다.
            // 파일이 없으면 `onerror` 로 img 만 빠지고 칸이 빈 채 남는다(밑에 이모지를 안 깐다 — 영웅 초상과 같은 이유)
            const skills = `<div class="cd-list">${slots.map(s => s
                ? `<div class="cd-slot"><span class="cd-g">${skillImg(s)}</span><i class="cd-mask"></i></div>`
                : `<div class="cd-slot empty"></div>`).join('')}</div>`;
            // 이름 띠 — **양 진영 같다** (2026-09-03 사용자 지시 · SCREEN_DESIGN §4-2). 같은 날 아침에 걷었던 위칸의 재도입이고,
            // 걷은 이유(이름·죄종 칩·정예 태그가 한 줄에 뒤엉킴)는 **이름만 남기는 것**으로 푼다 — 「무엇인가」는 띠 색(등급)이 든다.
            // 몬스터가 카드에서 이름을 되찾는 자리이기도 하다 — 위칸이 없던 동안은 초상으로만 어느 몬스터인지 구분해야 했다
            // 이름·신원은 **초상 오른쪽 열의 첫 줄 하나**다 (2026-09-03 사용자 지시 · SCREEN_DESIGN §4-2) —
            // 왼쪽에 무채색 신원(`Lv.n · 직업` / 정예·보스 라벨) · **이름은 오른쪽 끝**. 일반 몬스터는 이름뿐이다
            const ident = identOf(u);
            n.innerHTML = `
                <div class="unit-body">
                    ${sprite}
                    <div class="unit-info">
                        <div class="unit-id">${ident ? `<span class="unit-ident">${ident}</span>` : ''}<span class="unit-name">${name}</span></div>
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
    // 행동 게이지 — 마지막 행동 이후 경과가 주기에 닿으면 가득 찬다 (SCREEN_DESIGN §4-2 재개정 2026-09-04).
    // 행동한 틱(u.acted — apply 의 skill/hit/dodge 가 세우고 start 의 틱 루프가 눕힌다)은 **100% 를 그린다** —
    // 이벤트가 lastAct 를 곧장 리셋하면 「꽉 참」 프레임이 화면에 한 번도 안 나온다(옛 85% 발광이 때우던 구멍).
    // 리셋(내려가는 변화)은 전환 없이 스냅 — 전환이 걸리면 「비워짐」이 「흘러내림」으로 보인다.
    const act = u.node.querySelector('.act-fill');
    if (act) {
        const fill = u.hp <= 0 ? 0 : u.acted ? 1 : clamp01((state.t - u.lastAct) / u.period);
        act.style.transition = fill < u.actFill ? 'none' : '';
        act.style.width = fill * 100 + '%';
        u.actFill = fill;
    }
    // 스킬 쿨 게이지 — 시뮬이 실제로 쓴 쿨(`skill` 이벤트의 firedAt → ready)로 걷는다. 재생기는 쿨을 계산하지 않는다
    if (u.skills?.length) u.node.querySelectorAll('.cd-slot').forEach((slot, i) => {
        const s = u.skills[i];
        if (!s) return;                 // 빈 칸 — 걷을 쿨이 없다 (SCREEN_DESIGN §4-2)
        const span = Math.max(1e-6, s.readyAt - s.firedAt);
        const pct = u.hp <= 0 ? 0 : clamp01(1 - (s.readyAt - state.t) / span);
        slot.querySelector('.cd-mask').style.height = (1 - pct) * 100 + '%';   // 남은 쿨만큼 위에서 덮는다
        // 준비 강조(`ready` 파란 테두리)는 2026-09-03 사용자 지시로 삭제 — 마스크가 다 걷힌 것 자체가 준비다
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
        return `<span class="buff-chip ${(b?.v ?? 0) < 0 ? 'bad' : 'good'}" title="${L(info.name)}">${skillImg(info)}</span>`;
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
/** 누적 데미지 판 — 파티 / 적 두 묶음. 막대는 묶음 안 최대 기준, % 는 묶음 합 기준. 보이는 동안만 그린다 */
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
        drain(state, root, opts);
        // acted 는 이 틱의 렌더까지만 산다 — 다음 틱에 눕혀야 게이지가 100% 에서 스냅으로 비워진다 (refreshUnit)
        for (const u of [...state.party, ...state.enemies]) { if (u.hp > 0) refreshUnit(state, u); u.acted = false; }
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
                // 영웅과 **같은 자리**를 갖는다 (2026-09-03 사용자 지시 · SCREEN_DESIGN §4-2) — 카드 형태를 진영 무관 하나로 만든 결과다.
                //   skills: []  → 쿨 칸이 active_slots 만큼 **빈 채로** 선다 (몬스터 액티브는 아직 없다 — skill.csv 는 영웅 전용)
                //   buffs: Map  → ⚠ **이게 없어서 적의 창이 화면에 안 떴다**: buff 이벤트가 `u.buffs?.set` 이라 조용히 흘렸다
                skills: [], buffs: new Map(),
            }));
            for (const e of state.enemies) state.units.set(e.key, e);
            renderUnits(state, root);
            paintRound(state, root);
            pushLog(state, root, t('log.roundStart', { n: ev.n, kind: kindLabel(ev.kind), list: enemyList(state) }));
            break;
        }
        case 'skill': {   // 시전 — 그 차례의 사건. 뒤따르는 hit/dodge/heal/buff 가 같은 s 를 단다
            const u = U(ev.u);
            if (u) { u.lastAct = ev.t; u.acted = true; castSkill(state, u, ev); }
            break;
        }
        case 'hit': {
            const a = U(ev.a), d = U(ev.d);
            const skill = strikeLabel(ev.s);
            if (a) { a.lastAct = ev.t; a.acted = true; if (ev.ahp !== undefined) { a.hp = ev.ahp; refreshUnit(state, a); } }
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
            if (a) { a.lastAct = ev.t; a.acted = true; }
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
