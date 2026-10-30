/**
 * 건설 — 건물 랭크가 기능을 연다 [신설 2026-09-22 · construction_draft §11 구조 확정 · INTERFACE §2-14 · DEV_PLAN R137].
 *
 * 순수 모듈 — DOM · 저장소 · 시계 · Math.random 접근 없음. **상태도 rng 도 없다.**
 * **무엇을 여는지는 표 셋이 정하고 이 모듈은 센다** — 건물(`building.csv`) · 랭크(`building_rank.csv` — 문턱 · 비용) ·
 *   여는 것(`building_effect.csv` — **한 줄에 하나**). ~~연구(`research.csv`)~~ 는 2026-09-30 사용자 「연구 완전히 삭제」로 걷었다(R195 — 연구소 줄의 연구는 `state.js` 의 별개 기능).
 *   세이브는 건물별 랭크 숫자만 든다(`state.js`) — 「무엇이 열렸나」는 부를 때마다 여기서 다시 센다. 표를 고치면 옛 세이브도 곧바로 새 표를 따른다.
 * **코드가 정하는 것은 어휘뿐이다** — 여는 것의 대상(`TARGETS`) · 문턱 조건 종류(`CONDITIONS`).
 *   새 기능을 건물 뒤로 넣을 때만 `TARGETS` 에 한 줄이 는다(그 기능 자리에는 `state.hasFeature` 한 줄).
 */

/**
 * 여는 것의 대상 — `kind` 는 켜기(`unlock`) · 더하기(`add`) 둘뿐이다(construction_draft §11-2).
 *   `live: false` = **준비 중** — 그 기능이 아직 없다. 표에 적어 두면 화면에 「준비 중」으로 보이고, 기능이 생기면 여기만 `true` 로 바꾼다.
 *   `build: true` = 준비 중이어도 **그 줄이 랭크를 지을 수 있게 한다** — 뒤 랭크로 가는 길을 막지 않는다(효과는 기능이 생길 때 먹는다)
 *   더하기는 **기본값에 더한다** — 이름이 `state.limitsOf` 의 키와 같은 대상은 그 상한에 붙는다(단계 셋 `make_level` · `potion_tier` · `tactic_slots` 는
 *   `makeLevels` · `potionTier` · `tacticSlots` 에 붙고 기본값이 0 이다 — `state.js:ADD_KEY`).
 *   **첫 단계는 켜기가 심는다**(`seed` = 켜기 대상 id) — 그 켜기가 처음 나오는 랭크에서 이 더하기가 **1 씩 함께 선다**(표에 +1 줄을 따로 적지 않는다 ·
 *   제작 Lv1 은 제작(`make`) · 물약 1단계는 물약 제작(`potion`)과 함께 열린다 — 2026-09-24 사용자 지시 · INTERFACE §2-14). `opened` · `reach` 가 센다
 */
