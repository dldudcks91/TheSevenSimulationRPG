/**
 * 전투 관전 화면 — **연출용 목업이다. 실제 전투 규칙이 아니다.**
 *
 * 배치: 적(위) / 파티(아래) 상하 대치 + 우측 전투 로그.
 *   각 진영 안에서는 유닛이 가로로 나란히 선다 — 그래야 대치 구도가 성립한다.
 *   따라서 유닛 카드는 세로형(스프라이트 위 / 정보 아래), 공격 모션은 세로 이동.
 *   적 수가 2~6으로 변해도 가로로 늘어나며 필요하면 줄바꿈된다.
 *
 * 여기의 데미지/쿨다운/타겟팅은 전부 "화면이 어떻게 움직이나"를 보려고 대충 굴린 것.
 * 전투 설계(타겟팅·스킬 발동·사망 처리)는 battle_design.md 가 나온 뒤에 game_logic/ 으로 들어간다.
 *
 * 확인하려는 것 두 가지:
 *   1. 실시간으로 진행되는 전투를 "본다"는 게 화면에서 어떤 느낌인가
 *   2. 스프라이트 이동/생성/삭제를 DOM으로 굴리는 데 문제가 없는가
 */

import * as M from './mock.js';

const SPEEDS = [1, 2, 4];

const ENEMY_POOL = [
    { name: '오크 전사', hp: 95, atk: 14, aspd: 0.45, glyph: '⛊', grade: 'normal' },
    { name: '아바돈', hp: 450, atk: 10, aspd: 0.7, glyph: '☠', grade: 'normal' },
    { name: '분노의 아바돈 격노자', hp: 900, atk: 21, aspd: 0.8, glyph: '☠', grade: 'elite', sin: 'wrath' },
    { name: '고블린 전사', hp: 70, atk: 10, aspd: 0.65, glyph: '⚔', grade: 'normal' },
];

const SKILLS = [
    { name: '격노의 일격', icon: '⚡', cd: 12 },
    { name: '방어 태세', icon: '🛡', cd: 9 },
    { name: '회오리 베기', icon: '🌀', cd: 14 },
];

/** 관전 화면을 container 에 붙이고, 정리 함수를 돌려준다 */
export function mountBattle(container) {
    const state = {
        wave: 3, waves: 4, t: 0, speed: 1, running: true,
        party: [], enemies: [], log: [], timer: null,
    };

    // 파티는 로스터 목업에서 가져온다 (전투 화면도 같은 영웅을 본다)
    state.party = M.PARTY.map((uid, i) => {
        const h = M.HEROES.find(x => x.uid === uid);
        return {
            side: 'party', name: h.name, sin: h.sin, cls: h.cls,
            hpMax: h.hpMax, hp: Math.round(h.hpMax * [0.44, 0.71, 1][i]),
            atk: h.derived.atk, aspd: Number(h.derived.aspd), cd: i * 0.4,
            skill: SKILLS[i], skillCd: [3, 0, 7][i],
            glyph: ['⚔', '⛨', '🗡'][i], node: null,
        };
    });
    spawnWave(state);

    container.appendChild(buildDom(state));
    bindControls(state, container);
    renderUnits(state, container);
    for (const line of [
        '웨이브 3 시작 — 아바돈 ×2',
        '카일런 → 아바돈  184 피해',
        '베르나 [방어 태세] 발동',
    ]) pushLog(state, container, line);

    start(state, container);

    return () => { clearInterval(state.timer); state.timer = null; };
}

/* ───────── 구성 ───────── */

function buildDom(state) {
    const wrap = document.createElement('div');
    wrap.className = 'panel battle-panel';
    wrap.innerHTML = `
        <div class="battle-head">
            <div>
                <div>${M.RUNNING.zoneName}</div>
                <div class="muted" style="font-size:var(--fs-sm)">
                    웨이브 <b class="b-wave">${state.wave}</b> / ${state.waves}
                    &nbsp;·&nbsp; <span class="b-clock">00:00</span>
                </div>
            </div>
            <div class="battle-ctrl">
                ${SPEEDS.map(s => `<button class="btn sm b-speed" data-s="${s}">${s}배속</button>`).join('')}
                <button class="btn sm b-pause">일시정지</button>
                <button class="btn sm">건너뛰고 리포트만</button>
            </div>
        </div>
        <div class="battle-body">
            <div class="arena">
                <div class="side side-enemy"></div>
                <div class="divider"><span class="muted">VS</span></div>
                <div class="side side-party"></div>
            </div>
            <div class="battle-log-wrap">
                <div class="log-head muted">전투 로그</div>
                <ul class="battle-log"></ul>
            </div>
        </div>
        <div class="muted" style="margin-top:10px;font-size:var(--fs-xs)">
            관전은 가능하되 <b>의무가 아니다</b> — 보고 있어도 결과가 같고, 안 봐도 손해가 없다.
            창을 닫으면 리포트로 요약된다.
        </div>`;
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
        pause.textContent = state.running ? '일시정지' : '재개';
    };
}

