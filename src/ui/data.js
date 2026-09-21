/**
 * 데이터 로더 + 시스템 조립 — CSV(SSOT)를 fetch 해서 game_logic 시스템들에 **주입**한다.
 *
 * fetch 는 브라우저 API 라 여기(ui/)에 있다. 파싱은 game_logic/csv.js (순수).
 * 이름 ko/en · 얼굴 유무 · 챕터 죄종 · 직업 · 장비 부위/위치 · 아이템 베이스 · 접사 정의 · 영웅 이름/특성 풀 ·
 *   스킬 아이콘/설명(2026-09-01) · 스킬 태그 이름(2026-09-01)이
 *   전부 CSV 다 — mock.js 에 남은 게임 데이터는 죄종(`SINS`)·정예 특성 둘뿐이고 나머지는 화면 전용 사전·자산 경로다.
 * mock.js 의 BALANCE 미러는 폐지했다 — balance.csv 를 직접 읽는다 (한 곳만 고치면 된다).
 *
 * ⚠ **CSV 행 순서가 결정론 계약이다** — `slots`(부위) · `itemBases`(부위별) · 옵션 표(무기 · 방어구 · 장신구) · `procSkills` · `heroNamePool` ·
 *   `heroTraitPool` 은 `rng` 가 인덱스를 굴리는 배열이다. 재정렬하면 같은 시드가 다른 게임이 된다 (INTERFACE §5-2).
 */

import * as M from './mock.js';
import { parseCsv, keyValue, indexBy } from '../game_logic/csv.js';
import { createHeroSystem } from '../game_logic/hero.js';
import { createNaming } from '../game_logic/naming.js';
import { createItemSystem } from '../game_logic/item.js';
import { createBattleSystem } from '../game_logic/battle.js';
import { createSkillSystem } from '../game_logic/skill.js';
import { createTacticSystem } from '../game_logic/tactic.js';
import { createFormula } from '../game_logic/formula.js';
import { createGameSystem } from '../game_logic/state.js';

/** 로드된 데이터 — 렌더러는 수치를 여기서 읽는다 (D.balance.party_size_max 처럼) */
export const D = {
    balance: null, monsters: null, stages: null, stageList: [], stageOrder: [],
    roundSets: {},            // stage_round.csv — {round_set: [{round_num, round_type}]} · 스테이지가 stage.csv:round_set 으로 하나를 고른다
    budgets: null, grades: null, eliteRounds: [], bossRound: 0,   // eliteRounds · bossRound = 첫 스테이지 세트의 배치(도움말 표기)
    balanceRows: [],          // balance.csv 원시 행 — status/knob 을 든다 (무결성 단정의 입력)
    codexLevels: [],          // codex_level.csv — 레벨순 kills_total (누적 처치 문턱)
    codexBonus: [],           // codex_level.csv — 레벨순 bonus_pct
    codexSeries: null,        // codex_series.csv — {stage_num: statKey}
    chapters: null,           // chapter.csv byId — {id, sin, name:{ko,en}}
    chapterList: [],
    heroAttributes: [],       // hero_attribute.csv — [{id, ko, en, abbr, combatStat, dispatch}]
    combatStats: [],          // combat_stat.csv — [{id, ko, en, cat, attr, fmt, impl, sheetOrder}]
    armorGroups: null,        // armor_group.csv — {slot: {groupId: {id, slot, ko, en, classes, defMult, aspdPct, cdrPct, release}}} · 방어구 갈래 — 갑옷군 3 (2026-09-16 · R107) + 투구 3 · 장갑 2 · 신발 2 (2026-09-18)
    armorSinOptions: [],      // armor_sin_option.csv — [{slot, sin, stat, scale, min, max, perIlvl?}] · 방어구 죄종 칸 후보 · CSV 행 순서 (2026-09-18)
    armorCommonOptions: [],   // armor_common_option.csv — [{slot, group, family, stat, scale, min, max, perIlvl?}] · 방어구 공통옵션 후보 · CSV 행 순서 (2026-09-18)
    weaponGroups: null,       // weapon_group.csv — {id: {id, ko, en, classes, period, variance, damageKind, release}}
    weaponGroupList: [],
    weaponBases: null,        // weapon_base.csv — {groupId: [{id, ko, en}...]} · CSV 행 순서(대역 순) — 무기군마다 7 갖춰지면 굴림 폭 · 지금은 본편 열 전부(staff·orb·crucifix·bible·crossbow 2026-09-14) · 확장 dagger·scythe 는 없다
    skillRows: [],            // skill.csv 원시 행 — 정규화·검증은 game_logic/skill.js
    skillTagRows: [],         // skill_tag.csv 원시 행 — 태그 어휘·대분류·표시 이름의 SSOT (skill_design §11)
    masteryNodes: [],         // mastery_node.csv 원시 행 — 정규화·검증은 game_logic/hero.js
    heroTiers: [],            // hero_tier.csv — [{id, weight, totalMin, totalMax, shape, color, ko, en, desc:{ko,en}}] · 굴림 SSOT + 화면 표기
    commissionKinds: null,    // commission_kind.csv — {id: {id, ridesOn, ko, en, how:{ko,en}}} · ridesOn = battle(전투가 센다) | yield(드롭·산출이 채운다)
    commissionList: [],       // commission.csv — 게시판 행 (**칸 수 = 행 수** · tactic_slot 과 같은 문법) ⚠임시
    mineNodes: [],            // mine_node.csv — 채광의 **단계 7** [{id, tier, unlockChapter, ko, en, yieldId, yieldKo, yieldEn, yieldPerHour}] · tier 순 ⚠임시
    gatherNodes: [],          // gather_node.csv — 채집의 **단계 7** · 같은 모양이고 산출물만 약초다 (yieldKo/yieldEn) · tier 순 ⚠임시
    logNodes: [],             // log_node.csv — 벌목의 **단계 7** · 같은 모양이고 산출물만 목재다 (yieldKo/yieldEn) · tier 순 ⚠임시
    makeRecipes: {},          // make_recipe.csv — {part: {ore, timber, dust}} · 제작 필요량 ⚠임시 (item_design §7-1 · R96)
    potions: [],              // potion.csv — [{id, kind, tier, ko, en, heal, craftGold, craftable, startOwned(시작 개수)}] · CSV 행 순서 · 물약 단계 ⚠임시값 (battle_design §7-1 · item_design §7-4 · R103)
    tacticSlots: [],          // tactic_slot.csv 원시 행 — 칸 수 = 행 수 (정규화·검증은 game_logic/tactic.js)
    tacticOptions: [],        // tactic_option.csv 원시 행 — **`(option_id, grade)` 복합키** 1행 = 가족 하나의 등급 하나
    slots: [],                // equip_slot.csv — 장비 **부위** 8 [{id, ko, en, icon}] · part_order 순
    equipSlots: [],           // equip_slot.csv — 착용 **위치** 9 [{id, part}] · slot_order 순
    classes: [],              // class.csv — [{id, keyAttr, ko, en, role:{ko,en}, stage}] (stage = CSV 의 release)
    sinWords: null,           // sin_word.csv — {sinId: [{ko, en}...]} **단 순서**(tier 로 정렬) · 아이템 이름의 죄종 단어 (item_design §1 「이름」 · 2026-09-19)
    itemBases: null,          // item_base.csv — {slot: [{id,ko,en,group,tierMin}...]} · 부위별 CSV 행 순서 (드롭 굴림이 인덱스를 쓴다)
    // ~~affixDefs~~ (affix.csv) — 2026-09-21 R127 퇴역. 반지 · 목걸이가 아래 세 표로 옮겼다
    accessorySinOptions: [],  // accessory_sin_option.csv — [{slot, sin, stat, scale, min, max, perIlvl?}] · 반지 · 목걸이 죄종 칸 후보 · CSV 행 순서 (2026-09-21 · R127)
    accessoryCommonOptions: [], // accessory_common_option.csv — [{family, stat, scale, min, max, perIlvl?}] · 두 부위 한 풀 · CSV 행 순서 (R127)
    amuletProcs: [],          // amulet_proc.csv — [{baseId, trigger, min, max}] · 목걸이 베이스마다 발동 조건 하나 · CSV 행 순서 (R127)
    weaponSinOptions: [],     // weapon_sin_option.csv — [{sin, appliesTo, stat, scale, min, max}] · 무기 죄종 칸 후보 · CSV 행 순서 (2026-09-11 R78)
    weaponCommonOptions: [],  // weapon_common_option.csv — [{family, stat, appliesTo, scale, min, max}] · 무기 통합옵션 후보 · CSV 행 순서 (R78)
    heroNamePool: [],         // hero_name.csv — [{ko,en}] · CSV 행 순서
    heroTraitPool: [],        // hero_trait.csv — [{ko,en}] · CSV 행 순서
    searchStories: [],        // search_story.csv 원시 행 — 수색 진행 문구. 검증·막 순서는 game_logic/state.js (⚠ 행 순서가 굴림 순서다)
    searchMeetings: [],       // search_meeting.csv 원시 행 — 수색 만남(소문 · 질문). ⚠ 행 순서가 굴림 순서다
    searchAnswers: [],        // search_answer.csv 원시 행 — 만남의 답. `need_sin`(누가 갔나 → 보인다) · `hit_sin`(누굴 만났나 → 먹힌다)
    heroUniqueCandidates: [], // hero_unique_candidates.csv 원시 행 — 유니크 영웅 후보 풀(hero_design §1). ⚠임시 —
                              //   `status`(confirmed/proposed) 대부분이 proposed. 아직 소비하는 화면·로직 없음(2026-09-10 논의 자료)
    csvText: {},              // 파일명 → **원문 그대로**. 파싱 결과가 아니라 원문이라 어느 파일이 바뀌었는지 짚을 수 있다
                              //   (읽는 곳은 dev/golden.js:csvHash 하나 — 게임 로직은 이걸 안 본다)
};

