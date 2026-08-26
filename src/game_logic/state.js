/**
 * 게임 상태 — 생성 / 직렬화 / 모든 상태 전이(장착·고용·원정 결과 반영·재접속 시 런 마무리).
 *
 * 순수 모듈. DOM·localStorage·Date 를 모른다 — 현재 시각이 필요한 함수는 `now`(ms)를 인자로 받는다.
 * 저장은 **엔진 중립 JSON** 이다: 상태 객체 자체가 평문 데이터라 serialize 는 버전 도장만 찍는다.
 * localStorage 접근은 ui/storage.js 어댑터 한 곳에서만 한다 (CLAUDE.md 이식성 규칙 3).
 *
 * 세이브 형식 v3 (2026-08-26)
 * {
 *   version, seed, createdAt, savedAt,
 *   resources: {gold, dust, stigma},
 *   heroes: [{uid, name, tier, sin, cls, trait, level, xp, stats, caps, equipped:{position: itemUid|null}, injuredUntil}],
 *     — position = 착용 위치 id. 부위 8종 · 위치 9개 (반지 ×2 = ring1/ring2, 나머지는 부위 id 그대로)
 *   party: [uid], items: {uid: item}, bag: [uid],
 *   progress: {cleared: [stageId]},
 *   codexCards: {monsterId: n}   — 도감 레벨의 출처. 누적 카운트, 소모 없음 (monster_design §8)
 *   codexKills: {monsterId: n}   — 기록만. 레벨의 트리거가 아니다
 *   counters: {hero, item, battle, tavern},
 *   run: {stageId, repeat, lastAt, durationSec} | null,
 *   lastReport: {...} | null,
 *   notice: {kind:'runClosed', stageId, at, seenAt} | null   — 재접속 알림 (배너 1회)
 * }
 *
 * **버전 이관** — v2 부터는 `deserialize` 안에서 올린다 (INTERFACE §4 정책).
 *   v2 → v3 (2026-08-26 — 감각→운 · 명중/회피 폐지):
 *     · `heroes[*].stats.sen` → `stats.luck` (키 이름만 바꾸고 값·자리는 유지) · `caps` 동일
 *     · `items[*].affixes` 에서 `stat ∈ {accuracy, evasion}` 제거 — 폐지된 축이라 읽는 곳이 없다
 *     · 무기 `watk` 는 **재굴림하지 않는다** — 편차 없이 굴려진 개체로 그대로 남는다 (개체값은 개체의 역사다)
 *   v1 → v2 는 이관하지 않는다 — 무기군(group)·슬롯 9·도감 카드·세트포인트 보류로 아이템/도감 스키마가 단절됐다.
 *   하루 된 프로토타입 세이브라 새 게임으로 받는다. v1 은 계속 throw.
 */

import { makeRng, deriveSeed } from './rng.js';

export const SAVE_VERSION = 3;

/**
 * @param {object} deps
 *   hero, item, battle — 각 시스템 / balance / equipSlots [{id, part}] (착용 위치 9개) / stages(byId) / stageOrder [id...]
 *   monsters(byId) / codex {levels:[cards_required...](codex_level.csv 레벨순), bonus:[레벨별 %](⚠mock), statByNum:{1:'atk_pct',...}}
 */
