/**
 * 건설 — 건물 랭크가 기능을 연다 [신설 2026-09-22 · construction_draft §11 구조 확정 · INTERFACE §2-14 · DEV_PLAN R137].
 *
 * 순수 모듈 — DOM · 저장소 · 시계 · Math.random 접근 없음. **상태도 rng 도 없다.**
 * **무엇을 여는지는 표 넷이 정하고 이 모듈은 센다** — 건물(`building.csv`) · 랭크(`building_rank.csv` — 문턱 · 비용) ·
 *   여는 것(`building_effect.csv` — **한 줄에 하나**) · 연구(`research.csv`).
 *   세이브는 건물별 랭크 숫자만 든다(`state.js`) — 「무엇이 열렸나」는 부를 때마다 여기서 다시 센다. 표를 고치면 옛 세이브도 곧바로 새 표를 따른다.
 * **코드가 정하는 것은 어휘뿐이다** — 여는 것의 대상(`TARGETS`) · 문턱 조건 종류(`CONDITIONS`) · 연구 대상(`RESEARCH_TARGETS`).
 *   새 기능을 건물 뒤로 넣을 때만 `TARGETS` 에 한 줄이 는다(그 기능 자리에는 `state.hasFeature` 한 줄).
 */

/**
 * 여는 것의 대상 — `kind` 는 켜기(`unlock`) · 더하기(`add`) 둘뿐이다(construction_draft §11-2).
 *   `live: false` = **준비 중** — 그 기능이 아직 없다. 표에 적어 두면 화면에 「준비 중」으로 보이고, 기능이 생기면 여기만 `true` 로 바꾼다.
 *   더하기는 **기본값에 더한다** — 이름이 `state.limitsOf` 의 키와 같은 대상은 그 상한에 붙는다(단계 셋 `make_level` · `potion_tier` · `tactic_slots` 는
 *   `makeLevels` · `potionTier` · `tacticSlots` 에 붙고 기본값이 0 이다 — `state.js:ADD_KEY`).
 *   연구의 상한은 `research:<연구 id>` 로 더한다(이 표에 없다 — 연구 표가 id 를 든다)
 */
const U = live => ({ kind: 'unlock', live });
const A = live => ({ kind: 'add', live });
export const TARGETS = {
    // 켜기 — 지금 있는 기능 (분해 · 알아서 분해는 건물 밖이라 여기 없다 — 처음부터 열려 있다 · 2026-09-23 사용자 지시 · R140)
    expedition: U(true), repeat: U(true), stage_level: U(true),
    upgrade_item: U(true), make: U(true),
    storage: U(true), codex: U(true), hire: U(true), search: U(true), shop: U(true), shop_special: U(true),
    // 켜기 — 준비 중 (construction_draft §2 의 ⚠ 칸 포함)
    craft: U(false), stigma_craft: U(false), skill_card: U(false),
    dispatch: U(false), explore: U(false), raid: U(false), escort: U(false), gear_set: U(false), monster_card: U(false),
    commission_board: U(false), gamble: U(false), high_tier_candidates: U(false),
    training: U(false), advance: U(false), skill_depth: U(false),
    // 더하기 — 지금 있는 상한(`state.limitsOf` 의 키) · 단계
    bag: A(true), stash: A(true), roster: A(true), presets: A(true), potionSlots: A(true), upgrade: A(true),
    tavernCandidates: A(true), searchSlots: A(true), shopPerSlot: A(true), shopWeapon: A(true),
    make_level: A(true), potion_tier: A(true), tactic_slots: A(true),
    // 더하기 — 준비 중
    make_kinds: A(false), resource_tier: A(false), workers: A(false), shop_layers: A(false),
    explore_regions: A(false), explore_slots: A(false), gear_sets: A(false), commission_slots: A(false), training_slots: A(false),
};

/** 연구가 받는 대상 — `live: false` = 그 값을 읽는 자리가 아직 없다(construction_draft §5) */
export const RESEARCH_TARGETS = {
    gold_gain: false, drop_rate: false, drop_quality: false,
    upgrade_cost: false, make_cost: false, salvage_dust: false,
    ore_yield: false, timber_yield: false, herb_yield: false,
    hire_cost: false, shop_price: false, explore_reward: false, tactic_reroll_cost: false, xp_gain: false,
};

/**
 * 문턱 조건 종류 넷 — 칸 = `종류:값`, 여러 개는 `|` 로 잇고 **전부** 채워야 한다(construction_draft §11-3).
 *   `stage:<id>` 그 스테이지 클리어 · `total:<n>` 로스터 합산 레벨 **도달 최고치** · `hero:<n>` 로스터 최고 영웅 레벨 ·
 *   `building:<id>:<랭크>` 그 건물이 그 랭크 이상. 수 칸에 **balance 키 이름**을 적으면 그 값이다(같은 수를 두 곳에 두지 않는다)
 *   `have(ctx, cond, rankOf)` = 지금 값 · `ok` 는 `have >= need` 하나로 판정한다(스테이지는 클리어면 1)
 */