/**
 * 이름 조립기 — 규칙은 `game_logic/naming.js`(이식 대상), 죄종 표시명만 여기서 주입한다.
 * ⚠ `SINS` 는 아직 CSV 가 아니다 (sin_mapping.md 미확정) — mock 에 남은 3항목 중 하나.
 */
const NAMING = createNaming({ sins: M.SINS });

/** 조립된 시스템 — hero / item / battle / skill / tactic / game */
export let SYS = null;

/** 로더가 읽는 CSV — **`src/data/*.csv` 전부여야 한다**(`inherited/` 제외). 읽히지 않는 SSOT 를 두지 않는다 */
export const FILES = ['balance', 'monster', 'stage', 'stage_round', 'round_budget', 'spawn_grade',
    'codex_level', 'codex_series', 'weapon_group', 'skill', 'skill_tag', 'hero_attribute', 'combat_stat', 'chapter',
    'mastery_node', 'tactic_slot', 'tactic_option', 'commission_kind', 'commission',
    'item_base', 'equip_slot', 'class', 'hero_name', 'hero_trait', 'mine_node', 'hero_tier', 'search_story', 'monster_role', 'formation_template', 'search_meeting', 'search_answer',
    'gather_node', 'log_node', 'hero_unique_candidates', 'weapon_base', 'weapon_sin_option', 'weapon_common_option', 'make_recipe', 'potion', 'armor_group',
    'armor_sin_option', 'armor_common_option', 'sin_word', 'accessory_sin_option', 'accessory_common_option', 'amulet_proc'];