export function createGameSystem(deps) {
    const { hero: H, item: I, battle: BT, balance: B } = deps;
    const clone = v => JSON.parse(JSON.stringify(v));

    const positions = deps.equipSlots.map(s => s.id);
    const positionsOf = part => deps.equipSlots.filter(s => s.part === part).map(s => s.id);

    /* ── 생성 · 직렬화 ── */

    const emptyEquip = () => Object.fromEntries(positions.map(p => [p, null]));

    function addHero(state, h) {
        state.counters.hero += 1;
        h.uid = `h${state.counters.hero}`;
        h.equipped = { ...emptyEquip(), ...(h.equipped ?? {}) };
        state.heroes.push(h);
        return h;
    }
    function addItem(state, it) {
        state.counters.item += 1;
        it.uid = `i${state.counters.item}`;
        state.items[it.uid] = it;
        return it;
    }

    /** 새 게임 — 확정한 시작 파티 3명이 곧 로스터·파티. 각자 직업 전속 무기군의 무기 1개를 쥐고 시작한다 */
    function newGame(seed, candidates, now) {
        const state = {
            version: SAVE_VERSION, seed: seed >>> 0, createdAt: now, savedAt: now,
            resources: { gold: B.start_gold, dust: B.start_dust, stigma: B.start_stigma },
            heroes: [], party: [], items: {}, bag: [],
            progress: { cleared: [] },
            codexCards: {}, codexKills: {},
            counters: { hero: 0, item: 0, battle: 0, tavern: 0 },
            run: null, lastReport: null, notice: null,
        };
        const rng = makeRng(deriveSeed(state.seed, 0));
        for (const c of candidates) {
            const h = addHero(state, clone(c));
            const w = addItem(state, I.startingWeapon(rng, h.cls));
            h.equipped.weapon = w.uid;
            state.party.push(h.uid);
        }
        return state;
    }

    const serialize = (state, now) => ({ ...clone(state), version: SAVE_VERSION, savedAt: now });

    /** 키 이름만 바꾼다 — 자리(순서)를 지켜야 표시 순서·직렬화 결과가 흔들리지 않는다 */
    const renameKey = (o, from, to) =>
        Object.fromEntries(Object.entries(o ?? {}).map(([k, v]) => [k === from ? to : k, v]));

    /** v2 → v3 — 감각→운(hero_design §4-1) · 명중/회피 접사 폐지(battle_design §9-4) */
    function upgradeV2(s) {
        for (const h of s.heroes ?? []) {
            h.stats = renameKey(h.stats, 'sen', 'luck');
            h.caps = renameKey(h.caps, 'sen', 'luck');
        }
        for (const it of Object.values(s.items ?? {})) {
            if (Array.isArray(it.affixes)) it.affixes = it.affixes.filter(a => a.stat !== 'accuracy' && a.stat !== 'evasion');
        }
        s.version = 3;
        return s;
    }

    /** 버전이 낮으면 여기서 올린다 — v1 은 스키마 단절이라 거부한다 (파일 머리 참조) */
    function deserialize(obj) {
        if (!obj || typeof obj !== 'object') throw new Error('save: not an object');
        if (obj.version !== SAVE_VERSION && obj.version !== 2)
            throw new Error(`save: version ${obj.version} (expected ${SAVE_VERSION})`);
        let s = clone(obj);
        if (s.version === 2) s = upgradeV2(s);
        for (const h of s.heroes) h.equipped = { ...emptyEquip(), ...h.equipped };
        s.codexCards = s.codexCards ?? {}; s.codexKills = s.codexKills ?? {};
        s.run = s.run ?? null; s.lastReport = s.lastReport ?? null; s.notice = s.notice ?? null;
        return s;
    }

    /* ── 조회 ── */

    const heroById = (state, uid) => state.heroes.find(h => h.uid === uid);
    const heroItems = (state, h) => Object.values(h.equipped).filter(Boolean).map(uid => state.items[uid]).filter(Boolean);
    const isInjured = (h, now) => h.injuredUntil != null && h.injuredUntil > now;

    /* ── 도감 — 몬스터 카드 모델 (monster_design §8) ── */

    /**
     * 카드 수 → 도감 레벨. codex_level.csv 의 cards_required 는 "그 레벨에 오르는 데 필요한 장수"(누적 아님)라
     * 여기서 누적해 비교한다. 레벨은 역행하지 않고 카드는 소모되지 않는다.
     */
    function codexLevel(cards) {
        let lv = 0, need = 0;
        for (const req of deps.codex.levels) {
            need += req;
            if (cards >= need) lv += 1; else break;
        }
        return lv;
    }
    /** 다음 레벨의 누적 필요 장수 — 최종 레벨이면 null */
    function codexNext(cards) {
        let need = 0;
        for (const req of deps.codex.levels) {
            need += req;
            if (cards < need) return need;
        }
        return null;
    }
    const codexMaxLevel = () => deps.codex.levels.length;
    /** 레벨 lv 까지의 누적 보정 % (⚠ 레벨별 값은 mock 자리표시 — codex_level.csv 이관 예정) */
    const codexBonusAt = lv => deps.codex.bonus.slice(0, lv).reduce((a, b) => a + b, 0);

    /**
     * 도감 보너스 — 몬스터별 레벨 보정을 스테이지 번호가 정하는 계열 스탯에 합산한다.
     * 누적 객체의 키는 `codex.statByNum` 의 값들에서 만든다 — 계열 배정이 바뀌어도 여기를 고칠 필요가 없다.
     * ⚠ `computeCombat` 이 읽는 것은 `atk_pct` · `hp_pct` · `dmg_pct` 뿐이다. 명중 폐지(08-26)로
     *   스테이지 3 계열(`acc_pct`)은 갈 곳이 없다 — 재배정은 기획 결정 (GAME_DESIGN §10).
     */
    function codexBonus(state) {
        const out = Object.fromEntries(Object.values(deps.codex.statByNum).map(k => [k, 0]));
        for (const [id, cards] of Object.entries(state.codexCards)) {
            const m = deps.monsters[id];
            if (!m) continue;
            const key = deps.codex.statByNum[m.stage_num];
            if (key === undefined) continue;
            out[key] += codexBonusAt(codexLevel(cards));
        }
        return out;
    }

    const heroCombat = (state, h) => H.computeCombat(h, heroItems(state, h), codexBonus(state));

    /* ── 장비 ── */

    /** 착용 위치 — 같은 부위의 빈 위치가 있으면 거기, 없으면 첫 위치(교체). 위치가 둘인 부위는 반지뿐이다 */
    function equipTarget(hero, item) {
        const ps = positionsOf(item.slot);
        return ps.find(p => !hero.equipped[p]) ?? ps[0] ?? null;
    }

    /** 가방 → 착용. 그 위치의 착용품은 가방으로. 양손 무기는 보조를 벗긴다 (가방이 차면 실패). position 은 생략 가능 */
    function equip(state, heroUid, itemUid, position) {
        const h = heroById(state, heroUid), it = state.items[itemUid];
        if (!h || !it || !state.bag.includes(itemUid)) return { ok: false, err: 'missing' };
        const worn = heroItems(state, h);
        const why = I.canEquip(h, it, worn);
        if (why) return { ok: false, err: why };
        const pos = position && positionsOf(it.slot).includes(position) ? position : equipTarget(h, it);
        if (!pos) return { ok: false, err: 'missing' };

        const back = [];
        if (h.equipped[pos]) back.push(h.equipped[pos]);
        if (it.slot === 'weapon' && it.twoHanded && h.equipped.offhand) back.push(h.equipped.offhand);
        // 가방에서 하나 빠지고 back 만큼 들어온다
        if (state.bag.length - 1 + back.length > B.inventory_cap) return { ok: false, err: 'bagFull' };

        state.bag = state.bag.filter(u => u !== itemUid);
        for (const u of back) state.bag.push(u);
        if (it.slot === 'weapon' && it.twoHanded) h.equipped.offhand = null;
        h.equipped[pos] = itemUid;
        return { ok: true, back, position: pos };
    }

    function unequip(state, heroUid, position) {
        const h = heroById(state, heroUid);
        const uid = h?.equipped[position];
        if (!uid) return { ok: false, err: 'missing' };
        if (state.bag.length >= B.inventory_cap) return { ok: false, err: 'bagFull' };
        h.equipped[position] = null;
        state.bag.push(uid);
        return { ok: true };
    }

    /** 분해 — 가방 아이템을 몬스터 가루로 */
    function salvage(state, itemUid) {
        const it = state.items[itemUid];
        if (!it || !state.bag.includes(itemUid)) return { ok: false, err: 'missing' };
        const dust = I.salvageDust(it);
        state.bag = state.bag.filter(u => u !== itemUid);
        delete state.items[itemUid];
        state.resources.dust += dust;
        return { ok: true, dust };
    }

    /* ── 파티 ── */

    function toggleParty(state, uid, now) {
        const h = heroById(state, uid);
        if (!h) return { ok: false, err: 'missing' };
        if (state.party.includes(uid)) { state.party = state.party.filter(u => u !== uid); return { ok: true }; }
        if (isInjured(h, now)) return { ok: false, err: 'injured' };
        if (state.party.length >= B.party_size_max) return { ok: false, err: 'full' };
        state.party.push(uid);
        return { ok: true };
    }

    /** 부상 회복 타이머가 지난 영웅을 정리한다 — 화면을 그리기 전마다 부른다. 오프라인에도 흐르는 유일한 시계 */
    function tickInjuries(state, now) {
        for (const h of state.heroes) if (h.injuredUntil != null && h.injuredUntil <= now) h.injuredUntil = null;
    }

    /* ── 스테이지 · 원정 ── */

    /** 해금 = 첫 스테이지이거나 직전 스테이지(순서 기준)를 클리어했다 */
    function stageUnlocked(state, stageId) {
        const i = deps.stageOrder.indexOf(stageId);
        if (i <= 0) return i === 0;
        return state.progress.cleared.includes(deps.stageOrder[i - 1]);
    }

    function canDepart(state, stageId, now) {
        if (!stageUnlocked(state, stageId)) return 'locked';
        if (state.party.length === 0) return 'noParty';
        if (state.party.some(uid => isInjured(heroById(state, uid), now))) return 'injured';
        return null;
    }

    const partyUnits = state => state.party.map(uid => {
        const h = heroById(state, uid);
        return { uid, combat: heroCombat(state, h) };
    });

    /**
     * 전투 1회 — 시뮬 → 결과를 상태에 반영 → 리포트.
     * 시드는 마스터 시드 + 전투 카운터에서 파생된다: 같은 세이브에서 다음 전투는 언제 돌려도 같다.
     * 런은 출발 시점에 통째로 정산된다 — 관전은 재생일 뿐이라 게임이 꺼져도 잃는 것이 없다.
     */
    function resolveBattle(state, stageId, now) {
        const why = canDepart(state, stageId, now);
        if (why) return { ok: false, err: why };

        state.counters.battle += 1;
        const rng = makeRng(deriveSeed(state.seed, state.counters.battle));
        const result = BT.simulate(partyUnits(state), stageId, rng);

        // 보상 — XP 는 참가 전원 동일 지급 (⚠제안 — 분배 규칙 미확정)
        const xpEach = Math.round(result.xpTotal * B.xp_rate);
        const levelUps = [];
        for (const uid of state.party) {
            const h = heroById(state, uid);
            const lu = H.grantXp(h, xpEach, rng);
            if (lu) levelUps.push(lu);
        }
        state.resources.gold += result.gold;
        state.resources.dust += result.dust;
        for (const [id, n] of Object.entries(result.kills)) state.codexKills[id] = (state.codexKills[id] ?? 0) + n;
        for (const [id, n] of Object.entries(result.cards)) state.codexCards[id] = (state.codexCards[id] ?? 0) + n;

        // 드롭 → 가방. 가득 차면 버린다 (개수는 리포트에 남긴다)
        const drops = [];
        let discarded = 0;
        for (const it of result.drops) {
            if (state.bag.length >= B.inventory_cap) { discarded++; continue; }
            const added = addItem(state, it);
            state.bag.push(added.uid);
            drops.push(added.uid);
        }

        // 부상 — 전투불능자만 타이머, 나머지는 귀환 즉시 무료 회복 (HP 는 상태에 없다: 매 전투 최대치 시작)
        for (const uid of result.downed) {
            const h = heroById(state, uid);
            h.injuredUntil = now + B.injury_minutes * 60 * 1000;
        }

        if (result.won && !state.progress.cleared.includes(stageId)) state.progress.cleared.push(stageId);

        const report = {
            at: now, stageId, won: result.won, reason: result.reason, durationSec: result.durationSec,
            gold: result.gold, dust: result.dust, xpEach, levelUps,
            downed: result.downed.slice(), drops, discarded,
            cards: { ...result.cards },
            rounds: result.rounds,
            // 빗나감 비율 — 레벨 부족의 전용 신호 (battle_design §9-8). 옛 리포트에는 없을 수 있다(렌더러가 허용)
            strikes: result.strikes ? clone(result.strikes) : null,
        };
        state.lastReport = report;
        state.run = { stageId, repeat: state.run?.stageId === stageId ? state.run.repeat : false, lastAt: now, durationSec: result.durationSec };
        return { ok: true, result, report };
    }

    /**
     * 재접속 — 반복 원정은 **게임이 켜져 있는 동안만** 돈다 (base_expedition_design §1, 2026-08-25).
     * 꺼져 있던 사이 돌던 런은 마무리된 것으로 본다. 프로토타입은 런을 출발 시점에 통째로 정산하므로(resolveBattle)
     * 남은 미정산분이 없다 — lastReport 가 곧 "진행 중이던 전투까지 정산한" 결과다. 여기서는 반복을 끄고 알림만 남긴다.
     * 오프라인에 도는 것은 치료 타이머(tickInjuries)뿐 — 파견은 미구현.
     */
    function closeRun(state, now) {
        const run = state.run;
        if (!run || !run.repeat) return null;
        run.repeat = false;
        state.notice = { kind: 'runClosed', stageId: run.stageId, at: run.lastAt, seenAt: now };
        return state.notice;
    }
    function dismissNotice(state) { state.notice = null; }

    /* ── 선술집 ── */

    /** 후보 3명 — 시드+카운터에서 매번 같은 3명이 다시 나온다 (저장 불필요) */
    function tavernCandidates(state) {
        const rng = makeRng(deriveSeed(state.seed ^ 0x5A17, state.counters.tavern));
        return H.rollCandidates(rng, B.tavern_candidates);
    }
    function tavernReroll(state) {
        if (state.resources.gold < B.tavern_reroll_cost) return { ok: false, err: 'gold' };
        state.resources.gold -= B.tavern_reroll_cost;
        state.counters.tavern += 1;
        return { ok: true };
    }
    function hire(state, index) {
        if (state.heroes.length >= B.roster_cap) return { ok: false, err: 'roster' };
        if (state.resources.gold < B.tavern_hire_cost) return { ok: false, err: 'gold' };
        const c = tavernCandidates(state)[index];
        if (!c) return { ok: false, err: 'missing' };
        state.resources.gold -= B.tavern_hire_cost;
        const h = addHero(state, clone(c));
        state.counters.tavern += 1;      // 고용하면 후보가 갈린다 (같은 사람을 두 번 사지 못한다)
        return { ok: true, hero: h };
    }

    return {
        newGame, serialize, deserialize,
        heroById, heroItems, heroCombat, isInjured,
        codexLevel, codexNext, codexMaxLevel, codexBonusAt, codexBonus,
        equipTarget, equip, unequip, salvage,
        toggleParty, tickInjuries,
        stageUnlocked, canDepart, resolveBattle, closeRun, dismissNotice,
        tavernCandidates, tavernReroll, hire,
    };
}