function spawnWave(state) {
    const count = 2 + (state.wave % 2);
    state.enemies = Array.from({ length: count }, (_, i) => {
        const base = ENEMY_POOL[(state.wave + i) % ENEMY_POOL.length];
        return {
            side: 'enemy', name: base.name, glyph: base.glyph, grade: base.grade, sin: base.sin,
            hpMax: base.hp, hp: base.hp, atk: base.atk, aspd: base.aspd, cd: i * 0.3,
            status: base.grade === 'elite' ? ['🔥'] : [], node: null,
        };
    });
}

/* ───────── 렌더 ───────── */

function renderUnits(state, root) {
    for (const [sel, list] of [['.side-enemy', state.enemies], ['.side-party', state.party]]) {
        const side = root.querySelector(sel);
        side.innerHTML = '';
        for (const u of list) {
            const n = document.createElement('div');
            n.className = `unit ${u.side}${u.grade === 'elite' ? ' elite' : ''}`;
            // 진영 안에서 가로로 나란히 서므로 카드는 세로형 (스프라이트 위, 정보 아래)
            if (u.sin) n.style.borderTopColor = M.SINS[u.sin]?.color;
            n.innerHTML = `
                <div class="sprite">${u.glyph}</div>
                <div class="unit-name">${u.name}</div>
                <div class="tags">
                    ${u.sin ? `<span class="sin-chip" style="color:${M.SINS[u.sin]?.color}">${M.SINS[u.sin]?.ko}</span>` : ''}
                    ${u.grade === 'elite' ? '<span class="elite-tag">정예</span>' : ''}
                    <span class="status">${(u.status ?? []).join('')}</span>
                </div>
                <div class="bar hp"><i style="width:${u.hp / u.hpMax * 100}%"></i></div>
                <div class="unit-sub">
                    <span class="hp-text">${Math.max(0, Math.round(u.hp))} / ${u.hpMax}</span>
                </div>
                ${u.skill ? `<div class="skill-chip" title="${u.skill.name}">${u.skill.icon}<b class="sk-cd"></b></div>` : ''}
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
    const cd = u.node.querySelector('.sk-cd');
    if (cd && u.skill) cd.textContent = u.skillCd > 0 ? ` ${Math.ceil(u.skillCd)}s` : ' 준비';
}

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
    while (ul.children.length > 40) ul.firstChild.remove();
    ul.parentElement.scrollTop = ul.parentElement.scrollHeight;
}

const clock = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

/* ───────── 틱 ───────── */

function start(state, root) {
    clearInterval(state.timer);
    const TICK = 0.25;                       // 시뮬 1틱 = 0.25초
    state.timer = setInterval(() => {
        if (!state.running) return;
        state.t += TICK;
        root.querySelector('.b-clock').textContent = clock(state.t);

        for (const u of [...state.party, ...state.enemies]) {
            if (u.hp <= 0) continue;
            u.cd -= TICK;
            if (u.skill) u.skillCd = Math.max(0, u.skillCd - TICK);

            if (u.cd <= 0) {
                u.cd = 1 / u.aspd;
                act(state, root, u);
            }
            refreshUnit(u);
        }

        if (state.enemies.every(e => e.hp <= 0)) {
            state.wave = state.wave >= state.waves ? 1 : state.wave + 1;
            root.querySelector('.b-wave').textContent = state.wave;
            spawnWave(state);
            renderUnits(state, root);
            pushLog(state, root, `<b>웨이브 ${state.wave} 시작</b> — ${state.enemies.map(e => e.name).join(', ')}`);
        }
    }, 250 / state.speed);
}

function act(state, root, u) {
    const foes = (u.side === 'party' ? state.enemies : state.party).filter(x => x.hp > 0);
    if (foes.length === 0) return;
    const target = foes[Math.floor(Math.random() * foes.length)];

    // 스킬 준비되면 스킬, 아니면 기본 공격 — 발동 규칙은 기획 대기(TODO)
    const useSkill = u.skill && u.skillCd <= 0;
    if (useSkill) u.skillCd = u.skill.cd;

    const crit = Math.random() < 0.28;
    let dmg = u.atk * (0.85 + Math.random() * 0.3) * (useSkill ? 2.1 : 1) * (crit ? 2.0 : 1);
    dmg = Math.round(dmg / (u.side === 'party' ? 1 : 2.2));

    lunge(u);
    target.hp -= dmg;
    popup(target, `-${dmg}`, crit ? 'crit' : (u.side === 'party' ? 'dmg' : 'dmg-in'));
    refreshUnit(target);

    if (useSkill) {
        pushLog(state, root, `${u.name} <b>[${u.skill.name}]</b> → ${target.name} <b>${dmg}</b> 피해`);
    } else if (crit) {
        pushLog(state, root, `${u.name} → ${target.name} <b class="crit-t">${dmg}</b> 치명타!`);
    }

    if (target.hp <= 0) {
        pushLog(state, root, `${target.name} 사망${target.side === 'enemy' ? ' — 드롭 판정' : ' — <b>전투 불능</b>'}`);
        popup(target, target.side === 'enemy' ? '처치' : '전투 불능', 'dead-tag');
    }
}