export async function loadData(base = './data/') {
    const texts = await Promise.all(FILES.map(f => fetch(`${base}${f}.csv`).then(r => {
        if (!r.ok) throw new Error(`data: ${f}.csv ${r.status}`);
        return r.text();
    })));
    // 원문 보관 — 골든 스냅샷이 파일별 해시를 뜬다 (dev/golden.js). 파싱 전이라 컬럼 추가·행 순서도 걸린다
    FILES.forEach((f, i) => { D.csvText[f] = texts[i]; });
    const [balance, monster, stage, roundRows, budget, grade, codexLevel, codexSeries,
        weaponGroup, skillRow, skillTagRow, heroAttr, combatStat, chapter, masteryNode,
        tacticSlot, tacticOption, commissionKind, commissionRow,
        itemBaseRow, equipSlotRow, classRow, heroNameRow, heroTraitRow, mineNodeRow,
        heroTierRow, searchStoryRow, monsterRoleRow, formationTplRow,
        searchMeetingRow, searchAnswerRow,
        gatherNodeRow, logNodeRow, heroUniqueCandidateRow, weaponBaseRow, weaponSinOptionRow, weaponCommonOptionRow, makeRecipeRow, potionRow, armorGroupRow,
        armorSinOptionRow, armorCommonOptionRow, sinWordRow, accSinOptionRow, accCommonOptionRow, amuletProcRow] = texts.map(parseCsv);

    D.balanceRows = balance;
    D.balance = keyValue(balance);
    D.monsters = indexBy(monster, 'monster_idx');
    D.stageList = stage.slice().sort((a, b) => a.stage_id - b.stage_id);
    D.stages = indexBy(D.stageList, 'stage_id');
    D.stageOrder = D.stageList.map(s => s.stage_id);
    // 라운드 세트 — `stage_round.csv` 는 세트(`round_set`)마다 라운드 줄을 든다. 스테이지가 `stage.csv:round_set` 으로 하나를 고르고
    //   라운드 수는 그 세트의 행 수다 (2026-09-11 — 챕터보스 스테이지는 보스 1라운드 · base_expedition_design §1-2)
    D.roundSets = {};
    for (const r of roundRows) (D.roundSets[r.round_set] ??= []).push({ round_num: r.round_num, round_type: r.round_type });
    for (const rows of Object.values(D.roundSets)) rows.sort((a, b) => a.round_num - b.round_num);
    D.budgets = indexBy(budget, 'budget_key');
    D.grades = indexBy(grade, 'grade');
    // 도움말이 적는 「보통 스테이지」의 배치 — **첫 스테이지의 세트**에서 읽는다. 세트 이름을 코드가 박지 않는다
    const baseRounds = D.roundSets[D.stageList[0]?.round_set] ?? [];
    D.eliteRounds = baseRounds.filter(r => r.round_type === 'elite').map(r => r.round_num);
    D.bossRound = baseRounds.find(r => r.round_type === 'boss')?.round_num ?? baseRounds.length;
    const codexByLevel = codexLevel.slice().sort((a, b) => a.level - b.level);
    D.codexLevels = codexByLevel.map(r => r.kills_total);   // 누적 처치 문턱 (2026-09-21 — 카드 → 처치 수)
    D.codexBonus = codexByLevel.map(r => r.bonus_pct);
    D.codexSeries = Object.fromEntries(codexSeries.map(r => [r.stage_num, r.stat]));
    D.chapterList = chapter.slice().sort((a, b) => a.chapter_id - b.chapter_id)
        .map(r => ({ id: r.chapter_id, sin: r.sin, name: { ko: r.name_kr, en: r.name_en } }));
    D.chapters = indexBy(D.chapterList, 'id');
    // 기본 능력치 7종 — hero.js 는 id 만 읽고, 화면은 ko/en/abbr 을 읽는다 (같은 한 줄이 둘을 먹인다)
    D.heroAttributes = heroAttr.map(r => ({
        id: r.attr_id, ko: r.attr_kr, en: r.attr_en, abbr: r.abbr,
        combatStat: r.combat_stat, dispatch: r.dispatch,
        // 계수 = mult_base_pct + 능력치 × mult_per_point_pct (둘 다 비율 · R111) — **축마다 다르다** (2026-09-13)
        multBasePct: r.mult_base_pct, multPerPointPct: r.mult_per_point_pct,
    }));
    // 전투 능력치 25종 — `impl` 은 computeCombat 이 실제로 내는가. 시트는 impl=1 만 그린다.
    // `sheetOrder` 는 **캐릭터 시트의 행 순서**다 — CSV 행 순서가 아니라 이 값이 정한다 (SCREEN_DESIGN §6)
    D.combatStats = combatStat.map(r => ({
        id: r.stat_id, ko: r.stat_kr, en: r.stat_en, cat: r.category,
        attr: r.attr === '-' ? null : r.attr, fmt: r.fmt, impl: r.impl, sheetOrder: r.sheet_order,
    }));
    // 무기군 — CSV 한 행이 곧 무기 베이스다 (이름 ko/en 도 CSV 의 _kr/_en 쌍에서 온다)
    D.weaponGroupList = weaponGroup.map(r => ({
        id: r.group_id, ko: r.group_kr, en: r.group_en,
        classes: String(r.classes).split('|'),
        period: r.action_period, variance: r.variance_pct, damageKind: r.damage_kind, release: r.release,
    }));
    D.weaponGroups = indexBy(D.weaponGroupList, 'id');
    // 방어구 갈래 — **부위 → 갈래** 두 단으로 묶는다. 방어 계수 · 공속 · 쿨감을 든다 (2026-09-16 갑옷군 · R107 · 2026-09-18 투구 · 장갑 · 신발).
    //   갈래 id 가 부위마다 겹친다(`leather` — 투구 · 장갑 · 신발) — 그래서 id 하나로 색인하지 않는다. 숙련 직업(`classes`)은 갑옷만 들고 나머지는 `-`
    D.armorGroupList = armorGroupRow.map(r => ({
        id: r.group_id, slot: r.slot, ko: r.group_kr, en: r.group_en,
        classes: r.classes === '-' ? [] : String(r.classes).split('|'),
        defMult: r.def_mult, aspdPct: r.aspd_pct, cdrPct: r.cdr_pct, release: r.release,
    }));
    D.armorGroups = {};
    for (const g of D.armorGroupList) (D.armorGroups[g.slot] ??= {})[g.id] = g;
    // 방어구 옵션 표 둘 [2026-09-18 · item_design §1 「갑옷 옵션」 · 「투구 옵션」] — 방어구 네 부위도 고정 1 + 죄종 칸 + 공통옵션을 받고 `affix.csv` 를 안 쓴다.
    //   `perIlvl` 은 `band` 행만 든다(affix.csv 와 같은 규약) · 검증은 `item.js` 가 로드 시 한다. ⚠ 행 순서가 결정론 계약이다
    const bandIlvl = r => (r.scale === 'band' ? { perIlvl: r.per_ilvl } : {});
    D.armorSinOptions = armorSinOptionRow.map(r => ({ slot: r.slot, sin: r.sin, stat: r.stat, scale: r.scale, min: r.min, max: r.max, ...bandIlvl(r) }));
    D.armorCommonOptions = armorCommonOptionRow.map(r => ({
        slot: r.slot, group: r.group, family: r.family, stat: r.stat, scale: r.scale, min: r.min, max: r.max, ...bandIlvl(r),
    }));
    // 반지 · 목걸이 옵션 표 셋 [2026-09-21 · R127 · item_design §1 「반지 · 목걸이」] — 죄종 칸 · 공통옵션 한 풀 · 목걸이 발동 조건(베이스마다).
    //   방어구 표와 같은 규약 · 검증은 `item.js` 가 로드 시 한다. ⚠ 행 순서가 결정론 계약이다
    D.accessorySinOptions = accSinOptionRow.map(r => ({ slot: r.slot, sin: r.sin, stat: r.stat, scale: r.scale, min: r.min, max: r.max, ...bandIlvl(r) }));
    D.accessoryCommonOptions = accCommonOptionRow.map(r => ({ family: r.family, stat: r.stat, scale: r.scale, min: r.min, max: r.max, ...bandIlvl(r) }));
    D.amuletProcs = amuletProcRow.map(r => ({ baseId: r.base_id, trigger: r.trigger, min: r.min, max: r.max }));
    // 무기 베이스 — 무기군별 7종 이름 풀. **아직 두 무기군뿐**(item_design.md §1 「이름 — 9군」 — 나머지는 미정/미발주).
    //   드롭 시 이 풀이 있는 무기군만 `item.build` 가 하나를 굴려 이름·그림을 그 베이스로 좁힌다(없으면 무기군 이름 그대로).
    //   ⚠ 행 순서가 대역 순(기본 → ①A·①B → ②A·②B → ③A·③B)이지만 **굴림은 균등** — 대역별 ilvl 경계는 아직 없다(DEV_PLAN R62)
    // 아이템 이름의 죄종 단어 [2026-09-19 · item_design §1 「이름」] — 죄종마다 단 순서로 정렬한다(행 순서는 계약이 아니다 · **단의 순서가 계약**).
    //   드롭이 단 번호를 굴리므로(INTERFACE §2-5 `words`) 죄종마다 단 수가 같고 1 부터 이어져야 한다 — 아니면 멈춘다.
    //   ⚠ `tier_min_ilvl` 은 아직 안 읽는다 — 목표는 레벨 구간이고 밸런싱 전까지는 넷 중 균등이다
    D.sinWords = {};
    for (const r of sinWordRow.slice().sort((a, b) => a.tier - b.tier)) {
        if (!M.SINS[r.sin]) throw new Error(`data: sin_word.csv 의 '${r.word_id}' — 모르는 죄종 '${r.sin}'`);
        (D.sinWords[r.sin] ??= []).push({ ko: r.name_kr, en: r.name_en, tier: r.tier });
    }
    const wordTiers = Object.keys(M.SINS).map(k => (D.sinWords[k] ?? []).map(w => w.tier).join(','));
    if (new Set(wordTiers).size !== 1 || !wordTiers[0] || wordTiers[0].split(',').some((t, i) => Number(t) !== i + 1))
        throw new Error(`data: sin_word.csv — 죄종마다 단이 1 부터 같은 수만큼 있어야 한다 (${wordTiers.join(' / ')})`);
    D.weaponBases = {};
    // `make_level` — 제작에서 이 베이스가 나오는 레벨 [2026-09-21 사용자 지시 · item_design §7-1] (드롭은 아직 안 읽는다)
    for (const r of weaponBaseRow) (D.weaponBases[r.group_id] ??= []).push({ id: r.base_id, ko: r.name_kr, en: r.name_en, makeLevel: Number(r.make_level) });
    // 무기 옵션 표 둘 [2026-09-11 · R78 · item_design §1 「무기 옵션」] — 무기는 고정 1 + 죄종 칸 + 통합옵션을 받고 `affix.csv` 를 안 쓴다.
    //   `applies_to` = `all` · damage_kind · 직업 id — 검증은 `item.js` 가 로드 시 한다. ⚠ 행 순서가 결정론 계약이다
    D.weaponSinOptions = weaponSinOptionRow.map(r => ({ sin: r.sin, appliesTo: r.applies_to, stat: r.stat, scale: r.scale, min: r.min, max: r.max }));
    D.weaponCommonOptions = weaponCommonOptionRow.map(r => ({ family: r.family, stat: r.stat, appliesTo: r.applies_to, scale: r.scale, min: r.min, max: r.max }));
    D.skillRows = skillRow;
    D.skillTagRows = skillTagRow;
    D.masteryNodes = masteryNode;
    D.tacticSlots = tacticSlot;
    D.tacticOptions = tacticOption;
    // 의뢰 — 두 표가 층을 나눈다. **유형 둘은 확정 기획**(GAME_DESIGN §9 09-07 「의뢰는 목표형」)이고,
    // 게시판 행(commission)은 ⚠임시다 — 보상·목표가 미정이라 mine_node 와 같은 자리채움이다.
    // ⚠ 09-07 전면 개정 — ~~4종(사냥·파견·약탈·보호)~~ 은 「전장을 여는 의뢰」를 전제한 모델이라 통째로 폐기됐다.
    //   의뢰는 열리지 않고 **받아 두는 목표**라 남는 축은 「어디에 얹히는가」 하나(`ridesOn`)이고,
    //   ~~`form`(세는 형/가는 형)~~ · ~~`channel`(실시간/오프라인)~~ 은 가는 형이 사라져 축 자체가 소멸했다.
    //   약탈·보호는 의뢰가 아니라 **탐험의 종류**로 이관됐다 (base_expedition_design §1-3 · §3-1 · DEV_PLAN R45)
    // 화면이 종류로 배지·「어떻게 도는가」를 고르므로 kind 를 id 로 색인한다 (SCREEN_DESIGN §14)
    // 영웅 등급 — **굴림 파라미터와 화면 표기를 한 표가 든다** (신설 2026-09-08 · R48).
    // ~~`ui/mock.js:HERO_TIER`~~ 를 대체한다 — 이름·색이 mock 에 있고 대역이 CSV 에 있으면 SSOT 가 둘로 갈린다.
    // 행 순서가 곧 굴림 순서라 정렬하지 않는다 (INTERFACE §5-2)
    D.heroTiers = heroTierRow.map(r => ({
        id: r.tier_id, weight: r.weight, totalMin: r.attr_total_min, totalMax: r.attr_total_max, shape: r.shape,
        color: r.color_hex, ko: r.name_kr, en: r.name_en, desc: { ko: r.desc_kr, en: r.desc_en },
    }));
    D.commissionKinds = indexBy(commissionKind.map(r => ({
        id: r.kind_id, ridesOn: r.rides_on,
        ko: r.name_kr, en: r.name_en, how: { ko: r.how_kr, en: r.how_en },
    })), 'id');
    D.commissionList = commissionRow.map(r => ({
        id: r.commission_id, kind: r.kind_id,
        goal: { ko: r.goal_kr, en: r.goal_en }, gold: r.reward_gold, fame: r.reward_fame,
    }));
    // 채광의 단계 — 화면은 **순서와 이름만** 그린다 (SCREEN_DESIGN §8). tier 가 그 순서다.
    // ⚠임시 — 표 전체가 구조 검증용 자리채움이라고 CSV 스스로 적어 뒀다(description_kr). 해금 조건(unlock_chapter)은
    // 기획 백지라 **화면이 그리지 않는다** — 문턱 키가 없으면 문턱을 안 그린다 (§4-1).
    // 채집·벌목의 같은 표는 아직 없다 — 산출물이 미정이라 만들지 않는다. 생기면 이 한 줄이 둘 더 늘 뿐이다
    // 표 셋은 **같은 모양**이고 컬럼 이름만 갈린다(`ore_*` / `herb_*` / `timber_*` — base_expedition §2-1).
    // 조립에서 산출물 이름을 **한 이름(`yield*`)으로 모은다** — 그래야 화면이 파견처별 분기를 안 갖는다.
    const tierNodes = (rows, idKey, outKey) => rows.slice().sort((a, b) => a.tier - b.tier).map(r => ({
        id: r[idKey], tier: r.tier, unlockChapter: r.unlock_chapter,
        ko: r.name_kr, en: r.name_en,
        yieldId: r[`${outKey}_id`], yieldKo: r[`${outKey}_name_kr`], yieldEn: r[`${outKey}_name_en`],
        yieldPerHour: r.yield_per_hour,
    }));
    D.mineNodes = tierNodes(mineNodeRow, 'mine_id', 'ore');
    D.gatherNodes = tierNodes(gatherNodeRow, 'gather_id', 'herb');
    D.logNodes = tierNodes(logNodeRow, 'log_id', 'timber');
    // 제작 레시피 — 부위마다 광석 · 목재 · 가루 필요량(item_design §7-1 · R96). 어느 단계의 재료인지는 레벨이 든 챕터가 정한다(state.js makeLevels · 2026-09-21)
    D.makeRecipes = Object.fromEntries(makeRecipeRow.map(r => [r.part, { ore: r.ore_units, timber: r.timber_units, dust: r.dust_units }]));
    // 물약 단계 — 행 순서 그대로(굴림이 없어 순서가 결정론 계약은 아니다). 검증은 state.js 가 로드 시 한다 (battle_design §7-1 · item_design §7-4 · R103)
    D.potions = potionRow.map(r => ({
        id: r.potion_id, kind: r.kind, tier: r.tier, ko: r.name_kr, en: r.name_en,
        heal: r.heal, craftGold: r.craft_gold, craftable: r.craftable === 1, startOwned: r.start_owned,   // startOwned = 시작 개수(R124 · 2026-09-21 — 전엔 0/1)
    }));
    // 장비 — 한 표가 둘을 먹인다. 드롭·접사·필터는 **부위**(slots), 페이퍼돌·equipped 는 **위치**(equipSlots).
    // ⚠ slots 순서가 rollDrop 의 부위 굴림에 직결된다 — part_order 가 그 순서다
    D.equipSlots = equipSlotRow.slice().sort((a, b) => a.slot_order - b.slot_order)
        .map(r => ({ id: r.equip_slot_id, part: r.part }));
    D.slots = equipSlotRow.filter(r => r.part_order !== '-').sort((a, b) => a.part_order - b.part_order)
        .map(r => ({ id: r.part, ko: r.name_kr, en: r.name_en, icon: r.icon }));
    // 직업 — CSV 컬럼은 `release`(스테이지와 충돌하지 않는 이름), game_logic 이 읽는 필드는 `stage` 그대로
    D.classes = classRow.map(r => ({
        id: r.class_id, keyAttr: r.key_attr, ko: r.name_kr, en: r.name_en,
        role: { ko: r.role_kr, en: r.role_en }, stage: r.release,
    }));
    // 아이템 베이스 — 부위별 풀. **무기는 없다**(무기의 베이스는 무기군 자체 = weapon_group.csv)
    D.itemBases = {};
    //   갑옷은 `group`(갑옷군)과 `tierMin`(티어가 열리는 ilvl)을 같이 든다 — 나머지 부위는 group 이 null (2026-09-16 · R107)
    //   `id` 는 개체가 어느 베이스인지 박는 축이다 — 드롭이 `item.baseId` 로 들고 화면 그림도 이 id 를 본다 (2026-09-17 · INTERFACE 「item 객체」)
    for (const r of itemBaseRow) (D.itemBases[r.slot] ??= []).push({
        id: r.base_id, ko: r.name_kr, en: r.name_en, group: r.group || null, tierMin: Number(r.tier_min_ilvl) || 1,
    });
    D.heroNamePool = heroNameRow.map(r => ({ ko: r.name_kr, en: r.name_en }));
    D.heroTraitPool = heroTraitRow.map(r => ({ ko: r.name_kr, en: r.name_en }));
    // 수색 진행 문구 — 원시 행 그대로 넘긴다. **막의 어휘도 순서도 CSV 가 든다**(`phase`·`phase_order`)라
    // 여기서 가공하면 구조가 두 곳에 생긴다. 무결성 검증은 state.js 가 로드 시 한다
    D.searchStories = searchStoryRow;
    // 만남 — 원시 행 그대로. 두 컬럼(`need_sin` 누가 갔나 → 보인다 · `hit_sin` 누굴 만났나 → 먹힌다)이 규칙 전부라
    // 여기서 가공할 것이 없다. 무결성 검증은 state.js 가 로드 시 한다
    D.searchMeetings = searchMeetingRow;
    D.searchAnswers = searchAnswerRow;
    // 유니크 영웅 후보 풀 — 원시 행 그대로. ⚠임시(hero_design §1) — 개체 테이블이 없어 아직 아무도 안 읽는다.
    // status(confirmed/proposed)로 실제 채택 여부를 가른다. 2026-09-10 논의 자료 — commission.csv 와 같은 자리채움
    D.heroUniqueCandidates = heroUniqueCandidateRow;
    // 진형 — 적의 자리(`monster.csv:role` → rank)와 파티 템플릿의 정원. 둘 다 규칙이라 CSV 가 SSOT 다
    //   (2026-09-09 진형 확정 — 종전엔 `ui/battle.js:ENEMY_BACK_ROLES` 와 `app.js:FORM_TPLS` 에 박혀 있었다)
    D.monsterRoles = Object.fromEntries(monsterRoleRow.map(r => [r.role, { rank: r.rank, ko: r.name_kr, en: r.name_en }]));
    D.formationTemplates = Object.fromEntries(formationTplRow.map(r =>
        [r.tpl_id, { front: r.front, back: r.back, ko: r.name_kr, en: r.name_en }]));
    // ⚠ **행 순서는 따로 들고 간다** — `Object.keys` 는 `'3'` 같은 정수형 키를 맨 앞으로 끌어올려서
    //   CSV 의 첫 행(기본값)을 못 줄 수 있다. 「첫 행이 기본값」은 표가 정하는 규칙이라 배열로 보존한다
    D.formationTplOrder = formationTplRow.map(r => r.tpl_id);

    SYS = buildSystems(D);
    return D;
}

