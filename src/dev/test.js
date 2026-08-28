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
/** 손으로 만든 장비 — 접사만 지정하고 나머지는 최소 골격 (드롭 굴림과 무관하게 계산을 시험한다) */
const mkItem = (slot, affixes, extra = {}) =>
    ({ uid: null, slot, rarity: 'magic', ilvl: 1, name: { ko: slot, en: slot }, implicit: null, affixes, sins: ['wrath'], ...extra });

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
        'hero_hp_base', 'attr_bonus_per_point', 'hero_xp_base', 'hero_xp_exp', 'power_growth_per_level', 'attr_growth_chance_pct', 'xp_rate',
        'unarmed_atk', 'unarmed_period', 'weapon_atk_base', 'two_hand_atk_mult', 'armor_def_base', 'armor_def_per_ilvl', 'armor_def_variance_pct',
        'base_crit_pct', 'base_crit_damage_pct', 'dmg_variance_pct', 'monster_hp_scale', 'monster_atk_scale', 'monster_def_scale', 'battle_timeout_sec',
        'def_curve_k', 'dmg_min', 'crit_cap_pct', 'res_cap_base', 'res_cap_absolute',
        'hit_base_pct', 'hit_per_level_deficit_pct', 'hit_min_pct',
        'gold_rate', 'drop_chance_pct', 'boss_guaranteed_drop', 'drop_ilvl_spread', 'dust_elite', 'dust_boss', 'rarity_w_magic', 'rarity_w_rare',
        'affix_magic_min', 'affix_magic_max', 'affix_rare_min', 'affix_rare_max', 'suffix_sin_chance_pct', 'salvage_dust_magic', 'salvage_dust_rare',
        'inventory_cap', 'injury_minutes', 'tavern_candidates', 'tavern_hire_cost', 'tavern_reroll_cost', 'start_gold', 'start_dust', 'start_stigma',
        'codex_card_drop_pct'];
    const missing = need.filter(k => B[k] === undefined);
    if (missing.length) fail(`missing: ${missing.join(', ')}`);
    if (B.offline_cap_hours !== undefined) fail('offline_cap_hours 는 퇴역 키 — 반복 원정은 게임이 켜져 있는 동안만 (08-25)');
    // 퇴역 키 — 08-26 수치 대역 재설계로 사라졌다. 남아 있으면 코드가 옛 규칙을 되살릴 수 있다
    const retired = ['hero_hp_per_level', 'weapon_atk_per_ilvl', 'hit_floor_pct'].filter(k => B[k] !== undefined);
    if (retired.length) fail(`퇴역 키가 남아 있다: ${retired.join(', ')} (성장은 power_growth_per_level · 적중은 hit_min_pct)`);
    return true;
});
check('monster.csv: 저항은 원소별 4컬럼 — 공통 소재값(resist)은 퇴역했다 (monster_design §7-1)', () => {
    const m = D.monsters[1101];
    for (const e of ['fire', 'cold', 'lightning', 'poison']) if (typeof m[`res_${e}`] !== 'number') fail(`res_${e}`);
    if (m.resist !== undefined) fail('resist 컬럼이 아직 있다');
    return `1101 → ${['fire', 'cold', 'lightning', 'poison'].map(e => m[`res_${e}`]).join('/')}`;
});
check('spawn_grade.csv: 등급은 저항을 %p 로 가산한다 (배율이 아니다)', () =>
    typeof D.grades.elite.res_add === 'number' && D.grades.normal.res_add === 0);
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
check('combat_stat 사본: mock COMBAT_STATS 가 combat_stat.csv 25행과 1:1 (순서까지)', () => {
    const ids = M.COMBAT_STATS.map(s => s.id);
    const gone = ['status_chance', 'magic_defense', 'cc_reduction', 'heal_power', 'party_bonus', 'skill_level', 'dispatch_speed',
        'accuracy', 'evasion'].filter(id => ids.includes(id));
    if (gone.length) fail(`still: ${gone}`);
    const need = ['res_lightning', 'res_fire', 'res_cold', 'res_poison', 'res_max_bonus', 'res_reduction', 'vs_status_damage'].filter(id => !ids.includes(id));
    if (need.length) fail(`missing: ${need}`);
    const fhr = M.COMBAT_STATS.find(s => s.id === 'fhr');
    if (!fhr || fhr.ko.includes('타격')) fail('fhr 라벨 = 상태이상 회복 속도 (08-25)');
    // 저항은 소재값이 아니라 직접 % (§9-5) · 유틸은 운 계수 (hero_design §4-1)
    for (const id of ['res_fire', 'res_cold', 'res_lightning', 'res_poison', 'res_max_bonus'])
        if (M.COMBAT_STATS.find(s => s.id === id).fmt !== 'pct') fail(`${id} fmt`);
    for (const id of ['item_find', 'gold_find'])
        if (M.COMBAT_STATS.find(s => s.id === id).attr !== 'luck') fail(`${id} attr`);
    if (ids.length !== 25) fail(`${ids.length}`);
    return true;
});
check('기본 능력치 사본: 감각 → 운 (2026-08-26 재정의), 자리 유지 · 궁수 keyAttr 이 따라간다', () => {
    const ids = M.STATS.map(s => s.id);
    if (ids.includes('sen')) fail('sen 이 남아 있다');
    if (ids[4] !== 'luck') fail(`5번째가 luck 이 아니다: ${ids[4]}`);
    if (M.CLASSES.find(c => c.id === 'archer').keyAttr !== 'luck') fail('archer keyAttr');
    return ids.join('/');
});
check('접사 정의: scale 3분류 · perIlvl 은 band 에만 · 명중/회피 접사 없음 (item_design §2-1)', () => {
    for (const d of M.AFFIX_DEFS) {
        if (!['growth', 'band', 'flat'].includes(d.scale)) fail(`${d.stat} scale=${d.scale}`);
        if (d.scale !== 'band' && d.perIlvl !== undefined) fail(`${d.stat} 에 perIlvl 이 남아 있다`);
        if (d.scale === 'band' && typeof d.perIlvl !== 'number') fail(`${d.stat} band 인데 perIlvl 없음`);
        if (!M.AFFIX_LABELS[d.stat]) fail(`라벨 없음: ${d.stat}`);
    }
    if (M.AFFIX_DEFS.some(d => ['accuracy', 'evasion'].includes(d.stat))) fail('명중/회피 접사가 남아 있다');
    if (!M.AFFIX_DEFS.some(d => d.stat === 'damage_reduction')) fail('피해 감소 접사 없음');
    if (!['res_fire', 'res_cold', 'res_lightning', 'res_poison'].every(s => M.AFFIX_DEFS.some(d => d.stat === s))) fail('원소별 저항 4종 없음');
    // 무기 = 밑수 — 고정 공격력 접사는 무기 슬롯 전속 (§9-1)
    if (!eq(M.AFFIX_DEFS.find(d => d.stat === 'atk_flat').slots, ['weapon'])) fail('atk_flat 은 무기 전속이어야 한다');
    return `${M.AFFIX_DEFS.length}종`;
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
/** 값을 정해 주는 rng — 소비 횟수를 세고, 순서 계약을 시드 운에 맡기지 않는다 */
const seqRng = vals => {
    let i = 0;
    const f = () => { f.n += 1; return vals[Math.min(i++, vals.length - 1)]; };
    f.n = 0;
    return f;
};
check('formula: 감쇠 곡선 — D=K 에서 정확히 50%, 면역 없음, 0에서 0 (§9-3)', () => {
    const K = B.def_curve_k;
    if (Math.abs(F.mitigation(K) - 0.5) > 1e-9) fail(`D=K → ${F.mitigation(K)}`);
    if (F.mitigation(0) !== 0) fail('D=0');
    if (F.mitigation(1e9) >= 1) fail('면역 발생');
    if (!(F.mitigation(K * 4) > F.mitigation(K))) fail('단조 증가 아님');
    return `K=${K} · D=4K → ${(F.mitigation(K * 4) * 100).toFixed(0)}%`;
});
check('formula: def_curve_k 는 상수 — 감쇠가 레벨과 무관하다 (08-26 레벨 앵커 폐기)', () => {
    if (F.mitigation(50) !== F.mitigation(50, 99)) fail('레벨 인자가 아직 곡선을 흔든다');
    if (F.mitigation(50, 1) !== F.mitigation(50, 10)) fail('레벨별로 다르다');
    // 실효 체력 = HP × (1 + 방어/K) — 방어 1점의 가치가 구간과 무관하게 같다
    const eff = D2 => 1 / (1 - F.mitigation(D2));
    if (Math.abs((eff(2 * B.def_curve_k) - eff(B.def_curve_k)) - (eff(B.def_curve_k) - eff(0))) > 1e-9) fail('실효 체력이 선형이 아니다');
    return true;
});
check('formula: 방어 무시는 곡선 앞 소재값을 깎는다 (감쇠율의 %가 아니다)', () => {
    if (Math.abs(F.physicalDefense(100, 40) - 60) > 1e-9) fail(`${F.physicalDefense(100, 40)}`);
    if (F.physicalDefense(100) !== 100) fail('기본 0%');
    if (F.physicalDefense(100, 150) !== 0) fail('음수로 내려가지 않는다');
    return true;
});
check('formula: 원소 저항은 상한형 — res_cap_base 에서 잘리고 최대 저항 증가만 뚫는다, 절대 상한이 마지막 (§9-5)', () => {
    if (F.appliedResist(30) !== 30) fail('상한 아래는 그대로');
    if (F.appliedResist(200) !== B.res_cap_base) fail(`기본 상한 ${F.appliedResist(200)}`);
    if (F.appliedResist(200, 10) !== B.res_cap_base + 10) fail('최대 저항 증가가 상한을 못 뚫는다');
    if (F.appliedResist(999, 999) !== B.res_cap_absolute) fail('절대 상한');
    if (F.resCap() !== B.res_cap_base) fail('resCap');
    return `${B.res_cap_base}% → 절대 ${B.res_cap_absolute}%`;
});
check('formula: 저항은 하한이 없다 — 음수 저항은 피해를 증폭한다 (§9-5)', () => {
    const a = { atk: 100, atkType: 'fire', crit: 0, critDmg: 100, lvl: 5 };
    const amp = F.strike(seqRng([0, 0.99]), a, { res: { fire: -50 }, lvl: 5 }).dmg;
    if (!(amp > a.atk)) fail(`증폭되지 않았다 ${amp}`);
    return `저항 −50% → ${amp} (공격력 ${a.atk})`;
});
check('formula: 저항 감소는 %p 가감 — 관통이라는 별도 규칙이 아니다 (§9-5)', () => {
    const a = { atk: 100, atkType: 'cold', crit: 0, critDmg: 100, lvl: 5, resReduction: 30 };
    const dmg = F.strike(seqRng([0, 0.99]), a, { res: { cold: 30 }, lvl: 5 }).dmg;
    return dmg === 100 ? '저항 30 − 감소 30 → 무저항' : fail(`${dmg}`);
});
check('formula: 피해 감소는 원천별 곱 — 10 + 10 은 20이 아니라 19 (§9-3)', () => {
    if (Math.abs(F.reductionMult([10, 10]) - 0.81) > 1e-9) fail(`${F.reductionMult([10, 10])}`);
    if (F.reductionMult([]) !== 1) fail('빈 배열은 1');
    if (!(F.reductionMult([50, 50, 50, 50]) > 0)) fail('0에 닿았다 — 면역 발생');
    return `10+10 → ${(100 * (1 - F.reductionMult([10, 10]))).toFixed(0)}%`;
});
check('formula: 적중률은 레벨 차만이 정한다 — 동레벨 기준값, 오버레벨 초과 이득 없음, 하한 존재 (§9-4)', () => {
    if (F.hitChance(5, 5) !== B.hit_base_pct) fail('동레벨');
    if (F.hitChance(10, 5) !== B.hit_base_pct) fail('오버레벨에서 더 오른다');
    if (F.hitChance(5, 6) !== B.hit_base_pct - B.hit_per_level_deficit_pct) fail('레벨 1 부족');
    if (F.hitChance(1, 99) !== B.hit_min_pct) fail('하한');
    return `기준 ${B.hit_base_pct}% · 부족 1당 −${B.hit_per_level_deficit_pct}%p · 하한 ${B.hit_min_pct}%`;
});
check('formula: 성장 곡선 growthMult — n=1 에서 1, 1당 power_growth_per_level 배 (§9-0)', () => {
    if (F.growthMult(1) !== 1) fail('n=1');
    if (Math.abs(F.growthMult(2) - B.power_growth_per_level) > 1e-12) fail('n=2');
    if (F.growthMult(0) !== 1) fail('n<1 은 1로 막는다');
    if (Math.abs(F.growthMult(11) - Math.pow(B.power_growth_per_level, 10)) > 1e-9) fail('n=11');
    return `ilvl 10 → ×${F.growthMult(10).toFixed(2)} · 챕터(ilvl 8) → ×${F.growthMult(8).toFixed(2)}`;
});
check('formula: strike 의 rng 소비 = 적중 → 치명 (빗나가면 1회) — 편차 굴림 삭제 (§5-2 계약)', () => {
    const a = { atk: 100, atkType: 'physical', crit: 50, critDmg: 200, lvl: 5 };
    const hit = seqRng([0, 0.99]);
    const r1 = F.strike(hit, a, { def: 0, lvl: 5 });
    if (!r1.hit || hit.n !== 2) fail(`적중 시 ${hit.n}회 (2 이어야)`);
    const miss = seqRng([0.99, 0.0]);
    const r2 = F.strike(miss, a, { def: 0, lvl: 99 });      // 레벨 부족 → 적중률 하한
    if (r2.hit || miss.n !== 1) fail(`빗나감 시 ${miss.n}회 (1 이어야)`);
    if (r2.dmg !== 0 || r2.crit !== false) fail('빗나감 결과');
    return true;
});
check('formula: 치명 상한 crit_cap_pct — 넘겨도 전타 치명이 되지 않는다', () => {
    const rng = makeRng(5);
    const a = { atk: 100, atkType: 'physical', crit: 9999, critDmg: 200, lvl: 5 };
    let crits = 0;
    for (let i = 0; i < 400; i++) if (F.strike(rng, a, { def: 0, lvl: 5 }).crit) crits++;
    if (crits === 400) fail('상한 미적용');
    return `${crits}/400 (상한 ${B.crit_cap_pct}%)`;
});
check('formula: 비직격은 감쇠·치명을 받지 않는다 (§9-6)', () =>
    F.indirect(50) === 50 && F.indirect(0) === B.dmg_min && F.leech(200, 10) === 20);
check('formula: 직격 — 타격 편차가 없어 시드와 무관하게 같은 숫자가 나오고 감쇠가 그대로 곱해진다', () => {
    const a = { atk: 1000, atkType: 'physical', crit: 0, critDmg: 100, lvl: 5 };
    const flat = F.strike(makeRng(11), a, { def: 0, lvl: 5 }).dmg;
    if (flat !== 1000) fail(`무방어 ${flat}`);
    const half = F.strike(makeRng(11), a, { def: B.def_curve_k, lvl: 5 }).dmg;
    if (half !== 500) fail(`D=K 에서 ${half} (500 이어야)`);
    for (let s = 0; s < 30; s++) if (F.strike(makeRng(s), a, { def: 0, lvl: 5 }).dmg !== 1000) fail('타격마다 편차가 남아 있다');
    return true;
});
check('formula: 조건부 피해 %(bonusPct)가 타격에 곱해진다 · 스킬 배율은 기본 1', () => {
    const a = { atk: 100, atkType: 'physical', crit: 0, critDmg: 100, lvl: 5 };
    if (F.strike(seqRng([0, 0.99]), { ...a, bonusPct: 50 }, { def: 0, lvl: 5 }).dmg !== 150) fail('bonusPct');
    if (F.strike(seqRng([0, 0.99]), { ...a, skillMult: 2 }, { def: 0, lvl: 5 }).dmg !== 200) fail('skillMult');
    if (F.strike(seqRng([0, 0.99]), a, { def: 0, lvl: 5 }).dmg !== 100) fail('기본값');
    return true;
});
check('formula: 최종 피해 하한 dmg_min — 감쇠가 아무리 커도 0이 되지 않는다', () => {
    const a = { atk: 1, atkType: 'fire', crit: 0, critDmg: 100, lvl: 5 };
    return F.strike(seqRng([0, 0.99]), a, { res: { fire: 1e6 }, lvl: 5 }).dmg === B.dmg_min;
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
check('save: serialize → deserialize 왕복 동일 (v3)', () => {
    const s = SYS.game.serialize(G, NOW);
    const back = SYS.game.deserialize(JSON.parse(JSON.stringify(s)));
    return eq(SYS.game.serialize(back, NOW), s) && s.version === SAVE_VERSION && SAVE_VERSION === 3;
});
check('save: v2 → v3 이관 — 감각 키가 운으로, 명중/회피 접사가 사라진다 (deserialize 안에서 올린다)', () => {
    const v2 = JSON.parse(JSON.stringify(SYS.game.serialize(G, NOW)));
    v2.version = 2;
    // v2 세이브 재현 — 능력치 키를 sen 으로 되돌리고 폐지된 접사를 심는다
    const senValues = [];
    for (const h of v2.heroes) {
        h.stats = Object.fromEntries(Object.entries(h.stats).map(([k, v]) => [k === 'luck' ? 'sen' : k, v]));
        h.caps = Object.fromEntries(Object.entries(h.caps).map(([k, v]) => [k === 'luck' ? 'sen' : k, v]));
        senValues.push(h.stats.sen);
    }
    const itemUid = Object.keys(v2.items)[0];
    v2.items[itemUid].affixes = [{ stat: 'accuracy', v: 7 }, { stat: 'crit_rate', v: 3 }, { stat: 'evasion', v: 9 }];

    const up = SYS.game.deserialize(v2);
    if (up.version !== 3) fail(`version ${up.version}`);
    up.heroes.forEach((h, i) => {
        if ('sen' in h.stats || 'sen' in h.caps) fail('sen 키가 남았다');
        if (h.stats.luck !== senValues[i]) fail(`값이 바뀌었다 ${h.stats.luck} ≠ ${senValues[i]}`);
        if (typeof h.caps.luck !== 'number') fail('caps 미이관');
        if (Object.keys(h.stats).length !== M.STATS.length) fail('키 수가 달라졌다');
    });
    const af = up.items[itemUid].affixes;
    if (af.some(a => ['accuracy', 'evasion'].includes(a.stat))) fail('폐지 접사가 남았다');
    if (!eq(af, [{ stat: 'crit_rate', v: 3 }])) fail(`나머지 접사가 보존되지 않았다 ${JSON.stringify(af)}`);
    // 무기 개체값은 재굴림하지 않는다
    const w = Object.values(up.items).find(it => it.slot === 'weapon');
    if (w.watk !== Object.values(v2.items).find(it => it.uid === w.uid).watk) fail('watk 가 재굴림됐다');
    return `${up.heroes.length}명 · 접사 ${af.length}개 잔존`;
});
check('save: 버전 불일치는 거부 (v1 · v99) — v1 은 스키마 단절이라 이관하지 않는다', () => {
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
check('combat: 무기가 밑수다 — 무기 접사의 고정 공격력만 오르고 장갑의 것은 안 오른다 (§9-1)', () => {
    const h = G.heroes[0];
    const atk = c => c.atk_physical ?? c.atk_magic;
    const w = { ...G.items[h.equipped.weapon], affixes: [] };
    const base = atk(SYS.hero.computeCombat(h, [w]));
    const wPlus = { ...w, affixes: [{ stat: 'atk_flat', v: 5 }] };
    const gloves = mkItem('gloves', [{ stat: 'atk_flat', v: 5 }]);
    const armed = atk(SYS.hero.computeCombat(h, [wPlus]));
    if (!(armed > base)) fail(`무기 접사가 안 걸린다 ${base} → ${armed}`);
    if (atk(SYS.hero.computeCombat(h, [w, gloves])) !== base) fail('무기 외 슬롯의 고정 공격력이 밑수에 더해졌다');
    // 상시 피해 %는 밑수 전체를 곱한다 (반올림 알갱이를 피하려고 큰 밑수로 본다)
    const big = { ...w, watk: 100, affixes: [] };
    const b100 = atk(SYS.hero.computeCombat(h, [big]));
    const p100 = atk(SYS.hero.computeCombat(h, [{ ...big, affixes: [{ stat: 'atk_pct', v: 100 }] }]));
    if (Math.abs(p100 - 2 * b100) > 1) fail(`atk_pct 가 밑수를 곱하지 않는다 ${b100} → ${p100}`);
    return `밑수 ${base} · 무기접사 +5 → ${armed} · watk100 +100% → ${b100}→${p100}`;
});
check('combat: 원소 저항은 직접 % — res_all + 원소별 접사, 최대 저항 증가·저항 감소는 따로 낸다 (§9-5)', () => {
    const armor = mkItem('armor', [{ stat: 'res_all', v: 7 }, { stat: 'res_fire', v: 5 }]);
    const c = SYS.hero.computeCombat(G.heroes[0], [armor]);
    if ('magic_defense' in c) fail('magic_defense still emitted');
    if (c.res_fire !== 12) fail(`res_fire ${c.res_fire}`);
    if (c.res_max_bonus !== 0 || c.res_reduction !== 0) fail('접사 없는데 값이 있다');
    const boosted = SYS.hero.computeCombat(G.heroes[0], [mkItem('amulet', [{ stat: 'res_max_bonus', v: 5 }, { stat: 'res_reduction', v: 10 }])]);
    if (boosted.res_max_bonus !== 5 || boosted.res_reduction !== 10) fail('축이 출력되지 않는다');
    return c.res_lightning === 7 && c.res_cold === 7 && c.res_poison === 7;
});
check('combat: 출력에 명중·회피·편차가 없다 (08-26 폐지 — §9-4)', () => {
    const c = SYS.game.heroCombat(G, G.heroes[0]);
    const gone = ['accuracy', 'evasion', 'variance_pct'].filter(k => k in c);
    if (gone.length) fail(`still: ${gone.join(', ')}`);
    if (typeof c.level !== 'number') fail('적중률에 쓸 level 이 없다');
    return true;
});
check('combat: 피해 감소는 원천별 곱 — 접사 10 + 10 → 실효 19% (§9-3)', () => {
    const c = SYS.hero.computeCombat(G.heroes[0], [
        mkItem('armor', [{ stat: 'damage_reduction', v: 10 }]),
        mkItem('helmet', [{ stat: 'damage_reduction', v: 10 }]),
    ]);
    if (Math.abs(c.damage_reduction - 19) > 1e-6) fail(`${c.damage_reduction}`);
    const one = SYS.hero.computeCombat(G.heroes[0], [mkItem('armor', [{ stat: 'damage_reduction', v: 10 }])]);
    if (Math.abs(one.damage_reduction - 10) > 1e-6) fail(`하나면 ${one.damage_reduction}`);
    return '10+10 → 19%';
});
check('combat: 운은 전투 밖 — 장비가 0이면 0, 접사가 있으면 운 계수가 곱해진다 (hero_design §4-1)', () => {
    const h = { ...G.heroes[0], stats: { ...G.heroes[0].stats, luck: 20 } };
    const bare = SYS.hero.computeCombat(h, []);
    if (bare.gold_find !== 0 || bare.item_find !== 0) fail(`bare ${bare.gold_find}/${bare.item_find}`);
    const geared = SYS.hero.computeCombat(h, [mkItem('boots', [{ stat: 'gold_find', v: 10 }, { stat: 'item_find', v: 10 }])]);
    if (geared.gold_find <= 10 || geared.item_find <= 10) fail(`운 계수 미적용 ${geared.gold_find}/${geared.item_find}`);
    // 운은 전투 축에 손대지 않는다
    const lowLuck = SYS.hero.computeCombat({ ...h, stats: { ...h.stats, luck: 1 } }, []);
    if (lowLuck.atk_physical !== bare.atk_physical || lowLuck.hp_max !== bare.hp_max) fail('운이 전투 능력치를 흔든다');
    return `luck20 · 접사 10 → 골드 획득 ${geared.gold_find}`;
});
check('combat: hp_max 는 레벨 기하 곡선 — hero_hp_base × power_growth_per_level^(lv−1) (hero_design §5)', () => {
    const h = G.heroes[0];
    const at = lv => SYS.hero.computeCombat({ ...h, level: lv }, []).hp_max;
    if (at(1) !== Math.round(B.hero_hp_base)) fail(`lv1 ${at(1)}`);
    if (at(2) !== Math.round(B.hero_hp_base * B.power_growth_per_level)) fail(`lv2 ${at(2)}`);
    if (at(10) !== Math.round(B.hero_hp_base * Math.pow(B.power_growth_per_level, 9))) fail(`lv10 ${at(10)}`);
    return `lv1 ${at(1)} → lv10 ${at(10)}`;
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
check('item: 무기 공격력은 개체 굴림 — 같은 ilvl 도 서로 다르고 편차 폭 안에 있다 (§9-1 · R2·R10)', () => {
    const rng = makeRng(41);
    const ILVL = 10;
    const byGroup = {};
    for (let i = 0; i < 400; i++) {
        const it = SYS.item.rollDrop(rng, ILVL);
        if (it.slot !== 'weapon') continue;
        const g = WG[it.group];
        const nominal = B.weapon_atk_base * Math.pow(B.power_growth_per_level, ILVL - 1) * (g.twoHanded ? B.two_hand_atk_mult : 1);
        const v = g.variance ?? B.dmg_variance_pct;
        if (it.watk < nominal * (1 - v / 100) - 1e-6 || it.watk > nominal * (1 + v / 100) + 1e-6)
            fail(`${it.group} watk ${it.watk} ∉ ${nominal.toFixed(2)} ±${v}%`);
        if (Math.abs(it.watk * 100 - Math.round(it.watk * 100)) > 1e-6) fail(`소수 2자리가 아니다: ${it.watk}`);
        (byGroup[it.group] ??= []).push(it.watk);
    }
    const groups = Object.entries(byGroup).filter(([, l]) => l.length >= 3);
    if (!groups.length) fail('무기 표본 부족');
    if (!groups.some(([, l]) => new Set(l).size > 1)) fail('개체차가 없다 — 편차가 개체에 박히지 않았다');
    const [gid, list] = groups[0];
    return `${gid} ${list.length}개 · ${Math.min(...list)} ~ ${Math.max(...list)}`;
});
check('item: 무기 공격력은 성장 곡선을 탄다 — ilvl 이 오르면 대역이 통째로 올라간다 (§9-0)', () => {
    const lo = [], hi = [];
    const rng = makeRng(43);
    for (let i = 0; i < 600; i++) {
        const it = SYS.item.rollDrop(rng, 1);
        if (it.slot === 'weapon' && it.group === 'mace') lo.push(it.watk);
    }
    const rng2 = makeRng(43);
    for (let i = 0; i < 600; i++) {
        const it = SYS.item.rollDrop(rng2, 20);
        if (it.slot === 'weapon' && it.group === 'mace') hi.push(it.watk);
    }
    if (!lo.length || !hi.length) fail(`표본 ${lo.length}/${hi.length}`);
    if (!(Math.min(...hi) > Math.max(...lo))) fail(`대역이 겹친다 ${Math.max(...lo)} vs ${Math.min(...hi)}`);
    return `mace ilvl1 ≤${Math.max(...lo)} · ilvl20 ≥${Math.min(...hi)}`;
});
check('item: 방어구 고유값도 개체 굴림 — armor_def_variance_pct 안, 보조는 ×1.5 (§9-1)', () => {
    const rng = makeRng(47);
    const ILVL = 8;
    const seen = [];
    for (let i = 0; i < 400; i++) {
        const it = SYS.item.rollDrop(rng, ILVL);
        if (['weapon', 'amulet', 'ring'].includes(it.slot)) { if (it.implicit) fail(`${it.slot} 에 implicit 이 있다`); continue; }
        if (!it.implicit || it.implicit.stat !== 'def_flat') fail(`${it.slot} implicit ${JSON.stringify(it.implicit)}`);
        const nominal = (B.armor_def_base + ILVL * B.armor_def_per_ilvl) * (it.slot === 'offhand' ? 1.5 : 1);
        const v = B.armor_def_variance_pct;
        if (it.implicit.v < nominal * (1 - v / 100) - 0.05 || it.implicit.v > nominal * (1 + v / 100) + 0.05)
            fail(`${it.slot} def ${it.implicit.v} ∉ ${nominal.toFixed(2)} ±${v}%`);
        if (it.slot === 'armor') seen.push(it.implicit.v);
    }
    if (new Set(seen).size <= 1) fail('개체차가 없다');
    return `armor ${seen.length}개 · ${Math.min(...seen)} ~ ${Math.max(...seen)}`;
});
check('item: 접사 3분류 — flat 은 ilvl 60 에서도 굴림 범위 안, growth 는 ilvl 로 커진다 (item_design §2-1)', () => {
    const defOf = stat => M.AFFIX_DEFS.find(d => d.stat === stat);
    const rng = makeRng(53);
    const growthLo = {}, growthHi = {};
    for (let i = 0; i < 400; i++) {
        for (const a of SYS.item.rollDrop(rng, 1).affixes) {
            const d = defOf(a.stat);
            if (d.scale === 'flat' && (a.v < Math.round(d.min) || a.v > Math.round(d.max))) fail(`ilvl1 ${a.stat} ${a.v} ∉ [${d.min}, ${d.max}]`);
            if (d.scale === 'growth') growthLo[a.stat] = Math.max(growthLo[a.stat] ?? 0, a.v);
        }
    }
    const rng2 = makeRng(59);
    for (let i = 0; i < 400; i++) {
        for (const a of SYS.item.rollDrop(rng2, 60).affixes) {
            const d = defOf(a.stat);
            if (d.scale === 'flat' && (a.v < Math.round(d.min) || a.v > Math.round(d.max))) fail(`ilvl60 ${a.stat} ${a.v} ∉ [${d.min}, ${d.max}] — % 접사가 ilvl 을 탄다`);
            if (d.scale === 'band' && (a.v < Math.round(d.min + 60 * d.perIlvl) || a.v > Math.round(d.max + 60 * d.perIlvl))) fail(`ilvl60 ${a.stat} ${a.v} 대역 밖`);
            if (d.scale === 'growth') growthHi[a.stat] = Math.min(growthHi[a.stat] ?? Infinity, a.v);
        }
    }
    for (const stat of Object.keys(growthHi))
        if (growthLo[stat] !== undefined && !(growthHi[stat] > growthLo[stat] * 10)) fail(`${stat} 이 ilvl 로 안 큰다 (${growthLo[stat]} → ${growthHi[stat]})`);
    return `growth ${Object.keys(growthHi).join('/')} · flat 은 ilvl 60 에서도 범위 안`;
});
check('item: 명중·회피 접사는 400개 드롭에 하나도 없다 (08-26 폐지)', () => {
    const rng = makeRng(61);
    let n = 0;
    for (let i = 0; i < 400; i++) {
        for (const a of SYS.item.rollDrop(rng, 12).affixes) {
            if (['accuracy', 'evasion'].includes(a.stat)) fail(`${a.stat} 이 떴다`);
            n++;
        }
    }
    return `${n}개 접사 확인`;
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
/**
 * 구조를 보려고 만든 **이길 수 있는 파티** — 밸런스가 어긋나도 9라운드 구조·정예·보스 계약을 확인할 수 있어야 한다.
 * 현재 수치 대역에서 시작 파티는 1라운드에 전멸한다 (캘리브레이션 표) — 그건 수치 문제이지 구조 계약이 아니다.
 */
const godUnits = (lvl = 50) => units().map(u => ({
    uid: u.uid,
    combat: { ...u.combat, atk_physical: 2000, atk_magic: undefined, attack_type: 'physical', hp_max: 100000, level: lvl },
}));
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
check('battle: 몬스터도 영웅과 같은 체계 — res 는 4원소 객체(직접 %)이고 등급은 res_add 로 %p 가산 (§8-1)', () => {
    const id = 1401, m = D.monsters[id], g = D.grades.elite;
    const e = SYS.battle.makeEnemy('e0', id, 'elite', 7);
    if (typeof e.res !== 'object' || e.res === null) fail('res 가 객체가 아니다');
    for (const el of M.ELEMENT_IDS) if (e.res[el] !== m[`res_${el}`] + g.res_add) fail(`${el} ${e.res[el]} ≠ ${m[`res_${el}`]}+${g.res_add}`);
    if (Math.abs(e.def - m.defense * g.def_mult * B.monster_def_scale) > 1e-9) fail(`def ${e.def}`);
    if (e.hp !== Math.round(m.hp * g.hp_mult * B.monster_hp_scale)) fail(`hp ${e.hp}`);
    if (e.lvl !== 7) fail('lvl 은 스테이지 dlvl');
    // 부분집합 — 영웅과 같은 필드를 갖되 대부분 0 (정예 특성이 붙기 전까지)
    for (const k of ['crit', 'defIgnore', 'resReduction', 'bonusPct', 'resMaxBonus', 'dr', 'ls', 'reflect'])
        if (e[k] !== 0) fail(`${k} = ${e[k]}`);
    if (e.skillMult !== 1) fail('skillMult');
    if ('acc' in e || 'eva' in e || 'variance' in e || 'dmgBonus' in e) fail('옛 필드가 남아 있다');
    const n = SYS.battle.makeEnemy('e0', id, 'normal', 7);
    if (n.res.fire !== m.res_fire) fail('일반 등급은 가산 0');
    return `elite res ${M.ELEMENT_IDS.map(el => e.res[el]).join('/')}`;
});
check('battle: stageElement — 스테이지 원소를 로직이 정한다 (편성 화면 표기 §9-8)', () => {
    if (SYS.battle.stageElement(D.stages[101]) !== 'physical') fail('101');
    if (SYS.battle.stageElement(D.stages[104]) !== 'fire') fail(`104 ${SYS.battle.stageElement(D.stages[104])}`);
    for (const s of D.stageList) {
        const el = SYS.battle.stageElement(s);
        if (el !== 'physical' && !M.ELEMENT_IDS.includes(el)) fail(`${s.stage_id} → ${el}`);
    }
    return `101=physical · 104=${SYS.battle.stageElement(D.stages[104])}`;
});
check('simulate: 결과에 빗나감 집계가 있다 — 레벨 부족의 전용 신호 (§9-8)', () => {
    const r = SYS.battle.simulate(units(), 101, makeRng(5));
    const s = r.strikes;
    if (!s || !(s.party.n >= 1)) fail(`party.n ${s?.party?.n}`);
    if (s.party.miss > s.party.n || s.enemy.miss > s.enemy.n) fail('miss > n');
    const dodges = r.timeline.filter(ev => ev.e === 'dodge').length;
    if (dodges !== s.party.miss + s.enemy.miss) fail(`타임라인 ${dodges} ≠ 집계 ${s.party.miss + s.enemy.miss}`);
    return `party ${s.party.miss}/${s.party.n} · enemy ${s.enemy.miss}/${s.enemy.n}`;
});
check('#1 회귀: 도감 피해 보정이 실제 타격에 곱해진다 — dmgBonus/bonusPct 필드명 통일', () => {
    const mk = bonus => G.party.map(uid => ({ uid, combat: { ...SYS.game.heroCombat(G, SYS.game.heroById(G, uid)), dmg_bonus_pct: bonus } }));
    const firstHit = r => r.timeline.find(ev => ev.e === 'hit' && ev.a.startsWith('p'));
    const a = firstHit(SYS.battle.simulate(mk(0), 101, makeRng(5)));
    const b = firstHit(SYS.battle.simulate(mk(100), 101, makeRng(5)));
    if (!a || !b) fail('파티 타격이 없다');
    if (!(b.dmg > a.dmg)) fail(`보정이 안 걸린다 ${a.dmg} → ${b.dmg}`);
    return `dmg ${a.dmg} → ${b.dmg} (+100%)`;
});
check('simulate: 정예 라운드에 죄종·특성이 붙고 9라운드 구조가 끝까지 돈다', () => {
    // 라운드 구조는 밸런스와 무관한 계약이라 **이길 수 있는 파티**로 본다 —
    // 시작 파티는 현재 수치 대역에서 1라운드에 전멸해 정예(3라운드)에 닿지 못한다 (캘리브레이션 표 참조)
    const r = SYS.battle.simulate(godUnits(), 101, makeRng(5));
    if (!r.won) fail(`god party 도 못 이긴다 (${r.reason})`);
    if (r.roundsCleared !== B.rounds_per_stage) fail(`rounds ${r.roundsCleared}`);
    const el = r.timeline.filter(ev => ev.e === 'round' && ev.kind === 'elite').flatMap(ev => ev.enemies).find(e => e.grade === 'elite');
    if (!el) fail('elite round not reached');
    if (!el.sin || el.traits?.length !== 3) fail(`정예 ${JSON.stringify(el.sin)} / ${el.traits?.length}`);
    const boss = r.timeline.find(ev => ev.e === 'round' && ev.kind === 'boss');
    if (!boss || !boss.enemies.some(e => e.grade === D.stages[101].boss_grade)) fail('보스 라운드');
    return `${el.sin} + 특성 ${el.traits.length} · 보스 ${boss.enemies.length}유닛`;
});
check('simulate: 오버레벨이면 빗나감이 사라진다 — 적정 레벨의 분산은 0 (§9-4)', () => {
    const r = SYS.battle.simulate(godUnits(), 101, makeRng(5));
    if (r.strikes.party.miss !== 0) fail(`레벨 50 파티가 dlvl ${D.stages[101].dlvl} 에서 빗나갔다 (${r.strikes.party.miss})`);
    const under = SYS.battle.simulate(godUnits(1), 401, makeRng(5));
    if (!(under.strikes.party.miss > 0)) fail(`레벨 1 파티가 dlvl ${D.stages[401].dlvl} 에서 하나도 안 빗나갔다`);
    return `Lv50@dlvl2 = 0회 · Lv1@dlvl${D.stages[401].dlvl} = ${under.strikes.party.miss}회`;
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
    if (!rp.strikes || !(rp.strikes.party.n >= 1) || !eq(rp.strikes, r.result.strikes)) fail('리포트에 빗나감 집계가 없다 (§9-8)');
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

// 리더 = party[0] = **제일 먼저 넣은 영웅**. 화면이 그 자리에 리더 표시를 붙이므로(SCREEN_DESIGN §4-1)
// 넣고 빼는 순서가 곧 리더 결정이다 — 로스터 순서로 다시 줄 세우면 안 된다 (2026-08-28)
check('toggleParty: 파티 순서 = 넣은 순서 · party[0] 이 리더', () => {
    const G2 = SYS.game.newGame(42, cands, NOW);
    const [a, b, c] = G2.heroes.map(h => h.uid);
    for (const u of [...G2.party]) SYS.game.toggleParty(G2, u, NOW);       // 비운다
    if (G2.party.length !== 0) fail('clear');
    for (const u of [c, a, b]) SYS.game.toggleParty(G2, u, NOW);           // 로스터 순서와 일부러 다르게 넣는다
    if (!eq(G2.party, [c, a, b])) fail(`order ${G2.party.join(',')}`);
    SYS.game.toggleParty(G2, c, NOW);                                      // 리더를 빼면 다음 사람이 리더가 된다
    if (G2.party[0] !== a) fail(`leader after remove ${G2.party[0]}`);
    SYS.game.toggleParty(G2, c, NOW);                                      // 다시 넣으면 맨 뒤
    return eq(G2.party, [a, b, c]) || fail(`re-add ${G2.party.join(',')}`);
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
