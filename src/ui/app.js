/**
 * 화면 목업 렌더러 — DOM만 그린다. 게임 로직은 여기에 들어오지 않는다.
 *
 * CLAUDE.md 이식성 규칙: game_logic/ 은 DOM을 모르고, ui/ 는 규칙을 모른다.
 * 지금은 game_logic/ 이 비어 있으므로 mock.js 의 고정 데이터를 그대로 그린다.
 *
 * 탭 구성 (2026-08-21 확정): 원정 / 장비 / 스킬 / 선술집 / 도감
 *   전투 파티는 **한 팀만** 운용하므로 원정과 전투를 분리하지 않는다.
 *   원정 탭 하나가 [편성·지역선택] → [전투 관전] → [리포트] 세 상태를 갖는다.
 */

import * as M from './mock.js';
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
const sinKo = id => M.SINS[id]?.ko ?? id;
const rarity = r => M.RARITY[r] ?? M.RARITY.magic;

const TABS = [
    { id: 'expedition', ko: '원정' },
    { id: 'equip', ko: '장비' },
    { id: 'skill', ko: '스킬' },
    { id: 'tavern', ko: '선술집' },
    { id: 'codex', ko: '도감' },
];

const state = {
    tab: 'expedition',
    exp: 'battle',          // idle | battle | report
    heroUid: 'h1',
    slotFilter: null,
    skillTab: 'sin',
};
let stopBattle = null;      // 화면을 떠나면 관전 타이머를 끈다

/* ═══════════ 셸 ═══════════ */

function renderShell() {
    const nav = $('.nav');
    nav.innerHTML = '';
    for (const t of TABS) {
        const b = el('button', t.id === state.tab ? 'on' : '');
        b.innerHTML = t.ko + (t.tag ? `<span class="tag">${t.tag}</span>` : '');
        b.onclick = () => { state.tab = t.id; render(); };
        nav.appendChild(b);
    }

    const r = M.RESOURCES;
    $('.resources').innerHTML = `
        <span>골드<b>${r.gold.toLocaleString()}</b></span>
        <span>분해 가루<b>${r.dust}</b></span>
        <span>낙인<b>${r.stigma}</b></span>`;
    $('.crumb').textContent = TABS.find(t => t.id === state.tab).ko;
}

function render() {
    if (stopBattle) { stopBattle(); stopBattle = null; }
    renderShell();
    const main = $('.main');
    main.innerHTML = '';
    ({
        expedition: renderExpedition,
        equip: renderEquip,
        skill: renderSkill,
        tavern: renderTavern,
        codex: renderCodex,
    })[state.tab](main);
    hideTip();
}

/** 세그먼트 버튼 묶음 */
function segmented(items, current, onPick) {
    const box = el('div', 'segmented');
    for (const it of items) {
        const b = el('button', `btn sm${it.id === current ? ' on' : ''}`, it.ko);
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
        { id: 'idle', ko: '편성 · 지역' },
        { id: 'battle', ko: '전투 관전' },
        { id: 'report', ko: '리포트' },
    ], state.exp, id => { state.exp = id; render(); }));
    bar.appendChild(el('div', 'muted', `<span style="font-size:var(--fs-xs)">
        전투 파티는 한 팀 — 원정이 곧 전투다. 세 상태가 한 탭 안에서 이어진다</span>`));
    main.appendChild(bar);

    if (state.exp === 'idle') return renderExpIdle(main);
    if (state.exp === 'battle') { stopBattle = mountBattle(main); return; }
    return renderExpReport(main);
}