/* ── 표시 헬퍼 — 이름·얼굴·배경은 CSV 가 SSOT 다. 자산 경로만 mock 에 남는다 ── */

/** {ko, en} 이름 쌍을 돌려준다 — 화면은 i18n.L() 로 푼다. 이니셜도 L() 결과의 첫 글자를 쓴다 */
export const monsterName = id => {
    const r = D.monsters?.[id];
    return r ? { ko: r.monster_name_kr, en: r.monster_name_en } : { ko: '???', en: '???' };
};
/** 얼굴 이미지가 있는 몬스터만 경로를 돌려준다 (monster.csv:face).
 *  **정예는 제 초상을 가질 수 있다** [2026-09-17] — `monster.csv:face_elite` 가 1 이면 `<idx>_elite.png`,
 *  아니면 기본 `<idx>.png` 로 떨어진다. 파일이 있는지 찔러보지 않는다 — `face` 가 이미 같은 꼴이고,
 *  개발 서버가 `no-store` 라 404 폴백은 매 렌더마다 요청을 다시 쓴다 */
export const monsterFace = (id, grade = 'normal') => {
    const r = D.monsters?.[id];
    if (!r?.face) return null;
    const v = grade === 'elite' && r.face_elite ? '_elite' : '';
    return `${M.faceDir()}monster/${id}${v}.png`;
};
/** 몬스터 id 앞자리 = 챕터 (1101 → 1챕터) */
export const monsterSin = id => D.chapters?.[Math.floor(id / 1000)]?.sin ?? 'wrath';
/** 챕터 행 — {id, sin, name:{ko,en}} */
export const chapterOf = ch => D.chapters?.[ch] ?? null;
/** 스테이지 이름 — stage.csv 의 _kr/_en 쌍 */
export const stageName = row => ({ ko: row.stage_name_kr, en: row.stage_name_en ?? row.stage_name_kr });
/** 스테이지 이야기 — stage.csv 의 story_kr/story_en 쌍 (출정 창 「이야기」 칸 · SCREEN_DESIGN §4-1 · ADR-0105). 영어가 비면 한국어.
 *  줄바꿈은 셀 안의 `\n` 두 글자다(CSV 는 한 행이 한 줄이다) — 여기서 실제 줄바꿈으로 바꾸고 `.dw-story-text` 의 pre-line 이 편다 */
