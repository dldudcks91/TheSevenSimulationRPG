/**
 * 데이터 로더 + 시스템 조립 — CSV(SSOT)를 fetch 해서 game_logic 시스템들에 **주입**한다.
 *
 * fetch 는 브라우저 API 라 여기(ui/)에 있다. 파싱은 game_logic/csv.js (순수).
 * 이름 ko/en · 얼굴 유무 · 챕터 죄종도 이제 전부 CSV 다 — mock.js 에 남은 것은 화면 전용 사전과 자산 경로뿐이다.
 * mock.js 의 BALANCE 미러는 폐지했다 — balance.csv 를 직접 읽는다 (한 곳만 고치면 된다).
 */

import * as M from './mock.js';
import { parseCsv, keyValue, indexBy } from '../game_logic/csv.js';
import { createHeroSystem } from '../game_logic/hero.js';
import { createItemSystem } from '../game_logic/item.js';
import { createBattleSystem } from '../game_logic/battle.js';
import { createSkillSystem } from '../game_logic/skill.js';
import { createTacticSystem } from '../game_logic/tactic.js';
import { createFormula } from '../game_logic/formula.js';
import { createGameSystem } from '../game_logic/state.js';

/** 로드된 데이터 — 렌더러는 수치를 여기서 읽는다 (D.balance.party_size_max 처럼) */
export const D = {
    balance: null, monsters: null, stages: null, stageList: [], stageOrder: [],
    roundTypes: [], budgets: null, grades: null, eliteRounds: [], bossRound: 0,
    balanceRows: [],          // balance.csv 원시 행 — status/knob 을 든다 (무결성 단정의 입력)
    codexLevels: [],          // codex_level.csv — 레벨순 cards_to_next (레벨당 증분)
    codexBonus: [],           // codex_level.csv — 레벨순 bonus_pct
    codexSeries: null,        // codex_series.csv — {stage_num: statKey}
    chapters: null,           // chapter.csv byId — {id, sin, name:{ko,en}}
    chapterList: [],
    heroAttributes: [],       // hero_attribute.csv — [{id, ko, en, abbr, combatStat, dispatch}]
    combatStats: [],          // combat_stat.csv — [{id, ko, en, cat, attr, fmt, impl}]
    weaponGroups: null,       // weapon_group.csv — {id: {id, ko, en, classes, twoHanded, period, damageKind, release}}
    weaponGroupList: [],
    skillRows: [],            // skill.csv 원시 행 — 정규화·검증은 game_logic/skill.js
    masteryNodes: [],         // mastery_node.csv 원시 행 — 정규화·검증은 game_logic/hero.js
    tacticSlots: [],          // tactic_slot.csv 원시 행 — 칸 수 = 행 수 (정규화·검증은 game_logic/tactic.js)
    tacticOptions: [],        // tactic_option.csv 원시 행 — 「조건 → 효과」 1행 = 옵션 1개
};

/** 조립된 시스템 — hero / item / battle / skill / tactic / game */
export let SYS = null;

/** 로더가 읽는 CSV — **`src/data/*.csv` 전부여야 한다**(`inherited/` 제외). 읽히지 않는 SSOT 를 두지 않는다 */
export const FILES = ['balance', 'monster', 'stage', 'stage_round', 'round_budget', 'spawn_grade',
    'codex_level', 'codex_series', 'weapon_group', 'skill', 'hero_attribute', 'combat_stat', 'chapter',
    'mastery_node', 'tactic_slot', 'tactic_option'];