export const CONDITIONS = {
    stage: { have: (ctx, c) => (ctx.cleared.has(c.ref) ? 1 : 0) },
    total: { have: ctx => ctx.peakTotal },
    hero: { have: ctx => ctx.topLevel },
    building: { have: (ctx, c, rankOf) => rankOf(c.ref) },
};

const STATUS = ['proposed', 'fixed'];
const NONE = v => v === '-' || v === '' || v == null;

/**
 * @param {object} data
 *   buildings / ranks / effects / research — 표 넷의 파싱 행
 *   stageIds [id] — 문턱 `stage:` 가 가리킬 수 있는 스테이지 · resources [id] — 비용이 적을 수 있는 재화(`gold` · `dust` · `stigma` · 제작 재료 id)
 *   balance — 문턱 값에 키 이름을 적었을 때 읽는다
 */
export function createConstruction(data) {
    const bad = why => { throw new Error(`construction: ${why}`); };
    const B = data.balance ?? {};
    const stageIds = new Set(data.stageIds ?? []);
    const resources = new Set(data.resources ?? []);
    const posInt = v => Number.isInteger(v) && v > 0;

    /* ── 건물 ── */
    const list = [];
    const byId = new Map();
    for (const r of data.buildings ?? []) {
        const id = r.building_id;
        if (!id || byId.has(id)) bad(`building_id '${id}'`);
        if (!r.name_kr || !r.name_en) bad(`${id} — 이름이 비었다`);
        if (!r.tab) bad(`${id} — tab 이 비었다('-' = 탭 없음)`);
        if (!(Number.isInteger(r.start_rank) && r.start_rank >= 0)) bad(`${id} — start_rank ${r.start_rank}`);
        const b = { id, name: { ko: r.name_kr, en: r.name_en }, tab: r.tab, startRank: r.start_rank, order: Number(r.sort_order) || 0, maxRank: 0 };
        byId.set(id, b);
        list.push(b);
    }
    list.sort((a, b) => a.order - b.order);

    /* ── 칸 풀이 — 문턱 · 비용 ── */
    const num = (v, where) => {
        if (typeof v === 'number') return v;
        const n = B[v];
        if (typeof n !== 'number') bad(`${where} — 수도 balance 키도 아닌 값 '${v}'`);
        return n;
    };
    const parseRequire = (cell, where) => (NONE(cell) ? [] : String(cell).split('|').map(part => {
        const [kind, a, b] = part.split(':');
        if (!CONDITIONS[kind]) bad(`${where} — 모르는 조건 '${part}'`);
        if (kind === 'stage') {
            const ref = Number(a);
            if (!stageIds.has(ref)) bad(`${where} — 없는 스테이지 '${part}'`);
            return { kind, ref, need: 1 };
        }
        if (kind === 'building') {
            if (!a || b === undefined) bad(`${where} — 'building:<id>:<랭크>' 모양이 아니다 '${part}'`);
            return { kind, ref: a, need: num(Number.isNaN(Number(b)) ? b : Number(b), where) };
        }
        return { kind, ref: null, need: num(Number.isNaN(Number(a)) ? a : Number(a), where) };
    }));
    const parseCost = (cell, where) => (NONE(cell) ? [] : String(cell).split('|').map(part => {
        const [res, n] = part.split(':');
        if (!resources.has(res)) bad(`${where} — 모르는 재화 '${part}'`);
        if (!posInt(Number(n))) bad(`${where} — 수량이 1 이상 정수가 아니다 '${part}'`);
        return { res, n: Number(n) };
    }));

    /* ── 랭크 ── */
    const rankRows = new Map();      // `${id}:${rank}` → {require, cost, effects}
    for (const r of data.ranks ?? []) {
        const where = `${r.building_id} r${r.rank}`;
        const b = byId.get(r.building_id);
        if (!b) bad(`${where} — 없는 건물`);
        if (!posInt(r.rank)) bad(`${where} — rank`);
        if (!STATUS.includes(r.status)) bad(`${where} — status '${r.status}'`);
        const key = `${b.id}:${r.rank}`;
        if (rankRows.has(key)) bad(`${where} — 같은 랭크가 둘이다`);
        rankRows.set(key, { require: parseRequire(r.require, where), cost: parseCost(r.cost, where), effects: [] });
        b.maxRank = Math.max(b.maxRank, r.rank);
    }
    for (const b of list) {
        for (let n = 1; n <= b.maxRank; n++) if (!rankRows.has(`${b.id}:${n}`)) bad(`${b.id} — 랭크가 1 부터 이어지지 않는다(r${n} 없음)`);
        if (b.startRank > b.maxRank) bad(`${b.id} — 시작 랭크 ${b.startRank} > 최대 랭크 ${b.maxRank}`);
    }
    // 건물을 가리키는 조건은 랭크가 다 선 뒤에 본다 — 뒤에 적힌 건물을 가리킬 수 있다
    for (const [key, row] of rankRows)
        for (const c of row.require)
            if (c.kind === 'building' && !(byId.has(c.ref) && posInt(c.need) && c.need <= byId.get(c.ref).maxRank)) bad(`${key} — 없는 건물 랭크 '${c.ref}:${c.need}'`);

    /* ── 연구 ── */
    const researchList = [];
    const researchById = new Map();
    for (const r of data.research ?? []) {
        const id = r.research_id;
        if (!id || researchById.has(id)) bad(`research_id '${id}'`);
        if (!byId.has(r.building_id)) bad(`연구 ${id} — 없는 건물 '${r.building_id}'`);
        if (!(r.target in RESEARCH_TARGETS)) bad(`연구 ${id} — 모르는 대상 '${r.target}'`);
        if (!(typeof r.per_level === 'number' && r.per_level !== 0)) bad(`연구 ${id} — per_level ${r.per_level}`);
        if (!r.name_kr || !r.name_en) bad(`연구 ${id} — 이름이 비었다`);
        if (!STATUS.includes(r.status)) bad(`연구 ${id} — status '${r.status}'`);
        const x = { id, building: r.building_id, target: r.target, perLevel: r.per_level, cost: parseCost(r.cost, `연구 ${id}`), name: { ko: r.name_kr, en: r.name_en } };
        researchById.set(id, x);
        researchList.push(x);
    }

    /* ── 여는 것 — 한 줄에 하나 ── */
    const targetOf = target => {
        if (target in TARGETS) return TARGETS[target];
        const [head, id] = String(target).split(':');
        if (head === 'research' && researchById.has(id)) return { kind: 'add', live: RESEARCH_TARGETS[researchById.get(id).target] };
        return null;
    };
    for (const r of data.effects ?? []) {
        const where = `${r.building_id} r${r.rank} ${r.target}`;
        const row = rankRows.get(`${r.building_id}:${r.rank}`);
        if (!row) bad(`${where} — 없는 랭크를 가리킨다`);
        const t = targetOf(r.target);
        if (!t) bad(`${where} — 모르는 대상`);
        if (r.kind !== t.kind) bad(`${where} — 종류가 ${r.kind} 인데 대상은 ${t.kind} 다`);
        if (r.kind === 'add' && !posInt(r.value)) bad(`${where} — 더하기 값이 1 이상 정수가 아니다(${r.value})`);
        if (r.kind === 'unlock' && !NONE(r.value)) bad(`${where} — 켜기에 값이 있다(${r.value})`);
        if (!STATUS.includes(r.status)) bad(`${where} — status '${r.status}'`);
        row.effects.push({ kind: r.kind, target: r.target, value: r.kind === 'add' ? r.value : null });
    }
    const liveOf = e => targetOf(e.target).live;

    /* ── 셈 ── */

    /** 새 게임의 랭크 — 시작 랭크가 0 인 건물은 안 적는다 */
    const startRanks = () => Object.fromEntries(list.filter(b => b.startRank > 0).map(b => [b.id, b.startRank]));

    /** 세이브의 랭크를 표에 맞춘다 — 없는 건물 · 0 · 정수 아님은 지우고 최대에서 자르고 **시작 랭크보다 낮으면 올린다**(표에 새로 선 건물) */
    function fitRanks(ranks) {
        const out = {};
        for (const b of list) {
            const v = ranks?.[b.id];
            const n = Math.max(b.startRank, Number.isInteger(v) ? Math.min(v, b.maxRank) : 0);
            if (n > 0) out[b.id] = n;
        }
        return out;
    }

    /** 세이브의 연구 레벨을 표에 맞춘다 — 없는 연구 · 0 · 정수 아님은 지운다(상한은 지을 때 본다) */
    const fitResearch = levels => Object.fromEntries(Object.entries(levels ?? {}).filter(([id, n]) => researchById.has(id) && Number.isInteger(n) && n > 0));

    /** 그 랭크의 정의 — `{require, cost, effects[+live]}` · 없으면 null */
    function rankInfo(id, rank) {
        const row = rankRows.get(`${id}:${rank}`);
        return row ? { require: row.require, cost: row.cost, effects: row.effects.map(e => ({ ...e, live: liveOf(e) })) } : null;
    }

    /** 지어진 랭크까지의 여는 것 — `{features: [id], adds: {target: n}}` · **준비 중도 모은다**(그 기능이 생기면 곧바로 먹게) */
    function opened(ranks) {
        const features = [], adds = {};
        for (const b of list) {
            for (let n = 1; n <= (ranks?.[b.id] ?? 0) && n <= b.maxRank; n++) {
                for (const e of rankRows.get(`${b.id}:${n}`).effects) {
                    if (e.kind === 'unlock') { if (!features.includes(e.target)) features.push(e.target); } else adds[e.target] = (adds[e.target] ?? 0) + e.value;
                }
            }
        }
        return { features, adds };
    }

    /** 조건마다 `{kind, ref, need, have, ok}` — `ctx = {cleared: Set, peakTotal, topLevel}` · 건물 랭크는 `ranks` 에서 읽는다 */
    const check = (require, ctx, ranks) => require.map(c => {
        const have = CONDITIONS[c.kind].have(ctx, c, id => ranks?.[id] ?? 0);
        return { ...c, have, ok: have >= c.need };
    });

    /**
     * 다음 랭크 판정 — **판정 순서가 결과 코드의 순서다**: `missing`(없는 건물) → `maxRank`(다음 랭크가 없다) →
     *   `pending`(여는 것이 전부 준비 중 — 여는 것이 없는 랭크도 같다) → `locked`(조건 미달) → `gold` → `materials`(골드 밖의 재화) · null = 지을 수 있다.
     * @returns `{rank, require, cost: [{res, need, have}], effects, err}`
     */
    function nextState(id, ranks, ctx, wallet) {
        const b = byId.get(id);
        if (!b) return { rank: null, require: [], cost: [], effects: [], err: 'missing' };
        const rank = (ranks?.[id] ?? 0) + 1;
        const info = rankInfo(id, rank);
        if (!info) return { rank: null, require: [], cost: [], effects: [], err: 'maxRank' };
        const require = check(info.require, ctx, ranks);
        const cost = info.cost.map(c => ({ res: c.res, need: c.n, have: wallet[c.res] ?? 0 }));
        const err = !info.effects.some(e => e.live) ? 'pending'
            : require.some(c => !c.ok) ? 'locked'
            : cost.some(c => c.res === 'gold' && c.have < c.need) ? 'gold'
            : cost.some(c => c.have < c.need) ? 'materials'
            : null;
        return { rank, require, cost, effects: info.effects, err };
    }

    /** 연구 배율 `1 + Σ(레벨 × 레벨당 %)` — 그 대상을 받는 연구를 모두 더한다 · 연구가 없으면 1. 다른 원천과는 **부르는 쪽이 곱한다**(§11-7) */
    function bonus(levels, target) {
        if (!(target in RESEARCH_TARGETS)) bad(`모르는 연구 대상 '${target}'`);
        return 1 + researchList.filter(r => r.target === target).reduce((a, r) => a + (levels?.[r.id] ?? 0) * r.perLevel, 0);
    }

    /**
     * 그 대상이 **n 에 닿는 랭크** `{id, name, rank}` — 잠긴 자리가 「무엇을 지어야 열리나」를 말할 때 읽는다(`state.needOf`) · 못 닿으면 null.
     *   켜기 = 그 줄이 처음 나오는 랭크(n 은 안 본다) · 더하기 = 값을 쌓아 **n 이상**이 되는 랭크(기본값은 안 센다 — 부르는 쪽이 뺀다).
     *   한 대상을 여러 건물이 더하면 **표의 건물 순서 · 랭크 순서**로 쌓는다
     */
    function reach(target, n = 1) {
        let sum = 0;
        for (const b of list)
            for (let r = 1; r <= b.maxRank; r++)
                for (const e of rankRows.get(`${b.id}:${r}`).effects) {
                    if (e.target !== target) continue;
                    if (e.kind === 'unlock') return { id: b.id, name: b.name, rank: r };
                    sum += e.value;
                    if (sum >= n) return { id: b.id, name: b.name, rank: r };
                }
        return null;
    }

    /** 화면 탭마다 열렸나 `{tab: bool}` — 그 탭에 붙은 건물(`tab`) 중 **하나라도 지어졌으면** 연다. 붙은 건물이 없는 탭은 안 적는다(늘 열림) */
    function tabs(ranks) {
        const out = {};
        for (const b of list) if (b.tab !== '-') out[b.tab] = (out[b.tab] ?? false) || (ranks?.[b.id] ?? 0) > 0;
        return out;
    }

    return { list, research: researchList, startRanks, fitRanks, fitResearch, rankInfo, opened, check, nextState, bonus, reach, tabs };
}