const storyLines = s => String(s ?? '').replace(/\\n/g, '\n');
export const stageStory = row => ({ ko: storyLines(row.story_kr), en: storyLines(row.story_en || row.story_kr) });
/** 몬스터 이야기 — monster.csv 의 story_kr/story_en 쌍 (도감 몬스터 툴팁 · SCREEN_DESIGN §9 · ADR-0206). 규칙은 `stageStory` 와 같다 —
 *  영어가 비면 한국어. 이야기가 없는 몬스터는 둘 다 빈 문자열이다(화면이 `—` 로 받는다).
 *  이름은 `{m:<idx>}` 자리표시자라 부르는 쪽이 `fillStory` 로 푼다 — 파티 문맥이 없어 `{leader}` 는 쓰지 않는다 */
export const monsterStory = id => {
    const r = D.monsters?.[id];
    return r ? stageStory(r) : { ko: '', en: '' };
};

/* ── 이야기 자리표시자 [2026-09-15 사용자 지시 · SCREEN_DESIGN §4-1] ──
   이름을 글에 박지 않는다 — 보스 이름의 SSOT 는 monster.csv, 영웅 이름은 세이브다.
   `{m:<monster_idx>}` = 그 몬스터 이름 · `{leader}` = 파티 리더(첫 슬롯) 이름.
   `{m:1150|이/가}` 처럼 조사 쌍(받침 있을 때/없을 때)을 붙이면 앞말 받침을 보고 고른다 — `으로/로` 는 ㄹ 받침이면 `로`.
   한국어는 이름을 「」로 감싼다. 리더가 없으면(빈 파티) 대체 문구를 괄호 없이 넣는다 */
