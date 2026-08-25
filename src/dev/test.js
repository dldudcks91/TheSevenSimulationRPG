/**
 * game_logic 검증 페이지 — 브라우저가 유일한 JS 런타임이라(빌드 없음, node 없음) 여기서 단정을 돌린다.
 *   실행: start.bat 후 http://localhost:8777/dev/test.html
 *   헤드리스: 스크린샷의 머리글이 "PASS n/n" 이면 통과. document.title 에도 같은 결과가 찍힌다.
 *
 * 두 부분:
 *   ① 단정 — 결정론 / 직렬화 왕복 / 생성 규칙 / 장착 규칙 / 성장 / 원정 정산 / 부재 정산 / 선술집
 *   ② 캘리브레이션 — 시작 파티 N개를 굴려 스테이지별 승률·소요·부상 수를 표로 찍는다 (balance.csv 손잡이 조정용)
 */

import { loadData, buildSystems, D } from '../ui/data.js';
import { makeRng, deriveSeed } from '../game_logic/rng.js';
import { parseCsv } from '../game_logic/csv.js';
import { SAVE_VERSION } from '../game_logic/state.js';

const out = document.getElementById('out');
const results = [];
function check(name, fn) {
    try {
        const r = fn();
        results.push({ name, ok: r !== false, msg: typeof r === 'string' ? r : '' });
    } catch (e) {
        results.push({ name, ok: false, msg: String(e && e.stack ? e.stack.split('\n').slice(0, 2).join(' ') : e) });
    }
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const NOW = 1_700_000_000_000;      // 고정 시각 — 테스트는 시계를 읽지 않는다

await loadData('../data/');
const SYS = buildSystems(D);
const B = D.balance;

/* ── 데이터 ── */
check('csv: 숫자 셀은 숫자로', () => parseCsv('a,b\n1,x\n2.5,\n')[0].a === 1 && parseCsv('a,b\n1,x\n')[0].b === 'x');
check('csv: monster 112 / stage 28', () => Object.keys(D.monsters).length === 112 && D.stageList.length === 28);
check('balance: 시스템이 쓰는 키가 전부 있다', () => {
    const need = ['party_size_max', 'roster_cap', 'rounds_per_stage', 'wave_monster_max', 'hero_attr_min', 'hero_attr_max', 'hero_attr_total',
        'hero_hp_base', 'attr_bonus_per_point', 'hero_xp_base', 'hero_xp_exp', 'hero_hp_per_level', 'attr_growth_chance_pct', 'xp_rate',
        'unarmed_atk', 'unarmed_period', 'weapon_atk_base', 'weapon_atk_per_ilvl', 'two_hand_atk_mult', 'armor_def_base', 'armor_def_per_ilvl',
        'base_crit_pct', 'base_crit_damage_pct', 'dmg_variance_pct', 'evasion_cap_pct', 'monster_hp_scale', 'monster_atk_scale', 'battle_timeout_sec',
        'gold_rate', 'drop_chance_pct', 'boss_guaranteed_drop', 'drop_ilvl_spread', 'dust_elite', 'dust_boss', 'rarity_w_magic', 'rarity_w_rare',
        'affix_magic_min', 'affix_magic_max', 'affix_rare_min', 'affix_rare_max', 'suffix_sin_chance_pct', 'salvage_dust_magic', 'salvage_dust_rare',
        'inventory_cap', 'injury_minutes', 'offline_cap_hours', 'tavern_candidates', 'tavern_hire_cost', 'tavern_reroll_cost', 'start_gold', 'start_dust', 'start_stigma'];
    const missing = need.filter(k => B[k] === undefined);
    return missing.length ? `missing: ${missing.join(', ')}` : true;
});
check('stage_round: 정예 3·6 / 보스 9', () => eq(D.eliteRounds, [3, 6]) && D.bossRound === 9);

/* ── RNG ── */
check('rng: 같은 시드 = 같은 수열', () => {
    const a = makeRng(7), b = makeRng(7);
    for (let i = 0; i < 50; i++) if (a() !== b()) return false;
    return true;
});
check('rng: 다른 시드 = 다른 수열', () => makeRng(1)() !== makeRng(2)());
check('rng: deriveSeed 결정론', () => deriveSeed(123, 4) === deriveSeed(123, 4) && deriveSeed(123, 4) !== deriveSeed(123, 5));

/* ── 영웅 생성 ── */
const cands = SYS.hero.rollStartParty(makeRng(1), B.party_size_max);
check('시작 파티: 3명, 죄종·직업·이름 겹침 없음', () => {
    const u = k => new Set(cands.map(c => typeof c[k] === 'object' ? c[k].en : c[k])).size === cands.length;
    return cands.length === B.party_size_max && u('sin') && u('cls') && u('name');
});
check('시작 파티: 능력치 합 고정, 범위 준수, 주력 축이 최고', () => {
    for (const c of cands) {
        const vals = Object.values(c.stats);
        if (vals.reduce((a, b) => a + b, 0) !== B.hero_attr_total) return `sum ${vals.reduce((a, b) => a + b, 0)}`;
        if (vals.some(v => v < B.hero_attr_min || v > B.hero_attr_max)) return 'range';
        const key = { warrior: 'str', knight: 'vit', mage: 'int', archer: 'sen', priest: 'ldr' }[c.cls];
        if (c.stats[key] !== Math.max(...vals)) return `${c.cls} key ${key}=${c.stats[key]} max=${Math.max(...vals)}`;
        for (const [id, v] of Object.entries(c.stats)) if (c.caps[id] < v || c.caps[id] > B.hero_attr_max) return 'caps';
    }
    return true;
});
check('시작 파티: 같은 시드 = 같은 3명', () => eq(SYS.hero.rollStartParty(makeRng(1), 3), cands));

/* ── 새 게임 · 직렬화 ── */
let G = SYS.game.newGame(42, cands, NOW);
check('newGame: 3명 로스터 = 파티, 각자 직업 무기 착용, 시작 자원', () => {
    if (G.heroes.length !== 3 || G.party.length !== 3) return 'count';
    for (const h of G.heroes) {
        const w = G.items[h.equipped.weapon];
        if (!w || w.slot !== 'weapon' || w.cls !== h.cls) return `weapon ${h.cls}`;
    }
    return G.bag.length === 0 && G.resources.gold === B.start_gold;
});
check('save: serialize → deserialize 왕복 동일', () => {
    const s = SYS.game.serialize(G, NOW);
    const back = SYS.game.deserialize(JSON.parse(JSON.stringify(s)));
    return eq(SYS.game.serialize(back, NOW), s) && s.version === SAVE_VERSION;
});
check('save: 버전 불일치는 거부', () => { try { SYS.game.deserialize({ version: 99 }); return false; } catch { return true; } });
check('save: 크기 < 64KB (빈 게임)', () => { const n = JSON.stringify(SYS.game.serialize(G, NOW)).length; return n < 65536 ? `${n} bytes` : `${n}`; });

/* ── 성장 ── */
check('xp: 필요량 단조 증가', () => { for (let l = 1; l < 30; l++) if (SYS.hero.xpNeeded(l + 1) <= SYS.hero.xpNeeded(l)) return false; return true; });
check('xp: 레벨업 시 능력치는 상한까지만', () => {
    const h = JSON.parse(JSON.stringify(G.heroes[0]));
    const lu = SYS.hero.grantXp(h, 100000, makeRng(3));
    for (const [id, v] of Object.entries(h.stats)) if (v > h.caps[id]) return `${id} ${v} > cap ${h.caps[id]}`;
    return lu && lu.to > lu.from && h.level > 5 ? `Lv ${lu.from}→${lu.to}` : 'no levelup';
});

/* ── 장비 ── */
check('combat: 무기가 공격력을 올린다', () => {
    const h = G.heroes[0];
    const naked = SYS.hero.computeCombat(h, []);
    const armed = SYS.hero.computeCombat(h, [G.items[h.equipped.weapon]]);
    const atk = c => c.atk_physical ?? c.atk_magic;
    return atk(armed) > atk(naked) ? `${atk(naked)} → ${atk(armed)}` : false;
});
check('equip: 방어구 착용 → 방어력 상승, 해제 → 가방 복귀', () => {
    const rng = makeRng(9);
    let it;
    do { it = SYS.item.rollDrop(rng, 3); } while (it.slot !== 'armor');
    it.uid = 'test_armor'; G.items[it.uid] = it; G.bag.push(it.uid);
    const h = G.heroes[0];
    const before = SYS.game.heroCombat(G, h).defense;
    const r = SYS.game.equip(G, h.uid, it.uid);
    if (!r.ok) return `equip ${r.err}`;
    const after = SYS.game.heroCombat(G, h).defense;
    if (!(after > before)) return `def ${before} → ${after}`;
    const u = SYS.game.unequip(G, h.uid, 'armor');
    return u.ok && G.bag.includes(it.uid) && h.equipped.armor == null;
});
check('equip: 다른 직업 무기는 거부', () => {
    const h = G.heroes[0];
    const other = G.heroes.find(x => x.cls !== h.cls);
    const w = G.items[other.equipped.weapon];
    G.bag.push(w.uid);
    const r = SYS.game.equip(G, h.uid, w.uid);
    G.bag = G.bag.filter(u => u !== w.uid);
    return !r.ok && r.err === 'class';
});
check('equip: 양손 무기는 보조를 벗기고, 보조는 양손 중 거부', () => {
    const rng = makeRng(11);
    const h = G.heroes.find(x => x.cls === 'warrior' || x.cls === 'knight' || x.cls === 'mage' || x.cls === 'archer');
    let two;
    do { two = SYS.item.rollDrop(rng, 3); } while (!(two.slot === 'weapon' && two.twoHanded && two.cls === h.cls));
    let off;
    do { off = SYS.item.rollDrop(rng, 3); } while (off.slot !== 'offhand');
    two.uid = 'test_2h'; off.uid = 'test_off';
    G.items[two.uid] = two; G.items[off.uid] = off; G.bag.push(off.uid, two.uid);
    const r1 = SYS.game.equip(G, h.uid, off.uid);
    if (!r1.ok) return `offhand ${r1.err}`;
    const r2 = SYS.game.equip(G, h.uid, two.uid);
    if (!r2.ok) return `2h ${r2.err}`;
    if (h.equipped.offhand != null || !G.bag.includes(off.uid)) return 'offhand not returned';
    const r3 = SYS.game.equip(G, h.uid, off.uid);
    return !r3.ok && r3.err === 'twoHanded';
});
check('setPoints: 메인 죄종 +1, 양손 무기 2포인트', () => {
    const h = G.heroes.find(x => G.items[x.equipped.weapon]?.twoHanded);
    if (!h) return 'no 2h hero';
    const w = G.items[h.equipped.weapon];
    const pts = SYS.game.setPoints(G, h);
    const wsin = Object.keys(w.sins)[0];
    const expect = 1 + (wsin === h.sin ? 2 : 0);
    return pts[h.sin] >= 1 && pts[wsin] >= 2 && (wsin !== h.sin || pts[h.sin] === expect || pts[h.sin] > expect);
});
check('salvage: 가방에서 사라지고 가루가 는다', () => {
    const before = G.resources.dust;
    const uid = G.bag[0];
    const r = SYS.game.salvage(G, uid);
    return r.ok && !G.bag.includes(uid) && !G.items[uid] && G.resources.dust === before + r.dust;
});

/* ── 전투 ── */
const units = () => G.party.map(uid => ({ uid, combat: SYS.game.heroCombat(G, SYS.game.heroById(G, uid)) }));
check('simulate: 같은 시드 = 같은 타임라인', () => {
    const a = SYS.battle.simulate(units(), 101, makeRng(5));
    const b = SYS.battle.simulate(units(), 101, makeRng(5));
    return eq(a, b) && a.timeline.length > 10 ? `${a.timeline.length} events` : false;
});
check('simulate: 다른 시드 = 다른 전투', () => !eq(SYS.battle.simulate(units(), 101, makeRng(5)).timeline, SYS.battle.simulate(units(), 101, makeRng(6)).timeline));
check('simulate: 구조 — round 로 시작, end 로 끝, 라운드 ≤ 9, 편성 ≤ wave_monster_max', () => {
    const r = SYS.battle.simulate(units(), 101, makeRng(5));
    const tl = r.timeline;
    if (tl[0].e !== 'round' || tl[0].n !== 1) return 'first';
    if (tl[tl.length - 1].e !== 'end') return 'last';
    if (r.rounds.length > B.rounds_per_stage) return 'rounds';
    for (const ev of tl) if (ev.e === 'round' && ev.enemies.length > B.wave_monster_max) return 'wave';
    const keys = new Set(['p0', 'p1', 'p2']);
    for (const ev of tl) {
        if (ev.e === 'round') { for (const e of ev.enemies) keys.add(e.key); }
        if (ev.e === 'hit' && (!keys.has(ev.a) || !keys.has(ev.d))) return `key ${ev.a}→${ev.d}`;
    }
    return `${r.reason} r${r.roundsCleared} ${r.durationSec}s`;
});
check('simulate: 정예 라운드에 죄종·특성이 붙는다', () => {
    const r = SYS.battle.simulate(units(), 101, makeRng(5));
    const el = r.timeline.filter(ev => ev.e === 'round' && ev.kind === 'elite').flatMap(ev => ev.enemies).find(e => e.grade === 'elite');
    return el ? (el.sin && el.traits?.length === 3) : 'elite round not reached';
});

/* ── 원정 정산 ── */
check('resolveBattle: 골드·처치·드롭·부상이 상태에 반영', () => {
    const G2 = SYS.game.newGame(42, cands, NOW);
    const gold = G2.resources.gold;
    const r = SYS.game.resolveBattle(G2, 101, NOW);
    if (!r.ok) return r.err;
    const rp = r.report;
    if (G2.resources.gold !== gold + rp.gold) return 'gold';
    if (Object.keys(G2.codexKills).length === 0) return 'kills';
    if (rp.drops.some(u => !G2.bag.includes(u))) return 'drops';
    for (const uid of rp.downed) if (SYS.game.heroById(G2, uid).injuredUntil !== NOW + B.injury_minutes * 60000) return 'injury';
    if (rp.won !== G2.progress.cleared.includes(101)) return 'cleared';
    if (G2.counters.battle !== 1 || !G2.run || G2.run.stageId !== 101) return 'counters/run';
    return `${rp.won ? 'WIN' : 'LOSE'} gold+${rp.gold} drops ${rp.drops.length} downed ${rp.downed.length}`;
});
check('resolveBattle: 잠긴 스테이지·부상 파티는 출발 불가', () => {
    const G2 = SYS.game.newGame(42, cands, NOW);
    if (SYS.game.resolveBattle(G2, 102, NOW).err !== 'locked') return 'locked';
    G2.heroes[0].injuredUntil = NOW + 1000;
    if (SYS.game.resolveBattle(G2, 101, NOW).err !== 'injured') return 'injured';
    SYS.game.tickInjuries(G2, NOW + 2000);
    return G2.heroes[0].injuredUntil === null;
});
check('toggleParty: 부상자는 못 넣고, 상한을 넘지 못한다', () => {
    const G2 = SYS.game.newGame(42, cands, NOW);
    const uid = G2.party[0];
    SYS.game.toggleParty(G2, uid, NOW);
    if (G2.party.includes(uid)) return 'remove';
    SYS.game.heroById(G2, uid).injuredUntil = NOW + 1000;
    if (SYS.game.toggleParty(G2, uid, NOW).err !== 'injured') return 'injured';
    SYS.game.heroById(G2, uid).injuredUntil = null;
    if (!SYS.game.toggleParty(G2, uid, NOW).ok) return 'add back';
    const extra = SYS.game.tavernCandidates(G2)[0];
    G2.counters.hero++; extra.uid = 'hx'; G2.heroes.push(extra);
    return SYS.game.toggleParty(G2, 'hx', NOW).err === 'full';
});
check('offlineCatchup: 반복 켠 채 떠난 시간만큼 정산, 멈춤 조건 기록', () => {
    const G2 = SYS.game.newGame(42, cands, NOW);
    const r = SYS.game.resolveBattle(G2, 101, NOW);
    G2.run.repeat = true;
    const dur = G2.run.durationSec;
    const later = NOW + Math.round(dur * 5.5 * 1000);
    const sum = SYS.game.offlineCatchup(G2, later);
    if (!sum) return 'no summary';
    if (sum.battles > 5) return `battles ${sum.battles}`;
    if (G2.run.lastAt !== later) return 'lastAt';
    if (sum.stopped == null && sum.battles !== 5) return `stopped null but ${sum.battles}`;
    return `${sum.battles} battles, stopped=${sum.stopped}, gold+${sum.gold}`;
});
check('offlineCatchup: 반복이 꺼져 있으면 아무것도 안 한다', () => {
    const G2 = SYS.game.newGame(42, cands, NOW);
    SYS.game.resolveBattle(G2, 101, NOW);
    return SYS.game.offlineCatchup(G2, NOW + 3_600_000) === null;
});

/* ── 선술집 ── */
check('tavern: 후보는 카운터에 결정론, 고용은 골드·상한을 지킨다', () => {
    const G2 = SYS.game.newGame(42, cands, NOW);
    const a = SYS.game.tavernCandidates(G2), b = SYS.game.tavernCandidates(G2);
    if (!eq(a, b)) return 'nondeterministic';
    G2.resources.gold = B.tavern_hire_cost - 1;
    if (SYS.game.hire(G2, 0).err !== 'gold') return 'gold gate';
    G2.resources.gold = B.tavern_hire_cost * 10;
    const r = SYS.game.hire(G2, 0);
    if (!r.ok || G2.heroes.length !== 4 || r.hero.uid !== 'h4') return 'hire';
    if (eq(SYS.game.tavernCandidates(G2), a)) return 'candidates should change after hire';
    while (G2.heroes.length < B.roster_cap) SYS.game.hire(G2, 0);
    return SYS.game.hire(G2, 0).err === 'roster';
});

/* ── 출력 ── */
const pass = results.filter(r => r.ok).length;
document.getElementById('head').innerHTML = `<b class="${pass === results.length ? 'ok' : 'fail'}">${pass === results.length ? 'PASS' : 'FAIL'}</b> ${pass} / ${results.length}`;
document.title = `${pass === results.length ? 'PASS' : 'FAIL'} ${pass}/${results.length}`;
document.getElementById('meta').textContent = `balance: monster_atk_scale=${B.monster_atk_scale} monster_hp_scale=${B.monster_hp_scale} weapon_atk_base=${B.weapon_atk_base} xp_rate=${B.xp_rate} hero_hp_base=${B.hero_hp_base}`;
for (const r of results) {
    const li = document.createElement('li');
    li.className = r.ok ? 'ok' : 'fail';
    li.innerHTML = `${r.name}${r.msg ? `<span class="m">${r.msg}</span>` : ''}`;
    out.appendChild(li);
}

/* ── 캘리브레이션 — 시작 파티 N개 × 스테이지 101~104 (연속 진행 없이 각각 새 게임 기준) ── */
const N = 20;
const rows = [];
for (const stageId of [101, 102, 103, 104]) {
    let wins = 0, dur = 0, downed = 0, rounds = 0, gold = 0, drops = 0, timeouts = 0;
    for (let seed = 1; seed <= N; seed++) {
        const party = SYS.hero.rollStartParty(makeRng(1000 + seed), B.party_size_max);
        const G2 = SYS.game.newGame(seed, party, NOW);
        G2.progress.cleared = [101, 102, 103].filter(s => s < stageId);   // 해금만 풀어준다 (성장 없음)
        const r = SYS.game.resolveBattle(G2, stageId, NOW);
        const rp = r.report;
        if (rp.won) wins++;
        if (rp.reason === 'timeout') timeouts++;
        dur += rp.durationSec; downed += rp.downed.length; rounds += rp.won ? rp.rounds.length : rp.rounds.length - 1;
        gold += rp.gold; drops += rp.drops.length;
    }
    rows.push({ stageId, wins, dur: dur / N, downed: downed / N, rounds: rounds / N, gold: gold / N, drops: drops / N, timeouts });
}
document.getElementById('calib').innerHTML = `
    <table>
        <tr><th>stage</th><th>win</th><th>avg rounds</th><th>avg sec</th><th>avg downed</th><th>avg gold</th><th>avg drops</th><th>timeouts</th></tr>
        ${rows.map(r => `<tr><td>${r.stageId}</td>
            <td class="${r.wins / N >= .7 ? 'up' : r.wins / N >= .3 ? 'warn' : 'down'}">${r.wins}/${N}</td>
            <td>${r.rounds.toFixed(1)}</td><td>${r.dur.toFixed(0)}</td><td>${r.downed.toFixed(2)}</td>
            <td>${r.gold.toFixed(0)}</td><td>${r.drops.toFixed(1)}</td><td>${r.timeouts}</td></tr>`).join('')}
    </table>
    <pre>목표: 101 승률 ≥ 70% (시작 파티 그대로) · 102 30~70% · 103/104 는 성장·장비 없이는 지는 게 정상
시작 파티 Lv1 · 직업 무기 1개 · 방어구 없음 · 스킬 없음 (스킬 미작성) 기준</pre>`;