const U = live => ({ kind: 'unlock', live });
const A = (live, seed = null) => ({ kind: 'add', live, seed });
export const TARGETS = {
    // 켜기 — 지금 있는 기능 (분해 · 알아서 분해는 건물 밖이라 여기 없다 — 처음부터 열려 있다 · 2026-09-23 사용자 지시 · R140)
    //   ~~`repeat` · `stage_level`~~ 도 건물 밖이다 — 반복 원정은 처음부터 열린다 (2026-09-24 사용자 지시 · R152) · 던전 레벨 조절(위험도)은 2026-09-29 폐지됐다
    //   ~~`expedition`~~ 도 건물 밖이다 — 원정은 처음부터 열린다 (2026-09-25 사용자 지시 · R161 · 원정 건물은 2026-10-22 에 걷혔다 · R319)
    upgrade_item: U(true), make: U(true),
    synth: U(true),   // 재료 합성 — 하급을 모아 위 단계 하나(대장간 r1 · 2026-10-27 · R359 · item_design §5-2)
    potion: U(true),   // 물약 제작 — 물약 1단계를 심는다(`potion_tier` 의 seed) · 물약은 단계로만 잠겨 `hasFeature` 자리가 없다 (2026-09-24 사용자 지시 · 대장간 r2)
    //   ~~`search`~~ — 2026-10-19 수색 삭제(찾아온 영웅은 건물이 아니라 연구소 줄이 연다 · base_expedition §2-4)
    //   ~~`storage`~~ 도 건물 밖이다 — 가방 · 창고 칸은 처음부터 열린다 (2026-10-27 사용자 지시 · R361)
    codex: U(true), hire: U(true), shop: U(true), shop_special: U(true),
    shop_rows: U(true),   // 상단 둘째 · 셋째 줄 — 방어구 · 장신구 · 스킬 도안(상단 r2 · `shop` 은 맨 윗줄 무기 · 물약만 · 2026-10-30 사용자 · `state.shopState` 의 `locked`)
    shop_trade: U(true),   // 교역소 — 재료 교환 창구(상단 r3 · 특수상단은 r4 · 2026-10-30 사용자) · 교환 비율이 미정이라 열리면 화면에 자리만 선다(`state.shopState` 의 `trade`)
    lab_res: U(true),   // 연구소 「자원」 줄 — 창고 r1 이 연다(연구소는 시작부터 r1 · 2026-10-27 사용자 지시 · R361 · `state.labLineOpen`)
    // 켜기 — 준비 중 (construction_draft §2 의 ⚠ 칸 포함)
    craft: U(false), stigma_craft: U(false), skill_card: U(false),
    raid: U(false), escort: U(false), gear_set: U(false), monster_card: U(false),
    // 탐험 — 탐험 r2 가 보내기를 연다(r1 은 편성 +1 · 2026-10-30 · SCREEN_DESIGN §8-4 · `state.exploreErr` 의 `unbuilt`)
    explore: U(true),
    // 탐험 지점 — 마차(상단) · 폐허 아이콘이 이 줄부터 지도에 선다(탐험 r3 · r4 · 동굴은 r2 `explore` 가 연다 · 2026-10-30 · `state.EXPLORE_SPOT_FEATURE`)
    explore_caravan: U(true), explore_ruins: U(true),
    commission_board: U(true),   // 의뢰 게시판 [2026-09-24 · R153 · base_expedition_design §1-3] — 준비 중에서 풀렸다
    gamble: U(true),   // 도박장 슬롯 [2026-09-24 · R149 · base_expedition_design 「도박장」] — 준비 중에서 풀렸다
    // 도서관 [2026-09-29 · R179 · construction_draft §2 · skill_design §2-1] — 책 배우기(`learnBook` · r1) · 책 제작(`craftBook` · r2 — 2026-10-16 · R263).
    //   ~~대장간 r5 `skill_card`~~ 줄은 걷었다(도서관이 받는다 — 스킬 카드는 정의가 없어 대상만 남는다)
    skillbook: U(true), book_craft: U(true),
    // 전직 — 도서관 r3 (2026-10-16 · R263 — ~~r2~~ 2026-10-09 · R231 · construction_draft §2 — ~~훈련장 r3~~ · 훈련장은 `training` · `training_slots` 와 함께 걷혔다).
    //   전직은 섰다(R16 · 2026-09-28) · 「영웅 스킬을 더 찍는다」(도서관 r4)는 준비 중이라 그 랭크는 못 짓는다
    advance: U(true), skill_depth: U(false),
    // 더하기 — 지금 있는 상한(`state.limitsOf` 의 키) · 단계
    bag: A(true), stash: A(true), roster: A(true), presets: A(true), potionSlots: A(true), upgrade: A(true),
    // 고용 후보(`tavernCandidates`)는 여기 없다 — 명단은 `tavern_candidates` 고정이고 건물이 안 늘린다 [2026-09-24 사용자 지시] · ~~`searchSlots`~~ 2026-10-19 수색 삭제
    shopPerSlot: A(true), shopWeapon: A(true),
    make_level: A(true, 'make'), potion_tier: A(true, 'potion'), tactic_slots: A(true),   // 제작 레벨의 첫 단계는 `make` · 물약 단계의 첫 단계는 `potion` 이 심는다
    // 도감이 오를 수 있는 단계 — 도서관 r1 의 `codex` 가 Lv1 을 심고 뒤 랭크가 하나씩 더한다(`state.limitsOf` 의 `codexLevel` · 2026-10-24 도감 건물을 도서관에 합침 · R339)
    codex_level: A(true, 'codex'),
    // ~~`chapters`~~ — 장은 건물이 안 연다(앞 장 보스가 연다 · `state.chapterGate` · 2026-10-22 원정 건물 삭제 · R319)
    commission_slots: A(true),   // 동시 의뢰 — 기본값 `commission_slots` 위로 더한다(`state.limitsOf` 의 `commissionSlots` · 2026-09-24 · R153)
    // 연구소(옛 자원) 단계 — 채광 · 채집 · 벌목이 앞에서부터 같은 수만큼(`state.limitsOf` 의 `resourceTiers`) · 열린 단계는 표 수량대로 생산한다
    //   ~~`dispatch` 켜기 · `workers` 더하기~~ (2026-09-27 · ADR-0372) · ~~배치(`dispatchAssign`)~~ 는 2026-10-18 영웅 배치 삭제로 걷었다 — 산출은 `dispatchSettle`(base_expedition §3-3)
    resource_tier: A(true),
    // 더하기 — 준비 중
    make_kinds: A(false), shop_layers: A(false),
    // 동시 탐험 — 기본값 `explore_slots` 위로 더한다(`state.limitsOf` 의 `exploreSlots` · 2026-10-09 켰다 · 지금 표엔 늘리는 랭크가 없다 — 2026-10-27 탐험 r5 가 편성으로 · R362) · 탐험 지역은 장이 연다(ADR-0537)라 `explore_regions` 는 읽는 자리가 없다
    explore_slots: A(true),
    explore_regions: A(false), gear_sets: A(false),
    // 고용 명단 · 수색 결과 둘 다의 영웅 품질 [2026-09-24 사용자 지시 · 옛 `high_tier_candidates` — 명단만이었다]
    //   준비 중이어도 짓는다(2026-09-27 사용자 지시) · **지금 표에 이 줄이 없다** — 선술집에서 뺐다(2026-10-27 사용자 「나중에 연구소에 넣을게」 · R363)
    recruit_quality: { ...A(false), build: true },
};