export const STORY_TOKEN = /\{(?:m:(\d+)|(leader))(?:\|([^{}|/]+)\/([^{}|/]+))?\}/g;

/** 조사 쌍에서 앞말 받침에 맞는 쪽 — 끝 글자가 한글 음절이 아니면 받침 없음으로 친다 */
export const pickJosa = (word, withJong, withoutJong) => {
    const c = String(word).trim().slice(-1).charCodeAt(0);
    const jong = c >= 0xAC00 && c <= 0xD7A3 ? (c - 0xAC00) % 28 : 0;
    if (jong === 0) return withoutJong;
    return withJong === '으로' && jong === 8 ? withoutJong : withJong;   // ㄹ 받침(8)은 「로」
};

/** 이야기 글의 자리표시자를 푼다 — `leader` 는 {ko, en} 이름 쌍(없으면 null) · `fallback` 은 현재 언어로 풀린 대체 문구 */
export function fillStory(text, lang, { leader = null, fallback = '' } = {}) {
    return String(text).replace(STORY_TOKEN, (tok, idx, isLeader, withJong, withoutJong) => {
        let name;
        let bracket = lang === 'ko';
        if (isLeader) {
            if (leader) name = leader[lang] ?? leader.ko;
            else { name = fallback; bracket = false; }
        } else if (D.monsters?.[idx]) {
            const n = monsterName(idx);
            name = n[lang] ?? n.ko;
        } else return tok;                                  // 없는 번호는 그대로 드러낸다 — 단정이 잡는다
        const shown = bracket ? `「${name}」` : name;
        return withJong ? shown + pickJosa(name, withJong, withoutJong) : shown;
    });
}
/** 스테이지 배경 — `stage.csv:bg` 가 **자리를 연다**. ⚠ 그것은 스타일 폴더의 재고가 아니다 —
 *  고른 스타일에 그림이 없으면 404 가 한 번 나고 CSS 그라디언트가 보인다. 경로 조립은 mock(`bgDir`) */
