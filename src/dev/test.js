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
import { loadData, buildSystems, D, FILES } from '../ui/data.js';
import { makeRng, deriveSeed } from '../game_logic/rng.js';
import { parseCsv } from '../game_logic/csv.js';
import { createFormula } from '../game_logic/formula.js';
import { createSkillSystem } from '../game_logic/skill.js';
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
check('csv: monster 112 / stage 28 / weapon_group 11 / codex_level 4 / chapter 7 / codex_series 4 / hero_attribute 7 / combat_stat 25', () =>
    Object.keys(D.monsters).length === 112 && D.stageList.length === 28 && D.weaponGroupList.length === 11
    && D.codexLevels.length === 4 && D.chapterList.length === 7 && Object.keys(D.codexSeries).length === 4
    && D.heroAttributes.length === 7 && D.combatStats.length === 25);
// 08-27 판 기본 액티브 — 본편 5직업 × 3, 전사 ③ 만 기획 미정이라 14 (skill_design §9-2 · §7)
check('csv: skill 14행 — 직업 기본 액티브(전사 ③ 미정)', () => D.skillRows.length === 14 || fail(`${D.skillRows.length}행`));

/* ── CSV 무결성 (2026-08-28 형태 최적화) — 코드가 안 읽는 구조 키를 「CSV 끼리 정합한가」로 살린다 ── */

