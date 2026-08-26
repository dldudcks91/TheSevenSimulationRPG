/**
 * game_logic 검증 페이지 — 브라우저가 유일한 JS 런타임이라(빌드 없음, node 없음) 여기서 단정을 돌린다.
 *   실행: start.bat 후 http://localhost:8777/dev/test.html
 *   헤드리스: 스크린샷의 머리글이 "PASS n/n" 이면 통과. document.title 에도 같은 결과가 찍힌다.
 *
 * 단정 규약: 통과 = true 또는 정보 문자열(표에 그대로 찍힌다) / 실패 = false 또는 fail('사유') — 실패 사유는 문자열이 아니라
 *   **던진다** (2026-08-26: 이전엔 사유 문자열이 통과로 집계돼 실패가 묻혔다).
 *
 * 두 부분:
 *   ① 단정 — 결정론 / 직렬화 왕복 / 생성 규칙 / 무기군·슬롯 9 착용 규칙 / 성장 / 원정 정산 / 도감 카드 / 런 마무리 / 선술집
 *   ② 캘리브레이션 — 시작 파티 N개를 굴려 스테이지별 승률·소요·부상 수를 표로 찍는다 (balance.csv 손잡이 조정용)
 */

import * as M from '../ui/mock.js';
import { loadData, buildSystems, D } from '../ui/data.js';
import { makeRng, deriveSeed } from '../game_logic/rng.js';
import { parseCsv } from '../game_logic/csv.js';
import { createFormula } from '../game_logic/formula.js';
import { SAVE_VERSION } from '../game_logic/state.js';