export const stageBgOf = id => (D.stages?.[id]?.bg ? M.stageBg(id) : null);
/** 도감 스테이지 목록 — stage.csv + monster.csv 에서 만든다: 일반몹(idx 순) + 보스 1. 챕터보스 스테이지는 **보스 하나뿐**이다(2026-09-11). 표시 라벨(계열·완성 보상)은 렌더러가 mock 에서 붙인다 */
export const codexStages = () => (D.stageList ?? []).map(s => {
    const normals = Object.values(D.monsters ?? {})
        .filter(m => m.chapter === s.chapter && m.stage_num === s.stage_num && m.spawn_grade === 'normal')
        .sort((a, b) => a.monster_idx - b.monster_idx)
        .map(m => ({ id: m.monster_idx }));
    return { id: s.stage_id, chapter: s.chapter, num: s.stage_num, name: stageName(s), monsters: [...normals, { id: s.boss_monster_idx, boss: true }] };
});
/**
 * 액티브 한 줄 — 이름 · 표기 쿨 · 아이콘 · 설명이 **전부 `skill.csv`** 다 (2026-09-01 mock 표시 사전 폐지).
 * 관전 카드 · 스킬 칸 · 툴팁이 같은 한 곳에서 읽는다 (SCREEN_DESIGN §4-2).
 * 없는 id 는 빈 칸이 아니라 기본 글리프로 — 스킬이 늘어도 화면이 비지 않는다.
 */
export const skillInfo = id => {
    const r = (D.skillRows ?? []).find(x => x.skill_id === id);
    return {
        id,
        name: r ? { ko: r.name_kr, en: r.name_en } : { ko: id, en: id },
        cd: r ? Number(r.cool_sec) : 0,
        icon: r?.icon ?? '✦',
        desc: r ? { ko: r.desc_kr, en: r.desc_en } : null,
    };
};

/** 물약 한 줄 — 이름 · 회복량 · 단계가 **전부 `potion.csv`** 다 (R103). 없는 id 는 null — 표에서 사라진 물약이 세이브에 남을 수 있다 */
export const potionInfo = id => {
    const p = (D.potions ?? []).find(x => x.id === id);
    return p ? { id, name: { ko: p.ko, en: p.en }, heal: p.heal, tier: p.tier, kind: p.kind } : null;
};

/**
 * 스킬 태그 표시 이름 — `skill_tag.csv:name_kr/name_en` 이 SSOT 다 (skill_design §11).
 * 읽는 곳 — 연구 탭의 전술 조건 (`tactic_option.csv:cond_arg`). 없는 id 는 id 를 그대로 보여 준다(빈 문장 방지).
 */
export const skillTagName = id => {
    const r = (D.skillTagRows ?? []).find(x => x.tag_id === id);
    return r ? { ko: r.name_kr, en: r.name_en } : { ko: id, en: id };
};

/**
 * 정예 이름 조립 — ko "분노의 스켈레톤 기사" / en "Wrathful Skeleton Knight".
 * **조립 규칙 자체는 `game_logic/naming.js`** (이식 대상) — 여기는 몬스터 id → 이름 조회만 맡는다
 * (`D.monsters` 는 브라우저가 fetch 한 것이라 game_logic 이 볼 수 없다).
 */
export const eliteName = (sin, baseId) => NAMING.eliteName(sin, monsterName(baseId));