/**
 * 문턱 조건 종류 여섯 — 칸 = `종류:값`, 여러 개는 `|` 로 잇고 **전부** 채워야 한다(construction_draft §11-3).
 *   `stage:<id>` 그 스테이지 클리어 · `chapter:<장>` 그 장의 보스 칸 클리어 · `chapter:<장>:<단>` **그 단에서** 그 장의 보스 칸 클리어 ·
 *   `difficulty:<id>` **그 단에서** 다음 단을 여는 칸 클리어 ·
 *   `total:<n>` 로스터 합산 레벨 **도달 최고치** · `hero:<n>` 로스터 최고 영웅 레벨 ·
 *   `building:<id>:<랭크>` 그 건물이 그 랭크 이상. 수 칸에 **balance 키 이름**을 적으면 그 값이다(같은 수를 두 곳에 두지 않는다)
 *   `have(ctx, cond, rankOf)` = 지금 값 · `ok` 는 `have >= need` 하나로 판정한다(스테이지 · 장 · 난이도는 클리어면 1)
 */
export const CONDITIONS = {
    stage: { have: (ctx, c) => (ctx.cleared.has(c.ref) ? 1 : 0) },
    // 장 · 난이도 클리어 [2026-10-27 · R362 · 탐험 건물] — 장은 `stage:` 와 같은 첫 단 기록(보스 칸은 만들 때 `chapterBosses` 로 푼다) ·
    //   난이도는 그 단의 기록이라 `state.js` 가 센 `ctx.diffCleared` 를 읽는다
    //   단을 적은 장(`diff`)은 그 단의 기록 `ctx.clearedIn[단]` 을 읽는다(선술집 r4 ~ r7 = 나이트메어 1 ~ 4장 · 2026-10-27 · R363)
    chapter: { have: (ctx, c) => ((c.diff ? ctx.clearedIn?.[c.diff] : ctx.cleared)?.has(c.stage) ? 1 : 0) },
    difficulty: { have: (ctx, c) => (ctx.diffCleared?.has(c.ref) ? 1 : 0) },
    total: { have: ctx => ctx.peakTotal },
    hero: { have: ctx => ctx.topLevel },
    building: { have: (ctx, c, rankOf) => rankOf(c.ref) },
};

