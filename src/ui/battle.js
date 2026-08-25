/**
 * 전투 관전 화면 — **재생기**. 전투는 game_logic/battle.js 가 이미 끝까지 계산했고,
 * 여기서는 그 타임라인을 시간에 맞춰 화면에 옮길 뿐이다.
 *   · 관전으로 본 전투와 즉시 정산(건너뛰기·부재 정산)이 갈릴 수 없다 — 같은 결과를 보는 두 창구다
 *   · 배속·일시정지·건너뛰기는 재생 속도의 문제지 결과의 문제가 아니다
 *   · 언어를 바꿔도 같은 타임라인을 다시 재생한다
 *
 * 배치: 적(위) / 파티(아래) 상하 대치 + 우측 전투 로그. 유닛 카드는 세로형, 공격 모션은 세로 이동.
 * 행동 게이지 = 마지막 행동 이후 경과 ÷ 행동 주기. 스킬 쿨 게이지 자리는 남겨 두되 아직 비어 있다(스킬 미작성).
 *
 * i18n: 표시 문자열은 전부 t()/L() — 이 파일에 한국어 리터럴은 없다 (주석 제외).
 */

import * as M from './mock.js';
import { D } from './data.js';
import { t, L } from './i18n.js';

const SPEEDS = [1, 2, 4];
const TICK = 0.1;
const GLYPHS = { warrior: '⚔', knight: '⛨', mage: '✦', archer: '🏹', priest: '✚', assassin: '🗡', necromancer: '☠' };

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
    const { result, stageId, heroes } = opts;
    const stage = D.stages[stageId];
    const state = {
        t: 0, idx: 0, speed: 1, running: true, ended: false,
        round: 0, timer: null, timeouts: [],
        units: new Map(), party: [], enemies: [],
    };

    // 파티 유닛 — 결과의 party 정보 + 로스터의 표시 정보(이름·죄종·직업)
    state.party = result.party.map(p => {
        const h = heroes.find(x => x.uid === p.uid);
        return {
            key: p.key, side: 'party', name: h?.name, sin: h?.sin, cls: h?.cls,
            hp: p.hpMax, hpMax: p.hpMax, period: p.period, lastAct: -p.period, node: null,
            glyph: GLYPHS[h?.cls] ?? '⚔',
        };
    });
    for (const u of state.party) state.units.set(u.key, u);

    container.appendChild(buildDom(state, stage, stageId));
    bindControls(state, container, opts);
    // t=0 의 이벤트(첫 라운드 편성)를 먼저 적용해서 첫 프레임부터 적이 서 있게 한다
    drain(state, container, opts);
    start(state, container, opts);

    return () => {
        clearInterval(state.timer); state.timer = null;
        for (const id of state.timeouts) clearTimeout(id);
    };
}

/* ───────── 구성 ───────── */

function buildDom(state, stage, stageId) {
    const wrap = document.createElement('div');
    wrap.className = 'panel battle-panel';
    const bg = M.stageBgOf(stageId);
    const rounds = D.balance.rounds_per_stage;
    const kindOf = n => D.roundTypes.find(r => r.round_num === n)?.round_type ?? 'normal';
    wrap.innerHTML = `
        <div class="battle-head">
            <div>
                <div>${L(M.chapterOf(stage.chapter)?.name)} — ${L(M.stageName(stage))}</div>
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
            <div class="battle-log-wrap">
                <div class="log-head muted">${t('bt.log.h')}</div>
                <ul class="battle-log"></ul>
            </div>
        </div>
        <details class="note">
            <summary>${t('ui.note')}</summary>
            <div class="note-body">${t('bt.note')}</div>
        </details>`;
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
    root.querySelector('.b-speed[data-s="1"]').classList.add('on');
    const pause = root.querySelector('.b-pause');
    pause.onclick = () => {
        state.running = !state.running;
        pause.textContent = state.running ? t('bt.pause') : t('bt.resume');
    };
    // 건너뛰기 — 결과는 이미 정산돼 있다. 재생만 멈추고 리포트로 간다
    root.querySelector('.b-skip').onclick = () => { clearInterval(state.timer); opts.onEnd(false); };
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

const enemyName = e => e.grade === 'elite' && e.sin ? M.eliteName(e.sin, e.monsterId) : M.monsterName(e.monsterId);
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
            const discSin = u.side === 'enemy' ? (u.sin ?? M.monsterSin(u.monsterId)) : null;
            const dc = discSin ? M.SINS[discSin]?.color : null;
            const face = u.side === 'enemy' ? M.monsterFace(u.monsterId) : M.heroFace(u.uid);
            const sprite = face
                ? `<div class="sprite has-face"><img src="${face}" alt="${name}" loading="lazy"></div>`
                : dc
                    ? `<div class="sprite disc" style="color:${dc};background:${dc}22;border-color:${dc}66">${L(M.monsterName(u.monsterId)).charAt(0)}</div>`
                    : `<div class="sprite">${u.glyph}</div>`;
            n.innerHTML = `
                ${sprite}
                <div class="unit-name">${name}</div>
                ${u.side === 'enemy' ? `<div class="tags">
                    ${u.sin ? `<span class="sin-chip" style="color:${M.SINS[u.sin]?.color}">${L(M.SINS[u.sin])}</span>` : ''}
                    ${u.grade === 'elite' ? `<span class="elite-tag">${t('kind.elite')}</span>` : ''}
                    ${boss ? `<span class="elite-tag boss-tag">${t(u.grade === 'chapter_boss' ? 'kind.chapterBoss' : 'kind.boss')}</span>` : ''}
                </div>` : ''}
                ${u.traits ? `<div class="trait-line" title="${t('bt.traitsTitle')}">${u.traits.map(x => L(x)).join(' · ')}</div>` : ''}
                <div class="bar hp"><i style="width:${u.hp / u.hpMax * 100}%"></i></div>
                <div class="unit-sub">
                    <span class="hp-text">${Math.max(0, Math.round(u.hp))} / ${u.hpMax}</span>
                </div>
                <div class="act-row" title="${t('bt.actTitle', { s: u.period.toFixed(2) })}">
                    <i class="act-fill"></i>
                </div>
                <div class="pop-layer"></div>`;
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
}

function popup(state, u, text, cls) {
    if (!u?.node) return;
    const layer = u.node.querySelector('.pop-layer');
    const p = document.createElement('span');
    p.className = `pop ${cls}`;
    p.textContent = text;
    layer.appendChild(p);
    state.timeouts.push(setTimeout(() => p.remove(), 900));
}

function lunge(state, u) {
    if (!u?.node) return;
    u.node.classList.add('attacking');
    state.timeouts.push(setTimeout(() => u.node?.classList.remove('attacking'), 260));
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
            if (a) { a.lastAct = ev.t; lunge(state, a); if (ev.ahp !== undefined) { a.hp = ev.ahp; refreshUnit(state, a); } }
            if (d) {
                d.hp = ev.dhp;
                popup(state, d, `-${ev.dmg}`, ev.crit ? 'crit' : (a?.side === 'party' ? 'dmg' : 'dmg-in'));
                refreshUnit(state, d);
            }
            if (ev.crit && a && d) pushLog(state, root, t('log.crit', { name: L(a.name), target: L(d.name), dmg: ev.dmg }));
            break;
        }
        case 'dodge': {
            const a = U(ev.a), d = U(ev.d);
            if (a) { a.lastAct = ev.t; lunge(state, a); }
            if (d) popup(state, d, t('pop.dodge'), 'miss');
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