/** 시스템 조립 — 테스트 페이지도 같은 조립을 쓴다 (데이터만 바꿔 끼울 수 있다) */
export function buildSystems(d) {
    const sins = Object.keys(M.SINS);
    // 아이템 이름 조립기 — 죄종 표시명(mock) + 죄종 단어(`sin_word.csv`). 정예 이름(`NAMING`)과 규칙은 같은 모듈이다 (2026-09-19)
    const naming = createNaming({ sins: M.SINS, sinWords: d.sinWords ?? {} });
    // 스킬은 정의만 든다(무상태) — 실행은 battle, 배정은 state 가 partyUnits 를 만들 때 부른다.
    // **hero 보다 먼저** 만든다: 영웅이 생성 시 고유 스킬을 굴리려면 후보 id 목록이 먼저 있어야 한다
    // attributes — 스케일링 슬롯 attr 의 어휘(hero_attribute.csv). 로드 검증이 오타를 잡는다 (skill_design §13-1 · 2026-09-10 R72)
    const skill = createSkillSystem({
        balance: d.balance, rows: d.skillRows ?? [], tagRows: d.skillTagRows ?? [], attributes: d.heroAttributes ?? [],
    });
    /**
     * 직업 풀 `{classId: [skillId...]}` — **1스킬 = 1직업** (skill_design §12-1 확정 2026-09-08).
     * 고유 굴림(hero)과 무기 개체 굴림(item)이 **같은 표**를 본다 — 두 출처가 한 풀에서 가져가기 때문이다(규칙 3).
     * ⚠ 행 순서가 결정론 계약이다 — 풀에서 빼거나 넣으면 같은 시드가 다른 고유·다른 무기를 낸다 (INTERFACE §5-2)
     */
    const classSkills = Object.fromEntries((d.classes ?? []).map(c =>
        [c.id, skill.list.filter(sk => sk.innatePool && sk.ownerKind === 'job' && sk.ownerId === c.id).map(sk => sk.id)]));
    const hero = createHeroSystem({
        balance: d.balance, stats: d.heroAttributes, sins, classes: d.classes, weaponGroups: d.weaponGroups, armorGroups: d.armorGroups,
        namePool: d.heroNamePool, traitPool: d.heroTraitPool, masteryNodes: d.masteryNodes ?? [],
        // 초상 장수 — 로직은 그림을 모르고 **직업별 장수 객체만** 받는다. 영웅이 태어날 때 제 직업 풀에서 굴려 세이브에 박는다
        // (2026-09-06 저장형 · 2026-09-07 직업 분류 — 풀이 0장인 직업은 face = null)
        heroFaces: M.HERO_FACES,
        // 등급 표 — **행 순서가 결정론 계약이다** (INTERFACE §5-2). weight 0(유니크)은 굴림에서 빠진다.
        // 등급이 정하는 것은 총합 대역과 분포 모양 둘뿐이고 상한은 전 영웅 공통이다 (hero_design §1 · §4-3)
        heroTiers: D.heroTiers,
        // 고유 스킬 풀 — **직업별**이다 (skill_design §12-1 규칙 1). hero 는 skill 시스템이 아니라 id 목록을 받는다
        skillPool: classSkills,
    });
    const item = createItemSystem({
        // ~~elements~~ 는 2026-09-11 R80 으로 주입 목록에서 빠졌다 — 마법 무기 원소 굴림이 사라져 item.js 가 원소 어휘를 안 읽는다
        balance: d.balance, slots: d.slots.map(s => s.id), sins, weaponGroups: d.weaponGroups, armorGroups: d.armorGroups,
        itemBases: d.itemBases, weaponBases: d.weaponBases,
        naming,                                     // 이름 조립기 — 죄종 단어 표까지 든다 (2026-09-19 · ~~composeName 하나~~)
        weaponSinOptions: d.weaponSinOptions ?? [], weaponCommonOptions: d.weaponCommonOptions ?? [],   // 무기 옵션 표 둘 (R78)
        armorSinOptions: d.armorSinOptions ?? [], armorCommonOptions: d.armorCommonOptions ?? [],       // 방어구 옵션 표 둘 (2026-09-18)
        // 반지 · 목걸이 옵션 표 셋 + 발동 스킬 후보 [2026-09-21 · R127] — 후보는 `skill.csv:amulet_pool = 1` · 직업을 안 가리는 한 풀 · 행 순서가 결정론 계약
        accessorySinOptions: d.accessorySinOptions ?? [], accessoryCommonOptions: d.accessoryCommonOptions ?? [],
        amuletProcs: d.amuletProcs ?? [], procSkills: skill.list.filter(sk => sk.amuletPool).map(sk => sk.id),
        // 무기 개체가 담을 액티브 후보 — 그 무기군의 **직업** 풀에서 드롭 때 하나를 굴린다 (skill_design §12-1 규칙 3)
        classSkills,
    });
    // 전술은 규칙만 든다(무상태) — 어느 칸에 무엇이 들었는지는 세이브가 들고 state 가 묻는다
    const tactic = createTacticSystem({
        slots: d.tacticSlots ?? [], options: d.tacticOptions ?? [], sins, classes: d.classes,
        skillSystem: skill,
        // 등급 가중치 — 리롤이 옵션과 등급을 같이 굴린다 (tactic_card_design §5-5). 값은 CSV
        gradeWeights: {
            common: d.balance.tactic_grade_weight_common,
            magic: d.balance.tactic_grade_weight_magic,
            rare: d.balance.tactic_grade_weight_rare,
        },
    });
    const battle = createBattleSystem({
        balance: d.balance, monsters: d.monsters, stages: d.stages, roundSets: d.roundSets,
        budgets: d.budgets, grades: d.grades, sins,
        sinTraits: M.SIN_TRAITS, commonTraits: M.COMMON_TRAITS, itemSystem: item, skillSystem: skill,
        monsterRoles: d.monsterRoles ?? {},        // 적의 랭크 — 진형 (battle_design §3-1)
        // 몬스터도 영웅과 같은 경로로 전투 능력치를 얻는다 (2026-09-11 R79 · battle_design §8-1 · monster_design §5-1) —
        //   `computeCombat` 을 몬스터에도 부르므로 시스템째 넘긴다. `classSkills` 는 보스 셋째 칸의 후보 풀(hero·item 과 같은 표)
        //   이고 `slots` 는 `monster.csv:wear_slots` 어휘 검증용이다
        heroSystem: hero, classSkills, slots: d.slots.map(s => s.id),
    });
    const game = createGameSystem({
        hero, item, battle, skill, tactic, balance: d.balance,
        equipSlots: d.equipSlots, stages: d.stages, stageOrder: d.stageOrder, monsters: d.monsters,
        codex: { levels: d.codexLevels, bonus: d.codexBonus, statByNum: d.codexSeries },
        // 수색 — 이야기 표와 죄종 목록(그 표의 `sin` 컬럼 검증용). 막 수·순서는 표가 정한다 (state.js:searchPhases)
        sins, searchStories: d.searchStories ?? [],
        searchMeetings: d.searchMeetings ?? [], searchAnswers: d.searchAnswers ?? [],
        // 진형 — 템플릿의 정원. 첫 행이 기본값이다(`formation_template.csv` 행 순서가 곧 화면 순서)
        formationTemplates: d.formationTemplates ?? {},
        formationTplOrder: d.formationTplOrder ?? [],
        defaultFormationTpl: (d.formationTplOrder ?? [])[0],
        // 제작 — 레시피와 재료 단계 표. 레벨대 = 챕터(stages) · 재료 = 그 tier 의 산출물 (item_design §7-1 · R96)
        makeRecipes: d.makeRecipes ?? {}, mineNodes: d.mineNodes ?? [], logNodes: d.logNodes ?? [],
        // 물약 — 단계 표. 칸 수 · 마시는 HP 비율 · 쿨은 balance 가 든다 (battle_design §7-1 · R103)
        potions: d.potions ?? [],
    });
    // formula 도 함께 내보낸다 — 화면의 감쇠율 표기가 시뮬과 같은 곡선을 쓰게 (battle_design §9-8)
    // naming 도 내보낸다 — 이름 규칙(`sinPhrase` · `wordCount`)을 단정이 읽고, 화면이 단어를 따로 다룰 때도 여기서 받는다 (2026-09-19)
    return { hero, item, battle, skill, tactic, game, naming, formula: createFormula(d.balance) };
}
