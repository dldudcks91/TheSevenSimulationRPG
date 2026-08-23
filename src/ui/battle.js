/**
 * 전투 관전 화면 — **연출용 목업이다. 실제 전투 엔진이 아니다.**
 *
 * 배치: 적(위) / 파티(아래) 상하 대치 + 우측 전투 로그.
 *   각 진영 안에서는 유닛이 가로로 나란히 선다 — 그래야 대치 구도가 성립한다.
 *   따라서 유닛 카드는 세로형(스프라이트 위 / 정보 아래), 공격 모션은 세로 이동.
 *   적 수가 변해도 가로로 늘어나며 필요하면 줄바꿈된다.
 *
 * 데미지 공식·타겟팅·사망 처리는 여전히 대충 굴린 것이다. 진짜는 game_logic/ 으로 들어간다.
 * 다만 **battle_design.md 가 확정한 규칙은 화면에 그대로 반영**한다 —
 * 화면이 규칙과 다르게 움직이면 목업으로서 쓸모가 없기 때문이다:
 *   · 라운드 구조 9라운드 / 정예 3·6 / 보스 9        (base_expedition_design §1-2)
 *   · 행동 주기 단일 축 = 민첩 + 무기 속도             (battle_design §2)
 *   · 발동 2단 정렬: 가장 오래 기다린 스킬 → 슬롯 순서 (battle_design §3)
 *   · 한 차례에 하나, 스킬은 그 차례의 공격을 대체     (battle_design §3)
 *   · 쿨은 실시간, 실효 쿨을 화면에 병기              (battle_design §6)
 *   · 같은 시드 = 같은 결과 (주입 RNG, Math.random 미사용)
 *
 * i18n: 표시 문자열은 전부 t()/L() 을 거친다 — 이 파일에 한국어 리터럴은 없다 (주석 제외).
 *   유닛 이름은 {ko, en} 쌍으로 들고 다니다가 그릴 때 L() 로 푼다. 언어를 바꾸면 render() 가
 *   관전을 재장착하는데, 시드가 고정이라 **같은 전투가 그대로 다시 재생된다**.
 */

import * as M from './mock.js';
import { t, L } from './i18n.js';

const SPEEDS = [1, 2, 4];

/**
 * 시드 RNG — CLAUDE.md 이식성 규칙 2 (난수 주입).
 * 관전으로 본 전투와 오프라인 즉시 계산이 갈리면 안 되므로, 목업 단계부터 Math.random 을 쓰지 않는다.
 */
