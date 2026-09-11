/**
 * 데이터 로더 + 시스템 조립 — CSV(SSOT)를 fetch 해서 game_logic 시스템들에 **주입**한다.
 *
 * fetch 는 브라우저 API 라 여기(ui/)에 있다. 파싱은 game_logic/csv.js (순수).
 * 이름 ko/en · 얼굴 유무 · 챕터 죄종 · 직업 · 장비 부위/위치 · 아이템 베이스 · 접사 정의 · 영웅 이름/특성 풀 ·
 *   스킬 아이콘/설명(2026-09-01) · 스킬 태그 이름(2026-09-01)이
 *   전부 CSV 다 — mock.js 에 남은 게임 데이터는 죄종(`SINS`)·정예 특성 둘뿐이고 나머지는 화면 전용 사전·자산 경로다.
 * mock.js 의 BALANCE 미러는 폐지했다 — balance.csv 를 직접 읽는다 (한 곳만 고치면 된다).
 *
 * ⚠ **CSV 행 순서가 결정론 계약이다** — `slots`(부위) · `itemBases`(부위별) · `affixDefs` · `heroNamePool` ·
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
    codexLevels: [],          // codex_level.csv — 레벨순 cards_to_next (레벨당 증분)
    codexBonus: [],           // codex_level.csv — 레벨순 bonus_pct
    codexSeries: null,        // codex_series.csv — {stage_num: statKey}
    chapters: null,           // chapter.csv byId — {id, sin, name:{ko,en}}
    chapterList: [],
    heroAttributes: [],       // hero_attribute.csv — [{id, ko, en, abbr, combatStat, dispatch}]
    combatStats: [],          // combat_stat.csv — [{id, ko, en, cat, attr, fmt, impl, sheetOrder}]
    weaponGroups: null,       // weapon_group.csv — {id: {id, ko, en, classes, period, variance, damageKind, release}}
    weaponGroupList: [],
    weaponBases: null,        // weapon_base.csv — {groupId: [{id, ko, en}...]} · CSV 행 순서(대역 순) — 무기군마다 7 갖춰지면 굴림 폭 · 지금은 sword2h·axe·mace·spear·bow
    skillRows: [],            // skill.csv 원시 행 — 정규화·검증은 game_logic/skill.js
    skillTagRows: [],         // skill_tag.csv 원시 행 — 태그 어휘·대분류·표시 이름의 SSOT (skill_design §11)
    masteryNodes: [],         // mastery_node.csv 원시 행 — 정규화·검증은 game_logic/hero.js
    heroTiers: [],            // hero_tier.csv — [{id, weight, totalMin, totalMax, shape, color, ko, en, desc:{ko,en}}] · 굴림 SSOT + 화면 표기
    commissionKinds: null,    // commission_kind.csv — {id: {id, ridesOn, ko, en, how:{ko,en}}} · ridesOn = battle(전투가 센다) | yield(드롭·산출이 채운다)
    commissionList: [],       // commission.csv — 게시판 행 (**칸 수 = 행 수** · tactic_slot 과 같은 문법) ⚠임시
    mineNodes: [],            // mine_node.csv — 채광의 **단계 7** [{id, tier, unlockChapter, ko, en, yieldId, yieldKo, yieldEn, yieldPerHour}] · tier 순 ⚠임시
    gatherNodes: [],          // gather_node.csv — 채집의 **단계 7** · 같은 모양이고 산출물만 약초다 (yieldKo/yieldEn) · tier 순 ⚠임시
    logNodes: [],             // log_node.csv — 벌목의 **단계 7** · 같은 모양이고 산출물만 목재다 (yieldKo/yieldEn) · tier 순 ⚠임시
    tacticSlots: [],          // tactic_slot.csv 원시 행 — 칸 수 = 행 수 (정규화·검증은 game_logic/tactic.js)
    tacticOptions: [],        // tactic_option.csv 원시 행 — **`(option_id, grade)` 복합키** 1행 = 가족 하나의 등급 하나
    slots: [],                // equip_slot.csv — 장비 **부위** 8 [{id, ko, en, icon}] · part_order 순
    equipSlots: [],           // equip_slot.csv — 착용 **위치** 9 [{id, part}] · slot_order 순
    classes: [],              // class.csv — [{id, keyAttr, ko, en, role:{ko,en}, stage}] (stage = CSV 의 release)
    itemBases: null,          // item_base.csv — {slot: [{ko,en}...]} · 부위별 CSV 행 순서 (드롭 굴림이 인덱스를 쓴다)
    affixDefs: [],            // affix.csv — [{stat, scale, min, max, perIlvl?, slots:[...]}] · CSV 행 순서 · **무기는 안 쓴다**(R78)
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
    'affix', 'item_base', 'equip_slot', 'class', 'hero_name', 'hero_trait', 'mine_node', 'hero_tier', 'search_story', 'monster_role', 'formation_template', 'search_meeting', 'search_answer',
    'gather_node', 'log_node', 'hero_unique_candidates', 'weapon_base', 'weapon_sin_option', 'weapon_common_option'];

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
        affixRow, itemBaseRow, equipSlotRow, classRow, heroNameRow, heroTraitRow, mineNodeRow,
        heroTierRow, searchStoryRow, monsterRoleRow, formationTplRow,
        searchMeetingRow, searchAnswerRow,
        gatherNodeRow, logNodeRow, heroUniqueCandidateRow, weaponBaseRow, weaponSinOptionRow, weaponCommonOptionRow] = texts.map(parseCsv);

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
    D.codexLevels = codexByLevel.map(r => r.cards_to_next);
    D.codexBonus = codexByLevel.map(r => r.bonus_pct);
    D.codexSeries = Object.fromEntries(codexSeries.map(r => [r.stage_num, r.stat]));
    D.chapterList = chapter.slice().sort((a, b) => a.chapter_id - b.chapter_id)
        .map(r => ({ id: r.chapter_id, sin: r.sin, name: { ko: r.name_kr, en: r.name_en } }));
    D.chapters = indexBy(D.chapterList, 'id');
    // 기본 능력치 7종 — hero.js 는 id 만 읽고, 화면은 ko/en/abbr 을 읽는다 (같은 한 줄이 둘을 먹인다)
    D.heroAttributes = heroAttr.map(r => ({
        id: r.attr_id, ko: r.attr_kr, en: r.attr_en, abbr: r.abbr,
        combatStat: r.combat_stat, dispatch: r.dispatch,
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
    // 무기 베이스 — 무기군별 7종 이름 풀. **아직 두 무기군뿐**(item_design.md §1 「이름 — 9군」 — 나머지는 미정/미발주).
    //   드롭 시 이 풀이 있는 무기군만 `item.build` 가 하나를 굴려 이름·그림을 그 베이스로 좁힌다(없으면 무기군 이름 그대로).
    //   ⚠ 행 순서가 대역 순(기본 → ①A·①B → ②A·②B → ③A·③B)이지만 **굴림은 균등** — 대역별 ilvl 경계는 아직 없다(DEV_PLAN R62)
    D.weaponBases = {};
    for (const r of weaponBaseRow) (D.weaponBases[r.group_id] ??= []).push({ id: r.base_id, ko: r.name_kr, en: r.name_en });
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
    for (const r of itemBaseRow) (D.itemBases[r.slot] ??= []).push({ ko: r.name_kr, en: r.name_en });
    // 접사 정의 — `perIlvl` 은 `band` 행만 든다 (scale 3분류 계약: item_design §2-1)
    D.affixDefs = affixRow.map(r => ({
        stat: r.stat, scale: r.scale, min: r.min, max: r.max,
        ...(r.scale === 'band' ? { perIlvl: r.per_ilvl } : {}),
        slots: String(r.slots).split('|'),
    }));
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
    //   CSV 의 첫 행(기본값 `2-1`)을 못 준다. 「첫 행이 기본값」은 표가 정하는 규칙이라 배열로 보존한다
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
/** 얼굴 이미지가 있는 몬스터만 경로를 돌려준다 (monster.csv:face) */
export const monsterFace = id => (D.monsters?.[id]?.face ? `${M.faceDir()}monster_${id}.png` : null);
/** 몬스터 id 앞자리 = 챕터 (1101 → 1챕터) */
export const monsterSin = id => D.chapters?.[Math.floor(id / 1000)]?.sin ?? 'wrath';
/** 챕터 행 — {id, sin, name:{ko,en}} */
export const chapterOf = ch => D.chapters?.[ch] ?? null;
/** 스테이지 이름 — stage.csv 의 _kr/_en 쌍 */
export const stageName = row => ({ ko: row.stage_name_kr, en: row.stage_name_en ?? row.stage_name_kr });
/** 스테이지 배경 — 계승 자산이 있는 스테이지만(stage.csv:bg). 경로 조립은 mock(자산 경로) */
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
        balance: d.balance, stats: d.heroAttributes, sins, classes: d.classes, weaponGroups: d.weaponGroups,
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
        balance: d.balance, slots: d.slots.map(s => s.id), sins, weaponGroups: d.weaponGroups,
        itemBases: d.itemBases, weaponBases: d.weaponBases, affixDefs: d.affixDefs, composeName: NAMING.composeName,
        weaponSinOptions: d.weaponSinOptions ?? [], weaponCommonOptions: d.weaponCommonOptions ?? [],   // 무기 옵션 표 둘 (R78)
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
    });
    // formula 도 함께 내보낸다 — 화면의 감쇠율 표기가 시뮬과 같은 곡선을 쓰게 (battle_design §9-8)
    return { hero, item, battle, skill, tactic, game, formula: createFormula(d.balance) };
}
