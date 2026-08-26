/**
 * 데이터 로더 + 시스템 조립 — CSV(SSOT)를 fetch 해서 game_logic 시스템들에 **주입**한다.
 *
 * fetch 는 브라우저 API 라 여기(ui/)에 있다. 파싱은 game_logic/csv.js (순수).
 * 화면 표시용 사전(이름 ko/en, 얼굴, 아이콘)은 mock.js 가 들고 있고, 수치는 전부 CSV 에서 온다.
 * mock.js 의 BALANCE 미러는 폐지했다 — balance.csv 를 직접 읽는다 (한 곳만 고치면 된다).
 */

import * as M from './mock.js';
import { parseCsv, keyValue, indexBy } from '../game_logic/csv.js';
import { createHeroSystem } from '../game_logic/hero.js';
import { createItemSystem } from '../game_logic/item.js';
import { createBattleSystem } from '../game_logic/battle.js';
import { createFormula } from '../game_logic/formula.js';
import { createGameSystem } from '../game_logic/state.js';

/** 로드된 데이터 — 렌더러는 수치를 여기서 읽는다 (D.balance.party_size_max 처럼) */
export const D = {
    balance: null, monsters: null, stages: null, stageList: [], stageOrder: [],
    roundTypes: [], budgets: null, grades: null, eliteRounds: [], bossRound: 0,
    codexLevels: [],          // codex_level.csv — 레벨순 cards_required
    weaponGroups: null,       // weapon_group.csv — {id: {id, ko, en, classes, twoHanded, period, attackType, stage}}
    weaponGroupList: [],
};

/** 조립된 시스템 — hero / item / battle / game */
export let SYS = null;

const FILES = ['balance', 'monster', 'stage', 'stage_round', 'round_budget', 'spawn_grade', 'codex_level', 'weapon_group'];

export async function loadData(base = './data/') {
    const texts = await Promise.all(FILES.map(f => fetch(`${base}${f}.csv`).then(r => {
        if (!r.ok) throw new Error(`data: ${f}.csv ${r.status}`);
        return r.text();
    })));
    const [balance, monster, stage, roundRows, budget, grade, codexLevel, weaponGroup] = texts.map(parseCsv);

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
    D.codexLevels = codexLevel.slice().sort((a, b) => a.level - b.level).map(r => r.cards_required);
    // 무기군 — CSV 한 행이 곧 무기 베이스다 (이름 ko/en 도 CSV 의 _kr/_en 쌍에서 온다)
    D.weaponGroupList = weaponGroup.map(r => ({
        id: r.group_id, ko: r.group_kr, en: r.group_en,
        classes: String(r.classes).split('|'), twoHanded: Number(r.hands) === 2,
        period: r.action_period, variance: r.variance_pct, attackType: r.attack_type, stage: r.stage,
    }));
    D.weaponGroups = indexBy(D.weaponGroupList, 'id');

    SYS = buildSystems(D);
    return D;
}

/** 시스템 조립 — 테스트 페이지도 같은 조립을 쓴다 (데이터만 바꿔 끼울 수 있다) */
export function buildSystems(d) {
    const sins = Object.keys(M.SINS);
    const hero = createHeroSystem({
        balance: d.balance, stats: M.STATS, sins, classes: M.CLASSES, weaponGroups: d.weaponGroups,
        namePool: M.HERO_NAME_POOL, traitPool: M.HERO_TRAIT_POOL,
    });
    const item = createItemSystem({
        balance: d.balance, slots: M.SLOTS.map(s => s.id), sins, weaponGroups: d.weaponGroups, elements: M.ELEMENT_IDS,
        itemBases: M.ITEM_BASES, affixDefs: M.AFFIX_DEFS, composeName: M.nm,
    });
    const battle = createBattleSystem({
        balance: d.balance, monsters: d.monsters, stages: d.stages, roundTypes: d.roundTypes,
        budgets: d.budgets, grades: d.grades, sins,
        sinTraits: M.SIN_TRAITS, commonTraits: M.COMMON_TRAITS, itemSystem: item,
    });
    const game = createGameSystem({
        hero, item, battle, balance: d.balance,
        equipSlots: M.EQUIP_SLOTS, stages: d.stages, stageOrder: d.stageOrder, monsters: d.monsters,
        codex: { levels: d.codexLevels, bonus: M.CODEX_LEVEL_BONUS, statByNum: M.CODEX_STAT_BY_NUM },
    });
    // formula 도 함께 내보낸다 — 화면의 감쇠율 표기가 시뮬과 같은 곡선을 쓰게 (battle_design §9-8)
    return { hero, item, battle, game, formula: createFormula(d.balance) };
}