function makeRng(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const GLYPHS = ['⚔', '🏹', '⛊'];

const roundKind = n =>
    n === M.BOSS_ROUND ? 'boss' : M.ELITE_ROUNDS.includes(n) ? 'elite' : 'normal';
const kindLabel = k => t(`kind.${k}`);

/** 관전 화면을 container 에 붙이고, 정리 함수를 돌려준다 */
export function mountBattle(container) {
    const zone = M.ZONES.find(z => z.id === M.RUNNING.zoneId) ?? M.ZONES[0];
    const state = {
        zone,
        round: M.RUNNING.round, rounds: M.BALANCE.rounds_per_stage,
        t: 0, speed: 1, running: true,
        rng: makeRng(20260821),   // 고정 시드 = 새로고침해도 같은 전투 (결정론 확인용)
        party: [], enemies: [], timer: null,
    };

    // 파티는 로스터 목업에서 가져온다 (전투 화면도 같은 영웅을 본다)
    state.party = M.PARTY.map((uid, i) => {
        const h = M.HEROES.find(x => x.uid === uid);
        const cycle = 1 / Number(h.derived.aspd);       // 행동 주기 = 민첩 + 무기 속도 (단일 축)
        return {
            side: 'party', name: h.name, sin: h.sin, cls: h.cls,
            hpMax: h.hpMax, hp: Math.round(h.hpMax * [0.44, 0.71, 1][i]),
            atk: h.derived.atk, cycle, next: i * 0.4,
            // 액티브 슬롯 3개 — 슬롯 순서가 동률일 때의 우선순위
            slots: (h.actives ?? []).map((a, si) => a && {
                ...a, slot: si, left: [3, 0, 7][si] ?? 0, readyAt: null,
            }).filter(Boolean),
            glyph: ['⚔', '⛨', '🗡'][i], node: null,
        };
    });
    spawnRound(state);

    container.appendChild(buildDom(state));
    bindControls(state, container);
    renderUnits(state, container);
    pushLog(state, container, t('log.roundStart', {
        n: state.round, kind: kindLabel(roundKind(state.round)), list: enemyList(state),
    }));

    start(state, container);

    return () => { clearInterval(state.timer); state.timer = null; };
}

const enemyList = state => state.enemies.map(e => L(e.name)).join(', ');

/* ───────── 구성 ───────── */

function buildDom(state) {
    const wrap = document.createElement('div');
    wrap.className = 'panel battle-panel';
    wrap.innerHTML = `
        <div class="battle-head">
            <div>
                <div>${L(state.zone.region)} — ${L(state.zone.name)}</div>
                <div class="muted" style="font-size:var(--fs-sm)">
                    ${t('bt.round')} <b class="b-round">${state.round}</b> / ${state.rounds}
                    <span class="rk b-kind"></span>
                    &nbsp;·&nbsp; <span class="b-clock">00:00</span>
                </div>
                <div class="round-track">${
                    Array.from({ length: state.rounds }, (_, i) => {
                        const n = i + 1, k = roundKind(n);
                        return `<span class="rt ${k}" data-n="${n}" title="${t('bt.rTitle', { n, kind: kindLabel(k) })}">${n}</span>`;
                    }).join('')
                }</div>
            </div>
            <div class="battle-ctrl">
                ${SPEEDS.map(s => `<button class="btn sm b-speed" data-s="${s}">${t('bt.speed', { n: s })}</button>`).join('')}
                <button class="btn sm b-pause">${t('bt.pause')}</button>
                <button class="btn sm">${t('bt.skip')}</button>
            </div>
        </div>
        <div class="battle-body">
            <div class="arena${state.zone.bg ? ' has-bg' : ''}"${state.zone.bg
                ? ` style="background-image:linear-gradient(rgba(10,10,18,.42),rgba(10,10,18,.78)),url('${state.zone.bg}')"`
                : ''}>
                <div class="side side-enemy"></div>
                <div class="divider"><span class="muted">VS</span></div>
                <div class="side side-party"></div>
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

function bindControls(state, root) {
    root.querySelectorAll('.b-speed').forEach(b => {
        b.onclick = () => {
            state.speed = Number(b.dataset.s);
            root.querySelectorAll('.b-speed').forEach(x => x.classList.toggle('on', x === b));
            start(state, root);
        };
    });
    root.querySelector(`.b-speed[data-s="1"]`).classList.add('on');
    const pause = root.querySelector('.b-pause');
    pause.onclick = () => {
        state.running = !state.running;
        pause.textContent = state.running ? t('bt.pause') : t('bt.resume');
    };
    paintRound(state, root);
}

function paintRound(state, root) {
    const k = roundKind(state.round);
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

/**
 * 라운드 구성 — **구조는 고정, 내용물은 랜덤** (base_expedition_design §1-2).
 * 정예 라운드 = 정예 1 + 일반 0~2 / 보스 라운드 = 보스 + 호위 1~2 (챕터보스는 단독).
 */
function spawnRound(state) {
    const kind = roundKind(state.round);
    const pool = state.zone.monsterIds;
    const rnd = state.rng;
    const pick = () => pool[Math.floor(rnd() * pool.length)];
    // 얼굴 이미지가 있는 몬스터는 이미지로, 없으면 이모지 글리프로 폴백
    const mk = (id, grade, mult = 1, extra = {}) => ({
        side: 'enemy', name: M.monsterName(id), monsterId: id, grade,
        face: M.monsterFace(id),
        glyph: GLYPHS[pool.indexOf(id) % GLYPHS.length] ?? '☠',
        // ⚠ 목업 수치 — monster.csv 실값(Ch1 잡몹 hp 30대)과도, 영웅 시작 HP 100 기준과도 맞지 않는다.
        //    피해 계산 공식 확정 후 영웅 derived 수치와 함께 통째로 재조정 대상 (battle_design.md §9)
        hpMax: Math.round((70 + state.zone.mlvl * 12) * mult),
        hp: Math.round((70 + state.zone.mlvl * 12) * mult),
        atk: Math.round((9 + state.zone.mlvl * 1.4) * (grade === 'normal' ? 1 : 1.5)),
        cycle: 1.6 + rnd() * 0.7, next: rnd() * 0.6,
        status: [], node: null, ...extra,
    });

    const list = [];
    if (kind === 'boss') {
        const chapterBoss = state.zone.bossKind === 'chapter';
        const boss = mk(state.zone.bossId, 'boss', chapterBoss ? 9 : 6);
        if (!boss.face) boss.glyph = '👑';       // 얼굴이 있으면 왕관 글리프를 덮어쓰지 않는다
        list.push(boss);
        // 챕터보스는 단독 (서사적 3:1 대결), 스테이지보스는 호위 1~2
        if (!chapterBoss) {
            const escorts = 1 + Math.floor(rnd() * 2);
            for (let i = 0; i < escorts; i++) list.push(mk(pick(), 'normal'));
        }
    } else if (kind === 'elite') {
        const sins = Object.keys(M.SINS);
        const sin = sins[Math.floor(rnd() * sins.length)];
        // 정예 = 죄종 고유 특성 1 + 공통 특성 2 (elite_trait.csv, 840 변형)
        const traits = [M.SIN_TRAITS[sin], ...pickTwo(M.COMMON_TRAITS, rnd)];
        const base = pick();
        list.push(mk(base, 'elite', 3.4, { name: M.eliteName(sin, base), sin, traits, status: ['🔥'] }));
        const mobs = Math.floor(rnd() * 3);   // 정예 1 + 일반 0~2
        for (let i = 0; i < mobs; i++) list.push(mk(pick(), 'normal'));
    } else {
        const n = 1 + Math.floor(rnd() * M.BALANCE.wave_monster_max);   // 라운드당 1~3
        for (let i = 0; i < n; i++) list.push(mk(pick(), 'normal'));
    }
    state.enemies = list;
}

function pickTwo(arr, rnd) {
    const a = Math.floor(rnd() * arr.length);
    let b = Math.floor(rnd() * arr.length);
    if (b === a) b = (b + 1) % arr.length;
    return [arr[a], arr[b]];
}

/* ───────── 렌더 ───────── */

function renderUnits(state, root) {
    for (const [sel, list] of [['.side-enemy', state.enemies], ['.side-party', state.party]]) {
        const side = root.querySelector(sel);
        side.innerHTML = '';
        for (const u of list) {
            const n = document.createElement('div');
            n.className = `unit ${u.side}${u.grade === 'elite' ? ' elite' : ''}${u.grade === 'boss' ? ' boss' : ''}`;
            // 진영 안에서 가로로 나란히 서므로 카드는 세로형 (스프라이트 위, 정보 아래)
            // 죄종은 **상단 테두리 색**으로만 보여준다 — 영웅 죄종은 전투 중 변하지 않아
            // 칩까지 달면 매 프레임 읽을 필요 없는 정보가 한 줄을 차지한다.
            // 적의 죄종 칩은 남긴다: 정예의 죄종은 그 판에서 굴려진 것이라 읽어야 하는 정보다.
            if (u.sin) n.style.borderTopColor = M.SINS[u.sin]?.color;
            const name = L(u.name);
            // 얼굴 아트가 있으면 이미지, 없으면 죄종 색 원판 + 이니셜 (faces/README 폴백 규격).
            // 파티 영웅은 몬스터가 아니므로 기존 이모지 글리프를 그대로 쓴다.
            const discSin = u.side === 'enemy' ? (u.sin ?? M.monsterSin(u.monsterId)) : null;
            const dc = discSin ? M.SINS[discSin]?.color : null;
            const sprite = u.face
                ? `<div class="sprite has-face"><img src="${u.face}" alt="${name}" loading="lazy"></div>`
                : dc
                    ? `<div class="sprite disc" style="color:${dc};background:${dc}22;border-color:${dc}66">${L(M.monsterName(u.monsterId)).charAt(0)}</div>`
                    : `<div class="sprite">${u.glyph}</div>`;
            n.innerHTML = `
                ${sprite}
                <div class="unit-name">${name}</div>
                ${u.side === 'enemy' ? `<div class="tags">
                    ${u.sin ? `<span class="sin-chip" style="color:${M.SINS[u.sin]?.color}">${L(M.SINS[u.sin])}</span>` : ''}
                    ${u.grade === 'elite' ? `<span class="elite-tag">${t('kind.elite')}</span>` : ''}
                    ${u.grade === 'boss' ? `<span class="elite-tag boss-tag">${t('kind.boss')}</span>` : ''}
                    <span class="status">${(u.status ?? []).join('')}</span>
                </div>` : ''}
                ${u.traits ? `<div class="trait-line" title="${t('bt.traitsTitle')}">${u.traits.map(x => L(x)).join(' · ')}</div>` : ''}
                <div class="bar hp"><i style="width:${u.hp / u.hpMax * 100}%"></i></div>
                <div class="unit-sub">
                    <span class="hp-text">${Math.max(0, Math.round(u.hp))} / ${u.hpMax}</span>
                </div>
                <div class="act-row" title="${t('bt.actTitle', { s: u.cycle.toFixed(2) })}">
                    <i class="act-fill"></i>
                </div>
                ${u.slots?.length ? `<div class="cd-list">${u.slots.map(s => {
                    // 실효 쿨 = ceil(표기 쿨 ÷ 행동 주기) × 행동 주기 (battle_design §6)
                    const eff = Math.ceil(s.cd / u.cycle) * u.cycle;
                    return `<div class="cd-row" data-slot="${s.slot}"
                        title="${t('bt.slotTitle', { n: s.slot + 1, name: L(s.name), cd: s.cd, eff: eff.toFixed(1) })}">
                        <span class="cd-ico">${s.icon}</span>
                        <span class="cd-bar"><i></i></span>
                    </div>`;
                }).join('')}</div>` : ''}
                <div class="pop-layer"></div>`;
            u.node = n;
            side.appendChild(n);
        }
    }
}

function refreshUnit(u) {
    if (!u.node) return;
    const pct = Math.max(0, u.hp / u.hpMax * 100);
    u.node.querySelector('.bar.hp > i').style.width = pct + '%';
    u.node.querySelector('.hp-text').textContent = `${Math.max(0, Math.round(u.hp))} / ${u.hpMax}`;
    u.node.classList.toggle('dead', u.hp <= 0);
    // 행동 게이지 — 다음 행동까지 남은 시간을 뒤집어 "차오르는" 방향으로 보여준다
    const act = u.node.querySelector('.act-fill');
    if (act) act.style.width = clamp01(1 - u.next / u.cycle) * 100 + '%';

    // 스킬 쿨 게이지 — 쿨이 실시간으로 돌기 때문에 그대로 채우면 된다
    for (const s of u.slots ?? []) {
        const row = u.node.querySelector(`.cd-row[data-slot="${s.slot}"]`);
        if (!row) continue;
        const ready = s.left <= 0;
        row.classList.toggle('ready', ready);
        row.querySelector('.cd-bar > i').style.width =
            (ready ? 100 : clamp01(1 - s.left / s.cd) * 100) + '%';
    }
}

const clamp01 = v => Math.max(0, Math.min(1, v));

function popup(u, text, cls) {
    if (!u.node) return;
    const layer = u.node.querySelector('.pop-layer');
    const p = document.createElement('span');
    p.className = `pop ${cls}`;
    p.textContent = text;
    layer.appendChild(p);
    setTimeout(() => p.remove(), 900);   // 생성 → 삭제, DOM 노드 수는 항상 한 자릿수
}

function lunge(u) {
    if (!u.node) return;
    u.node.classList.add('attacking');
    setTimeout(() => u.node?.classList.remove('attacking'), 260);
}

function pushLog(state, root, text) {
    const ul = root.querySelector('.battle-log');
    const li = document.createElement('li');
    li.innerHTML = `<span class="t">${clock(state.t)}</span> ${text}`;
    ul.appendChild(li);
    while (ul.children.length > 60) ul.firstChild.remove();
    ul.parentElement.scrollTop = ul.parentElement.scrollHeight;
}

const clock = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/* ───────── 틱 ───────── */

function start(state, root) {
    clearInterval(state.timer);
    // 시뮬 1틱 = 0.1초. 게이지를 눈으로 보게 되면서 0.25초 스텝은 너무 뚝뚝 끊겼다.
    // 틱을 줄여도 규칙은 그대로고 시간 해상도만 올라간다 (시드 고정이라 결과도 재현된다)
    const TICK = 0.1;
    state.timer = setInterval(() => {
        if (!state.running) return;
        state.t += TICK;
        root.querySelector('.b-clock').textContent = clock(state.t);

        for (const u of [...state.party, ...state.enemies]) {
            if (u.hp <= 0) continue;

            // 쿨은 **실시간**으로 돈다 — 공격 횟수 기준이 아니다 (공속 이중 스케일링 차단)
            for (const s of u.slots ?? []) {
                if (s.left > 0) {
                    s.left = Math.max(0, s.left - TICK);
                    if (s.left === 0) s.readyAt = state.t;   // 준비된 시각 = 2단 정렬의 1차 기준
                }
            }

            u.next -= TICK;
            if (u.next <= 0) {
                u.next = u.cycle;            // 행동 주기 = 민첩 + 무기 속도 (단일 시계)
                act(state, root, u);
            }
            refreshUnit(u);
        }

        if (state.enemies.every(e => e.hp <= 0)) advanceRound(state, root);
    }, TICK * 1000 / state.speed);
}

function advanceRound(state, root) {
    if (state.round >= state.rounds) {
        pushLog(state, root, t('log.stageClear'));
        state.round = 1;
    } else {
        state.round += 1;
    }
    spawnRound(state);
    renderUnits(state, root);
    paintRound(state, root);
    pushLog(state, root, t('log.roundStart', {
        n: state.round, kind: kindLabel(roundKind(state.round)), list: enemyList(state),
    }));
}

/**
 * 한 차례에 **하나**만 실행한다 (battle_design §3).
 *   1. 준비된 액티브 중 가장 오래 기다린 것
 *   2. 동시에 준비됐으면 슬롯 순서가 앞선 것
 *   3. 준비된 것이 없으면 기본 공격 (무기군이 결정한다)
 */
function pickAction(u) {
    const ready = (u.slots ?? []).filter(s => s.left <= 0);
    if (ready.length === 0) return null;
    return ready.sort((a, b) => (a.readyAt ?? 0) - (b.readyAt ?? 0) || a.slot - b.slot)[0];
}

function act(state, root, u) {
    const foes = (u.side === 'party' ? state.enemies : state.party).filter(x => x.hp > 0);
    if (foes.length === 0) return;
    // 타겟팅은 **미확정** — 진형/어그로 결정 전까지는 랜덤 (battle_design §9)
    const target = foes[Math.floor(state.rng() * foes.length)];

    const skill = pickAction(u);
    if (skill) { skill.left = skill.cd; skill.readyAt = null; }   // 스킬은 그 차례의 공격을 대체한다

    const crit = state.rng() < 0.28;
    let dmg = u.atk * (0.85 + state.rng() * 0.3) * (skill ? 2.1 : 1) * (crit ? 2.0 : 1);
    dmg = Math.round(dmg / (u.side === 'party' ? 1 : 2.2));

    lunge(u);
    target.hp -= dmg;
    popup(target, `-${dmg}`, crit ? 'crit' : (u.side === 'party' ? 'dmg' : 'dmg-in'));
    refreshUnit(target);

    const uName = L(u.name), tName = L(target.name);
    if (skill) {
        pushLog(state, root, t('log.skillHit', { name: uName, slot: skill.slot + 1, skill: L(skill.name), target: tName, dmg }));
    } else if (crit) {
        pushLog(state, root, t('log.crit', { name: uName, target: tName, dmg }));
    }

    if (target.hp <= 0) {
        // 용어는 "사망"이 아니라 부상/전투불능 — 방치형 계약의 언어 (base_expedition_design §1-1)
        const enemy = target.side === 'enemy';
        pushLog(state, root, t(enemy ? 'log.slain' : 'log.downed', { name: tName }));
        popup(target, t(enemy ? 'pop.slain' : 'pop.downed'), 'dead-tag');
    }
}