function renderExpIdle(main) {
    const wrap = el('div', 'cols c-side');

    const left = el('div');
    const p = el('div', 'panel');
    p.appendChild(el('h2', '', '파티 <small>전투 3인 — 한 팀</small>'));
    for (let i = 0; i < 3; i++) {
        const h = heroById(M.PARTY[i]);
        if (!h) { p.appendChild(el('div', 'party-slot empty', '+ 빈 자리')); continue; }
        const row = el('div', 'party-slot');
        row.innerHTML = `
            <span class="sin-chip" style="color:${sinColor(h.sin)}">${sinKo(h.sin)}</span>
            <div style="flex:1">
                ${h.name} <span class="lv">${h.cls} · Lv.${h.level}</span>
                <div class="bar hp" style="margin-top:4px"><i style="width:${h.hp / h.hpMax * 100}%"></i></div>
            </div>
            ${i === 0 ? '<span class="muted" style="font-size:var(--fs-xs)">리더</span>' : ''}`;
        p.appendChild(row);
    }
    p.appendChild(el('div', 'muted', '<div style="margin-top:10px;font-size:var(--fs-xs)">리더의 통솔이 파티 전원에게 적용된다</div>'));
    left.appendChild(p);

    const bench = el('div', 'panel');
    bench.appendChild(el('h2', '', '벤치 <small>파견 대기</small>'));
    for (const h of M.HEROES.filter(h => !M.PARTY.includes(h.uid))) {
        const row = el('div', 'party-slot');
        row.innerHTML = `
            <span class="sin-chip" style="color:${sinColor(h.sin)}">${sinKo(h.sin)}</span>
            <div style="flex:1">${h.name} <span class="lv">${h.cls} · Lv.${h.level}</span></div>
            <button class="btn sm">파견</button>`;
        bench.appendChild(row);
    }
    left.appendChild(bench);
    wrap.appendChild(left);

    const right = el('div');
    const zp = el('div', 'panel');
    zp.appendChild(el('h2', '', '원정 지역 <small>챕터 1 — 불타는 전장</small>'));
    for (const z of M.ZONES) {
        const row = el('div', `zone ${z.state === 'locked' ? 'locked' : ''} ${z.boss ? 'boss' : ''}`);
        row.style.borderLeftColor = z.state === 'locked' ? '' : sinColor(z.sin);
        const btn = z.state === 'locked'
            ? `<span class="muted" style="font-size:var(--fs-sm)">${z.lockText}</span>`
            : `<button class="btn ${z.boss ? 'primary' : ''} b-go">보내기</button>`;
        row.innerHTML = `
            <div>
                <div class="title">
                    <span class="sin-chip" style="color:${sinColor(z.sin)}">${sinKo(z.sin)}</span>
                    <span>${z.region} — ${z.name}</span>
                    ${z.state === 'cleared' ? '<span class="muted" style="font-size:var(--fs-xs)">클리어</span>' : ''}
                </div>
                <div class="meta">몬스터 Lv.${z.mlvl} · ${z.waves}웨이브 · 약 ${z.minutes}분 · ${z.monsters.join(', ')}</div>
            </div>
            <div>${btn}</div>`;
        const go = row.querySelector('.b-go');
        if (go) go.onclick = () => { state.exp = 'battle'; render(); };
        zp.appendChild(row);
    }
    zp.appendChild(el('div', 'muted', `<div style="margin-top:10px;font-size:var(--fs-xs)">
        지역 죄종은 해당 죄종 접사의 드롭 가중치를 올린다 — 타겟 파밍의 축</div>`));
    right.appendChild(zp);
    wrap.appendChild(right);
    main.appendChild(wrap);
}

function renderExpReport(main) {
    const R = M.REPORT;
    const p = el('div', 'panel');
    p.innerHTML = `
        <div class="report-head">
            <span class="verdict clear">클리어</span>
            <span>${R.zoneName}</span>
            <span class="muted">${R.elapsedText}</span>
        </div>
        <div class="gain-row">
            <div><span>골드</span>${R.gold.toLocaleString()}</div>
            <div><span>분해 가루</span>${R.dust}</div>
            <div><span>경험치</span>각 ${R.xpEach}</div>
            <div><span>전투 불능</span>없음</div>
        </div>`;
    for (const lu of R.levelUps) {
        p.appendChild(el('div', '', `<div class="up" style="font-size:var(--fs-sm);margin-bottom:12px">
            ▲ ${lu.name} 레벨 ${lu.from} → ${lu.to} &nbsp;<span class="muted">${lu.gains}</span></div>`));
    }
    main.appendChild(p);

    const cols = el('div', 'cols c2');

    const dp = el('div', 'panel');
    dp.appendChild(el('h2', '', `획득 장비 <small>${R.drops.length}개</small>`));
    for (const d of R.drops) {
        const row = el('div', 'drop-row');
        // TODO: '업그레이드/검토/분해' 자동 판정은 기획서에 없는 축 — 채택 여부 미결
        const vt = { upgrade: '업그레이드', sidegrade: '검토', junk: '분해' }[d.verdict];
        row.innerHTML = `
            <div>
                <div style="color:${rarity(d.rarity).color};font-size:var(--fs-sm)">${d.name}</div>
                <div class="muted" style="font-size:var(--fs-xs)">${rarity(d.rarity).ko} · ilvl ${d.ilvl}</div>
            </div>
            <span class="verdict-tag verdict-${d.verdict}">${vt}</span>
            <button class="btn sm">${d.verdict === 'junk' ? '분해' : '장착'}</button>`;
        dp.appendChild(row);
    }
    cols.appendChild(dp);

    const wp = el('div', 'panel');
    wp.appendChild(el('h2', '', '전투 경과'));
    const ul = el('ul', 'wave-log');
    for (const w of R.waves) {
        ul.appendChild(el('li', '', `<span>웨이브 ${w.n}</span><span>${w.text}</span><span>${w.detail}</span>`));
    }
    wp.appendChild(ul);
    wp.appendChild(el('div', 'muted', `<div style="margin-top:10px;font-size:var(--fs-xs)">
        방치형 계약 — 자리를 비워도 로스터는 파괴되지 않는다. 사건은 리포트 안에서 완결</div>`));
    cols.appendChild(wp);
    main.appendChild(cols);
}

