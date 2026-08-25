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
import { createGameSystem } from '../game_logic/state.js';

/** 로드된 데이터 — 렌더러는 수치를 여기서 읽는다 (D.balance.party_size_max 처럼) */
export const D = {
    balance: null, monsters: null, stages: null, stageList: [], stageOrder: [],
    roundTypes: [], budgets: null, grades: null, eliteRounds: [], bossRound: 0,
};

/** 조립된 시스템 — hero / item / battle / game */
export let SYS = null;

const FILES = ['balance', 'monster', 'stage', 'stage_round', 'round_budget', 'spawn_grade'];

export async function loadData(base = './data/') {
    const texts = await Promise.all(FILES.map(f => fetch(`${base}${f}.csv`).then(r => {
        if (!r.ok) throw new Error(`data: ${f}.csv ${r.status}`);
        return r.text();
    })));
    const [balance, monster, stage, roundRows, budget, grade] = texts.map(parseCsv);

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

    SYS = buildSystems(D);
    return D;
}

/** 시스템 조립 — 테스트 페이지도 같은 조립을 쓴다 (데이터만 바꿔 끼울 수 있다) */
export function buildSystems(d) {
    const sins = Object.keys(M.SINS);
    const hero = createHeroSystem({
        balance: d.balance, stats: M.STATS, sins, classes: M.CLASSES,
        namePool: M.HERO_NAME_POOL, traitPool: M.HERO_TRAIT_POOL,
    });
    const item = createItemSystem({
        balance: d.balance, slots: M.SLOTS.map(s => s.id), sins,
        itemBases: M.ITEM_BASES, affixDefs: M.AFFIX_DEFS, composeName: M.nm,
    });
    const battle = createBattleSystem({
        balance: d.balance, monsters: d.monsters, stages: d.stages, roundTypes: d.roundTypes,
        budgets: d.budgets, grades: d.grades, sins,
        sinTraits: M.SIN_TRAITS, commonTraits: M.COMMON_TRAITS, itemSystem: item,
    });
    const game = createGameSystem({
        hero, item, battle, balance: d.balance,
        slots: M.SLOTS.map(s => s.id), stages: d.stages, stageOrder: d.stageOrder, monsters: d.monsters,
        codex: { milestones: M.CODEX_MILESTONES, bonus: M.CODEX_MILESTONE_BONUS, statByNum: M.CODEX_STAT_BY_NUM },
    });
    return { hero, item, battle, game };
}