export async function loadData(base = './data/') {
    const texts = await Promise.all(FILES.map(f => fetch(`${base}${f}.csv`).then(r => {
        if (!r.ok) throw new Error(`data: ${f}.csv ${r.status}`);
        return r.text();
    })));
    const [balance, monster, stage, roundRows, budget, grade, codexLevel, codexSeries,
        weaponGroup, skillRow, heroAttr, combatStat, chapter, masteryNode,
        tacticSlot, tacticOption] = texts.map(parseCsv);

    D.balanceRows = balance;
    D.balance = keyValue(balance);
    D.monsters = indexBy(monster, 'monster_idx');
    D.stageList = stage.slice().sort((a, b) => a.stage_id - b.stage_id);
    D.stages = indexBy(D.stageList, 'stage_id');
    D.stageOrder = D.stageList.map(s => s.stage_id);
    D.roundTypes = roundRows;
    D.budgets = indexBy(budget, 'budget_key');
    D.grades = indexBy(grade, 'grade');
    D.eliteRounds = roundRows.filter(r => r.round_type === 'elite').map(r => r.round_num);
    D.bossRound = roundRows.find(r => r.round_type === 'boss')?.round_num ?? D.balance.rounds_per_stage;
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
    // 전투 능력치 25종 — `impl` 은 computeCombat 이 실제로 내는가. 시트는 impl=1 만 그린다
    D.combatStats = combatStat.map(r => ({
        id: r.stat_id, ko: r.stat_kr, en: r.stat_en, cat: r.category,
        attr: r.attr === '-' ? null : r.attr, fmt: r.fmt, impl: r.impl,
    }));
    // 무기군 — CSV 한 행이 곧 무기 베이스다 (이름 ko/en 도 CSV 의 _kr/_en 쌍에서 온다)
    D.weaponGroupList = weaponGroup.map(r => ({
        id: r.group_id, ko: r.group_kr, en: r.group_en,
        classes: String(r.classes).split('|'), twoHanded: Number(r.hands) === 2,
        period: r.action_period, variance: r.variance_pct, damageKind: r.damage_kind, release: r.release,
    }));
    D.weaponGroups = indexBy(D.weaponGroupList, 'id');
    D.skillRows = skillRow;
    D.masteryNodes = masteryNode;
    D.tacticSlots = tacticSlot;
    D.tacticOptions = tacticOption;

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
/** 도감 스테이지 목록 — stage.csv + monster.csv 에서 만든다: 일반몹(idx 순) 3 + 보스 1. 표시 라벨(계열·완성 보상)은 렌더러가 mock 에서 붙인다 */
export const codexStages = () => (D.stageList ?? []).map(s => {
    const normals = Object.values(D.monsters ?? {})
        .filter(m => m.chapter === s.chapter && m.stage_num === s.stage_num && m.spawn_grade === 'normal')
        .sort((a, b) => a.monster_idx - b.monster_idx)
        .map(m => ({ id: m.monster_idx }));
    return { id: s.stage_id, chapter: s.chapter, num: s.stage_num, name: stageName(s), monsters: [...normals, { id: s.boss_monster_idx, boss: true }] };
});
/**
 * 액티브 한 줄 — 이름 · 표기 쿨은 `skill.csv`(SSOT), 아이콘 · 설명은 `mock.js` 표시 사전.
 * 관전 카드 · 스킬 칸 · 툴팁이 같은 한 곳에서 읽는다 (SCREEN_DESIGN §4-2).
 */
export const skillInfo = id => {
    const r = (D.skillRows ?? []).find(x => x.skill_id === id);
    const disp = M.skillDisplay(id);
    return {
        id,
        name: r ? { ko: r.name_kr, en: r.name_en } : { ko: id, en: id },
        cd: r ? Number(r.cool_sec) : 0,
        icon: disp.i,
        desc: disp.d,
    };
};

/**
 * 정예 이름 조립 — ko "분노의 스켈레톤 기사" / en "Wrathful Skeleton Knight".
 * 언어별 어순·조사가 다르므로 조립 규칙은 렌더러가 아니라 **데이터 층**에 둔다 (mock 의 nm() 과 같은 자리).
 * 몬스터 이름이 CSV 로 이사하면서 이 함수도 함께 왔다 — 죄종 접두어만 mock 에서 읽는다.
 */
export const eliteName = (sin, baseId) => {
    const s = M.SINS[sin], b = monsterName(baseId);
    return { ko: `${s.ko}의 ${b.ko}`, en: `${s.adj} ${b.en}` };
};

/** 시스템 조립 — 테스트 페이지도 같은 조립을 쓴다 (데이터만 바꿔 끼울 수 있다) */
export function buildSystems(d) {
    const sins = Object.keys(M.SINS);
    const hero = createHeroSystem({
        balance: d.balance, stats: d.heroAttributes, sins, classes: M.CLASSES, weaponGroups: d.weaponGroups,
        namePool: M.HERO_NAME_POOL, traitPool: M.HERO_TRAIT_POOL, masteryNodes: d.masteryNodes ?? [],
    });
    const item = createItemSystem({
        balance: d.balance, slots: M.SLOTS.map(s => s.id), sins, weaponGroups: d.weaponGroups, elements: M.ELEMENT_IDS,
        itemBases: M.ITEM_BASES, affixDefs: M.AFFIX_DEFS, composeName: M.nm,
    });
    // 스킬은 정의만 든다(무상태) — 실행은 battle, 배정은 state 가 partyUnits 를 만들 때 부른다
    const skill = createSkillSystem({ balance: d.balance, rows: d.skillRows ?? [] });
    // 전술은 규칙만 든다(무상태) — 어느 칸에 무엇이 들었는지는 세이브가 들고 state 가 묻는다
    const tactic = createTacticSystem({
        slots: d.tacticSlots ?? [], options: d.tacticOptions ?? [], sins, classes: M.CLASSES,
        weaponGroups: d.weaponGroups, skillSystem: skill,
    });
    const battle = createBattleSystem({
        balance: d.balance, monsters: d.monsters, stages: d.stages, roundTypes: d.roundTypes,
        budgets: d.budgets, grades: d.grades, sins,
        sinTraits: M.SIN_TRAITS, commonTraits: M.COMMON_TRAITS, itemSystem: item, skillSystem: skill,
    });
    const game = createGameSystem({
        hero, item, battle, skill, tactic, balance: d.balance,
        equipSlots: M.EQUIP_SLOTS, stages: d.stages, stageOrder: d.stageOrder, monsters: d.monsters,
        codex: { levels: d.codexLevels, bonus: d.codexBonus, statByNum: d.codexSeries },
    });
    // formula 도 함께 내보낸다 — 화면의 감쇠율 표기가 시뮬과 같은 곡선을 쓰게 (battle_design §9-8)
    return { hero, item, battle, skill, tactic, game, formula: createFormula(d.balance) };
}