const STATUS = ['proposed', 'fixed'];
const NONE = v => v === '-' || v === '' || v == null;

/**
 * @param {object} data
 *   buildings / ranks / effects — 표 셋의 파싱 행
 *   stageIds [id] — 문턱 `stage:` 가 가리킬 수 있는 스테이지 · resources [id] — 비용이 적을 수 있는 재화(`gold` · `dust` · `stigma` · 제작 재료 id)
 *   chapterBosses {장: 칸 id} — 문턱 `chapter:` 가 푸는 보스 칸 · difficultyIds [id] — 문턱 `difficulty:` 가 가리킬 수 있는 단 (R362)
 *   balance — 문턱 값에 키 이름을 적었을 때 읽는다
 */
export function createConstruction(data) {
    const bad = why => { throw new Error(`construction: ${why}`); };
    const B = data.balance ?? {};
    const stageIds = new Set(data.stageIds ?? []);
    const chapterBosses = data.chapterBosses ?? {};
    const difficultyIds = new Set(data.difficultyIds ?? []);
    const baseDiff = (data.difficultyIds ?? [])[0];   // 첫 단 — `chapter:<장>:<첫 단>` 은 `chapter:<장>` 과 같다(첫 단 기록은 `ctx.cleared`)
    const resources = new Set(data.resources ?? []);
    const posInt = v => Number.isInteger(v) && v > 0;
    // 켜기 → 그 켜기가 첫 단계를 심는 더하기들 (`TARGETS.seed`) — 심는 쪽은 켜기여야 한다
    const SEEDS = {};
    for (const [id, t] of Object.entries(TARGETS)) if (t.seed) {
        if (TARGETS[t.seed]?.kind !== 'unlock') bad(`${id} — seed '${t.seed}' 가 켜기 대상이 아니다`);
        (SEEDS[t.seed] ??= []).push(id);
    }

    /* ── 건물 ── */
    const list = [];
    const byId = new Map();
    for (const r of data.buildings ?? []) {
        const id = r.building_id;
        if (!id || byId.has(id)) bad(`building_id '${id}'`);
        if (!r.name_kr || !r.name_en) bad(`${id} — 이름이 비었다`);
        if (!r.tab) bad(`${id} — tab 이 비었다('-' = 탭 없음)`);
        if (!(Number.isInteger(r.start_rank) && r.start_rank >= 0)) bad(`${id} — start_rank ${r.start_rank}`);
        // 탭은 `|` 로 여럿 — 한 건물이 탭 여럿을 연다(도서관 = 도서관 · 도감 · 2026-10-24 · R339) · `tab` 은 첫째(부지 순서 · 흐린 탭 플래시)
        const tabIds = r.tab === '-' ? [] : String(r.tab).split('|');
        if (tabIds.some(t => !t)) bad(`${id} — tab '${r.tab}'`);
        const b = { id, name: { ko: r.name_kr, en: r.name_en }, tab: tabIds[0] ?? '-', tabIds, startRank: r.start_rank, order: Number(r.sort_order) || 0, maxRank: 0 };
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
        if (kind === 'chapter') {
            const ref = Number(a), stage = chapterBosses[ref];
            if (!stageIds.has(stage)) bad(`${where} — 보스 칸이 없는 장 '${part}'`);
            if (b !== undefined && !difficultyIds.has(b)) bad(`${where} — 없는 난이도 '${part}'`);
            return { kind, ref, stage, diff: b === undefined || b === baseDiff ? null : b, need: 1 };
        }
        if (kind === 'difficulty') {
            if (!difficultyIds.has(a)) bad(`${where} — 없는 난이도 '${part}'`);
            return { kind, ref: a, need: 1 };
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

    /* ── 여는 것 — 한 줄에 하나 ── */
    const targetOf = target => TARGETS[target] ?? null;
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
    const buildOf = e => targetOf(e.target).live || !!targetOf(e.target).build;

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

    /** 그 랭크의 정의 — `{require, cost, effects[+live], pending}` · `pending` = 지을 수 없는 준비 중(짓게 하는 줄이 하나도 없다) · 없으면 null */
    function rankInfo(id, rank) {
        const row = rankRows.get(`${id}:${rank}`);
        return row ? { require: row.require, cost: row.cost, effects: row.effects.map(e => ({ ...e, live: liveOf(e) })), pending: !row.effects.some(buildOf) } : null;
    }

    /** 지어진 랭크까지의 여는 것 — `{features: [id], adds: {target: n}}` · **준비 중도 모은다**(그 기능이 생기면 곧바로 먹게) ·
     *  켜기가 처음 나오면 그 켜기가 심는 첫 단계(`SEEDS`)가 1 씩 든다 */
    function opened(ranks) {
        const features = [], adds = {};
        for (const b of list) {
            for (let n = 1; n <= (ranks?.[b.id] ?? 0) && n <= b.maxRank; n++) {
                for (const e of rankRows.get(`${b.id}:${n}`).effects) {
                    if (e.kind === 'unlock') {
                        if (features.includes(e.target)) continue;
                        features.push(e.target);
                        for (const s of SEEDS[e.target] ?? []) adds[s] = (adds[s] ?? 0) + 1;
                    } else adds[e.target] = (adds[e.target] ?? 0) + e.value;
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
     *   `pending`(여는 것이 전부 준비 중이고 짓게 하는 줄(`build`)도 없다 — 여는 것이 없는 랭크도 같다) → `locked`(조건 미달) → `gold` → `materials`(골드 밖의 재화) · null = 지을 수 있다.
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
        const err = info.pending ? 'pending'
            : require.some(c => !c.ok) ? 'locked'
            : cost.some(c => c.res === 'gold' && c.have < c.need) ? 'gold'
            : cost.some(c => c.have < c.need) ? 'materials'
            : null;
        return { rank, require, cost, effects: info.effects, err };
    }

    /**
     * 그 대상이 **n 에 닿는 랭크** `{id, name, rank}` — 잠긴 자리가 「무엇을 지어야 열리나」를 말할 때 읽는다(`state.needOf`) · 못 닿으면 null.
     *   켜기 = 그 줄이 처음 나오는 랭크(n 은 안 본다) · 더하기 = 값을 쌓아 **n 이상**이 되는 랭크(기본값은 안 센다 — 부르는 쪽이 뺀다 ·
     *   켜기가 심는 첫 단계는 센다 — `reach('make_level', 1)` = 대장간 r1). 한 대상을 여러 건물이 더하면 **표의 건물 순서 · 랭크 순서**로 쌓는다
     */
    function reach(target, n = 1) {
        let sum = 0;
        const seedBy = TARGETS[target]?.seed ?? null;
        let seeded = false;
        for (const b of list)
            for (let r = 1; r <= b.maxRank; r++)
                for (const e of rankRows.get(`${b.id}:${r}`).effects) {
                    if (!seeded && e.kind === 'unlock' && e.target === seedBy) {
                        seeded = true;
                        if (++sum >= n) return { id: b.id, name: b.name, rank: r };
                        continue;
                    }
                    if (e.target !== target) continue;
                    if (e.kind === 'unlock') return { id: b.id, name: b.name, rank: r };
                    sum += e.value;
                    if (sum >= n) return { id: b.id, name: b.name, rank: r };
                }
        return null;
    }

    /** 화면 탭마다 열렸나 `{tab: bool}` — 그 탭에 붙은 건물(`tabIds`) 중 **하나라도 지어졌으면** 연다. 붙은 건물이 없는 탭은 안 적는다(늘 열림) */
    function tabs(ranks) {
        const out = {};
        for (const b of list) for (const t of b.tabIds) out[t] = (out[t] ?? false) || (ranks?.[b.id] ?? 0) > 0;
        return out;
    }

    return { list, startRanks, fitRanks, rankInfo, opened, check, nextState, reach, tabs };
}