/* ═══════════ 공통: 영웅 선택 열 ═══════════ */

function heroPicker() {
    const hp = el('div', 'panel');
    hp.appendChild(el('h2', '', '영웅'));
    for (const x of M.HEROES) {
        const b = el('div', `slot-row ${x.uid === state.heroUid ? 'on' : ''}`);
        b.style.cursor = 'pointer';
        b.innerHTML = `<span class="sin-chip" style="color:${sinColor(x.sin)};font-size:9px">${sinKo(x.sin)}</span>
            <span class="item-name">${x.name} <span class="muted">${x.cls} Lv.${x.level}</span></span>`;
        b.onclick = () => { state.heroUid = x.uid; render(); };
        hp.appendChild(b);
    }
    return hp;
}

/* ═══════════ 장비 ═══════════ */

const slotDef = id => M.SLOTS.find(s => s.id === id);

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
                <div class="pd-label">${locked ? '양손' : def.ko}</div>`;
            if (it) bindTip(cell, it);   // 착용 슬롯은 비교 대상 없음 → 단일 카드
            box.appendChild(cell);
        }
    }
    return box;
}

/** 인벤토리 — 정사각 격자 (기본 7 × 10) */
function inventoryGrid(h) {
    const { cols, rows } = M.INV_GRID;
    const items = M.INVENTORY.filter(i => !state.slotFilter || i.slot === state.slotFilter);

    const grid = el('div', 'inv-cells');
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    for (let i = 0; i < cols * rows; i++) {
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
    return grid;
}

function renderEquip(main) {
    const h = heroById(state.heroUid);
    const wrap = el('div', 'cols c-equip');

    /* 1열 — 영웅 선택 */
    const c1 = el('div');
    c1.appendChild(heroPicker());
    wrap.appendChild(c1);

    /* 2열 — 페이퍼돌 + 스탯 + 세트포인트 */
    const c2 = el('div');

    const pd = el('div', 'panel');
    pd.appendChild(el('h2', '', `${h.name} <small>${h.cls} · Lv.${h.level} · 8부위</small>`));
    pd.appendChild(paperdoll(h));
    const equippedCount = Object.values(h.equipped).filter(Boolean).length;
    pd.appendChild(el('div', 'muted', `<div style="text-align:center;margin-top:10px;font-size:var(--fs-xs)">
        착용 ${equippedCount} / 8${h.equipped.weapon?.twoHanded ? ' · 양손 무기라 보조 슬롯이 잠긴다' : ''}</div>`));
    c2.appendChild(pd);

    const stp = el('div', 'panel');
    stp.appendChild(el('h2', '', '능력치'));
    const t = el('table', 'stat-table');
    t.innerHTML =
        M.STATS.map(s => `<tr><td>${s.ko}</td><td>${h.stats[s.id]}</td></tr>`).join('') +
        `<tr class="sep"><td>공격력</td><td>${h.derived.atk}</td></tr>
         <tr><td>방어력</td><td>${h.derived.def}</td></tr>
         <tr><td>최대 HP</td><td>${h.hpMax}</td></tr>
         <tr><td>치명타 확률</td><td>${h.derived.crit}</td></tr>
         <tr><td>치명타 피해</td><td>${h.derived.critDmg}</td></tr>
         <tr><td>공격 속도</td><td>${h.derived.aspd}</td></tr>
         <tr><td>명중 / 회피</td><td>${h.derived.hit} / ${h.derived.dodge}</td></tr>`;
    stp.appendChild(t);
    c2.appendChild(stp);

    const setp = el('div', 'panel');
    setp.appendChild(el('h2', '', '세트포인트 <small>접사 1개 = 1포인트</small>'));
    const chips = el('div', 'setpoints');
    const entries = Object.entries(h.setPoints).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) chips.appendChild(el('span', 'muted', '착용 장비 없음'));
    for (const [sin, pts] of entries) {
        const chip = el('span', `setpoint ${pts >= 2 ? 'reached' : ''}`);
        chip.style.color = sinColor(sin);
        chip.innerHTML = `${sinKo(sin)} <b>${pts}</b>`;
        chips.appendChild(chip);
    }
    setp.appendChild(chips);

    const bp = el('div', '');
    bp.style.cssText = 'margin-top:12px;font-size:var(--fs-xs)';
    for (const [sin, pts] of entries) {
        bp.innerHTML += `<div style="margin-bottom:7px">${[2, 4, 6].map(b => {
            const on = pts >= b;
            return `<div style="color:${on ? sinColor(sin) : 'var(--text-muted)'};padding:2px 0">
                ${on ? '●' : '○'} ${b} — ${M.SET_BONUSES[sin]?.[b] ?? ''}</div>`;
        }).join('')}</div>`;
    }
    setp.appendChild(bp);
    c2.appendChild(setp);
    wrap.appendChild(c2);

    /* 3열 — 인벤토리 격자 */
    const c3 = el('div');
    const ip = el('div', 'panel');
    ip.appendChild(el('h2', '', `인벤토리 <small>${M.INV_GRID.cols} × ${M.INV_GRID.rows}</small>`));

    const filter = el('div', 'segmented');
    filter.style.marginBottom = '10px';
    for (const f of [{ id: null, ko: '전체' }, ...M.SLOTS]) {
        const b = el('button', `btn sm${state.slotFilter === f.id ? ' on' : ''}`, f.icon ?? f.ko);
        b.title = f.ko;
        b.onclick = () => { state.slotFilter = f.id; render(); };
        filter.appendChild(b);
    }
    ip.appendChild(filter);
    ip.appendChild(inventoryGrid(h));
    ip.appendChild(el('div', 'muted', `<div style="margin-top:10px;font-size:var(--fs-xs)">
        칸에 마우스를 올리면 <b>착용 중인 장비와 나란히</b> 비교된다. 테두리 색 = 희귀도</div>`));
    c3.appendChild(ip);
    wrap.appendChild(c3);

    main.appendChild(wrap);
}

/* ── 비교 툴팁 ── */

function tipCard(item, headText) {
    const c = el('div', 'tip-card');
    if (!item) {
        c.innerHTML = `<div class="tip-head">${headText}</div><div class="tip-empty">비어 있음</div>`;
        return c;
    }
    const sins = Object.entries(item.sins ?? {});
    c.innerHTML = `
        <div class="tip-head">${headText}</div>
        <div class="tip-name" style="color:${rarity(item.rarity).color}">${item.name}</div>
        <div class="tip-sub">${rarity(item.rarity).ko} · ilvl ${item.ilvl}</div>
        ${item.implicit ? `<div class="tip-implicit">${item.implicit}</div>` : ''}
        ${item.fixed ? '<div class="tip-head" style="margin-bottom:4px">고정 효과</div>' : ''}
        <ul>${(item.affixes ?? []).map(a => `<li>${a}</li>`).join('') || '<li class="tip-empty">접사 없음</li>'}</ul>
        <div class="tip-sins">${sins.length
            ? sins.map(([s, n]) => `<span class="setpoint" style="color:${sinColor(s)};margin-right:4px">${sinKo(s)} <b>+${n}</b></span>`).join('')
            : `<span class="tip-empty">세트포인트 0${item.fixed ? ' — 유니크의 트레이드오프' : ''}</span>`}</div>`;
    return c;
}

function bindTip(node, item, equipped) {
    node.onmouseenter = ev => {
        const tip = $('#tooltip');
        tip.innerHTML = '';
        tip.appendChild(tipCard(item, equipped === undefined ? '착용 중' : '이 아이템'));
        if (equipped !== undefined) tip.appendChild(tipCard(equipped, '착용 중'));
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

function renderSkill(main) {
    const h = heroById(state.heroUid);
    const wrap = el('div', 'cols c-skill');

    const c1 = el('div');
    c1.appendChild(heroPicker());
    const pp = el('div', 'panel');
    pp.appendChild(el('h2', '', '스킬 포인트'));
    pp.appendChild(el('div', '', `
        <div style="font-size:var(--fs-xl);text-align:center;padding:4px 0">
            ${M.SKILL_POINTS.total - M.SKILL_POINTS.spent}
            <span class="muted" style="font-size:var(--fs-sm)">/ ${M.SKILL_POINTS.total}</span>
        </div>
        <div class="muted" style="font-size:var(--fs-xs);line-height:1.6">
            3탭이 <b>포인트 풀을 공유</b>한다. 3택1 같은 선택은 없고,
            개성은 "선택"이 아니라 <b>"배분"</b>에서 나온다.
        </div>`));
    c1.appendChild(pp);
    wrap.appendChild(c1);

    const c2 = el('div', 'panel');
    const advLocked = h.level < M.SKILL_TREES.advance.unlockLevel;
    const bar = el('div', 'sub-bar');
    bar.appendChild(segmented([
        { id: 'sin', ko: `탭1 · ${sinKo(h.sin)}` },
        { id: 'mastery', ko: `탭2 · ${h.cls} 마스터리` },
        { id: 'advance', ko: `탭3 · 전직 (Lv.${M.SKILL_TREES.advance.unlockLevel})`, disabled: advLocked },
    ], state.skillTab, id => { state.skillTab = id; render(); }));
    c2.appendChild(bar);

    if (state.skillTab === 'advance') {
        c2.appendChild(el('div', 'todo', `<b>전직 트리 — 미설계</b>${M.SKILL_TREES.advance.note}`));
    } else {
        const tree = state.skillTab === 'sin' ? M.SKILL_TREES.sin[h.sin] : M.SKILL_TREES.mastery;
        if (!tree) {
            c2.appendChild(el('div', 'todo',
                `<b>${sinKo(h.sin)} 트리 — 미작성</b>죄종 트리 7종은 sin_mapping.md 에서 접사·세트와 함께 확정된다`));
        } else {
            const holder = el('div', 'tree');
            for (const row of tree) {
                const r = el('div', 'tree-row');
                r.appendChild(el('div', 'tier muted', `T${row.tier}`));
                const nodes = el('div', 'tree-nodes');
                for (const n of row.nodes) {
                    const box = el('div', `sk-node${n.r > 0 ? ' taken' : ''}${n.locked ? ' locked' : ''}${n.n === '(미정)' ? ' tbd' : ''}`);
                    if (n.r > 0 && state.skillTab === 'sin') box.style.borderColor = sinColor(h.sin);
                    box.innerHTML = `
                        <div class="sk-name">${n.n}</div>
                        <div class="sk-rank">${n.r} / ${n.max}</div>`;
                    nodes.appendChild(box);
                }
                r.appendChild(nodes);
                holder.appendChild(r);
            }
            c2.appendChild(holder);
        }
    }
    c2.appendChild(el('div', 'muted', `<div style="margin-top:12px;font-size:var(--fs-xs)">
        노드 이름은 skill_design.md 에 적힌 컨셉만 표시했다.
        <b>(미정)</b> 은 기획 미작성 — 화면이 기획을 선점하지 않도록 비워둔 자리다.</div>`));
    wrap.appendChild(c2);
    main.appendChild(wrap);
}

/* ═══════════ 선술집 ═══════════ */

function renderTavern(main) {
    const T = M.TAVERN;
    const p = el('div', 'panel');
    p.appendChild(el('h2', '', '영입 후보 <small>죄종 × 직업 × 시작특성이 등장 시 굴려진다</small>'));

    const grid = el('div', 'cand-grid');
    for (const c of T.candidates) {
        const card = el('div', 'cand-card');
        card.style.borderTopColor = sinColor(c.sin);
        card.innerHTML = `
            <div class="cand-head">
                <b>${c.name}</b>
                <span class="sin-chip" style="color:${sinColor(c.sin)}">${sinKo(c.sin)}</span>
                <span class="muted" style="font-size:var(--fs-sm)">${c.cls}</span>
            </div>
            <div class="cand-trait">특성 · ${c.trait}</div>
            <table class="stat-table">
                ${M.STATS.map(s => `<tr><td>${s.ko}</td><td>${c.stats[s.id]}</td></tr>`).join('')}
            </table>
            <div class="cand-cost">
                <span class="muted">고용</span>
                <b>${c.cost.toLocaleString()}</b>
                <span class="up" style="font-size:var(--fs-xs)">매력 -${c.discount}%</span>
            </div>
            <button class="btn primary" style="width:100%">영입</button>`;
        grid.appendChild(card);
    }
    p.appendChild(grid);

    p.appendChild(el('div', 'reroll', `
        <button class="btn">후보 리롤 <span class="muted">${T.rerollCost.toLocaleString()} 골드</span></button>
        <span class="muted" style="font-size:var(--fs-xs)">
            선술집 리롤 = <b>아이템 파밍의 영웅판</b> — "뽑기(태어나는 조합)"와 "육성(포인트 배분)"의 분리</span>`));
    main.appendChild(p);

    const rp = el('div', 'panel');
    rp.appendChild(el('h2', '', `보유 로스터 <small>${M.HEROES.length} / 6 — 소수 정예</small>`));
    const hg = el('div', 'hero-grid');
    for (const h of M.HEROES) {
        const c = el('div', 'hero-card');
        c.style.borderTopColor = sinColor(h.sin);
        c.innerHTML = `
            <div class="name">
                <b>${h.name}</b>
                <span class="sin-chip" style="color:${sinColor(h.sin)}">${sinKo(h.sin)}</span>
                <span class="muted" style="font-size:var(--fs-sm)">${h.cls}</span>
                ${M.PARTY.includes(h.uid) ? '<span class="in-party" style="margin-left:auto">전투 파티</span>' : ''}
            </div>
            <div class="line"><span>Lv.${h.level}</span><span>${h.xp} / ${h.xpNext} XP</span></div>
            <div class="bar xp" style="margin:5px 0 7px"><i style="width:${h.xp / h.xpNext * 100}%"></i></div>
            <div class="line"><span>특성</span><span>${h.trait}</span></div>
            <div class="statline">${M.STATS.map(s => `${s.ko} ${h.stats[s.id]}`).join(' · ')}</div>`;
        c.onclick = () => { state.heroUid = h.uid; state.tab = 'equip'; render(); };
        hg.appendChild(c);
    }
    rp.appendChild(hg);
    main.appendChild(rp);
}

/* ═══════════ 도감 ═══════════ */

function renderCodex(main) {
    const cols = el('div', 'cols c2');

    const mp = el('div', 'panel');
    mp.appendChild(el('h2', '', '몬스터 도감 <small>스테이지 단위 수집 → 파티 전역 보너스</small>'));
    for (const g of M.CODEX_GROUPS) {
        const row = el('div', `codex-row${g.locked ? ' locked' : ''}`);
        row.innerHTML = `
            <div class="title">Ch${g.chapter} · ${g.name}
                <span class="muted" style="font-size:var(--fs-xs)">${g.found} / ${g.total}</span></div>
            <div class="bar" style="margin:5px 0 4px"><i style="width:${g.found / g.total * 100}%"></i></div>
            <div class="meta">${g.bonus
                ? `<span class="up">${g.bonus}</span>`
                : '<span class="muted">보너스 없음</span>'}${g.next ? `<span class="muted"> · 다음: ${g.next}</span>` : ''}</div>`;
        mp.appendChild(row);
    }
    mp.appendChild(el('div', 'muted', `<div style="margin-top:10px;font-size:var(--fs-xs)">
        계승분 <b>collection_group.csv</b> / <b>collection_group_bonus.csv</b> 구조 — 그룹당 일반 3종 + 보스 1</div>`));
    cols.appendChild(mp);

    const ip = el('div', 'panel');
    ip.appendChild(el('h2', '', '아이템 도감'));
    const C = M.CODEX_ITEMS;
    for (const r of [
        { ko: '장비 베이스', v: C.base },
        { ko: '유니크', v: C.unique },
        { ko: '세트 브레이크포인트', v: C.setBreakpoints },
    ]) {
        const pct = r.v.total > 0 ? r.v.found / r.v.total * 100 : 0;
        const box = el('div', 'codex-row');
        box.innerHTML = `
            <div class="title">${r.ko}
                <span class="muted" style="font-size:var(--fs-xs)">${r.v.found} / ${r.v.total || '?'}</span></div>
            <div class="bar" style="margin:5px 0 4px"><i style="width:${pct}%"></i></div>
            ${r.v.note ? `<div class="meta down" style="font-size:var(--fs-xs)">⚠ ${r.v.note}</div>` : ''}`;
        ip.appendChild(box);
    }
    ip.appendChild(el('div', 'todo', '<b>수집 보상 미설계</b>아이템 도감이 보너스를 주는지, 기록만 하는지 미정'));
    cols.appendChild(ip);

    main.appendChild(cols);
}

render();