check('csv: balance — status ∈ fixed|proposed · knob ∈ 0|1 · description 이 비어 있지 않다', () => {
    let fixed = 0, knob = 0;
    for (const r of D.balanceRows) {
        if (!['fixed', 'proposed'].includes(r.status)) fail(`${r.key} status=${r.status}`);
        if (![0, 1].includes(r.knob)) fail(`${r.key} knob=${r.knob}`);
        if (!r.description_kr || String(r.description_kr).trim() === '') fail(`${r.key} description 없음`);
        if (r.status === 'fixed') fixed++;
        if (r.knob === 1) knob++;
    }
    return `${D.balanceRows.length}키 · fixed ${fixed} · knob ${knob}`;
});
check('csv: stages_per_chapter 가 챕터별 stage 행 수와 같고 stage_num 이 1..N (구조 키를 데이터가 지킨다)', () => {
    const per = D.balance.stages_per_chapter;
    for (const c of D.chapterList) {
        const rows = D.stageList.filter(s => s.chapter === c.id).sort((a, b) => a.stage_num - b.stage_num);
        if (rows.length !== per) fail(`ch${c.id} ${rows.length} ≠ ${per}`);
        rows.forEach((r, i) => { if (r.stage_num !== i + 1) fail(`ch${c.id} stage_num ${r.stage_num}`); });
    }
    return `${D.chapterList.length}챕터 × ${per}`;
});
check('csv: attr_equip_bonus = 0 이고 접사 어느 것도 기본 능력치를 주지 않는다 (hero_design §4-2)', () => {
    if (D.balance.attr_equip_bonus !== 0) fail(`attr_equip_bonus=${D.balance.attr_equip_bonus}`);
    const attrIds = D.heroAttributes.map(a => a.id);
    for (const d of M.AFFIX_DEFS) if (attrIds.includes(d.stat)) fail(`접사가 기본 능력치를 준다: ${d.stat}`);
    return `접사 ${M.AFFIX_DEFS.length}종 확인`;
});
check('csv: stage ↔ monster 정합 — 보스 행 존재·등급·타입 일치 · 일반몹 타입 일치 · dlvl 단조 · 고아 몬스터 없음', () => {
    const seen = new Set();
    let prev = 0;
    for (const st of D.stageList) {
        const boss = D.monsters[st.boss_monster_idx];
        if (!boss) fail(`${st.stage_id} boss_monster_idx ${st.boss_monster_idx} 없음`);
        if (boss.spawn_grade !== st.boss_grade) fail(`${st.stage_id} boss grade ${boss.spawn_grade} ≠ ${st.boss_grade}`);
        if (boss.monster_type !== st.monster_type) fail(`${st.stage_id} boss type ${boss.monster_type} ≠ ${st.monster_type}`);
        const pool = SYS.battle.stagePool(st);
        if (pool.length !== 3) fail(`${st.stage_id} 일반몹 ${pool.length}`);
        for (const id of pool) if (D.monsters[id].monster_type !== st.monster_type) fail(`${id} type ${D.monsters[id].monster_type}`);
        if (!(st.dlvl > prev)) fail(`dlvl 단조 아님 ${st.stage_id} ${prev}→${st.dlvl}`);
        prev = st.dlvl;
        [...pool, st.boss_monster_idx].forEach(id => seen.add(id));
    }
    const orphan = Object.keys(D.monsters).map(Number).filter(id => !seen.has(id));
    if (orphan.length) fail(`어느 스테이지에도 안 속한 몬스터: ${orphan.join(',')}`);
    return `28스테이지 · 몬스터 ${seen.size} 전원 소속`;
});
check('csv: 보스 raw = 그 스테이지 일반몹 평균 (등급 elevation 은 spawn_grade 배율 하나뿐 — monster_design §5)', () => {
    let worst = 1;
    for (const st of D.stageList) {
        const pool = SYS.battle.stagePool(st).map(id => D.monsters[id]);
        const boss = D.monsters[st.boss_monster_idx];
        const avg = k => pool.reduce((a, m) => a + m[k], 0) / pool.length;
        for (const k of ['hp', 'attack']) {
            const r = boss[k] / avg(k);
            if (!(r >= 0.8 && r <= 1.25)) fail(`${st.stage_id} ${k} 비율 ${r.toFixed(2)} (보스 ${boss[k]} / 평균 ${avg(k).toFixed(1)})`);
            worst = Math.max(worst, r, 1 / r);
        }
    }
    return `최대 이탈 ×${worst.toFixed(3)}`;
});
check('csv: spawn_grade 7축이 normal < elite < stage_boss < chapter_boss 로 단조 (부채 #17)', () => {
    const order = ['normal', 'elite', 'stage_boss', 'chapter_boss'];
    const axes = ['hp_mult', 'atk_mult', 'def_mult', 'res_add', 'exp_mult', 'gold_mult', 'drop_chance_mult'];
    for (const a of axes) {
        const v = order.map(g => D.grades[g][a]);
        for (let i = 1; i < v.length; i++) if (!(v[i] > v[i - 1])) fail(`${a} 역행 ${v.join(' < ')}`);
    }
    return axes.map(a => `${a} ${order.map(g => D.grades[g][a]).join('/')}`).join(' · ');
});
check('csv: combat_stat impl=1 집합 == computeCombat 출력 키 집합 (부채 #12 — 사본이 아니라 대조)', () => {
    const h = SYS.hero.rollHero(makeRng(7), { sin: 'wrath', cls: 'warrior', name: { ko: 'x', en: 'x' }, trait: { ko: 't', en: 't' } });
    const c = SYS.hero.computeCombat(h, []);
    // 전투 능력치가 아닌 출력 — 파생 합·도감 보정·적중 레벨·공격 타입 (INTERFACE §2-4)
    const EXCLUDE = ['atk_pct_sum', 'dmg_bonus_pct', 'level', 'attack_type'];
    const got = new Set(Object.keys(c).filter(k => !EXCLUDE.includes(k)));
    got.add('atk_physical'); got.add('atk_magic');          // 둘은 배타 (INTERFACE §8 항목 5)
    const impl = new Set(D.combatStats.filter(s => s.impl === 1).map(s => s.id));
    const missing = [...impl].filter(k => !got.has(k));
    const extra = [...got].filter(k => !impl.has(k));
    if (missing.length) fail(`impl=1 인데 안 나온다: ${missing.join(',')}`);
    if (extra.length) fail(`나오는데 impl=0/없음: ${extra.join(',')}`);
    return `impl=1 ${impl.size} · impl=0 ${D.combatStats.length - impl.size}`;
});
check('csv: hero_attribute 7행 · 순서 str agi int vit luck ldr cha · combat_stat 값이 실재한다', () => {
    const want = ['str', 'agi', 'int', 'vit', 'luck', 'ldr', 'cha'];
    const ids = D.heroAttributes.map(a => a.id);
    if (!eq(ids, want)) fail(ids.join('/'));
    const statIds = D.combatStats.map(s => s.id);
    for (const a of D.heroAttributes) {
        if (a.combatStat === '-') continue;
        for (const k of String(a.combatStat).split('|'))
            if (!statIds.includes(k)) fail(`${a.id} combat_stat '${k}' 가 combat_stat.csv 에 없다`);
        if (!a.en || !a.abbr) fail(`${a.id} en/abbr 없음`);
    }
    return ids.join('/');
});
check('csv: monster_name_en 전부 있음 · attack_type ∈ physical+원소4 · weapon_group damage_kind ∈ physical|magic', () => {
    const types = ['physical', ...M.ELEMENT_IDS];
    for (const m of Object.values(D.monsters)) {
        if (!m.monster_name_en || String(m.monster_name_en).trim() === '') fail(`${m.monster_idx} monster_name_en 없음`);
        if (!types.includes(m.attack_type)) fail(`${m.monster_idx} attack_type ${m.attack_type}`);
        if (![0, 1].includes(m.face)) fail(`${m.monster_idx} face ${m.face}`);
    }
    for (const g of D.weaponGroupList) {
        if (!['physical', 'magic'].includes(g.damageKind)) fail(`${g.id} damage_kind ${g.damageKind}`);
        if (!['main', 'expansion'].includes(g.release)) fail(`${g.id} release ${g.release}`);
    }
    const faces = Object.values(D.monsters).filter(m => m.face === 1).length;
    return `112종 · 얼굴 ${faces}`;
});
check('csv: 액티브 단일 대상 공격의 DPS 기여가 skill_dps_budget_pct 대역 안 (skill_design §9-1)', () => {
    const budget = D.balance.skill_dps_budget_pct / 100;
    const rows = SYS.skill.list.filter(d => d.kind === 'attack' && ['enemy_single', 'enemy_rotate'].includes(d.target));
    const seenList = [];
    for (const d of rows) {
        const share = (d.mult / 100 * d.hits - 1) / Math.ceil(d.cool / 1.5);
        const r = share / budget;
        if (!(r >= 0.5 && r <= 1.6)) fail(`${d.id} 기여 ${share.toFixed(3)} = 예산의 ×${r.toFixed(2)}`);
        seenList.push(`${d.id} ×${r.toFixed(2)}`);
    }
    return `${rows.length}행 · ${seenList.join(' · ')}`;
});
check('csv: chapter 7행 · stage.chapter 가 전부 실재 · codex_series 4행이 codexBonus 누적 키와 같다', () => {
    const ids = D.chapterList.map(c => c.id);
    if (!eq(ids, [1, 2, 3, 4, 5, 6, 7])) fail(ids.join('/'));
    for (const c of D.chapterList) if (!M.SINS[c.sin]) fail(`ch${c.id} sin '${c.sin}' 가 죄종이 아니다`);
    for (const st of D.stageList) if (!D.chapters[st.chapter]) fail(`${st.stage_id} chapter ${st.chapter} 없음`);
    const nums = Object.keys(D.codexSeries).map(Number).sort();
    if (!eq(nums, [1, 2, 3, 4])) fail(`codex_series stage_num ${nums.join('/')}`);
    const G0 = SYS.game.newGame(1, SYS.hero.rollCandidates(makeRng(1), B.party_size_max), NOW);
    const keys = Object.keys(SYS.game.codexBonus(G0)).sort();
    const want = [...new Set(Object.values(D.codexSeries))].sort();
    if (!eq(keys, want)) fail(`codexBonus 키 ${keys.join('/')} ≠ codex_series ${want.join('/')}`);
    return `7챕터 · 계열 ${want.join('/')}`;
});
// 디렉터리 목록은 비동기라 check() 밖에서 미리 읽는다 (check 는 동기 — Promise 를 돌려주면 무조건 통과가 된다)
const dataDirHtml = await fetch('../data/').then(r => (r.ok ? r.text() : null)).catch(() => null);
check('csv: 로더가 읽는 목록 = src/data/*.csv 전부 — 읽히지 않는 SSOT 를 두지 않는다', () => {
    const html = dataDirHtml;
    if (html === null) return `디렉터리 목록을 못 읽었다 — 로더 ${FILES.length}개만 확인`;
    const onDisk = [...html.matchAll(/href="([^"/]+)\.csv"/g)].map(m => m[1]).sort();
    if (onDisk.length === 0) return `디렉터리 목록에 csv 가 없다 — 로더 ${FILES.length}개만 확인`;
    const loaded = FILES.slice().sort();
    const unread = onDisk.filter(f => !loaded.includes(f));
    const ghost = loaded.filter(f => !onDisk.includes(f));
    if (unread.length) fail(`코드가 안 읽는 CSV: ${unread.join(', ')}`);
    if (ghost.length) fail(`로더 목록에만 있는 CSV: ${ghost.join(', ')}`);
    return `${loaded.length}개 일치`;
});
check('balance: 시스템이 쓰는 키가 전부 있다', () => {
    const need = ['party_size_max', 'roster_cap', 'rounds_per_stage', 'wave_monster_max', 'hero_attr_min', 'hero_attr_max', 'hero_attr_total',
        'hero_hp_base', 'attr_bonus_per_point', 'hero_xp_base', 'hero_xp_exp', 'power_growth_per_level', 'attr_growth_chance_pct', 'xp_rate',
        'unarmed_atk', 'unarmed_period', 'weapon_atk_base', 'two_hand_atk_mult', 'armor_def_base', 'armor_def_per_ilvl', 'armor_def_variance_pct',
        'base_crit_pct', 'base_crit_damage_pct', 'dmg_variance_pct', 'monster_hp_scale', 'monster_atk_scale', 'monster_def_scale', 'battle_timeout_sec',
        'def_curve_k', 'dmg_min', 'crit_cap_pct', 'res_cap_base', 'res_cap_absolute',
        'hit_base_pct', 'hit_per_level_deficit_pct', 'hit_min_pct',
        'gold_rate', 'drop_chance_pct', 'boss_guaranteed_drop', 'drop_ilvl_spread', 'dust_elite', 'dust_boss', 'rarity_w_magic', 'rarity_w_rare',
        'affix_magic_min', 'affix_magic_max', 'affix_rare_min', 'affix_rare_max', 'suffix_sin_chance_pct', 'salvage_dust_magic', 'salvage_dust_rare',
        'inventory_cap', 'injury_minutes', 'tavern_candidates', 'tavern_hire_cost', 'tavern_reroll_cost', 'tavern_refresh_hours', 'start_gold', 'start_dust', 'start_stigma',
        'hero_level_cap', 'concurrent_expedition_parties', 'active_slots',
        'codex_card_drop_pct', 'mastery_point_per_level', 'mastery_t1_max_rank', 'mastery_t2_unlock_level'];
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
    if (WG.staff.damageKind !== 'magic' || WG.wand.damageKind !== 'magic' || WG.axe.damageKind !== 'physical') fail('damageKind');
    if (!WG.bow.twoHanded || !WG.crossbow.twoHanded || WG.wand.twoHanded || WG.mace.twoHanded) fail('hands');
    for (const cls of ['warrior', 'knight', 'mage', 'priest']) {
        const gs = D.weaponGroupList.filter(g => g.classes.includes(cls));
        if (!gs.some(g => g.twoHanded) || !gs.some(g => !g.twoHanded)) fail(`${cls} 한손↔양손 선택 없음`);
    }
    return true;
});
check('combat_stat.csv: 25행 · 폐지 축 없음 · 저항은 pct · 유틸은 운 계수 (08-26 재설계)', () => {
    const ids = D.combatStats.map(s => s.id);
    const gone = ['status_chance', 'magic_defense', 'cc_reduction', 'heal_power', 'party_bonus', 'skill_level', 'dispatch_speed',
        'accuracy', 'evasion'].filter(id => ids.includes(id));
    if (gone.length) fail(`still: ${gone}`);
    const need = ['res_lightning', 'res_fire', 'res_cold', 'res_poison', 'res_max_bonus', 'res_reduction', 'vs_status_damage'].filter(id => !ids.includes(id));
    if (need.length) fail(`missing: ${need}`);
    const fhr = D.combatStats.find(s => s.id === 'fhr');
    if (!fhr || fhr.ko.includes('타격')) fail('fhr 라벨 = 상태이상 회복 속도 (08-25)');
    // 저항은 소재값이 아니라 직접 % (§9-5) · 유틸은 운 계수 (hero_design §4-1)
    for (const id of ['res_fire', 'res_cold', 'res_lightning', 'res_poison', 'res_max_bonus'])
        if (D.combatStats.find(s => s.id === id).fmt !== 'pct') fail(`${id} fmt`);
    for (const id of ['item_find', 'gold_find'])
        if (D.combatStats.find(s => s.id === id).attr !== 'luck') fail(`${id} attr`);
    if (ids.length !== 25) fail(`${ids.length}`);
    return true;
});
check('hero_attribute.csv: 감각 → 운 (2026-08-26 재정의) · 자리 유지 · 궁수 keyAttr 이 따라간다', () => {
    const ids = D.heroAttributes.map(s => s.id);
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
check('save: serialize → deserialize 왕복 동일 (v5)', () => {
    const s = SYS.game.serialize(G, NOW);
    const back = SYS.game.deserialize(JSON.parse(JSON.stringify(s)));
    return eq(SYS.game.serialize(back, NOW), s) && s.version === SAVE_VERSION && SAVE_VERSION === 5;
});
check('save: v2 → v5 연쇄 이관 — 감각→운·명중/회피 폐지(v3) · 마스터리 자리(v4) · 선술집 쿨다운(v5)까지 한 번에 올라간다', () => {
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
    if (up.version !== SAVE_VERSION) fail(`version ${up.version}`);
    for (const h of up.heroes) if (!h.mastery || h.masteryPoints === undefined) fail('v4 자리가 안 생겼다');
    if (!up.tavern) fail('v5 자리가 안 생겼다');
    up.heroes.forEach((h, i) => {
        if ('sen' in h.stats || 'sen' in h.caps) fail('sen 키가 남았다');
        if (h.stats.luck !== senValues[i]) fail(`값이 바뀌었다 ${h.stats.luck} ≠ ${senValues[i]}`);
        if (typeof h.caps.luck !== 'number') fail('caps 미이관');
        if (Object.keys(h.stats).length !== D.heroAttributes.length) fail('키 수가 달라졌다');
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
check('save: canLoad 가 deserialize 와 같은 답을 낸다 — 화면이 이관 가능한 세이브를 거부하면 안 된다 (부채 #24)', () => {
    const cur = SYS.game.serialize(G, NOW);
    // 이관 가능한 옛 버전은 열려야 한다 — 버전 숫자만 낮춘 세이브로 확인한다
    for (const v of [2, 3, 4, SAVE_VERSION]) {
        const s = JSON.parse(JSON.stringify(cur)); s.version = v;
        if (!SYS.game.canLoad(s)) fail(`v${v} 를 못 연다 — deserialize 는 여는데 canLoad 가 막는다`);
    }
    for (const v of [1, 99]) if (SYS.game.canLoad({ version: v, heroes: [] })) fail(`v${v} 를 연다고 답했다`);
    if (SYS.game.canLoad(null) || SYS.game.canLoad('x')) fail('객체가 아닌 것을 연다고 답했다');
    return `v2·v3·v4·v${SAVE_VERSION} 열림 · v1·v99 거부`;
});
check('save: 크기 < 64KB (빈 게임)', () => { const n = JSON.stringify(SYS.game.serialize(G, NOW)).length; return n < 65536 ? `${n} bytes` : fail(`${n} bytes`); });

/* ── 성장 ── */
check('xp: 필요량 단조 증가', () => { for (let l = 1; l < 30; l++) if (SYS.hero.xpNeeded(l + 1) <= SYS.hero.xpNeeded(l)) return false; return true; });
check('xp: 레벨 상한 hero_level_cap 에서 멈추고 XP 를 더 쌓지 않는다 (GAME_DESIGN §9 08-26 · R12)', () => {
    const h = JSON.parse(JSON.stringify(G.heroes[0]));
    SYS.hero.grantXp(h, 1e12, makeRng(3));
    if (h.level !== B.hero_level_cap) fail(`Lv ${h.level} ≠ ${B.hero_level_cap}`);
    if (h.xp !== 0) fail(`상한에서 xp ${h.xp} 가 남았다`);
    // 상한에 닿은 뒤의 지급은 아무 일도 하지 않는다 — 레벨업 결과도 null
    if (SYS.hero.grantXp(h, 1e9, makeRng(4)) !== null || h.xp !== 0) fail('상한 뒤에도 XP 가 쌓인다');
    return `Lv ${B.hero_level_cap} 에서 정지`;
});
check('xp: 레벨업 시 능력치는 상한까지만', () => {
    const h = JSON.parse(JSON.stringify(G.heroes[0]));
    const lu = SYS.hero.grantXp(h, 100000, makeRng(3));
    for (const [id, v] of Object.entries(h.stats)) if (v > h.caps[id]) fail(`${id} ${v} > cap ${h.caps[id]}`);
    return lu && lu.to > lu.from && h.level > 5 ? `Lv ${lu.from}→${lu.to}` : fail('no levelup');
});

/* ── 마스터리 (skill_design §3-1~§3-4 확정 2026-08-28) ── */
check('csv: mastery_node 22행 — 죄종 T1 공통 3 + T2 확정 16 + 전사 T1 3. T3(반응형)는 아직 없다', () => {
    if (D.masteryNodes.length !== 22) fail(`${D.masteryNodes.length}행`);
    const by = {};
    for (const n of D.masteryNodes) { const k = `${n.tree_kind}${n.tier}`; by[k] = (by[k] ?? 0) + 1; }
    if (by.sin1 !== 3 || by.sin2 !== 16 || by.class1 !== 3) fail(JSON.stringify(by));
    // T3 는 전투 중 사건에 붙는 반응형이라 hero.js 가 아니라 battle.js 의 몫 — 값도 전부 미정이다
    if (D.masteryNodes.some(n => n.tier === 3)) fail('T3 가 CSV 에 들어왔다 — 구현 없이 두면 읽히지 않는 SSOT 가 된다');
    return `죄종 T1 ${by.sin1} · 죄종 T2 ${by.sin2} · 직업 T1 ${by.class1}`;
});
check('mastery_node: 참조하는 balance 키가 전부 실재하고 stat 이 실재하는 채널이다 — 새 채널을 만들지 않는다', () => {
    const affix = new Set(M.AFFIX_DEFS.map(d => d.stat));
    const stats = new Set(D.combatStats.map(x => x.id));
    const sins = new Set(Object.keys(M.SINS));
    const classes = new Set(M.CLASSES.map(c => c.id));
    for (const n of D.masteryNodes) {
        for (const k of ['value_key', 'max_rank_key'])
            if (typeof B[n[k]] !== 'number') fail(`${n.node_id} ${k}='${n[k]}' 가 balance.csv 에 없다`);
        if (n.unlock_key !== '-' && typeof B[n.unlock_key] !== 'number') fail(`${n.node_id} unlock_key='${n.unlock_key}'`);
        if (!affix.has(n.stat) && !stats.has(n.stat)) fail(`${n.node_id} stat '${n.stat}' 은 접사 채널도 전투 능력치도 아니다`);
        if (n.owner_id !== '*' && !(n.tree_kind === 'sin' ? sins : classes).has(n.owner_id)) fail(`${n.node_id} owner '${n.owner_id}'`);
    }
    return `키 ${new Set(D.masteryNodes.map(n => n.value_key)).size}종 · 채널 ${new Set(D.masteryNodes.map(n => n.stat)).size}종`;
});
check('mastery: 랭크 0 이면 전투 능력치가 그대로다 — 도입이 기존 결과를 안 건드린다 (회귀)', () => {
    const h = G.heroes[0];
    const items = SYS.game.heroItems(G, h);
    const empty = SYS.hero.computeCombat({ ...h, mastery: {} }, items);
    const absent = SYS.hero.computeCombat({ ...h, mastery: undefined }, items);
    if (!eq(empty, absent)) fail('mastery 없음 ≠ 빈 객체');
    if (empty.hp_regen !== 0 || empty.cooldown_reduction !== 0) fail(`재생 ${empty.hp_regen} · 쿨감소 ${empty.cooldown_reduction}`);
    return '재생·쿨감소 출처가 마스터리뿐이라 기본값 0';
});
check('mastery: 랭크를 찍으면 그 채널이 오른다 — T1 공통 3종은 죄종을 안 가린다', () => {
    const r = B.mastery_t1_max_rank;
    let moved = 0;
    for (const sin of Object.keys(M.SINS)) {
        const h = { ...G.heroes[0], sin, mastery: {} };
        const base = SYS.hero.computeCombat(h, []);
        const up = SYS.hero.computeCombat({ ...h, mastery: { sin_t1_hp: r, sin_t1_atkspeed: r, sin_t1_damage: r } }, []);
        if (!(up.hp_max > base.hp_max)) fail(`${sin} hp ${base.hp_max} → ${up.hp_max}`);
        if (!(up.action_period < base.action_period)) fail(`${sin} 주기 ${base.action_period} → ${up.action_period}`);
        if (!(up.atk_pct_sum > base.atk_pct_sum)) fail(`${sin} 상시% ${base.atk_pct_sum} → ${up.atk_pct_sum}`);
        moved += 1;
    }
    return `${moved} 죄종 전부 동일하게 반응`;
});
check('mastery: 남의 트리 노드는 안 붙는다 — 죄종·직업이 다르면 무시한다', () => {
    const h = { ...G.heroes[0], sin: 'wrath', cls: 'mage' };
    const dirty = SYS.hero.computeCombat({ ...h, mastery: { sin_pride_t2_dr: 5, cls_warrior_t1_hp: 5 } }, []);
    const clean = SYS.hero.computeCombat({ ...h, mastery: {} }, []);
    return eq(dirty, clean) ? '오만 T2 · 전사 T1 둘 다 무시' : fail('다른 죄종·직업 노드가 적용됐다');
});
check('mastery: 피해 감소는 원천별 곱이다 — 접사와 합치지 않는다 (battle_design §9-3)', () => {
    const r = B.mastery_t1_max_rank;
    const h = { ...G.heroes[0], sin: 'pride', mastery: { sin_pride_t2_dr: r } };
    const per = B.mastery_pride_t2_dr_pct * r;
    const only = SYS.hero.computeCombat(h, []);
    const want = Number((100 * (1 - (1 - per / 100))).toFixed(3));
    if (Math.abs(only.damage_reduction - want) > 1e-6) fail(`단독 ${only.damage_reduction} ≠ ${want}`);
    const both = SYS.hero.computeCombat(h, [mkItem('armor', [{ stat: 'damage_reduction', v: 10 }])]);
    const wantBoth = Number((100 * (1 - (1 - per / 100) * (1 - 0.1))).toFixed(3));
    if (Math.abs(both.damage_reduction - wantBoth) > 1e-6) fail(`합류 ${both.damage_reduction} ≠ ${wantBoth} (덧셈이면 ${(per + 10).toFixed(3)})`);
    return `마스터리 ${only.damage_reduction}% · 접사 합류 ${both.damage_reduction}%`;
});
check('mastery: 포인트 — 레벨업마다 지급 · 찍으면 1점 소비 · 롤백은 전액 환급 (skill_design §5)', () => {
    const G2 = SYS.game.newGame(7, cands, NOW);
    const h = G2.heroes[0];
    if (h.masteryPoints !== 0) fail(`시작 포인트 ${h.masteryPoints}`);
    const lu = SYS.hero.grantXp(h, 100000, makeRng(3));
    const gained = (lu.to - lu.from) * B.mastery_point_per_level;
    if (h.masteryPoints !== gained) fail(`지급 ${h.masteryPoints} ≠ ${gained}`);
    if (lu.points !== gained) fail(`보고 ${lu.points} ≠ ${gained}`);
    const r = SYS.game.learnMastery(G2, h.uid, 'sin_t1_hp');
    if (!r.ok) fail(r.err);
    if (h.mastery.sin_t1_hp !== 1 || h.masteryPoints !== gained - 1) fail('소비가 안 맞는다');
    const back = SYS.game.resetMastery(G2, h.uid);
    if (!back.ok || back.refunded !== 1 || h.masteryPoints !== gained) fail(JSON.stringify(back));
    if (Object.keys(h.mastery).length !== 0) fail('롤백 뒤에도 랭크가 남았다');
    return `Lv ${lu.from}→${lu.to} · +${gained}p · 롤백 전액 환급`;
});
check('mastery: 거절 사유 — 해금 전 locked · 상한 maxRank · 포인트 없음 points · 남의 노드 missing', () => {
    const G2 = SYS.game.newGame(8, cands, NOW);
    const h = G2.heroes.find(x => x.cls !== 'warrior') ?? G2.heroes[0];
    h.masteryPoints = 99;
    if (h.level >= B.mastery_t2_unlock_level) fail('레벨 1 전제가 깨졌다');
    const t2 = D.masteryNodes.find(n => n.tier === 2 && n.owner_id === h.sin);
    if (!t2) fail(`${h.sin} 의 T2 노드가 없다`);
    if (SYS.game.learnMastery(G2, h.uid, t2.node_id).err !== 'locked') fail('locked 아님');
    if (h.cls !== 'warrior' && SYS.game.learnMastery(G2, h.uid, 'cls_warrior_t1_hp').err !== 'missing') fail('남의 직업 노드가 통과했다');
    for (let i = 0; i < B.mastery_t1_max_rank; i++) if (!SYS.game.learnMastery(G2, h.uid, 'sin_t1_hp').ok) fail(`랭크 ${i + 1} 실패`);
    if (SYS.game.learnMastery(G2, h.uid, 'sin_t1_hp').err !== 'maxRank') fail('maxRank 아님');
    h.masteryPoints = 0;
    if (SYS.game.learnMastery(G2, h.uid, 'sin_t1_damage').err !== 'points') fail('points 아님');
    return '네 사유 전부 코드로 나온다';
});
check('masteryState: 판정을 한 번에 낸다 — 랭크·상한·해금·찍을 수 있는가 (렌더러로 새지 않는다)', () => {
    const G2 = SYS.game.newGame(9, cands, NOW);
    const h = G2.heroes[0];
    const ms = SYS.game.masteryState(G2, h.uid);
    if (ms.points !== h.masteryPoints) fail('points 불일치');
    const t1 = ms.nodes.filter(n => n.tier === 1), t2 = ms.nodes.filter(n => n.tier === 2);
    if (t1.some(n => !n.unlocked)) fail('T1 이 잠겨 있다');
    if (t2.some(n => n.unlocked)) fail(`레벨 ${h.level} 인데 T2 가 열려 있다`);
    if (ms.nodes.some(n => n.canLearn)) fail('포인트 0 인데 찍을 수 있다');
    if (SYS.game.masteryState(G2, 'h999') !== null) fail('없는 영웅에 null 을 안 낸다');
    return `${h.cls}/${h.sin} → 노드 ${ms.nodes.length} (T1 ${t1.length} · T2 ${t2.length})`;
});
check('save: v3 → v5 이관 — 마스터리 자리 신설 + 안 받고 지나간 포인트 소급 (INTERFACE §4)', () => {
    const v3 = JSON.parse(JSON.stringify(SYS.game.serialize(G, NOW)));
    v3.version = 3;
    for (const h of v3.heroes) { delete h.mastery; delete h.masteryPoints; h.level = 5; }
    const up = SYS.game.deserialize(v3);
    if (up.version !== SAVE_VERSION) fail(`version ${up.version}`);
    const want = 4 * B.mastery_point_per_level;
    for (const h of up.heroes) {
        if (!h.mastery || Object.keys(h.mastery).length !== 0) fail('mastery 자리가 비어 있지 않다');
        if (h.masteryPoints !== want) fail(`포인트 ${h.masteryPoints} ≠ ${want}`);
    }
    return `${up.heroes.length}명 · Lv5 → ${want}p 소급`;
});

check('save: v4 → v5 이관 — 선술집 쿨다운 자리 신설 (열려 있는 상태로 올린다, INTERFACE §4)', () => {
    const v4 = JSON.parse(JSON.stringify(SYS.game.serialize(G, NOW)));
    v4.version = 4;
    delete v4.tavern;
    const up = SYS.game.deserialize(v4);
    if (up.version !== 5) fail(`version ${up.version}`);
    if (!up.tavern || up.tavern.rerolledAt !== null || up.tavern.hired.length !== 0) fail('tavern 자리가 열린 상태로 안 올라왔다');
    return SYS.game.tavernState(up, NOW).free ? '무료 리롤이 열린 채로 이관' : fail('이관 직후가 쿨다운 중이다');
});

/* ── 스킬 태그 (skill_design §11 확정 2026-08-28) ── */
check('skill: 태그 13종 — 정의 10(최대 2) + 파생 3(target·hits 에서). CSV 값이 전부 어휘 안이다', () => {
    const S = SYS.skill;
    if (S.TAGS.length !== 10 || S.DERIVED_TAGS.length !== 3) fail(`정의 ${S.TAGS.length} · 파생 ${S.DERIVED_TAGS.length}`);
    for (const d of S.list) {
        if (d.tags.length > S.MAX_TAGS) fail(`${d.id} tags ${d.tags.length}개`);
        for (const tg of d.tags) if (!S.TAGS.includes(tg)) fail(`${d.id} '${tg}'`);
        const want = [];
        if (d.target === 'enemy_all' || d.target === 'enemy_chain') want.push('aoe');
        if (d.target === 'enemy_single') want.push('single');
        if (d.hits > 1) want.push('multihit');
        if (!eq(d.derived, want)) fail(`${d.id} 파생 [${d.derived}] ≠ [${want}]`);
    }
    const rot = S.defs.kni_rush;                       // enemy_rotate — 타수만큼만 닿는다 (§11-2 규칙 3)
    if (S.tagsOf(rot).some(x => x === 'aoe' || x === 'single')) fail('enemy_rotate 가 광역/단일로 셌다');
    const tagged = S.list.filter(d => d.tags.length).length;
    return `태그 붙은 스킬 ${tagged}/${S.list.length} · 다단히트 ${S.list.filter(d => d.derived.includes('multihit')).map(d => d.id).join(',')}`;
});
check('skill: 파생 태그를 tags 에 적으면 로드가 실패한다 — 두 곳 관리 금지 (§11-2 규칙 2)', () => {
    const rows = JSON.parse(JSON.stringify(D.skillRows));
    rows[0].tags = 'single';
    try { createSkillSystem({ balance: B, rows }); } catch (e) { return `throw — ${String(e.message).slice(0, 50)}`; }
    return fail('파생 태그가 통과했다');
});
check('skill: tags 3개 · 어휘 밖 값 · 중복은 로드가 실패한다 (§11-2 규칙 1)', () => {
    const mk = v => { const rows = JSON.parse(JSON.stringify(D.skillRows)); rows[0].tags = v; return rows; };
    for (const v of ['shout|blessing|curse', 'nonsense', 'shout|shout']) {
        let threw = false;
        try { createSkillSystem({ balance: B, rows: mk(v) }); } catch (e) { threw = true; }
        if (!threw) fail(`'${v}' 가 통과했다`);
    }
    return '3개 · 어휘 밖 · 중복 전부 throw';
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
        if (g.damageKind === 'magic') {
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
        if (it.slot === 'weapon' && WG[it.group]?.release !== 'main') fail(`expansion group dropped: ${it.group}`);
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
check('simulate: 귀환 룰 — 전투불능자가 하나라도 나오면 그 자리에서 런이 끝난다 (base_expedition §1-1 · 부채 #14)', () => {
    // 종잇장 파티를 높은 스테이지에 보낸다 — 반드시 누군가 쓰러진다
    const weak = units().map(u => ({ ...u, combat: { ...u.combat, hp_max: 20, level: 1 } }));
    let sawRetreat = false;
    for (let seed = 1; seed <= 8; seed++) {
        const r = SYS.battle.simulate(weak, 104, makeRng(seed));
        if (r.reason === 'retreat') sawRetreat = true;
        // 어떤 사유로 끝났든, 전투불능자가 있는데 계속 싸운 런은 없어야 한다
        if (r.downed.length > 1 && r.reason !== 'wipe') fail(`${r.reason} — 전투불능 ${r.downed.length}명이 나올 때까지 계속 싸웠다`);
        const end = r.timeline[r.timeline.length - 1];
        if (end.e !== 'end' || end.reason !== r.reason) fail('end 이벤트와 reason 이 갈린다');
    }
    return sawRetreat ? 'retreat 관측' : fail('전투불능이 나와도 귀환하지 않는다');
});
check('simulate: 귀환보다 클리어가 먼저다 — 마지막 타격과 같은 틱에 쓰러져도 클리어는 클리어다', () => {
    // 압도적인 파티는 전투불능 없이 클리어한다 (귀환 룰이 정상 클리어를 잡아먹지 않는지)
    const r = SYS.battle.simulate(godUnits(), 101, makeRng(5));
    return r.won && r.reason === 'clear' && r.downed.length === 0 ? `r${r.roundsCleared} ${r.reason}` : fail(`${r.reason} downed ${r.downed.length}`);
});
check('balance: concurrent_expedition_parties 는 코드가 표현할 수 있는 값이어야 한다 (부채 #19)', () =>
    // state.party / state.run 이 단수 필드라 「동시 원정 1」은 구조로만 지켜진다.
    // 이 키를 2 로 올리면 코드가 아무 일도 안 하므로, 값이 갈리는 순간 여기서 빨간불이 켜져야 한다
    B.concurrent_expedition_parties === 1 || fail(`${B.concurrent_expedition_parties} — 동시 원정 >1 은 구현이 없다 (state.party·state.run 이 단수)`));
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

/* ── 스킬 — 정의·배정·선택은 skill.js, 실행은 battle.js ── */

/** 액티브를 실은 파티 — 기존 simulate 단정은 `units()`(액티브 없음) 그대로 둔다: rng 수열 불변을 지키기 위해서다 */
const skillUnits = () => units().map(u => ({ ...u, actives: SYS.skill.activesFor(SYS.game.heroById(G, u.uid)) }));
/** 특정 직업의 액티브를 손으로 실은 파티 — 파티에 없는 직업의 **실행**을 보려는 용도 (배정 규칙은 activesFor 단정이 따로 본다) */
const clsUnits = cls => units().map(u => ({ ...u, actives: SYS.skill.activesFor({ cls }) }));
/** 시드 탐색 — 어느 전투에서 그 사건이 나는지는 편성·굴림에 달렸다. 못 찾으면 던진다 */
function findSeed(pred, mk = skillUnits, stageId = 101) {
    for (let seed = 1; seed <= 40; seed++) {
        const r = SYS.battle.simulate(mk(), stageId, makeRng(seed));
        if (pred(r)) return { seed, r };
    }
    return fail('시드 탐색 실패 (1~40)');
}

check('skill: 어휘 — owner_kind/kind/target/effect_stat/cast_condition 이 사전 안 · 출처마다 priority 유일 (§9-5)', () => {
    const KIND = ['attack', 'heal', 'buff'];
    const TGT = ['enemy_single', 'enemy_all', 'enemy_rotate', 'enemy_chain', 'self', 'party'];
    const STAT = ['atk_pct', 'barrier_pct', 'period_pct', 'taunt'];
    const COND = ['buff_absent', 'ally_hp_below'];
    const OWNER = ['job', 'advance', 'weapon_group', 'unique'];
    const seen = {};
    for (const d of SYS.skill.list) {
        if (!OWNER.includes(d.ownerKind)) fail(`${d.id} owner_kind ${d.ownerKind}`);
        if (!KIND.includes(d.kind)) fail(`${d.id} kind ${d.kind}`);
        if (!TGT.includes(d.target)) fail(`${d.id} target ${d.target}`);
        if (d.kind === 'buff' ? !STAT.includes(d.stat) : d.stat !== null) fail(`${d.id} effect_stat ${d.stat}`);
        if (d.cond !== null && !COND.includes(d.cond)) fail(`${d.id} cast_condition ${d.cond}`);
        if (d.element !== null && !M.ELEMENT_IDS.includes(d.element)) fail(`${d.id} element ${d.element}`);
        const k = `${d.ownerKind}#${d.ownerId}#${d.priority}`;
        if (seen[k]) fail(`priority 중복 ${k} (${seen[k]} / ${d.id})`);
        seen[k] = d.id;
    }
    return `${SYS.skill.list.length} defs`;
});
check('skill: activesFor — 프로토타입은 그 직업 전부 · priority 오름차순 (§9-0)', () => {
    const counts = {};
    for (const cls of M.CLASSES.filter(c => c.stage === 'main').map(c => c.id)) {
        const ids = SYS.skill.activesFor({ cls });
        const rows = SYS.skill.list.filter(d => d.ownerKind === 'job' && d.ownerId === cls);
        if (ids.length !== rows.length) fail(`${cls} ${ids.length} ≠ CSV ${rows.length}`);
        if (ids.length === 0) fail(`${cls} 에 액티브가 없다`);
        const pr = ids.map(id => SYS.skill.defs[id].priority);
        for (let i = 1; i < pr.length; i++) if (!(pr[i - 1] < pr[i])) fail(`${cls} 정렬 ${pr.join(',')}`);
        for (const id of ids) if (SYS.skill.defs[id].ownerId !== cls) fail(`${cls} 목록에 ${id}`);
        counts[cls] = ids.length;
    }
    if (counts.warrior !== 2) fail(`전사 ③ 은 기획 미정이라 2 여야 한다 (${counts.warrior})`);
    return Object.entries(counts).map(([c, n]) => `${c} ${n}`).join(' · ');
});
check('formula: effectiveCd — ceil(cd/period)×period · 정수배면 손실 0 (battle_design §6)', () => {
    const F = SYS.formula;
    if (F.effectiveCd(15, 1.5) !== 15) fail(`15@1.5 → ${F.effectiveCd(15, 1.5)}`);
    if (F.effectiveCd(5, 1.5) !== 6) fail(`5@1.5 → ${F.effectiveCd(5, 1.5)}`);
    if (F.effectiveCd(9, 2) !== 10) fail(`9@2 → ${F.effectiveCd(9, 2)}`);
    for (const d of SYS.skill.list) if (F.effectiveCd(d.cool, 1.5) < d.cool) fail(`${d.id} 실효 쿨이 쿨보다 짧다`);
    return '15@1.5=15 · 5@1.5=6 · 9@2=10';
});
check('skill: pickReady — readyAt 최소 우선 · 동률은 priority · 조건 거짓은 준비 아님 (battle_design §3)', () => {
    const d = SYS.skill.defs;
    const A = [
        { id: 'mag_fireball', def: d.mag_fireball, readyAt: 3 },      // priority 1
        { id: 'mag_chain', def: d.mag_chain, readyAt: 1 },            // priority 2
        { id: 'mag_iceblast', def: d.mag_iceblast, readyAt: 1 },      // priority 3
    ];
    const snap = JSON.stringify(A);
    if (SYS.skill.pickReady(A, 0.5, null) !== null) fail('아무것도 안 준비됐는데 골랐다');
    if (SYS.skill.pickReady(A, 1, null).id !== 'mag_chain') fail('동률이면 priority');
    if (SYS.skill.pickReady(A, 9, null).id !== 'mag_chain') fail('가장 오래 기다린 것 우선');
    if (SYS.skill.pickReady(A, 9, a => a.id !== 'mag_chain').id !== 'mag_iceblast') fail('조건 거짓은 제외');
    if (JSON.stringify(A) !== snap) fail('pickReady 가 입력을 바꿨다 (순수해야 한다)');
    return 'chain(readyAt 1·pri 2) < iceblast(1·3) < fireball(3·1)';
});
check('skill: castable — buff_absent 는 창이 있으면 거짓 · ally_hp_below 는 임계 미만 아군이 있어야 참 (§9-3)', () => {
    const d = SYS.skill.defs;
    const self = { hp: 100, hpMax: 100, buffs: {} };
    const full = [{ hp: 100, hpMax: 100 }, { hp: 80, hpMax: 100 }];
    const hurt = [{ hp: 100, hpMax: 100 }, { hp: 50, hpMax: 100 }];
    if (!SYS.skill.castable(d.war_warcry, { self, allies: full })) fail('창이 없으면 참이어야 한다');
    self.buffs.war_warcry = { stat: 'atk_pct', v: d.war_warcry.value, until: d.war_warcry.dur };
    if (SYS.skill.castable(d.war_warcry, { self, allies: full })) fail('창이 있으면 거짓이어야 한다');
    if (SYS.skill.castable(d.pri_heal, { self, allies: full })) fail(`80% 는 임계 ${d.pri_heal.condValue} 이상`);
    if (!SYS.skill.castable(d.pri_heal, { self, allies: hurt })) fail('50% 아군이 있으면 참');
    if (!SYS.skill.castable(d.mag_chain, { self, allies: full })) fail('조건 없음(-)은 항상 참');
    return `ally_hp_below 임계 ${d.pri_heal.condValue}%`;
});
check('simulate: 스킬 — actives 가 있으면 skill 이벤트와 casts 가 생긴다', () => {
    const r = SYS.battle.simulate(skillUnits(), 101, makeRng(5));
    const evs = r.timeline.filter(ev => ev.e === 'skill');
    if (evs.length === 0) fail('skill 이벤트가 없다');
    const total = Object.values(r.casts).reduce((a, b) => a + b, 0);
    if (total !== evs.length) fail(`casts 합 ${total} ≠ 이벤트 ${evs.length}`);
    const owned = new Set(r.party.flatMap(p => p.actives ?? []));
    if (owned.size === 0) fail('party[*].actives 가 비었다');
    for (const ev of evs) if (!owned.has(ev.s)) fail(`안 가진 스킬을 썼다 ${ev.s}`);
    return Object.entries(r.casts).map(([id, n]) => `${id}×${n}`).join(' · ');
});
check('simulate: skill 이벤트가 준비 시각(ready)을 싣는다 — 재생기가 쿨을 계산하지 않는다 (INTERFACE §2-6)', () => {
    const r = SYS.battle.simulate(skillUnits(), 101, makeRng(5));
    const casts = r.timeline.filter(e => e.e === 'skill');
    if (!casts.length) fail('시전이 없다');
    for (const ev of casts) {
        if (typeof ev.ready !== 'number') fail(`${ev.s} 에 ready 가 없다`);
        if (ev.ready <= ev.t) fail(`${ev.s} ready ${ev.ready} ≤ t ${ev.t}`);
        // 준비까지의 간격 = 표기 쿨 × 쿨감소. 쿨감소가 0 인 기본 파티라 표기 쿨과 같아야 한다
        const cd = SYS.skill.defs[ev.s].cool;
        if (Math.abs((ev.ready - ev.t) - cd) > 0.15) fail(`${ev.s} 쿨 ${(ev.ready - ev.t).toFixed(1)} ≠ ${cd}`);
    }
    return `${casts.length} casts`;
});
check('simulate: 스킬 — 같은 시드 = 같은 타임라인 (actives 포함)', () => {
    const a = SYS.battle.simulate(skillUnits(), 101, makeRng(7));
    const b = SYS.battle.simulate(skillUnits(), 101, makeRng(7));
    return eq(a, b) ? `${a.timeline.length} events` : fail('스킬을 실으면 결정론이 깨진다');
});
check('simulate: 스킬 — actives 가 비면 스킬 사건이 하나도 없다 (rng 수열 불변 — D16)', () => {
    const a = SYS.battle.simulate(units(), 101, makeRng(5));
    const b = SYS.battle.simulate(units(), 101, makeRng(5));
    if (!eq(a, b)) fail('결정론');
    const bad = a.timeline.filter(ev => ['skill', 'heal', 'buff', 'buffEnd'].includes(ev.e) || ev.s !== undefined || ev.bar !== undefined);
    if (bad.length) fail(`스킬 사건 ${bad.length}건`);
    if (Object.keys(a.casts).length) fail('casts 가 비어 있지 않다');
    return `${a.timeline.length} events · casts 0`;
});
check('simulate: 버프 창 — 창 길이 = duration · 재시전은 중첩 없이 until 갱신 · 만료마다 buffEnd (battle_design §7)', () => {
    const { seed, r } = findSeed(x => x.timeline.some(ev => ev.e === 'buff'));
    const first = r.timeline.find(ev => ev.e === 'buff');
    const def = SYS.skill.defs[first.s];
    const own = r.timeline.filter(ev => (ev.e === 'buff' || ev.e === 'buffEnd') && ev.u === first.u && ev.s === first.s);
    let open = null, ends = 0, refresh = 0;
    for (const ev of own) {
        if (ev.e === 'buff') {
            if (Math.abs((ev.until - ev.t) - def.dur) > 0.11) fail(`창 길이 ${ev.until - ev.t} ≠ duration ${def.dur}`);
            if (open) { if (!(ev.until > open.until)) fail('재시전인데 until 이 안 늘었다'); refresh++; }
            open = ev;                       // 중첩이 아니라 갱신 — 같은 스킬의 창은 하나뿐이다
        } else {
            if (!open) fail('열린 창 없이 buffEnd 가 왔다');
            if (Math.abs(ev.t - open.until) > 0.2) fail(`만료 ${ev.t} 가 until ${open.until} 과 다르다`);
            open = null; ends++;
        }
    }
    return `seed ${seed} · ${first.s} 창 ${own.length}건 (갱신 ${refresh} · 만료 ${ends})`;
});
check('simulate: 배리어 — bar 가 남아 있으면 그 타격은 HP 를 깎지 않는다 (skill_design §9-3)', () => {
    const { seed, r } = findSeed(x => x.timeline.some(ev => ev.e === 'hit' && ev.bar !== undefined));
    const hp = {};
    for (const p of r.party) hp[p.key] = p.hpMax;
    let shielded = 0;
    for (const ev of r.timeline) {
        if (ev.e === 'round') for (const e of ev.enemies) hp[e.key] = e.hpMax;
        if (ev.e === 'buff' && ev.stat === 'barrier_pct') {
            const p = r.party.find(x => x.key === ev.u);
            if (!p) fail(`배리어 대상이 파티가 아니다 ${ev.u}`);
            const want = Math.round(p.hpMax * ev.v / 100);
            if (ev.amt !== want) fail(`배리어 총량 ${ev.amt} ≠ hpMax×${ev.v}% = ${want}`);
        }
        if (ev.e === 'hit') {
            if (ev.bar !== undefined) {
                if (ev.bar > 0 && ev.dhp !== hp[ev.d]) fail(`배리어가 ${ev.bar} 남았는데 HP 가 ${hp[ev.d]}→${ev.dhp}`);
                shielded++;
            }
            hp[ev.d] = ev.dhp;
            if (ev.ahp !== undefined) hp[ev.a] = ev.ahp;
        }
        if (ev.e === 'reflect') hp[ev.d] = ev.ahp;
        if (ev.e === 'heal') hp[ev.d] = ev.dhp;
    }
    return `seed ${seed} · 배리어가 낀 타격 ${shielded}건`;
});
check('simulate: 회복 — heal 은 hpMax 를 넘지 않는다 (battle_design §9-2)', () => {
    const { seed, r } = findSeed(x => x.timeline.some(ev => ev.e === 'heal'), () => clsUnits('priest'));
    const hpMax = {};
    for (const p of r.party) hpMax[p.key] = p.hpMax;
    let n = 0, sum = 0;
    for (const ev of r.timeline) {
        if (ev.e !== 'heal') continue;
        if (hpMax[ev.d] === undefined) fail(`회복 대상이 파티가 아니다 ${ev.d}`);
        if (ev.dhp > hpMax[ev.d]) fail(`dhp ${ev.dhp} > hpMax ${hpMax[ev.d]}`);
        if (!(ev.amt >= 0)) fail(`amt ${ev.amt}`);
        n++; sum += ev.amt;
    }
    return `seed ${seed} · heal ${n}건 · 회복량 합 ${sum}`;
});
check('simulate: 다단타 — 연사(arc_rapid)는 한 대상에게 hits 회 이하로 연속 타격 (§9-3)', () => {
    const { seed, r } = findSeed(x => (x.casts.arc_rapid ?? 0) > 0);
    const def = SYS.skill.defs.arc_rapid;
    const tl = r.timeline;
    let casts = 0, maxN = 0;
    for (let i = 0; i < tl.length; i++) {
        if (!(tl[i].e === 'skill' && tl[i].s === 'arc_rapid')) continue;
        let n = 0, d = null;
        for (let j = i + 1; j < tl.length; j++) {
            const x = tl[j];
            if (x.e === 'skill' || x.e === 'round' || x.e === 'end') break;
            if ((x.e === 'hit' || x.e === 'dodge') && x.s === 'arc_rapid' && x.a === tl[i].u) {
                n++;
                if (d === null) d = x.d; else if (x.d !== d) fail('다단타가 대상을 옮겼다');
            }
        }
        if (n < 1 || n > def.hits) fail(`타수 ${n} (hits ${def.hits})`);
        maxN = Math.max(maxN, n); casts++;
    }
    return `seed ${seed} · 시전 ${casts}회 · 최대 연속 ${maxN}/${def.hits}타`;
});
check('simulate: 도발 — taunt 창 동안 적의 단일 대상은 전부 도발자 (skill_design §9-2 ⚠임시 규칙)', () => {
    // 창은 buffEnd 로 닫히지만 **도발자가 쓰러져도** 닫힌다 (hasTaunt 는 생존자만 본다)
    const scan = r => {
        let open = null, checked = 0, windows = 0, bad = null;
        for (const ev of r.timeline) {
            if (ev.e === 'buff' && ev.stat === 'taunt') { open = ev; windows++; continue; }
            if (!open) continue;
            if (ev.e === 'buffEnd' && ev.u === open.u && ev.s === open.s) { open = null; continue; }
            if (ev.e === 'down' && ev.u === open.u) { open = null; continue; }
            if ((ev.e === 'hit' || ev.e === 'dodge') && ev.a.startsWith('e')) {
                if (ev.d !== open.u) bad = bad ?? `${ev.a}→${ev.d} (도발자 ${open.u})`;
                checked++;
            }
        }
        return { windows, checked, bad };
    };
    const { seed, r } = findSeed(x => scan(x).checked > 0);
    const s = scan(r);
    if (s.bad) fail(`도발 중인데 다른 대상을 때렸다 — ${s.bad}`);
    return `seed ${seed} · 창 ${s.windows}개 · 적 타격 ${s.checked}건 전부 도발자`;
});
check('save: SAVE_VERSION 5 — 쿨·창·배리어는 전투 안에서만 살고 세이브가 든 것은 마스터리 랭크·포인트 · 선술집 쿨다운뿐 (INTERFACE §4)', () =>
    SAVE_VERSION === 5 || fail(`v${SAVE_VERSION}`));

/* ── 원정 정산 ── */
check('report: roundsCleared 를 정산이 싣는다 — 렌더러가 짐작하지 않는다 (INTERFACE §2-7)', () => {
    const G2 = SYS.game.newGame(42, cands, NOW);
    const r = SYS.game.resolveBattle(G2, 101, NOW);
    if (!r.ok) fail(r.err);
    if (r.report.roundsCleared !== r.result.roundsCleared) fail('결과와 리포트가 갈린다');
    if (r.report.won && r.report.roundsCleared !== B.rounds_per_stage) fail(`클리어인데 ${r.report.roundsCleared} 라운드`);
    return `r${r.report.roundsCleared} · ${r.report.reason}`;
});
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
check('tavern: 후보는 카운터에 결정론, 고용은 골드·상한을 지킨다 · 고용한 칸만 빈다 (base_expedition §2-4)', () => {
    const G2 = SYS.game.newGame(42, cands, NOW);
    const a = SYS.game.tavernCandidates(G2), b = SYS.game.tavernCandidates(G2);
    if (!eq(a, b)) fail('nondeterministic');
    G2.resources.gold = B.tavern_hire_cost - 1;
    if (SYS.game.hire(G2, 0).err !== 'gold') fail('gold gate');
    G2.resources.gold = B.tavern_hire_cost * 100;
    const r = SYS.game.hire(G2, 0);
    if (!r.ok || G2.heroes.length !== 4 || r.hero.uid !== 'h4') fail('hire');
    // 고용한 칸만 null 이 되고 **나머지 칸은 그대로**다 — 고용이 무료 리롤 우회로가 되면 쿨다운이 무의미해진다
    const after = SYS.game.tavernCandidates(G2);
    if (after[0] !== null) fail('hired slot should be empty');
    if (!eq(after.slice(1), a.slice(1))) fail('other slots must not change on hire');
    if (SYS.game.hire(G2, 0).err !== 'missing') fail('empty slot should not be hireable');
    // 명단이 갈리지 않으므로 정원을 채우려면 **리롤을 끼워야 한다** — 그 자체가 「고용 ≠ 리롤」의 증거다
    for (let guard = 0; G2.heroes.length < B.roster_cap && guard < 50; guard++)
        if (!SYS.game.hire(G2, 1).ok) SYS.game.tavernReroll(G2, NOW);
    if (G2.heroes.length !== B.roster_cap) fail(`로스터 ${G2.heroes.length} — 정원을 못 채웠다`);
    return SYS.game.hire(G2, 1).err === 'roster';
});
check('tavern: 리롤은 쿨다운이 끝나면 무료, 남았으면 골드 — 명단은 저절로 갈리지 않는다 (base_expedition §2-4)', () => {
    const G2 = SYS.game.newGame(42, cands, NOW);
    G2.resources.gold = B.tavern_reroll_cost * 10;
    const gold0 = G2.resources.gold;
    // 리롤한 적이 없으면 이미 열려 있다 (자동 갱신이 없으므로 「기다린 시간」이 없다)
    const st0 = SYS.game.tavernState(G2, NOW);
    if (!st0.free) fail('first reroll should be free');
    const r1 = SYS.game.tavernReroll(G2, NOW);
    if (!r1.ok || !r1.free || G2.resources.gold !== gold0) fail('free reroll must not charge');
    // 쿨다운 중 — 즉시 리롤은 골드
    const st1 = SYS.game.tavernState(G2, NOW);
    if (st1.free) fail('should be on cooldown');
    const r2 = SYS.game.tavernReroll(G2, NOW);
    if (!r2.ok || r2.free || G2.resources.gold !== gold0 - B.tavern_reroll_cost) fail('paid reroll must charge');
    // 쿨다운이 지나면 다시 무료 (오프라인에도 흐른다 — now 만 앞으로 간다)
    const later = NOW + B.tavern_refresh_hours * 60 * 60 * 1000;
    if (!SYS.game.tavernState(G2, later).free) fail('cooldown should expire');
    // 골드가 없으면 쿨다운 중 리롤은 거절
    G2.resources.gold = 0;
    SYS.game.tavernReroll(G2, later);
    return SYS.game.tavernReroll(G2, later).err === 'gold';
});
check('tavern: 리롤은 산 칸을 되살린다 — 빈 칸은 다음 리롤에 채워진다', () => {
    const G2 = SYS.game.newGame(42, cands, NOW);
    G2.resources.gold = B.tavern_hire_cost * 100;
    SYS.game.hire(G2, 0);
    if (SYS.game.tavernCandidates(G2)[0] !== null) fail('slot should be empty');
    SYS.game.tavernReroll(G2, NOW);
    return SYS.game.tavernCandidates(G2).every(c => c !== null) || fail('reroll should refill');
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
시작 파티 Lv1 · 직업 전속 무기군 무기 1개 · 방어구 없음 · 전직 액티브 전부 켬(프로토타입 §9-0) 기준
⚠ 무기군 재배정(08-25)으로 시작 무기의 한손/양손·행동 주기가 바뀌었다 — 이전 캘리브레이션(1-1 95%)과 직접 비교 불가</pre>`;