const out = document.getElementById('out');
const results = [];
class Fail extends Error {}
const fail = msg => { throw new Fail(msg); };
function check(name, fn) {
    try {
        const r = fn();
        results.push({ name, ok: r !== false, msg: typeof r === 'string' ? r : '' });
    } catch (e) {
        results.push({ name, ok: false, msg: e instanceof Fail ? e.message : String(e && e.stack ? e.stack.split('\n').slice(0, 2).join(' ') : e) });
    }
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const NOW = 1_700_000_000_000;      // 고정 시각 — 테스트는 시계를 읽지 않는다

await loadData('../data/');
const SYS = buildSystems(D);
const B = D.balance;
const WG = D.weaponGroups;

/* ── 데이터 ── */
check('csv: 숫자 셀은 숫자로', () => parseCsv('a,b\n1,x\n2.5,\n')[0].a === 1 && parseCsv('a,b\n1,x\n')[0].b === 'x');
check('csv: monster 112 / stage 28 / weapon_group 11 / codex_level 4', () =>
    Object.keys(D.monsters).length === 112 && D.stageList.length === 28 && D.weaponGroupList.length === 11 && D.codexLevels.length === 4);
check('balance: 시스템이 쓰는 키가 전부 있다', () => {
    const need = ['party_size_max', 'roster_cap', 'rounds_per_stage', 'wave_monster_max', 'hero_attr_min', 'hero_attr_max', 'hero_attr_total',
        'hero_hp_base', 'attr_bonus_per_point', 'hero_xp_base', 'hero_xp_exp', 'hero_hp_per_level', 'attr_growth_chance_pct', 'xp_rate',
        'unarmed_atk', 'unarmed_period', 'weapon_atk_base', 'weapon_atk_per_ilvl', 'two_hand_atk_mult', 'armor_def_base', 'armor_def_per_ilvl',
        'base_crit_pct', 'base_crit_damage_pct', 'dmg_variance_pct', 'monster_hp_scale', 'monster_atk_scale', 'monster_def_scale', 'battle_timeout_sec',
        'def_curve_k', 'dmg_min', 'hit_floor_pct', 'crit_cap_pct',
        'gold_rate', 'drop_chance_pct', 'boss_guaranteed_drop', 'drop_ilvl_spread', 'dust_elite', 'dust_boss', 'rarity_w_magic', 'rarity_w_rare',
        'affix_magic_min', 'affix_magic_max', 'affix_rare_min', 'affix_rare_max', 'suffix_sin_chance_pct', 'salvage_dust_magic', 'salvage_dust_rare',
        'inventory_cap', 'injury_minutes', 'tavern_candidates', 'tavern_hire_cost', 'tavern_reroll_cost', 'start_gold', 'start_dust', 'start_stigma',
        'codex_card_drop_pct'];
    const missing = need.filter(k => B[k] === undefined);
    if (missing.length) fail(`missing: ${missing.join(', ')}`);
    if (B.offline_cap_hours !== undefined) fail('offline_cap_hours 는 퇴역 키 — 반복 원정은 게임이 켜져 있는 동안만 (08-25)');
    return true;
});
check('stage_round: 정예 3·6 / 보스 9', () => eq(D.eliteRounds, [3, 6]) && D.bossRound === 9);
check('weapon_group: 본편 5직업 전속 배정 (hero_design §2) · 스태프/완드 = magic · 궁수는 양손뿐', () => {
    const groups = cls => D.weaponGroupList.filter(g => g.classes.includes(cls)).map(g => g.id).sort();
    if (!eq(groups('warrior'), ['axe', 'mace', 'spear'])) fail(`warrior ${groups('warrior')}`);
    if (!eq(groups('knight'), ['sword1h', 'sword2h'])) fail(`knight ${groups('knight')}`);
    if (!eq(groups('mage'), ['staff', 'wand']) || !eq(groups('priest'), ['staff', 'wand'])) fail('caster pool');
    if (!eq(groups('archer'), ['bow', 'crossbow'])) fail(`archer ${groups('archer')}`);
    if (WG.staff.attackType !== 'magic' || WG.wand.attackType !== 'magic' || WG.axe.attackType !== 'physical') fail('attackType');
    if (!WG.bow.twoHanded || !WG.crossbow.twoHanded || WG.wand.twoHanded || WG.mace.twoHanded) fail('hands');
    for (const cls of ['warrior', 'knight', 'mage', 'priest']) {
        const gs = D.weaponGroupList.filter(g => g.classes.includes(cls));
        if (!gs.some(g => g.twoHanded) || !gs.some(g => !g.twoHanded)) fail(`${cls} 한손↔양손 선택 없음`);
    }
    return true;
});
check('combat_stat 사본: mock COMBAT_STATS = 24종, 삭제 7종 없음, 원소 저항 4종 있음', () => {
    const ids = M.COMBAT_STATS.map(s => s.id);
    const gone = ['status_chance', 'magic_defense', 'cc_reduction', 'heal_power', 'party_bonus', 'skill_level', 'dispatch_speed'].filter(id => ids.includes(id));
    if (gone.length) fail(`still: ${gone}`);
    const res = ['res_lightning', 'res_fire', 'res_cold', 'res_poison'].filter(id => !ids.includes(id));
    if (res.length) fail(`missing: ${res}`);
    const fhr = M.COMBAT_STATS.find(s => s.id === 'fhr');
    if (!fhr || fhr.ko.includes('타격')) fail('fhr 라벨 = 상태이상 회복 속도 (08-25)');
    if (ids.length !== 24) fail(`${ids.length}`);
    return true;
});

/* ── RNG ── */
check('rng: 같은 시드 = 같은 수열', () => {
    const a = makeRng(7), b = makeRng(7);
    for (let i = 0; i < 50; i++) if (a() !== b()) return false;
    return true;
});
check('rng: 다른 시드 = 다른 수열', () => makeRng(1)() !== makeRng(2)());
check('rng: deriveSeed 결정론', () => deriveSeed(123, 4) === deriveSeed(123, 4) && deriveSeed(123, 4) !== deriveSeed(123, 5));

/* ── 피해 공식 (battle_design §9) — formula.js 는 순수 함수라 여기서 직접 시험한다 ── */
const F = createFormula(B);
check('formula: 감쇠 곡선 — D=K 에서 정확히 50%, 면역 없음, 0에서 0', () => {
    const lv = 3, K = B.def_curve_k * lv;
    if (Math.abs(F.mitigation(K, lv) - 0.5) > 1e-9) fail(`D=K → ${F.mitigation(K, lv)}`);
    if (F.mitigation(0, lv) !== 0) fail('D=0');
    if (F.mitigation(1e9, lv) >= 1) fail('면역 발생');
    if (!(F.mitigation(K * 4, lv) > F.mitigation(K, lv))) fail('단조 증가 아님');
    return `K=${K} · D=4K → ${(F.mitigation(K * 4, lv) * 100).toFixed(0)}%`;
});
check('formula: K 가 레벨에 비례 — 같은 방어값이면 고레벨 공격자가 덜 감쇠된다 (§9-3)', () =>
    F.mitigation(50, 10) < F.mitigation(50, 1));
check('formula: 방어 무시는 곡선 앞 소재값을 깎는다 (감쇠율의 %가 아니다)', () => {
    const d = { def: 100, res: 0 };
    if (F.defenseAgainst(d, 'physical', 40) !== 60) fail(`${F.defenseAgainst(d, 'physical', 40)}`);
    return true;
});
check('formula: 공격 타입이 상대할 방어를 고른다 — 물리/원소 4종', () => {
    const d = { def: 10, res: { fire: 30, cold: 40, lightning: 50, poison: 60 } };
    if (F.defenseAgainst(d, 'physical', 0) !== 10) fail('physical');
    for (const [e, v] of [['fire', 30], ['cold', 40], ['lightning', 50], ['poison', 60]])
        if (F.defenseAgainst(d, e, 0) !== v) fail(e);
    return F.defenseAgainst({ def: 1, res: 9 }, 'fire', 0) === 9;      // 몬스터 = 4원소 공통 숫자 하나
});
check('formula: 적중률 = clamp(100 − 회피 + 명중), 하한이 회피 상한을 겸한다 (§9-4)', () => {
    if (F.hitChance(0, 0) !== 100) fail('기본 100');
    if (F.hitChance(0, 30) !== 70) fail('회피 30');
    if (F.hitChance(20, 30) !== 90) fail('명중이 회피를 되민다');
    if (F.hitChance(0, 9999) !== B.hit_floor_pct) fail('회피 몰빵 면역');
    if (F.hitChance(9999, 0) !== 100) fail('상한 100');
    return true;
});
check('formula: 치명 상한 crit_cap_pct — 넘겨도 전타 치명이 되지 않는다', () => {
    const rng = makeRng(5);
    const a = { atk: 100, atkType: 'physical', crit: 9999, critDmg: 200, acc: 0, lvl: 1, variance: 0 };
    let crits = 0;
    for (let i = 0; i < 400; i++) if (F.strike(rng, a, { def: 0, eva: 0 }).crit) crits++;
    if (crits === 400) fail('상한 미적용');
    return `${crits}/400 (상한 ${B.crit_cap_pct}%)`;
});
check('formula: 비직격은 감쇠·치명·편차를 받지 않는다 (§9-6)', () =>
    F.indirect(50) === 50 && F.indirect(0) === B.dmg_min && F.leech(200, 10) === 20);
check('formula: 직격 — 편차 0·치명 0 이면 결과가 결정적이고 감쇠가 그대로 곱해진다', () => {
    const rng = makeRng(11);
    const a = { atk: 1000, atkType: 'physical', crit: 0, critDmg: 100, acc: 0, lvl: 1, variance: 0 };
    const flat = F.strike(rng, a, { def: 0, eva: 0 }).dmg;
    if (flat !== 1000) fail(`무방어 ${flat}`);
    const K = B.def_curve_k;
    const half = F.strike(rng, a, { def: K, eva: 0 }).dmg;
    if (half !== 500) fail(`D=K 에서 ${half} (500 이어야)`);
    return true;
});
check('formula: 최종 피해 하한 dmg_min — 감쇠가 아무리 커도 0이 되지 않는다', () => {
    const rng = makeRng(13);
    const a = { atk: 1, atkType: 'fire', crit: 0, critDmg: 100, acc: 0, lvl: 1, variance: 0 };
    return F.strike(rng, a, { res: 1e6, eva: 0 }).dmg === B.dmg_min;
});

/* ── 영웅 생성 ── */
const cands = SYS.hero.rollStartParty(makeRng(1), B.party_size_max);
check('시작 파티: 3명, 죄종·직업·이름 겹침 없음', () => {
    const u = k => new Set(cands.map(c => typeof c[k] === 'object' ? c[k].en : c[k])).size === cands.length;
    return cands.length === B.party_size_max && u('sin') && u('cls') && u('name');
});
check('시작 파티: 능력치 합 고정, 범위 준수, 주력 축(CLASSES.keyAttr)이 최고', () => {
    for (const c of cands) {
        const vals = Object.values(c.stats);
        if (vals.reduce((a, b) => a + b, 0) !== B.hero_attr_total) fail(`sum ${vals.reduce((a, b) => a + b, 0)}`);
        if (vals.some(v => v < B.hero_attr_min || v > B.hero_attr_max)) fail('range');
        const key = M.CLASSES.find(x => x.id === c.cls).keyAttr;
        if (c.stats[key] !== Math.max(...vals)) fail(`${c.cls} key ${key}=${c.stats[key]} max=${Math.max(...vals)}`);
        for (const [id, v] of Object.entries(c.stats)) if (c.caps[id] < v || c.caps[id] > B.hero_attr_max) fail('caps');
    }
    return true;
});
check('시작 파티: 같은 시드 = 같은 3명', () => eq(SYS.hero.rollStartParty(makeRng(1), 3), cands));

/* ── 새 게임 · 직렬화 ── */
let G = SYS.game.newGame(42, cands, NOW);
check('newGame: 3명 로스터 = 파티, 각자 직업 전속 무기군 착용, 시작 자원, 착용 위치 9개', () => {
    if (G.heroes.length !== 3 || G.party.length !== 3) fail('count');
    for (const h of G.heroes) {
        const w = G.items[h.equipped.weapon];
        if (!w || w.slot !== 'weapon' || !WG[w.group]?.classes.includes(h.cls)) fail(`weapon ${h.cls} ${w?.group}`);
        if (Object.keys(h.equipped).length !== M.EQUIP_SLOTS.length || !('ring1' in h.equipped) || !('ring2' in h.equipped)) fail('positions');
    }
    return G.bag.length === 0 && G.resources.gold === B.start_gold;
});
check('save: serialize → deserialize 왕복 동일 (v2)', () => {
    const s = SYS.game.serialize(G, NOW);
    const back = SYS.game.deserialize(JSON.parse(JSON.stringify(s)));
    return eq(SYS.game.serialize(back, NOW), s) && s.version === SAVE_VERSION && SAVE_VERSION === 2;
});
check('save: 버전 불일치는 거부 (v1 · v99)', () => {
    for (const v of [1, 99]) { try { SYS.game.deserialize({ version: v, heroes: [] }); fail(`v${v} accepted`); } catch (e) { if (e instanceof Fail) throw e; } }
    return true;
});
check('save: 크기 < 64KB (빈 게임)', () => { const n = JSON.stringify(SYS.game.serialize(G, NOW)).length; return n < 65536 ? `${n} bytes` : fail(`${n} bytes`); });

/* ── 성장 ── */
check('xp: 필요량 단조 증가', () => { for (let l = 1; l < 30; l++) if (SYS.hero.xpNeeded(l + 1) <= SYS.hero.xpNeeded(l)) return false; return true; });
check('xp: 레벨업 시 능력치는 상한까지만', () => {
    const h = JSON.parse(JSON.stringify(G.heroes[0]));
    const lu = SYS.hero.grantXp(h, 100000, makeRng(3));
    for (const [id, v] of Object.entries(h.stats)) if (v > h.caps[id]) fail(`${id} ${v} > cap ${h.caps[id]}`);
    return lu && lu.to > lu.from && h.level > 5 ? `Lv ${lu.from}→${lu.to}` : fail('no levelup');
});

/* ── 장비 ── */
check('combat: 무기가 공격력을 올린다', () => {
    const h = G.heroes[0];
    const naked = SYS.hero.computeCombat(h, []);
    const armed = SYS.hero.computeCombat(h, [G.items[h.equipped.weapon]]);
    const atk = c => c.atk_physical ?? c.atk_magic;
    return atk(armed) > atk(naked) ? `${atk(naked)} → ${atk(armed)}` : false;
});
check('combat: 무기군이 물리/마법을 정하고 마법이면 attack_type = 무기 개체의 원소 (§9-5)', () => {
    const h = { ...G.heroes[0], stats: { ...G.heroes[0].stats, int: 20, str: 1 } };
    const staff = SYS.item.startingWeapon(makeRng(2), 'mage');
    if (!['staff', 'wand'].includes(staff.group)) fail(`mage weapon ${staff.group}`);
    const c = SYS.hero.computeCombat(h, [staff]);
    if (c.atk_magic === undefined || c.atk_physical !== undefined) fail('staff not magic');
    if (c.attack_type !== staff.element) fail(`attack_type ${c.attack_type} != 무기 원소 ${staff.element}`);
    if (!M.ELEMENT_IDS.includes(c.attack_type)) fail(`'magic' 은 값이 아니다 — ${c.attack_type}`);
    const n = SYS.hero.computeCombat(h, []);
    if (n.attack_type !== 'physical') fail('unarmed not physical');
    if (c.action_period > WG[staff.group].period) fail('period from group');
    return `${staff.group}(${c.attack_type}) → ${c.atk_magic}`;
});
check('combat: 마법 방어 없음 — 원소 저항 4종 = res_all + 원소별 접사 (battle_design §9-3)', () => {
    const armor = { slot: 'armor', rarity: 'magic', ilvl: 1, implicit: null, affixes: [{ stat: 'res_all', v: 7 }, { stat: 'res_fire', v: 5 }], sins: ['wrath'] };
    const c = SYS.hero.computeCombat(G.heroes[0], [armor]);
    if ('magic_defense' in c) fail('magic_defense still emitted');
    if (c.res_fire !== 12) fail(`res_fire ${c.res_fire}`);
    return c.res_lightning === 7 && c.res_cold === 7 && c.res_poison === 7;
});
check('combat: 명중·회피는 곱셈 — 장비가 0이면 감각도 0을 곱한다 (battle_design §8)', () => {
    const h = { ...G.heroes[0], stats: { ...G.heroes[0].stats, sen: 20 } };
    const bare = SYS.hero.computeCombat(h, []);
    if (bare.evasion !== 0 || bare.accuracy !== 0) fail(`bare ${bare.evasion}/${bare.accuracy}`);
    const boots = { slot: 'boots', rarity: 'magic', ilvl: 1, implicit: null, affixes: [{ stat: 'evasion', v: 10 }, { stat: 'accuracy', v: 10 }], sins: ['wrath'] };
    const geared = SYS.hero.computeCombat(h, [boots]);
    if (geared.evasion <= 10 || geared.accuracy <= 10) fail(`감각 계수 미적용 ${geared.evasion}/${geared.accuracy}`);
    return `sen20 · 접사 10 → 회피 ${geared.evasion}`;
});
check('item: 마법 무기 개체가 원소를 든다 — 물리 무기는 원소 없음 (battle_design §9-5)', () => {
    const rng = makeRng(31);
    let magicSeen = 0, physSeen = 0;
    const elems = new Set();
    for (let i = 0; i < 200; i++) {
        const it = SYS.item.rollDrop(rng, 5);
        if (it.slot !== 'weapon') continue;
        const g = WG[it.group];
        if (g.attackType === 'magic') {
            if (!M.ELEMENT_IDS.includes(it.element)) fail(`magic weapon element ${it.element}`);
            elems.add(it.element); magicSeen++;
        } else {
            if (it.element !== undefined) fail(`physical weapon has element ${it.element}`);
            physSeen++;
        }
    }
    if (!magicSeen || !physSeen) fail(`표본 부족 magic=${magicSeen} phys=${physSeen}`);
    return `마법 무기 ${magicSeen}개 · 원소 ${elems.size}종`;
});
check('item: 접사 죄종은 목록(세트포인트 없음) — 양손 2포인트·메인 죄종 +1 도 없다', () => {
    const rng = makeRng(21);
    for (let i = 0; i < 40; i++) {
        const it = SYS.item.rollDrop(rng, 5);
        if (!Array.isArray(it.sins) || it.sins.length < 1 || it.sins.length > 2 || new Set(it.sins).size !== it.sins.length) fail(`sins ${JSON.stringify(it.sins)}`);
        if (it.slot === 'weapon' && (it.period !== undefined || it.cls !== undefined)) fail('weapon carries period/cls — group 에서 읽어야 한다');
        if (it.slot === 'weapon' && WG[it.group]?.stage !== 'main') fail(`expansion group dropped: ${it.group}`);
    }
    return SYS.game.setPoints === undefined;
});
check('equip: 방어구 착용 → 방어력 상승, 해제 → 가방 복귀', () => {
    const rng = makeRng(9);
    let it;
    do { it = SYS.item.rollDrop(rng, 3); } while (it.slot !== 'armor');
    it.uid = 'test_armor'; G.items[it.uid] = it; G.bag.push(it.uid);
    const h = G.heroes[0];
    const before = SYS.game.heroCombat(G, h).defense;
    const r = SYS.game.equip(G, h.uid, it.uid);
    if (!r.ok) fail(`equip ${r.err}`);
    const after = SYS.game.heroCombat(G, h).defense;
    if (!(after > before)) fail(`def ${before} → ${after}`);
    const u = SYS.game.unequip(G, h.uid, 'armor');
    return u.ok && G.bag.includes(it.uid) && h.equipped.armor == null;
});
check('equip: 다른 직업 전속 무기군은 거부 · 공유 무기군(마법사↔사제)은 허용', () => {
    const h = G.heroes[0];
    const rng = makeRng(13);
    let foreign;
    do { foreign = SYS.item.rollDrop(rng, 3); } while (!(foreign.slot === 'weapon' && !WG[foreign.group].classes.includes(h.cls)));
    foreign.uid = 'test_foreign'; G.items[foreign.uid] = foreign; G.bag.push(foreign.uid);
    const r = SYS.game.equip(G, h.uid, foreign.uid);
    G.bag = G.bag.filter(u => u !== foreign.uid); delete G.items[foreign.uid];
    if (r.ok || r.err !== 'class') fail(`foreign ${JSON.stringify(r)}`);
    const priest = { cls: 'priest' }, mage = { cls: 'mage' }, knight = { cls: 'knight' };
    const wand = { slot: 'weapon', group: 'wand' };
    if (SYS.item.canEquip(priest, wand, []) !== null || SYS.item.canEquip(mage, wand, []) !== null) fail('shared caster pool rejected');
    return SYS.item.canEquip(knight, wand, []) === 'class';
});
check('equip: 양손 무기는 보조를 벗기고, 보조는 양손 중 거부', () => {
    const rng = makeRng(11);
    // 한손↔양손 선택이 있는 직업(궁수는 양손뿐)의 영웅으로 — 시작 무기를 벗겨 빈손에서 시작한다
    const h = G.heroes.find(x => D.weaponGroupList.some(g => g.classes.includes(x.cls) && !g.twoHanded)) ?? fail('no 1h-capable hero');
    const startW = h.equipped.weapon;
    if (startW) { const u = SYS.game.unequip(G, h.uid, 'weapon'); if (!u.ok) fail(`unequip ${u.err}`); }
    let two;
    do { two = SYS.item.rollDrop(rng, 3); } while (!(two.slot === 'weapon' && two.twoHanded && WG[two.group].classes.includes(h.cls)));
    let off;
    do { off = SYS.item.rollDrop(rng, 3); } while (off.slot !== 'offhand');
    two.uid = 'test_2h'; off.uid = 'test_off';
    G.items[two.uid] = two; G.items[off.uid] = off; G.bag.push(off.uid, two.uid);
    const r1 = SYS.game.equip(G, h.uid, off.uid);
    if (!r1.ok) fail(`offhand ${r1.err}`);
    const r2 = SYS.game.equip(G, h.uid, two.uid);
    if (!r2.ok) fail(`2h ${r2.err}`);
    if (h.equipped.offhand != null || !G.bag.includes(off.uid)) fail('offhand not returned');
    const r3 = SYS.game.equip(G, h.uid, off.uid);
    if (r3.ok || r3.err !== 'twoHanded') fail(`offhand under 2h ${JSON.stringify(r3)}`);
    if (startW) { const back = SYS.game.equip(G, h.uid, startW); if (!back.ok) fail(`restore ${back.err}`); }
    return `${h.cls}: ${two.group} ↔ offhand`;
});
check('equip: 반지 ×2 — 빈 칸부터 채우고, 셋째는 1번 칸을 교체한다', () => {
    const rng = makeRng(17);
    const h = G.heroes[1];
    const rings = [];
    while (rings.length < 3) { const it = SYS.item.rollDrop(rng, 3); if (it.slot === 'ring') rings.push(it); }
    rings.forEach((r, i) => { r.uid = `test_ring${i}`; G.items[r.uid] = r; G.bag.push(r.uid); });
    if (SYS.game.equipTarget(h, rings[0]) !== 'ring1') fail('target1');
    const a = SYS.game.equip(G, h.uid, rings[0].uid);
    if (!a.ok || a.position !== 'ring1') fail(`a ${JSON.stringify(a)}`);
    if (SYS.game.equipTarget(h, rings[1]) !== 'ring2') fail('target2');
    const b = SYS.game.equip(G, h.uid, rings[1].uid);
    if (!b.ok || b.position !== 'ring2') fail(`b ${JSON.stringify(b)}`);
    const c = SYS.game.equip(G, h.uid, rings[2].uid);
    if (!c.ok || c.position !== 'ring1' || !G.bag.includes(rings[0].uid)) fail(`c ${JSON.stringify(c)}`);
    if (SYS.game.heroItems(G, h).filter(it => it.slot === 'ring').length !== 2) fail('two rings worn');
    const d = SYS.game.equip(G, h.uid, rings[0].uid, 'ring2');      // 위치 지정 착용
    return d.ok && d.position === 'ring2' && h.equipped.ring2 === rings[0].uid;
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
    if (tl[0].e !== 'round' || tl[0].n !== 1) fail('first');
    if (tl[tl.length - 1].e !== 'end') fail('last');
    if (r.rounds.length > B.rounds_per_stage) fail('rounds');
    for (const ev of tl) if (ev.e === 'round' && ev.enemies.length > B.wave_monster_max) fail('wave');
    const keys = new Set(['p0', 'p1', 'p2']);
    for (const ev of tl) {
        if (ev.e === 'round') { for (const e of ev.enemies) keys.add(e.key); }
        if (ev.e === 'hit' && (!keys.has(ev.a) || !keys.has(ev.d))) fail(`key ${ev.a}→${ev.d}`);
    }
    return `${r.reason} r${r.roundsCleared} ${r.durationSec}s`;
});
check('simulate: 정예 라운드에 죄종·특성이 붙는다', () => {
    const r = SYS.battle.simulate(units(), 101, makeRng(5));
    const el = r.timeline.filter(ev => ev.e === 'round' && ev.kind === 'elite').flatMap(ev => ev.enemies).find(e => e.grade === 'elite');
    return el ? (el.sin && el.traits?.length === 3) : fail('elite round not reached');
});
check('simulate: 도감 카드는 처치의 부분집합, 타임라인 card 이벤트와 일치', () => {
    let seen = 0;
    for (let seed = 1; seed <= 10; seed++) {
        const r = SYS.battle.simulate(units(), 101, makeRng(seed));
        const evCards = {};
        for (const ev of r.timeline) if (ev.e === 'card') evCards[ev.monsterId] = (evCards[ev.monsterId] ?? 0) + 1;
        if (!eq(evCards, r.cards)) fail(`seed ${seed} timeline≠cards`);
        for (const [id, n] of Object.entries(r.cards)) { if (n > (r.kills[id] ?? 0)) fail(`seed ${seed} cards > kills`); seen += n; }
    }
    return seen > 0 ? `${seen} cards / 10 runs` : fail('no card in 10 runs (drop pct?)');
});

/* ── 원정 정산 ── */
check('resolveBattle: 골드·처치·카드·드롭·부상이 상태에 반영', () => {
    const G2 = SYS.game.newGame(42, cands, NOW);
    const gold = G2.resources.gold;
    const r = SYS.game.resolveBattle(G2, 101, NOW);
    if (!r.ok) fail(r.err);
    const rp = r.report;
    if (G2.resources.gold !== gold + rp.gold) fail('gold');
    if (Object.keys(G2.codexKills).length === 0) fail('kills');
    if (!eq(G2.codexCards, rp.cards)) fail('cards');
    if (rp.drops.some(u => !G2.bag.includes(u))) fail('drops');
    for (const uid of rp.downed) if (SYS.game.heroById(G2, uid).injuredUntil !== NOW + B.injury_minutes * 60000) fail('injury');
    if (rp.won !== G2.progress.cleared.includes(101)) fail('cleared');
    if (G2.counters.battle !== 1 || !G2.run || G2.run.stageId !== 101) fail('counters/run');
    return `${rp.won ? 'WIN' : 'LOSE'} gold+${rp.gold} drops ${rp.drops.length} cards ${Object.values(rp.cards).reduce((a, b) => a + b, 0)} downed ${rp.downed.length}`;
});
check('resolveBattle: 잠긴 스테이지·부상 파티는 출발 불가', () => {
    const G2 = SYS.game.newGame(42, cands, NOW);
    if (SYS.game.resolveBattle(G2, 102, NOW).err !== 'locked') fail('locked');
    G2.heroes[0].injuredUntil = NOW + 1000;
    if (SYS.game.resolveBattle(G2, 101, NOW).err !== 'injured') fail('injured');
    SYS.game.tickInjuries(G2, NOW + 2000);
    return G2.heroes[0].injuredUntil === null;
});
check('toggleParty: 부상자는 못 넣고, 상한을 넘지 못한다', () => {
    const G2 = SYS.game.newGame(42, cands, NOW);
    const uid = G2.party[0];
    SYS.game.toggleParty(G2, uid, NOW);
    if (G2.party.includes(uid)) fail('remove');
    SYS.game.heroById(G2, uid).injuredUntil = NOW + 1000;
    if (SYS.game.toggleParty(G2, uid, NOW).err !== 'injured') fail('injured');
    SYS.game.heroById(G2, uid).injuredUntil = null;
    if (!SYS.game.toggleParty(G2, uid, NOW).ok) fail('add back');
    const extra = SYS.game.tavernCandidates(G2)[0];
    G2.counters.hero++; extra.uid = 'hx'; G2.heroes.push(extra);
    return SYS.game.toggleParty(G2, 'hx', NOW).err === 'full';
});

/* ── 도감 — 카드 모델 ── */
check('codex: 레벨 = 누적 문턱(codex_level.csv), 카드는 소모되지 않고 최종 레벨에서 멈춘다', () => {
    const cum = D.codexLevels.reduce((a, r) => (a.push((a[a.length - 1] ?? 0) + r), a), []);
    if (SYS.game.codexLevel(0) !== 0) fail('lv0');
    for (let i = 0; i < cum.length; i++) {
        if (SYS.game.codexLevel(cum[i] - 1) !== i) fail(`below ${cum[i]}`);
        if (SYS.game.codexLevel(cum[i]) !== i + 1) fail(`at ${cum[i]}`);
        if (SYS.game.codexNext(cum[i] - 1) !== cum[i]) fail(`next ${i}`);
    }
    if (SYS.game.codexLevel(cum[cum.length - 1] * 10) !== cum.length) fail('max');
    if (SYS.game.codexNext(cum[cum.length - 1]) !== null) fail('next at max');
    if (SYS.game.codexMaxLevel() !== D.codexLevels.length) fail('maxLevel');
    return `thresholds ${cum.join('/')}`;
});
check('codex: 보너스는 카드 레벨에서(계열 = 스테이지 번호), 처치 수는 기록만', () => {
    const G2 = SYS.game.newGame(42, cands, NOW);
    G2.codexKills[1201] = 5000;                       // 처치 수만 많아도 레벨은 0
    if (SYS.game.codexBonus(G2).hp_pct !== 0) fail('kills raised bonus');
    G2.codexCards[1201] = 1000;                       // 2스테이지 몬스터 → 체력 계열
    const b = SYS.game.codexBonus(G2);
    if (b.hp_pct !== SYS.game.codexBonusAt(SYS.game.codexMaxLevel()) || b.atk_pct !== 0) fail(`bonus ${JSON.stringify(b)}`);
    const withCodex = SYS.game.heroCombat(G2, G2.heroes[0]).hp_max;
    G2.codexCards = {};
    const without = SYS.game.heroCombat(G2, G2.heroes[0]).hp_max;
    return withCodex > without ? `hp ${without} → ${withCodex}` : fail(`codex bonus not applied (${without} → ${withCodex})`);
});

/* ── 런 마무리 — 반복 원정은 게임이 켜져 있는 동안만 (08-25) ── */
check('closeRun: 반복 켠 채 껐다 켜면 반복이 꺼지고 알림만 남는다 — 추가 전투·자원 변화 없음', () => {
    const G2 = SYS.game.newGame(42, cands, NOW);
    SYS.game.resolveBattle(G2, 101, NOW);
    G2.run.repeat = true;
    const snap = JSON.stringify({ r: G2.resources, b: G2.counters.battle, bag: G2.bag, rep: G2.lastReport });
    const n = SYS.game.closeRun(G2, NOW + 8 * 3_600_000);
    if (!n || n.kind !== 'runClosed' || n.stageId !== 101) fail(`notice ${JSON.stringify(n)}`);
    if (G2.run.repeat !== false) fail('repeat still on');
    if (JSON.stringify({ r: G2.resources, b: G2.counters.battle, bag: G2.bag, rep: G2.lastReport }) !== snap) fail('state changed offline');
    SYS.game.dismissNotice(G2);
    return G2.notice === null;
});
check('closeRun: 반복이 꺼져 있으면 아무것도 안 한다', () => {
    const G2 = SYS.game.newGame(42, cands, NOW);
    SYS.game.resolveBattle(G2, 101, NOW);
    return SYS.game.closeRun(G2, NOW + 3_600_000) === null && G2.notice === null;
});

/* ── 선술집 ── */
check('tavern: 후보는 카운터에 결정론, 고용은 골드·상한을 지킨다', () => {
    const G2 = SYS.game.newGame(42, cands, NOW);
    const a = SYS.game.tavernCandidates(G2), b = SYS.game.tavernCandidates(G2);
    if (!eq(a, b)) fail('nondeterministic');
    G2.resources.gold = B.tavern_hire_cost - 1;
    if (SYS.game.hire(G2, 0).err !== 'gold') fail('gold gate');
    G2.resources.gold = B.tavern_hire_cost * 10;
    const r = SYS.game.hire(G2, 0);
    if (!r.ok || G2.heroes.length !== 4 || r.hero.uid !== 'h4') fail('hire');
    if (eq(SYS.game.tavernCandidates(G2), a)) fail('candidates should change after hire');
    while (G2.heroes.length < B.roster_cap) SYS.game.hire(G2, 0);
    return SYS.game.hire(G2, 0).err === 'roster';
});

/* ── 출력 ── */
const pass = results.filter(r => r.ok).length;
document.getElementById('head').innerHTML = `<b class="${pass === results.length ? 'ok' : 'fail'}">${pass === results.length ? 'PASS' : 'FAIL'}</b> ${pass} / ${results.length}`;
document.title = `${pass === results.length ? 'PASS' : 'FAIL'} ${pass}/${results.length}`;
document.getElementById('meta').textContent = `balance: monster_atk_scale=${B.monster_atk_scale} monster_hp_scale=${B.monster_hp_scale} weapon_atk_base=${B.weapon_atk_base} xp_rate=${B.xp_rate} hero_hp_base=${B.hero_hp_base} codex_card_drop_pct=${B.codex_card_drop_pct}`;
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
    let wins = 0, dur = 0, downed = 0, rounds = 0, gold = 0, drops = 0, cards = 0, timeouts = 0;
    for (let seed = 1; seed <= N; seed++) {
        const party = SYS.hero.rollStartParty(makeRng(1000 + seed), B.party_size_max);
        const G2 = SYS.game.newGame(seed, party, NOW);
        G2.progress.cleared = [101, 102, 103].filter(s => s < stageId);   // 해금만 풀어준다 (성장 없음)
        const r = SYS.game.resolveBattle(G2, stageId, NOW);
        const rp = r.report;
        if (rp.won) wins++;
        if (rp.reason === 'timeout') timeouts++;
        dur += rp.durationSec; downed += rp.downed.length; rounds += rp.won ? rp.rounds.length : rp.rounds.length - 1;
        gold += rp.gold; drops += rp.drops.length; cards += Object.values(rp.cards).reduce((a, b) => a + b, 0);
    }
    rows.push({ stageId, wins, dur: dur / N, downed: downed / N, rounds: rounds / N, gold: gold / N, drops: drops / N, cards: cards / N, timeouts });
}
document.getElementById('calib').innerHTML = `
    <table>
        <tr><th>stage</th><th>win</th><th>avg rounds</th><th>avg sec</th><th>avg downed</th><th>avg gold</th><th>avg drops</th><th>avg cards</th><th>timeouts</th></tr>
        ${rows.map(r => `<tr><td>${r.stageId}</td>
            <td class="${r.wins / N >= .7 ? 'up' : r.wins / N >= .3 ? 'warn' : 'down'}">${r.wins}/${N}</td>
            <td>${r.rounds.toFixed(1)}</td><td>${r.dur.toFixed(0)}</td><td>${r.downed.toFixed(2)}</td>
            <td>${r.gold.toFixed(0)}</td><td>${r.drops.toFixed(1)}</td><td>${r.cards.toFixed(1)}</td><td>${r.timeouts}</td></tr>`).join('')}
    </table>
    <pre>목표: 101 승률 ≥ 70% (시작 파티 그대로) · 102 30~70% · 103/104 는 성장·장비 없이는 지는 게 정상
시작 파티 Lv1 · 직업 전속 무기군 무기 1개 · 방어구 없음 · 스킬 없음 (스킬 미작성) 기준
⚠ 무기군 재배정(08-25)으로 시작 무기의 한손/양손·행동 주기가 바뀌었다 — 이전 캘리브레이션(1-1 95%)과 직접 비교 불가</pre>`;
